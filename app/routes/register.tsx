/**
 * 用户注册页面
 */

import type { Route } from "./+types/register";
import { Form, Link, useActionData } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase, APP_CONFIG } from "~/config/app";
import { registerUser } from "~/lib/user-auth";
import { getUserSession, commitUserSession } from "~/lib/auth";

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const formData = await request.formData();
  
  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();
  const email = formData.get("email")?.toString();

  // 检查功能是否启用
  if (!APP_CONFIG.user.registrationEnabled) {
    return {
      error: "用户注册功能暂时关闭"
    };
  }

  if (!username || !password || !confirmPassword || !email) {
    return {
      error: "所有必填字段都不能为空"
    };
  }

  try {
    const db = createDB(getDatabase(env));
    
    // 注册用户
    const result = await registerUser(db, {
      username,
      password,
      confirmPassword,
      email
    });

    if (!result.success) {
      return {
        error: result.error
      };
    }

    // 自动登录
    const session = await getUserSession(request.headers.get("Cookie"), env);
    session.set("userId", result.user!.id);
    session.set("username", result.user!.username);
    if (result.user!.expiresAt) {
      session.set("expiresAt", result.user!.expiresAt.toISOString());
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
        "Set-Cookie": await commitUserSession(session, env),
      },
    });

  } catch (error) {
    console.error("注册处理失败:", error);
    return {
      error: "注册失败，请稍后重试"
    };
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 检查功能是否启用
  if (!APP_CONFIG.user.registrationEnabled) {
    throw new Response("用户注册功能暂时关闭", { status: 404 });
  }

  // 如果用户已登录，重定向到dashboard
  try {
    const session = await getUserSession(request.headers.get("Cookie"), env);
    const userId = session.get("userId");
    
    if (userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/dashboard" }
      });
    }
  } catch (error) {
    // 忽略session错误，继续显示注册页面
  }

  return {
    config: {
      defaultQuota: APP_CONFIG.user.defaultQuota,
      brandName: APP_CONFIG.ui.brandName
    }
  };
}

export default function Register({ loaderData, actionData }: Route.ComponentProps) {
  const { config } = loaderData;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            创建新账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或者{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              登录现有账户
            </Link>
          </p>
        </div>
        
        <Form className="mt-8 space-y-6" method="post">
          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    注册失败
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {actionData.error}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名 *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入用户名（3-20位字符）"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_-]+"
                title="用户名只能包含字母、数字、下划线和连字符"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码 *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="至少8位，包含大小写字母和数字"
                minLength={8}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                确认密码 *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请再次输入密码"
                minLength={8}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                联系邮箱 *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="用于重要通知和账户恢复"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="text-sm text-blue-700">
              <strong>注册即可获得：</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>{config.defaultQuota}个专属临时邮箱地址</li>
                <li>邮箱永久有效（账号有效期内）</li>
                <li>邮件历史记录保存</li>
                <li>更好的隐私保护</li>
              </ul>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              创建账户
            </button>
          </div>
          
          <div className="text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-500">
              继续使用匿名临时邮箱
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
