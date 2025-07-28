/**
 * 简化的测试邮箱管理页面
 */

import { data } from "react-router";

// 加载测试数据
export async function loader() {
  return data({
    mailboxes: [
      {
        id: 1,
        email: "ronald.howard@aug.qzz.io",
        verification_code: "344784",
        directLink: "https://gomail-app.amexiaowu.workers.dev/verify-mailbox?email=ronald.howard@aug.qzz.io&code=344784"
      },
      {
        id: 2,
        email: "ruth123@asksy.dpdns.org",
        verification_code: "944382",
        directLink: "https://gomail-app.amexiaowu.workers.dev/verify-mailbox?email=ruth123@asksy.dpdns.org&code=944382"
      },
      {
        id: 3,
        email: "dennis_2222@aug.qzz.io",
        verification_code: "296315",
        directLink: "https://gomail-app.amexiaowu.workers.dev/verify-mailbox?email=dennis_2222@aug.qzz.io&code=296315"
      }
    ],
    totalCount: 3
  });
}

export default function TestMailboxesSimple({ loaderData }: any) {
  const { mailboxes, totalCount } = loaderData;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>测试邮箱管理</h1>
      <p>总计: {totalCount} 个邮箱</p>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>邮箱地址</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>验证码</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>直链</th>
          </tr>
        </thead>
        <tbody>
          {mailboxes.map((mailbox: any) => (
            <tr key={mailbox.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{mailbox.id}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{mailbox.email}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{mailbox.verification_code}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <a href={mailbox.directLink} target="_blank" rel="noopener noreferrer">
                  查看邮件
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
