import { Outlet, useLocation, useLoaderData } from "react-router";
import type { Route } from "./+types/layout";
import { Navigation } from "~/components/Navigation";
import { Footer } from "~/components/Footer";
import { getOptionalUser } from "~/lib/auth";
import { sanitizeUser } from "~/lib/user-auth";

export async function loader({ request, context }: Route.LoaderArgs) {
	// 获取 Cloudflare 环境变量
	const env = context?.cloudflare?.env;

	// 检查用户登录状态（可选，不强制登录）
	let user = null;
	if (env) {
		try {
			const fullUser = await getOptionalUser(request, env);
			user = fullUser ? sanitizeUser(fullUser) : null;
		} catch (error) {
			// 忽略用户检查错误
			console.log("用户状态检查失败:", error);
		}
	}

	return { env, user };
}

export default function Layout({ loaderData }: Route.ComponentProps) {
	const location = useLocation();
	const { env, user } = loaderData;

	return (
		<>
			<Navigation currentPath={location.pathname} user={user} />
			<Outlet />
			<Footer env={env} />
		</>
	);
}
