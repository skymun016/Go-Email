import { useState, useEffect } from "react";
import { Form, useActionData, useNavigation, useLoaderData, data, useFetcher } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createDB, markEmailAsRead } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { verifyAndGetEmails, getMailboxStats } from "~/lib/mailbox-verification";
import { EnhancedMailItem } from "~/components/enhanced-mail-item";
import { Button } from "~/components/ui/button";
import { APP_CONFIG } from "~/config/app";
import { Copy, Check } from "lucide-react";

// 类型定义
interface ActionData {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    mailbox: {
      id: string;
      email: string;
      createdAt: Date;
      expiresAt: Date;
      ownerType: string | null;
    };
    emails: Array<{
      id: string;
      fromAddress: string;
      subject: string | null;
      receivedAt: Date;
      isRead: boolean;
      size: number;
    }>;
    totalCount: number;
    stats: {
      totalEmails: number;
      unreadEmails: number;
      latestEmailDate?: Date;
    };
    isExpired?: boolean;
  };
}

// Loader函数 - 页面加载时执行，支持URL参数自动验证
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const code = url.searchParams.get("code");

  // 如果URL包含email和code参数，进行自动验证
  let autoVerifyResult = null;
  if (email && code) {
    try {
      const env = context.cloudflare.env;
      const db = createDB(getDatabase(env));

      // URL解码邮箱地址
      const decodedEmail = decodeURIComponent(email);
      const decodedCode = code.trim();

      // 验证参数格式
      if (decodedEmail.includes('@') && /^\d{6}$/.test(decodedCode)) {
        autoVerifyResult = await verifyAndGetEmails(db, decodedEmail, decodedCode);
      }
    } catch (error) {
      console.error("自动验证失败:", error);
    }
  }

  return data({
    brandName: APP_CONFIG.ui.brandName,
    supportedDomains: APP_CONFIG.cloudflare.email.supportedDomains,
    urlParams: { email, code },
    autoVerifyResult
  });
}

// Action函数 - 表单提交时执行
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const db = createDB(getDatabase(env));

  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    // 处理标记邮件为已读的请求
    if (action === "markEmailAsRead") {
      const emailId = formData.get("emailId") as string;

      if (!emailId) {
        return data<ActionData>({
          success: false,
          error: "邮件ID是必需的"
        });
      }

      await markEmailAsRead(db, emailId, true);
      return data<ActionData>({
        success: true,
        message: "邮件已标记为已读"
      });
    }

    // 处理邮箱验证请求
    const email = formData.get("email") as string;
    const verificationCode = formData.get("verificationCode") as string;

    // 验证并获取邮件
    const result = await verifyAndGetEmails(db, email, verificationCode);

    if (!result.success || !result.data) {
      return data<ActionData>({
        success: false,
        error: result.error || "验证失败",
      });
    }

    // 获取邮箱统计信息
    const stats = await getMailboxStats(db, result.data.mailbox.id);

    return data<ActionData>({
      success: true,
      data: {
        ...result.data,
        stats,
      },
    });
  } catch (error) {
    console.error("邮箱验证处理失败:", error);
    return data<ActionData>({
      success: false,
      error: "服务器错误，请稍后重试",
    });
  }
}

// 页面组件
export default function VerifyMailbox() {
  const actionData = useActionData<ActionData>();
  const loaderData = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const fetcher = useFetcher();

  // 状态管理
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // 自动刷新相关状态
  const [countdown, setCountdown] = useState(30);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastEmailCount, setLastEmailCount] = useState(0);
  const [newEmailNotification, setNewEmailNotification] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";

  // 检查是否有URL参数和自动验证结果
  const hasUrlParams = loaderData.urlParams?.email && loaderData.urlParams?.code;
  const autoVerifyResult = loaderData.autoVerifyResult;

  // 初始化表单数据
  useEffect(() => {
    if (hasUrlParams) {
      setEmail(decodeURIComponent(loaderData.urlParams.email!));
      setVerificationCode(loaderData.urlParams.code!);
    }
  }, [hasUrlParams, loaderData.urlParams]);

  // 自动刷新功能
  useEffect(() => {
    // 只有在成功验证邮箱后才启用自动刷新
    const hasSuccessfulVerification = (actionData && actionData.success) || (autoVerifyResult && autoVerifyResult.success);

    if (hasSuccessfulVerification) {
      setIsAutoRefreshEnabled(true);
      setCountdown(30);

      // 记录当前邮件数量
      const currentEmailCount = actionData?.data?.totalCount || autoVerifyResult?.data?.totalCount || 0;
      setLastEmailCount(currentEmailCount);
    }
  }, [actionData, autoVerifyResult]);

  // 检测新邮件
  useEffect(() => {
    const currentEmailCount = actionData?.data?.totalCount || autoVerifyResult?.data?.totalCount || 0;

    if (lastEmailCount > 0 && currentEmailCount > lastEmailCount) {
      const newEmailsCount = currentEmailCount - lastEmailCount;
      setNewEmailNotification(`🎉 发现 ${newEmailsCount} 封新邮件！`);
      setTimeout(() => setNewEmailNotification(null), 5000);
    }

    setLastEmailCount(currentEmailCount);
  }, [actionData?.data?.totalCount, autoVerifyResult?.data?.totalCount]);

  // 倒计时和自动刷新逻辑
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 倒计时结束，执行刷新
          handleAutoRefresh();
          return 30; // 重置倒计时
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoRefreshEnabled]);

  // 执行自动刷新
  const handleAutoRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // 使用当前的邮箱和验证码重新提交表单
      const currentEmail = email || (hasUrlParams ? decodeURIComponent(loaderData.urlParams.email!) : "");
      const currentCode = verificationCode || (hasUrlParams ? loaderData.urlParams.code! : "");

      if (currentEmail && currentCode) {
        fetcher.submit(
          { email: currentEmail, verificationCode: currentCode },
          { method: "post" }
        );
      }
    } catch (error) {
      console.error('自动刷新失败:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // 手动刷新
  const handleManualRefresh = () => {
    setCountdown(30); // 重置倒计时
    handleAutoRefresh();
  };

  // 切换自动刷新状态
  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
    if (!isAutoRefreshEnabled) {
      setCountdown(30);
    }
  };

  // 复制邮箱地址到剪贴板
  const copyEmailAddress = async (emailAddress: string) => {
    try {
      await navigator.clipboard.writeText(emailAddress);
      setEmailCopied(true);
      setNotification({
        type: 'success',
        message: '邮箱地址已复制到剪贴板'
      });
      setTimeout(() => {
        setEmailCopied(false);
        setNotification(null);
      }, 2000);
    } catch (error) {
      console.error('复制失败:', error);
      setNotification({
        type: 'error',
        message: '复制失败，请手动复制'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // 标记邮件为已读
  const markEmailAsReadHandler = async (emailId: string) => {
    try {
      fetcher.submit(
        { action: "markEmailAsRead", emailId },
        { method: "post" }
      );
    } catch (error) {
      console.error('标记邮件已读失败:', error);
    }
  };

  // 决定显示内容的逻辑
  const shouldShowForm = !hasUrlParams || (hasUrlParams && !autoVerifyResult?.success);
  const shouldShowAutoResult = hasUrlParams && autoVerifyResult;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 通知消息 */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-100 border border-green-200 text-green-800'
              : 'bg-red-100 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">
                {notification.type === 'success' ? '✅' : '❌'}
              </span>
              {notification.message}
            </div>
          </div>
        )}

        {/* 新邮件通知 */}
        {newEmailNotification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 text-green-800 animate-bounce">
            <div className="flex items-center">
              <span className="mr-2 text-lg">📬</span>
              <span className="font-medium">{newEmailNotification}</span>
            </div>
          </div>
        )}

        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📧 邮箱查看
          </h1>
          <p className="text-gray-600">
            输入邮箱地址和验证码查看邮件
          </p>
        </div>



        {/* 验证表单 */}
        {shouldShowForm && (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 mb-8">
          <Form method="post" className="space-y-4">
            {/* 邮箱地址输入 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@aug.qzz.io"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* 验证码输入 */}
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                验证码
              </label>
              <input
                type="text"
                id="verificationCode"
                name="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="请输入6位数验证码"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
                maxLength={6}
                pattern="[0-9]{6}"
              />
              <p className="text-xs text-gray-500 mt-1">
                每个邮箱地址都有唯一的6位数验证码
              </p>
            </div>

            {/* 提交按钮 */}
            <Button
              type="submit"
              disabled={isSubmitting || !email || !verificationCode}
              className="w-full"
            >
              {isSubmitting ? "验证中..." : "🔍 查看邮件"}
            </Button>
          </Form>

          {/* 错误信息 */}
          {actionData && !actionData.success && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">❌ {actionData.error}</p>
            </div>
          )}
          </div>
        )}

        {/* 邮件列表 - 支持自动验证和手动验证结果 */}
        {((actionData && actionData.success && actionData.data) || (shouldShowAutoResult && autoVerifyResult?.success && autoVerifyResult.data)) && (
          <div className="max-w-4xl mx-auto">
            {(() => {
              // 获取显示数据（优先使用actionData，其次使用autoVerifyResult）
              const displayData = actionData?.data || autoVerifyResult?.data;
              if (!displayData) return null;

              return (
                <>
                  {/* 自动刷新控制面板 */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow-md p-4 mb-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${isAutoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                          <span className="text-sm font-medium text-gray-700">
                            自动刷新 {isAutoRefreshEnabled ? '已启用' : '已禁用'}
                          </span>
                        </div>
                        {isAutoRefreshEnabled && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <span>⏱️</span>
                            <span className="font-mono font-bold">
                              {countdown}秒后刷新
                            </span>
                          </div>
                        )}
                        {isRefreshing && (
                          <div className="flex items-center gap-2 text-sm text-orange-600">
                            <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>刷新中...</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleManualRefresh}
                          disabled={isRefreshing}
                          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-1"
                          title="立即刷新"
                        >
                          <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
                          立即刷新
                        </button>
                        <button
                          onClick={toggleAutoRefresh}
                          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                            isAutoRefreshEnabled
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                          title={isAutoRefreshEnabled ? "关闭自动刷新" : "开启自动刷新"}
                        >
                          {isAutoRefreshEnabled ? '⏸️ 关闭' : '▶️ 开启'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      💡 自动刷新每30秒检查一次新邮件，确保您不会错过重要信息
                    </div>
                  </div>

                  {/* 邮箱信息 */}
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      📮 邮箱信息
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="col-span-full">
                        <span className="font-medium text-gray-700">邮箱地址：</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-blue-600 font-mono text-base">{displayData.mailbox.email}</span>
                          <button
                            onClick={() => copyEmailAddress(displayData.mailbox.email)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                            title="复制邮箱地址"
                          >
                            {emailCopied ? (
                              <>
                                <Check className="w-3 h-3" />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                复制
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">邮箱类型：</span>
                        <span className="text-gray-600">
                          {displayData.mailbox.ownerType === 'user' ? '用户邮箱' : '临时邮箱'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">邮箱状态：</span>
                        <span className={`font-medium ${displayData.isExpired ? 'text-orange-600' : 'text-green-600'}`}>
                          {displayData.isExpired ? '已过期（只读）' : '活跃中'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">总邮件数：</span>
                        <span className="text-gray-600">{displayData.totalCount}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">未读邮件：</span>
                        <span className="text-red-600">{displayData.emails.filter(email => !email.isRead).length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">过期时间：</span>
                        <span className="text-gray-600">
                          {new Date(displayData.mailbox.expiresAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
              </div>
            </div>

                  {/* 过期邮箱提示 */}
                  {displayData.isExpired && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="text-orange-400 text-xl">⚠️</div>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-orange-800">
                            邮箱已过期
                          </h3>
                          <div className="mt-2 text-sm text-orange-700">
                            <p>此邮箱已过期，不再接收新邮件。</p>
                            <p>您仍可以查看历史邮件，但无法接收新的邮件。</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 邮件列表 */}
                  <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">
                          📬 邮件列表 ({displayData.totalCount})
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {isAutoRefreshEnabled && (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span>自动刷新中</span>
                            </>
                          )}
                          {isRefreshing && (
                            <>
                              <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-blue-600">更新中...</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {displayData.emails.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">📭</div>
                        <p>暂无邮件</p>
                        <p className="text-sm mt-1">发送邮件到该地址后即可在此查看</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {displayData.emails.map((email, index) => (
                          <EnhancedMailItem
                            key={email.id}
                            id={email.id}
                            index={index + 1}
                            name={email.fromAddress.split('@')[0]}
                            email={email.fromAddress}
                            subject={email.subject || "(无主题)"}
                            date={email.receivedAt.toISOString()}
                            isRead={email.isRead}
                            textContent={(email as any).textContent || undefined}
                            htmlContent={(email as any).htmlContent || undefined}
                            onMarkAsRead={markEmailAsReadHandler}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}


      </div>
    </div>
  );
}
