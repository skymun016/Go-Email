import PostalMime from "postal-mime";
import { createRequestHandler } from "react-router";
import {
	cleanupExpiredEmails,
	createDB,
	getOrCreateMailbox,
	storeEmail,
} from "../app/lib/db";
import { getDatabase, getR2Bucket, APP_CONFIG } from "../app/config/app";
import { getTelegramConfig, logPushAttempt } from "../app/lib/telegram-config-db";
import { createTelegramPushService, type EmailNotification } from "../app/lib/telegram-push";
import type { Mailbox } from "../app/db/schema";
import {
  getGlobalTelegramConfig,
  sendGlobalEmailNotification,
  logGlobalPushAttempt
} from "../app/lib/global-telegram-db";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

// 全局CORS中间件
function addCorsHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	headers.set('Access-Control-Max-Age', '86400');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

interface ParsedEmail {
	messageId?: string;
	from?: {
		name?: string;
		address?: string;
	};
	to?: Array<{
		name?: string;
		address?: string;
	}>;
	subject?: string;
	text?: string;
	html?: string;
	attachments?: Array<{
		filename?: string;
		mimeType?: string;
		size?: number;
		contentId?: string;
		related?: boolean;
		content?: ArrayBuffer;
	}>;
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// 完全拦截所有API路由的OPTIONS预检请求，不让它到达React Router
		if (request.method === 'OPTIONS') {
			// 检查是否是API路由
			if (url.pathname.startsWith('/api/external/') ||
				url.pathname.startsWith('/api/')) {
				console.log('Handling OPTIONS request for:', url.pathname);
				return new Response(null, {
					status: 204,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
						'Access-Control-Max-Age': '86400'
					}
				});
			}
		}

		try {
			const response = await requestHandler(request, {
				cloudflare: { env, ctx },
			});

			// 为所有响应添加CORS头
			return addCorsHeaders(response);
		} catch (error) {
			console.error('Request handler error:', error);
			// 如果是API路由出错，返回带CORS头的错误响应
			if (url.pathname.startsWith('/api/')) {
				return new Response(JSON.stringify({ error: 'Internal server error' }), {
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					}
				});
			}
			throw error;
		}
	},
	async email(
		message: ForwardableEmailMessage,
		env: Env,
		ctx: ExecutionContext,
	): Promise<void> {
		try {
			console.log(
				`📧 Received email: ${message.from} -> ${message.to}, size: ${message.rawSize}`,
			);

			// 验证域名是否支持
			const toDomain = message.to.split('@')[1];
			const toPrefix = message.to.split('@')[0];
			const supportedDomains = APP_CONFIG.cloudflare.email.supportedDomains;

			console.log(`📧 处理邮件: ${toPrefix}@${toDomain} (前缀: ${toPrefix}, 域名: ${toDomain})`);

			if (!supportedDomains.includes(toDomain as any)) {
				console.log(`❌ 不支持的域名: ${toDomain}, 支持的域名: ${supportedDomains.join(', ')}`);
				return;
			}

			console.log(`✅ 域名验证通过: ${toDomain}, 开始处理自定义前缀邮箱: ${toPrefix}@${toDomain}`);

			// 创建数据库实例
			const db = createDB(getDatabase(env));

			// 根据配置决定是否启用自动清理
			if (APP_CONFIG.email.enableAutoCleanup) {
				// 清理过期邮件（异步执行，不阻塞当前邮件处理）
				ctx.waitUntil(cleanupExpiredEmails(db));
			}
			// 如果禁用自动清理，过期邮箱的历史数据将被保留
			// 用户可以通过验证码继续访问过期邮箱的历史邮件

			// 读取原始邮件内容
			const rawEmailArray = await new Response(message.raw).arrayBuffer();
			const rawEmail = new TextDecoder().decode(rawEmailArray);

			// 使用 postal-mime 解析邮件
			const parsedEmail = (await PostalMime.parse(
				rawEmailArray,
			)) as ParsedEmail;

			console.log(
				`📝 Parsed email from: ${parsedEmail.from?.address}, subject: ${parsedEmail.subject}`,
			);

			// 获取或创建邮箱记录（使用统一的drizzle方法）
			const mailbox = await getOrCreateMailbox(db, message.to);

			// 检查邮箱是否过期，过期邮箱不接收新邮件
			const now = new Date();
			if (mailbox.expiresAt <= now) {
				console.log(`❌ 邮箱已过期，拒绝接收新邮件: ${mailbox.email} (过期时间: ${mailbox.expiresAt.toISOString()})`);
				return; // 直接返回，不处理邮件
			}

			console.log(
				`📦 邮箱处理完成: ${mailbox.id} for ${mailbox.email} (类型: ${mailbox.ownerType}, 过期时间: ${mailbox.expiresAt.toISOString()})`,
			);

			// 存储邮件到数据库，附件存储到 R2
			const emailId = await storeEmail(
				db,
				getR2Bucket(env), // R2 存储桶
				mailbox.id,
				parsedEmail,
				rawEmail,
				message.rawSize,
				message.to,
			);

			console.log(`✅ Email stored successfully with ID: ${emailId}`);

			// 异步发送 Telegram 推送通知（不阻塞邮件处理）
			ctx.waitUntil(sendTelegramNotification(db, mailbox, parsedEmail, emailId));

			// 异步发送全局 Telegram 推送通知（超管配置）
			ctx.waitUntil(sendGlobalTelegramNotification(db, mailbox, parsedEmail, emailId));
		} catch (error) {
			console.error("❌ Error processing email:", error);
			// 在生产环境中，你可能想要拒绝邮件或发送到错误队列
			// message.setReject("Email processing failed");
		}
	},
	async scheduled(event, env, ctx) {
		console.log('🕐 Cron trigger fired:', event.cron);

		try {
			// 获取所有有 viewUsageLink 的邮箱
			const mailboxesResponse = await fetch(`https://${env.DOMAIN || 'gomail-app.amexiaowu.workers.dev'}/api/automation`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': 'Cloudflare-Workers-Cron/1.0'
				},
				body: 'action=get-all-mailboxes'
			});

			if (!mailboxesResponse.ok) {
				console.error('❌ Failed to get mailboxes:', mailboxesResponse.statusText);
				return;
			}

			const mailboxesData = await mailboxesResponse.json();
			const mailboxes = mailboxesData.data || [];

			console.log(`📧 Found ${mailboxes.length} mailboxes to update`);

			// 为每个有 viewUsageLink 的邮箱更新 Credit balance
			let successCount = 0;
			let errorCount = 0;

			for (const mailbox of mailboxes) {
				if (mailbox.viewUsageLink) {
					try {
						const updateResponse = await fetch(`https://${env.DOMAIN || 'gomail-app.amexiaowu.workers.dev'}/api/automation`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
								'User-Agent': 'Cloudflare-Workers-Cron/1.0'
							},
							body: `action=update-credit-balance&email=${encodeURIComponent(mailbox.email)}`
						});

						if (updateResponse.ok) {
							const result = await updateResponse.json();
							if (result.success) {
								successCount++;
								console.log(`✅ Updated ${mailbox.email}: ${result.data?.creditBalance}`);
							} else {
								errorCount++;
								console.error(`❌ Failed to update ${mailbox.email}: ${result.error}`);
							}
						} else {
							errorCount++;
							console.error(`❌ HTTP error for ${mailbox.email}: ${updateResponse.status}`);
						}

						// 添加延迟避免 API 限制
						await new Promise(resolve => setTimeout(resolve, 1000));
					} catch (error) {
						errorCount++;
						console.error(`❌ Exception for ${mailbox.email}:`, error);
					}
				}
			}

			console.log(`📊 Cron update completed: ${successCount} success, ${errorCount} errors`);

		} catch (error) {
			console.error('❌ Cron任务异常:', error);
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * 发送 Telegram 推送通知
 */
async function sendTelegramNotification(
	db: ReturnType<typeof createDB>,
	mailbox: Mailbox,
	parsedEmail: any,
	emailId: string
): Promise<void> {
	try {
		console.log(`📱 检查邮箱 ${mailbox.email} 的 Telegram 推送配置...`);

		// 获取推送配置
		const config = await getTelegramConfig(db, mailbox.id);

		if (!config || !config.enabled) {
			console.log(`ℹ️ 邮箱 ${mailbox.email} 未启用 Telegram 推送`);
			return;
		}

		console.log(`📤 开始发送 Telegram 推送通知...`);

		// 记录推送尝试
		await logPushAttempt(db, mailbox.id, emailId, "pending");

		// 创建推送服务
		const pushService = createTelegramPushService({
			botToken: config.botToken,
			chatId: config.chatId,
			enabled: config.enabled,
		});

		// 构建邮件通知数据
		const notification: EmailNotification = {
			from: parsedEmail.from?.address || "未知发件人",
			to: mailbox.email,
			subject: parsedEmail.subject || "无主题",
			textContent: parsedEmail.text,
			receivedAt: new Date(),
			mailboxEmail: mailbox.email,
		};

		// 发送推送
		const success = await pushService.sendEmailNotification(notification);

		if (success) {
			await logPushAttempt(db, mailbox.id, emailId, "success");
			console.log(`✅ Telegram 推送发送成功: ${mailbox.email}`);
		} else {
			await logPushAttempt(db, mailbox.id, emailId, "failed", "推送服务返回失败");
			console.log(`❌ Telegram 推送发送失败: ${mailbox.email}`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "未知错误";
		console.error(`❌ Telegram 推送异常 (${mailbox.email}):`, error);

		try {
			await logPushAttempt(db, mailbox.id, emailId, "failed", errorMessage);
		} catch (logError) {
			console.error("记录推送日志失败:", logError);
		}
	}
}

/**
 * 发送全局 Telegram 推送通知（超管配置）
 */
async function sendGlobalTelegramNotification(
	db: ReturnType<typeof createDB>,
	mailbox: Mailbox,
	parsedEmail: any,
	emailId: string
): Promise<void> {
	try {
		console.log(`🌐 检查全局 Telegram 推送配置...`);

		// 获取全局推送配置
		const config = await getGlobalTelegramConfig(db);

		if (!config || !config.enabled) {
			console.log(`ℹ️ 全局 Telegram 推送未启用`);
			return;
		}

		console.log(`📤 开始发送全局 Telegram 推送通知...`);

		// 记录推送尝试
		await logGlobalPushAttempt(db, mailbox.id, emailId, "pending");

		// 构建邮件数据
		const emailData = {
			fromAddress: parsedEmail.from?.address || "未知发件人",
			subject: parsedEmail.subject || "无主题",
			textContent: parsedEmail.text,
			htmlContent: parsedEmail.html,
			receivedAt: new Date(),
		};

		// 发送全局推送
		const result = await sendGlobalEmailNotification(config, emailData, mailbox);

		if (result.success) {
			await logGlobalPushAttempt(db, mailbox.id, emailId, "success");
			console.log(`✅ 全局 Telegram 推送发送成功: ${mailbox.email}`);
		} else {
			await logGlobalPushAttempt(db, mailbox.id, emailId, "failed", result.error);
			console.log(`❌ 全局 Telegram 推送发送失败: ${mailbox.email} - ${result.error}`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "未知错误";
		console.error(`❌ 全局 Telegram 推送异常 (${mailbox.email}):`, error);

		try {
			await logGlobalPushAttempt(db, mailbox.id, emailId, "failed", errorMessage);
		} catch (logError) {
			console.error("记录全局推送日志失败:", logError);
		}
	}
}
