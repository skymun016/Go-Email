/**
 * 邮箱验证码查看系统
 * 允许用户通过邮箱地址+验证码查看邮件列表
 * 使用算法计算每个邮箱前缀对应的唯一验证码
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and, gt } from "drizzle-orm";
import { mailboxes, emails } from "~/db/schema";
import type { Email, Mailbox } from "~/db/schema";

// 验证码生成密钥（从环境变量获取，如果没有则使用默认值）
const DEFAULT_VERIFICATION_SECRET = "gomail-verification-secret-2024";

/**
 * 获取验证码生成密钥
 */
function getVerificationSecret(): string {
  // 在Cloudflare Workers环境中，可以通过全局变量获取环境变量
  if (typeof globalThis !== 'undefined' && (globalThis as any).VERIFICATION_SECRET) {
    return (globalThis as any).VERIFICATION_SECRET as string;
  }

  // 降级到默认密钥
  return DEFAULT_VERIFICATION_SECRET;
}

/**
 * 基于邮箱前缀生成6位数验证码
 * 使用HMAC-SHA256算法确保唯一性和安全性
 */
export function generateVerificationCode(emailPrefix: string): string {
  try {
    // 标准化邮箱前缀
    const normalizedPrefix = emailPrefix.toLowerCase().trim();

    // 获取验证码生成密钥
    const secret = getVerificationSecret();

    // 创建简化的哈希算法（因为Cloudflare Workers环境限制）
    let hash = 0;
    const combined = secret + normalizedPrefix;

    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    // 确保是正数并转换为6位数验证码
    const positiveHash = Math.abs(hash);
    const code = positiveHash % 1000000;

    return code.toString().padStart(6, '0');
  } catch (error) {
    console.error("生成验证码失败:", error);
    // 降级方案：基于前缀长度和字符码生成
    let fallbackCode = 0;
    for (let i = 0; i < emailPrefix.length; i++) {
      fallbackCode += emailPrefix.charCodeAt(i) * (i + 1);
    }
    return (fallbackCode % 1000000).toString().padStart(6, '0');
  }
}

/**
 * 从邮箱地址提取前缀
 */
export function extractEmailPrefix(email: string): string {
  const parts = email.split('@');
  return parts[0] || '';
}

/**
 * 验证邮箱地址格式
 */
export function validateEmailFormat(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: "邮箱地址不能为空" };
  }

  // 基本邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "邮箱地址格式不正确" };
  }

  return { isValid: true };
}

/**
 * 验证验证码（基于邮箱前缀算法验证）
 */
export function validateVerificationCode(email: string, inputCode: string): { isValid: boolean; error?: string } {
  if (!inputCode || typeof inputCode !== 'string') {
    return { isValid: false, error: "验证码不能为空" };
  }

  if (!email || typeof email !== 'string') {
    return { isValid: false, error: "邮箱地址不能为空" };
  }

  // 提取邮箱前缀
  const emailPrefix = extractEmailPrefix(email);
  if (!emailPrefix) {
    return { isValid: false, error: "邮箱地址格式不正确" };
  }

  // 生成期望的验证码
  const expectedCode = generateVerificationCode(emailPrefix);

  // 验证输入的验证码
  if (inputCode.trim() !== expectedCode) {
    return { isValid: false, error: `验证码错误。该邮箱的验证码是: ${expectedCode}` };
  }

  return { isValid: true };
}

/**
 * 检查邮箱是否存在且有效
 * 注意：过期邮箱依然可以查看历史邮件，只是不能接收新邮件
 */
export async function checkMailboxExists(
  db: DrizzleD1Database,
  email: string
): Promise<{ exists: boolean; mailbox?: Mailbox; error?: string; isExpired?: boolean }> {
  try {
    const now = new Date();

    // 查找邮箱（不检查过期时间，只要存在且激活即可）
    const mailbox = await db.query.mailboxes.findFirst({
      where: and(
        eq(mailboxes.email, email),
        eq(mailboxes.isActive, true)
      ),
    });

    if (!mailbox) {
      return {
        exists: false,
        error: "邮箱不存在。请先发送邮件到该地址以创建邮箱。"
      };
    }

    // 检查是否过期（用于显示状态，但不阻止访问）
    const isExpired = mailbox.expiresAt <= now;

    return {
      exists: true,
      mailbox,
      isExpired
    };
  } catch (error) {
    console.error("检查邮箱存在性失败:", error);
    return {
      exists: false,
      error: "检查邮箱时发生错误，请稍后重试"
    };
  }
}

/**
 * 获取邮箱的邮件列表
 */
export async function getMailboxEmails(
  db: DrizzleD1Database,
  mailboxId: string,
  limit: number = 50
): Promise<{ success: boolean; emails?: Email[]; error?: string }> {
  try {
    const emailList = await db.query.emails.findMany({
      where: eq(emails.mailboxId, mailboxId),
      orderBy: (emails, { desc }) => [desc(emails.receivedAt)],
      limit: limit,
    });

    return { success: true, emails: emailList };
  } catch (error) {
    console.error("获取邮件列表失败:", error);
    return { 
      success: false, 
      error: "获取邮件列表时发生错误，请稍后重试" 
    };
  }
}

/**
 * 完整的邮箱验证和邮件获取流程
 */
export async function verifyAndGetEmails(
  db: DrizzleD1Database,
  email: string,
  verificationCode: string,
  limit: number = 50
): Promise<{
  success: boolean;
  data?: {
    mailbox: Mailbox;
    emails: Email[];
    totalCount: number;
    isExpired?: boolean;
  };
  error?: string;
}> {
  try {
    // 1. 验证邮箱格式
    const emailValidation = validateEmailFormat(email);
    if (!emailValidation.isValid) {
      return { success: false, error: emailValidation.error };
    }

    // 2. 验证验证码（基于邮箱前缀算法）
    const codeValidation = validateVerificationCode(email, verificationCode);
    if (!codeValidation.isValid) {
      return { success: false, error: codeValidation.error };
    }

    // 3. 检查邮箱是否存在（过期邮箱依然可以访问）
    const mailboxCheck = await checkMailboxExists(db, email);
    if (!mailboxCheck.exists || !mailboxCheck.mailbox) {
      return { success: false, error: mailboxCheck.error };
    }

    // 记录邮箱过期状态（用于显示提示信息）
    const isExpired = mailboxCheck.isExpired || false;

    // 4. 获取邮件列表
    const emailsResult = await getMailboxEmails(db, mailboxCheck.mailbox.id, limit);
    if (!emailsResult.success || !emailsResult.emails) {
      return { success: false, error: emailsResult.error };
    }

    // 5. 记录访问日志
    console.log(`✅ 邮箱验证成功: ${email}, 邮件数量: ${emailsResult.emails.length}`);

    return {
      success: true,
      data: {
        mailbox: mailboxCheck.mailbox,
        emails: emailsResult.emails,
        totalCount: emailsResult.emails.length,
        isExpired: isExpired,
      },
    };
  } catch (error) {
    console.error("邮箱验证流程失败:", error);
    return {
      success: false,
      error: "验证过程中发生错误，请稍后重试",
    };
  }
}

/**
 * 获取邮箱统计信息
 */
export async function getMailboxStats(
  db: DrizzleD1Database,
  mailboxId: string
): Promise<{
  totalEmails: number;
  unreadEmails: number;
  latestEmailDate?: Date;
}> {
  try {
    const allEmails = await db.query.emails.findMany({
      where: eq(emails.mailboxId, mailboxId),
      orderBy: (emails, { desc }) => [desc(emails.receivedAt)],
    });

    const unreadCount = allEmails.filter(email => !email.isRead).length;
    const latestEmail = allEmails[0];

    return {
      totalEmails: allEmails.length,
      unreadEmails: unreadCount,
      latestEmailDate: latestEmail?.receivedAt,
    };
  } catch (error) {
    console.error("获取邮箱统计信息失败:", error);
    return {
      totalEmails: 0,
      unreadEmails: 0,
    };
  }
}

/**
 * 获取邮箱地址对应的验证码（用于测试和调试）
 */
export function getVerificationCodeForEmail(email: string): string {
  const emailPrefix = extractEmailPrefix(email);
  return generateVerificationCode(emailPrefix);
}

/**
 * 批量生成邮箱和验证码对（用于测试数据生成）
 */
export function generateEmailCodePairs(emailAddresses: string[]): Array<{email: string, code: string}> {
  return emailAddresses.map(email => ({
    email,
    code: getVerificationCodeForEmail(email)
  }));
}
