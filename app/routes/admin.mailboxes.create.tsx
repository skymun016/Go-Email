/**
 * 管理员创建邮箱页面
 */

import type { Route } from "./+types/admin.mailboxes.create";
import { Form, Link, useActionData } from "react-router";
import { useState } from "react";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase, APP_CONFIG } from "~/config/app";
import { createMailbox } from "~/lib/mailbox-db";
import { generateRandomEmail } from "~/lib/email-generator";
import { ArrowLeft, Mail, Shuffle, Wand2, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  const formData = await request.formData();
  const emailType = formData.get("emailType")?.toString();
  const customPrefix = formData.get("customPrefix")?.toString();
  const selectedDomain = formData.get("selectedDomain")?.toString();
  const batchCount = parseInt(formData.get("batchCount")?.toString() || "1");
  
  try {
    if (batchCount < 1 || batchCount > 50) {
      return {
        error: "批量创建数量必须在1-50之间"
      };
    }
    
    const createdEmails: string[] = [];
    
    for (let i = 0; i < batchCount; i++) {
      let email: string;
      
      if (emailType === "custom" && customPrefix && selectedDomain) {
        // 自定义邮箱（批量时添加序号）
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
        
        const suffix = batchCount > 1 ? `-${String(i + 1).padStart(3, '0')}` : '';
        email = `${customPrefix}${suffix}@${selectedDomain}`;
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
      
      // 创建邮箱
      await createMailbox(db, email);
      createdEmails.push(email);
    }
    
    if (batchCount === 1) {
      return new Response(null, {
        status: 302,
        headers: { Location: `/admin/mailboxes` }
      });
    } else {
      return {
        success: `成功创建 ${batchCount} 个邮箱`,
        createdEmails
      };
    }
    
  } catch (error) {
    console.error("创建邮箱失败:", error);
    return {
      error: error instanceof Error ? error.message : "创建邮箱失败，请稍后重试"
    };
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  
  return {
    domains: APP_CONFIG.cloudflare.email.supportedDomains,
  };
}

export default function CreateMailbox({ loaderData, actionData }: Route.ComponentProps) {
  const { domains } = loaderData;
  const [emailType, setEmailType] = useState<"random" | "custom">("random");
  const [batchCount, setBatchCount] = useState<number>(1);
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
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
            创建邮箱
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            创建新的邮箱地址
          </p>
        </div>
      </div>

      {/* 邮箱创建表单 */}
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

          {actionData?.success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">
                {actionData.success}
              </div>
              {actionData.createdEmails && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-green-800">创建的邮箱：</p>
                  <ul className="mt-1 text-sm text-green-700">
                    {actionData.createdEmails.map((email: string) => (
                      <li key={email} className="font-mono">{email}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 批量创建数量 */}
          <div>
            <label htmlFor="batchCount" className="block text-sm font-medium text-gray-700">
              创建数量
            </label>
            <div className="mt-1">
              <input
                type="number"
                name="batchCount"
                id="batchCount"
                min="1"
                max="50"
                value={batchCount}
                onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              一次最多可创建50个邮箱
            </p>
          </div>

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
                      指定邮箱前缀，批量创建时会自动添加序号
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
              {batchCount > 1 && (
                <p className="mt-2 text-sm text-gray-500">
                  批量创建时会自动添加序号，如：prefix-001, prefix-002, ...
                </p>
              )}
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

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" asChild>
              <Link to="/admin/mailboxes">取消</Link>
            </Button>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              创建邮箱
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
