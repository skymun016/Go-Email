# GoMail 用户管理系统 - 数据库设计方案

## 1. 新增数据库表设计

### 1.1 用户表 (users)
```typescript
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    email: text("email"), // 可选：用户联系邮箱
    mailboxQuota: integer("mailbox_quota").notNull().default(5), // 邮箱配额
    usedQuota: integer("used_quota").notNull().default(0), // 已使用配额
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp" }), // 用户过期时间
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_users_username").on(table.username),
    index("idx_users_is_active").on(table.isActive),
    index("idx_users_expires_at").on(table.expiresAt),
  ],
);
```

### 1.2 用户邮箱关联表 (user_mailboxes)
```typescript
export const userMailboxes = sqliteTable(
  "user_mailboxes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    mailboxId: text("mailbox_id").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
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
```

## 2. 现有表结构调整

### 2.1 mailboxes表调整
```typescript
// 在现有mailboxes表中添加字段
export const mailboxes = sqliteTable(
  "mailboxes",
  {
    // ... 现有字段保持不变
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    
    // 新增字段
    ownerId: text("owner_id"), // 邮箱所有者ID，null表示匿名邮箱
    ownerType: text("owner_type").default("anonymous"), // "user" | "anonymous"
  },
  (table) => [
    // ... 现有索引保持不变
    index("idx_mailboxes_email").on(table.email),
    index("idx_mailboxes_expires_at").on(table.expiresAt),
    
    // 新增索引
    index("idx_mailboxes_owner").on(table.ownerId, table.ownerType),
  ],
);
```

## 3. 关系定义

### 3.1 用户与邮箱的关系
```typescript
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

// 更新mailboxes关系
export const mailboxesRelations = relations(mailboxes, ({ many, one }) => ({
  emails: many(emails),
  userMailboxes: many(userMailboxes),
}));
```

## 4. 数据迁移策略

### 4.1 迁移步骤
1. **创建新表**：users, user_mailboxes
2. **修改现有表**：为mailboxes添加ownerId和ownerType字段
3. **数据迁移**：现有mailboxes标记为anonymous类型
4. **索引创建**：添加新的索引以优化查询性能

### 4.2 向后兼容
- 现有匿名邮箱继续工作（ownerType = "anonymous"）
- 新用户邮箱标记为用户所有（ownerType = "user"）
- API接口保持兼容，通过ownerType区分处理逻辑

## 5. 配额管理设计

### 5.1 配额分配逻辑
```typescript
// 用户注册时自动分配邮箱
async function allocateUserMailboxes(userId: string, quota: number) {
  const mailboxes = [];
  for (let i = 0; i < quota; i++) {
    const email = generateRandomEmail("smart");
    const mailbox = await createUserMailbox(userId, email);
    mailboxes.push(mailbox);
  }
  return mailboxes;
}
```

### 5.2 配额检查
```typescript
async function checkUserQuota(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  return user.usedQuota < user.mailboxQuota;
}
```

## 6. 过期管理策略

### 6.1 用户过期处理
- 用户过期后，禁止登录
- 用户邮箱数据保留一定时间（如30天）
- 提供数据恢复机制

### 6.2 邮箱过期处理
- 用户邮箱不再使用24小时过期机制
- 跟随用户账号过期时间
- 用户续费后邮箱自动恢复

## 7. 类型定义

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserMailbox = typeof userMailboxes.$inferSelect;
export type NewUserMailbox = typeof userMailboxes.$inferInsert;

// 扩展现有类型
export type Mailbox = typeof mailboxes.$inferSelect;
export type NewMailbox = typeof mailboxes.$inferInsert;
```
