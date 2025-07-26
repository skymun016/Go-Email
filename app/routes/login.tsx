/**
 * 用户登录页面
 */

import type { Route } from "./+types/login";
import { Form, Link, useActionData } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase, APP_CONFIG } from "~/config/app";
import { validateUser } from "~/lib/user-auth";
import { getUserSession, commitUserSession } from "~/lib/auth";

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const formData = await request.formData();
  
  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();

  if (!username || !password) {
    return {
      error: "用户名和密码不能为空"
    };
  }

  try {
    const db = createDB(getDatabase(env));
    
    // 验证用户
    const user = await validateUser(db, username, password);
    
    if (!user) {
      return {
        error: "用户名或密码错误"
      };
    }

    // 创建session
    const session = await getUserSession(request.headers.get("Cookie"), env);
    session.set("userId", user.id);
    session.set("username", user.username);
    if (user.expiresAt) {
      session.set("expiresAt", user.expiresAt.toISOString());
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": await commitUserSession(session, env),
      },
    });

  } catch (error) {
    console.error("登录处理失败:", error);
    return {
      error: "登录失败，请稍后重试"
    };
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 如果用户已登录，重定向到首页
  try {
    const session = await getUserSession(request.headers.get("Cookie"), env);
    const userId = session.get("userId");

    if (userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/" }
      });
    }
  } catch (error) {
    // 忽略session错误，继续显示登录页面
  }

  return {
    config: {
      brandName: APP_CONFIG.ui.brandName,
      registrationEnabled: APP_CONFIG.user.registrationEnabled
    }
  };
}

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const { config } = loaderData;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到您的账户
          </h2>
          {config.registrationEnabled && (
            <p className="mt-2 text-center text-sm text-gray-600">
              或者{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                创建新账户
              </Link>
            </p>
          )}
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
                    登录失败
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
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入用户名"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入密码"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              登录
            </button>
          </div>
          
          <div className="text-center space-y-2">
            <Link to="/" className="block text-sm text-gray-600 hover:text-gray-500">
              继续使用匿名临时邮箱
            </Link>
            {!config.registrationEnabled && (
              <p className="text-xs text-gray-500">
                用户注册功能暂时关闭
              </p>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
}
