import { requireApiToken } from "~/lib/auth";
import { TokenManager } from "~/lib/token-manager";
import { createDB, getOrCreateMailbox } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { generateRandomEmail } from "~/lib/email-generator";

// ==================== API 响应类型 ====================

interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	remainingUsage?: number;
}

// ==================== 工具函数 ====================

function createApiResponse<T>(
	success: boolean,
	data?: T,
	error?: string,
	message?: string,
	remainingUsage?: number
): ApiResponse<T> {
	return {
		success,
		...(data && { data }),
		...(error && { error }),
		...(message && { message }),
		...(remainingUsage !== undefined && { remainingUsage }),
	};
}

// ==================== API 处理函数 ====================

// POST /api/external/mailbox - 创建临时邮箱（外部API）
export async function action({ request, context }: any) {
	try {
		const env = context.cloudflare.env;

		// 验证API Token
		const apiToken = await requireApiToken(request, env);

		// 检查Token是否可用
		const tokenManager = new TokenManager(getDatabase(env));
		const tokenStatus = await tokenManager.isTokenUsable(apiToken.token);

		if (!tokenStatus.usable) {
			return new Response(
				JSON.stringify(createApiResponse(false, null, tokenStatus.reason)),
				{
					status: 403,
					headers: { "Content-Type": "application/json" }
				}
			);
		}

		// 获取请求参数
		const body = await request.json().catch(() => ({}));
		const { prefix, domain } = body;

		// 创建数据库连接
		const db = createDB(getDatabase(env));

		// 生成或创建邮箱
		let emailAddress: string;
		if (prefix && domain) {
			// 使用指定的前缀和域名
			emailAddress = `${prefix}@${domain}`;
		} else {
			// 自动生成邮箱地址
			emailAddress = generateRandomEmail();
		}

		// 创建邮箱
		const mailbox = await getOrCreateMailbox(db, emailAddress);

		// 记录Token使用
		const clientIP = request.headers.get("CF-Connecting-IP") ||
						request.headers.get("X-Forwarded-For") ||
						"unknown";
		const userAgent = request.headers.get("User-Agent") || "unknown";

		await tokenManager.useToken(apiToken.id, emailAddress, clientIP, userAgent);

		// 计算剩余使用次数
		const remainingUsage = apiToken.usageLimit > 0
			? Math.max(0, apiToken.usageLimit - (apiToken.usageCount + 1))
			: undefined;

		// 返回邮箱信息
		const responseData = {
			id: mailbox.id,
			email: mailbox.email,
			createdAt: mailbox.createdAt.toISOString(),
			expiresAt: mailbox.expiresAt.toISOString(),
			isActive: mailbox.isActive,
		};

		return new Response(
			JSON.stringify(createApiResponse(
				true,
				responseData,
				undefined,
				"Mailbox created successfully",
				remainingUsage
			)),
			{
				status: 200,
				headers: { "Content-Type": "application/json" }
			}
		);

	} catch (error) {
		console.error("External API Error:", error);

		// 如果是认证错误，直接返回
		if (error instanceof Response) {
			return error;
		}

		return new Response(
			JSON.stringify(createApiResponse(false, null, "Internal server error")),
			{
				status: 500,
				headers: { "Content-Type": "application/json" }
			}
		);
	}
}

// GET /api/external/mailbox - 获取API使用信息
export async function loader({ request, context }: any) {
	try {
		const env = context.cloudflare.env;

		// 验证API Token
		const apiToken = await requireApiToken(request, env);

		// 获取Token状态
		const tokenManager = new TokenManager(getDatabase(env));
		const tokenStatus = await tokenManager.isTokenUsable(apiToken.token);

		// 返回Token信息
		const responseData = {
			tokenName: apiToken.name,
			usageLimit: apiToken.usageLimit,
			usageCount: apiToken.usageCount,
			remainingUsage: apiToken.usageLimit > 0
				? Math.max(0, apiToken.usageLimit - apiToken.usageCount)
				: null,
			isActive: apiToken.isActive,
			expiresAt: apiToken.expiresAt?.toISOString() || null,
			lastUsedAt: apiToken.lastUsedAt?.toISOString() || null,
			usable: tokenStatus.usable,
			reason: tokenStatus.reason,
		};

		return new Response(
			JSON.stringify(createApiResponse(true, responseData, undefined, "Token information retrieved")),
			{
				status: 200,
				headers: { "Content-Type": "application/json" }
			}
		);

	} catch (error) {
		console.error("External API Error:", error);

		// 如果是认证错误，直接返回
		if (error instanceof Response) {
			return error;
		}

		return new Response(
			JSON.stringify(createApiResponse(false, null, "Internal server error")),
			{
				status: 500,
				headers: { "Content-Type": "application/json" }
			}
		);
	}
}
