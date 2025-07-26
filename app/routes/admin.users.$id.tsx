/**
 * 管理员用户详情页面
 */

import type { Route } from "./+types/admin.users.$id";
import { Link, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { getUserById } from "~/lib/user-db";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Settings,
  Plus,
  Eye
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { id: userId } = params;
  const env = context.cloudflare.env;
  
  if (!userId) {
    throw new Response("用户 ID 是必需的", { status: 400 });
  }
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  try {
    // 获取用户信息
    const user = await getUserById(db, userId);
    if (!user) {
      throw new Response("用户未找到", { status: 404 });
    }
    
    // 获取用户的邮箱列表（简化查询）
    const userMailboxes = await db.query.userMailboxes.findMany({
      where: (userMailboxes, { eq }) => eq(userMailboxes.userId, userId),
      orderBy: (userMailboxes, { desc }) => [desc(userMailboxes.createdAt)],
    });

    // 获取每个邮箱的基本信息
    const mailboxesWithInfo = await Promise.all(
      userMailboxes.map(async (um) => {
        const mailbox = await db.query.mailboxes.findFirst({
          where: (mailboxes, { eq }) => eq(mailboxes.id, um.mailboxId),
        });

        return {
          ...um,
          mailbox: mailbox ? {
            ...mailbox,
            emails: [], // 暂时为空，避免复杂查询
          } : null,
        };
      })
    );

    // 简化统计信息
    const totalEmails = 0; // 暂时设为0
    const unreadEmails = 0; // 暂时设为0
    
    return {
      user,
      mailboxes: mailboxesWithInfo,
      stats: {
        totalMailboxes: userMailboxes.length,
        totalEmails,
        unreadEmails,
      }
    };
    
  } catch (error) {
    console.error("Error loading user details:", error);
    
    if (error instanceof Response) {
      throw error;
    }
    
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function AdminUserDetail({ loaderData }: Route.ComponentProps) {
  const { user, mailboxes, stats } = loaderData;
  
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
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            to="/admin/users"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回用户列表
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.username}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              用户详情和邮箱管理
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button asChild>
            <Link to={`/admin/users/${user.id}/assign-mailbox`}>
              <Plus className="w-4 h-4 mr-2" />
              分配邮箱
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/admin/users/${user.id}/edit`}>
              <Settings className="w-4 h-4 mr-2" />
              编辑用户
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：用户信息 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 基本信息卡片 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <User className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">用户名</label>
                <p className="text-sm text-gray-900">{user.username}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">联系邮箱</label>
                <p className="text-sm text-gray-900">{user.email}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">账户状态</label>
                <div className="mt-1">
                  <Badge 
                    variant={user.isActive ? "default" : "secondary"}
                    className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                  >
                    {user.isActive ? "活跃" : "禁用"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">注册时间</label>
                <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
              </div>
              
              {user.expiresAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">账户有效期</label>
                  <p className="text-sm text-gray-900">{formatDate(user.expiresAt)}</p>
                  {new Date() > user.expiresAt && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 mt-1">
                      已过期
                    </Badge>
                  )}
                </div>
              )}
              
              {user.lastLoginAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">最后登录</label>
                  <p className="text-sm text-gray-900">{formatDate(user.lastLoginAt)}</p>
                </div>
              )}
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
                <span className="text-sm text-gray-500">邮箱配额</span>
                <span className="text-sm font-medium">
                  {stats.totalMailboxes} / {user.emailQuota}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">总邮件数</span>
                <span className="text-sm font-medium">{stats.totalEmails}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">未读邮件</span>
                <span className="text-sm font-medium text-red-600">{stats.unreadEmails}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：邮箱列表 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  分配的邮箱 ({mailboxes.length})
                </h2>
                <Button asChild size="sm">
                  <Link to={`/admin/users/${user.id}/assign-mailbox`}>
                    <Plus className="w-4 h-4 mr-2" />
                    分配新邮箱
                  </Link>
                </Button>
              </div>
            </div>

            {mailboxes.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  还没有分配邮箱
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  为此用户分配第一个邮箱
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {mailboxes.map((userMailbox) => (
                  <div key={userMailbox.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Mail className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h3 className="text-sm font-medium text-gray-900">
                                {userMailbox.mailbox?.email}
                              </h3>
                              {userMailbox.isPermanent && (
                                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                                  永久
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <span>
                                {userMailbox.mailbox?.emails?.length || 0} 封邮件
                              </span>
                              {userMailbox.mailbox?.emails?.filter(email => !email.isRead).length > 0 && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-red-600 font-medium">
                                    {userMailbox.mailbox?.emails?.filter(email => !email.isRead).length} 未读
                                  </span>
                                </>
                              )}
                              <span className="mx-2">•</span>
                              <span>
                                分配于 {formatDate(userMailbox.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/mailbox/${userMailbox.mailbox?.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            查看邮件
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-1" />
                          管理
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
