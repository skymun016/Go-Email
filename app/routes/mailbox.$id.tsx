/**
 * 邮箱邮件列表页面
 * 显示指定邮箱中的所有邮件
 */

import type { Route } from "./+types/mailbox.$id";
import { Link, useLoaderData } from "react-router";
import { requireUser } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { ArrowLeft, Mail, Clock, Paperclip, Eye, EyeOff } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TelegramPushSettings } from "~/components/TelegramPushSettings";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { id: mailboxId } = params;
  const env = context.cloudflare.env;
  
  if (!mailboxId) {
    throw new Response("邮箱 ID 是必需的", { status: 400 });
  }

  // 要求用户登录
  const user = await requireUser(request, env);
  const db = createDB(getDatabase(env));
  
  try {
    // 验证邮箱所有权
    const mailbox = await db.query.mailboxes.findFirst({
      where: (mailboxes, { eq, and }) => and(
        eq(mailboxes.id, mailboxId),
        eq(mailboxes.ownerId, user.id),
        eq(mailboxes.ownerType, 'user')
      ),
    });
    
    if (!mailbox) {
      throw new Response("邮箱未找到或无权访问", { status: 404 });
    }
    
    // 获取邮箱中的所有邮件
    const emails = await db.query.emails.findMany({
      where: (emails, { eq }) => eq(emails.mailboxId, mailboxId),
      orderBy: (emails, { desc }) => [desc(emails.receivedAt)],
    });

    // 获取每封邮件的附件数量
    const emailsWithAttachments = await Promise.all(
      emails.map(async (email) => {
        const attachmentCount = await db.query.attachments.findMany({
          where: (attachments, { eq }) => eq(attachments.emailId, email.id),
        });
        return {
          ...email,
          attachments: attachmentCount,
        };
      })
    );
    
    return {
      mailbox,
      emails: emailsWithAttachments,
      user: {
        id: user.id,
        username: user.username,
      }
    };
    
  } catch (error) {
    console.error("Error loading mailbox emails:", error);
    
    if (error instanceof Response) {
      throw error;
    }
    
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function MailboxDetail({ loaderData }: Route.ComponentProps) {
  const { mailbox, emails, user } = loaderData;
  
  // 格式化日期
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };
  
  // 格式化邮件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center">
              <Link 
                to="/dashboard"
                className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回邮箱管理
              </Link>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <Mail className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {mailbox.email}
                  </h1>
                  <p className="text-sm text-gray-500">
                    共 {emails.length} 封邮件
                    {emails.filter(email => !email.isRead).length > 0 && (
                      <span className="ml-2 text-red-600">
                        • {emails.filter(email => !email.isRead).length} 未读
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：邮件列表 */}
          <div className="lg:col-span-2">
            {emails.length === 0 ? (
            // 空状态
            <div className="bg-white rounded-lg shadow text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                还没有收到邮件
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                发送邮件到 {mailbox.email} 即可在这里查看
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/dashboard">返回邮箱管理</Link>
                </Button>
              </div>
            </div>
          ) : (
          // 邮件列表
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                邮件列表
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {emails.map((email) => (
                <div 
                  key={email.id} 
                  className={`px-6 py-4 hover:bg-gray-50 ${
                    !email.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {email.isRead ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <h3 className={`text-sm font-medium truncate ${
                              !email.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {email.subject || '(无主题)'}
                            </h3>
                            {!email.isRead && (
                              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                                未读
                              </Badge>
                            )}
                            {email.attachments && email.attachments.length > 0 && (
                              <Paperclip className="w-4 h-4 text-gray-400 ml-2" />
                            )}
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span className="truncate">
                              来自: {email.fromAddress}
                            </span>
                            <span className="mx-2">•</span>
                            <Clock className="w-4 h-4 mr-1" />
                            <span>
                              {formatDate(email.receivedAt)}
                            </span>
                            <span className="mx-2">•</span>
                            <span>
                              {formatSize(email.size)}
                            </span>
                          </div>
                          {email.textContent && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                              {email.textContent.substring(0, 150)}
                              {email.textContent.length > 150 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/mail/${email.id}`}>
                          查看详情
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
          </div>

          {/* 右侧：设置面板 */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Telegram 推送设置 */}
              <TelegramPushSettings mailboxEmail={mailbox.email} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
