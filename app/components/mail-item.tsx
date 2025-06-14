import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface MailItemProps {
	id: string;
	name: string;
	email: string;
	subject: string;
	date: string;
	isRead?: boolean;
}

export function MailItem({
	id,
	name,
	email,
	subject,
	date,
	isRead = true,
}: MailItemProps) {
	const domain = email.split("@")[1];

	const formatDate = (dateString: string) => {
		// 使用简单的字符串处理避免服务端和客户端不一致
		try {
			const date = new Date(dateString);
			const month = date.getMonth() + 1;
			const day = date.getDate();
			return `${month}月${day}日`;
		} catch {
			return dateString;
		}
	};

	return (
		<div className={cn(
			"group relative transition-all duration-200 hover:shadow-md",
			!isRead && "bg-gradient-to-r from-blue-50 to-cyan-50"
		)}>
			<Link
				to={`/mail/${id}`}
				className="block p-4 hover:bg-gray-50 transition-colors"
			>
				{!isRead && (
					<div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg animate-pulse" />
				)}

				<div className="flex items-start gap-4 ml-6">
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
					</div>
				</div>

				{/* Hover indicator */}
				<div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
					<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
				</div>
			</Link>
		</div>
	);
}
