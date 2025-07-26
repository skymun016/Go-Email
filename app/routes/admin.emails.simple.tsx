/**
 * 管理员邮件管理页面 - 简化版本
 */

import type { Route } from "./+types/admin.emails.simple";
import { Link, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { desc } from "drizzle-orm";
import { 
  Mail, 
  Calendar,
  Eye,
  Download,
  RefreshCw
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));
  
  try {
    // 获取邮件列表（简化版本）
    const emailList = await db.query.emails.findMany({
      orderBy: [desc(db.query.emails.receivedAt)],
      limit: 20,
    });
    
    // 获取每个邮件的邮箱信息
    const emailsWithMailbox = await Promise.all(
      emailList.map(async (email) => {
        const mailbox = await db.query.mailboxes.findFirst({
          where: (mailboxes, { eq }) => eq(mailboxes.id, email.mailboxId),
        });
        
        return {
          ...email,
          mailbox,
        };
      })
    );
    
    // 获取统计信息
    const allEmails = await db.query.emails.findMany();
    const stats = {
      totalEmails: allEmails.length,
      todayEmails: allEmails.filter(email => {
        const today = new Date();
        const emailDate = new Date(email.receivedAt);
        return emailDate.toDateString() === today.toDateString();
      }).length,
      unreadEmails: allEmails.filter(email => !email.isRead).length,
    };
    
    return {
      emails: emailsWithMailbox,
      stats,
    };
    
  } catch (error) {
    console.error("Error loading emails:", error);
    throw new Response("服务器错误", { status: 500 });
  }
}

export default function AdminEmailsSimple({ loaderData }: Route.ComponentProps) {
  const { emails, stats } = loaderData;
  
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
  
  // 截断文本
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            邮件管理
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            搜索和管理系统中的所有邮件
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出邮件
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  总邮件数
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.totalEmails}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  今日邮件
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.todayEmails}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Eye className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  未读邮件
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.unreadEmails}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* 邮件列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            最近邮件 ({emails.length} 封)
          </h2>
        </div>
        
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到邮件</h3>
            <p className="mt-1 text-sm text-gray-500">
              系统中暂无邮件
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮件信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮箱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    接收时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {email.subject || "(无主题)"}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            来自: {email.fromAddress}
                          </div>
                          {email.textContent && (
                            <div className="text-xs text-gray-400 mt-1">
                              {truncateText(email.textContent)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {email.mailbox?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={email.isRead ? "secondary" : "default"}
                        className={email.isRead ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"}
                      >
                        {email.isRead ? "已读" : "未读"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(email.receivedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/admin/emails/${email.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
