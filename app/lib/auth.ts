import { createCookie, createMemorySessionStorage } from "react-router";
import { createWorkersKVSessionStorage } from "@react-router/cloudflare";
import bcrypt from "bcryptjs";
import { getKVNamespace } from "~/config/app";
import { createDB, validateApiToken } from "~/lib/db";

// ==================== Session 管理 ====================

type AdminSessionData = {
	adminId: string;
	username: string;
};

// 创建管理员session cookie
const adminSessionCookie = createCookie("__admin_session", {
	secrets: ["admin-session-secret"], // 在生产环境中应该从环境变量读取
	sameSite: true,
	httpOnly: true,
	secure: true,
	maxAge: 60 * 60 * 24 * 7, // 7天
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

// ==================== 认证中间件 ====================

// 管理员认证中间件
export async function requireAdmin(request: Request, env: Env) {
	const session = await getAdminSession(request.headers.get("Cookie"), env);
	const adminId = session.get("adminId");

	if (!adminId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const db = createDB(env.DB);
	const admin = await db.query.admins.findFirst({
		where: (admins, { eq }) => eq(admins.id, adminId),
	});

	if (!admin) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return admin;
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
