
import { useEffect } from "react";
import { getBaiduAnalyticsConfig, loadBaiduAnalytics } from "~/config/analytics";
import { APP_CONFIG } from "~/config/app";

interface FooterProps {
	env?: Env;
}

export function Footer({ env }: FooterProps) {
	const analyticsConfig = getBaiduAnalyticsConfig(env);

	useEffect(() => {
		// 加载百度统计
		if (analyticsConfig.enabled) {
			loadBaiduAnalytics(analyticsConfig.id);
		}
	}, [analyticsConfig.enabled, analyticsConfig.id]);

	return (
		<footer className="bg-gray-900 text-white">
			<div className="container mx-auto px-4 py-6">
				<div className="text-center">
					<div className="text-sm text-gray-400">
						© 2024 {APP_CONFIG.project.displayName}. 保留所有权利.
					</div>
					{/* 百度统计链接 */}
					{analyticsConfig.enabled && analyticsConfig.id !== "YOUR_BAIDU_ANALYTICS_ID" && (
						<div className="mt-2">
							<a
								href={`https://tongji.baidu.com/web/welcome/ico?s=${analyticsConfig.id}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
							>
								网站统计
							</a>
						</div>
					)}
				</div>
			</div>
		</footer>
	);
}
