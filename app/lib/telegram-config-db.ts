/**
 * Telegram 推送配置数据库操作
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { telegramPushConfigs, pushLogs, type TelegramPushConfig, type NewTelegramPushConfig, type NewPushLog } from "~/db/schema";

/**
 * 获取邮箱的 Telegram 推送配置
 */
export async function getTelegramConfig(
  db: DrizzleD1Database,
  mailboxId: string
): Promise<TelegramPushConfig | null> {
  try {
    const configs = await db
      .select()
      .from(telegramPushConfigs)
      .where(eq(telegramPushConfigs.mailboxId, mailboxId))
      .limit(1);

    return configs.length > 0 ? configs[0] : null;
  } catch (error) {
    console.error("获取 Telegram 配置失败:", error);
    return null;
  }
}

/**
 * 创建或更新 Telegram 推送配置
 */
export async function upsertTelegramConfig(
  db: DrizzleD1Database,
  mailboxId: string,
  config: {
    botToken: string;
    chatId: string;
    enabled?: boolean;
  }
): Promise<{ success: boolean; config?: TelegramPushConfig; error?: string }> {
  try {
    // 检查是否已存在配置
    const existing = await getTelegramConfig(db, mailboxId);
    
    if (existing) {
      // 更新现有配置
      const updatedConfigs = await db
        .update(telegramPushConfigs)
        .set({
          botToken: config.botToken,
          chatId: config.chatId,
          enabled: config.enabled ?? true,
          updatedAt: new Date(),
        })
        .where(eq(telegramPushConfigs.id, existing.id))
        .returning();

      return {
        success: true,
        config: updatedConfigs[0]
      };
    } else {
      // 创建新配置
      const newConfig: NewTelegramPushConfig = {
        id: nanoid(),
        mailboxId,
        botToken: config.botToken,
        chatId: config.chatId,
        enabled: config.enabled ?? true,
      };

      const createdConfigs = await db
        .insert(telegramPushConfigs)
        .values(newConfig)
        .returning();

      return {
        success: true,
        config: createdConfigs[0]
      };
    }
  } catch (error) {
    console.error("保存 Telegram 配置失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "保存配置失败"
    };
  }
}

/**
 * 删除 Telegram 推送配置
 */
export async function deleteTelegramConfig(
  db: DrizzleD1Database,
  mailboxId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(telegramPushConfigs)
      .where(eq(telegramPushConfigs.mailboxId, mailboxId));

    return { success: true };
  } catch (error) {
    console.error("删除 Telegram 配置失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除配置失败"
    };
  }
}

/**
 * 启用/禁用 Telegram 推送
 */
export async function toggleTelegramPush(
  db: DrizzleD1Database,
  mailboxId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(telegramPushConfigs)
      .set({
        enabled,
        updatedAt: new Date(),
      })
      .where(eq(telegramPushConfigs.mailboxId, mailboxId));

    return { success: true };
  } catch (error) {
    console.error("切换 Telegram 推送状态失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "操作失败"
    };
  }
}

/**
 * 记录推送日志
 */
export async function logPushAttempt(
  db: DrizzleD1Database,
  mailboxId: string,
  emailId: string,
  status: "success" | "failed" | "pending",
  errorMessage?: string
): Promise<void> {
  try {
    const logEntry: NewPushLog = {
      id: nanoid(),
      mailboxId,
      emailId,
      pushType: "telegram",
      status,
      errorMessage,
    };

    await db.insert(pushLogs).values(logEntry);
  } catch (error) {
    console.error("记录推送日志失败:", error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 获取推送日志
 */
export async function getPushLogs(
  db: DrizzleD1Database,
  mailboxId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    return await db
      .select({
        id: pushLogs.id,
        emailId: pushLogs.emailId,
        pushType: pushLogs.pushType,
        status: pushLogs.status,
        errorMessage: pushLogs.errorMessage,
        createdAt: pushLogs.createdAt,
      })
      .from(pushLogs)
      .where(eq(pushLogs.mailboxId, mailboxId))
      .orderBy(pushLogs.createdAt)
      .limit(limit);
  } catch (error) {
    console.error("获取推送日志失败:", error);
    return [];
  }
}

/**
 * 获取所有启用推送的邮箱配置
 */
export async function getAllEnabledTelegramConfigs(
  db: DrizzleD1Database
): Promise<TelegramPushConfig[]> {
  try {
    return await db
      .select()
      .from(telegramPushConfigs)
      .where(eq(telegramPushConfigs.enabled, true));
  } catch (error) {
    console.error("获取启用的 Telegram 配置失败:", error);
    return [];
  }
}

/**
 * 批量清理过期的推送日志
 */
export async function cleanupOldPushLogs(
  db: DrizzleD1Database,
  daysToKeep: number = 30
): Promise<void> {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    await db
      .delete(pushLogs)
      .where(eq(pushLogs.createdAt, cutoffDate));
    
    console.log(`清理了 ${daysToKeep} 天前的推送日志`);
  } catch (error) {
    console.error("清理推送日志失败:", error);
  }
}
