import { redirect } from "react-router";

export async function loader() {
	// 重定向到React版本的登录页面
	return redirect("/admin-login");
}

export async function action() {
	return new Response('功能开发中', { status: 501 });
}

// 添加默认导出（虽然不会被使用，因为loader返回Response）
export default function AdminPage() {
	return null;
}
