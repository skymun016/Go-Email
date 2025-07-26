/**
 * 管理员邮箱管理页面
 */

import type { Route } from "./+types/admin.mailboxes";
import { Link, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { 
  Mail, 
  User, 
  Calendar, 
  Shield, 
  ShieldOff, 
  Plus,
  Settings,
  Eye,
  Search
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  try {
    // 获取所有邮箱及其关联信息
    const mailboxes = await db.query.mailboxes.findMany({
      orderBy: (mailboxes, { desc }) => [desc(mailboxes.createdAt)],
    });
    
    // 获取每个邮箱的详细信息（简化查询）
    const mailboxesWithInfo = await Promise.all(
      mailboxes.map(async (mailbox) => {
        // 获取邮箱的用户分配信息
        const userAssignments = await db.query.userMailboxes.findMany({
          where: (userMailboxes, { eq }) => eq(userMailboxes.mailboxId, mailbox.id),
        });

        // 获取分配的用户信息
        let assignedUser = null;
        if (userAssignments.length > 0) {
          assignedUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, userAssignments[0].userId),
          });
        }

        // 获取邮件数量
        const emailCount = await db.query.emails.findMany({
          where: (emails, { eq }) => eq(emails.mailboxId, mailbox.id),
        });

        // 获取未读邮件数量
        const unreadCount = await db.query.emails.findMany({
          where: (emails, { eq, and }) => and(
            eq(emails.mailboxId, mailbox.id),
            eq(emails.isRead, false)
          ),
        });

        return {
          ...mailbox,
          userAssignments,
          emailCount: emailCount.length,
          unreadCount: unreadCount.length,
          isAssigned: userAssignments.length > 0,
          assignedUser,
          isPermanent: userAssignments[0]?.isPermanent || false,
        };
      })
    );
    
    // 统计信息
    const totalMailboxes = mailboxes.length;
    const assignedMailboxes = mailboxesWithInfo.filter(m => m.isAssigned).length;
    const unassignedMailboxes = totalMailboxes - assignedMailboxes;
    const permanentMailboxes = mailboxesWithInfo.filter(m => m.isPermanent).length;
    
    return {
      mailboxes: mailboxesWithInfo,
      stats: {
        totalMailboxes,
        assignedMailboxes,
        unassignedMailboxes,
        permanentMailboxes,
      }
    };
    
  } catch (error) {
    console.error("Error loading mailboxes:", error);
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function AdminMailboxes({ loaderData }: Route.ComponentProps) {
  const { mailboxes, stats } = loaderData;
  
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
          <h1 className="text-2xl font-bold text-gray-900">邮箱管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理系统中的所有邮箱地址
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" asChild>
            <Link to="/admin/mailboxes/batch">
              <Settings className="w-4 h-4 mr-2" />
              批量操作
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/mailboxes/create">
              <Plus className="w-4 h-4 mr-2" />
              创建邮箱
            </Link>
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">总邮箱数</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.totalMailboxes}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <User className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">已分配</h3>
              <p className="text-2xl font-bold text-green-600">{stats.assignedMailboxes}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Search className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">未分配</h3>
              <p className="text-2xl font-bold text-yellow-600">{stats.unassignedMailboxes}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">永久邮箱</h3>
              <p className="text-2xl font-bold text-purple-600">{stats.permanentMailboxes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 邮箱列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            邮箱列表
          </h2>
        </div>
        
        {mailboxes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              还没有邮箱
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              创建第一个邮箱开始管理
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮箱地址
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分配状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮件统计
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mailboxes.map((mailbox) => (
                  <tr key={mailbox.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {mailbox.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {mailbox.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {mailbox.isAssigned ? (
                          <>
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              已分配
                            </Badge>
                            {mailbox.assignedUser && (
                              <div className="text-xs text-gray-500">
                                用户: {mailbox.assignedUser.username}
                              </div>
                            )}
                            {mailbox.isPermanent && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                永久
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            未分配
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{mailbox.emailCount} 封邮件</span>
                      </div>
                      {mailbox.unreadCount > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {mailbox.unreadCount} 未读
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(mailbox.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/mailbox/${mailbox.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/mailboxes/${mailbox.id}/manage`}>
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
