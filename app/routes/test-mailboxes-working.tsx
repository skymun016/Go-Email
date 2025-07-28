import { data } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ context }: LoaderFunctionArgs) {
  return data({
    message: "测试邮箱页面工作正常",
    mailboxes: [
      {
        id: 1,
        email: "test@example.com",
        code: "123456"
      }
    ]
  });
}

export default function TestMailboxesWorking() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>测试邮箱管理页面</h1>
      <p>这是一个简化的测试页面，用于验证路由是否正常工作。</p>
      <div style={{ marginTop: '20px' }}>
        <h2>测试邮箱列表</h2>
        <ul>
          <li>test@example.com - 验证码: 123456</li>
        </ul>
      </div>
    </div>
  );
}
