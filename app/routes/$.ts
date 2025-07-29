import { redirect } from "react-router";

export async function loader({ request }: any) {
	const url = new URL(request.url);

	// 如果是admin相关路径，显示404而不是重定向
	if (url.pathname.startsWith('/admin')) {
		throw new Response("Admin page not found", { status: 404 });
	}

	// 如果是API路径，显示404而不是重定向
	if (url.pathname.startsWith('/api')) {
		throw new Response("API endpoint not found", { status: 404 });
	}

	// 其他404页面自动跳转到首页
	return redirect("/");
}
