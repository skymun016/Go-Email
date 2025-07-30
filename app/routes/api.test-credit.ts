import { data } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    switch (action) {
      case "test": {
        return data({
          success: true,
          message: "测试API工作正常",
          timestamp: new Date().toISOString()
        });
      }

      default:
        return data({ success: false, error: "无效的action参数" }, { status: 400 });
    }

  } catch (error) {
    console.error("API错误:", error);
    return data({
      success: false,
      error: "服务器内部错误"
    }, { status: 500 });
  }
}
