/**
 * 管理员批量用户操作页面
 */

import type { Route } from "./+types/admin.users.batch";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { useState } from "react";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { updateUser } from "~/lib/user-db";
import { 
  ArrowLeft, 
  Users, 
  CheckSquare, 
  Square,
  Settings,
  AlertTriangle,
  Save,
  UserX,
  UserCheck
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
  const selectedUsers = formData.getAll("selectedUsers") as string[];
  
  if (selectedUsers.length === 0) {
    return {
      error: "请选择至少一个用户"
    };
  }
  
  try {
    switch (action) {
      case "enable":
        // 批量启用用户
        for (const userId of selectedUsers) {
          await updateUser(db, userId, { isActive: true });
        }
        return {
          success: `已启用 ${selectedUsers.length} 个用户账户`
        };
        
      case "disable":
        // 批量禁用用户
        for (const userId of selectedUsers) {
          await updateUser(db, userId, { isActive: false });
        }
        return {
          success: `已禁用 ${selectedUsers.length} 个用户账户`
        };
        
      case "extend_expiry":
        // 批量延长有效期（延长1年）
        const newExpiryDate = new Date();
        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
        
        for (const userId of selectedUsers) {
          await updateUser(db, userId, { expiresAt: newExpiryDate });
        }
        return {
          success: `已将 ${selectedUsers.length} 个用户的有效期延长至 ${newExpiryDate.toLocaleDateString('zh-CN')}`
        };
        
      case "update_quota":
        // 批量更新配额
        const newQuota = parseInt(formData.get("newQuota")?.toString() || "5");
        if (newQuota < 1 || newQuota > 100) {
          return {
            error: "配额必须在1-100之间"
          };
        }
        
        for (const userId of selectedUsers) {
          await updateUser(db, userId, { emailQuota: newQuota });
        }
        return {
          success: `已将 ${selectedUsers.length} 个用户的邮箱配额更新为 ${newQuota}`
        };
        
      default:
        return {
          error: "未知操作"
        };
    }
    
  } catch (error) {
    console.error("批量操作失败:", error);
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
    // 获取所有用户
    const users = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
    
    // 获取每个用户的邮箱统计
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const mailboxCount = await db.query.userMailboxes.findMany({
          where: (userMailboxes, { eq }) => eq(userMailboxes.userId, user.id),
        });
        
        return {
          ...user,
          mailboxCount: mailboxCount.length,
        };
      })
    );
    
    return {
      users: usersWithStats,
    };
    
  } catch (error) {
    console.error("Error loading batch users page:", error);
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function BatchUsers({ loaderData, actionData }: Route.ComponentProps) {
  const { users } = loaderData;
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [batchAction, setBatchAction] = useState<string>("");
  const [newQuota, setNewQuota] = useState<number>(5);
  
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
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };
  
  // 切换单个用户选择
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
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
              批量用户操作
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              选择多个用户进行批量操作
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

      {/* 批量操作控制面板 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              批量操作 ({selectedUsers.length} 个用户已选择)
            </h2>
            <Button
              variant="outline"
              onClick={toggleSelectAll}
              className="flex items-center"
            >
              {selectedUsers.length === users.length ? (
                <CheckSquare className="w-4 h-4 mr-2" />
              ) : (
                <Square className="w-4 h-4 mr-2" />
              )}
              {selectedUsers.length === users.length ? "取消全选" : "全选"}
            </Button>
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <Form method="post" className="space-y-4">
              {/* 隐藏字段：选中的用户 */}
              {selectedUsers.map(userId => (
                <input key={userId} type="hidden" name="selectedUsers" value={userId} />
              ))}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 启用用户 */}
                <button
                  type="submit"
                  name="action"
                  value="enable"
                  className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    if (!confirm(`确定要启用 ${selectedUsers.length} 个用户吗？`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  启用用户
                </button>

                {/* 禁用用户 */}
                <button
                  type="submit"
                  name="action"
                  value="disable"
                  className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  onClick={(e) => {
                    if (!confirm(`确定要禁用 ${selectedUsers.length} 个用户吗？`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  禁用用户
                </button>

                {/* 延长有效期 */}
                <button
                  type="submit"
                  name="action"
                  value="extend_expiry"
                  className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    if (!confirm(`确定要将 ${selectedUsers.length} 个用户的有效期延长1年吗？`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  延长有效期
                </button>

                {/* 更新配额 */}
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    name="newQuota"
                    value={newQuota}
                    onChange={(e) => setNewQuota(parseInt(e.target.value) || 5)}
                    min="1"
                    max="100"
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <button
                    type="submit"
                    name="action"
                    value="update_quota"
                    className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    onClick={(e) => {
                      if (!confirm(`确定要将 ${selectedUsers.length} 个用户的配额更新为 ${newQuota} 吗？`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    更新配额
                  </button>
                </div>
              </div>
            </Form>
          </div>
        )}
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            用户列表 ({users.length} 个用户)
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
                    {selectedUsers.length === users.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
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
                  有效期
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr 
                  key={user.id} 
                  className={`hover:bg-gray-50 ${
                    selectedUsers.includes(user.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleUserSelection(user.id)}
                      className="flex items-center"
                    >
                      {selectedUsers.includes(user.id) ? (
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
                    <Badge 
                      variant={user.isActive ? "default" : "secondary"}
                      className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                    >
                      {user.isActive ? "活跃" : "禁用"}
                    </Badge>
                    {user.expiresAt && new Date() > user.expiresAt && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 ml-2">
                        已过期
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.mailboxCount} / {user.emailQuota}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.expiresAt ? formatDate(user.expiresAt) : "永不过期"}
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
