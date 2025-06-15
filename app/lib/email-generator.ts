import randomName from "@scaleway/random-name";
import { customAlphabet } from "nanoid";
import { APP_CONFIG } from "~/config/app";

// 获取所有支持的域名
function getAllSupportedDomains(): string[] {
	// 优先使用 supportedDomains，它已经包含了所有域名
	if (APP_CONFIG.cloudflare.email.supportedDomains && APP_CONFIG.cloudflare.email.supportedDomains.length > 0) {
		return APP_CONFIG.cloudflare.email.supportedDomains;
	}

	// 如果没有 supportedDomains，则使用主域名 + 额外域名
	const domains = [APP_CONFIG.cloudflare.email.domain];
	if (APP_CONFIG.domain.additional) {
		domains.push(...APP_CONFIG.domain.additional);
	}
	// 去重
	return [...new Set(domains)];
}

// 智能域名选择策略
function selectDomain(strategy: string = "smart"): string {
	const domains = getAllSupportedDomains();

	console.log(`🎯 域名选择策略: ${strategy}, 可用域名:`, domains);

	switch (strategy) {
		case "random":
			// 随机选择：从所有域名中随机选择
			const randomDomain = domains[Math.floor(Math.random() * domains.length)];
			console.log(`🎲 随机选择域名: ${randomDomain}`);
			return randomDomain;

		case "manual":
			// 手动选择：这个函数不应该被调用，因为手动选择会直接传递域名
			console.log(`✋ 手动选择模式，返回主域名: ${APP_CONFIG.cloudflare.email.domain}`);
			return APP_CONFIG.cloudflare.email.domain;

		case "smart":
		default:
			// 智能选择：优先使用备用域名，分散主域名负载
			const primaryDomain = APP_CONFIG.cloudflare.email.domain;
			const additionalDomains = domains.filter(d => d !== primaryDomain);

			if (additionalDomains.length > 0) {
				// 80% 概率使用备用域名，20% 概率使用主域名
				const useAdditional = Math.random() < 0.8;
				if (useAdditional) {
					const selectedDomain = additionalDomains[Math.floor(Math.random() * additionalDomains.length)];
					console.log(`🧠 智能选择备用域名: ${selectedDomain}`);
					return selectedDomain;
				} else {
					console.log(`🧠 智能选择主域名: ${primaryDomain}`);
					return primaryDomain;
				}
			} else {
				console.log(`🧠 智能选择，无备用域名，使用主域名: ${primaryDomain}`);
				return primaryDomain;
			}
	}
}

export function generateRandomEmail(domainStrategy?: string): string {
	const name = randomName();
	const random = customAlphabet("0123456789", 4)();
	const strategy = domainStrategy || APP_CONFIG.domain.strategy;
	const domain = selectDomain(strategy);
	const email = `${name}-${random}@${domain}`;

	console.log(`📧 生成邮箱 - 策略: ${strategy}, 结果: ${email}`);
	return email;
}

export function generateEmailWithDomain(domain: string): string {
	const name = randomName();
	const random = customAlphabet("0123456789", 4)();
	const email = `${name}-${random}@${domain}`;

	console.log(`📧 生成指定域名邮箱 - 域名: ${domain}, 结果: ${email}`);
	return email;
}

export function getSupportedDomains(): string[] {
	return getAllSupportedDomains();
}
