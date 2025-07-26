# GoMail 邮箱分配系统设计方案

## 1. 邮箱分配核心逻辑

### 1.1 用户注册时自动分配
```typescript
// app/lib/user-mailbox.ts
export async function allocateUserMailboxes(
  db: ReturnType<typeof createDB>,
  userId: string,
  quota: number
): Promise<Mailbox[]> {
  const allocatedMailboxes: Mailbox[] = [];
  
  for (let i = 0; i < quota; i++) {
    // 复用现有的邮箱生成逻辑，但使用智能策略
    const email = generateRandomEmail("smart");
    
    // 创建用户邮箱（修改现有函数）
    const mailbox = await createUserMailbox(db, userId, email, i === 0);
    allocatedMailboxes.push(mailbox);
  }
  
  // 更新用户已使用配额
  await db
    .update(users)
    .set({ usedQuota: quota })
    .where(eq(users.id, userId));
    
  return allocatedMailboxes;
}
```

### 1.2 创建用户邮箱函数
```typescript
export async function createUserMailbox(
  db: ReturnType<typeof createDB>,
  userId: string,
  email: string,
  isDefault: boolean = false
): Promise<Mailbox> {
  const mailboxId = nanoid();
  
  // 1. 创建邮箱记录（修改现有逻辑）
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1年过期
  
  const newMailbox: NewMailbox = {
    id: mailboxId,
    email,
    expiresAt,
    isActive: true,
    ownerId: userId,
    ownerType: "user",
  };
  
  await db.insert(mailboxes).values(newMailbox);
  
  // 2. 创建用户-邮箱关联
  const userMailboxId = nanoid();
  const newUserMailbox: NewUserMailbox = {
    id: userMailboxId,
    userId,
    mailboxId,
    isDefault,
  };
  
  await db.insert(userMailboxes).values(newUserMailbox);
  
  // 3. 返回邮箱信息
  const result = await db
    .select()
    .from(mailboxes)
    .where(eq(mailboxes.id, mailboxId))
    .limit(1);
    
  return result[0];
}
```

## 2. 用户邮箱查询和管理

### 2.1 获取用户邮箱列表
```typescript
export async function getUserMailboxes(
  db: ReturnType<typeof createDB>,
  userId: string
): Promise<Array<Mailbox & { isDefault: boolean; emailCount: number; unreadCount: number }>> {
  // 联合查询用户邮箱和邮件统计
  const result = await db
    .select({
      // 邮箱信息
      id: mailboxes.id,
      email: mailboxes.email,
      createdAt: mailboxes.createdAt,
      expiresAt: mailboxes.expiresAt,
      isActive: mailboxes.isActive,
      ownerId: mailboxes.ownerId,
      ownerType: mailboxes.ownerType,
      // 关联信息
      isDefault: userMailboxes.isDefault,
      // 邮件统计（子查询）
      emailCount: sql<number>`(
        SELECT COUNT(*) FROM ${emails} 
        WHERE ${emails.mailboxId} = ${mailboxes.id}
      )`,
      unreadCount: sql<number>`(
        SELECT COUNT(*) FROM ${emails} 
        WHERE ${emails.mailboxId} = ${mailboxes.id} 
        AND ${emails.isRead} = false
      )`,
    })
    .from(mailboxes)
    .innerJoin(userMailboxes, eq(mailboxes.id, userMailboxes.mailboxId))
    .where(eq(userMailboxes.userId, userId))
    .orderBy(desc(userMailboxes.isDefault), desc(mailboxes.createdAt));
    
  return result;
}
```

### 2.2 获取用户默认邮箱
```typescript
export async function getUserDefaultMailbox(
  db: ReturnType<typeof createDB>,
  userId: string
): Promise<Mailbox | null> {
  const result = await db
    .select()
    .from(mailboxes)
    .innerJoin(userMailboxes, eq(mailboxes.id, userMailboxes.mailboxId))
    .where(and(
      eq(userMailboxes.userId, userId),
      eq(userMailboxes.isDefault, true)
    ))
    .limit(1);
    
  return result.length > 0 ? result[0].mailboxes : null;
}
```

### 2.3 设置默认邮箱
```typescript
export async function setUserDefaultMailbox(
  db: ReturnType<typeof createDB>,
  userId: string,
  mailboxId: string
): Promise<void> {
  // 1. 清除当前默认邮箱
  await db
    .update(userMailboxes)
    .set({ isDefault: false })
    .where(eq(userMailboxes.userId, userId));
    
  // 2. 设置新的默认邮箱
  await db
    .update(userMailboxes)
    .set({ isDefault: true })
    .where(and(
      eq(userMailboxes.userId, userId),
      eq(userMailboxes.mailboxId, mailboxId)
    ));
}
```

## 3. 配额管理系统

### 3.1 检查用户配额
```typescript
export async function checkUserQuota(
  db: ReturnType<typeof createDB>,
  userId: string
): Promise<{
  hasQuota: boolean;
  current: number;
  limit: number;
  remaining: number;
}> {
  const user = await db
    .select({
      usedQuota: users.usedQuota,
      mailboxQuota: users.mailboxQuota,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
  if (user.length === 0) {
    throw new Error("User not found");
  }
  
  const { usedQuota, mailboxQuota } = user[0];
  const remaining = mailboxQuota - usedQuota;
  
  return {
    hasQuota: remaining > 0,
    current: usedQuota,
    limit: mailboxQuota,
    remaining,
  };
}
```

### 3.2 增加用户配额
```typescript
export async function increaseUserQuota(
  db: ReturnType<typeof createDB>,
  userId: string,
  additionalQuota: number
): Promise<void> {
  await db
    .update(users)
    .set({
      mailboxQuota: sql`${users.mailboxQuota} + ${additionalQuota}`,
    })
    .where(eq(users.id, userId));
}
```

### 3.3 配额使用统计
```typescript
export async function getUserQuotaStats(
  db: ReturnType<typeof createDB>,
  userId: string
): Promise<{
  totalQuota: number;
  usedQuota: number;
  activeMailboxes: number;
  totalEmails: number;
  unreadEmails: number;
}> {
  const stats = await db
    .select({
      totalQuota: users.mailboxQuota,
      usedQuota: users.usedQuota,
      activeMailboxes: sql<number>`(
        SELECT COUNT(*) FROM ${userMailboxes} um
        INNER JOIN ${mailboxes} m ON um.mailbox_id = m.id
        WHERE um.user_id = ${userId} AND m.is_active = true
      )`,
      totalEmails: sql<number>`(
        SELECT COUNT(*) FROM ${emails} e
        INNER JOIN ${userMailboxes} um ON e.mailbox_id = um.mailbox_id
        WHERE um.user_id = ${userId}
      )`,
      unreadEmails: sql<number>`(
        SELECT COUNT(*) FROM ${emails} e
        INNER JOIN ${userMailboxes} um ON e.mailbox_id = um.mailbox_id
        WHERE um.user_id = ${userId} AND e.is_read = false
      )`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
  return stats[0];
}
```

## 4. 邮箱生命周期管理

### 4.1 用户邮箱过期策略
```typescript
// 用户邮箱不使用24小时过期，而是跟随用户账号
export async function updateUserMailboxExpiration(
  db: ReturnType<typeof createDB>,
  userId: string,
  newExpirationDate: Date
): Promise<void> {
  // 更新用户所有邮箱的过期时间
  await db
    .update(mailboxes)
    .set({ expiresAt: newExpirationDate })
    .where(and(
      eq(mailboxes.ownerId, userId),
      eq(mailboxes.ownerType, "user")
    ));
}
```

### 4.2 清理过期用户邮箱
```typescript
export async function cleanupExpiredUserMailboxes(
  db: ReturnType<typeof createDB>
): Promise<void> {
  const now = new Date();
  
  // 1. 获取过期的用户邮箱
  const expiredMailboxes = await db
    .select({ id: mailboxes.id })
    .from(mailboxes)
    .where(and(
      eq(mailboxes.ownerType, "user"),
      lt(mailboxes.expiresAt, now)
    ));
    
  if (expiredMailboxes.length === 0) return;
  
  const expiredIds = expiredMailboxes.map(m => m.id);
  
  // 2. 删除关联的邮件和附件
  await db.delete(emails).where(inArray(emails.mailboxId, expiredIds));
  
  // 3. 删除用户-邮箱关联
  await db.delete(userMailboxes).where(inArray(userMailboxes.mailboxId, expiredIds));
  
  // 4. 删除邮箱记录
  await db.delete(mailboxes).where(inArray(mailboxes.id, expiredIds));
  
  console.log(`🧹 清理了 ${expiredIds.length} 个过期用户邮箱`);
}
```

## 5. 兼容性处理

### 5.1 修改现有的getOrCreateMailbox函数
```typescript
// 修改 app/lib/db.ts 中的函数
export async function getOrCreateMailbox(
  db: ReturnType<typeof createDB>,
  email: string,
  ownerId?: string,
  ownerType: "user" | "anonymous" = "anonymous"
): Promise<Mailbox> {
  const now = new Date();
  
  // 查找现有邮箱
  const existing = await db
    .select()
    .from(mailboxes)
    .where(and(
      eq(mailboxes.email, email),
      gt(mailboxes.expiresAt, now)
    ))
    .limit(1);
    
  if (existing.length > 0) {
    return existing[0];
  }
  
  // 创建新邮箱
  const expiresAt = ownerType === "user" 
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 用户邮箱1年
    : new Date(Date.now() + APP_CONFIG.email.expirationHours * 60 * 60 * 1000); // 匿名邮箱24小时
    
  const newMailbox: NewMailbox = {
    id: nanoid(),
    email,
    expiresAt,
    isActive: true,
    ownerId,
    ownerType,
  };
  
  await db.insert(mailboxes).values(newMailbox);
  
  return {
    ...newMailbox,
    createdAt: now,
  } as Mailbox;
}
```
