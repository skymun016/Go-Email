import { Mail, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { APP_CONFIG } from "~/config/app";

// GitHub 图标组件
const GitHubIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		fill="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
	</svg>
);

export function Navigation({ currentPath = "/" }: { currentPath?: string }) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const navItems = [
		{ href: "/", label: "首页", description: "获取临时邮箱" },
		{ href: "/about", label: "关于", description: `了解 ${APP_CONFIG.project.displayName}` },
		{ href: "/api-docs", label: "API文档", description: "开发者接口文档" },
		{ href: "/faq", label: "FAQ", description: "常见问题" },
		{ href: "/contact", label: "联系", description: "联系我们" },
	];

	return (
		<header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					{/* Logo */}
					<Link
						to="/"
						className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
					>
						<div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-2">
							<Mail className="h-6 w-6 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
								{APP_CONFIG.project.displayName}
							</h1>
							<p className="text-sm text-gray-600">{APP_CONFIG.ui.tagline}</p>
						</div>
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden md:flex items-center space-x-8">
						{navItems.map((item) => (
							<Link
								key={item.href}
								to={item.href}
								className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-blue-600 ${
									currentPath === item.href
										? "text-blue-600 bg-blue-50"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								{item.label}
							</Link>
						))}
						<a
							href="https://github.com/xn030523/Go-Email"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
							title="GitHub 开源"
						>
							<GitHubIcon className="w-4 h-4" />
							GitHub
						</a>
						<Button
							asChild
							className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
						>
							<Link to="/">开始使用</Link>
						</Button>
					</nav>

					{/* Mobile Menu Button */}
					<button
						type="button"
						className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						aria-label="切换菜单"
					>
						{isMobileMenuOpen ? (
							<X className="h-6 w-6" />
						) : (
							<Menu className="h-6 w-6" />
						)}
					</button>
				</div>

				{/* Mobile Navigation */}
				{isMobileMenuOpen && (
					<nav className="md:hidden mt-4 pb-4 border-t border-gray-100">
						<div className="pt-4 space-y-2">
							{navItems.map((item) => (
								<Link
									key={item.href}
									to={item.href}
									className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
										currentPath === item.href
											? "text-blue-600 bg-blue-50"
											: "text-gray-700 hover:bg-gray-50"
									}`}
									onClick={() => setIsMobileMenuOpen(false)}
								>
									<div>
										<div>{item.label}</div>
										<div className="text-xs text-gray-500 mt-1">
											{item.description}
										</div>
									</div>
								</Link>
							))}
							<a
								href="https://github.com/xn030523/Go-Email"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
								onClick={() => setIsMobileMenuOpen(false)}
							>
								<GitHubIcon className="w-4 h-4" />
								<div>
									<div>GitHub</div>
									<div className="text-xs text-gray-500 mt-1">
										查看开源代码
									</div>
								</div>
							</a>
							<div className="pt-2">
								<Button
									asChild
									className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
								>
									<Link to="/">开始使用</Link>
								</Button>
							</div>
						</div>
					</nav>
				)}
			</div>
		</header>
	);
}
