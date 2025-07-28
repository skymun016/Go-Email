import { useState, useEffect } from "react";
import { Form, useActionData, useNavigation, useLoaderData, useSearchParams, data } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { verifyAndGetEmails, getMailboxStats } from "~/lib/mailbox-verification";
import { MailItem } from "~/components/mail-item";
import { Button } from "~/components/ui/button";
import { APP_CONFIG } from "~/config/app";

// 类型定义
interface ActionData {
  success: boolean;
  error?: string;
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
  const [searchParams] = useSearchParams();

  // 状态管理
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

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

  // 决定显示内容的逻辑
  const shouldShowForm = !hasUrlParams || (hasUrlParams && !autoVerifyResult?.success);
  const shouldShowAutoResult = hasUrlParams && autoVerifyResult;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
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
                  {/* 邮箱信息 */}
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      📮 邮箱信息
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">邮箱地址：</span>
                        <span className="text-blue-600 font-mono">{displayData.mailbox.email}</span>
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
                      <h2 className="text-xl font-semibold text-gray-900">
                        📬 邮件列表 ({displayData.totalCount})
                      </h2>
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
                          <MailItem
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
