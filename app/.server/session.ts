import { createWorkersKVSessionStorage } from "@react-router/cloudflare";
import { createCookie, createMemorySessionStorage } from "react-router";
import { getKVNamespace } from "~/config/app";

type SessionData = {
	email: string;
};

// 创建开发环境的内存 session 存储
function createDevSessionStorage() {
	const sessionCookie = createCookie("__session", {
		secrets: ["dev-secret-key"],
		sameSite: true,
	});

	return createMemorySessionStorage<SessionData>({
		cookie: sessionCookie,
	});
}

// 创建 session 存储的工厂函数
export function createSessionStorage(env: Env) {
	const sessionCookie = createCookie("__session", {
		secrets: [env.SESSION_SECRET],
		sameSite: true,
	});

	return createWorkersKVSessionStorage<SessionData>({
		kv: getKVNamespace(env),
		cookie: sessionCookie,
	});
}

// 为了向后兼容，导出一个使用环境变量的版本
export function getSession(cookieHeader: string | null, env?: Env) {
	if (!env) {
		// 开发环境，使用内存存储
		const { getSession } = createDevSessionStorage();
		return getSession(cookieHeader);
	}

	const { getSession } = createSessionStorage(env);
	return getSession(cookieHeader);
}

export function commitSession(session: any, env?: Env) {
	if (!env) {
		// 开发环境，使用内存存储
		const { commitSession } = createDevSessionStorage();
		return commitSession(session);
	}

	const { commitSession } = createSessionStorage(env);
	return commitSession(session);
}

export function destroySession(session: any, env?: Env) {
	if (!env) {
		// 开发环境，使用内存存储
		const { destroySession } = createDevSessionStorage();
		return destroySession(session);
	}

	const { destroySession } = createSessionStorage(env);
	return destroySession(session);
}
