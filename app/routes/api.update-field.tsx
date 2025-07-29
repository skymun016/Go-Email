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

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const mailboxId = formData.get('mailboxId') as string;
    const fieldName = formData.get('fieldName') as string;
    const fieldValue = formData.get('fieldValue') as string;

    console.log('API收到请求:', { mailboxId, fieldName, fieldValue });

    if (!mailboxId || !fieldName) {
      return createJsonResponse({
        success: false,
        message: '邮箱ID和字段名称不能为空'
      }, 400);
    }

    // 创建数据库连接
    const db = createDB(context.cloudflare.env.DB);

    const updateData: any = {
      updatedAt: new Date()
    };

    // 根据字段名称设置更新值
    switch (fieldName) {
      case 'remark':
        updateData.remark = fieldValue || null;
        break;
      case 'registrationStatus':
        updateData.registrationStatus = fieldValue === 'clear' ? null : fieldValue;
        break;
      case 'count':
        updateData.count = fieldValue === 'clear' ? null : fieldValue;
        break;
      case 'saleStatus':
        updateData.saleStatus = fieldValue === 'clear' ? null : fieldValue;
        break;
      default:
        return createJsonResponse({
          success: false,
          message: '无效的字段名称'
        }, 400);
    }

    await db
      .update(testMailboxes)
      .set(updateData)
      .where(eq(testMailboxes.id, parseInt(mailboxId)));

    return createJsonResponse({
      success: true,
      message: '字段已更新'
    });

  } catch (error) {
    console.error("更新字段失败:", error);
    return createJsonResponse({
      success: false,
      message: `更新字段失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, 500);
  }
}

// 处理GET请求（返回405错误）
export async function loader({ request }: LoaderFunctionArgs) {
  return createJsonResponse({
    success: false,
    message: '此端点仅支持POST请求'
  }, 405);
}
