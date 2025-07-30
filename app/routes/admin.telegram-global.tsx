/**
 * 超级管理员全局 Telegram 推送配置页面
 * 配置系统级别的邮件转发到 Telegram
 */

import type { Route } from "./+types/admin.telegram-global";
import { Form, useActionData, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Settings, Send, AlertCircle, CheckCircle, Bot } from "lucide-react";
import { useState } from "react";
import { globalTelegramConfigs } from "~/db/schema";
import { eq } from "drizzle-orm";
import {
  getGlobalTelegramConfig,
  upsertGlobalTelegramConfig,
  toggleGlobalTelegramPush,
  sendTestMessage,
  validateBotToken,
  validateChatId
} from "~/lib/global-telegram-db";

// 全局配置表结构
interface GlobalTelegramConfig {
  id: string;
  botToken: string;
  chatId: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  await requireAdmin(request, env);

  const db = createDB(getDatabase(env));

  // 获取全局配置
  const config = await getGlobalTelegramConfig(db);

  return { config };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  await requireAdmin(request, env);
  
  const formData = await request.formData();
  const action = formData.get("action") as string;
  
  const db = createDB(getDatabase(env));
  
  try {
    if (action === "save") {
      const botToken = formData.get("botToken") as string;
      const chatId = formData.get("chatId") as string;
      const enabled = formData.get("enabled") === "true";

      if (!botToken || !chatId) {
        return { success: false, error: "Bot Token 和 Chat ID 不能为空" };
      }

      // 验证 Bot Token 格式
      if (!validateBotToken(botToken)) {
        return { success: false, error: "Bot Token 格式不正确" };
      }

      // 验证 Chat ID 格式
      if (!validateChatId(chatId)) {
        return { success: false, error: "Chat ID 必须是数字" };
      }

      // 保存配置
      const result = await upsertGlobalTelegramConfig(db, {
        botToken,
        chatId,
        enabled,
      });

      if (result.success) {
        return { success: true, message: "全局 Telegram 配置保存成功" };
      } else {
        return { success: false, error: result.error || "保存配置失败" };
      }
      
    } else if (action === "test") {
      const config = await getGlobalTelegramConfig(db);

      if (!config) {
        return { success: false, error: "请先保存配置" };
      }

      // 测试推送
      const result = await sendTestMessage(config.botToken, config.chatId);

      if (result.success) {
        return { success: true, message: "测试消息发送成功！请检查 Telegram" };
      } else {
        return { success: false, error: `测试失败: ${result.error}` };
      }
      
    } else if (action === "toggle") {
      const config = await getGlobalTelegramConfig(db);

      if (!config) {
        return { success: false, error: "配置不存在" };
      }

      const success = await toggleGlobalTelegramPush(db);

      if (success) {
        return {
          success: true,
          message: `全局推送已${!config.enabled ? '启用' : '禁用'}`
        };
      } else {
        return { success: false, error: "操作失败" };
      }
    }
    
  } catch (error) {
    console.error("全局 Telegram 配置操作失败:", error);
    return { success: false, error: "操作失败，请重试" };
  }
  
  return { success: false, error: "无效的操作" };
}

export default function AdminTelegramGlobal({ loaderData, actionData }: Route.ComponentProps) {
  const { config } = loaderData;
  const result = actionData;
  const [showToken, setShowToken] = useState(false);
  
  const maskToken = (token: string) => {
    if (!token) return '';
    const parts = token.split(':');
    if (parts.length !== 2) return token;
    return `${parts[0]}:${parts[1].substring(0, 4)}****${parts[1].slice(-4)}`;
  };
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Bot className="w-6 h-6 mr-3 text-blue-600" />
          全局 Telegram 推送配置
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          配置系统级别的邮件转发，所有用户的新邮件都将推送到指定的 Telegram 聊天
        </p>
      </div>

      {/* 状态提示 */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {result.message || result.error}
          </AlertDescription>
        </Alert>
      )}

      {/* 配置表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            推送配置
          </CardTitle>
          <CardDescription>
            配置 Telegram Bot 信息，用于接收所有邮件通知
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <input type="hidden" name="action" value="save" />
            
            {/* Bot Token */}
            <div className="space-y-2">
              <Label htmlFor="botToken">Bot Token</Label>
              <div className="flex space-x-2">
                <Input
                  id="botToken"
                  name="botToken"
                  type={showToken ? "text" : "password"}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  defaultValue={config?.botToken || ""}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? "隐藏" : "显示"}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                从 @BotFather 获取的 Bot Token
                {config?.botToken && !showToken && (
                  <span className="ml-2 text-blue-600">
                    当前: {maskToken(config.botToken)}
                  </span>
                )}
              </p>
            </div>

            {/* Chat ID */}
            <div className="space-y-2">
              <Label htmlFor="chatId">Chat ID</Label>
              <Input
                id="chatId"
                name="chatId"
                type="text"
                placeholder="-1001234567890 或 123456789"
                defaultValue={config?.chatId || ""}
              />
              <p className="text-sm text-gray-500">
                接收推送的聊天 ID（个人聊天或群组聊天）
              </p>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                name="enabled"
                defaultChecked={config?.enabled ?? true}
              />
              <Label htmlFor="enabled">启用全局推送</Label>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <Button type="submit">
                <Settings className="w-4 h-4 mr-2" />
                保存配置
              </Button>
              
              {config && (
                <Form method="post" className="inline">
                  <input type="hidden" name="action" value="test" />
                  <Button type="submit" variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    测试推送
                  </Button>
                </Form>
              )}
              
              {config && (
                <Form method="post" className="inline">
                  <input type="hidden" name="action" value="toggle" />
                  <Button 
                    type="submit" 
                    variant={config.enabled ? "destructive" : "default"}
                  >
                    {config.enabled ? "禁用推送" : "启用推送"}
                  </Button>
                </Form>
              )}
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">1. 创建 Telegram Bot</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• 在 Telegram 中搜索 @BotFather</li>
              <li>• 发送 /newbot 命令创建新 Bot</li>
              <li>• 设置 Bot 名称和用户名</li>
              <li>• 获取 Bot Token</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">2. 获取 Chat ID</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• 个人聊天：使用 @userinfobot 获取你的 Chat ID</li>
              <li>• 群组聊天：将 Bot 添加到群组，使用 @userinfobot 获取群组 ID</li>
              <li>• 或者向 Bot 发送消息后访问 API 获取</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">3. 推送范围</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• 系统中所有用户的新邮件都会推送</li>
              <li>• 包括匿名邮箱和注册用户邮箱</li>
              <li>• 推送消息包含发件人、收件人、主题和内容预览</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
