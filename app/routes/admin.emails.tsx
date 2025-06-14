import { redirect } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { emails, mailboxes } from "~/db/schema";
import { desc, like, and, gte, lte, eq } from "drizzle-orm";

export function meta() {
	return [
		{ title: "邮件管理 - GoMail 管理后台" },
		{ name: "robots", content: "noindex, nofollow" },
	];
}

// 获取邮件列表
export async function loader({ request, context }: any) {
	try {
		const env = context.cloudflare.env;
		
		// 验证管理员身份
		const admin = await requireAdmin(request, env);
		
		const url = new URL(request.url);
		const page = parseInt(url.searchParams.get("page") || "1");
		const limit = parseInt(url.searchParams.get("limit") || "20");
		const search = url.searchParams.get("search") || "";
		const fromDate = url.searchParams.get("fromDate") || "";
		const toDate = url.searchParams.get("toDate") || "";
		const isRead = url.searchParams.get("isRead") || "";
		
		const offset = (page - 1) * limit;
		
		const db = createDB(getDatabase(env));
		
		// 构建查询条件
		const conditions = [];
		
		if (search) {
			conditions.push(
				like(emails.fromAddress, `%${search}%`),
				like(emails.toAddress, `%${search}%`),
				like(emails.subject, `%${search}%`)
			);
		}
		
		if (fromDate) {
			conditions.push(gte(emails.receivedAt, new Date(fromDate)));
		}
		
		if (toDate) {
			conditions.push(lte(emails.receivedAt, new Date(toDate + "T23:59:59")));
		}
		
		if (isRead !== "") {
			conditions.push(eq(emails.isRead, isRead === "true"));
		}
		
		// 获取邮件列表
		const emailList = await db
			.select({
				id: emails.id,
				fromAddress: emails.fromAddress,
				toAddress: emails.toAddress,
				subject: emails.subject,
				receivedAt: emails.receivedAt,
				isRead: emails.isRead,
				size: emails.size,
				mailboxEmail: mailboxes.email,
			})
			.from(emails)
			.leftJoin(mailboxes, eq(emails.mailboxId, mailboxes.id))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(emails.receivedAt))
			.limit(limit)
			.offset(offset);
		
		// 获取总数（用于分页）
		const totalResult = await db
			.select({ count: emails.id })
			.from(emails)
			.where(conditions.length > 0 ? and(...conditions) : undefined);
		
		const total = totalResult.length;
		const totalPages = Math.ceil(total / limit);
		
		return {
			admin: { username: admin.username },
			emails: emailList.map(email => ({
				...email,
				receivedAt: email.receivedAt.toISOString(),
			})),
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1,
			},
			filters: {
				search,
				fromDate,
				toDate,
				isRead,
			},
		};

	} catch (error) {
		console.error("Emails page error:", error);
		
		// 如果是认证错误，重定向到登录页
		if (error instanceof Response && error.status === 401) {
			return redirect("/admin-login");
		}
		
		throw error;
	}
}

// 处理邮件操作
export async function action({ request, context }: any) {
	try {
		const env = context.cloudflare.env;
		
		// 验证管理员身份
		await requireAdmin(request, env);
		
		const formData = await request.formData();
		const action = formData.get("action")?.toString();
		const emailId = formData.get("emailId")?.toString();
		
		const db = createDB(getDatabase(env));
		
		switch (action) {
			case "markRead":
				if (!emailId) {
					return { error: "邮件ID不能为空" };
				}
				
				await db
					.update(emails)
					.set({ isRead: true })
					.where(eq(emails.id, emailId));
				
				return { success: "邮件已标记为已读" };
				
			case "markUnread":
				if (!emailId) {
					return { error: "邮件ID不能为空" };
				}
				
				await db
					.update(emails)
					.set({ isRead: false })
					.where(eq(emails.id, emailId));
				
				return { success: "邮件已标记为未读" };
				
			case "delete":
				if (!emailId) {
					return { error: "邮件ID不能为空" };
				}
				
				await db
					.delete(emails)
					.where(eq(emails.id, emailId));
				
				return { success: "邮件已删除" };
				
			default:
				return { error: "未知操作" };
		}
		
	} catch (error) {
		console.error("Email action error:", error);
		return { error: "操作失败，请稍后重试" };
	}
}

export default function AdminEmails({ loaderData, actionData }: any) {
	const { admin, emails, pagination, filters } = loaderData;

	return (
		<div className="min-h-screen bg-gray-100">
			{/* 顶部导航 */}
			<nav className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex items-center space-x-4">
							<a href="/admin/dashboard" className="text-blue-600 hover:text-blue-500">
								← 返回仪表板
							</a>
							<h1 className="text-xl font-semibold text-gray-900">邮件管理</h1>
						</div>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-700">欢迎，{admin.username}</span>
							<a href="/admin/logout" className="text-sm text-red-600 hover:text-red-500">
								退出登录
							</a>
						</div>
					</div>
				</div>
			</nav>

			{/* 主要内容 */}
			<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				{/* 消息提示 */}
				{actionData?.error && (
					<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
						{actionData.error}
					</div>
				)}
				{actionData?.success && (
					<div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
						{actionData.success}
					</div>
				)}

				{/* 搜索和筛选 */}
				<div className="bg-white shadow rounded-lg mb-6">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">搜索和筛选</h3>
						<form method="get" className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div>
									<label htmlFor="search" className="block text-sm font-medium text-gray-700">
										搜索关键词
									</label>
									<input
										type="text"
										id="search"
										name="search"
										defaultValue={filters.search}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder="发件人、收件人或主题"
									/>
								</div>
								<div>
									<label htmlFor="fromDate" className="block text-sm font-medium text-gray-700">
										开始日期
									</label>
									<input
										type="date"
										id="fromDate"
										name="fromDate"
										defaultValue={filters.fromDate}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label htmlFor="toDate" className="block text-sm font-medium text-gray-700">
										结束日期
									</label>
									<input
										type="date"
										id="toDate"
										name="toDate"
										defaultValue={filters.toDate}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label htmlFor="isRead" className="block text-sm font-medium text-gray-700">
										阅读状态
									</label>
									<select
										id="isRead"
										name="isRead"
										defaultValue={filters.isRead}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									>
										<option value="">全部</option>
										<option value="true">已读</option>
										<option value="false">未读</option>
									</select>
								</div>
							</div>
							<div className="flex space-x-2">
								<button
									type="submit"
									className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
								>
									搜索
								</button>
								<a
									href="/admin/emails"
									className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
								>
									重置
								</a>
							</div>
						</form>
					</div>
				</div>

				{/* 邮件列表 */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg leading-6 font-medium text-gray-900">
								邮件列表 (共 {pagination.total} 封)
							</h3>
						</div>
						
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											发件人
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											收件人
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											主题
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											时间
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											状态
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											大小
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											操作
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{emails.map((email: any) => (
										<tr key={email.id} className={email.isRead ? "" : "bg-blue-50"}>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{email.fromAddress}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{email.toAddress}
											</td>
											<td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
												{email.subject || "(无主题)"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{new Date(email.receivedAt).toLocaleString()}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
													email.isRead 
														? "bg-green-100 text-green-800" 
														: "bg-yellow-100 text-yellow-800"
												}`}>
													{email.isRead ? "已读" : "未读"}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{(email.size / 1024).toFixed(1)} KB
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
												<a
													href={`/mail/${email.id}`}
													target="_blank"
													className="text-blue-600 hover:text-blue-500"
												>
													查看
												</a>
												{!email.isRead ? (
													<form method="post" className="inline">
														<input type="hidden" name="action" value="markRead" />
														<input type="hidden" name="emailId" value={email.id} />
														<button
															type="submit"
															className="text-green-600 hover:text-green-500"
														>
															标记已读
														</button>
													</form>
												) : (
													<form method="post" className="inline">
														<input type="hidden" name="action" value="markUnread" />
														<input type="hidden" name="emailId" value={email.id} />
														<button
															type="submit"
															className="text-yellow-600 hover:text-yellow-500"
														>
															标记未读
														</button>
													</form>
												)}
												<form method="post" className="inline">
													<input type="hidden" name="action" value="delete" />
													<input type="hidden" name="emailId" value={email.id} />
													<button
														type="submit"
														className="text-red-600 hover:text-red-500"
														onClick={(e) => {
															if (!confirm("确定要删除这封邮件吗？此操作不可恢复。")) {
																e.preventDefault();
															}
														}}
													>
														删除
													</button>
												</form>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* 分页 */}
						{pagination.totalPages > 1 && (
							<div className="mt-6 flex items-center justify-between">
								<div className="text-sm text-gray-700">
									显示第 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
								</div>
								<div className="flex space-x-2">
									{pagination.hasPrev && (
										<a
											href={`?page=${pagination.page - 1}&search=${filters.search}&fromDate=${filters.fromDate}&toDate=${filters.toDate}&isRead=${filters.isRead}`}
											className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
										>
											上一页
										</a>
									)}
									<span className="px-3 py-2 text-sm text-gray-700">
										第 {pagination.page} / {pagination.totalPages} 页
									</span>
									{pagination.hasNext && (
										<a
											href={`?page=${pagination.page + 1}&search=${filters.search}&fromDate=${filters.fromDate}&toDate=${filters.toDate}&isRead=${filters.isRead}`}
											className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
										>
											下一页
										</a>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
