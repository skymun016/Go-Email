/**
 * GoMail 首页 - 验证码获取系统
 */

import { Mail, Shield, Zap } from "lucide-react";
import React from "react";
import { Link } from "react-router";

import type { Route } from "./+types/home";
import { Button } from "~/components/ui/button";
import { WebApplicationStructuredData, OrganizationStructuredData, WebSiteStructuredData } from "~/components/StructuredData";

// 简化的loader，只返回基本信息
export async function loader({ request }: Route.LoaderArgs) {
	return {
		title: "验证码获取系统"
	};
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
			{/* SEO结构化数据 */}
			<WebApplicationStructuredData />
			<OrganizationStructuredData />
			<WebSiteStructuredData />
			
			{/* 主要内容 */}
			<main className="flex items-center justify-center min-h-screen px-4">
				<div className="text-center space-y-8 max-w-4xl mx-auto">
					{/* 主图标 */}
					<div className="flex justify-center mb-8">
						<div className="bg-gradient-to-r from-blue-600 to-cyan-600 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl">
							<Mail className="h-12 w-12 text-white" />
						</div>
					</div>

					{/* 主标题 */}
					<div className="space-y-4">
						<h1 className="text-5xl md:text-7xl font-bold">
							<span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
								验证码获取系统
							</span>
						</h1>
						
						{/* 副标题 */}
						<p className="text-xl md:text-2xl text-gray-600 font-medium">
							安全 · 快速 · 可靠
						</p>
					</div>

					{/* 装饰元素 */}
					<div className="flex justify-center items-center space-x-8 mt-12">
						<div className="flex items-center space-x-2 text-blue-600">
							<Shield className="h-6 w-6" />
							<span className="text-lg font-semibold">安全保护</span>
						</div>
						<div className="w-2 h-2 bg-blue-400 rounded-full"></div>
						<div className="flex items-center space-x-2 text-cyan-600">
							<Zap className="h-6 w-6" />
							<span className="text-lg font-semibold">极速响应</span>
						</div>
						<div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
						<div className="flex items-center space-x-2 text-blue-600">
							<Mail className="h-6 w-6" />
							<span className="text-lg font-semibold">邮件服务</span>
						</div>
					</div>

					{/* 操作按钮 */}
					<div className="flex justify-center items-center mt-16">
						<Link to="/verify-mailbox">
							<Button
								size="lg"
								className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-xl px-8 py-4 text-lg font-semibold"
							>
								开始使用
							</Button>
						</Link>
					</div>

					{/* 底部提示 */}
					<div className="mt-20 text-center">
						<div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200">
							<span className="text-blue-700 text-sm font-medium">
								🚀 专业的验证码接收服务平台
							</span>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
