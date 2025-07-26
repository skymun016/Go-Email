import { redirect } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { TokenManager } from "~/lib/token-manager";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { emails, mailboxes, apiTokens, users } from "~/db/schema";
import { count, desc, gte, eq } from "drizzle-orm";

export function meta() {
	return [
		{ title: "管理后台 - GoMail" },
		{ name: "robots", content: "noindex, nofollow" },
	];
}

// 获取仪表板数据
export async function loader({ request, context }: any) {
	try {
		const env = context.cloudflare.env;
		
		// 验证管理员身份
		const admin = await requireAdmin(request, env);
		
		// 获取统计数据
		const db = createDB(getDatabase(env));
		const tokenManager = new TokenManager(getDatabase(env));
		
		// 获取基础统计
		const [
			totalMailboxes,
			totalEmails,
			totalTokens,
			totalUsers,
			activeUsers,
			recentEmails,
		] = await Promise.all([
			// 总邮箱数
			db.select({ count: count() }).from(mailboxes),
			// 总邮件数
			db.select({ count: count() }).from(emails),
			// 总Token数
			db.select({ count: count() }).from(apiTokens),
			// 总用户数
			db.select({ count: count() }).from(users),
			// 活跃用户数
			db.select({ count: count() }).from(users).where(eq(users.isActive, true)),
			// 最近邮件
			db.select({
				id: emails.id,
				fromAddress: emails.fromAddress,
				toAddress: emails.toAddress,
				subject: emails.subject,
				receivedAt: emails.receivedAt,
				size: emails.size,
			})
			.from(emails)
			.orderBy(desc(emails.receivedAt))
			.limit(10),
		]);

		// 获取Token概览
		const tokenOverview = await tokenManager.getTokensOverview();

		// 获取今日统计（最近24小时）
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const [todayEmails, todayMailboxes] = await Promise.all([
			db.select({ count: count() })
				.from(emails)
				.where(gte(emails.receivedAt, yesterday)),
			db.select({ count: count() })
				.from(mailboxes)
				.where(gte(mailboxes.createdAt, yesterday)),
		]);

		return {
			admin: {
				username: admin.username,
				lastLoginAt: admin.lastLoginAt?.toISOString(),
			},
			stats: {
				totalMailboxes: totalMailboxes[0]?.count || 0,
				totalEmails: totalEmails[0]?.count || 0,
				totalTokens: totalTokens[0]?.count || 0,
				totalUsers: totalUsers[0]?.count || 0,
				activeUsers: activeUsers[0]?.count || 0,
				todayEmails: todayEmails[0]?.count || 0,
				todayMailboxes: todayMailboxes[0]?.count || 0,
			},
			tokenOverview,
			recentEmails: recentEmails.map(email => ({
				...email,
				receivedAt: email.receivedAt.toISOString(),
			})),
		};

	} catch (error) {
		console.error("Dashboard error:", error);
		
		// 如果是认证错误，重定向到登录页
		if (error instanceof Response && error.status === 401) {
			return redirect("/admin-login");
		}
		
		throw error;
	}
}

export default function AdminDashboard({ loaderData }: any) {
	const { admin, stats, tokenOverview, recentEmails } = loaderData;

	return (
		<div className="min-h-screen bg-gray-100">
			{/* 顶部导航 */}
			<nav className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex items-center">
							<h1 className="text-xl font-semibold text-gray-900">GoMail 管理后台</h1>
						</div>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-700">欢迎，{admin.username}</span>
							<a
								href="/admin/logout"
								className="text-sm text-red-600 hover:text-red-500"
							>
								退出登录
							</a>
						</div>
					</div>
				</div>
			</nav>

			{/* 主要内容 */}
			<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				{/* 统计卡片 */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
					<div className="bg-white overflow-hidden shadow rounded-lg">
						<div className="p-5">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
										<span className="text-white text-sm font-medium">👥</span>
									</div>
								</div>
								<div className="ml-5 w-0 flex-1">
									<dl>
										<dt className="text-sm font-medium text-gray-500 truncate">总用户数</dt>
										<dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-white overflow-hidden shadow rounded-lg">
						<div className="p-5">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
										<span className="text-white text-sm font-medium">📧</span>
									</div>
								</div>
								<div className="ml-5 w-0 flex-1">
									<dl>
										<dt className="text-sm font-medium text-gray-500 truncate">总邮箱数</dt>
										<dd className="text-lg font-medium text-gray-900">{stats.totalMailboxes}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-white overflow-hidden shadow rounded-lg">
						<div className="p-5">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
										<span className="text-white text-sm font-medium">✉️</span>
									</div>
								</div>
								<div className="ml-5 w-0 flex-1">
									<dl>
										<dt className="text-sm font-medium text-gray-500 truncate">总邮件数</dt>
										<dd className="text-lg font-medium text-gray-900">{stats.totalEmails}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-white overflow-hidden shadow rounded-lg">
						<div className="p-5">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
										<span className="text-white text-sm font-medium">🔑</span>
									</div>
								</div>
								<div className="ml-5 w-0 flex-1">
									<dl>
										<dt className="text-sm font-medium text-gray-500 truncate">API Token</dt>
										<dd className="text-lg font-medium text-gray-900">{stats.totalTokens}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-white overflow-hidden shadow rounded-lg">
						<div className="p-5">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
										<span className="text-white text-sm font-medium">📈</span>
									</div>
								</div>
								<div className="ml-5 w-0 flex-1">
									<dl>
										<dt className="text-sm font-medium text-gray-500 truncate">今日邮件</dt>
										<dd className="text-lg font-medium text-gray-900">{stats.todayEmails}</dd>
									</dl>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* 快捷操作 */}
				<div className="bg-white shadow rounded-lg mb-8">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">快捷操作</h3>
						<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
							<a
								href="/admin/users"
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
							>
								用户管理
							</a>
							<a
								href="/admin/mailboxes"
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
							>
								邮箱管理
							</a>
							<a
								href="/admin/tokens"
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
							>
								管理 API Token
							</a>
							<a
								href="/admin/emails"
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
							>
								邮件管理
							</a>
							<a
								href="/admin/settings"
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
							>
								系统设置
							</a>
						</div>
					</div>
				</div>

				{/* Token 状态概览 */}
				<div className="bg-white shadow rounded-lg mb-8">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Token 状态概览</h3>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">{tokenOverview.active}</div>
								<div className="text-sm text-gray-500">活跃</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-red-600">{tokenOverview.expired}</div>
								<div className="text-sm text-gray-500">已过期</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-orange-600">{tokenOverview.exhausted}</div>
								<div className="text-sm text-gray-500">已用完</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-gray-600">{tokenOverview.total}</div>
								<div className="text-sm text-gray-500">总计</div>
							</div>
						</div>
					</div>
				</div>

				{/* 最近邮件 */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">最近邮件</h3>
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
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{recentEmails.map((email: any) => (
										<tr key={email.id}>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{email.fromAddress}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{email.toAddress}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{email.subject || "(无主题)"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{new Date(email.receivedAt).toLocaleString()}
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
