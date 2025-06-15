// 错误处理工具函数

export enum ErrorCode {
	// 通用错误
	UNKNOWN_ERROR = 'UNKNOWN_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	
	// 数据库错误
	DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
	DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
	
	// 认证错误
	INVALID_TOKEN = 'INVALID_TOKEN',
	TOKEN_EXPIRED = 'TOKEN_EXPIRED',
	TOKEN_EXHAUSTED = 'TOKEN_EXHAUSTED',
	UNAUTHORIZED = 'UNAUTHORIZED',
	
	// 邮箱错误
	INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
	MAILBOX_NOT_FOUND = 'MAILBOX_NOT_FOUND',
	EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
	
	// 附件错误
	ATTACHMENT_TOO_LARGE = 'ATTACHMENT_TOO_LARGE',
	ATTACHMENT_UPLOAD_FAILED = 'ATTACHMENT_UPLOAD_FAILED',
	
	// 限制错误
	RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
	QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

export interface AppError {
	code: ErrorCode;
	message: string;
	details?: any;
	timestamp: string;
	requestId?: string;
}

export class AppErrorClass extends Error {
	public readonly code: ErrorCode;
	public readonly details?: any;
	public readonly timestamp: string;
	public readonly requestId?: string;

	constructor(code: ErrorCode, message: string, details?: any, requestId?: string) {
		super(message);
		this.name = 'AppError';
		this.code = code;
		this.details = details;
		this.timestamp = new Date().toISOString();
		this.requestId = requestId;
	}

	toJSON(): AppError {
		return {
			code: this.code,
			message: this.message,
			details: this.details,
			timestamp: this.timestamp,
			requestId: this.requestId,
		};
	}
}

// 错误处理函数
export function handleError(error: unknown, context?: string): AppError {
	const timestamp = new Date().toISOString();
	
	// 如果已经是我们的错误类型
	if (error instanceof AppErrorClass) {
		return error.toJSON();
	}

	// 如果是标准Error
	if (error instanceof Error) {
		// 根据错误消息判断错误类型
		if (error.message.includes('Database')) {
			return {
				code: ErrorCode.DATABASE_CONNECTION_ERROR,
				message: `Database error${context ? ` in ${context}` : ''}: ${error.message}`,
				details: { originalError: error.message },
				timestamp,
			};
		}

		if (error.message.includes('Invalid email')) {
			return {
				code: ErrorCode.INVALID_EMAIL_FORMAT,
				message: error.message,
				timestamp,
			};
		}

		if (error.message.includes('Token')) {
			return {
				code: ErrorCode.INVALID_TOKEN,
				message: error.message,
				timestamp,
			};
		}

		// 通用错误
		return {
			code: ErrorCode.UNKNOWN_ERROR,
			message: `${context ? `${context}: ` : ''}${error.message}`,
			details: { originalError: error.message },
			timestamp,
		};
	}

	// 未知错误类型
	return {
		code: ErrorCode.UNKNOWN_ERROR,
		message: `Unknown error${context ? ` in ${context}` : ''}: ${String(error)}`,
		details: { originalError: error },
		timestamp,
	};
}

// API响应错误格式化
export function formatApiError(error: AppError, statusCode: number = 500): Response {
	const headers = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	};

	return new Response(
		JSON.stringify({
			success: false,
			error: error.message,
			code: error.code,
			timestamp: error.timestamp,
			...(error.details && { details: error.details }),
		}),
		{
			status: statusCode,
			headers,
		}
	);
}

// 根据错误代码获取HTTP状态码
export function getHttpStatusFromErrorCode(code: ErrorCode): number {
	switch (code) {
		case ErrorCode.VALIDATION_ERROR:
		case ErrorCode.INVALID_EMAIL_FORMAT:
			return 400;
			
		case ErrorCode.UNAUTHORIZED:
		case ErrorCode.INVALID_TOKEN:
		case ErrorCode.TOKEN_EXPIRED:
			return 401;
			
		case ErrorCode.TOKEN_EXHAUSTED:
		case ErrorCode.QUOTA_EXCEEDED:
			return 403;
			
		case ErrorCode.MAILBOX_NOT_FOUND:
		case ErrorCode.EMAIL_NOT_FOUND:
			return 404;
			
		case ErrorCode.RATE_LIMIT_EXCEEDED:
			return 429;
			
		case ErrorCode.DATABASE_CONNECTION_ERROR:
		case ErrorCode.DATABASE_QUERY_ERROR:
		case ErrorCode.ATTACHMENT_UPLOAD_FAILED:
		case ErrorCode.UNKNOWN_ERROR:
		default:
			return 500;
	}
}

// 日志记录函数
export function logError(error: AppError, context?: string): void {
	const logLevel = getLogLevel(error.code);
	const logMessage = `[${logLevel}] ${error.code}: ${error.message}`;
	
	if (context) {
		console.log(`Context: ${context}`);
	}
	
	switch (logLevel) {
		case 'ERROR':
			console.error(logMessage, error.details);
			break;
		case 'WARN':
			console.warn(logMessage, error.details);
			break;
		case 'INFO':
		default:
			console.log(logMessage, error.details);
			break;
	}
}

function getLogLevel(code: ErrorCode): 'ERROR' | 'WARN' | 'INFO' {
	switch (code) {
		case ErrorCode.DATABASE_CONNECTION_ERROR:
		case ErrorCode.DATABASE_QUERY_ERROR:
		case ErrorCode.UNKNOWN_ERROR:
			return 'ERROR';
			
		case ErrorCode.INVALID_TOKEN:
		case ErrorCode.TOKEN_EXPIRED:
		case ErrorCode.TOKEN_EXHAUSTED:
		case ErrorCode.VALIDATION_ERROR:
			return 'WARN';
			
		default:
			return 'INFO';
	}
}

// 重试机制
export async function withRetry<T>(
	operation: () => Promise<T>,
	maxRetries: number = 3,
	delay: number = 1000
): Promise<T> {
	let lastError: unknown;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			
			if (attempt === maxRetries) {
				break;
			}
			
			console.warn(`操作失败，第 ${attempt} 次重试 (最多 ${maxRetries} 次):`, error);
			await new Promise(resolve => setTimeout(resolve, delay * attempt));
		}
	}
	
	throw lastError;
}
