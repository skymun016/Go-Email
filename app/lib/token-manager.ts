import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import type { ApiToken, NewApiToken } from "~/db/schema";
import { apiTokens } from "~/db/schema";
import { createDB, createApiToken, validateApiToken, useApiToken, getAllApiTokens, updateApiToken, deleteApiToken, getTokenUsageStats } from "~/lib/db";

// ==================== Token 管理器 ====================

export class TokenManager {
	private db: ReturnType<typeof createDB>;

	constructor(database: D1Database) {
		this.db = createDB(database);
	}

	// 生成新的API Token
	async generateToken(data: {
		name: string;
		usageLimit?: number;
		expiresAt?: Date | null;
	}): Promise<ApiToken> {
		return await createApiToken(this.db, data);
	}

	// 验证Token
	async validateToken(token: string): Promise<ApiToken | null> {
		return await validateApiToken(this.db, token);
	}

	// 使用Token（记录使用并扣除次数）
	async useToken(
		tokenId: string,
		email: string,
		ipAddress?: string,
		userAgent?: string
	): Promise<void> {
		await useApiToken(this.db, tokenId, email, ipAddress, userAgent);
	}

	// 获取所有Token
	async getAllTokens(): Promise<ApiToken[]> {
		return await getAllApiTokens(this.db);
	}

	// 更新Token
	async updateToken(
		tokenId: string,
		updates: {
			name?: string;
			usageLimit?: number;
			isActive?: boolean;
			expiresAt?: Date | null;
		}
	): Promise<void> {
		await updateApiToken(this.db, tokenId, updates);
	}

	// 删除Token
	async deleteToken(tokenId: string): Promise<void> {
		await deleteApiToken(this.db, tokenId);
	}

	// 获取Token使用统计
	async getTokenStats(tokenId: string) {
		return await getTokenUsageStats(this.db, tokenId);
	}

	// 重置Token使用次数
	async resetTokenUsage(tokenId: string): Promise<void> {
		// 直接使用数据库更新，因为updateApiToken不支持usageCount
		await this.db
			.update(apiTokens)
			.set({ usageCount: 0 })
			.where(eq(apiTokens.id, tokenId));
	}

	// 增加Token使用次数限制
	async addTokenUsage(tokenId: string, additionalUsage: number): Promise<void> {
		const tokens = await this.db
			.select()
			.from(apiTokens)
			.where(eq(apiTokens.id, tokenId))
			.limit(1);

		if (tokens.length > 0) {
			const newLimit = (tokens[0].usageLimit || 0) + additionalUsage;
			await updateApiToken(this.db, tokenId, { usageLimit: newLimit });
		}
	}

	// 检查Token是否可用
	async isTokenUsable(token: string): Promise<{
		usable: boolean;
		reason?: string;
		remainingUsage?: number;
	}> {
		const apiToken = await this.validateToken(token);

		if (!apiToken) {
			return { usable: false, reason: "Token不存在或无效" };
		}

		if (!apiToken.isActive) {
			return { usable: false, reason: "Token已被禁用" };
		}

		if (apiToken.expiresAt && new Date() > apiToken.expiresAt) {
			return { usable: false, reason: "Token已过期" };
		}

		if (apiToken.usageLimit > 0) {
			const remainingUsage = apiToken.usageLimit - apiToken.usageCount;
			if (remainingUsage <= 0) {
				return { usable: false, reason: "Token使用次数已用完" };
			}
			return { usable: true, remainingUsage };
		}

		return { usable: true };
	}

	// 批量操作：启用/禁用多个Token
	async bulkToggleTokens(tokenIds: string[], isActive: boolean): Promise<void> {
		for (const tokenId of tokenIds) {
			await this.updateToken(tokenId, { isActive });
		}
	}

	// 获取Token使用情况概览
	async getTokensOverview(): Promise<{
		total: number;
		active: number;
		expired: number;
		exhausted: number;
	}> {
		const tokens = await this.getAllTokens();
		const now = new Date();

		let active = 0;
		let expired = 0;
		let exhausted = 0;

		for (const token of tokens) {
			if (!token.isActive) continue;

			if (token.expiresAt && now > token.expiresAt) {
				expired++;
			} else if (token.usageLimit > 0 && token.usageCount >= token.usageLimit) {
				exhausted++;
			} else {
				active++;
			}
		}

		return {
			total: tokens.length,
			active,
			expired,
			exhausted,
		};
	}
}

// ==================== 工具函数 ====================

// 生成Token字符串
export function generateTokenString(): string {
	return `gm_${nanoid(32)}`;
}

// 解析Token信息
export function parseTokenInfo(token: string): {
	isValid: boolean;
	prefix?: string;
	id?: string;
} {
	if (!token.startsWith("gm_")) {
		return { isValid: false };
	}

	const parts = token.split("_");
	if (parts.length !== 2 || parts[1].length !== 32) {
		return { isValid: false };
	}

	return {
		isValid: true,
		prefix: parts[0],
		id: parts[1],
	};
}

// 格式化Token显示（隐藏部分字符）
export function formatTokenForDisplay(token: string): string {
	if (token.length <= 10) return token;

	const start = token.substring(0, 6);
	const end = token.substring(token.length - 4);
	const middle = "*".repeat(Math.min(token.length - 10, 20));

	return `${start}${middle}${end}`;
}

// 验证Token格式
export function isValidTokenFormat(token: string): boolean {
	return parseTokenInfo(token).isValid;
}
