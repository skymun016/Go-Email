/**
 * 管理员批量邮箱操作页面
 */

import type { Route } from "./+types/admin.mailboxes.batch";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { useState } from "react";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { mailboxes, emails, userMailboxes } from "~/db/schema";
import { eq, inArray } from "drizzle-orm";
import { 
  ArrowLeft, 
  Mail, 
  CheckSquare, 
  Square,
  Trash2,
  AlertTriangle,
  UserX,
  RefreshCw
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  const formData = await request.formData();
  const action = formData.get("action")?.toString();
  const selectedMailboxes = formData.getAll("selectedMailboxes") as string[];
  
  if (selectedMailboxes.length === 0) {
    return {
      error: "请选择至少一个邮箱"
    };
  }
  
  try {
    switch (action) {
      case "unassign_all":
        // 批量取消分配
        await db.delete(userMailboxes).where(
          inArray(userMailboxes.mailboxId, selectedMailboxes)
        );
        return {
          success: `已取消分配 ${selectedMailboxes.length} 个邮箱`
        };
        
      case "clear_emails":
        // 批量清空邮件
        await db.delete(emails).where(
          inArray(emails.mailboxId, selectedMailboxes)
        );
        return {
          success: `已清空 ${selectedMailboxes.length} 个邮箱的所有邮件`
        };
        
      case "delete_all":
        // 批量删除邮箱
        // 1. 删除邮件
        await db.delete(emails).where(
          inArray(emails.mailboxId, selectedMailboxes)
        );
        // 2. 删除分配关系
        await db.delete(userMailboxes).where(
          inArray(userMailboxes.mailboxId, selectedMailboxes)
        );
        // 3. 删除邮箱
        await db.delete(mailboxes).where(
          inArray(mailboxes.id, selectedMailboxes)
        );
        return {
          success: `已删除 ${selectedMailboxes.length} 个邮箱及其所有数据`
        };
        
      default:
        return {
          error: "未知操作"
        };
    }
    
  } catch (error) {
    console.error("批量邮箱操作失败:", error);
    return {
      error: error instanceof Error ? error.message : "批量操作失败，请稍后重试"
    };
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  try {
    // 获取所有邮箱
    const allMailboxes = await db.query.mailboxes.findMany({
      orderBy: (mailboxes, { desc }) => [desc(mailboxes.createdAt)],
    });
    
    // 获取每个邮箱的详细信息
    const mailboxesWithInfo = await Promise.all(
      allMailboxes.map(async (mailbox) => {
        // 获取分配信息
        const userAssignment = await db.query.userMailboxes.findFirst({
          where: (userMailboxes, { eq }) => eq(userMailboxes.mailboxId, mailbox.id),
        });
        
        // 获取分配的用户信息
        let assignedUser = null;
        if (userAssignment) {
          assignedUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, userAssignment.userId),
          });
        }
        
        // 获取邮件数量
        const emailCount = await db.query.emails.findMany({
          where: (emails, { eq }) => eq(emails.mailboxId, mailbox.id),
        });
        
        return {
          ...mailbox,
          userAssignment,
          assignedUser,
          emailCount: emailCount.length,
          isAssigned: !!userAssignment,
          isPermanent: userAssignment?.isPermanent || false,
        };
      })
    );
    
    return {
      mailboxes: mailboxesWithInfo,
    };
    
  } catch (error) {
    console.error("Error loading batch mailboxes page:", error);
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function BatchMailboxes({ loaderData, actionData }: Route.ComponentProps) {
  const { mailboxes } = loaderData;
  const [selectedMailboxes, setSelectedMailboxes] = useState<string[]>([]);
  
  // 格式化日期
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  };
  
  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedMailboxes.length === mailboxes.length) {
      setSelectedMailboxes([]);
    } else {
      setSelectedMailboxes(mailboxes.map(mailbox => mailbox.id));
    }
  };
  
  // 切换单个邮箱选择
  const toggleMailboxSelection = (mailboxId: string) => {
    setSelectedMailboxes(prev => 
      prev.includes(mailboxId) 
        ? prev.filter(id => id !== mailboxId)
        : [...prev, mailboxId]
    );
  };
  
  // 筛选功能
  const [filter, setFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const filteredMailboxes = mailboxes.filter(mailbox => {
    switch (filter) {
      case "assigned":
        return mailbox.isAssigned;
      case "unassigned":
        return !mailbox.isAssigned;
      default:
        return true;
    }
  });
  
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
              批量邮箱操作
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              选择多个邮箱进行批量操作
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

      {/* 筛选和批量操作控制面板 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-medium text-gray-900">
                批量操作 ({selectedMailboxes.length} 个邮箱已选择)
              </h2>
              
              {/* 筛选按钮 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === "all" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  全部 ({mailboxes.length})
                </button>
                <button
                  onClick={() => setFilter("assigned")}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === "assigned" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  已分配 ({mailboxes.filter(m => m.isAssigned).length})
                </button>
                <button
                  onClick={() => setFilter("unassigned")}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === "unassigned" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  未分配 ({mailboxes.filter(m => !m.isAssigned).length})
                </button>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={toggleSelectAll}
              className="flex items-center"
            >
              {selectedMailboxes.length === filteredMailboxes.length ? (
                <CheckSquare className="w-4 h-4 mr-2" />
              ) : (
                <Square className="w-4 h-4 mr-2" />
              )}
              {selectedMailboxes.length === filteredMailboxes.length ? "取消全选" : "全选"}
            </Button>
          </div>
        </div>

        {selectedMailboxes.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <Form method="post" className="space-y-4">
              {/* 隐藏字段：选中的邮箱 */}
              {selectedMailboxes.map(mailboxId => (
                <input key={mailboxId} type="hidden" name="selectedMailboxes" value={mailboxId} />
              ))}
              
              <div className="flex items-center space-x-4">
                {/* 取消分配 */}
                <button
                  type="submit"
                  name="action"
                  value="unassign_all"
                  className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                  onClick={(e) => {
                    if (!confirm(`确定要取消分配 ${selectedMailboxes.length} 个邮箱吗？`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  取消分配
                </button>

                {/* 清空邮件 */}
                <button
                  type="submit"
                  name="action"
                  value="clear_emails"
                  className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                  onClick={(e) => {
                    if (!confirm(`确定要清空 ${selectedMailboxes.length} 个邮箱的所有邮件吗？此操作不可逆。`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  清空邮件
                </button>

                {/* 删除邮箱 */}
                <button
                  type="submit"
                  name="action"
                  value="delete_all"
                  className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  onClick={(e) => {
                    if (!confirm(`确定要永久删除 ${selectedMailboxes.length} 个邮箱及其所有数据吗？此操作不可逆。`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除邮箱
                </button>
              </div>
            </Form>
          </div>
        )}
      </div>

      {/* 邮箱列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            邮箱列表 ({filteredMailboxes.length} 个邮箱)
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center"
                  >
                    {selectedMailboxes.length === filteredMailboxes.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  邮箱地址
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分配状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  邮件数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMailboxes.map((mailbox) => (
                <tr 
                  key={mailbox.id} 
                  className={`hover:bg-gray-50 ${
                    selectedMailboxes.includes(mailbox.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleMailboxSelection(mailbox.id)}
                      className="flex items-center"
                    >
                      {selectedMailboxes.includes(mailbox.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </td>
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
                    {mailbox.emailCount} 封邮件
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(mailbox.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
