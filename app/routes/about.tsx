import { CheckCircleIcon, GlobeIcon, ShieldIcon, ZapIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

import type { Route } from "./+types/about";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "关于GoMail团队 - 致力于打造最安全的临时邮箱平台" },
		{
			name: "description",
			content:
				"了解GoMail团队和我们的使命：为全球用户提供免费、安全、无广告的临时邮箱服务。专注隐私保护，助力用户远离垃圾邮件困扰，打造最可靠的一次性邮箱平台。",
		},
	];
}

export default function About() {
	const features = [
		{
			icon: ZapIcon,
			title: "⚡ 秒速启用",
			description: "零等待时间，访问即得，让您的数字生活更加高效便捷",
		},
		{
			icon: ShieldIcon,
			title: "🛡️ 极致隐私",
			description: "军用级加密保护，零日志记录，您的隐私就是我们的承诺",
		},
		{
			icon: GlobeIcon,
			title: "🌍 全球畅通",
			description: "覆盖全球节点，无论身在何处都能享受稳定快速的服务",
		},
		{
			icon: CheckCircleIcon,
			title: "💎 永久免费",
			description: "承诺永久免费，无套路无广告，纯净体验值得信赖",
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
			{/* Hero Section */}
			<section className="py-10 sm:py-16 lg:py-20">
				<div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto px-3 sm:px-4 text-center">
					<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 mb-4 sm:mb-6">
						关于{" "}
						<span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
							GoMail
						</span>
					</h1>
					<p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8">
						GoMail 致力于为用户提供最安全、便捷的临时邮箱服务
						<br />
						<span className="text-blue-600 font-medium">保护隐私 · 拒绝垃圾邮件 · 即时可用</span>
					</p>
				</div>
			</section>

			{/* Features */}
			<section className="py-8 sm:py-16">
				<div className="max-w-screen-xl mx-auto px-3 sm:px-4">
					<h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-12">
						为什么选择 GoMail？
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
						{features.map((feature) => (
							<Card
								key={feature.title}
								className="text-center hover:shadow-lg transition-shadow"
							>
								<CardHeader className="pb-3 sm:pb-4">
									<feature.icon className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 text-blue-600 mx-auto mb-3 sm:mb-4" />
									<CardTitle className="text-lg sm:text-xl">
										{feature.title}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-gray-600 text-sm sm:text-base">
										{feature.description}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* Mission */}
			<section className="py-8 sm:py-16 bg-white">
				<div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto px-3 sm:px-4">
					<div className="text-center mb-8 sm:mb-12">
						<h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
							🎯 我们的使命
						</h2>
						<p className="text-base sm:text-lg text-gray-600 leading-relaxed">
							在这个信息爆炸的时代，<span className="text-blue-600 font-semibold">隐私保护</span>已成为每个人的基本权利。
							<br />
							GoMail 致力于打造最纯净、最安全的临时邮箱服务，让隐私保护变得简单而优雅。
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
						<div className="text-center">
							<div className="bg-gradient-to-br from-blue-100 to-blue-200 w-12 sm:w-14 lg:w-16 h-12 sm:h-14 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
								<span className="text-lg sm:text-xl lg:text-2xl">
									🚀
								</span>
							</div>
							<h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800">
								极简设计
							</h3>
							<p className="text-gray-600 text-sm sm:text-base">
								摒弃繁琐流程，追求极致简约，让每一次使用都是享受
							</p>
						</div>
						<div className="text-center">
							<div className="bg-gradient-to-br from-green-100 to-green-200 w-12 sm:w-14 lg:w-16 h-12 sm:h-14 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
								<span className="text-lg sm:text-xl lg:text-2xl">
									🔒
								</span>
							</div>
							<h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800">
								安全至上
							</h3>
							<p className="text-gray-600 text-sm sm:text-base">
								采用银行级安全标准，让您的每一份隐私都得到最强保护
							</p>
						</div>
						<div className="text-center">
							<div className="bg-gradient-to-br from-purple-100 to-purple-200 w-12 sm:w-14 lg:w-16 h-12 sm:h-14 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
								<span className="text-lg sm:text-xl lg:text-2xl">
									💡
								</span>
							</div>
							<h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800">
								持续创新
							</h3>
							<p className="text-gray-600 text-sm sm:text-base">
								永不止步的技术追求，为您带来更智能更贴心的服务体验
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-8 sm:py-16">
				<div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto px-3 sm:px-4 text-center">
					<h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
						🎉 开启您的隐私保护之旅
					</h2>
					<p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
						只需一键，即可拥有专属临时邮箱
						<br />
						<span className="text-blue-600 font-medium">让隐私保护从此变得简单优雅</span>
					</p>
					<Button
						asChild
						size="lg"
						className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300"
					>
						<Link to="/">🚀 立即体验</Link>
					</Button>
				</div>
			</section>
		</div>
	);
}
