import PostalMime from "postal-mime";
import { createRequestHandler } from "react-router";
import {
	cleanupExpiredEmails,
	createDB,
	getOrCreateMailbox,
	storeEmail,
} from "../app/lib/db";
import { getDatabase, getR2Bucket, APP_CONFIG } from "../app/config/app";

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
			const supportedDomains = APP_CONFIG.cloudflare.email.supportedDomains;

			if (!supportedDomains.includes(toDomain as any)) {
				console.log(`❌ 不支持的域名: ${toDomain}`);
				return;
			}

			console.log(`✅ 域名验证通过: ${toDomain}`);

			// 创建数据库实例
			const db = createDB(getDatabase(env));

			// 清理过期邮件（异步执行，不阻塞当前邮件处理）
			ctx.waitUntil(cleanupExpiredEmails(db));

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

			console.log(
				`📦 Found/Created mailbox: ${mailbox.id} for ${mailbox.email}`,
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
		} catch (error) {
			console.error("❌ Error processing email:", error);
			// 在生产环境中，你可能想要拒绝邮件或发送到错误队列
			// message.setReject("Email processing failed");
		}
	},
} satisfies ExportedHandler<Env>;
