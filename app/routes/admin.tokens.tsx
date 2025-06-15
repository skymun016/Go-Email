import { redirect } from "react-router";
import { requireAdmin } from "~/lib/auth";
import { TokenManager } from "~/lib/token-manager";
import { getDatabase } from "~/config/app";
import { formatTokenForDisplay } from "~/lib/token-manager";

// 定义action返回类型
type ActionResult =
	| { error: string }
	| { success: string; newToken?: any };

export function meta() {
	return [
		{ title: "Token 管理 - GoMail 管理后台" },
		{ name: "robots", content: "noindex, nofollow" },
	];
}

// 获取Token列表
export async function loader({ request, context }: any) {
	try {
		const env = context.cloudflare.env;

		// 验证管理员身份
		const admin = await requireAdmin(request, env);

		// 获取所有Token
		const tokenManager = new TokenManager(getDatabase(env));
		const tokens = await tokenManager.getAllTokens();

		return {
			admin: { username: admin.username },
			tokens: tokens.map(token => ({
				...token,
				createdAt: token.createdAt.toISOString(),
				lastUsedAt: token.lastUsedAt?.toISOString() || null,
				expiresAt: token.expiresAt?.toISOString() || null,
				displayToken: formatTokenForDisplay(token.token),
			})),
		};

	} catch (error) {
		console.error("Tokens page error:", error);

		// 如果是认证错误，重定向到登录页
		if (error instanceof Response && error.status === 401) {
			return redirect("/admin-login");
		}

		throw error;
	}
}

// 处理Token操作
export async function action({ request, context }: any): Promise<ActionResult> {
	try {
		const env = context.cloudflare.env;

		// 验证管理员身份
		await requireAdmin(request, env);

		const formData = await request.formData();
		const action = formData.get("action")?.toString();
		const tokenId = formData.get("tokenId")?.toString();

		const tokenManager = new TokenManager(getDatabase(env));

		switch (action) {
			case "create":
				const name = formData.get("name")?.toString();
				const usageLimit = parseInt(formData.get("usageLimit")?.toString() || "0");
				const expiresInDays = parseInt(formData.get("expiresInDays")?.toString() || "0");

				if (!name) {
					return { error: "Token名称不能为空" };
				}

				const expiresAt = expiresInDays > 0
					? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
					: null;

				const newToken = await tokenManager.generateToken({
					name,
					usageLimit: usageLimit > 0 ? usageLimit : undefined,
					expiresAt,
				});

				return {
					success: "Token创建成功",
					newToken: {
						...newToken,
						createdAt: newToken.createdAt.toISOString(),
						expiresAt: newToken.expiresAt?.toISOString() || null,
					}
				};

			case "toggle":
				if (!tokenId) {
					return { error: "Token ID不能为空" };
				}

				const tokens = await tokenManager.getAllTokens();
				const token = tokens.find(t => t.id === tokenId);

				if (!token) {
					return { error: "Token不存在" };
				}

				await tokenManager.updateToken(tokenId, { isActive: !token.isActive });
				return { success: `Token已${token.isActive ? "禁用" : "启用"}` };

			case "delete":
				if (!tokenId) {
					return { error: "Token ID不能为空" };
				}

				await tokenManager.deleteToken(tokenId);
				return { success: "Token已删除" };

			case "reset":
				if (!tokenId) {
					return { error: "Token ID不能为空" };
				}

				await tokenManager.resetTokenUsage(tokenId);
				return { success: "Token使用次数已重置" };

			default:
				return { error: "未知操作" };
		}

	} catch (error) {
		console.error("Token action error:", error);
		return { error: "操作失败，请稍后重试" };
	}
}

export default function AdminTokens({ loaderData, actionData }: any) {
	const { admin, tokens } = loaderData;

	// 类型安全的actionData访问
	const hasError = actionData && 'error' in actionData;
	const hasSuccess = actionData && 'success' in actionData;
	const hasNewToken = actionData && 'newToken' in actionData;

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
							<h1 className="text-xl font-semibold text-gray-900">Token 管理</h1>
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
				{hasError && (
					<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
						{(actionData as { error: string }).error}
					</div>
				)}
				{hasSuccess && (
					<div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
						{(actionData as { success: string }).success}
					</div>
				)}
				{hasNewToken && (
					<div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
						<p className="font-medium">新Token已创建：</p>
						<p className="font-mono text-sm mt-1 break-all">{(actionData as { newToken: any }).newToken.token}</p>
						<p className="text-sm mt-1 text-blue-600">请妥善保存此Token，它不会再次显示</p>
					</div>
				)}

				{/* 创建Token表单 */}
				<div className="bg-white shadow rounded-lg mb-8">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">创建新Token</h3>
						<form method="post" className="space-y-4">
							<input type="hidden" name="action" value="create" />
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label htmlFor="name" className="block text-sm font-medium text-gray-700">
										Token名称
									</label>
									<input
										type="text"
										id="name"
										name="name"
										required
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder="例如：API客户端1"
									/>
								</div>
								<div>
									<label htmlFor="usageLimit" className="block text-sm font-medium text-gray-700">
										使用次数限制
									</label>
									<input
										type="number"
										id="usageLimit"
										name="usageLimit"
										min="0"
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder="0 = 无限制"
									/>
								</div>
								<div>
									<label htmlFor="expiresInDays" className="block text-sm font-medium text-gray-700">
										有效期（天）
									</label>
									<input
										type="number"
										id="expiresInDays"
										name="expiresInDays"
										min="0"
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder="0 = 永不过期"
									/>
								</div>
							</div>
							<button
								type="submit"
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
							>
								创建Token
							</button>
						</form>
					</div>
				</div>

				{/* Token列表 */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Token 列表</h3>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											名称
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Token
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											使用情况
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											状态
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											创建时间
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											操作
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{tokens.map((token: any) => (
										<tr key={token.id}>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{token.name}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
												{token.displayToken}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{token.usageCount} / {token.usageLimit || "∞"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
													token.isActive
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}>
													{token.isActive ? "活跃" : "禁用"}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{new Date(token.createdAt).toLocaleString()}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
												<form method="post" className="inline">
													<input type="hidden" name="action" value="toggle" />
													<input type="hidden" name="tokenId" value={token.id} />
													<button
														type="submit"
														className={`text-sm ${
															token.isActive
																? "text-red-600 hover:text-red-500"
																: "text-green-600 hover:text-green-500"
														}`}
													>
														{token.isActive ? "禁用" : "启用"}
													</button>
												</form>
												<form method="post" className="inline">
													<input type="hidden" name="action" value="reset" />
													<input type="hidden" name="tokenId" value={token.id} />
													<button
														type="submit"
														className="text-blue-600 hover:text-blue-500"
													>
														重置
													</button>
												</form>
												<form method="post" className="inline">
													<input type="hidden" name="action" value="delete" />
													<input type="hidden" name="tokenId" value={token.id} />
													<button
														type="submit"
														className="text-red-600 hover:text-red-500"
														onClick={(e) => {
															if (!confirm("确定要删除这个Token吗？此操作不可恢复。")) {
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
					</div>
				</div>
			</div>
		</div>
	);
}
