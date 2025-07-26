/**
 * 邮箱数据库操作函数
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import { nanoid } from "nanoid";
import { mailboxes } from "~/db/schema";

// 创建邮箱
export async function createMailbox(
  db: DrizzleD1Database,
  email: string
): Promise<string> {
  const mailboxId = nanoid();

  // 设置邮箱过期时间为30天后
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db.insert(mailboxes).values({
    id: mailboxId,
    email,
    createdAt: new Date(),
    expiresAt,
    isActive: true,
    ownerId: null,
    ownerType: "anonymous",
  });

  return mailboxId;
}

// 检查邮箱是否存在
export async function mailboxExists(
  db: DrizzleD1Database,
  email: string
): Promise<boolean> {
  const result = await db.query.mailboxes.findFirst({
    where: (mailboxes, { eq }) => eq(mailboxes.email, email),
  });
  
  return !!result;
}

// 获取邮箱信息
export async function getMailboxByEmail(
  db: DrizzleD1Database,
  email: string
) {
  return await db.query.mailboxes.findFirst({
    where: (mailboxes, { eq }) => eq(mailboxes.email, email),
  });
}

// 获取邮箱信息（通过ID）
export async function getMailboxById(
  db: DrizzleD1Database,
  mailboxId: string
) {
  return await db.query.mailboxes.findFirst({
    where: (mailboxes, { eq }) => eq(mailboxes.id, mailboxId),
  });
}
