/**
 * 管理员邮箱管理页面
 */

import type { Route } from "./+types/admin.mailboxes.$id.manage";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { mailboxes, emails, userMailboxes } from "~/db/schema";
import { eq } from "drizzle-orm";
import { 
  ArrowLeft, 
  Mail, 
  User, 
  Trash2, 
  UserX, 
  RefreshCw,
  AlertTriangle,
  Calendar,
  Shield
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function action({ params, request, context }: Route.ActionArgs) {
  const { id: mailboxId } = params;
  const env = context.cloudflare.env;
  
  if (!mailboxId) {
    throw new Response("邮箱 ID 是必需的", { status: 400 });
  }
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  const formData = await request.formData();
  const action = formData.get("action")?.toString();
  
  try {
    // 验证邮箱存在
    const mailbox = await db.query.mailboxes.findFirst({
      where: (mailboxes, { eq }) => eq(mailboxes.id, mailboxId),
    });
    
    if (!mailbox) {
      return {
        error: "邮箱不存在"
      };
    }
    
    switch (action) {
      case "unassign":
        // 取消分配邮箱
        await db.delete(userMailboxes).where(
          eq(userMailboxes.mailboxId, mailboxId)
        );
        return {
          success: "邮箱已取消分配"
        };

      case "delete":
        // 删除邮箱（包括所有邮件和分配关系）
        // 1. 删除邮件
        await db.delete(emails).where(
          eq(emails.mailboxId, mailboxId)
        );
        // 2. 删除分配关系
        await db.delete(userMailboxes).where(
          eq(userMailboxes.mailboxId, mailboxId)
        );
        // 3. 删除邮箱
        await db.delete(mailboxes).where(
          eq(mailboxes.id, mailboxId)
        );

        return new Response(null, {
          status: 302,
          headers: { Location: "/admin/mailboxes" }
        });

      case "clear_emails":
        // 清空邮件
        await db.delete(emails).where(
          eq(emails.mailboxId, mailboxId)
        );
        return {
          success: "邮件已清空"
        };
        
      default:
        return {
          error: "未知操作"
        };
    }
    
  } catch (error) {
    console.error("邮箱管理操作失败:", error);
    return {
      error: error instanceof Error ? error.message : "操作失败，请稍后重试"
    };
  }
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { id: mailboxId } = params;
  const env = context.cloudflare.env;
  
  if (!mailboxId) {
    throw new Response("邮箱 ID 是必需的", { status: 400 });
  }
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  try {
    // 获取邮箱信息
    const mailbox = await db.query.mailboxes.findFirst({
      where: (mailboxes, { eq }) => eq(mailboxes.id, mailboxId),
    });
    
    if (!mailbox) {
      throw new Response("邮箱未找到", { status: 404 });
    }
    
    // 获取分配信息
    const userAssignment = await db.query.userMailboxes.findFirst({
      where: (userMailboxes, { eq }) => eq(userMailboxes.mailboxId, mailboxId),
    });
    
    // 获取分配的用户信息
    let assignedUser = null;
    if (userAssignment) {
      assignedUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userAssignment.userId),
      });
    }
    
    // 获取邮件统计
    const emails = await db.query.emails.findMany({
      where: (emails, { eq }) => eq(emails.mailboxId, mailboxId),
    });
    
    const unreadEmails = emails.filter(email => !email.isRead);
    
    return {
      mailbox,
      userAssignment,
      assignedUser,
      emailStats: {
        total: emails.length,
        unread: unreadEmails.length,
        totalSize: emails.reduce((sum, email) => sum + email.size, 0),
      }
    };
    
  } catch (error) {
    console.error("Error loading mailbox manage page:", error);
    
    if (error instanceof Response) {
      throw error;
    }
    
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function ManageMailbox({ loaderData, actionData }: Route.ComponentProps) {
  const { mailbox, userAssignment, assignedUser, emailStats } = loaderData;
  
  // 格式化日期
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };
  
  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            to="/admin/mailboxes"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回邮箱列表
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              邮箱管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              管理邮箱 {mailbox.email}
            </p>
          </div>
        </div>
      </div>

      {/* 状态消息 */}
      {actionData?.error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <div className="text-sm text-red-700">
                {actionData.error}
              </div>
            </div>
          </div>
        </div>
      )}

      {actionData?.success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">
            {actionData.success}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：邮箱信息 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 基本信息卡片 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Mail className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">邮箱信息</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">邮箱地址</label>
                <p className="text-sm text-gray-900 font-mono">{mailbox.email}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">邮箱ID</label>
                <p className="text-sm text-gray-900 font-mono">{mailbox.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">创建时间</label>
                <p className="text-sm text-gray-900">{formatDate(mailbox.createdAt)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">分配状态</label>
                <div className="mt-1">
                  {userAssignment ? (
                    <div className="space-y-2">
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        已分配
                      </Badge>
                      {userAssignment.isPermanent && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 ml-2">
                          永久
                        </Badge>
                      )}
                      {assignedUser && (
                        <div className="text-sm text-gray-600">
                          分配给: {assignedUser.username}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        分配时间: {formatDate(userAssignment.createdAt)}
                      </div>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      未分配
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 统计信息卡片 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">使用统计</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">总邮件数</span>
                <span className="text-sm font-medium">{emailStats.total}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">未读邮件</span>
                <span className="text-sm font-medium text-red-600">{emailStats.unread}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">总存储大小</span>
                <span className="text-sm font-medium">{formatSize(emailStats.totalSize)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：管理操作 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 常规操作 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                管理操作
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">查看邮件</h3>
                  <p className="text-sm text-gray-500">
                    查看此邮箱中的所有邮件
                  </p>
                </div>
                <Button asChild>
                  <Link to={`/mailbox/${mailbox.id}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    查看邮件
                  </Link>
                </Button>
              </div>

              {userAssignment && assignedUser && (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">查看用户</h3>
                    <p className="text-sm text-gray-500">
                      查看分配的用户详情
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link to={`/admin/users/${assignedUser.id}`}>
                      <User className="w-4 h-4 mr-2" />
                      查看用户
                    </Link>
                  </Button>
                </div>
              )}

              {emailStats.total > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">清空邮件</h3>
                    <p className="text-sm text-gray-500">
                      删除此邮箱中的所有邮件
                    </p>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="action" value="clear_emails" />
                    <Button 
                      type="submit" 
                      variant="outline" 
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      onClick={(e) => {
                        if (!confirm('确定要清空所有邮件吗？此操作不可逆。')) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      清空邮件
                    </Button>
                  </Form>
                </div>
              )}
            </div>
          </div>

          {/* 危险操作 */}
          <div className="bg-white rounded-lg shadow border-l-4 border-red-400">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-red-900">
                危险操作
              </h2>
              <p className="mt-1 text-sm text-red-600">
                这些操作不可逆，请谨慎使用
              </p>
            </div>
            <div className="p-6 space-y-4">
              {userAssignment && (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">取消分配</h3>
                    <p className="text-sm text-gray-500">
                      将此邮箱从用户账户中移除
                    </p>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="action" value="unassign" />
                    <Button 
                      type="submit" 
                      variant="outline" 
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={(e) => {
                        if (!confirm('确定要取消分配此邮箱吗？')) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      取消分配
                    </Button>
                  </Form>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">删除邮箱</h3>
                  <p className="text-sm text-gray-500">
                    永久删除此邮箱及其所有邮件数据
                  </p>
                </div>
                <Form method="post">
                  <input type="hidden" name="action" value="delete" />
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      if (!confirm('确定要永久删除此邮箱吗？此操作将删除所有邮件数据且不可逆。')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除邮箱
                  </Button>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
