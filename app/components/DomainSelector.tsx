import { useState } from "react";
import { useFetcher } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Globe, Shuffle, Target, User, Loader2 } from "lucide-react";

interface DomainSelectorProps {
	domains: string[];
	currentDomain?: string;
	strategy?: string;
	onStateChange?: (strategy: string, domain: string) => void;
}

export function DomainSelector({
	domains,
	currentDomain,
	strategy = "smart",
	onStateChange,
}: DomainSelectorProps) {
	const fetcher = useFetcher();
	const [selectedStrategy, setSelectedStrategy] = useState(strategy);
	const [selectedDomain, setSelectedDomain] = useState(currentDomain || domains[0]);

	// 检查是否正在提交
	const isSubmitting = fetcher.state === "submitting";

	const strategies = [
		{
			value: "smart",
			label: "🎯 智能选择",
			description: "自动选择最佳域名",
			icon: Target,
		},
		{
			value: "random",
			label: "🎲 随机选择",
			description: "每次随机选择域名",
			icon: Shuffle,
		},
		{
			value: "manual",
			label: "👤 手动选择",
			description: "手动指定域名",
			icon: User,
		},
	];

	// 策略改变时立即生成新邮箱
	const handleStrategyChange = (newStrategy: string) => {
		setSelectedStrategy(newStrategy);

		// 通知父组件状态变化
		onStateChange?.(newStrategy, selectedDomain);

		// 立即提交表单生成新邮箱
		const formData = new FormData();
		formData.append("action", "generate");
		formData.append("strategy", newStrategy);

		// 如果是手动选择，传递当前选中的域名
		if (newStrategy === "manual") {
			formData.append("domain", selectedDomain);
		}

		fetcher.submit(formData, { method: "post" });
	};

	// 域名改变时立即生成新邮箱（仅在手动模式下）
	const handleDomainChange = (newDomain: string) => {
		setSelectedDomain(newDomain);

		// 通知父组件状态变化
		onStateChange?.(selectedStrategy, newDomain);

		// 如果是手动选择模式，立即生成新邮箱
		if (selectedStrategy === "manual") {
			const formData = new FormData();
			formData.append("action", "generate");
			formData.append("strategy", "manual");
			formData.append("domain", newDomain);

			fetcher.submit(formData, { method: "post" });
		}
	};

	return (
		<Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50">
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center space-x-3 text-lg">
					<div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-2.5 shadow-lg">
						<Globe className="h-5 w-5 text-white" />
					</div>
					<span className="text-gray-800 font-bold">🌐 域名选择</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-6">
				{/* 策略选择 */}
				<div className="space-y-3">
					<label className="text-sm font-semibold text-gray-700">
						📋 选择策略 {isSubmitting && <span className="text-purple-600">⚡ 生成中...</span>}
					</label>
					<div className="grid grid-cols-1 gap-2">
						{strategies.map((strategyOption) => {
							const Icon = strategyOption.icon;
							const isSelected = selectedStrategy === strategyOption.value;
							const isCurrentlySubmitting = isSubmitting && isSelected;

							return (
								<button
									key={strategyOption.value}
									type="button"
									onClick={() => handleStrategyChange(strategyOption.value)}
									disabled={isSubmitting}
									className={`p-3 rounded-lg border-2 transition-all text-left relative ${
										isSelected
											? "border-purple-500 bg-purple-50 shadow-md"
											: "border-gray-200 hover:border-purple-300 hover:bg-purple-25"
									} ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
								>
									<div className="flex items-center space-x-3">
										{isCurrentlySubmitting ? (
											<Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
										) : (
											<Icon className="h-4 w-4 text-purple-600" />
										)}
										<div className="flex-1">
											<div className="font-medium text-sm">
												{strategyOption.label}
											</div>
											<div className="text-xs text-gray-600">
												{strategyOption.description}
											</div>
										</div>
										{isSelected && (
											<Badge className="bg-purple-500 text-white">
												{isCurrentlySubmitting ? "生成中" : "已选择"}
											</Badge>
										)}
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* 手动域名选择 */}
				{selectedStrategy === "manual" && (
					<div className="space-y-3">
						<label className="text-sm font-semibold text-gray-700">
							🎯 选择域名 {isSubmitting && <span className="text-purple-600">⚡ 生成中...</span>}
						</label>
						<select
							value={selectedDomain}
							onChange={(e) => handleDomainChange(e.target.value)}
							disabled={isSubmitting}
							className={`w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
								isSubmitting ? "opacity-75 cursor-not-allowed" : ""
							}`}
						>
							{domains.map((domain) => (
								<option key={domain} value={domain}>
									🌐 {domain}
								</option>
							))}
						</select>
					</div>
				)}

				{/* 域名列表 */}
				<div className="space-y-3">
					<label className="text-sm font-semibold text-gray-700">
						📊 可用域名 ({domains.length}个)
					</label>
					<div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
						{domains.map((domain, index) => (
							<div
								key={domain}
								className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
							>
								<div className="flex items-center space-x-2">
									<span className="text-blue-600">🌐</span>
									<span className="font-mono text-xs text-gray-700">
										{domain}
									</span>
								</div>
								<Badge
									variant={index === 0 ? "default" : "secondary"}
									className="text-xs"
								>
									{index === 0 ? "主域名" : `备用${index}`}
								</Badge>
							</div>
						))}
					</div>
				</div>

				{/* 使用说明 */}
				<div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
					<div className="flex items-start gap-3">
						<div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
							<span className="text-white text-sm">💡</span>
						</div>
						<div className="text-sm">
							<p className="font-bold text-purple-800 mb-1">
								⚡ 即选即用
							</p>
							<p className="text-purple-700 leading-relaxed">
								选择策略或域名后会立即生成新邮箱，无需额外确认步骤。
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
