/**
 * 用户登出路由
 */

import type { Route } from "./+types/logout";
import { getUserSession, destroyUserSession } from "~/lib/auth";

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  
  try {
    const session = await getUserSession(request.headers.get("Cookie"), env);
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": await destroyUserSession(session, env),
      },
    });
  } catch (error) {
    console.error("登出失败:", error);
    // 即使登出失败，也重定向到首页
    return new Response(null, {
      status: 302,
      headers: { Location: "/" }
    });
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  // GET请求也支持登出
  return action({ request, context } as Route.ActionArgs);
}
