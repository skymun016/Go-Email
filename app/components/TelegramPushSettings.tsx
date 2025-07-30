/**
 * Telegram 推送设置组件
 */

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { 
  Send, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  ExternalLink,
  Trash2
} from "lucide-react";

interface TelegramConfig {
  id?: string;
  enabled: boolean;
  chatId: string;
  botTokenMasked?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TelegramPushSettingsProps {
  mailboxEmail: string;
  className?: string;
}

export function TelegramPushSettings({ mailboxEmail, className }: TelegramPushSettingsProps) {
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [formData, setFormData] = useState({
    botToken: "",
    chatId: "",
    enabled: true,
  });
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, [mailboxEmail]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/telegram-push?email=${encodeURIComponent(mailboxEmail)}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setConfig(result.data);
        setFormData({
          botToken: "",
          chatId: result.data.chatId,
          enabled: result.data.enabled,
        });
      } else {
        setConfig(null);
      }
    } catch (error) {
      console.error("加载配置失败:", error);
      setMessage({ type: "error", text: "加载配置失败" });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!formData.botToken && !config) {
      setMessage({ type: "error", text: "请输入 Bot Token" });
      return;
    }
    
    if (!formData.chatId) {
      setMessage({ type: "error", text: "请输入 Chat ID" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const form = new FormData();
      form.append("action", "save");
      form.append("email", mailboxEmail);
      form.append("botToken", formData.botToken || "");
      form.append("chatId", formData.chatId);
      form.append("enabled", formData.enabled.toString());

      const response = await fetch("/api/telegram-push", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setShowTokenInput(false);
        await loadConfig(); // 重新加载配置
      } else {
        setMessage({ type: "error", text: result.error || "保存失败" });
      }
    } catch (error) {
      console.error("保存配置失败:", error);
      setMessage({ type: "error", text: "保存配置失败" });
    } finally {
      setSaving(false);
    }
  };

  const testPush = async () => {
    try {
      setTesting(true);
      setMessage(null);

      const form = new FormData();
      form.append("action", "test");
      form.append("email", mailboxEmail);

      const response = await fetch("/api/telegram-push", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.error || "测试失败" });
      }
    } catch (error) {
      console.error("测试推送失败:", error);
      setMessage({ type: "error", text: "测试推送失败" });
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = async () => {
    try {
      const form = new FormData();
      form.append("action", "toggle");
      form.append("email", mailboxEmail);
      form.append("enabled", (!config?.enabled).toString());

      const response = await fetch("/api/telegram-push", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        await loadConfig();
      } else {
        setMessage({ type: "error", text: result.error || "操作失败" });
      }
    } catch (error) {
      console.error("切换状态失败:", error);
      setMessage({ type: "error", text: "操作失败" });
    }
  };

  const deleteConfig = async () => {
    if (!confirm("确定要删除 Telegram 推送配置吗？")) {
      return;
    }

    try {
      const form = new FormData();
      form.append("action", "delete");
      form.append("email", mailboxEmail);

      const response = await fetch("/api/telegram-push", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setConfig(null);
        setFormData({ botToken: "", chatId: "", enabled: true });
      } else {
        setMessage({ type: "error", text: result.error || "删除失败" });
      }
    } catch (error) {
      console.error("删除配置失败:", error);
      setMessage({ type: "error", text: "删除失败" });
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Telegram 推送设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Telegram 推送设置
        </CardTitle>
        <CardDescription>
          配置 Telegram 机器人，在收到新邮件时自动推送通知
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert className={message.type === "error" ? "border-red-200 bg-red-50" : 
                          message.type === "success" ? "border-green-200 bg-green-50" : 
                          "border-blue-200 bg-blue-50"}>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {config ? (
          // 已配置状态
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">推送状态</span>
                <Badge variant={config.enabled ? "default" : "secondary"}>
                  {config.enabled ? "已启用" : "已禁用"}
                </Badge>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={toggleEnabled}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Chat ID</Label>
                <div className="mt-1 font-mono text-gray-600">{config.chatId}</div>
              </div>
              <div>
                <Label>Bot Token</Label>
                <div className="mt-1 font-mono text-gray-600">{config.botTokenMasked}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testPush}
                disabled={testing || !config.enabled}
                size="sm"
                variant="outline"
              >
                <Send className="w-4 h-4 mr-2" />
                {testing ? "发送中..." : "测试推送"}
              </Button>
              <Button
                onClick={() => setShowTokenInput(true)}
                size="sm"
                variant="outline"
              >
                <Settings className="w-4 h-4 mr-2" />
                修改配置
              </Button>
              <Button
                onClick={deleteConfig}
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除配置
              </Button>
            </div>
          </div>
        ) : (
          // 未配置状态
          <div className="text-center py-4 text-gray-500">
            <Send className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>尚未配置 Telegram 推送</p>
            <Button
              onClick={() => setShowTokenInput(true)}
              className="mt-2"
              size="sm"
            >
              立即配置
            </Button>
          </div>
        )}

        {/* 配置表单 */}
        {showTokenInput && (
          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="botToken">Bot Token</Label>
              <Input
                id="botToken"
                type="password"
                placeholder="输入 Telegram Bot Token"
                value={formData.botToken}
                onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatId">Chat ID</Label>
              <Input
                id="chatId"
                placeholder="输入 Chat ID"
                value={formData.chatId}
                onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled">启用推送</Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={saveConfig}
                disabled={saving}
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {saving ? "保存中..." : "保存配置"}
              </Button>
              <Button
                onClick={() => setShowTokenInput(false)}
                variant="outline"
                size="sm"
              >
                取消
              </Button>
            </div>

            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>配置说明：</p>
                  <ul className="text-xs space-y-1 ml-4">
                    <li>• 创建 Telegram Bot：发送 /newbot 给 @BotFather</li>
                    <li>• 获取 Chat ID：发送消息给 Bot 后访问 https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</li>
                    <li>• 或使用 @userinfobot 获取个人 Chat ID</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
