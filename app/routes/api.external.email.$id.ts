import { requireApiToken } from "~/lib/auth";
import { TokenManager } from "~/lib/token-manager";
import { createDB, getEmailById, getEmailAttachments } from "~/lib/db";
import { getDatabase } from "~/config/app";

// ==================== API 响应类型 ====================

interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	remainingUsage?: number;
}

interface EmailDetail {
	id: string;
	fromAddress: string;
	toAddress: string;
	subject: string;
	textContent: string | null;
	htmlContent: string | null;
	receivedAt: string;
	isRead: boolean;
	size: number;
	attachments: Array<{
		id: string;
		filename: string;
		contentType: string;
		size: number;
		downloadUrl: string;
	}>;
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

// GET /api/external/email/:id - 获取邮件详情（外部API）
export async function loader({ request, params, context }: any) {
	try {
		const env = context.cloudflare.env;
		const emailId = params.id;

		// 验证邮件ID
		if (!emailId) {
			return new Response(
				JSON.stringify(createApiResponse(false, null, "Email ID is required")),
				{ 
					status: 400,
					headers: { "Content-Type": "application/json" }
				}
			);
		}

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

		// 创建数据库连接
		const db = createDB(getDatabase(env));

		// 获取邮件详情
		const email = await getEmailById(db, emailId);

		if (!email) {
			return new Response(
				JSON.stringify(createApiResponse(false, null, "Email not found")),
				{ 
					status: 404,
					headers: { "Content-Type": "application/json" }
				}
			);
		}

		// 获取邮件附件
		const attachments = await getEmailAttachments(db, emailId);

		// 记录Token使用
		const clientIP = request.headers.get("CF-Connecting-IP") ||
						request.headers.get("X-Forwarded-For") ||
						"unknown";
		const userAgent = request.headers.get("User-Agent") || "unknown";

		await tokenManager.useToken(apiToken.id, email.toAddress, clientIP, userAgent);

		// 计算剩余使用次数
		const remainingUsage = apiToken.usageLimit > 0 
			? Math.max(0, apiToken.usageLimit - (apiToken.usageCount + 1))
			: undefined;

		// 构造响应数据
		const responseData: EmailDetail = {
			id: email.id,
			fromAddress: email.fromAddress,
			toAddress: email.toAddress,
			subject: email.subject || "(无主题)",
			textContent: email.textContent,
			htmlContent: email.htmlContent,
			receivedAt: email.receivedAt.toISOString(),
			isRead: email.isRead,
			size: email.size,
			attachments: attachments.map(attachment => ({
				id: attachment.id,
				filename: attachment.filename || "attachment",
				contentType: attachment.contentType || "application/octet-stream",
				size: attachment.size || 0,
				downloadUrl: `/api/external/attachment/${attachment.id}`,
			})),
		};

		return new Response(
			JSON.stringify(createApiResponse(
				true, 
				responseData, 
				undefined, 
				"Email details retrieved successfully",
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
