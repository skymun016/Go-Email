import { Outlet, useLocation, useLoaderData } from "react-router";
import type { Route } from "./+types/layout";
import { Navigation } from "~/components/Navigation";
import { Footer } from "~/components/Footer";

export async function loader({ context }: Route.LoaderArgs) {
	// 获取 Cloudflare 环境变量
	const env = context?.cloudflare?.env;
	return { env };
}

export default function Layout({ loaderData }: Route.ComponentProps) {
	const location = useLocation();

	return (
		<>
			<Navigation currentPath={location.pathname} />
			<Outlet />
			<Footer env={loaderData.env} />
		</>
	);
}
