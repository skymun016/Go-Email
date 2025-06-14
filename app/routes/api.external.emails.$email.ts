import { requireApiToken } from "~/lib/auth";
import { TokenManager } from "~/lib/token-manager";
import { createDB, getEmailsByAddress } from "~/lib/db";
import { getDatabase } from "~/config/app";

// ==================== API 响应类型 ====================

interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	remainingUsage?: number;
}

interface EmailSummary {
	id: string;
	fromAddress: string;
	subject: string;
	receivedAt: string;
	isRead: boolean;
	size: number;
	hasAttachments: boolean;
}

// ==================== 工具函数 ====================

// CORS头部
const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	'Access-Control-Max-Age': '86400'
};

// 创建带CORS的JSON响应
function createJsonResponse(body: string, status: number = 200): Response {
	return new Response(body, {
		status,
		headers: {
			"Content-Type": "application/json",
			...CORS_HEADERS
		},
	});
}

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

// OPTIONS - 处理预检请求
export async function options() {
	return new Response(null, {
		status: 204,
		headers: CORS_HEADERS
	});
}

// GET /api/external/emails/:email - 获取邮箱的邮件列表（外部API）
export async function loader({ request, params, context }: any) {
	try {
		const env = context.cloudflare.env;
		const email = params.email;

		// 验证邮箱地址
		if (!email) {
			return createJsonResponse(
				JSON.stringify(createApiResponse(false, null, "Email address is required")),
				400
			);
		}

		// 验证API Token
		const apiToken = await requireApiToken(request, env);

		// 检查Token是否可用
		const tokenManager = new TokenManager(getDatabase(env));
		const tokenStatus = await tokenManager.isTokenUsable(apiToken.token);

		if (!tokenStatus.usable) {
			return createJsonResponse(
				JSON.stringify(createApiResponse(false, null, tokenStatus.reason)),
				403
			);
		}

		// 创建数据库连接
		const db = createDB(getDatabase(env));

		// 获取邮件列表
		const emails = await getEmailsByAddress(db, email);

		// 记录Token使用
		const clientIP = request.headers.get("CF-Connecting-IP") ||
						request.headers.get("X-Forwarded-For") ||
						"unknown";
		const userAgent = request.headers.get("User-Agent") || "unknown";

		await tokenManager.useToken(apiToken.id, email, clientIP, userAgent);

		// 计算剩余使用次数
		const remainingUsage = apiToken.usageLimit > 0
			? Math.max(0, apiToken.usageLimit - (apiToken.usageCount + 1))
			: undefined;

		// 转换邮件数据格式
		const emailSummaries: EmailSummary[] = emails.map(email => ({
			id: email.id,
			fromAddress: email.fromAddress,
			subject: email.subject || "(无主题)",
			receivedAt: email.receivedAt.toISOString(),
			isRead: email.isRead,
			size: email.size,
			hasAttachments: false, // 暂时设为false，后续可以优化查询附件
		}));

		// 返回邮件列表
		const responseData = {
			email: email,
			totalCount: emailSummaries.length,
			emails: emailSummaries,
		};

		return createJsonResponse(
			JSON.stringify(createApiResponse(
				true,
				responseData,
				undefined,
				`Found ${emailSummaries.length} emails`,
				remainingUsage
			))
		);

	} catch (error) {
		console.error("External API Error:", error);

		// 如果是认证错误，直接返回
		if (error instanceof Response) {
			return error;
		}

		return createJsonResponse(
			JSON.stringify(createApiResponse(false, null, "Internal server error")),
			500
		);
	}
}
