/**
 * 管理员邮件详情页面
 */

import type { Route } from "./+types/admin.emails.$id";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { eq } from "drizzle-orm";
import { emails } from "~/db/schema";
import { 
  ArrowLeft, 
  Mail, 
  Calendar,
  User,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Reply,
  Forward,
  Archive,
  Flag,
  Paperclip
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  const formData = await request.formData();
  const action = formData.get("action")?.toString();
  const emailId = params.id;
  
  try {
    switch (action) {
      case "markRead":
        await db.update(emails).set({ isRead: true }).where(eq(emails.id, emailId));
        return { success: "邮件已标记为已读" };
        
      case "markUnread":
        await db.update(emails).set({ isRead: false }).where(eq(emails.id, emailId));
        return { success: "邮件已标记为未读" };
        
      case "delete":
        await db.delete(emails).where(eq(emails.id, emailId));
        return new Response(null, {
          status: 302,
          headers: { Location: "/admin/emails" }
        });
        
      default:
        return { error: "未知操作" };
    }
    
  } catch (error) {
    console.error("邮件操作失败:", error);
    return {
      error: error instanceof Error ? error.message : "操作失败，请稍后重试"
    };
  }
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  const emailId = params.id;
  
  try {
    // 获取邮件详情
    const email = await db.query.emails.findFirst({
      where: (emails, { eq }) => eq(emails.id, emailId),
    });
    
    if (!email) {
      throw new Response("邮件不存在", { status: 404 });
    }
    
    // 获取邮箱信息
    const mailbox = await db.query.mailboxes.findFirst({
      where: (mailboxes, { eq }) => eq(mailboxes.id, email.mailboxId),
    });
    
    // 获取邮箱分配信息
    let assignedUser = null;
    if (mailbox) {
      const userAssignment = await db.query.userMailboxes.findFirst({
        where: (userMailboxes, { eq }) => eq(userMailboxes.mailboxId, mailbox.id),
      });
      
      if (userAssignment) {
        assignedUser = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, userAssignment.userId),
        });
      }
    }
    
    // 获取附件信息（如果有）
    const attachments = await db.query.attachments.findMany({
      where: (attachments, { eq }) => eq(attachments.emailId, email.id),
    });
    
    return {
      email,
      mailbox,
      assignedUser,
      attachments,
    };
    
  } catch (error) {
    console.error("Error loading email details:", error);
    if (error instanceof Response) {
      throw error;
    }
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function AdminEmailDetail({ loaderData, actionData }: Route.ComponentProps) {
  const { email, mailbox, assignedUser, attachments } = loaderData;
  
  // 格式化日期
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            to="/admin/emails"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回邮件列表
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              邮件详情
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              查看和管理邮件内容
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Form method="post" className="inline">
            <input type="hidden" name="action" value={email.isRead ? "markUnread" : "markRead"} />
            <Button variant="outline" type="submit">
              {email.isRead ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  标记未读
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  标记已读
                </>
              )}
            </Button>
          </Form>
          
          <Form method="post" className="inline">
            <input type="hidden" name="action" value="delete" />
            <Button 
              variant="outline" 
              type="submit"
              className="text-red-600 hover:text-red-700"
              onClick={(e) => {
                if (!confirm("确定要删除这封邮件吗？此操作不可恢复。")) {
                  e.preventDefault();
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除邮件
            </Button>
          </Form>
        </div>
      </div>

      {/* 状态消息 */}
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
        </div>
      )}

      {/* 邮件信息卡片 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              邮件信息
            </h2>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={email.isRead ? "secondary" : "default"}
                className={email.isRead ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"}
              >
                {email.isRead ? "已读" : "未读"}
              </Badge>
              {attachments.length > 0 && (
                <Badge variant="outline">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {attachments.length} 个附件
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">发件人</label>
              <div className="mt-1 text-sm text-gray-900">{email.fromEmail}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">收件人</label>
              <div className="mt-1 text-sm text-gray-900">{mailbox?.email}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">主题</label>
              <div className="mt-1 text-sm text-gray-900">{email.subject || "(无主题)"}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">接收时间</label>
              <div className="mt-1 text-sm text-gray-900">{formatDate(email.receivedAt)}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">邮件大小</label>
              <div className="mt-1 text-sm text-gray-900">{formatFileSize(email.size || 0)}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">邮箱分配</label>
              <div className="mt-1 text-sm text-gray-900">
                {assignedUser ? (
                  <span>用户: {assignedUser.username}</span>
                ) : (
                  <span className="text-gray-500">未分配</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 附件列表 */}
      {attachments.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              附件 ({attachments.length})
            </h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <Paperclip className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {attachment.filename}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(attachment.size)} • {attachment.contentType}
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    to={`/attachment/${attachment.id}`}
                    target="_blank"
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-blue-600 hover:text-blue-700"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    下载
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 邮件内容 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            邮件内容
          </h2>
        </div>
        
        <div className="p-6">
          {/* HTML 内容 */}
          {email.htmlContent && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">HTML 内容</h3>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <iframe
                  srcDoc={email.htmlContent}
                  className="w-full h-96 border-0"
                  sandbox="allow-same-origin"
                  title="邮件HTML内容"
                />
              </div>
            </div>
          )}
          
          {/* 纯文本内容 */}
          {email.textContent && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">纯文本内容</h3>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                  {email.textContent}
                </pre>
              </div>
            </div>
          )}
          
          {!email.htmlContent && !email.textContent && (
            <div className="text-center py-8 text-gray-500">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">无邮件内容</h3>
              <p className="mt-1 text-sm text-gray-500">
                此邮件没有可显示的内容
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
