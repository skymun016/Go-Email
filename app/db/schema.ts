import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 邮箱表 - 存储临时邮箱信息
export const mailboxes = sqliteTable(
	"mailboxes",
	{
		id: text("id").primaryKey(),
		email: text("email").notNull().unique(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
		isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
		// 新增字段：邮箱所有权
		ownerId: text("owner_id"), // 邮箱所有者ID，null表示匿名邮箱
		ownerType: text("owner_type").default("anonymous"), // "user" | "anonymous"
	},
	(table) => [
		index("idx_mailboxes_email").on(table.email),
		index("idx_mailboxes_expires_at").on(table.expiresAt),
		// 新增索引：优化所有权查询
		index("idx_mailboxes_owner").on(table.ownerId, table.ownerType),
	],
);

// 邮件表 - 存储接收的邮件
export const emails = sqliteTable(
	"emails",
	{
		id: text("id").primaryKey(),
		mailboxId: text("mailbox_id").notNull(),
		messageId: text("message_id"),
		fromAddress: text("from_address").notNull(),
		toAddress: text("to_address").notNull(),
		subject: text("subject"),
		textContent: text("text_content"),
		htmlContent: text("html_content"),
		rawEmail: text("raw_email").notNull(),
		receivedAt: integer("received_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
		size: integer("size").notNull(),
	},
	(table) => [
		index("idx_emails_mailbox_id").on(table.mailboxId),
		index("idx_emails_received_at").on(table.receivedAt),
		index("idx_emails_is_read").on(table.isRead),
		// 复合索引优化常用查询
		index("idx_emails_mailbox_received").on(table.mailboxId, table.receivedAt),
		index("idx_emails_mailbox_read").on(table.mailboxId, table.isRead),
		// 优化按发件人查询
		index("idx_emails_from_address").on(table.fromAddress),
		// 优化按收件人查询
		index("idx_emails_to_address").on(table.toAddress),
	],
);

// 附件表 - 存储邮件附件元数据，实际文件存储在 R2 中
export const attachments = sqliteTable(
	"attachments",
	{
		id: text("id").primaryKey(),
		emailId: text("email_id").notNull(),
		filename: text("filename"),
		contentType: text("content_type"),
		size: integer("size"),
		contentId: text("content_id"),
		isInline: integer("is_inline", { mode: "boolean" })
			.notNull()
			.default(false),
		// R2 存储相关字段
		r2Key: text("r2_key"), // R2 中的文件路径/键
		r2Bucket: text("r2_bucket"), // R2 存储桶名称
		uploadStatus: text("upload_status").notNull().default("pending"), // pending, uploaded, failed
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index("idx_attachments_email_id").on(table.emailId),
		index("idx_attachments_r2_key").on(table.r2Key),
	],
);

// API Token表 - 用于外部API访问控制
export const apiTokens = sqliteTable(
	"api_tokens",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(), // Token名称/描述
		token: text("token").notNull().unique(), // 实际的token值
		usageLimit: integer("usage_limit").notNull().default(0), // 使用次数限制，0表示无限制
		usageCount: integer("usage_count").notNull().default(0), // 已使用次数
		isActive: integer("is_active", { mode: "boolean" }).notNull().default(true), // 是否启用
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		lastUsedAt: integer("last_used_at", { mode: "timestamp" }), // 最后使用时间
		expiresAt: integer("expires_at", { mode: "timestamp" }), // 过期时间，null表示永不过期
	},
	(table) => [
		index("idx_api_tokens_token").on(table.token),
		index("idx_api_tokens_is_active").on(table.isActive),
		// 复合索引优化Token验证查询
		index("idx_api_tokens_active_expires").on(table.isActive, table.expiresAt),
		// 优化使用统计查询
		index("idx_api_tokens_usage").on(table.usageCount, table.usageLimit),
	],
);

// Token使用日志表
export const tokenUsageLogs = sqliteTable(
	"token_usage_logs",
	{
		id: text("id").primaryKey(),
		tokenId: text("token_id").notNull(),
		email: text("email").notNull(), // 使用了哪个邮箱
		ipAddress: text("ip_address"), // 调用者IP
		userAgent: text("user_agent"), // 调用者UA
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index("idx_token_usage_logs_token_id").on(table.tokenId),
		index("idx_token_usage_logs_created_at").on(table.createdAt),
	],
);

// 用户表 - 存储注册用户信息
export const users = sqliteTable(
	"users",
	{
		id: text("id").primaryKey(),
		username: text("username").notNull().unique(),
		email: text("email").notNull(), // 必需：用户联系邮箱
		passwordHash: text("password_hash").notNull(),
		displayName: text("display_name"), // 显示名称
		isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
		emailQuota: integer("email_quota").notNull().default(5), // 邮箱配额
		quotaUsed: integer("quota_used").notNull().default(0), // 已使用配额
		expiresAt: integer("expires_at", { mode: "timestamp" }), // 用户过期时间
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
	},
	(table) => [
		index("idx_users_username").on(table.username),
		index("idx_users_is_active").on(table.isActive),
		index("idx_users_expires_at").on(table.expiresAt),
	],
);

// 用户邮箱关联表 - 存储用户与邮箱的关联关系
export const userMailboxes = sqliteTable(
	"user_mailboxes",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		mailboxId: text("mailbox_id").notNull(),
		assignedEmail: text("assigned_email").notNull(), // 分配的邮箱地址
		isPermanent: integer("is_permanent", { mode: "boolean" }).notNull().default(false),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index("idx_user_mailboxes_user_id").on(table.userId),
		index("idx_user_mailboxes_mailbox_id").on(table.mailboxId),
		// 复合索引优化查询
		index("idx_user_mailboxes_user_mailbox").on(table.userId, table.mailboxId),
	],
);

// 管理员表
export const admins = sqliteTable(
	"admins",
	{
		id: text("id").primaryKey(),
		username: text("username").notNull().unique(),
		passwordHash: text("password_hash").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
	},
	(table) => [
		index("idx_admins_username").on(table.username),
	],
);

// 定义关系 - 使用 relations 来表示表之间的关系，而不是数据库外键
export const mailboxesRelations = relations(mailboxes, ({ many }) => ({
	emails: many(emails),
	userMailboxes: many(userMailboxes),
}));

export const usersRelations = relations(users, ({ many }) => ({
	userMailboxes: many(userMailboxes),
}));

export const userMailboxesRelations = relations(userMailboxes, ({ one }) => ({
	user: one(users, {
		fields: [userMailboxes.userId],
		references: [users.id],
	}),
	mailbox: one(mailboxes, {
		fields: [userMailboxes.mailboxId],
		references: [mailboxes.id],
	}),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
	mailbox: one(mailboxes, {
		fields: [emails.mailboxId],
		references: [mailboxes.id],
	}),
	attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
	email: one(emails, {
		fields: [attachments.emailId],
		references: [emails.id],
	}),
}));

export const apiTokensRelations = relations(apiTokens, ({ many }) => ({
	usageLogs: many(tokenUsageLogs),
}));

export const tokenUsageLogsRelations = relations(tokenUsageLogs, ({ one }) => ({
	token: one(apiTokens, {
		fields: [tokenUsageLogs.tokenId],
		references: [apiTokens.id],
	}),
}));

// 类型定义
export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;

export type TokenUsageLog = typeof tokenUsageLogs.$inferSelect;
export type NewTokenUsageLog = typeof tokenUsageLogs.$inferInsert;

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;

// 用户管理相关类型
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserMailbox = typeof userMailboxes.$inferSelect;
export type NewUserMailbox = typeof userMailboxes.$inferInsert;

// 导出类型
export type Mailbox = typeof mailboxes.$inferSelect;
export type NewMailbox = typeof mailboxes.$inferInsert;

export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
