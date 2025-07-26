/**
 * 用户管理数据库操作函数
 * 提供用户CRUD、邮箱分配、配额管理等核心功能
 */

import { and, count, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { 
  users, 
  userMailboxes, 
  mailboxes, 
  emails,
  type User, 
  type NewUser, 
  type UserMailbox, 
  type NewUserMailbox,
  type Mailbox,
  type NewMailbox
} from "~/db/schema";

// 用户CRUD操作
export async function createUser(
  db: DrizzleD1Database,
  userData: {
    username: string;
    passwordHash: string;
    email: string; // 现在是必需的
    emailQuota?: number;
    expiresAt?: Date;
  }
): Promise<User> {
  const userId = nanoid();
  const expiresAt = userData.expiresAt ||
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 默认1年过期

  const newUser: NewUser = {
    id: userId,
    username: userData.username,
    email: userData.email,
    passwordHash: userData.passwordHash,
    displayName: userData.username, // 默认使用用户名作为显示名
    isActive: true,
    emailQuota: userData.emailQuota || 5,
    quotaUsed: 0,
    expiresAt,
  };

  await db.insert(users).values(newUser);
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getUserById(
  db: DrizzleD1Database,
  userId: string
): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getUserByUsername(
  db: DrizzleD1Database,
  username: string
): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateUserLastLogin(
  db: DrizzleD1Database,
  userId: string
): Promise<void> {
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}

// 检查用户邮箱配额
export async function checkUserQuota(
  db: DrizzleD1Database,
  userId: string
): Promise<{
  current: number;
  limit: number;
  remaining: number;
  hasQuota: boolean;
}> {
  // 获取用户信息
  const user = await getUserById(db, userId);
  if (!user) {
    throw new Error("用户不存在");
  }

  // 获取用户当前邮箱数量
  const currentMailboxes = await db.query.userMailboxes.findMany({
    where: (userMailboxes, { eq }) => eq(userMailboxes.userId, userId),
  });

  const current = currentMailboxes.length;
  const limit = user.emailQuota;
  const remaining = Math.max(0, limit - current);
  const hasQuota = remaining > 0;

  return {
    current,
    limit,
    remaining,
    hasQuota,
  };
}

// 更新用户信息
export async function updateUser(
  db: DrizzleD1Database,
  userId: string,
  updates: {
    emailQuota?: number;
    isActive?: boolean;
    expiresAt?: Date | null;
    notes?: string;
  }
): Promise<void> {
  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId));
}

// 邮箱分配和管理
export async function createUserMailbox(
  db: DrizzleD1Database,
  userId: string,
  email: string,
  isPermanent: boolean = false
): Promise<Mailbox> {
  const mailboxId = nanoid();

  // 1. 创建邮箱记录
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 用户邮箱1年过期

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
    assignedEmail: email,
    isPermanent,
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

export async function getUserMailboxes(
  db: DrizzleD1Database,
  userId: string
): Promise<Array<Mailbox & { isPermanent: boolean; emailCount: number; unreadCount: number }>> {
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
      isPermanent: userMailboxes.isPermanent,
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
    .orderBy(desc(userMailboxes.isPermanent), desc(mailboxes.createdAt));
    
  return result;
}

export async function getUserDefaultMailbox(
  db: DrizzleD1Database,
  userId: string
): Promise<Mailbox | null> {
  const result = await db
    .select()
    .from(mailboxes)
    .innerJoin(userMailboxes, eq(mailboxes.id, userMailboxes.mailboxId))
    .where(and(
      eq(userMailboxes.userId, userId),
      eq(userMailboxes.isPermanent, true)
    ))
    .limit(1);
    
  return result.length > 0 ? result[0].mailboxes : null;
}

export async function setUserDefaultMailbox(
  db: DrizzleD1Database,
  userId: string,
  mailboxId: string
): Promise<void> {
  // 1. 清除当前默认邮箱
  await db
    .update(userMailboxes)
    .set({ isPermanent: false })
    .where(eq(userMailboxes.userId, userId));

  // 2. 设置新的默认邮箱
  await db
    .update(userMailboxes)
    .set({ isPermanent: true })
    .where(and(
      eq(userMailboxes.userId, userId),
      eq(userMailboxes.mailboxId, mailboxId)
    ));
}

export async function updateUserQuota(
  db: DrizzleD1Database,
  userId: string,
  quotaUsed: number
): Promise<void> {
  await db
    .update(users)
    .set({ quotaUsed })
    .where(eq(users.id, userId));
}

// 数据迁移和验证
export async function migrateExistingData(db: DrizzleD1Database): Promise<void> {
  console.log("🔄 开始数据迁移...");
  
  // 标记现有邮箱为匿名类型
  const result = await db
    .update(mailboxes)
    .set({ 
      ownerType: "anonymous",
      ownerId: null 
    })
    .where(isNull(mailboxes.ownerType));
    
  console.log(`✅ 迁移了 ${result.changes} 个匿名邮箱`);
  
  // 验证数据完整性
  const totalMailboxes = await db
    .select({ count: count() })
    .from(mailboxes);
    
  const anonymousMailboxes = await db
    .select({ count: count() })
    .from(mailboxes)
    .where(eq(mailboxes.ownerType, "anonymous"));
    
  console.log(`📊 总邮箱数: ${totalMailboxes[0].count}, 匿名邮箱数: ${anonymousMailboxes[0].count}`);
}
