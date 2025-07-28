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

	// 定义需要隐藏导航栏和底部栏的页面路径（首页实现完全全屏效果）
	const hideNavigationPaths = ['/'];
	const shouldHideNavigation = hideNavigationPaths.includes(location.pathname);
	const shouldHideFooter = hideNavigationPaths.includes(location.pathname);

	return (
		<>
			{!shouldHideNavigation && (
				<Navigation currentPath={location.pathname} user={user} />
			)}
			<Outlet />
			{!shouldHideFooter && (
				<Footer env={env} />
			)}
		</>
	);
}
