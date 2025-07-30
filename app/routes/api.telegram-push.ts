/**
 * Telegram 推送配置 API 路由
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { json } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { 
  getTelegramConfig, 
  upsertTelegramConfig, 
  deleteTelegramConfig, 
  toggleTelegramPush,
  getPushLogs 
} from "~/lib/telegram-config-db";
import { 
  validateTelegramConfig, 
  getTelegramBotInfo, 
  createTelegramPushService 
} from "~/lib/telegram-push";
import { getOrCreateMailbox } from "~/lib/db";

// GET - 获取推送配置
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env } = context.cloudflare;
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const action = url.searchParams.get("action");

  if (!email) {
    return json({ error: "缺少邮箱参数" }, { status: 400 });
  }

  try {
    const db = createDB(getDatabase(env));
    const mailbox = await getOrCreateMailbox(db, email);

    if (action === "logs") {
      // 获取推送日志
      const logs = await getPushLogs(db, mailbox.id);
      return json({ success: true, data: logs });
    }

    // 获取推送配置
    const config = await getTelegramConfig(db, mailbox.id);
    
    if (!config) {
      return json({ 
        success: true, 
        data: null,
        message: "未配置 Telegram 推送" 
      });
    }

    // 不返回敏感信息
    const safeConfig = {
      id: config.id,
      enabled: config.enabled,
      chatId: config.chatId,
      botTokenMasked: config.botToken.replace(/^(\d+:)(.{4}).*(.{4})$/, '$1$2****$3'),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };

    return json({ success: true, data: safeConfig });
  } catch (error) {
    console.error("获取 Telegram 配置失败:", error);
    return json({ 
      error: "获取配置失败", 
      details: error instanceof Error ? error.message : "未知错误" 
    }, { status: 500 });
  }
}

// POST - 创建/更新推送配置
export async function action({ request, context }: ActionFunctionArgs) {
  const { env } = context.cloudflare;
  
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const email = formData.get("email") as string;

    if (!email) {
      return json({ error: "缺少邮箱参数" }, { status: 400 });
    }

    const db = createDB(getDatabase(env));
    const mailbox = await getOrCreateMailbox(db, email);

    switch (action) {
      case "save": {
        const botToken = formData.get("botToken") as string;
        const chatId = formData.get("chatId") as string;
        const enabled = formData.get("enabled") === "true";

        // 验证配置
        const validation = validateTelegramConfig({ botToken, chatId, enabled });
        if (!validation.isValid) {
          return json({ 
            error: "配置验证失败", 
            details: validation.errors 
          }, { status: 400 });
        }

        // 验证 Bot Token 是否有效
        const botInfo = await getTelegramBotInfo(botToken);
        if (!botInfo.success) {
          return json({ 
            error: "Bot Token 验证失败", 
            details: botInfo.error 
          }, { status: 400 });
        }

        // 保存配置
        const result = await upsertTelegramConfig(db, mailbox.id, {
          botToken,
          chatId,
          enabled,
        });

        if (!result.success) {
          return json({ 
            error: "保存配置失败", 
            details: result.error 
          }, { status: 500 });
        }

        return json({ 
          success: true, 
          message: "配置保存成功",
          botInfo: botInfo.botInfo 
        });
      }

      case "test": {
        const config = await getTelegramConfig(db, mailbox.id);
        if (!config || !config.enabled) {
          return json({ 
            error: "未找到启用的推送配置" 
          }, { status: 400 });
        }

        // 测试推送
        const pushService = createTelegramPushService({
          botToken: config.botToken,
          chatId: config.chatId,
          enabled: config.enabled,
        });

        const testResult = await pushService.testConnection();
        
        if (testResult.success) {
          return json({ 
            success: true, 
            message: "测试消息发送成功！" 
          });
        } else {
          return json({ 
            error: "测试失败", 
            details: testResult.error 
          }, { status: 400 });
        }
      }

      case "toggle": {
        const enabled = formData.get("enabled") === "true";
        const result = await toggleTelegramPush(db, mailbox.id, enabled);
        
        if (!result.success) {
          return json({ 
            error: "切换状态失败", 
            details: result.error 
          }, { status: 500 });
        }

        return json({ 
          success: true, 
          message: enabled ? "推送已启用" : "推送已禁用" 
        });
      }

      case "delete": {
        const result = await deleteTelegramConfig(db, mailbox.id);
        
        if (!result.success) {
          return json({ 
            error: "删除配置失败", 
            details: result.error 
          }, { status: 500 });
        }

        return json({ 
          success: true, 
          message: "配置已删除" 
        });
      }

      default:
        return json({ error: "不支持的操作" }, { status: 400 });
    }
  } catch (error) {
    console.error("Telegram 推送 API 错误:", error);
    return json({ 
      error: "服务器内部错误", 
      details: error instanceof Error ? error.message : "未知错误" 
    }, { status: 500 });
  }
}
