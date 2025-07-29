import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createDB } from "~/lib/db";
import { testMailboxes } from "~/db/schema";
import { eq } from "drizzle-orm";

// 创建JSON响应
function createJsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function action({ context }: ActionFunctionArgs) {
  try {
    console.log("开始批量更新测试邮箱的注册状态...");
    
    // 创建数据库连接
    const db = createDB(context.cloudflare.env.DB);
    
    // 更新所有 registrationStatus 为 'registered' 的记录
    const result = await db
      .update(testMailboxes)
      .set({ registrationStatus: 'unregistered' })
      .where(eq(testMailboxes.registrationStatus, 'registered'));
    
    console.log(`✅ 成功更新了记录的注册状态`);
    
    return createJsonResponse({
      success: true,
      message: "成功更新所有记录的注册状态为'未注册'"
    });
    
  } catch (error) {
    console.error("❌ 更新失败:", error);
    return createJsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    }, 500);
  }
}

// 允许GET请求用于测试
export async function loader({ context }: LoaderFunctionArgs) {
  try {
    console.log("开始批量更新测试邮箱的注册状态...");

    // 创建数据库连接
    const db = createDB(context.cloudflare.env.DB);

    // 更新所有 registrationStatus 为 'registered' 的记录
    const result = await db
      .update(testMailboxes)
      .set({ registrationStatus: 'unregistered' })
      .where(eq(testMailboxes.registrationStatus, 'registered'));

    console.log(`✅ 成功更新了记录的注册状态`);

    return createJsonResponse({
      success: true,
      message: "成功更新所有记录的注册状态为'未注册'"
    });

  } catch (error) {
    console.error("❌ 更新失败:", error);
    return createJsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    }, 500);
  }
}
