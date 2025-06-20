import { Loader2Icon, Mail, RefreshCcwIcon, Shield } from "lucide-react";
import React from "react";
import {
	Link,
	data,
	redirect,
	useNavigation,
	useRevalidator,
	useFetcher,
} from "react-router";

import { commitSession, getSession } from "~/.server/session";
import { CopyButton } from "~/components/copy-button";
import { EmailDisplay } from "~/components/EmailDisplay";
import { MailItem } from "~/components/mail-item";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
	createDB,
	getEmailsByAddress,
	getMailboxStats,
	getOrCreateMailbox,
} from "~/lib/db";
import { APP_CONFIG, getDatabase } from "~/config/app";
import { generateRandomEmail, generateEmailWithDomain, getSupportedDomains } from "~/lib/email-generator";
import { DomainSelector } from "~/components/DomainSelector";
import { FloatingAds } from "~/components/FloatingAds";


import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{
			title:
				"GoMail - 免费临时邮箱生成器 | 一次性邮箱地址生成 | 24小时有效保护隐私",
		},
		{
			name: "description",
			content:
				"GoMail提供最专业的免费临时邮箱服务，无需注册即可获得一次性邮件地址。24小时有效期，支持附件下载，完全匿名保护隐私。告别垃圾邮件，立即免费使用临时邮箱！",
		},
		{
			name: "keywords",
			content:
				"GoMail,临时邮箱,一次性邮箱,临时邮件,临时email,免费邮箱,隐私保护,垃圾邮件防护,临时邮箱网站,免费临时邮箱,临时邮箱服务,24小时邮箱,无需注册邮箱",
		},

		// Open Graph 优化
		{
			property: "og:title",
			content: "GoMail - 免费临时邮箱生成器 | 一次性邮件地址",
		},
		{
			property: "og:description",
			content:
				"保护隐私的免费临时邮箱，无需注册，即时使用，24小时有效，支持附件下载。",
		},
		{ property: "og:type", content: "website" },
		{ property: "og:url", content: "https://smail.pw" },
		{ property: "og:site_name", content: "GoMail" },
		{ property: "og:locale", content: "zh_CN" },

		// Twitter Card
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: "GoMail - 免费临时邮箱生成器" },
		{
			name: "twitter:description",
			content: "保护隐私的免费临时邮箱，无需注册，即时使用。",
		},

		// 额外的SEO优化
		{
			name: "robots",
			content:
				"index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
		},
		{ name: "googlebot", content: "index, follow" },
		{ name: "bingbot", content: "index, follow" },
		{ name: "format-detection", content: "telephone=no" },
		{ name: "theme-color", content: "#2563eb" },

		// 结构化数据
		{ name: "application-name", content: "GoMail" },
		{ name: "apple-mobile-web-app-title", content: "GoMail" },
		{ name: "msapplication-TileColor", content: "#2563eb" },
	];
}



export async function loader({ request, context }: Route.LoaderArgs) {
	// 检查是否在 Cloudflare 环境中
	const env = context?.cloudflare?.env;

	// 如果没有 Cloudflare 环境（开发环境），返回固定的模拟数据
	if (!env) {
		// 使用固定的邮箱地址避免水合失败
		const email = `demo-user-1234@${APP_CONFIG.cloudflare.email.domain}`;
		return {
			email,
			mails: [],
			stats: { total: 0, unread: 0 },
			supportedDomains: getSupportedDomains(),
		};
	}

	try {
		const session = await getSession(request.headers.get("Cookie"), env);
		let email = session.get("email");

		if (!email) {
			email = generateRandomEmail();
			session.set("email", email);
			return data(
				{
					email,
					mails: [],
					stats: { total: 0, unread: 0 },
					supportedDomains: getSupportedDomains(),
				},
				{
					headers: {
						"Set-Cookie": await commitSession(session, env),
					},
				},
			);
		}

		// 创建数据库连接
		const db = createDB(getDatabase(env));

		// 获取或创建邮箱
		const mailbox = await getOrCreateMailbox(db, email);

		// 获取邮件列表
		const emails = await getEmailsByAddress(db, email);

		// 获取统计信息
		const stats = await getMailboxStats(db, mailbox.id);

		// 转换邮件数据格式以适配前端组件
		const mails = emails.map((emailRecord) => ({
			id: emailRecord.id,
			name: emailRecord.fromAddress.split("@")[0] || emailRecord.fromAddress,
			email: emailRecord.fromAddress,
			subject: emailRecord.subject || "(无主题)",
			date: emailRecord.receivedAt.toISOString().split("T")[0], // 格式化日期
			isRead: emailRecord.isRead,
		}));

		return { email, mails, stats, supportedDomains: getSupportedDomains() };
	} catch (error) {
		console.error("Error loading emails:", error);
		// 出错时也要保持session中的邮箱地址
		const session = await getSession(request.headers.get("Cookie"), env);
		let email = session.get("email");

		if (!email) {
			email = generateRandomEmail();
			session.set("email", email);
			return data(
				{
					email,
					mails: [],
					stats: { total: 0, unread: 0 },
					supportedDomains: getSupportedDomains(),
				},
				{
					headers: {
						"Set-Cookie": await commitSession(session, env),
					},
				},
			);
		}

		return {
			email,
			mails: [],
			stats: { total: 0, unread: 0 },
			supportedDomains: getSupportedDomains(),
		};
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	const formData = await request.formData();
	const action = formData.get("action");

	if (action === "delete" || action === "generate") {
		// 检查是否在 Cloudflare 环境中
		const env = context?.cloudflare?.env;

		if (env) {
			try {
				const session = await getSession(request.headers.get("Cookie"), env);

				// 获取域名选择参数
				const strategy = formData.get("strategy") as string;
				const domain = formData.get("domain") as string;

				let newEmail: string;
				if (action === "generate" && strategy) {
					// 来自域名选择器的生成请求，使用指定的策略
					if (strategy === "manual" && domain) {
						// 手动选择：使用指定域名生成邮箱
						newEmail = generateEmailWithDomain(domain);
					} else {
						// 智能选择或随机选择：使用策略生成邮箱
						newEmail = generateRandomEmail(strategy);
					}
				} else {
					// 来自"生成新邮箱"按钮的请求，使用默认策略
					newEmail = generateRandomEmail();
				}

				session.set("email", newEmail);
				await commitSession(session, env);
			} catch (error) {
				console.error("Error updating session:", error);
				// 即使 session 更新失败，也继续重定向
			}
		}

		return redirect("/");
	}

	return null;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const revalidator = useRevalidator();
	const fetcher = useFetcher();

	// 跟踪当前域名选择状态
	const [currentDomainState, setCurrentDomainState] = React.useState({
		strategy: APP_CONFIG.domain.strategy as string,
		domain: loaderData.email.split('@')[1]
	});

	const isDeleting =
		fetcher.state === "submitting" && fetcher.formData?.get("action") === "delete";

	// 处理域名选择状态变化
	const handleDomainStateChange = (strategy: string, domain: string) => {
		setCurrentDomainState({ strategy, domain });
	};

	// 生成新邮箱的处理函数 - 使用当前的域名选择状态
	const handleGenerateNewEmail = () => {
		const formData = new FormData();
		formData.append("action", "generate");
		formData.append("strategy", currentDomainState.strategy);

		if (currentDomainState.strategy === "manual") {
			formData.append("domain", currentDomainState.domain);
		}

		fetcher.submit(formData, { method: "post" });
	};

	// 手动刷新邮件列表
	const handleRefreshEmails = () => {
		revalidator.revalidate();
	};

	// 自动刷新逻辑 - 每10秒自动重新验证数据
	React.useEffect(() => {
		// 确保在客户端环境中运行
		if (typeof window === 'undefined') return;

		const interval = setInterval(() => {
			// 只有在页面可见且没有正在进行其他操作时才自动刷新
			if (
				document.visibilityState === "visible" &&
				navigation.state === "idle" &&
				revalidator.state === "idle"
			) {
				revalidator.revalidate();
			}
		}, 10000); // 10秒

		// 页面重新获得焦点时也刷新一次
		const handleFocus = () => {
			if (navigation.state === "idle" && revalidator.state === "idle") {
				revalidator.revalidate();
			}
		};

		window.addEventListener("focus", handleFocus);

		return () => {
			clearInterval(interval);
			window.removeEventListener("focus", handleFocus);
		};
	}, [navigation.state, revalidator]);

	// 判断是否正在自动刷新
	const isAutoRefreshing =
		revalidator.state === "loading" && navigation.state === "idle";

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
			<main className="container mx-auto px-4 py-8">
				<div className="max-w-6xl mx-auto">
					{/* Hero Section - 紧凑长文形式 */}
					<div className="mb-12">
						<div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 rounded-xl p-6 border border-blue-200 shadow-lg">
							<div className="flex flex-col md:flex-row items-center gap-6">
								{/* 左侧图标和标题 */}
								<div className="flex-shrink-0">
									<div className="bg-gradient-to-r from-blue-600 to-cyan-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg">
										<span className="text-white text-3xl">📧</span>
									</div>
								</div>

								{/* 中间内容 */}
								<div className="flex-1 text-center md:text-left">
									<div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 mb-3">
										<span className="text-blue-700 text-sm font-medium">🚀 新一代隐私保护工具</span>
									</div>
									<h1 className="text-2xl md:text-3xl font-bold mb-2">
										<span className="text-gray-800">守护隐私的 </span>
										<span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">GoMail 临时邮箱</span>
									</h1>
									<p className="text-gray-600 leading-relaxed mb-3">
										告别垃圾邮件困扰，拥抱纯净数字生活 -
										<span className="text-blue-600 font-semibold">零注册 · 即时用 · 24小时守护 · 永久免费</span>
									</p>
								</div>

								{/* 右侧统计信息 */}
								<div className="flex-shrink-0 flex flex-col gap-2 text-sm">
									<div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
										<span className="w-2 h-2 bg-green-500 rounded-full"></span>
										<span className="text-gray-600">已保护 100,000+ 用户隐私</span>
									</div>
									<div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
										<span className="w-2 h-2 bg-blue-500 rounded-full"></span>
										<span className="text-gray-600">99.9% 服务可用性</span>
									</div>
								</div>
							</div>
						</div>
					</div>



					<div className="grid lg:grid-cols-3 gap-8">
						{/* 左侧：邮箱地址 */}
						<div className="space-y-6">
							{/* 邮箱地址卡片 */}
							<Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50 h-full">
								<CardHeader className="pb-4">
									<CardTitle className="flex items-center space-x-3 text-xl">
										<div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-2.5 shadow-lg">
											<Mail className="h-5 w-5 text-white" />
										</div>
										<span className="text-gray-800 font-bold">🎯 您的专属临时邮箱</span>
									</CardTitle>
									<div className="flex flex-wrap items-center gap-2 text-sm mt-3">
										<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-green-200 text-green-800 shadow-sm">
											✨ 24小时黄金时效
										</span>
										<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 shadow-sm">
											⚡ 智能自动刷新
										</span>
										<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 shadow-sm">
											💎 永久免费使用
										</span>
									</div>
								</CardHeader>
								<CardContent>
									{/* 邮箱地址显示区域 */}
									<div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-blue-100 mb-6 shadow-inner">
										<div className="text-center">
											<p className="text-sm text-blue-600 mb-3 font-semibold flex items-center justify-center gap-2">
												<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
												您的专属临时邮箱地址
											</p>
											<div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
												<EmailDisplay
													email={loaderData.email}
													className="font-mono text-lg sm:text-xl font-bold text-gray-900 tracking-wide select-all break-all block"
												/>
											</div>
										</div>
									</div>

									{/* Action Buttons */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
										<CopyButton
											text={loaderData.email}
											size="default"
											variant="default"
											className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
										/>
										<Button
											variant="outline"
											size="default"
											onClick={handleGenerateNewEmail}
											disabled={isDeleting}
											className="w-full h-10 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
										>
											{isDeleting ? (
												<>
													<Loader2Icon className="w-4 h-4 animate-spin mr-2" />
													生成中...
												</>
											) : (
												<>🔄 生成新邮箱</>
											)}
										</Button>
									</div>

									{/* Tips */}
									<div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200 shadow-sm">
										<div className="flex items-start gap-4">
											<div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 shadow-lg">
												<span className="text-white text-lg">💡</span>
											</div>
											<div className="text-sm">
												<p className="font-bold text-blue-800 mb-2 text-base">
													🎯 智能使用指南
												</p>
												<p className="text-blue-700 leading-relaxed">
													发送邮件到此地址即可在右侧收件箱实时查看，邮箱拥有24小时黄金有效期。
													<br />
													<span className="font-semibold text-cyan-700">收件箱每10秒智能刷新，确保您不错过任何重要邮件。</span>
												</p>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* 中间：域名选择器 */}
						<div className="space-y-6">
							<DomainSelector
								domains={loaderData.supportedDomains || getSupportedDomains()}
								currentDomain={loaderData.email.split('@')[1]}
								strategy={APP_CONFIG.domain.strategy}
								onStateChange={handleDomainStateChange}
							/>
						</div>

						{/* 右侧：收件箱 */}
						<div>
							<Card className="h-full border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
								<CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="bg-white/20 rounded-full p-2">
												<span className="text-xl">📬</span>
											</div>
											<div>
												<CardTitle className="flex items-center space-x-2 text-white">
													<span className="text-xl font-bold">智能收件箱</span>
												</CardTitle>
												<div className="flex items-center gap-3 mt-1">
													<span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">
														🔥 {loaderData.stats.unread} 未读
													</span>
													<span className="text-blue-100 text-sm">
														📊 共 {loaderData.stats.total} 封邮件
													</span>
												</div>
											</div>
										</div>
										<Button
											variant="secondary"
											size="sm"
											onClick={handleRefreshEmails}
											disabled={isAutoRefreshing}
											className="bg-white/20 hover:bg-white/30 text-white border-white/30 transition-all"
										>
											{isAutoRefreshing ? (
												<>
													<Loader2Icon className="w-4 h-4 animate-spin mr-2" />
													刷新中...
												</>
											) : (
												<>
													<RefreshCcwIcon className="w-4 h-4 mr-2" />
													🔄 刷新
												</>
											)}
										</Button>
									</div>
									{isAutoRefreshing && (
										<div className="text-sm text-blue-100 flex items-center gap-2 mt-2 bg-white/10 rounded-lg px-3 py-2">
											<Loader2Icon className="w-4 h-4 animate-spin" />
											<span>⚡ 智能自动刷新中...</span>
										</div>
									)}
								</CardHeader>
								<CardContent className="p-0">
									<ScrollArea className="h-96">
										{loaderData.mails.length > 0 ? (
											<div className="divide-y divide-gray-100">
												{loaderData.mails.map((mail) => (
													<MailItem key={mail.id} {...mail} />
												))}
											</div>
										) : (
											<div className="flex flex-col items-center justify-center py-16 text-gray-500 px-6">
												<div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-lg">
													<span className="text-4xl">📭</span>
												</div>
												<h3 className="text-xl font-bold mb-3 text-center text-gray-800">
													🌟 收件箱空空如也
												</h3>
												<p className="text-base text-center text-gray-600 mb-4 leading-relaxed">
													您的专属邮箱正在待命中
													<br />
													<span className="font-semibold text-blue-600">准备接收您的第一封邮件！</span>
												</p>
												<div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 max-w-sm">
													<p className="text-sm text-center text-blue-700 font-medium">
														💌 测试邮箱地址
													</p>
													<div className="text-xs text-center text-gray-600 mt-1 font-mono break-all bg-white rounded px-2 py-1">
														<EmailDisplay
															email={loaderData.email}
															className="text-xs"
														/>
													</div>
												</div>
											</div>
										)}
									</ScrollArea>
								</CardContent>
							</Card>
						</div>
					</div>



					{/* 为什么选择 GoMail Section */}
					<div className="mt-20">
						<div className="text-center mb-12">
							<h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
								🌟 为什么选择 GoMail？
							</h3>
							<p className="text-xl text-gray-600 max-w-2xl mx-auto">
								三大核心优势，让您的隐私保护之旅更加安心
							</p>
						</div>

						{/* 长文形式的特性介绍 */}
						<div className="max-w-4xl mx-auto space-y-8">
							{/* 极致隐私保护 */}
							<div className="flex items-start gap-6 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 hover:shadow-lg transition-all">
								<div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
									<span className="text-white text-2xl">🛡️</span>
								</div>
								<div>
									<h4 className="text-xl font-bold mb-3 text-gray-800">极致隐私保护</h4>
									<p className="text-gray-600 leading-relaxed">
										采用军用级加密技术，实施零日志记录策略，确保您的真实邮箱地址永远安全无忧。我们深知隐私的重要性，因此从技术架构到运营策略，每一个环节都以保护用户隐私为最高准则。
									</p>
								</div>
							</div>

							{/* 闪电般创建 */}
							<div className="flex items-start gap-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:shadow-lg transition-all">
								<div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
									<span className="text-white text-2xl">⚡</span>
								</div>
								<div>
									<h4 className="text-xl font-bold mb-3 text-gray-800">闪电般创建</h4>
									<p className="text-gray-600 leading-relaxed">
										告别繁琐的注册流程，无需填写个人信息，一键即可获得专属临时邮箱。我们的智能系统能在毫秒级时间内为您生成可用的邮箱地址，让效率成为您的超能力，让等待成为过去式。
									</p>
								</div>
							</div>

							{/* 永久免费承诺 */}
							<div className="flex items-start gap-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:shadow-lg transition-all">
								<div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
									<span className="text-white text-2xl">💎</span>
								</div>
								<div>
									<h4 className="text-xl font-bold mb-3 text-gray-800">永久免费承诺</h4>
									<p className="text-gray-600 leading-relaxed">
										无套路无广告，提供纯净的使用体验。我们坚信优质的服务不应该以牺牲用户体验为代价，因此承诺永久免费提供核心功能，用实际行动诠释什么是真正的免费服务。
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* 生态系统 Section */}
					<div className="mt-20">
						<div className="text-center mb-12">
							<h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
								🚀 完整生态系统
							</h3>
							<p className="text-xl text-gray-600 max-w-3xl mx-auto">
								从临时邮箱到 IDEA 开发工具，打造无缝的隐私保护开发体验
							</p>
						</div>
						{/* 长条形式的生态系统链接 */}
						<div className="max-w-4xl mx-auto space-y-6">
							{/* IDEA Token 池 - 长条形式 */}
							<div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200 shadow-lg hover:shadow-xl transition-all">
								<div className="flex flex-col md:flex-row items-center gap-6">
									{/* 左侧图标 */}
									<div className="flex-shrink-0">
										<div className="bg-gradient-to-r from-orange-500 to-red-500 w-16 h-16 rounded-full flex items-center justify-center shadow-lg">
											<span className="text-white text-3xl">🎯</span>
										</div>
									</div>

									{/* 中间内容 */}
									<div className="flex-1 text-center md:text-left">
										<h4 className="text-xl font-bold mb-2 text-gray-800">IDEA Token 池</h4>
										<p className="text-gray-600 leading-relaxed">
											Augment Token 获取地址，为您的 IDEA 开发提供强大的 AI 支持
										</p>
									</div>

									{/* 右侧按钮 */}
									<div className="flex-shrink-0">
										<a
											href="https://augment.184772.xyz"
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl"
										>
											<span>🔗 访问 Token 池</span>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
											</svg>
										</a>
									</div>
								</div>
							</div>

							{/* IDEA 无感换号插件 - 长条形式 */}
							<div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 shadow-lg hover:shadow-xl transition-all">
								<div className="flex flex-col md:flex-row items-center gap-6">
									{/* 左侧图标 */}
									<div className="flex-shrink-0">
										<div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-16 h-16 rounded-full flex items-center justify-center shadow-lg">
											<span className="text-white text-3xl">🔧</span>
										</div>
									</div>

									{/* 中间内容 */}
									<div className="flex-1 text-center md:text-left">
										<h4 className="text-xl font-bold mb-2 text-gray-800">IDEA 无感换号</h4>
										<p className="text-gray-600 leading-relaxed">
											开源 IDEA 插件，实现 Augment 账号无感切换，提升开发效率
										</p>
									</div>

									{/* 右侧按钮 */}
									<div className="flex-shrink-0">
										<a
											href="https://github.com/xn030523/augment-token-idea-free.git"
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl"
										>
											<span>📦 GitHub 仓库</span>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
											</svg>
										</a>
									</div>
								</div>
							</div>
						</div>

						{/* 生态系统流程图 */}
						<div className="mt-12 max-w-4xl mx-auto">
							<Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
								<CardContent className="pt-8 pb-6">
									<h4 className="text-2xl font-bold text-center mb-8 text-gray-800">
										🔄 完整工作流程
									</h4>
									<div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
										{/* 步骤 1 */}
										<div className="flex flex-col items-center text-center">
											<div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg">
												<span className="text-white text-2xl font-bold">1</span>
											</div>
											<h5 className="font-bold text-gray-800 mb-2">获取临时邮箱</h5>
											<p className="text-sm text-gray-600">使用 GoMail 生成临时邮箱地址</p>
										</div>

										{/* 箭头 */}
										<div className="hidden md:block text-gray-400">
											<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
											</svg>
										</div>

										{/* 步骤 2 */}
										<div className="flex flex-col items-center text-center">
											<div className="bg-gradient-to-r from-orange-500 to-red-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg">
												<span className="text-white text-2xl font-bold">2</span>
											</div>
											<h5 className="font-bold text-gray-800 mb-2">获取 Token</h5>
											<p className="text-sm text-gray-600">访问 Token 池获取 Augment 令牌</p>
										</div>

										{/* 箭头 */}
										<div className="hidden md:block text-gray-400">
											<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
											</svg>
										</div>

										{/* 步骤 3 */}
										<div className="flex flex-col items-center text-center">
											<div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg">
												<span className="text-white text-2xl font-bold">3</span>
											</div>
											<h5 className="font-bold text-gray-800 mb-2">IDEA 开发</h5>
											<p className="text-sm text-gray-600">使用插件在 IDEA 中无感切换账号</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					{/* 管理员入口 */}
					<div className="mt-16 text-center">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
							<Link
								to="/admin-login"
								className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
							>
								<Shield className="w-4 h-4" />
								管理员登录
							</Link>
						</div>
					</div>
				</div>
			</main>

			{/* 悬浮广告 */}
			<FloatingAds />
		</div>
	);
}
