import { redirect } from "react-router";
import { verifyPassword } from "~/lib/auth";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { admins } from "~/db/schema";
import { eq } from "drizzle-orm";
import { getAdminSession, commitAdminSession } from "~/lib/auth";

export function meta() {
	return [
		{ title: "管理员登录 - GoMail 后台管理" },
		{ name: "description", content: "GoMail 临时邮箱服务管理员登录页面" },
		{ name: "robots", content: "noindex, nofollow" },
	];
}

// 检查是否已登录
export async function loader({ request, context }: any) {
	try {
		const env = context.cloudflare.env;
		const session = await getAdminSession(request.headers.get("Cookie"), env);
		const adminId = session.get("adminId");

		if (adminId) {
			// 已登录，重定向到管理后台
			return redirect("/admin/dashboard");
		}

		return null;
	} catch {
		return null;
	}
}

// 处理登录
export async function action({ request, context }: any) {
	try {
		const env = context.cloudflare.env;
		const formData = await request.formData();
		const username = formData.get("username")?.toString();
		const password = formData.get("password")?.toString();

		if (!username || !password) {
			return { error: "用户名和密码不能为空" };
		}

		// 查找管理员
		const db = createDB(getDatabase(env));
		const adminResult = await db
			.select()
			.from(admins)
			.where(eq(admins.username, username))
			.limit(1);

		if (adminResult.length === 0) {
			return { error: "用户名或密码错误" };
		}

		const admin = adminResult[0];

		// 验证密码
		const isValidPassword = await verifyPassword(password, admin.passwordHash);
		if (!isValidPassword) {
			return { error: "用户名或密码错误" };
		}

		// 更新最后登录时间
		await db
			.update(admins)
			.set({ lastLoginAt: new Date() })
			.where(eq(admins.id, admin.id));

		// 创建session
		const session = await getAdminSession(request.headers.get("Cookie"), env);
		session.set("adminId", admin.id);
		session.set("username", admin.username);

		// 提交session并重定向到仪表板
		return redirect("/admin/dashboard", {
			headers: {
				"Set-Cookie": await commitAdminSession(session, env),
			},
		});

	} catch (error) {
		console.error("Login error:", error);
		return { error: "登录失败，请稍后重试" };
	}
}

export default function AdminLogin({ actionData }: any) {
	return (
		<div className="min-h-screen bg-gray-100 flex items-center justify-center">
			<div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
				<h1 className="text-2xl font-bold text-center mb-6">管理员登录</h1>

				{actionData?.error && (
					<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
						{actionData.error}
					</div>
				)}

				<form method="post" className="space-y-4">
					<div>
						<label htmlFor="username" className="block text-sm font-medium text-gray-700">
							用户名
						</label>
						<input
							id="username"
							name="username"
							type="text"
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							placeholder="请输入用户名"
						/>
					</div>
					<div>
						<label htmlFor="password" className="block text-sm font-medium text-gray-700">
							密码
						</label>
						<input
							id="password"
							name="password"
							type="password"
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							placeholder="请输入密码"
						/>
					</div>
					<button
						type="submit"
						className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						登录
					</button>
				</form>
				<div className="mt-4 text-center">
					<a href="/" className="text-sm text-blue-600 hover:text-blue-500">
						← 返回主站
					</a>
				</div>
			</div>
		</div>
	);
}
