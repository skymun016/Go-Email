/**
 * 管理员邮件管理页面 - 基础版本
 */

import type { Route } from "./+types/admin.emails.basic";
import { Form, Link, useLoaderData, useSearchParams } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { desc, like, and, eq, or } from "drizzle-orm";
import { emails } from "~/db/schema";
import {
  Search,
  Mail,
  Calendar,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Trash2
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;

  // 要求管理员权限
  await requireAdmin(request, env);
  const db = createDB(getDatabase(env));

  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || "";
  const readFilter = url.searchParams.get("read") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 20;

  try {
    // 构建查询条件
    const conditions = [];

    if (searchQuery) {
      conditions.push(
        or(
          like(emails.subject, `%${searchQuery}%`),
          like(emails.fromAddress, `%${searchQuery}%`),
          like(emails.textContent, `%${searchQuery}%`)
        )
      );
    }

    if (readFilter !== "") {
      conditions.push(eq(emails.isRead, readFilter === "true"));
    }

    // 获取邮件列表
    const emailList = await db.select()
      .from(emails)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(emails.receivedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

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

    // 获取总数用于分页
    const totalResult = await db.select()
      .from(emails)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

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
      totalCount: totalResult.length,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalResult.length / pageSize),
      searchQuery,
      readFilter,
      stats,
    };

  } catch (error) {
    console.error("Error loading emails:", error);
    return {
      emails: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      totalPages: 0,
      searchQuery: "",
      readFilter: "",
      stats: { totalEmails: 0, todayEmails: 0, unreadEmails: 0 },
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

export default function AdminEmailsBasic({ loaderData }: Route.ComponentProps) {
  const {
    emails,
    totalCount,
    currentPage,
    totalPages,
    searchQuery,
    readFilter,
    stats,
    error
  } = loaderData;

  const [searchParams] = useSearchParams();

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

      {/* 错误信息 */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            错误: {error}
          </div>
        </div>
      )}

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

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            搜索和筛选
          </h2>
        </div>

        <Form method="get" className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 搜索框 */}
            <div>
              <label htmlFor="q" className="block text-sm font-medium text-gray-700">
                搜索邮件
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="q"
                  id="q"
                  defaultValue={searchQuery}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="搜索主题、发件人或内容..."
                />
              </div>
            </div>

            {/* 阅读状态筛选 */}
            <div>
              <label htmlFor="read" className="block text-sm font-medium text-gray-700">
                阅读状态
              </label>
              <select
                name="read"
                id="read"
                defaultValue={readFilter}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">全部</option>
                <option value="true">已读</option>
                <option value="false">未读</option>
              </select>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-end space-x-3">
              <Button type="submit">
                <Filter className="w-4 h-4 mr-2" />
                搜索
              </Button>
              <Link
                to="/admin/emails"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                清除
              </Link>
            </div>
          </div>
        </Form>
      </div>

      {/* 邮件列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            邮件列表 ({totalCount} 个结果)
          </h2>
        </div>

        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到邮件</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || readFilter ? "尝试调整搜索条件或筛选器" : "系统中暂无邮件"}
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
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              {currentPage > 1 && (
                <Link
                  to={`/admin/emails?${new URLSearchParams({
                    ...Object.fromEntries(searchParams),
                    page: (currentPage - 1).toString(),
                  })}`}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  上一页
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  to={`/admin/emails?${new URLSearchParams({
                    ...Object.fromEntries(searchParams),
                    page: (currentPage + 1).toString(),
                  })}`}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  下一页
                </Link>
              )}
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{" "}
                  条，共 <span className="font-medium">{totalCount}</span> 条结果
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((page) => (
                    <Link
                      key={page}
                      to={`/admin/emails?${new URLSearchParams({
                        ...Object.fromEntries(searchParams),
                        page: page.toString(),
                      })}`}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
