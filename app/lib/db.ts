import { and, count, desc, eq, gt, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import {
	type Attachment,
	type Email,
	type Mailbox,
	type NewAttachment,
	type NewEmail,
	type NewMailbox,
	type ApiToken,
	type NewApiToken,
	type TokenUsageLog,
	type NewTokenUsageLog,
	type Admin,
	type NewAdmin,
	attachments,
	emails,
	mailboxes,
	apiTokens,
	tokenUsageLogs,
	admins,
} from "~/db/schema";
import { APP_CONFIG } from "~/config/app";

// 创建 drizzle 实例
export function createDB(database?: D1Database) {
	if (!database) {
		throw new Error("Database not available - database parameter is required");
	}
	return drizzle(database, {
		schema: {
			mailboxes,
			emails,
			attachments,
			apiTokens,
			tokenUsageLogs,
			admins
		}
	});
}

// 通过邮箱地址获取或创建邮箱
export async function getOrCreateMailbox(
	db: ReturnType<typeof createDB>,
	email: string,
): Promise<Mailbox> {
	const now = new Date();

	// 先查找现有邮箱
	const existing = await db
		.select()
		.from(mailboxes)
		.where(and(eq(mailboxes.email, email), gt(mailboxes.expiresAt, now)))
		.limit(1);

	if (existing.length > 0) {
		return existing[0];
	}

	// 创建新邮箱（根据配置设置过期时间）
	const expiresAt = new Date(Date.now() + APP_CONFIG.email.expirationHours * 60 * 60 * 1000);

	const newMailbox: NewMailbox = {
		id: nanoid(),
		email,
		expiresAt,
		isActive: true,
	};

	await db.insert(mailboxes).values(newMailbox);

	return {
		...newMailbox,
		createdAt: now,
	} as Mailbox;
}

// 获取邮箱的邮件列表
export async function getEmailsByMailbox(
	db: ReturnType<typeof createDB>,
	mailboxId: string,
	limit = 50,
): Promise<Email[]> {
	return await db
		.select()
		.from(emails)
		.where(eq(emails.mailboxId, mailboxId))
		.orderBy(desc(emails.receivedAt))
		.limit(limit);
}

// 通过邮箱地址获取邮件列表
export async function getEmailsByAddress(
	db: ReturnType<typeof createDB>,
	email: string,
	limit = 50,
): Promise<Email[]> {
	const now = new Date();

	return await db
		.select({
			id: emails.id,
			mailboxId: emails.mailboxId,
			messageId: emails.messageId,
			fromAddress: emails.fromAddress,
			toAddress: emails.toAddress,
			subject: emails.subject,
			textContent: emails.textContent,
			htmlContent: emails.htmlContent,
			rawEmail: emails.rawEmail,
			receivedAt: emails.receivedAt,
			isRead: emails.isRead,
			size: emails.size,
		})
		.from(emails)
		.innerJoin(mailboxes, eq(emails.mailboxId, mailboxes.id))
		.where(and(eq(mailboxes.email, email), gt(mailboxes.expiresAt, now)))
		.orderBy(desc(emails.receivedAt))
		.limit(limit);
}

// 获取单个邮件详情
export async function getEmailById(
	db: ReturnType<typeof createDB>,
	emailId: string,
): Promise<Email | null> {
	const result = await db
		.select()
		.from(emails)
		.where(eq(emails.id, emailId))
		.limit(1);

	return result.length > 0 ? result[0] : null;
}

// 获取邮件的附件列表
export async function getEmailAttachments(
	db: ReturnType<typeof createDB>,
	emailId: string,
): Promise<Attachment[]> {
	return await db
		.select()
		.from(attachments)
		.where(eq(attachments.emailId, emailId))
		.orderBy(attachments.createdAt);
}

// 标记邮件为已读
export async function markEmailAsRead(
	db: ReturnType<typeof createDB>,
	emailId: string,
	isRead: boolean = true,
): Promise<void> {
	await db.update(emails).set({ isRead }).where(eq(emails.id, emailId));
}

// 删除邮件
export async function deleteEmail(
	db: ReturnType<typeof createDB>,
	emailId: string,
): Promise<void> {
	await db.delete(emails).where(eq(emails.id, emailId));
}

// 清理过期邮箱和邮件
export async function cleanupExpiredEmails(
	db: ReturnType<typeof createDB>,
): Promise<void> {
	const now = new Date();

	// 删除过期的邮箱（CASCADE 会自动删除相关邮件和附件）
	await db.delete(mailboxes).where(lt(mailboxes.expiresAt, now));
}

// 获取邮箱统计信息
export async function getMailboxStats(
	db: ReturnType<typeof createDB>,
	mailboxId: string,
): Promise<{
	total: number;
	unread: number;
}> {
	const [totalResult, unreadResult] = await Promise.all([
		db
			.select({ count: count() })
			.from(emails)
			.where(eq(emails.mailboxId, mailboxId)),
		db
			.select({ count: count() })
			.from(emails)
			.where(and(eq(emails.mailboxId, mailboxId), eq(emails.isRead, false))),
	]);

	return {
		total: totalResult[0]?.count || 0,
		unread: unreadResult[0]?.count || 0,
	};
}

// 上传附件到 R2
export async function uploadAttachmentToR2(
	r2: R2Bucket,
	content: ArrayBuffer,
	filename: string,
	contentType: string,
): Promise<string> {
	// 生成唯一的 R2 键
	const timestamp = Date.now();
	const randomId = nanoid();
	const r2Key = `attachments/${timestamp}/${randomId}/${filename}`;

	// 上传到 R2
	await r2.put(r2Key, content, {
		httpMetadata: {
			contentType,
		},
	});

	return r2Key;
}

// 从 R2 获取附件
export async function getAttachmentFromR2(
	r2: R2Bucket,
	r2Key: string,
): Promise<R2ObjectBody | null> {
	const object = await r2.get(r2Key);
	return object;
}

// 通过附件 ID 获取附件详情和文件内容
export async function getAttachmentById(
	attachmentId: string,
	database?: D1Database,
	r2Bucket?: R2Bucket
): Promise<{
	attachment: Attachment;
	content: R2ObjectBody | null;
} | null> {
	const db = createDB(database);

	// 获取附件记录
	const attachmentResult = await db
		.select()
		.from(attachments)
		.where(eq(attachments.id, attachmentId))
		.limit(1);

	if (attachmentResult.length === 0) {
		return null;
	}

	const attachment = attachmentResult[0];

	// 检查附件是否已上传到 R2
	if (!attachment.r2Key || attachment.uploadStatus !== "uploaded") {
		return { attachment, content: null };
	}

	// 从 R2 获取文件内容
	const bucket = r2Bucket;
	if (!bucket) {
		return { attachment, content: null };
	}

	const content = await getAttachmentFromR2(bucket, attachment.r2Key);

	return { attachment, content };
}

// 存储邮件到数据库（供 worker 使用）
export async function storeEmail(
	db: ReturnType<typeof createDB>,
	r2: R2Bucket,
	mailboxId: string,
	parsedEmail: {
		messageId?: string;
		from?: { address?: string };
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
	},
	rawEmail: string,
	rawSize: number,
	toAddress: string,
): Promise<string> {
	const emailId = nanoid();

	const newEmail: NewEmail = {
		id: emailId,
		mailboxId,
		messageId: parsedEmail.messageId || null,
		fromAddress: parsedEmail.from?.address || "",
		toAddress,
		subject: parsedEmail.subject || null,
		textContent: parsedEmail.text || null,
		htmlContent: parsedEmail.html || null,
		rawEmail,
		size: rawSize,
		isRead: false,
	};

	// 存储邮件
	await db.insert(emails).values(newEmail);

	// 处理附件：存储到 R2 并在数据库中保存元数据
	if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
		const newAttachments: NewAttachment[] = [];

		for (const attachment of parsedEmail.attachments) {
			const attachmentId = nanoid();
			let r2Key: string | null = null;
			let uploadStatus = "pending";

			// 计算附件大小 - 如果postal-mime没有提供大小，从内容计算
			let attachmentSize = attachment.size;
			if (!attachmentSize && attachment.content) {
				attachmentSize = attachment.content.byteLength;
			}

			// 如果有内容，上传到 R2
			if (attachment.content) {
				try {
					r2Key = await uploadAttachmentToR2(
						r2,
						attachment.content,
						attachment.filename || `attachment_${attachmentId}`,
						attachment.mimeType || "application/octet-stream",
					);
					uploadStatus = "uploaded";
				} catch (error) {
					console.error("Failed to upload attachment to R2:", error);
					uploadStatus = "failed";
				}
			}

			newAttachments.push({
				id: attachmentId,
				emailId,
				filename: attachment.filename || null,
				contentType: attachment.mimeType || null,
				size: attachmentSize || null,
				contentId: attachment.contentId || null,
				isInline: attachment.related || false,
				r2Key,
				r2Bucket: r2Key ? APP_CONFIG.cloudflare.r2.bucketName : null,
				uploadStatus,
			});
		}

		if (newAttachments.length > 0) {
			await db.insert(attachments).values(newAttachments);
		}
	}

	return emailId;
}

// ==================== API Token 管理 ====================

// 创建新的API Token
export async function createApiToken(
	db: ReturnType<typeof createDB>,
	tokenData: {
		name: string;
		usageLimit?: number;
		expiresAt?: Date | null;
	}
): Promise<ApiToken> {
	const tokenId = nanoid();
	const token = `gm_${nanoid(32)}`; // 生成格式为 gm_xxx 的token

	const newToken: NewApiToken = {
		id: tokenId,
		name: tokenData.name,
		token,
		usageLimit: tokenData.usageLimit || 0,
		usageCount: 0,
		isActive: true,
		expiresAt: tokenData.expiresAt || null,
	};

	await db.insert(apiTokens).values(newToken);

	const result = await db
		.select()
		.from(apiTokens)
		.where(eq(apiTokens.id, tokenId))
		.limit(1);

	return result[0];
}

// 验证API Token
export async function validateApiToken(
	db: ReturnType<typeof createDB>,
	token: string
): Promise<ApiToken | null> {
	const result = await db
		.select()
		.from(apiTokens)
		.where(and(
			eq(apiTokens.token, token),
			eq(apiTokens.isActive, true)
		))
		.limit(1);

	if (result.length === 0) {
		return null;
	}

	const apiToken = result[0];

	// 检查是否过期
	if (apiToken.expiresAt && new Date() > apiToken.expiresAt) {
		return null;
	}

	// 检查使用次数限制
	if (apiToken.usageLimit > 0 && apiToken.usageCount >= apiToken.usageLimit) {
		return null;
	}

	return apiToken;
}

// 使用API Token（增加使用次数）
export async function useApiToken(
	db: ReturnType<typeof createDB>,
	tokenId: string,
	email: string,
	ipAddress?: string,
	userAgent?: string
): Promise<void> {
	// 先获取当前使用次数
	const currentToken = await db
		.select({ usageCount: apiTokens.usageCount })
		.from(apiTokens)
		.where(eq(apiTokens.id, tokenId))
		.limit(1);

	if (currentToken.length === 0) {
		throw new Error("Token not found");
	}

	// 增加使用次数
	await db
		.update(apiTokens)
		.set({
			usageCount: currentToken[0].usageCount + 1,
			lastUsedAt: new Date(),
		})
		.where(eq(apiTokens.id, tokenId));

	// 记录使用日志
	const logId = nanoid();
	const newLog: NewTokenUsageLog = {
		id: logId,
		tokenId,
		email,
		ipAddress: ipAddress || null,
		userAgent: userAgent || null,
	};

	await db.insert(tokenUsageLogs).values(newLog);
}

// 获取所有API Token
export async function getAllApiTokens(
	db: ReturnType<typeof createDB>
): Promise<ApiToken[]> {
	return await db
		.select()
		.from(apiTokens)
		.orderBy(desc(apiTokens.createdAt));
}

// 更新API Token
export async function updateApiToken(
	db: ReturnType<typeof createDB>,
	tokenId: string,
	updates: {
		name?: string;
		usageLimit?: number;
		isActive?: boolean;
		expiresAt?: Date | null;
	}
): Promise<void> {
	await db
		.update(apiTokens)
		.set(updates)
		.where(eq(apiTokens.id, tokenId));
}

// 删除API Token
export async function deleteApiToken(
	db: ReturnType<typeof createDB>,
	tokenId: string
): Promise<void> {
	// 先删除相关的使用日志
	await db
		.delete(tokenUsageLogs)
		.where(eq(tokenUsageLogs.tokenId, tokenId));

	// 再删除token
	await db
		.delete(apiTokens)
		.where(eq(apiTokens.id, tokenId));
}

// 获取Token使用统计
export async function getTokenUsageStats(
	db: ReturnType<typeof createDB>,
	tokenId: string
): Promise<{
	totalUsage: number;
	recentUsage: TokenUsageLog[];
}> {
	// 获取总使用次数
	const totalResult = await db
		.select({ count: count() })
		.from(tokenUsageLogs)
		.where(eq(tokenUsageLogs.tokenId, tokenId));

	// 获取最近的使用记录
	const recentUsage = await db
		.select()
		.from(tokenUsageLogs)
		.where(eq(tokenUsageLogs.tokenId, tokenId))
		.orderBy(desc(tokenUsageLogs.createdAt))
		.limit(10);

	return {
		totalUsage: totalResult[0]?.count || 0,
		recentUsage,
	};
}

// ==================== 管理员管理 ====================

// 创建管理员账号
export async function createAdmin(
	db: ReturnType<typeof createDB>,
	username: string,
	password: string
): Promise<Admin> {
	const adminId = nanoid();
	const passwordHash = await bcrypt.hash(password, 10);

	const newAdmin: NewAdmin = {
		id: adminId,
		username,
		passwordHash,
	};

	await db.insert(admins).values(newAdmin);

	const result = await db
		.select()
		.from(admins)
		.where(eq(admins.id, adminId))
		.limit(1);

	return result[0];
}

// 验证管理员登录
export async function validateAdmin(
	db: ReturnType<typeof createDB>,
	username: string,
	password: string
): Promise<Admin | null> {
	const result = await db
		.select()
		.from(admins)
		.where(eq(admins.username, username))
		.limit(1);

	if (result.length === 0) {
		return null;
	}

	const admin = result[0];
	const isValid = await bcrypt.compare(password, admin.passwordHash);

	if (!isValid) {
		return null;
	}

	// 更新最后登录时间
	await db
		.update(admins)
		.set({ lastLoginAt: new Date() })
		.where(eq(admins.id, admin.id));

	return admin;
}

// 获取管理员信息
export async function getAdminById(
	db: ReturnType<typeof createDB>,
	adminId: string
): Promise<Admin | null> {
	const result = await db
		.select()
		.from(admins)
		.where(eq(admins.id, adminId))
		.limit(1);

	return result.length > 0 ? result[0] : null;
}

// 检查管理员是否存在
export async function checkAdminExists(
	db: ReturnType<typeof createDB>,
	username: string
): Promise<boolean> {
	const result = await db
		.select({ count: count() })
		.from(admins)
		.where(eq(admins.username, username));

	return (result[0]?.count || 0) > 0;
}
