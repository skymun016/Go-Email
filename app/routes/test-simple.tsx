/**
 * 简单测试页面
 */

import type { Route } from "./+types/test-simple";

export async function loader({ context }: Route.LoaderArgs) {
  return {
    message: "测试页面加载成功"
  };
}

export default function TestSimple({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          简单测试页面
        </h1>
        <p className="text-gray-600">
          {loaderData.message}
        </p>
      </div>
    </div>
  );
}
