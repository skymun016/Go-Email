/**
 * GoMail 首页 - 用户专属邮箱管理
 */

import { Loader2Icon, Mail, RefreshCcwIcon, Shield, User, Settings, Eye, Plus, LogIn } from "lucide-react";
import React from "react";
import {
	Link,
	data,
	redirect,
	useNavigation,
	useRevalidator,
	useFetcher,
} from "react-router";

import type { Route } from "./+types/home";
import { getOptionalUser } from "~/lib/auth";
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
import { Badge } from "~/components/ui/badge";
import {
	createDB,
	getEmailsByAddress,
	getMailboxStats,
	getEmailById,
	getEmailAttachments,
	markEmailAsRead,
} from "~/lib/db";
import { APP_CONFIG, getDatabase } from "~/config/app";
import { SimpleAdsBar } from "~/components/SimpleAdsBar";
import { WebApplicationStructuredData, OrganizationStructuredData, WebSiteStructuredData } from "~/components/StructuredData";

// 生成邮件 HTML 内容
function generateEmailHTML(email: {
	fromAddress: string;
	toAddress: string;
	subject?: string | null;
	htmlContent?: string | null;
	textContent?: string | null;
	receivedAt: Date;
}) {
	const content =
		email.htmlContent || email.textContent?.replace(/\n/g, "<br>") || "";

	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>邮件内容</title>
			<style>
				body {
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
					line-height: 1.6;
					margin: 20px;
					color: #333;
					background: white;
				}
				.email-content {
					max-width: 100%;
					word-wrap: break-word;
				}
				img {
					max-width: 100%;
					height: auto;
				}
				a {
					color: #2563eb;
					text-decoration: underline;
				}
				blockquote {
					border-left: 4px solid #e5e7eb;
					margin: 1em 0;
					padding: 0 1em;
					color: #6b7280;
				}
				pre {
					background: #f3f4f6;
					padding: 1em;
					border-radius: 6px;
					overflow-x: auto;
					white-space: pre-wrap;
				}
				table {
					border-collapse: collapse;
					width: 100%;
					margin: 1em 0;
				}
				th, td {
					border: 1px solid #e5e7eb;
					padding: 8px 12px;
					text-align: left;
				}
				th {
					background: #f9fafb;
					font-weight: 600;
				}
			</style>
		</head>
		<body>
			<div class="email-content">
				${content}
			</div>
		</body>
		</html>
	`;
}

export function meta(_: Route.MetaArgs) {
	return [
		{
			title:
				"GoMail - 专属邮箱管理平台 | 个人邮箱服务 | 安全可靠的邮件管理",
		},
		{
			name: "description",
			content:
				"GoMail提供专业的个人邮箱管理服务，安全可靠的邮件收发，完善的邮箱管理功能。注册登录即可获得专属邮箱，享受高质量的邮件服务体验。",
		},
		{
			name: "keywords",
			content:
				"专属邮箱,个人邮箱,邮件管理,邮箱服务,安全邮箱,企业邮箱,邮件收发",
		},
		{
			property: "og:title",
			content: "GoMail - 专属邮箱管理平台 | 个人邮箱服务",
		},
		{
			property: "og:description",
			content:
				"专业的个人邮箱管理服务，安全可靠的邮件收发，完善的邮箱管理功能。",
		},
		{
			property: "og:type",
			content: "website",
		},
		{
			property: "og:url",
			content: "https://gomail-app.amexiaowu.workers.dev",
		},
		{
			name: "twitter:card",
			content: "summary_large_image",
		},
		{
			name: "twitter:title",
			content: "GoMail - 专属邮箱管理平台",
		},
		{
			name: "twitter:description",
			content: "专业的个人邮箱管理服务，安全可靠的邮件收发。",
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

export async function action({ request, context }: Route.ActionArgs) {
	const env = context?.cloudflare?.env;

	if (!env) {
		return data({ error: "环境配置错误" }, { status: 500 });
	}

	const formData = await request.formData();
	const emailId = formData.get("emailId") as string;

	if (!emailId) {
		return data({ error: "邮件ID是必需的" }, { status: 400 });
	}

	try {
		const db = createDB(getDatabase(env));

		// 获取邮件详情
		const email = await getEmailById(db, emailId);

		if (!email) {
			return data({ error: "邮件未找到" }, { status: 404 });
		}

		// 获取附件列表
		const attachments = await getEmailAttachments(db, emailId);

		// 标记邮件为已读
		if (!email.isRead) {
			await markEmailAsRead(db, emailId);
		}

		// 生成邮件 HTML 内容
		const emailHTML = generateEmailHTML(email);

		return data({
			email,
			attachments,
			emailHTML,
		});
	} catch (error) {
		console.error("Error loading email:", error);
		return data({ error: "获取邮件详情失败" }, { status: 500 });
	}
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context?.cloudflare?.env;
	
	// 如果没有 Cloudflare 环境（开发环境），返回未登录状态
	if (!env) {
		return {
			isLoggedIn: false,
			user: null,
			userMailboxes: [],
			selectedMailbox: null,
			emails: [],
			stats: { total: 0, unread: 0 },
		};
	}
	
	try {
		// 检查用户是否已登录
		const user = await getOptionalUser(request, env);
		
		if (!user) {
			// 用户未登录，返回登录提示状态
			return data({
				isLoggedIn: false,
				user: null,
				userMailboxes: [],
				selectedMailbox: null,
				emails: [],
				stats: { total: 0, unread: 0 },
			});
		}
		
		const db = createDB(getDatabase(env));
		const url = new URL(request.url);
		const selectedMailboxId = url.searchParams.get("mailbox");

		// 获取用户分配的邮箱列表
		const userMailboxes = await db.query.userMailboxes.findMany({
			where: (userMailboxes, { eq }) => eq(userMailboxes.userId, user.id),
		});
		
		// 获取邮箱详细信息
		const mailboxesWithDetails = await Promise.all(
			userMailboxes.map(async (userMailbox) => {
				const mailbox = await db.query.mailboxes.findFirst({
					where: (mailboxes, { eq }) => eq(mailboxes.id, userMailbox.mailboxId),
				});
				
				if (!mailbox) return null;
				
				// 获取邮箱统计信息
				const stats = await getMailboxStats(db, mailbox.email);
				
				return {
					...mailbox,
					assignedAt: userMailbox.createdAt,
					stats,
				};
			})
		);
		
		const validMailboxes = mailboxesWithDetails.filter(Boolean);

		// 根据URL参数选择邮箱，如果没有指定则选择第一个邮箱
		let selectedMailbox = null;
		if (selectedMailboxId) {
			selectedMailbox = validMailboxes.find(mailbox => mailbox.id === selectedMailboxId) || null;
		}
		if (!selectedMailbox && validMailboxes.length > 0) {
			selectedMailbox = validMailboxes[0];
		}

		let emails: any[] = [];
		let totalStats = { total: 0, unread: 0 };
		
		if (selectedMailbox) {
			const emailRecords = await getEmailsByAddress(db, selectedMailbox.email);
			// 转换邮件数据格式以适配前端组件
			emails = emailRecords.map((emailRecord) => ({
				id: emailRecord.id,
				name: emailRecord.fromAddress.split("@")[0] || emailRecord.fromAddress,
				email: emailRecord.fromAddress,
				subject: emailRecord.subject || "(无主题)",
				date: emailRecord.receivedAt.toISOString().split("T")[0],
				isRead: emailRecord.isRead,
			}));
			totalStats = selectedMailbox.stats;
		}
		
		return data({
			isLoggedIn: true,
			user: {
				id: user.id,
				username: user.username,
			},
			userMailboxes: validMailboxes,
			selectedMailbox,
			emails,
			stats: totalStats,
		});
		
	} catch (error) {
		console.error("Error loading user mailboxes:", error);
		return data({
			isLoggedIn: false,
			user: null,
			userMailboxes: [],
			selectedMailbox: null,
			emails: [],
			stats: { total: 0, unread: 0 },
			error: "加载邮箱信息失败",
		});
	}
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const revalidator = useRevalidator();
	const fetcher = useFetcher();

	// 邮件预览状态管理
	const [selectedEmailId, setSelectedEmailId] = React.useState<string | null>(null);
	const [selectedEmailData, setSelectedEmailData] = React.useState<any>(null);

	const isAutoRefreshing = revalidator.state === "loading";

	// 手动刷新邮件列表
	const handleRefreshEmails = () => {
		revalidator.revalidate();
	};

	// 自动刷新逻辑 - 每30秒自动重新验证数据（仅在用户已登录时）
	React.useEffect(() => {
		if (typeof window === 'undefined' || !loaderData.isLoggedIn) return;

		const interval = setInterval(() => {
			if (
				document.visibilityState === "visible" &&
				navigation.state === "idle" &&
				revalidator.state === "idle"
			) {
				revalidator.revalidate();
			}
		}, 30000); // 30秒

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
	}, [navigation.state, revalidator, loaderData.isLoggedIn]);

	// 处理邮件选择
	const handleEmailSelect = async (emailId: string) => {
		setSelectedEmailId(emailId);

		// 使用 fetcher 获取邮件详情
		const formData = new FormData();
		formData.append("emailId", emailId);
		fetcher.submit(formData, { method: "post" });
	};

	// 监听 fetcher 数据变化
	React.useEffect(() => {
		if (fetcher.data && !fetcher.data.error) {
			setSelectedEmailData(fetcher.data);
		}
	}, [fetcher.data]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
			{/* SEO结构化数据 */}
			<WebApplicationStructuredData />
			<OrganizationStructuredData />
			<WebSiteStructuredData />
			<main className="container mx-auto px-4 py-8">
				<div className="max-w-6xl mx-auto">
					{/* Hero Section */}
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
										<span className="text-blue-700 text-sm font-medium">🚀 专业邮箱管理平台</span>
									</div>
									<h1 className="text-2xl md:text-3xl font-bold mb-2">
										<span className="text-gray-800">您的专属 </span>
										<span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">GoMail 邮箱</span>
									</h1>
									<p className="text-gray-600 leading-relaxed mb-3">
										安全可靠的个人邮箱服务 -
										<span className="text-blue-600 font-semibold">专属邮箱 · 安全收发 · 完善管理 · 高效便捷</span>
									</p>
								</div>

								{/* 右侧统计信息 */}
								<div className="flex-shrink-0 flex flex-col gap-2 text-sm">
									<div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
										<span className="w-2 h-2 bg-green-500 rounded-full"></span>
										<span className="text-gray-600">企业级安全保障</span>
									</div>
									<div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
										<span className="w-2 h-2 bg-blue-500 rounded-full"></span>
										<span className="text-gray-600">99.9% 服务可用性</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* 简单广告条 */}
					<SimpleAdsBar maxAds={5} />

					{/* 主要内容区域 */}
					{!loaderData.isLoggedIn ? (
						// 未登录状态 - 显示登录提示
						<div className="grid lg:grid-cols-2 gap-8">
							<Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
								<CardHeader className="text-center">
									<div className="bg-gradient-to-r from-blue-600 to-cyan-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
										<LogIn className="h-10 w-10 text-white" />
									</div>
									<CardTitle className="text-2xl text-gray-800">
										登录您的账户
									</CardTitle>
									<CardDescription className="text-gray-600">
										登录后即可查看和管理您的专属邮箱
									</CardDescription>
								</CardHeader>
								<CardContent className="text-center space-y-4">
									<p className="text-gray-600">
										GoMail为每位用户提供专属的邮箱服务，安全可靠，功能完善。
									</p>
									<div className="space-y-3">
										<Link to="/login">
											<Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg">
												<LogIn className="w-4 h-4 mr-2" />
												立即登录
											</Button>
										</Link>
										<Link to="/register">
											<Button variant="outline" className="w-full border-blue-300 text-blue-600 hover:bg-blue-50">
												<User className="w-4 h-4 mr-2" />
												注册新账户
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>

							<Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50">
								<CardHeader>
									<CardTitle className="flex items-center space-x-3 text-xl">
										<div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-2.5 shadow-lg">
											<Shield className="h-5 w-5 text-white" />
										</div>
										<span className="text-gray-800">服务特色</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-3">
										<div className="flex items-start gap-3">
											<div className="bg-blue-100 rounded-full p-2 mt-1">
												<Mail className="h-4 w-4 text-blue-600" />
											</div>
											<div>
												<h4 className="font-semibold text-gray-800">专属邮箱</h4>
												<p className="text-sm text-gray-600">为每位用户分配专属邮箱地址，长期稳定使用</p>
											</div>
										</div>
										<div className="flex items-start gap-3">
											<div className="bg-green-100 rounded-full p-2 mt-1">
												<Shield className="h-4 w-4 text-green-600" />
											</div>
											<div>
												<h4 className="font-semibold text-gray-800">安全保障</h4>
												<p className="text-sm text-gray-600">企业级安全防护，保护您的邮件隐私和数据安全</p>
											</div>
										</div>
										<div className="flex items-start gap-3">
											<div className="bg-purple-100 rounded-full p-2 mt-1">
												<Settings className="h-4 w-4 text-purple-600" />
											</div>
											<div>
												<h4 className="font-semibold text-gray-800">完善管理</h4>
												<p className="text-sm text-gray-600">强大的邮件管理功能，让您高效处理邮件</p>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					) : loaderData.userMailboxes.length === 0 ? (
						// 已登录但无邮箱 - 显示无邮箱提示
						<Card className="border-0 shadow-xl bg-gradient-to-br from-white to-yellow-50">
							<CardHeader className="text-center">
								<div className="bg-gradient-to-r from-yellow-500 to-orange-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
									<Mail className="h-10 w-10 text-white" />
								</div>
								<CardTitle className="text-2xl text-gray-800">
									欢迎，{loaderData.user?.username}！
								</CardTitle>
								<CardDescription className="text-gray-600">
									您还没有分配的邮箱，请联系管理员为您分配邮箱
								</CardDescription>
							</CardHeader>
							<CardContent className="text-center space-y-4">
								<p className="text-gray-600">
									管理员将为您分配专属的邮箱地址，分配完成后您就可以开始使用邮件服务了。
								</p>
								<Button
									onClick={handleRefreshEmails}
									disabled={isAutoRefreshing}
									className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
								>
									{isAutoRefreshing ? (
										<>
											<Loader2Icon className="w-4 h-4 animate-spin mr-2" />
											检查中...
										</>
									) : (
										<>
											<RefreshCcwIcon className="w-4 h-4 mr-2" />
											检查邮箱分配
										</>
									)}
								</Button>
							</CardContent>
						</Card>
					) : (
						// 已登录且有邮箱 - 显示邮箱管理界面
						<div className="grid lg:grid-cols-3 gap-6 h-[600px]">
							{/* 第一列：邮箱管理 */}
							<div className="space-y-6 h-[600px] overflow-y-auto">
								{/* 邮箱选择器 */}
								<Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
									<CardHeader className="pb-4">
										<CardTitle className="flex items-center space-x-3 text-xl">
											<div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-2.5 shadow-lg">
												<User className="h-5 w-5 text-white" />
											</div>
											<span className="text-gray-800">邮箱切换</span>
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											<div>
												<label htmlFor="mailbox-select" className="block text-sm font-medium text-gray-700 mb-2">
													选择邮箱 ({loaderData.userMailboxes.length} 个可用)
												</label>
												<select
													id="mailbox-select"
													value={loaderData.selectedMailbox?.id || ""}
													onChange={(e) => {
														const selectedId = e.target.value;
														if (selectedId) {
															window.location.href = `/?mailbox=${selectedId}`;
														} else {
															window.location.href = "/";
														}
													}}
													className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
												>
													{loaderData.userMailboxes.map((mailbox: any, index: number) => (
														<option key={mailbox.id} value={mailbox.id}>
															邮箱 #{index + 1}: {mailbox.email}
														</option>
													))}
												</select>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* 当前选中邮箱信息 */}
								{loaderData.selectedMailbox && (
									<Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50">
										<CardHeader className="pb-4">
											<CardTitle className="flex items-center space-x-3 text-xl">
												<div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-2.5 shadow-lg">
													<Mail className="h-5 w-5 text-white" />
												</div>
												<span className="text-gray-800">当前邮箱</span>
											</CardTitle>
											<div className="flex items-center gap-2 text-sm mt-3">
												<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-green-200 text-green-800 shadow-sm">
													✨ 专属邮箱
												</span>
												<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 shadow-sm">
													⚡ 安全可靠
												</span>
											</div>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="bg-gradient-to-r from-gray-50 to-green-50 rounded-xl p-4 border-2 border-green-100 shadow-inner">
												<div className="flex items-center justify-between mb-3">
													<div className="flex items-center gap-2">
														<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
														<span className="text-sm font-semibold text-green-600">
															活跃邮箱
														</span>
													</div>
													<Badge variant="secondary" className="bg-green-100 text-green-800">
														在线
													</Badge>
												</div>

												<div className="bg-white rounded-lg p-3 shadow-sm border border-green-200 mb-3">
													<EmailDisplay
														email={loaderData.selectedMailbox.email}
														className="font-mono text-sm font-bold text-gray-900 tracking-wide select-all break-all"
													/>
												</div>

												<div className="flex items-center justify-between text-xs text-gray-600">
													<span>创建时间: {new Date(loaderData.selectedMailbox.createdAt).toLocaleDateString('zh-CN')}</span>
													<span>{loaderData.selectedMailbox.stats.total} 封邮件</span>
												</div>

												<div className="grid grid-cols-2 gap-2 mt-3">
													<CopyButton
														text={loaderData.selectedMailbox.email}
														size="sm"
														variant="outline"
														className="text-xs"
													/>
													<Link to={`/mailbox/${loaderData.selectedMailbox.id}`}>
														<Button size="sm" variant="outline" className="w-full text-xs">
															<Settings className="w-3 h-3 mr-1" />
															管理
														</Button>
													</Link>
												</div>
											</div>
										</CardContent>
									</Card>
								)}
							</div>



							{/* 第二列：邮件列表 */}
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
														<span className="text-xl font-bold">收件箱</span>
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
														刷新
													</>
												)}
											</Button>
										</div>
									</CardHeader>
									<CardContent className="p-0">
										<ScrollArea className="h-[480px]">
											{loaderData.emails.length === 0 ? (
												<div className="flex flex-col items-center justify-center h-full p-8 text-center">
													<div className="bg-gradient-to-r from-gray-100 to-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-4 shadow-lg">
														<Mail className="h-8 w-8 text-gray-400" />
													</div>
													<h3 className="text-lg font-semibold text-gray-700 mb-2">
														收件箱为空
													</h3>
													<p className="text-gray-500 text-sm leading-relaxed">
														暂时没有收到新邮件
														<br />
														<span className="text-blue-600 font-medium">系统会自动检查新邮件</span>
													</p>
												</div>
											) : (
												<div className="divide-y divide-gray-100">
													{loaderData.emails.map((mail: any) => (
														<div
															key={mail.id}
															className={`group relative transition-all duration-200 hover:shadow-md cursor-pointer ${
																!mail.isRead && "bg-gradient-to-r from-blue-50 to-cyan-50"
															} ${selectedEmailId === mail.id ? "bg-blue-100 border-l-4 border-blue-500" : ""}`}
															onClick={() => handleEmailSelect(mail.id)}
														>
															{!mail.isRead && (
																<div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg animate-pulse" />
															)}

															<div className="flex items-start gap-4 ml-6 p-4 hover:bg-gray-50 transition-colors">
																{/* Avatar */}
																<div className="relative flex-shrink-0">
																	<div className={`w-12 h-12 ring-2 ring-white shadow-lg group-hover:ring-blue-200 transition-all rounded-full flex items-center justify-center ${
																		!mail.isRead
																			? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
																			: "bg-gray-100 text-gray-600"
																	}`}>
																		<span className="text-sm font-bold">
																			{mail.name.slice(0, 2).toUpperCase()}
																		</span>
																	</div>
																	{!mail.isRead && (
																		<div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center">
																			<span className="text-white text-xs font-bold">●</span>
																		</div>
																	)}
																</div>

																{/* Content */}
																<div className="flex-1 min-w-0 space-y-2">
																	{/* Header row */}
																	<div className="flex items-center justify-between">
																		<span className={`text-base font-semibold truncate ${
																			!mail.isRead ? "text-gray-900" : "text-gray-700"
																		}`}>
																			{mail.name || "未知发件人"}
																		</span>
																		<div className="flex items-center gap-2 flex-shrink-0 ml-3">
																			{!mail.isRead && (
																				<span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full">
																					NEW
																				</span>
																			)}
																			<span className={`text-xs font-medium px-2 py-1 rounded-full ${
																				!mail.isRead
																					? "bg-blue-100 text-blue-700"
																					: "bg-gray-100 text-gray-600"
																			}`}>
																				{new Date(mail.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
																			</span>
																		</div>
																	</div>

																	{/* Email address */}
																	<div className="flex items-center gap-2">
																		<span className="text-blue-600 text-xs">📧</span>
																		<span className="text-sm text-gray-600 font-mono truncate">
																			{mail.email}
																		</span>
																	</div>

																	{/* Subject */}
																	<div className="flex items-start gap-2">
																		<span className="text-gray-400 text-xs mt-0.5">💬</span>
																		<p className={`text-sm leading-relaxed line-clamp-2 ${
																			!mail.isRead
																				? "text-gray-900 font-medium"
																				: "text-gray-600"
																		}`}>
																			{mail.subject || "📭 (无主题)"}
																		</p>
																	</div>
																</div>
															</div>

															{/* Selection indicator */}
															{selectedEmailId === mail.id && (
																<div className="absolute right-4 top-1/2 transform -translate-y-1/2">
																	<div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
																</div>
															)}
														</div>
													))}
												</div>
											)}
										</ScrollArea>
									</CardContent>
								</Card>
							</div>

							{/* 第三列：邮件预览 */}
							<div>
								<Card className="h-full border-0 shadow-xl bg-gradient-to-br from-white to-purple-50">
									<CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
										<CardTitle className="flex items-center space-x-2 text-white">
											<Eye className="h-5 w-5" />
											<span className="text-lg font-bold">邮件预览</span>
										</CardTitle>
									</CardHeader>
									<CardContent className="p-0 h-[480px]">
										{selectedEmailData ? (
											<div className="h-full flex flex-col">
												{/* 邮件头部信息 */}
												<div className="p-4 border-b border-gray-200 bg-gray-50">
													<div className="space-y-2">
														<div className="flex items-center justify-between">
															<span className="text-sm font-medium text-gray-600">发件人</span>
															<span className="text-sm text-gray-900 font-mono">
																{selectedEmailData.email.fromAddress}
															</span>
														</div>
														<div className="flex items-center justify-between">
															<span className="text-sm font-medium text-gray-600">收件人</span>
															<span className="text-sm text-gray-900 font-mono">
																{selectedEmailData.email.toAddress}
															</span>
														</div>
														<div className="flex items-center justify-between">
															<span className="text-sm font-medium text-gray-600">主题</span>
															<span className="text-sm text-gray-900 font-semibold">
																{selectedEmailData.email.subject || "(无主题)"}
															</span>
														</div>
														<div className="flex items-center justify-between">
															<span className="text-sm font-medium text-gray-600">时间</span>
															<span className="text-sm text-gray-900">
																{new Date(selectedEmailData.email.receivedAt).toLocaleString('zh-CN')}
															</span>
														</div>
														{selectedEmailData.attachments && selectedEmailData.attachments.length > 0 && (
															<div className="flex items-center justify-between">
																<span className="text-sm font-medium text-gray-600">附件</span>
																<span className="text-sm text-blue-600">
																	{selectedEmailData.attachments.length} 个附件
																</span>
															</div>
														)}
													</div>
												</div>

												{/* 邮件内容 */}
												<div className="flex-1 min-h-0">
													<iframe
														srcDoc={selectedEmailData.emailHTML}
														className="w-full h-full border-0 bg-white"
														sandbox="allow-same-origin"
														title="邮件内容"
													/>
												</div>
											</div>
										) : (
											<div className="h-full flex flex-col items-center justify-center p-8 text-center">
												<div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-full w-16 h-16 flex items-center justify-center mb-4 shadow-lg">
													<Eye className="h-8 w-8 text-purple-400" />
												</div>
												<h3 className="text-lg font-semibold text-gray-700 mb-2">
													请选择邮件查看内容
												</h3>
												<p className="text-gray-500 text-sm leading-relaxed">
													点击左侧邮件列表中的任意邮件
													<br />
													<span className="text-purple-600 font-medium">即可在此处预览邮件内容</span>
												</p>
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						</div>
					)}

					{/* 核心特性 */}
					<div className="mt-16">
						<div className="max-w-4xl mx-auto">
							<div className="grid md:grid-cols-3 gap-6">
								{/* 专属邮箱 */}
								<div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100">
									<div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<span className="text-blue-600 text-2xl">📧</span>
									</div>
									<h4 className="font-bold text-gray-800 mb-2">专属邮箱</h4>
									<p className="text-sm text-gray-600">个人专属邮箱地址，长期稳定使用</p>
								</div>

								{/* 安全保障 */}
								<div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100">
									<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<span className="text-green-600 text-2xl">🛡️</span>
									</div>
									<h4 className="font-bold text-gray-800 mb-2">安全保障</h4>
									<p className="text-sm text-gray-600">企业级安全防护，保护邮件隐私</p>
								</div>

								{/* 完善管理 */}
								<div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100">
									<div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<span className="text-purple-600 text-2xl">⚙️</span>
									</div>
									<h4 className="font-bold text-gray-800 mb-2">完善管理</h4>
									<p className="text-sm text-gray-600">强大的邮件管理功能</p>
								</div>
							</div>
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
		</div>
	);
}
