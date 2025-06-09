import type { LoaderFunctionArgs } from "react-router";
import { APP_CONFIG } from "~/config/app";

export function loader(_: LoaderFunctionArgs) {
	const manifest = {
		name: `${APP_CONFIG.project.displayName} - ${APP_CONFIG.ui.tagline}`,
		short_name: APP_CONFIG.project.displayName,
		description: APP_CONFIG.project.description,
		start_url: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: APP_CONFIG.ui.primaryColor,
		orientation: "portrait-primary",
		scope: "/",
		lang: "zh-CN",
		categories: ["productivity", "utilities"],
		icons: [
			{
				src: "/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icon-192-maskable.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icon-512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
		shortcuts: [
			{
				name: "获取新邮箱",
				short_name: "新邮箱",
				description: "快速获取一个新的临时邮箱地址",
				url: "/?action=new",
				icons: [
					{
						src: "/icon-192.png",
						sizes: "192x192",
						type: "image/png",
					},
				],
			},
		],
	};

	return new Response(JSON.stringify(manifest), {
		status: 200,
		headers: {
			"Content-Type": "application/manifest+json",
			"Cache-Control": "public, max-age=86400", // 缓存24小时
		},
	});
}
