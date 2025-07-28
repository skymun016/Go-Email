/**
 * 管理员页面：导入测试邮箱数据
 */

import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { testMailboxes } from "~/db/schema";
import { data } from "react-router";

// 解析direct-links数据
function parseDirectLinksData(rawData: string) {
  const lines = rawData.split('\n');
  const mailboxes = [];
  
  for (const line of lines) {
    // 跳过注释行和空行
    if (line.startsWith('#') || line.startsWith('##') || line.trim() === '') {
      continue;
    }
    
    // 解析格式: email -> directLink
    const match = line.match(/^(.+?)\s*->\s*(.+)$/);
    if (match) {
      const email = match[1].trim();
      const directLink = match[2].trim();
      
      // 提取验证码
      const codeMatch = directLink.match(/code=([^&]+)/);
      const verificationCode = codeMatch ? decodeURIComponent(codeMatch[1]) : '';
      
      // 分离邮箱前缀和域名
      const [prefix, domain] = email.split('@');
      
      if (prefix && domain && verificationCode) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天后过期

        mailboxes.push({
          email,
          verificationCode,
          domain,
          prefix,
          directLink,
          copyCount: 0,
          remark: null, // 导入时备注为空
          createdAt: now,
          expiresAt: expiresAt
        });
      }
    }
  }
  
  return mailboxes;
}

// 处理导入操作
export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    const db = createDB(getDatabase(env));
    
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const directLinksData = formData.get("directLinksData") as string;
    
    if (action === "import" && directLinksData) {
      // 解析数据
      const mailboxes = parseDirectLinksData(directLinksData);
      
      if (mailboxes.length === 0) {
        return data({
          success: false,
          error: "没有找到有效的邮箱数据"
        });
      }
      
      // 批量插入数据 - 分批处理以避免超时
      let insertedCount = 0;
      let skippedCount = 0;
      const batchSize = 100; // 每批处理100个邮箱

      console.log(`开始导入 ${mailboxes.length} 个邮箱，分 ${Math.ceil(mailboxes.length / batchSize)} 批处理`);

      for (let i = 0; i < mailboxes.length; i += batchSize) {
        const batch = mailboxes.slice(i, i + batchSize);
        console.log(`处理第 ${Math.floor(i / batchSize) + 1} 批，包含 ${batch.length} 个邮箱`);

        // 尝试批量插入
        try {
          await db.insert(testMailboxes).values(batch);
          insertedCount += batch.length;
          console.log(`批量插入成功: ${batch.length} 个邮箱`);
        } catch (batchError) {
          console.log(`批量插入失败，改为逐个插入:`, batchError.message);

          // 如果批量插入失败，改为逐个插入
          for (const mailbox of batch) {
            try {
              await db.insert(testMailboxes).values(mailbox);
              insertedCount++;
            } catch (error) {
              // 如果邮箱已存在，跳过
              if (error.message?.includes('UNIQUE constraint failed')) {
                skippedCount++;
              } else {
                console.error(`插入邮箱 ${mailbox.email} 失败:`, error);
                skippedCount++;
              }
            }
          }
        }
      }
      
      const successRate = ((insertedCount / mailboxes.length) * 100).toFixed(1);

      return data({
        success: true,
        message: `导入完成！成功插入 ${insertedCount} 个邮箱，跳过 ${skippedCount} 个重复邮箱。成功率: ${successRate}%`,
        stats: {
          total: mailboxes.length,
          inserted: insertedCount,
          skipped: skippedCount,
          successRate: successRate
        }
      });
    }
    
    if (action === "clear") {
      // 清空测试邮箱表
      await db.delete(testMailboxes);
      
      return data({
        success: true,
        message: "已清空所有测试邮箱数据"
      });
    }
    
    return data({
      success: false,
      error: "无效的操作"
    });
    
  } catch (error) {
    console.error("导入操作失败:", error);
    return data({
      success: false,
      error: `操作失败: ${error.message}`
    });
  }
}

export default function ImportTestMailboxes() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [directLinksData, setDirectLinksData] = useState("");
  
  const isSubmitting = navigation.state === "submitting";
  
  // 示例数据
  const exampleData = `# 测试邮箱数据示例
ronald.howard@aug.qzz.io -> https://app.aug.qzz.io/verify-mailbox?email=ronald.howard@aug.qzz.io&code=344784
ruth123@asksy.dpdns.org -> https://app.aug.qzz.io/verify-mailbox?email=ruth123@asksy.dpdns.org&code=944382`;
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>导入测试邮箱数据</h1>
      
      {/* 结果显示 */}
      {actionData && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: actionData.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${actionData.success ? '#c3e6cb' : '#f5c6cb'}`,
          color: actionData.success ? '#155724' : '#721c24'
        }}>
          <strong>{actionData.success ? '✅ 成功' : '❌ 失败'}</strong>
          <p style={{ margin: '5px 0 0 0' }}>{actionData.message}</p>
          {actionData.stats && (
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              <p>总数: {actionData.stats.total}</p>
              <p>插入: {actionData.stats.inserted}</p>
              <p>跳过: {actionData.stats.skipped}</p>
            </div>
          )}
        </div>
      )}
      
      {/* 导入表单 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #e9ecef',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginTop: 0, color: '#495057' }}>导入数据</h2>
        <Form method="post">
          <input type="hidden" name="action" value="import" />
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Direct Links 数据:
            </label>
            <textarea
              name="directLinksData"
              value={directLinksData}
              onChange={(e) => setDirectLinksData(e.target.value)}
              placeholder={`请粘贴 direct-links.txt 文件的内容，格式如下：\n${exampleData}`}
              style={{
                width: '100%',
                height: '200px',
                padding: '10px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'vertical'
              }}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || !directLinksData.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isSubmitting ? '导入中...' : '开始导入'}
          </button>
        </Form>
      </div>
      
      {/* 清空数据 */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #ffeaa7'
      }}>
        <h2 style={{ marginTop: 0, color: '#856404' }}>危险操作</h2>
        <p style={{ color: '#856404' }}>
          清空所有测试邮箱数据。此操作不可恢复！
        </p>
        <Form method="post">
          <input type="hidden" name="action" value="clear" />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
            onClick={(e) => {
              if (!confirm('确定要清空所有测试邮箱数据吗？此操作不可恢复！')) {
                e.preventDefault();
              }
            }}
          >
            {isSubmitting ? '清空中...' : '清空所有数据'}
          </button>
        </Form>
      </div>
      
      {/* 使用说明 */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ marginTop: 0, color: '#495057' }}>使用说明</h3>
        <ol style={{ color: '#6c757d' }}>
          <li>将 direct-links.txt 文件的内容复制到上面的文本框中</li>
          <li>点击"开始导入"按钮</li>
          <li>系统会自动解析数据并分批插入到数据库中（每批100个）</li>
          <li><strong>重复的邮箱会被自动跳过，不会覆盖现有数据</strong></li>
          <li><strong>可以多次导入同一份数据，只会添加新的邮箱</strong></li>
          <li>如果导入中断，可以再次导入继续添加剩余的邮箱</li>
          <li>导入完成后可以访问 <a href="/test-mailboxes-db" style={{ color: '#007bff' }}>/test-mailboxes-db</a> 查看结果</li>
        </ol>

        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#d1ecf1',
          borderRadius: '4px',
          border: '1px solid #bee5eb'
        }}>
          <h4 style={{ margin: '0 0 5px 0', color: '#0c5460' }}>💡 提示</h4>
          <p style={{ margin: 0, color: '#0c5460', fontSize: '14px' }}>
            如果您的导入没有完成全部邮箱（比如只导入了1000个），可以再次点击"开始导入"继续导入剩余的邮箱。
            系统会自动跳过已存在的邮箱，只添加新的邮箱。
          </p>
        </div>
      </div>
    </div>
  );
}
