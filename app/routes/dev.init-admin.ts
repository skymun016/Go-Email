import { createDB, createAdmin, checkAdminExists } from "~/lib/db";
import { getDatabase } from "~/config/app";

// 初始化管理员账户（仅开发环境使用）
export async function loader({ request, context }: any) {
	try {
		const env = context.cloudflare.env;
		const url = new URL(request.url);
		
		// 获取参数
		const username = url.searchParams.get("username") || "admin";
		const password = url.searchParams.get("password") || "admin123";
		
		const db = createDB(getDatabase(env));
		
		// 检查管理员是否已存在
		const adminExists = await checkAdminExists(db, username);
		
		if (adminExists) {
			return new Response(
				JSON.stringify({
					success: false,
					message: `管理员账户 '${username}' 已存在`,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
		
		// 创建管理员账户
		const admin = await createAdmin(db, username, password);
		
		return new Response(
			JSON.stringify({
				success: true,
				message: "管理员账户创建成功",
				data: {
					id: admin.id,
					username: admin.username,
					createdAt: admin.createdAt.toISOString(),
				},
				credentials: {
					username,
					password,
					loginUrl: "/admin-login",
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
		
	} catch (error) {
		console.error("Init admin error:", error);
		
		return new Response(
			JSON.stringify({
				success: false,
				message: "创建管理员账户失败",
				error: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
