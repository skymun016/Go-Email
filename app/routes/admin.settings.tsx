import { redirect } from "react-router";
import { requireAdmin, hashPassword } from "~/lib/auth";
import { createDB, createAdmin, checkAdminExists } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { admins, emails, mailboxes, apiTokens } from "~/db/schema";
import { count, lt, eq } from "drizzle-orm";

export function meta() {
	return [
		{ title: "系统设置 - GoMail 管理后台" },
		{ name: "robots", content: "noindex, nofollow" },
	];
}

// 获取系统设置和统计信息
export async function loader({ request, context }: any) {
	try {
		const env = context.cloudflare.env;
		
		// 验证管理员身份
		const admin = await requireAdmin(request, env);
		
		const db = createDB(getDatabase(env));
		
		// 获取系统统计信息
		const [
			totalAdmins,
			totalMailboxes,
			totalEmails,
			totalTokens,
			expiredMailboxes,
		] = await Promise.all([
			db.select({ count: count() }).from(admins),
			db.select({ count: count() }).from(mailboxes),
			db.select({ count: count() }).from(emails),
			db.select({ count: count() }).from(apiTokens),
			db.select({ count: count() }).from(mailboxes).where(lt(mailboxes.expiresAt, new Date())),
		]);
		
		// 获取所有管理员列表
		const adminList = await db
			.select({
				id: admins.id,
				username: admins.username,
				createdAt: admins.createdAt,
				lastLoginAt: admins.lastLoginAt,
			})
			.from(admins);
		
		return {
			admin: { 
				id: admin.id,
				username: admin.username 
			},
			stats: {
				totalAdmins: totalAdmins[0]?.count || 0,
				totalMailboxes: totalMailboxes[0]?.count || 0,
				totalEmails: totalEmails[0]?.count || 0,
				totalTokens: totalTokens[0]?.count || 0,
				expiredMailboxes: expiredMailboxes[0]?.count || 0,
			},
			adminList: adminList.map(admin => ({
				...admin,
				createdAt: admin.createdAt.toISOString(),
				lastLoginAt: admin.lastLoginAt?.toISOString() || null,
			})),
		};

	} catch (error) {
		console.error("Settings page error:", error);
		
		// 如果是认证错误，重定向到登录页
		if (error instanceof Response && error.status === 401) {
			return redirect("/admin-login");
		}
		
		throw error;
	}
}

// 处理系统设置操作
export async function action({ request, context }: any) {
	try {
		const env = context.cloudflare.env;
		
		// 验证管理员身份
		const currentAdmin = await requireAdmin(request, env);
		
		const formData = await request.formData();
		const action = formData.get("action")?.toString();
		
		const db = createDB(getDatabase(env));
		
		switch (action) {
			case "createAdmin":
				const username = formData.get("username")?.toString();
				const password = formData.get("password")?.toString();
				
				if (!username || !password) {
					return { error: "用户名和密码不能为空" };
				}
				
				if (password.length < 6) {
					return { error: "密码长度至少6位" };
				}
				
				// 检查用户名是否已存在
				const exists = await checkAdminExists(db, username);
				if (exists) {
					return { error: "用户名已存在" };
				}
				
				await createAdmin(db, username, password);
				return { success: "管理员账户创建成功" };
				
			case "changePassword":
				const newPassword = formData.get("newPassword")?.toString();
				const confirmPassword = formData.get("confirmPassword")?.toString();
				
				if (!newPassword || !confirmPassword) {
					return { error: "新密码和确认密码不能为空" };
				}
				
				if (newPassword !== confirmPassword) {
					return { error: "两次输入的密码不一致" };
				}
				
				if (newPassword.length < 6) {
					return { error: "密码长度至少6位" };
				}
				
				const passwordHash = await hashPassword(newPassword);
				await db
					.update(admins)
					.set({ passwordHash })
					.where(eq(admins.id, currentAdmin.id));
				
				return { success: "密码修改成功" };
				
			case "deleteAdmin":
				const adminId = formData.get("adminId")?.toString();
				
				if (!adminId) {
					return { error: "管理员ID不能为空" };
				}
				
				if (adminId === currentAdmin.id) {
					return { error: "不能删除自己的账户" };
				}
				
				await db
					.delete(admins)
					.where(eq(admins.id, adminId));
				
				return { success: "管理员账户已删除" };
				
			case "cleanupExpired":
				// 删除过期的邮箱和相关邮件
				const now = new Date();
				await db
					.delete(mailboxes)
					.where(lt(mailboxes.expiresAt, now));
				
				return { success: "过期数据清理完成" };
				
			default:
				return { error: "未知操作" };
		}
		
	} catch (error) {
		console.error("Settings action error:", error);
		return { error: "操作失败，请稍后重试" };
	}
}

export default function AdminSettings({ loaderData, actionData }: any) {
	const { admin, stats, adminList } = loaderData;

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
							<h1 className="text-xl font-semibold text-gray-900">系统设置</h1>
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

				{/* 系统统计 */}
				<div className="bg-white shadow rounded-lg mb-8">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">系统统计</h3>
						<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">{stats.totalAdmins}</div>
								<div className="text-sm text-gray-500">管理员</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">{stats.totalMailboxes}</div>
								<div className="text-sm text-gray-500">邮箱总数</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-purple-600">{stats.totalEmails}</div>
								<div className="text-sm text-gray-500">邮件总数</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-orange-600">{stats.totalTokens}</div>
								<div className="text-sm text-gray-500">API Token</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-red-600">{stats.expiredMailboxes}</div>
								<div className="text-sm text-gray-500">过期邮箱</div>
							</div>
						</div>
					</div>
				</div>

				{/* 系统维护 */}
				<div className="bg-white shadow rounded-lg mb-8">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">系统维护</h3>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<h4 className="text-sm font-medium text-gray-900">清理过期数据</h4>
									<p className="text-sm text-gray-500">删除过期的邮箱和相关邮件，释放存储空间</p>
								</div>
								<form method="post" className="inline">
									<input type="hidden" name="action" value="cleanupExpired" />
									<button
										type="submit"
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
										onClick={(e) => {
											if (!confirm("确定要清理过期数据吗？此操作不可恢复。")) {
												e.preventDefault();
											}
										}}
									>
										清理过期数据
									</button>
								</form>
							</div>
						</div>
					</div>
				</div>

				{/* 修改密码 */}
				<div className="bg-white shadow rounded-lg mb-8">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">修改密码</h3>
						<form method="post" className="space-y-4">
							<input type="hidden" name="action" value="changePassword" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
										新密码
									</label>
									<input
										type="password"
										id="newPassword"
										name="newPassword"
										required
										minLength={6}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
										确认密码
									</label>
									<input
										type="password"
										id="confirmPassword"
										name="confirmPassword"
										required
										minLength={6}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
							</div>
							<button
								type="submit"
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
							>
								修改密码
							</button>
						</form>
					</div>
				</div>

				{/* 创建管理员 */}
				<div className="bg-white shadow rounded-lg mb-8">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">创建管理员</h3>
						<form method="post" className="space-y-4">
							<input type="hidden" name="action" value="createAdmin" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="username" className="block text-sm font-medium text-gray-700">
										用户名
									</label>
									<input
										type="text"
										id="username"
										name="username"
										required
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label htmlFor="password" className="block text-sm font-medium text-gray-700">
										密码
									</label>
									<input
										type="password"
										id="password"
										name="password"
										required
										minLength={6}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
							</div>
							<button
								type="submit"
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
							>
								创建管理员
							</button>
						</form>
					</div>
				</div>

				{/* 管理员列表 */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">管理员列表</h3>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											用户名
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											创建时间
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											最后登录
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											操作
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{adminList.map((adminItem: any) => (
										<tr key={adminItem.id}>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{adminItem.username}
												{adminItem.id === admin.id && (
													<span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
														当前用户
													</span>
												)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{new Date(adminItem.createdAt).toLocaleString()}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{adminItem.lastLoginAt 
													? new Date(adminItem.lastLoginAt).toLocaleString()
													: "从未登录"
												}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												{adminItem.id !== admin.id && (
													<form method="post" className="inline">
														<input type="hidden" name="action" value="deleteAdmin" />
														<input type="hidden" name="adminId" value={adminItem.id} />
														<button
															type="submit"
															className="text-red-600 hover:text-red-500"
															onClick={(e) => {
																if (!confirm("确定要删除这个管理员账户吗？此操作不可恢复。")) {
																	e.preventDefault();
																}
															}}
														>
															删除
														</button>
													</form>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
