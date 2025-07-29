import { createCookie, createMemorySessionStorage, redirect } from "react-router";
import { createWorkersKVSessionStorage } from "@react-router/cloudflare";
import bcrypt from "bcryptjs";
import { getKVNamespace, APP_CONFIG } from "~/config/app";
import { createDB, validateApiToken } from "~/lib/db";
import type { User } from "~/db/schema";

// ==================== Session 管理 ====================

type AdminSessionData = {
	adminId: string;
	username: string;
};

// 用户session数据类型
type UserSessionData = {
	userId: string;
	username: string;
	expiresAt?: string; // 用户账号过期时间
};

// 创建管理员session cookie
const adminSessionCookie = createCookie("__admin_session", {
	secrets: ["admin-session-secret"], // 在生产环境中应该从环境变量读取
	sameSite: "lax", // 改为 lax 以支持跨域重定向
	httpOnly: true,
	secure: false, // 暂时设为 false 用于调试
	maxAge: 60 * 60 * 24 * 7, // 7天
});

// 创建用户session cookie
const userSessionCookie = createCookie("__user_session", {
	secrets: ["user-session-secret"], // 在生产环境中应该从环境变量读取
	sameSite: "lax",
	httpOnly: true,
	secure: false, // 暂时设为 false 用于调试
	maxAge: 60 * 60 * 24 * 30, // 30天
});

// 创建开发环境的内存session存储
function createDevAdminSessionStorage() {
	return createMemorySessionStorage<AdminSessionData>({
		cookie: adminSessionCookie,
	});
}

// 创建生产环境的KV session存储
function createProdAdminSessionStorage(env: Env) {
	return createWorkersKVSessionStorage<AdminSessionData>({
		kv: getKVNamespace(env),
		cookie: adminSessionCookie,
	});
}

// 获取管理员session
export function getAdminSession(cookieHeader: string | null, env?: Env) {
	if (!env) {
		const { getSession } = createDevAdminSessionStorage();
		return getSession(cookieHeader);
	}

	const { getSession } = createProdAdminSessionStorage(env);
	return getSession(cookieHeader);
}

// 提交管理员session
export function commitAdminSession(session: any, env?: Env) {
	if (!env) {
		const { commitSession } = createDevAdminSessionStorage();
		return commitSession(session);
	}

	const { commitSession } = createProdAdminSessionStorage(env);
	return commitSession(session);
}

// 销毁管理员session
export function destroyAdminSession(session: any, env?: Env) {
	if (!env) {
		const { destroySession } = createDevAdminSessionStorage();
		return destroySession(session);
	}

	const { destroySession } = createProdAdminSessionStorage(env);
	return destroySession(session);
}

// ==================== 用户Session管理 ====================

// 创建开发环境的用户session存储
function createDevUserSessionStorage() {
	return createMemorySessionStorage<UserSessionData>({
		cookie: userSessionCookie,
	});
}

// 创建生产环境的用户session存储
function createProdUserSessionStorage(env: Env) {
	return createWorkersKVSessionStorage<UserSessionData>({
		kv: getKVNamespace(env),
		cookie: userSessionCookie,
	});
}

// 获取用户session
export function getUserSession(cookieHeader: string | null, env?: Env) {
	if (!env) {
		const { getSession } = createDevUserSessionStorage();
		return getSession(cookieHeader);
	}

	const { getSession } = createProdUserSessionStorage(env);
	return getSession(cookieHeader);
}

// 提交用户session
export function commitUserSession(session: any, env?: Env) {
	if (!env) {
		const { commitSession } = createDevUserSessionStorage();
		return commitSession(session);
	}

	const { commitSession } = createProdUserSessionStorage(env);
	return commitSession(session);
}

// 销毁用户session
export function destroyUserSession(session: any, env?: Env) {
	if (!env) {
		const { destroySession } = createDevUserSessionStorage();
		return destroySession(session);
	}

	const { destroySession } = createProdUserSessionStorage(env);
	return destroySession(session);
}

// ==================== 认证中间件 ====================

// 管理员认证中间件
export async function requireAdmin(request: Request, env: Env) {
	const session = await getAdminSession(request.headers.get("Cookie"), env);
	const adminId = session.get("adminId");

	if (!adminId) {
		// 获取当前页面URL作为返回地址
		const url = new URL(request.url);
		const returnTo = encodeURIComponent(url.pathname + url.search);
		return Response.redirect(`${url.origin}/admin-login?returnTo=${returnTo}`, 302);
	}

	const db = createDB(env.DB);
	const admin = await db.query.admins.findFirst({
		where: (admins, { eq }) => eq(admins.id, adminId),
	});

	if (!admin) {
		// 获取当前页面URL作为返回地址
		const url = new URL(request.url);
		const returnTo = encodeURIComponent(url.pathname + url.search);
		return Response.redirect(`${url.origin}/admin-login?returnTo=${returnTo}`, 302);
	}

	return admin;
}

// 用户认证中间件
export async function requireUser(request: Request, env: Env) {
	const session = await getUserSession(request.headers.get("Cookie"), env);
	const userId = session.get("userId");

	if (!userId) {
		throw new Response(null, {
			status: 302,
			headers: { Location: "/login" }
		});
	}

	const db = createDB(env.DB);
	const user = await db.query.users.findFirst({
		where: (users, { eq, and }) => and(
			eq(users.id, userId),
			eq(users.isActive, true)
		),
	});

	if (!user) {
		// 清除无效session
		throw new Response(null, {
			status: 302,
			headers: {
				Location: "/login",
				"Set-Cookie": await destroyUserSession(session, env)
			}
		});
	}

	// 检查用户是否过期
	if (user.expiresAt && new Date() > user.expiresAt) {
		throw new Response(null, {
			status: 302,
			headers: {
				Location: "/login",
				"Set-Cookie": await destroyUserSession(session, env)
			}
		});
	}

	return user;
}

// 可选用户认证（不强制登录）
export async function getOptionalUser(request: Request, env: Env) {
	try {
		return await requireUser(request, env);
	} catch (error) {
		// 如果是重定向错误，说明用户未登录，返回null
		if (error instanceof Response && error.status === 302) {
			return null;
		}
		throw error;
	}
}

// API Token认证中间件
export async function requireApiToken(request: Request, env: Env) {
	const authHeader = request.headers.get("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Response(
			JSON.stringify({ error: "Missing or invalid Authorization header" }),
			{
				status: 401,
				headers: { "Content-Type": "application/json" }
			}
		);
	}

	const token = authHeader.substring(7); // 移除 "Bearer " 前缀
	const db = createDB(env.DB);

	const apiToken = await validateApiToken(db, token);

	if (!apiToken) {
		throw new Response(
			JSON.stringify({ error: "Invalid or expired token" }),
			{
				status: 401,
				headers: { "Content-Type": "application/json" }
			}
		);
	}

	return apiToken;
}

// ==================== 工具函数 ====================

// 生成安全的随机密码
export function generateSecurePassword(length: number = 12): string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
	let password = "";

	for (let i = 0; i < length; i++) {
		password += charset.charAt(Math.floor(Math.random() * charset.length));
	}

	return password;
}

// 验证密码强度
export function validatePasswordStrength(password: string): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (password.length < 8) {
		errors.push("密码长度至少8位");
	}

	if (!/[a-z]/.test(password)) {
		errors.push("密码必须包含小写字母");
	}

	if (!/[A-Z]/.test(password)) {
		errors.push("密码必须包含大写字母");
	}

	if (!/[0-9]/.test(password)) {
		errors.push("密码必须包含数字");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

// 哈希密码
export async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, 10);
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(password, hash);
}
