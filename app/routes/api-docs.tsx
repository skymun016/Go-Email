import { Copy, Code, Key, Mail, Download, Info, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export function meta() {
	return [
		{ title: "API开发者文档 - GoMail临时邮箱API接口" },
		{
			name: "description",
			content:
				"GoMail API开发者文档，提供完整的临时邮箱API接口说明、认证方式、请求参数和响应格式。支持创建邮箱、获取邮件、下载附件等功能，基于Token认证，适合第三方应用集成。",
		},
		{ name: "keywords", content: "GoMail API,临时邮箱API,开发者文档,API接口,Token认证,邮件API" },
	];
}

export default function ApiDocs() {
	const [copiedCode, setCopiedCode] = useState<string | null>(null);

	const copyToClipboard = (text: string, id: string) => {
		if (typeof window !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(text);
			setCopiedCode(id);
			setTimeout(() => setCopiedCode(null), 2000);
		}
	};

	const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
		<div className="relative">
			<div className="flex items-center justify-between bg-gray-800 text-white px-4 py-2 rounded-t-lg">
				<span className="text-sm font-medium">{language}</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => copyToClipboard(code, id)}
					className="text-white hover:bg-gray-700 h-8 px-2"
				>
					<Copy className="w-4 h-4" />
					{copiedCode === id ? "已复制" : "复制"}
				</Button>
			</div>
			<pre className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto text-sm">
				<code>{code}</code>
			</pre>
		</div>
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
			{/* Hero Section */}
			<section className="py-8 sm:py-16 bg-white">
				<div className="max-w-4xl mx-auto px-4 text-center">
					<div className="flex justify-center items-center gap-4 mb-6">
						<div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-full">
							<Code className="w-8 h-8 text-blue-600" />
						</div>
						<a
							href="https://github.com/xn030523/Go-Email"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
						>
							<ExternalLink className="w-4 h-4" />
							<span className="text-sm font-medium">GitHub 开源</span>
						</a>
					</div>
					<h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
						🚀 <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
							GoMail API 开发者文档
						</span> 🚀
					</h1>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						基于Token认证的临时邮箱API接口，支持创建邮箱、获取邮件、下载附件等功能
						<br />
						<span className="font-semibold text-blue-600">简单易用 · 安全可靠 · 完整功能</span>
					</p>
				</div>
			</section>

			{/* API Overview */}
			<section className="py-16">
				<div className="max-w-6xl mx-auto px-4">
					<div className="text-center mb-12">
						<h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
							📋 API 概览
						</h2>
						<p className="text-lg text-gray-600">
							所有API请求都需要Token认证，支持RESTful风格的HTTP请求
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
						<Card className="text-center hover:shadow-lg transition-shadow">
							<CardContent className="pt-6">
								<div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
									<Mail className="w-6 h-6 text-blue-600" />
								</div>
								<h3 className="font-semibold mb-2">创建邮箱</h3>
								<p className="text-sm text-gray-600">快速创建临时邮箱地址</p>
								<Badge variant="secondary" className="mt-2">POST</Badge>
							</CardContent>
						</Card>

						<Card className="text-center hover:shadow-lg transition-shadow">
							<CardContent className="pt-6">
								<div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
									<Mail className="w-6 h-6 text-green-600" />
								</div>
								<h3 className="font-semibold mb-2">获取邮件</h3>
								<p className="text-sm text-gray-600">获取邮箱的邮件列表</p>
								<Badge variant="secondary" className="mt-2">GET</Badge>
							</CardContent>
						</Card>

						<Card className="text-center hover:shadow-lg transition-shadow">
							<CardContent className="pt-6">
								<div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
									<Info className="w-6 h-6 text-purple-600" />
								</div>
								<h3 className="font-semibold mb-2">邮件详情</h3>
								<p className="text-sm text-gray-600">获取邮件完整内容</p>
								<Badge variant="secondary" className="mt-2">GET</Badge>
							</CardContent>
						</Card>

						<Card className="text-center hover:shadow-lg transition-shadow">
							<CardContent className="pt-6">
								<div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
									<Download className="w-6 h-6 text-orange-600" />
								</div>
								<h3 className="font-semibold mb-2">下载附件</h3>
								<p className="text-sm text-gray-600">下载邮件附件文件</p>
								<Badge variant="secondary" className="mt-2">GET</Badge>
							</CardContent>
						</Card>
					</div>

					{/* Authentication */}
					<Card className="mb-8">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Key className="w-5 h-5 text-blue-600" />
								认证方式
							</CardTitle>
							<CardDescription>
								所有API请求都需要在HTTP头中包含有效的API Token
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
								<p className="text-sm text-blue-800 mb-2">
									<strong>请求头格式：</strong>
								</p>
								<code className="text-blue-900 bg-blue-100 px-2 py-1 rounded">
									Authorization: Bearer gm_your_token_here
								</code>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h4 className="font-semibold mb-2">如何获取Token？</h4>
									<ol className="text-sm text-gray-600 space-y-1">
										<li>1. 登录管理后台</li>
										<li>2. 进入"Token管理"页面</li>
										<li>3. 创建新的API Token</li>
										<li>4. 设置使用限制和有效期</li>
									</ol>
								</div>
								<div>
									<h4 className="font-semibold mb-2">Token特点</h4>
									<ul className="text-sm text-gray-600 space-y-1">
										<li>• 支持使用次数限制</li>
										<li>• 支持过期时间设置</li>
										<li>• 可随时启用/禁用</li>
										<li>• 只显示一次，请妥善保存</li>
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* API Endpoints */}
			<section className="py-16 bg-white">
				<div className="max-w-6xl mx-auto px-4">
					<div className="text-center mb-12">
						<h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
							🔗 API 接口详情
						</h2>
						<p className="text-lg text-gray-600">
							完整的API接口说明，包含请求参数和响应格式
						</p>
					</div>

					{/* 1. 创建邮箱 */}
					<Card className="mb-8">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<Badge className="bg-green-600">POST</Badge>
									创建临时邮箱
								</CardTitle>
								<code className="text-sm bg-gray-100 px-2 py-1 rounded">
									/api/external/mailbox
								</code>
							</div>
							<CardDescription>
								创建一个新的临时邮箱地址，可自定义前缀和域名
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="font-semibold mb-2">请求体 (JSON):</h4>
								<CodeBlock
									language="JSON"
									id="create-mailbox-request"
									code={`{
  "prefix": "test",        // 可选：邮箱前缀
  "domain": "184772.xyz"   // 可选：邮箱域名
}`}
								/>
							</div>
							<div>
								<h4 className="font-semibold mb-2">响应示例:</h4>
								<CodeBlock
									language="JSON"
									id="create-mailbox-response"
									code={`{
  "success": true,
  "data": {
    "id": "mailbox_id",
    "email": "test@184772.xyz",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-02T00:00:00.000Z",
    "isActive": true
  },
  "message": "Mailbox created successfully",
  "remainingUsage": 99
}`}
								/>
							</div>
						</CardContent>
					</Card>

					{/* 2. 获取邮件列表 */}
					<Card className="mb-8">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<Badge className="bg-blue-600">GET</Badge>
									获取邮件列表
								</CardTitle>
								<code className="text-sm bg-gray-100 px-2 py-1 rounded">
									/api/external/emails/{`{email}`}
								</code>
							</div>
							<CardDescription>
								获取指定邮箱的所有邮件列表
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="font-semibold mb-2">路径参数:</h4>
								<div className="bg-gray-50 p-3 rounded">
									<code>email</code> - 邮箱地址 (例如: test@184772.xyz)
								</div>
							</div>
							<div>
								<h4 className="font-semibold mb-2">响应示例:</h4>
								<CodeBlock
									language="JSON"
									id="get-emails-response"
									code={`{
  "success": true,
  "data": {
    "email": "test@184772.xyz",
    "totalCount": 2,
    "emails": [
      {
        "id": "email_id",
        "fromAddress": "sender@example.com",
        "subject": "测试邮件",
        "receivedAt": "2024-01-01T12:00:00.000Z",
        "isRead": false,
        "size": 1024,
        "hasAttachments": true
      }
    ]
  },
  "message": "Found 2 emails",
  "remainingUsage": 98
}`}
								/>
							</div>
						</CardContent>
					</Card>

					{/* 3. 获取邮件详情 */}
					<Card className="mb-8">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<Badge className="bg-purple-600">GET</Badge>
									获取邮件详情
								</CardTitle>
								<code className="text-sm bg-gray-100 px-2 py-1 rounded">
									/api/external/email/{`{id}`}
								</code>
							</div>
							<CardDescription>
								获取指定邮件的完整内容，包括附件信息
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="font-semibold mb-2">路径参数:</h4>
								<div className="bg-gray-50 p-3 rounded">
									<code>id</code> - 邮件ID
								</div>
							</div>
							<div>
								<h4 className="font-semibold mb-2">响应示例:</h4>
								<CodeBlock
									language="JSON"
									id="get-email-detail-response"
									code={`{
  "success": true,
  "data": {
    "id": "email_id",
    "fromAddress": "sender@example.com",
    "toAddress": "test@184772.xyz",
    "subject": "测试邮件",
    "textContent": "邮件文本内容",
    "htmlContent": "<p>邮件HTML内容</p>",
    "receivedAt": "2024-01-01T12:00:00.000Z",
    "isRead": false,
    "size": 1024,
    "attachments": [
      {
        "id": "attachment_id",
        "filename": "document.pdf",
        "contentType": "application/pdf",
        "size": 2048,
        "downloadUrl": "/api/external/attachment/attachment_id"
      }
    ]
  },
  "message": "Email details retrieved successfully",
  "remainingUsage": 97
}`}
								/>
							</div>
						</CardContent>
					</Card>

					{/* 4. 下载附件 */}
					<Card className="mb-8">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<Badge className="bg-orange-600">GET</Badge>
									下载附件
								</CardTitle>
								<code className="text-sm bg-gray-100 px-2 py-1 rounded">
									/api/external/attachment/{`{id}`}
								</code>
							</div>
							<CardDescription>
								下载指定的邮件附件文件
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="font-semibold mb-2">路径参数:</h4>
								<div className="bg-gray-50 p-3 rounded">
									<code>id</code> - 附件ID
								</div>
							</div>
							<div>
								<h4 className="font-semibold mb-2">响应:</h4>
								<div className="bg-gray-50 p-3 rounded text-sm">
									返回附件的二进制内容，包含适当的 Content-Type 和 Content-Disposition 头
								</div>
							</div>
						</CardContent>
					</Card>

					{/* 5. 获取Token信息 */}
					<Card className="mb-8">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<Badge className="bg-indigo-600">GET</Badge>
									获取Token信息
								</CardTitle>
								<code className="text-sm bg-gray-100 px-2 py-1 rounded">
									/api/external/mailbox
								</code>
							</div>
							<CardDescription>
								获取当前Token的使用信息和状态
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="font-semibold mb-2">响应示例:</h4>
								<CodeBlock
									language="JSON"
									id="get-token-info-response"
									code={`{
  "success": true,
  "data": {
    "tokenName": "API客户端1",
    "usageLimit": 100,
    "usageCount": 3,
    "remainingUsage": 97,
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "lastUsedAt": "2024-01-01T12:00:00.000Z",
    "usable": true,
    "reason": null
  },
  "message": "Token information retrieved"
}`}
								/>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* Error Responses */}
			<section className="py-16">
				<div className="max-w-6xl mx-auto px-4">
					<Card className="mb-8">
						<CardHeader>
							<CardTitle className="text-red-600">❌ 错误响应</CardTitle>
							<CardDescription>
								当请求失败时，API会返回相应的错误信息
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="font-semibold mb-2">错误响应格式:</h4>
								<CodeBlock
									language="JSON"
									id="error-response"
									code={`{
  "success": false,
  "error": "错误描述",
  "message": "详细错误信息"
}`}
								/>
							</div>
							<div>
								<h4 className="font-semibold mb-2">常见错误代码:</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Badge variant="destructive">400</Badge>
											<span className="text-sm">请求参数错误</span>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="destructive">401</Badge>
											<span className="text-sm">Token无效或缺失</span>
										</div>
									</div>
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Badge variant="destructive">403</Badge>
											<span className="text-sm">Token已禁用或过期</span>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="destructive">404</Badge>
											<span className="text-sm">资源不存在</span>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* Code Examples */}
			<section className="py-16 bg-white">
				<div className="max-w-6xl mx-auto px-4">
					<div className="text-center mb-12">
						<h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
							💻 代码示例
						</h2>
						<p className="text-lg text-gray-600">
							多种编程语言的完整示例代码
						</p>
					</div>

					{/* JavaScript Example */}
					<Card className="mb-8">
						<CardHeader>
							<CardTitle>JavaScript / Node.js</CardTitle>
							<CardDescription>
								使用fetch API调用GoMail接口的完整示例
							</CardDescription>
						</CardHeader>
						<CardContent>
							<CodeBlock
								language="JavaScript"
								id="javascript-example"
								code={`const API_BASE = 'https://184772.xyz';
const API_TOKEN = 'gm_your_token_here';

// 创建邮箱
async function createMailbox() {
  const response = await fetch(\`\${API_BASE}/api/external/mailbox\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_TOKEN}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prefix: 'test',
      domain: '184772.xyz'
    })
  });

  const data = await response.json();
  return data;
}

// 获取邮件列表
async function getEmails(email) {
  const response = await fetch(\`\${API_BASE}/api/external/emails/\${email}\`, {
    headers: {
      'Authorization': \`Bearer \${API_TOKEN}\`
    }
  });

  const data = await response.json();
  return data;
}

// 获取邮件详情
async function getEmailDetail(emailId) {
  const response = await fetch(\`\${API_BASE}/api/external/email/\${emailId}\`, {
    headers: {
      'Authorization': \`Bearer \${API_TOKEN}\`
    }
  });

  const data = await response.json();
  return data;
}

// 使用示例
async function main() {
  try {
    // 创建邮箱
    const mailbox = await createMailbox();
    console.log('创建邮箱:', mailbox);

    // 获取邮件
    const emails = await getEmails(mailbox.data.email);
    console.log('邮件列表:', emails);

    // 获取第一封邮件详情
    if (emails.data.emails.length > 0) {
      const emailDetail = await getEmailDetail(emails.data.emails[0].id);
      console.log('邮件详情:', emailDetail);
    }
  } catch (error) {
    console.error('API调用失败:', error);
  }
}`}
							/>
						</CardContent>
					</Card>

					{/* Python Example */}
					<Card className="mb-8">
						<CardHeader>
							<CardTitle>Python</CardTitle>
							<CardDescription>
								使用requests库调用GoMail接口的完整示例
							</CardDescription>
						</CardHeader>
						<CardContent>
							<CodeBlock
								language="Python"
								id="python-example"
								code={`import requests
import json

API_BASE = 'https://184772.xyz'
API_TOKEN = 'gm_your_token_here'

headers = {
    'Authorization': f'Bearer {API_TOKEN}',
    'Content-Type': 'application/json'
}

def create_mailbox(prefix='test', domain='184772.xyz'):
    """创建临时邮箱"""
    response = requests.post(
        f'{API_BASE}/api/external/mailbox',
        headers=headers,
        json={
            'prefix': prefix,
            'domain': domain
        }
    )
    return response.json()

def get_emails(email):
    """获取邮件列表"""
    response = requests.get(
        f'{API_BASE}/api/external/emails/{email}',
        headers=headers
    )
    return response.json()

def get_email_detail(email_id):
    """获取邮件详情"""
    response = requests.get(
        f'{API_BASE}/api/external/email/{email_id}',
        headers=headers
    )
    return response.json()

def download_attachment(attachment_id, filename):
    """下载附件"""
    response = requests.get(
        f'{API_BASE}/api/external/attachment/{attachment_id}',
        headers={'Authorization': f'Bearer {API_TOKEN}'}
    )

    if response.status_code == 200:
        with open(filename, 'wb') as f:
            f.write(response.content)
        return True
    return False

def get_token_info():
    """获取Token信息"""
    response = requests.get(
        f'{API_BASE}/api/external/mailbox',
        headers=headers
    )
    return response.json()

# 使用示例
if __name__ == '__main__':
    try:
        # 创建邮箱
        mailbox = create_mailbox()
        print('创建邮箱:', json.dumps(mailbox, indent=2, ensure_ascii=False))

        if mailbox['success']:
            email_address = mailbox['data']['email']

            # 获取邮件列表
            emails = get_emails(email_address)
            print('邮件列表:', json.dumps(emails, indent=2, ensure_ascii=False))

            # 如果有邮件，获取第一封邮件详情
            if emails['success'] and emails['data']['emails']:
                first_email = emails['data']['emails'][0]
                email_detail = get_email_detail(first_email['id'])
                print('邮件详情:', json.dumps(email_detail, indent=2, ensure_ascii=False))

                # 如果有附件，下载第一个附件
                if email_detail['success'] and email_detail['data']['attachments']:
                    attachment = email_detail['data']['attachments'][0]
                    success = download_attachment(attachment['id'], attachment['filename'])
                    print(f'附件下载: {"成功" if success else "失败"}')

        # 获取Token信息
        token_info = get_token_info()
        print('Token信息:', json.dumps(token_info, indent=2, ensure_ascii=False))

    except Exception as e:
        print(f'API调用失败: {e}')`}
							/>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* Usage Guidelines */}
			<section className="py-16">
				<div className="max-w-6xl mx-auto px-4">
					<div className="text-center mb-12">
						<h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
							📋 使用说明
						</h2>
						<p className="text-lg text-gray-600">
							API使用限制和最佳实践
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<Card>
							<CardHeader>
								<CardTitle className="text-blue-600">🔒 使用限制</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-start gap-2">
									<span className="text-blue-600 mt-1">•</span>
									<span className="text-sm">每个Token可设置使用次数限制</span>
								</div>
								<div className="flex items-start gap-2">
									<span className="text-blue-600 mt-1">•</span>
									<span className="text-sm">Token支持过期时间设置</span>
								</div>
								<div className="flex items-start gap-2">
									<span className="text-blue-600 mt-1">•</span>
									<span className="text-sm">临时邮箱24小时后自动过期</span>
								</div>
								<div className="flex items-start gap-2">
									<span className="text-blue-600 mt-1">•</span>
									<span className="text-sm">只有API调用消耗Token使用次数</span>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-green-600">✅ 最佳实践</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-start gap-2">
									<span className="text-green-600 mt-1">•</span>
									<span className="text-sm">妥善保存Token，避免泄露</span>
								</div>
								<div className="flex items-start gap-2">
									<span className="text-green-600 mt-1">•</span>
									<span className="text-sm">定期检查Token使用情况</span>
								</div>
								<div className="flex items-start gap-2">
									<span className="text-green-600 mt-1">•</span>
									<span className="text-sm">合理设置Token有效期</span>
								</div>
								<div className="flex items-start gap-2">
									<span className="text-green-600 mt-1">•</span>
									<span className="text-sm">及时处理API错误响应</span>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Contact Info */}
					<Card className="mt-8">
						<CardHeader>
							<CardTitle className="text-center">📞 技术支持</CardTitle>
							<CardDescription className="text-center">
								如果您在使用API过程中遇到问题，欢迎联系我们
							</CardDescription>
						</CardHeader>
						<CardContent className="text-center space-y-4">
							<div>
								<p className="text-sm text-gray-600 mb-2">技术支持邮箱：</p>
								<a
									href="mailto:3586177963@qq.com"
									className="text-blue-600 font-medium hover:underline"
								>
									3586177963@qq.com
								</a>
							</div>
							<div>
								<p className="text-sm text-gray-600 mb-2">管理后台：</p>
								<a
									href="/admin-login"
									className="text-blue-600 font-medium hover:underline"
								>
									登录管理后台获取API Token
								</a>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
