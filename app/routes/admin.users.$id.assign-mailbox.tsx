/**
 * 管理员为用户分配邮箱页面
 */

import type { Route } from "./+types/admin.users.$id.assign-mailbox";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { useState } from "react";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase, APP_CONFIG } from "~/config/app";
import { getUserById, createUserMailbox, checkUserQuota } from "~/lib/user-db";
import { generateRandomEmail } from "~/lib/email-generator";
import { ArrowLeft, Mail, Shuffle, Wand2, User } from "lucide-react";
import { Button } from "~/components/ui/button";

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
  const emailType = formData.get("emailType")?.toString();
  const customPrefix = formData.get("customPrefix")?.toString();
  const selectedDomain = formData.get("selectedDomain")?.toString();
  const isPermanent = formData.get("isPermanent") === "on";
  
  try {
    // 验证用户存在
    const user = await getUserById(db, userId);
    if (!user) {
      return {
        error: "用户不存在"
      };
    }
    
    // 检查用户配额
    const quotaInfo = await checkUserQuota(db, userId);
    if (!quotaInfo.hasQuota) {
      return {
        error: `用户邮箱配额已满 (${quotaInfo.current}/${quotaInfo.limit})`
      };
    }
    
    let email: string;
    
    if (emailType === "custom" && customPrefix && selectedDomain) {
      // 自定义邮箱
      if (!/^[a-zA-Z0-9_-]+$/.test(customPrefix)) {
        return {
          error: "邮箱前缀只能包含字母、数字、下划线和连字符"
        };
      }
      
      if (customPrefix.length < 3 || customPrefix.length > 20) {
        return {
          error: "邮箱前缀长度必须在3-20个字符之间"
        };
      }
      
      email = `${customPrefix}@${selectedDomain}`;
    } else {
      // 随机生成邮箱
      const domains = APP_CONFIG.cloudflare.email.supportedDomains;
      const domain = selectedDomain && domains.includes(selectedDomain)
        ? selectedDomain
        : domains[0];
      email = generateRandomEmail(domain);
    }
    
    // 检查邮箱是否已存在
    const existingMailbox = await db.query.mailboxes.findFirst({
      where: (mailboxes, { eq }) => eq(mailboxes.email, email),
    });
    
    if (existingMailbox) {
      return {
        error: `邮箱 ${email} 已存在，请选择其他邮箱地址`
      };
    }
    
    // 创建邮箱并分配给用户
    await createUserMailbox(db, userId, email, isPermanent);
    
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin/users/${userId}` }
    });
    
  } catch (error) {
    console.error("分配邮箱失败:", error);
    return {
      error: error instanceof Error ? error.message : "分配邮箱失败，请稍后重试"
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
    
    // 获取用户配额信息
    const quotaInfo = await checkUserQuota(db, userId);
    
    return {
      user,
      quotaInfo,
      domains: APP_CONFIG.cloudflare.email.supportedDomains,
    };
    
  } catch (error) {
    console.error("Error loading assign mailbox page:", error);
    
    if (error instanceof Response) {
      throw error;
    }
    
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function AssignMailbox({ loaderData, actionData }: Route.ComponentProps) {
  const { user, quotaInfo, domains } = loaderData;
  const [emailType, setEmailType] = useState<"random" | "custom">("random");
  
  if (!quotaInfo.hasQuota) {
    return (
      <div className="space-y-6">
        {/* 页面头部 */}
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
              分配邮箱
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              为 {user.username} 分配新的邮箱地址
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              邮箱配额已满
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              用户 {user.username} 已使用了所有 {quotaInfo.limit} 个邮箱配额
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link to={`/admin/users/${user.id}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回用户详情
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
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
            分配邮箱
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            为 {user.username} 分配新的邮箱地址
          </p>
        </div>
      </div>

      {/* 用户信息卡片 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{user.username}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <div className="ml-auto">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                配额使用情况
              </p>
              <p className="text-sm text-gray-500">
                {quotaInfo.current} / {quotaInfo.limit} (剩余 {quotaInfo.remaining})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 邮箱分配表单 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            邮箱配置
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            选择邮箱生成方式和配置选项
          </p>
        </div>

        <Form method="post" className="p-6 space-y-6">
          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {actionData.error}
              </div>
            </div>
          )}

          {/* 邮箱类型选择 */}
          <div>
            <label className="text-base font-medium text-gray-900">
              邮箱生成方式
            </label>
            <fieldset className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="random"
                    name="emailType"
                    type="radio"
                    value="random"
                    checked={emailType === "random"}
                    onChange={(e) => setEmailType("random")}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label htmlFor="random" className="ml-3 block text-sm font-medium text-gray-700">
                    <div className="flex items-center">
                      <Shuffle className="w-4 h-4 mr-2 text-blue-600" />
                      随机生成
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      系统自动生成随机邮箱地址
                    </p>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="custom"
                    name="emailType"
                    type="radio"
                    value="custom"
                    checked={emailType === "custom"}
                    onChange={(e) => setEmailType("custom")}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label htmlFor="custom" className="ml-3 block text-sm font-medium text-gray-700">
                    <div className="flex items-center">
                      <Wand2 className="w-4 h-4 mr-2 text-purple-600" />
                      自定义前缀
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      指定邮箱前缀，便于识别和管理
                    </p>
                  </label>
                </div>
              </div>
            </fieldset>
          </div>

          {/* 自定义前缀输入 */}
          {emailType === "custom" && (
            <div>
              <label htmlFor="customPrefix" className="block text-sm font-medium text-gray-700">
                邮箱前缀
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="customPrefix"
                  id="customPrefix"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="输入3-20位字符（字母、数字、下划线、连字符）"
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_-]+"
                  required={emailType === "custom"}
                />
              </div>
            </div>
          )}

          {/* 域名选择 */}
          <div>
            <label htmlFor="selectedDomain" className="block text-sm font-medium text-gray-700">
              选择域名
            </label>
            <select
              id="selectedDomain"
              name="selectedDomain"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {domains.map((domain, index) => (
                <option key={domain} value={domain}>
                  {domain} {index === 0 ? '(推荐)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 邮箱类型选择 */}
          <div>
            <div className="flex items-center">
              <input
                id="isPermanent"
                name="isPermanent"
                type="checkbox"
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isPermanent" className="ml-2 block text-sm text-gray-900">
                设为永久邮箱
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              永久邮箱不会被自动清理，适合重要用途
            </p>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" asChild>
              <Link to={`/admin/users/${user.id}`}>取消</Link>
            </Button>
            <Button type="submit">
              分配邮箱
            </Button>
          </div>
        </Form>
      </div>


    </div>
  );
}
