// 私人邮箱管理页面
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Eye, EyeOff, Mail, Lock, User, Calendar } from "lucide-react";
import { getSupportedDomains } from "~/lib/email-generator";
import { createDB, getDatabase } from "~/config/app";

interface PrivateMailbox {
  id: string;
  email: string;
  password: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null; // null = 永不过期
  emailCount: number;
}

// 模拟数据加载
export async function loader({ context, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const userToken = url.searchParams.get("token"); // 简单的用户识别

  // 这里应该从数据库加载用户的私人邮箱
  const mockPrivateMailboxes: PrivateMailbox[] = [
    {
      id: "pm-1",
      email: "john.doe@184772.xyz",
      password: "hidden",
      displayName: "John Doe",
      isActive: true,
      createdAt: "2024-12-01T10:00:00Z",
      expiresAt: null,
      emailCount: 15
    }
  ];

  const supportedDomains = getSupportedDomains();

  return json({
    privateMailboxes: mockPrivateMailboxes,
    supportedDomains,
    userToken
  });
}

// 处理表单提交
export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");

  switch (action) {
    case "create":
      const prefix = formData.get("prefix") as string;
      const domain = formData.get("domain") as string;
      const password = formData.get("password") as string;
      const displayName = formData.get("displayName") as string;

      // 验证输入
      if (!prefix || !domain || !password || !displayName) {
        return json({ error: "所有字段都是必填的" }, { status: 400 });
      }

      if (prefix.length < 3 || prefix.length > 20) {
        return json({ error: "邮箱前缀长度必须在3-20个字符之间" }, { status: 400 });
      }

      if (password.length < 6) {
        return json({ error: "密码长度至少6个字符" }, { status: 400 });
      }

      // 检查邮箱是否已存在
      const email = `${prefix}@${domain}`;
      // 这里应该检查数据库
      
      // 创建私人邮箱
      // 这里应该保存到数据库
      
      return json({ 
        success: true, 
        message: `私人邮箱 ${email} 创建成功！`,
        email 
      });

    case "delete":
      const deleteId = formData.get("id") as string;
      // 这里应该从数据库删除
      return json({ success: true, message: "私人邮箱已删除" });

    case "toggle":
      const toggleId = formData.get("id") as string;
      // 这里应该切换状态
      return json({ success: true, message: "邮箱状态已更新" });

    default:
      return json({ error: "未知操作" }, { status: 400 });
  }
}

export default function PrivateMailbox() {
  const { privateMailboxes, supportedDomains } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">私人邮箱管理</h1>
        <p className="text-gray-600">
          创建和管理您的专属邮箱地址，享受长期稳定的邮件服务
        </p>
      </div>

      {/* 操作反馈 */}
      {actionData?.success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {actionData.message}
          </AlertDescription>
        </Alert>
      )}

      {actionData?.error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {actionData.error}
          </AlertDescription>
        </Alert>
      )}

      {/* 创建新邮箱 */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              创建私人邮箱
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? "取消" : "创建新邮箱"}
            </Button>
          </div>
        </CardHeader>

        {showCreateForm && (
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="_action" value="create" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">显示名称</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    placeholder="例如：张三"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">邮箱密码</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="至少6个字符"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prefix">邮箱前缀</Label>
                  <Input
                    id="prefix"
                    name="prefix"
                    placeholder="例如：john.doe"
                    pattern="[a-zA-Z0-9._-]+"
                    title="只能包含字母、数字、点、下划线和连字符"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="domain">选择域名</Label>
                  <select
                    id="domain"
                    name="domain"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {supportedDomains.map((domain) => (
                      <option key={domain} value={domain}>
                        @{domain}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "创建中..." : "创建邮箱"}
                </Button>
              </div>
            </Form>
          </CardContent>
        )}
      </Card>

      {/* 私人邮箱列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            我的私人邮箱 ({privateMailboxes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {privateMailboxes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>您还没有创建任何私人邮箱</p>
              <p className="text-sm">点击上方"创建新邮箱"开始使用</p>
            </div>
          ) : (
            <div className="space-y-4">
              {privateMailboxes.map((mailbox) => (
                <div
                  key={mailbox.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{mailbox.displayName}</h3>
                        <Badge variant={mailbox.isActive ? "default" : "secondary"}>
                          {mailbox.isActive ? "激活" : "停用"}
                        </Badge>
                        {!mailbox.expiresAt && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            永久
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="font-mono">{mailbox.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>创建于 {new Date(mailbox.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">📧</span>
                          <span>{mailbox.emailCount} 封邮件</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/private-mail/${mailbox.id}`, '_blank')}
                      >
                        查看邮件
                      </Button>

                      <Form method="post" className="inline">
                        <input type="hidden" name="_action" value="toggle" />
                        <input type="hidden" name="id" value={mailbox.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={isSubmitting}
                        >
                          {mailbox.isActive ? "停用" : "启用"}
                        </Button>
                      </Form>

                      <Form method="post" className="inline">
                        <input type="hidden" name="_action" value="delete" />
                        <input type="hidden" name="id" value={mailbox.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={(e) => {
                            if (!confirm("确定要删除这个私人邮箱吗？所有邮件将被永久删除！")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          删除
                        </Button>
                      </Form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 功能说明 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>私人邮箱特性</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">✅ 优势特性</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 永久保存，不会过期</li>
                <li>• 自定义邮箱前缀</li>
                <li>• 密码保护，隐私安全</li>
                <li>• 支持多个域名选择</li>
                <li>• 无限制邮件接收</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-600">⚠️ 注意事项</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 邮箱前缀一旦创建不可修改</li>
                <li>• 请妥善保管邮箱密码</li>
                <li>• 删除邮箱将永久丢失所有邮件</li>
                <li>• 建议定期备份重要邮件</li>
                <li>• 仅支持接收邮件，不支持发送</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
