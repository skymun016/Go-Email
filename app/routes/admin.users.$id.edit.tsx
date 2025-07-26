/**
 * 管理员用户编辑页面
 */

import type { Route } from "./+types/admin.users.$id.edit";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { getUserById, updateUser } from "~/lib/user-db";
import { ArrowLeft, User, Save, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function action({ params, request, context }: Route.ActionArgs) {
  const { id: userId } = params;
  const env = context.cloudflare.env;
  
  if (!userId) {
    throw new Response("用户 ID 是必需的", { status: 400 });
  }
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  const formData = await request.formData();
  const emailQuota = parseInt(formData.get("emailQuota")?.toString() || "0");
  const isActive = formData.get("isActive") === "on";
  const expiresAt = formData.get("expiresAt")?.toString();
  const notes = formData.get("notes")?.toString() || "";
  
  try {
    // 验证用户存在
    const user = await getUserById(db, userId);
    if (!user) {
      return {
        error: "用户不存在"
      };
    }
    
    // 验证邮箱配额
    if (emailQuota < 1 || emailQuota > 100) {
      return {
        error: "邮箱配额必须在1-100之间"
      };
    }
    
    // 验证有效期
    let expiresAtDate: Date | null = null;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return {
          error: "有效期格式不正确"
        };
      }
      if (expiresAtDate <= new Date()) {
        return {
          error: "有效期必须是未来的日期"
        };
      }
    }
    
    // 检查配额是否小于当前已使用的邮箱数量
    const currentMailboxes = await db.query.userMailboxes.findMany({
      where: (userMailboxes, { eq }) => eq(userMailboxes.userId, userId),
    });
    
    if (emailQuota < currentMailboxes.length) {
      return {
        error: `邮箱配额不能小于当前已分配的邮箱数量 (${currentMailboxes.length})`
      };
    }
    
    // 更新用户信息
    await updateUser(db, userId, {
      emailQuota,
      isActive,
      expiresAt: expiresAtDate,
      notes,
    });
    
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin/users/${userId}` }
    });
    
  } catch (error) {
    console.error("更新用户失败:", error);
    return {
      error: error instanceof Error ? error.message : "更新用户失败，请稍后重试"
    };
  }
}

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
    
    // 获取用户当前邮箱数量
    const currentMailboxes = await db.query.userMailboxes.findMany({
      where: (userMailboxes, { eq }) => eq(userMailboxes.userId, userId),
    });
    
    return {
      user,
      currentMailboxCount: currentMailboxes.length,
    };
    
  } catch (error) {
    console.error("Error loading user edit page:", error);
    
    if (error instanceof Response) {
      throw error;
    }
    
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function EditUser({ loaderData, actionData }: Route.ComponentProps) {
  const { user, currentMailboxCount } = loaderData;
  
  // 格式化日期为输入框格式
  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split('T')[0];
  };
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            to={`/admin/users/${user.id}`}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回用户详情
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              编辑用户
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              修改 {user.username} 的账户设置
            </p>
          </div>
        </div>
      </div>

      {/* 用户信息卡片 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{user.username}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="mt-2 flex items-center space-x-2">
              <Badge 
                variant={user.isActive ? "default" : "secondary"}
                className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {user.isActive ? "活跃" : "禁用"}
              </Badge>
              <span className="text-sm text-gray-500">
                当前使用 {currentMailboxCount} / {user.emailQuota} 邮箱配额
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 编辑表单 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            账户设置
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            修改用户的配额、状态和其他设置
          </p>
        </div>

        <Form method="post" className="p-6 space-y-6">
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

          {/* 邮箱配额 */}
          <div>
            <label htmlFor="emailQuota" className="block text-sm font-medium text-gray-700">
              邮箱配额
            </label>
            <div className="mt-1">
              <input
                type="number"
                name="emailQuota"
                id="emailQuota"
                min={currentMailboxCount}
                max={100}
                defaultValue={user.emailQuota}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              当前已使用 {currentMailboxCount} 个邮箱，配额不能小于此数量
            </p>
          </div>

          {/* 账户状态 */}
          <div>
            <div className="flex items-center">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={user.isActive}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                启用账户
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              禁用账户将阻止用户登录和使用邮箱服务
            </p>
          </div>

          {/* 账户有效期 */}
          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">
              账户有效期
            </label>
            <div className="mt-1">
              <input
                type="date"
                name="expiresAt"
                id="expiresAt"
                defaultValue={formatDateForInput(user.expiresAt)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              留空表示永不过期。过期后用户将无法登录
            </p>
          </div>

          {/* 备注 */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              管理员备注
            </label>
            <div className="mt-1">
              <textarea
                name="notes"
                id="notes"
                rows={3}
                defaultValue={user.notes || ""}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="添加关于此用户的备注信息..."
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              仅管理员可见的备注信息
            </p>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" asChild>
              <Link to={`/admin/users/${user.id}`}>取消</Link>
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              保存更改
            </Button>
          </div>
        </Form>
      </div>

      {/* 危险操作区域 */}
      <div className="bg-white rounded-lg shadow border-l-4 border-red-400">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-red-900">
            危险操作
          </h2>
          <p className="mt-1 text-sm text-red-600">
            这些操作不可逆，请谨慎使用
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">删除用户账户</h3>
              <p className="text-sm text-gray-500">
                永久删除此用户及其所有邮箱和邮件数据
              </p>
            </div>
            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              删除账户
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
