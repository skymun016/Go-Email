// GoMail 应用配置模板
// 此文件由 config.example.cjs 自动生成
// 请复制 config.example.cjs 为 config.cjs 并运行 npm run generate-configs

export const APP_CONFIG = {
	site: {
		name: "GoMail",
		description: "现代化临时邮箱服务",
		url: "https://your-domain.com",
		domain: "your-domain.com",
	},
	email: {
		expirationHours: 24,
		cleanupIntervalHours: 1,
		maxAttachmentSizeMB: 25,
	},
	ui: {
		primaryColor: "#2563eb",
		autoRefreshInterval: 10,
		brandName: "GoMail",
		tagline: "临时邮箱服务",
	},
	features: {
		attachments: true,
		emailPreview: true,
		analytics: true,
		devEmailHandler: true,
	},
	seo: {
		title: "GoMail - 免费临时邮箱生成器",
		description: "GoMail提供最专业的免费临时邮箱服务",
		keywords: "临时邮箱,一次性邮箱,免费邮箱",
		ogImage: "/og-image.png",
		twitterCard: "summary_large_image",
	},
};

export function getKVNamespace(context: any) {
	console.warn("⚠️ 使用默认配置，请运行 npm run generate-configs 生成正确的配置");
	return context.cloudflare?.env?.["gomail-kv"];
}

export function getDatabase(context: any) {
	console.warn("⚠️ 使用默认配置，请运行 npm run generate-configs 生成正确的配置");
	return context.cloudflare?.env?.DB;
}

export function getR2Bucket(context: any) {
	console.warn("⚠️ 使用默认配置，请运行 npm run generate-configs 生成正确的配置");
	return context.cloudflare?.env?.["gomail-attachments"];
}
