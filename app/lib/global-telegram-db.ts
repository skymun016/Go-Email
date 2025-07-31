/**
 * 全局 Telegram 推送配置数据库操作
 */

import { eq } from "drizzle-orm";
import type { Database } from "~/lib/db";
import { globalTelegramConfigs, pushLogs } from "~/db/schema";
import type { GlobalTelegramConfig, NewGlobalTelegramConfig } from "~/db/schema";

/**
 * 获取全局 Telegram 配置
 */
export async function getGlobalTelegramConfig(db: Database): Promise<GlobalTelegramConfig | null> {
  try {
    const config = await db.query.globalTelegramConfigs.findFirst();
    return config || null;
  } catch (error) {
    console.error("获取全局 Telegram 配置失败:", error);
    return null;
  }
}

/**
 * 保存或更新全局 Telegram 配置
 */
export async function upsertGlobalTelegramConfig(
  db: Database,
  config: { botToken: string; chatId: string; enabled: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("开始保存全局 Telegram 配置:", config);

    const now = new Date();
    const existingConfig = await db.query.globalTelegramConfigs.findFirst();

    console.log("现有配置:", existingConfig);

    if (existingConfig) {
      // 更新现有配置
      console.log("更新现有配置...");
      await db.update(globalTelegramConfigs)
        .set({
          botToken: config.botToken,
          chatId: config.chatId,
          enabled: config.enabled,
          updatedAt: now,
        })
        .where(eq(globalTelegramConfigs.id, existingConfig.id));
    } else {
      // 创建新配置
      console.log("创建新配置...");
      await db.insert(globalTelegramConfigs).values({
        id: crypto.randomUUID(),
        botToken: config.botToken,
        chatId: config.chatId,
        enabled: config.enabled,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log("全局 Telegram 配置保存成功");
    return { success: true };
  } catch (error) {
    console.error("保存全局 Telegram 配置失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, error: errorMessage };
  }
}

/**
 * 切换全局推送状态
 */
export async function toggleGlobalTelegramPush(db: Database): Promise<boolean> {
  try {
    const config = await db.query.globalTelegramConfigs.findFirst();
    
    if (!config) {
      return false;
    }
    
    await db.update(globalTelegramConfigs)
      .set({
        enabled: !config.enabled,
        updatedAt: new Date(),
      })
      .where(eq(globalTelegramConfigs.id, config.id));
    
    return true;
  } catch (error) {
    console.error("切换全局推送状态失败:", error);
    return false;
  }
}

/**
 * 删除全局 Telegram 配置
 */
export async function deleteGlobalTelegramConfig(db: Database): Promise<boolean> {
  try {
    const config = await db.query.globalTelegramConfigs.findFirst();
    
    if (!config) {
      return false;
    }
    
    await db.delete(globalTelegramConfigs)
      .where(eq(globalTelegramConfigs.id, config.id));
    
    return true;
  } catch (error) {
    console.error("删除全局 Telegram 配置失败:", error);
    return false;
  }
}

/**
 * 记录全局推送日志
 */
export async function logGlobalPushAttempt(
  db: Database,
  mailboxId: string,
  emailId: string,
  status: 'success' | 'failed' | 'pending',
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      mailboxId,
      emailId,
      pushType: 'telegram',
      status,
      errorMessage: errorMessage || null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("记录全局推送日志失败:", error);
  }
}

/**
 * 验证 Bot Token 格式
 */
export function validateBotToken(token: string): boolean {
  return /^\d+:[A-Za-z0-9_-]+$/.test(token);
}

/**
 * 验证 Chat ID 格式
 */
export function validateChatId(chatId: string): boolean {
  return /^-?\d+$/.test(chatId);
}

/**
 * 测试 Telegram Bot 连接
 */
export async function testTelegramBot(botToken: string): Promise<{ success: boolean; error?: string; botInfo?: any }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      return { success: true, botInfo: result.result };
    } else {
      return { success: false, error: result.description || '未知错误' };
    }
  } catch (error) {
    return { success: false, error: '网络请求失败' };
  }
}

/**
 * 发送测试消息到 Telegram
 */
export async function sendTestMessage(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const message = {
      chat_id: chatId,
      text: `🤖 <b>全局邮件推送测试</b>\n\n✅ 如果您收到此消息，说明全局 Telegram 推送配置成功！\n\n📧 系统将自动转发所有用户的新邮件到此聊天。\n\n<i>测试时间: ${new Date().toLocaleString('zh-CN')}</i>\n\n<i>来自 AugMails 管理系统</i>`,
      parse_mode: 'HTML'
    };
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    
    const result = await response.json();
    
    if (result.ok) {
      return { success: true };
    } else {
      return { success: false, error: result.description || '发送失败' };
    }
  } catch (error) {
    return { success: false, error: '网络请求失败' };
  }
}

/**
 * 从邮件内容中提取验证码
 * 支持多种常见的验证码格式
 */
function extractVerificationCode(textContent?: string, htmlContent?: string): string | null {
  if (!textContent && !htmlContent) return null;

  // 合并文本内容和HTML内容进行搜索
  const content = `${textContent || ''} ${htmlContent || ''}`;

  // 定义多种验证码匹配模式
  const patterns = [
    // "Your verification code is: 123456"
    /(?:verification code|验证码)(?:\s*is)?(?:\s*[:：])\s*(\d{6})/i,
    // "验证码：123456"
    /验证码[:：]\s*(\d{6})/i,
    // "Code: 123456"
    /code[:：]\s*(\d{6})/i,
    // "OTP: 123456"
    /otp[:：]\s*(\d{6})/i,
    // "PIN: 123456"
    /pin[:：]\s*(\d{6})/i,
    // 独立的6位数字（更宽泛的匹配）
    /\b(\d{6})\b/,
  ];

  // 按优先级尝试匹配
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * 格式化邮件内容为 Telegram 消息
 * 优先发送验证码，如果没有验证码则发送邮件预览
 */
export function formatEmailForTelegram(email: any, mailbox: any): string {
  const textContent = email.textContent || '';
  const htmlContent = email.htmlContent || '';

  // 尝试提取验证码
  const verificationCode = extractVerificationCode(textContent, htmlContent);

  if (verificationCode) {
    // 如果找到验证码，只发送验证码信息
    return `🔐 <b>验证码通知</b>

📮 <b>邮箱:</b> <code>${mailbox.email}</code>
👤 <b>发件人:</b> <code>${email.fromAddress}</code>
📝 <b>主题:</b> ${(email.subject || '(无主题)').replace(/</g, '&lt;').replace(/>/g, '&gt;')}

🔢 <b>验证码:</b> <code>${verificationCode}</code>

🕐 <b>时间:</b> ${new Date(email.receivedAt).toLocaleString('zh-CN')}

---
<i>来自 AugMails 邮件服务</i>`;
  } else {
    // 如果没有验证码，发送邮件预览（保持原有逻辑）
    const maxContentLength = 200;
    const content = textContent || htmlContent || '';
    const preview = content.length > maxContentLength
      ? content.substring(0, maxContentLength) + '...'
      : content;

    return `📧 <b>新邮件通知</b>

📮 <b>邮箱:</b> <code>${mailbox.email}</code>
👤 <b>发件人:</b> <code>${email.fromAddress}</code>
📝 <b>主题:</b> ${(email.subject || '(无主题)').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
🕐 <b>时间:</b> ${new Date(email.receivedAt).toLocaleString('zh-CN')}

📄 <b>内容预览:</b>
<pre>${preview.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>

---
<i>来自 AugMails 邮件服务</i>`;
  }
}

/**
 * 发送全局邮件通知到 Telegram
 */
export async function sendGlobalEmailNotification(
  config: GlobalTelegramConfig,
  email: any,
  mailbox: any
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!config.enabled) {
      return { success: false, error: '全局推送已禁用' };
    }
    
    const message = {
      chat_id: config.chatId,
      text: formatEmailForTelegram(email, mailbox),
      parse_mode: 'HTML'
    };
    
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    
    const result = await response.json();
    
    if (result.ok) {
      return { success: true };
    } else {
      return { success: false, error: result.description || '发送失败' };
    }
  } catch (error) {
    return { success: false, error: '网络请求失败' };
  }
}
