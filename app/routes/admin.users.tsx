/**
 * 管理员用户管理页面
 */

import type { Route } from "./+types/admin.users";
import { Link, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { 
  Users, 
  Mail, 
  Calendar, 
  Shield, 
  ShieldOff, 
  Plus,
  Settings,
  Eye
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  try {
    // 获取所有用户及其邮箱统计
    const users = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
    
    // 获取每个用户的邮箱统计
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // 获取用户邮箱数量
        const mailboxCount = await db.query.userMailboxes.findMany({
          where: (userMailboxes, { eq }) => eq(userMailboxes.userId, user.id),
        });

        // 简化邮件统计 - 暂时设为0，避免复杂查询
        const totalEmails = 0;

        return {
          ...user,
          mailboxCount: mailboxCount.length,
          totalEmails,
          quotaUsed: mailboxCount.length,
        };
      })
    );
    
    return {
      users: usersWithStats,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
    };
    
  } catch (error) {
    console.error("Error loading users:", error);
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const { users, totalUsers, activeUsers } = loaderData;
  
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理系统中的所有用户账户
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button asChild>
            <Link to="/admin/users/create">
              <Plus className="w-4 h-4 mr-2" />
              创建用户
            </Link>
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">总用户数</h3>
              <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">活跃用户</h3>
              <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldOff className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">禁用用户</h3>
              <p className="text-2xl font-bold text-red-600">{totalUsers - activeUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            用户列表
          </h2>
        </div>
        
        {users.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              还没有用户
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              创建第一个用户开始管理
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮箱配额
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {user.isActive ? "活跃" : "禁用"}
                        </Badge>
                        {user.expiresAt && new Date() > user.expiresAt && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            已过期
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{user.quotaUsed} / {user.emailQuota}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {user.totalEmails} 封邮件
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(user.createdAt)}
                      </div>
                      {user.expiresAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          到期: {formatDate(user.expiresAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/users/${user.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/users/${user.id}/edit`}>
                            <Settings className="w-4 h-4 mr-1" />
                            管理
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
