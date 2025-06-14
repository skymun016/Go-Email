import { redirect } from "react-router";
import { getAdminSession, destroyAdminSession } from "~/lib/auth";

// 处理退出登录
export async function loader({ request, context }: any) {
	const env = context.cloudflare.env;
	
	// 获取当前session
	const session = await getAdminSession(request.headers.get("Cookie"), env);
	
	// 销毁session
	const headers = new Headers();
	headers.set("Set-Cookie", await destroyAdminSession(session, env));
	headers.set("Location", "/admin-login");
	
	return new Response(null, {
		status: 302,
		headers,
	});
}

// 也支持POST请求
export const action = loader;
