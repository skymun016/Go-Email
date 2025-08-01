import { useState } from "react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Copy, Check, ChevronRight, Eye } from "lucide-react";

/**
 * 从邮件内容中提取验证码
 * 支持多种常见的验证码格式
 */
function extractVerificationCode(textContent?: string, htmlContent?: string): string | null {
  if (!textContent && !htmlContent) return null;
  
  // 合并文本内容和HTML内容进行搜索
  const content = `${textContent || ''} ${htmlContent || ''}`;
  
  // 定义多种验证码匹配模式
  const patterns = [
    // "Your verification code is: 123456"
    /(?:verification code|验证码)(?:\s*is)?(?:\s*[:：])\s*(\d{6})/i,
    // "验证码：123456"
    /验证码[:：]\s*(\d{6})/i,
    // "Code: 123456"
    /code[:：]\s*(\d{6})/i,
    // "OTP: 123456"
    /otp[:：]\s*(\d{6})/i,
    // "PIN: 123456"
    /pin[:：]\s*(\d{6})/i,
    // 独立的6位数字（更宽泛的匹配）
    /\b(\d{6})\b/,
  ];
  
  // 按优先级尝试匹配
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

interface EnhancedMailItemProps {
	id: string;
	index: number; // 邮件序号
	name: string;
	email: string;
	subject: string;
	date: string;
	isRead?: boolean;
	textContent?: string; // 邮件文本内容，用于提取验证码
	htmlContent?: string; // 邮件HTML内容，用于提取验证码
	onMarkAsRead?: (emailId: string) => void; // 标记邮件为已读的回调
}

export function EnhancedMailItem({
	id,
	index,
	name,
	email,
	subject,
	date,
	isRead = true,
	textContent,
	htmlContent,
	onMarkAsRead,
}: EnhancedMailItemProps) {
	const [copied, setCopied] = useState(false);
	const domain = email.split("@")[1];

	// 从邮件内容中提取验证码
	const verificationCode = extractVerificationCode(textContent, htmlContent);

	const formatDate = (dateString: string) => {
		// 精确到秒的时间格式
		try {
			const date = new Date(dateString);
			const month = date.getMonth() + 1;
			const day = date.getDate();
			const hours = date.getHours().toString().padStart(2, '0');
			const minutes = date.getMinutes().toString().padStart(2, '0');
			const seconds = date.getSeconds().toString().padStart(2, '0');
			return `${month}月${day}日 ${hours}:${minutes}:${seconds}`;
		} catch {
			return dateString;
		}
	};

	// 复制验证码到剪贴板
	const copyVerificationCode = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		
		if (!verificationCode) return;
		
		try {
			await navigator.clipboard.writeText(verificationCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			
			// 如果邮件未读且提供了标记已读的回调，则标记为已读
			if (!isRead && onMarkAsRead) {
				onMarkAsRead(id);
			}
		} catch (error) {
			console.error('复制失败:', error);
		}
	};

	return (
		<Link
			to={`/mail/${id}`}
			className={cn(
				"group relative transition-all duration-200 hover:shadow-md p-4 hover:bg-gray-50 transition-colors cursor-pointer block",
				!isRead && "bg-gradient-to-r from-blue-50 to-cyan-50"
			)}
		>
			{!isRead && (
				<div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg animate-pulse" />
			)}

			<div className="flex items-start gap-4 ml-6">
				{/* 序号显示 */}
				<div className="flex-shrink-0 mt-1">
					<div className={cn(
						"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
						!isRead
							? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
							: "bg-gray-100 text-gray-600"
					)}>
						{index}
					</div>
				</div>

				{/* Avatar with enhanced styling */}
				<div className="relative flex-shrink-0">
					<Avatar className="w-12 h-12 ring-2 ring-white shadow-lg group-hover:ring-blue-200 transition-all">
						<AvatarImage src={`https://unavatar.io/${domain}`} />
						<AvatarFallback className={cn(
							"text-sm font-bold",
							!isRead
								? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
								: "bg-gray-100 text-gray-600"
						)}>
							{name.slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					{!isRead && (
						<div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center">
							<span className="text-white text-xs font-bold">●</span>
						</div>
					)}
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0 space-y-2">
					{/* Header row */}
					<div className="flex items-center justify-between">
						<span className={cn(
							"text-base font-semibold truncate",
							!isRead ? "text-gray-900" : "text-gray-700"
						)}>
							{name || "未知发件人"}
						</span>
						<div className="flex items-center gap-2 flex-shrink-0 ml-3">
							{!isRead && (
								<span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full">
									NEW
								</span>
							)}
							<span className={cn(
								"text-xs font-medium px-2 py-1 rounded-full",
								!isRead
									? "bg-blue-100 text-blue-700"
									: "bg-gray-100 text-gray-600"
							)}>
								{formatDate(date)}
							</span>
						</div>
					</div>

					{/* Email address */}
					<div className="flex items-center gap-2">
						<span className="text-blue-600 text-xs">📧</span>
						<span className="text-sm text-gray-600 font-mono truncate">
							{email}
						</span>
					</div>

					{/* Subject */}
					<div className="flex items-start gap-2">
						<span className="text-gray-400 text-xs mt-0.5">💬</span>
						<p className={cn(
							"text-sm leading-relaxed line-clamp-2",
							!isRead
								? "text-gray-900 font-medium"
								: "text-gray-600"
						)}>
							{subject || "📭 (无主题)"}
						</p>
					</div>

					{/* Verification Code */}
					{verificationCode && (
						<div className="flex items-center gap-2 mt-2">
							<span className="text-green-500 text-xs">🔑</span>
							<span className="text-xs text-gray-500">验证码:</span>
							<div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1">
								<span className="font-mono text-sm font-bold text-blue-600">
									{verificationCode}
								</span>
								<button
									onClick={copyVerificationCode}
									className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors"
									title={copied ? "已复制!" : "复制验证码"}
								>
									{copied ? (
										<Check className="w-3 h-3 text-green-500" />
									) : (
										<Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
									)}
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Hover indicator with view details */}
				<div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
					<div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-full shadow-lg">
						<Eye className="w-3 h-3" />
						<span className="text-xs font-medium">查看详情</span>
						<ChevronRight className="w-3 h-3" />
					</div>
				</div>
			</div>
		</Link>
	);
}
