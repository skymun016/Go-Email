/**
 * 用户Dashboard页面 - 邮箱管理中心
 */

import type { Route } from "./+types/dashboard";
import { Link, useLoaderData } from "react-router";
import { requireUser } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase, APP_CONFIG } from "~/config/app";
import { getUserMailboxes, checkUserQuota } from "~/lib/user-db";
import { sanitizeUser } from "~/lib/user-auth";
import { Mail, Settings, Clock, Shield, Zap } from "lucide-react";
import { Button } from "~/components/ui/button";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 要求用户登录
  const user = await requireUser(request, env);
  const db = createDB(getDatabase(env));
  
  // 获取用户邮箱列表
  const mailboxes = await getUserMailboxes(db, user.id);
  
  // 获取用户配额信息
  const quotaInfo = await checkUserQuota(db, user.id);
  
  return {
    user: sanitizeUser(user),
    mailboxes,
    quotaInfo,
    config: {
      brandName: APP_CONFIG.ui.brandName,
      defaultQuota: APP_CONFIG.user.defaultQuota
    }
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, mailboxes, quotaInfo, config } = loaderData;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  我的邮箱管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  欢迎回来，{user.username}！管理您的专属临时邮箱
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  邮箱由管理员分配和管理
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧：统计信息 */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* 配额信息卡片 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">邮箱配额</h3>
                    <p className="text-sm text-gray-500">您的邮箱使用情况</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">已使用</span>
                    <span className="font-medium">
                      {quotaInfo.current} / {quotaInfo.limit}
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((quotaInfo.current / quotaInfo.limit) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    剩余 {quotaInfo.remaining} 个邮箱可创建
                  </p>
                </div>
              </div>

              {/* 账户信息卡片 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">账户信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">用户名</span>
                    <span className="text-sm font-medium">{user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">联系邮箱</span>
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">注册时间</span>
                    <span className="text-sm font-medium">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  {user.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">账户有效期</span>
                      <span className="text-sm font-medium">
                        {new Date(user.expiresAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 功能特性 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">专属特权</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-sm text-gray-700">永久邮箱保存</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="text-sm text-gray-700">邮件历史记录</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-yellow-500 mr-3" />
                    <span className="text-sm text-gray-700">优先级处理</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：邮箱列表 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    我的邮箱 ({mailboxes.length})
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      批量管理
                    </Button>
                  </div>
                </div>
              </div>

              {/* 邮箱列表 */}
              <div className="divide-y divide-gray-200">
                {mailboxes.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <Mail className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      还没有分配邮箱
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      请联系管理员为您分配专属临时邮箱
                    </p>
                    <div className="mt-6">
                      <Button asChild variant="outline">
                        <Link to="/">
                          <Mail className="w-4 h-4 mr-2" />
                          使用匿名邮箱
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  mailboxes.map((mailbox) => (
                    <div key={mailbox.id} className="px-6 py-4 hover:bg-gray-50">
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
                                  {mailbox.email}
                                </h3>
                                {mailbox.isPermanent && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    永久
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <span>
                                  {mailbox.emailCount} 封邮件
                                </span>
                                {mailbox.unreadCount > 0 && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className="text-red-600 font-medium">
                                      {mailbox.unreadCount} 未读
                                    </span>
                                  </>
                                )}
                                <span className="mx-2">•</span>
                                <span>
                                  创建于 {new Date(mailbox.createdAt).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/mailbox/${mailbox.id}`}>
                              查看邮件
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm">
                            管理
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
