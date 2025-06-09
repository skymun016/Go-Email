import {
	ArrowLeft,
	Download,
	File,
	FileText,
	Image,
	Loader2,
	Mail,
	Paperclip,
} from "lucide-react";
import React from "react";
import { Link, data, useNavigation } from "react-router";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
	createDB,
	getEmailAttachments,
	getEmailById,
	markEmailAsRead,
} from "~/lib/db";
import { getDatabase } from "~/config/app";

import type { Route } from "./+types/mail.$id";

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
			<script>
				// 自动调整 iframe 高度
				function resizeIframe() {
					const height = document.body.scrollHeight;
					window.parent.postMessage({ type: 'resize', height }, '*');
				}
				
				// 页面加载完成后调整高度
				if (document.readyState === 'loading') {
					document.addEventListener('DOMContentLoaded', resizeIframe);
				} else {
					resizeIframe();
				}
				
				// 监听内容变化
				const observer = new MutationObserver(resizeIframe);
				observer.observe(document.body, { 
					childList: true, 
					subtree: true,
					attributes: true 
				});
			</script>
		</body>
		</html>
	`;
}

// 根据文件类型返回图标
function getFileIcon(filename?: string | null, contentType?: string | null) {
	if (!filename && !contentType) return <File className="w-4 h-4" />;

	const extension = filename?.toLowerCase().split(".").pop();
	const mimeType = contentType?.toLowerCase();

	if (
		mimeType?.startsWith("image/") ||
		["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")
	) {
		return <Image className="w-4 h-4" />;
	}

	if (
		mimeType?.includes("text/") ||
		["txt", "md", "html", "css", "js", "json"].includes(extension || "")
	) {
		return <FileText className="w-4 h-4" />;
	}

	return <File className="w-4 h-4" />;
}

// 格式化文件大小
function formatFileSize(bytes?: number | null) {
	if (!bytes) return "Unknown size";
	const sizes = ["Bytes", "KB", "MB", "GB"];
	if (bytes === 0) return "0 Bytes";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
}

export function meta({ data }: Route.MetaArgs) {
	if (!data?.email) {
		return [
			{ title: "邮件详情 - GoMail临时邮箱" },
			{
				name: "description",
				content: "查看您在GoMail临时邮箱中收到的邮件详情。",
			},
			// 即使是404页面也要阻止索引
			{
				name: "robots",
				content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
			},
			{
				name: "googlebot",
				content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
			},
			{
				name: "bingbot",
				content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
			},
		];
	}

	const { email } = data;
	const fromDomain = email.fromAddress.split("@")[1] || "未知发件人";
	const shortSubject = email.subject?.substring(0, 30) || "无主题";

	return [
		{ title: `${shortSubject} - 来自${fromDomain}的邮件 | GoMail临时邮箱` },
		{
			name: "description",
			content: `查看来自${email.fromAddress}的邮件"${email.subject || "无主题"}"。接收时间：${new Date(email.receivedAt).toLocaleDateString("zh-CN")}。`,
		},
		// 阻止搜索引擎索引邮件内容页面
		{
			name: "robots",
			content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
		},
		{
			name: "googlebot",
			content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
		},
		{
			name: "bingbot",
			content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
		},
		// 阻止缓存
		{
			"http-equiv": "cache-control",
			content: "no-cache, no-store, must-revalidate",
		},
		{ "http-equiv": "pragma", content: "no-cache" },
		{ "http-equiv": "expires", content: "0" },
	];
}

export async function loader({ params, context }: Route.LoaderArgs) {
	const { id } = params;

	if (!id) {
		throw new Response("邮件 ID 是必需的", { status: 400 });
	}

	try {
		const db = createDB(getDatabase(context.cloudflare.env));

		// 获取邮件详情
		const email = await getEmailById(db, id);

		if (!email) {
			throw new Response("邮件未找到", { status: 404 });
		}

		// 获取附件列表
		const attachments = await getEmailAttachments(db, id);

		// 标记邮件为已读
		if (!email.isRead) {
			await markEmailAsRead(db, id);
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

		if (error instanceof Response) {
			throw error;
		}

		throw new Response("服务器错误", { status: 500 });
	}
}

export default function MailDetail({ loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const { email, attachments, emailHTML } = loaderData;

	// 格式化日期
	const formattedDate = new Date(email.receivedAt).toLocaleString("zh-CN", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	// 处理 iframe 高度调整
	const handleIframeMessage = React.useCallback((event: MessageEvent) => {
		if (event.data.type === "resize") {
			const iframe = document.getElementById(
				"email-content-iframe",
			) as HTMLIFrameElement;
			if (iframe) {
				iframe.style.height = `${event.data.height}px`;
			}
		}
	}, []);

	// 监听来自 iframe 的消息
	React.useEffect(() => {
		window.addEventListener("message", handleIframeMessage);
		return () => window.removeEventListener("message", handleIframeMessage);
	}, [handleIframeMessage]);

	return (
		<div className="h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 flex flex-col">
			{/* Header */}
			<header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-3 sm:px-4 py-4 shrink-0 shadow-sm">
				<div className="w-full flex items-center justify-between">
					<div className="flex items-center gap-3 sm:gap-4">
						<Button
							asChild
							variant="ghost"
							size="sm"
							className="text-xs sm:text-sm p-2 sm:p-3 hover:bg-blue-100 transition-colors rounded-xl"
						>
							<Link to="/">
								<ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" />
								<span className="hidden sm:inline ml-2 text-blue-700 font-medium">返回收件箱</span>
								<span className="sm:hidden text-blue-700 font-medium">返回</span>
							</Link>
						</Button>
						<Separator orientation="vertical" className="h-6 sm:h-8 bg-blue-200" />
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
							<span className="text-sm sm:text-base text-blue-700 font-semibold">📧 邮件详情</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{navigation.state === "loading" && (
							<div className="flex items-center gap-2">
								<Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin text-blue-600" />
								<span className="text-xs text-blue-600">加载中...</span>
							</div>
						)}
					</div>
				</div>
			</header>

			{/* Email Header - Enhanced */}
			<div className="bg-white/90 backdrop-blur-sm border-b border-blue-100 px-4 sm:px-6 py-5 shrink-0 shadow-sm">
				<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
					<div className="flex-1 min-w-0">
						<div className="flex items-start gap-3 mb-4">
							<div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full p-3 shadow-sm">
								<Mail className="w-6 h-6 text-blue-600" />
							</div>
							<div className="flex-1">
								<h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 break-words leading-tight">
									{email.subject || "📭 (无主题)"}
								</h1>
								<div className="flex items-center gap-2 text-sm text-gray-500">
									<span className="w-2 h-2 bg-green-500 rounded-full"></span>
									<span>邮件已安全接收</span>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
							<div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-blue-600">👤</span>
									<span className="font-semibold text-blue-800">发件人</span>
								</div>
								<div className="text-gray-700 font-mono text-xs break-all">
									{email.fromAddress}
								</div>
							</div>

							<div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-green-600">📨</span>
									<span className="font-semibold text-green-800">收件人</span>
								</div>
								<div className="text-gray-700 font-mono text-xs break-all">
									{email.toAddress}
								</div>
							</div>

							<div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-purple-600">⏰</span>
									<span className="font-semibold text-purple-800">接收时间</span>
								</div>
								<div className="text-gray-700 text-xs">
									{formattedDate}
								</div>
							</div>
						</div>
					</div>

					<div className="flex flex-col items-end gap-3 flex-shrink-0">
						<Badge
							variant={email.isRead ? "secondary" : "default"}
							className={`text-sm px-3 py-1 ${
								email.isRead
									? "bg-gray-100 text-gray-700"
									: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
							}`}
						>
							{email.isRead ? "✓ 已读" : "● 未读"}
						</Badge>
						<div className="bg-gray-100 rounded-lg px-3 py-2">
							<span className="text-xs text-gray-600 font-medium">
								📊 {formatFileSize(email.size)}
							</span>
						</div>
					</div>
				</div>

				{/* Attachments - Enhanced */}
				{attachments.length > 0 && (
					<div className="mt-6 pt-4 border-t border-blue-100">
						<div className="flex items-center gap-3 mb-4">
							<div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-full p-2">
								<Paperclip className="w-5 h-5 text-orange-600" />
							</div>
							<div>
								<span className="text-base font-bold text-gray-800">
									📎 附件列表
								</span>
								<span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
									{attachments.length} 个文件
								</span>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{attachments.map((attachment) => (
								<div
									key={attachment.id}
									className="group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200 hover:-translate-y-1"
								>
									<div className="flex items-start gap-3">
										<div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg p-2 group-hover:scale-110 transition-transform">
											{getFileIcon(attachment.filename, attachment.contentType)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="font-semibold text-gray-900 text-sm truncate mb-1">
												{attachment.filename || "📄 未命名附件"}
											</div>
											<div className="text-gray-500 text-xs mb-2">
												💾 {formatFileSize(attachment.size)}
											</div>
											{attachment.uploadStatus === "uploaded" ? (
												<a
													href={`/attachment/${attachment.id}`}
													className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:shadow-md"
													title="下载附件"
												>
													<Download className="w-3 h-3" />
													下载
												</a>
											) : (
												<span className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg ${
													attachment.uploadStatus === "pending"
														? "bg-yellow-100 text-yellow-800"
														: "bg-red-100 text-red-800"
												}`}>
													{attachment.uploadStatus === "pending" ? (
														<>
															<Loader2 className="w-3 h-3 animate-spin" />
															处理中...
														</>
													) : (
														<>
															❌ 处理失败
														</>
													)}
												</span>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Email Content - Enhanced */}
			<div className="flex-1 min-h-0 bg-white/90 backdrop-blur-sm mx-4 mb-4 rounded-xl shadow-lg border border-blue-100 overflow-hidden">
				<div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 bg-white/30 rounded-full"></div>
						<div className="w-3 h-3 bg-white/30 rounded-full"></div>
						<div className="w-3 h-3 bg-white/30 rounded-full"></div>
						<span className="ml-3 text-white font-medium text-sm">📧 邮件内容</span>
					</div>
				</div>
				<iframe
					id="email-content-iframe"
					srcDoc={emailHTML}
					className="w-full h-full border-0 bg-white"
					sandbox="allow-same-origin"
					title="邮件内容"
					style={{ height: 'calc(100% - 48px)' }}
				/>
			</div>
		</div>
	);
}
