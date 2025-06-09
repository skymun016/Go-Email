import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	isRouteErrorResponse,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { APP_CONFIG } from "~/config/app";
import { AdSenseScript } from "~/components/AdSense";

// 全局默认 meta 配置
export function meta() {
	return [
		{
			title: APP_CONFIG.seo.title,
		},
		{
			name: "description",
			content: APP_CONFIG.seo.description,
		},
		{
			name: "keywords",
			content: APP_CONFIG.seo.keywords,
		},
		{ name: "author", content: `${APP_CONFIG.project.displayName} Team` },
		{ name: "robots", content: "index, follow" },
		{ name: "googlebot", content: "index, follow" },

		// Open Graph 标签
		{ property: "og:type", content: "website" },
		{
			property: "og:title",
			content: APP_CONFIG.seo.title,
		},
		{
			property: "og:description",
			content: APP_CONFIG.seo.description,
		},
		{ property: "og:site_name", content: APP_CONFIG.project.displayName },
		{ property: "og:locale", content: "zh_CN" },

		// Twitter Card
		{ name: "twitter:card", content: APP_CONFIG.seo.twitterCard },
		{
			name: "twitter:title",
			content: APP_CONFIG.seo.title,
		},
		{
			name: "twitter:description",
			content: APP_CONFIG.seo.description,
		},

		// 移动端优化
		{ name: "format-detection", content: "telephone=no" },
		{ name: "mobile-web-app-capable", content: "yes" },
		{ name: "apple-mobile-web-app-capable", content: "yes" },
		{ name: "apple-mobile-web-app-status-bar-style", content: "default" },
		{ name: "apple-mobile-web-app-title", content: APP_CONFIG.project.displayName },
	];
}

export const links: Route.LinksFunction = () => [
	// 字体预加载优化
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "preload",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
		as: "style",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},

	// Favicon and App Icons
	{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
	{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
	{
		rel: "icon",
		type: "image/png",
		sizes: "32x32",
		href: "/favicon-32.png",
	},
	{
		rel: "icon",
		type: "image/png",
		sizes: "16x16",
		href: "/favicon-16.png",
	},
	{ rel: "apple-touch-icon", sizes: "192x192", href: "/icon-192.png" },
	{ rel: "manifest", href: "/site.webmanifest" },

	// SEO 相关
	{ rel: "canonical", href: "https://smail.pw" },
	{ rel: "alternate", hrefLang: "zh-CN", href: "https://smail.pw" },
];

export function Layout({ children }: { children: React.ReactNode }) {
	// 获取百度统计配置
	const baiduAnalyticsId = APP_CONFIG.analytics.enabled ? APP_CONFIG.analytics.baiduId : null;
	// 结构化数据 JSON
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: APP_CONFIG.project.displayName,
		description: APP_CONFIG.project.description,
		url: `https://${APP_CONFIG.domain.website}`,
		applicationCategory: "UtilityApplication",
		operatingSystem: "Any",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		author: {
			"@type": "Organization",
			name: `${APP_CONFIG.project.displayName} Team`,
		},
		keywords: APP_CONFIG.seo.keywords,
		applicationSubCategory: "Email Service",
		featureList: [
			"免费使用",
			"无需注册",
			"隐私保护",
			"24小时有效期",
			"支持附件",
			"实时接收邮件",
		],
	};

	return (
		<html lang="zh-CN">
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, viewport-fit=cover"
				/>
				<Meta />
				<Links />

				{/* JSON-LD 结构化数据 */}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(structuredData),
					}}
				/>

				{/* Google AdSense */}
				<AdSenseScript />

				{/* 百度统计 */}
				{baiduAnalyticsId && (
					<script
						dangerouslySetInnerHTML={{
							__html: `
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?${baiduAnalyticsId}";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
							`,
						}}
					/>
				)}

				{/* 统计脚本 */}
				<script
					defer
					src="https://u.pexni.com/script.js"
					data-website-id="09979220-99e5-4973-b1b2-5e46163fe2d2"
				/>
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
