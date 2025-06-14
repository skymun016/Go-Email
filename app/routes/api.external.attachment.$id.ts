import { requireApiToken } from "~/lib/auth";
import { TokenManager } from "~/lib/token-manager";
import { createDB, getAttachmentById } from "~/lib/db";
import { getDatabase, getR2Bucket } from "~/config/app";
import { emails } from "~/db/schema";
import { eq } from "drizzle-orm";

// ==================== API 响应类型 ====================

interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

// ==================== 工具函数 ====================

function createApiResponse<T>(
	success: boolean,
	data?: T,
	error?: string,
	message?: string
): ApiResponse<T> {
	return {
		success,
		...(data && { data }),
		...(error && { error }),
		...(message && { message }),
	};
}

// ==================== API 处理函数 ====================

// GET /api/external/attachment/:id - 下载附件（外部API）
export async function loader({ request, params, context }: any) {
	try {
		const env = context.cloudflare.env;
		const attachmentId = params.id;

		// 验证附件ID
		if (!attachmentId) {
			return new Response(
				JSON.stringify(createApiResponse(false, null, "Attachment ID is required")),
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

		// 获取附件信息和内容
		const r2Bucket = getR2Bucket(env);
		const result = await getAttachmentById(attachmentId, getDatabase(env), r2Bucket);

		if (!result) {
			return new Response(
				JSON.stringify(createApiResponse(false, null, "Attachment not found")),
				{ 
					status: 404,
					headers: { "Content-Type": "application/json" }
				}
			);
		}

		const { attachment, content } = result;

		if (!content) {
			return new Response(
				JSON.stringify(createApiResponse(false, null, "Attachment file not found")),
				{ 
					status: 404,
					headers: { "Content-Type": "application/json" }
				}
			);
		}

		// 记录Token使用
		const clientIP = request.headers.get("CF-Connecting-IP") ||
						request.headers.get("X-Forwarded-For") ||
						"unknown";
		const userAgent = request.headers.get("User-Agent") || "unknown";

		// 这里使用附件所属邮件的收件人地址
		const db = createDB(getDatabase(env));
		const emailResult = await db
			.select()
			.from(emails)
			.where(eq(emails.id, attachment.emailId))
			.limit(1);

		const email = emailResult.length > 0 ? emailResult[0] : null;

		if (email) {
			await tokenManager.useToken(apiToken.id, email.toAddress, clientIP, userAgent);
		}

		// 返回附件内容
		const headers = new Headers();
		headers.set("Content-Type", attachment.contentType || "application/octet-stream");
		headers.set("Content-Length", (attachment.size || 0).toString());
		headers.set("Content-Disposition", `attachment; filename="${attachment.filename || "attachment"}"`);
		headers.set("Cache-Control", "public, max-age=3600"); // 缓存1小时

		return new Response(content.body, {
			status: 200,
			headers,
		});

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
