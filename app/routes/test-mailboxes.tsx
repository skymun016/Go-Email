import { useState, useMemo } from "react";
import { Link, data, useLoaderData, useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Mail, Copy, Check, Search, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
// 直接在代码中定义测试数据
// 测试邮箱数据类型
interface TestMailbox {
  id: number;
  email: string;
  prefix: string;
  domain: string;
  verification_code: string;
  directLink: string;
  copyCount?: number;
}

// 测试数据
const testMailboxData = [
  { email: "ronald.howard@aug.qzz.io", code: "344784" },
  { email: "ruth123@asksy.dpdns.org", code: "944382" },
  { email: "dennis_2222@aug.qzz.io", code: "296315" },
  { email: "professor@aug.qzz.io", code: "028970" },
  { email: "business.99@aug.qzz.io", code: "674357" },
];

// 解析测试邮箱数据
function parseTestMailboxData() {
  const mailboxes: TestMailbox[] = [];
  const supportedDomains = new Set<string>();

  testMailboxData.forEach((item, index) => {
    const [prefix, domain] = item.email.split('@');
    const baseUrl = 'https://app.aug.qzz.io';
    const directLink = `${baseUrl}/verify-mailbox?email=${encodeURIComponent(item.email)}&code=${item.code}`;

    if (prefix && domain) {
      supportedDomains.add(domain);
      mailboxes.push({
        id: index + 1,
        email: item.email,
        prefix,
        domain,
        verification_code: item.code,
        directLink,
        copyCount: 0
      });
    }
  });

  return {
    mailboxes,
    totalCount: mailboxes.length,
    supportedDomains: Array.from(supportedDomains),
    generatedAt: new Date().toISOString()
  };
}

// 加载测试数据
export async function loader({ context }: LoaderFunctionArgs) {
  try {
    // 解析测试邮箱数据
    const parsedData = parseTestMailboxData();

    // 从KV存储获取复制次数统计
    const env = context.cloudflare.env;
    const copyStats: Record<string, number> = {};

    if (env?.KV) {
      try {
        const statsData = await env.KV.get('test-mailbox-copy-stats');
        if (statsData) {
          Object.assign(copyStats, JSON.parse(statsData));
        }
      } catch (error) {
        console.error('Failed to load copy stats:', error);
      }
    }

    // 合并复制次数数据
    const mailboxes = parsedData.mailboxes.map((mailbox) => ({
      ...mailbox,
      copyCount: copyStats[mailbox.email] || 0
    }));

    return data({
      mailboxes,
      totalCount: parsedData.totalCount,
      generatedAt: parsedData.generatedAt,
      supportedDomains: parsedData.supportedDomains
    });
  } catch (error) {
    console.error('Failed to load test data:', error);
    return data({
      mailboxes: [],
      totalCount: 0,
      generatedAt: null,
      supportedDomains: [],
      error: '无法加载测试数据'
    });
  }
}

// 更新复制次数的action
export async function action({ request, context }: LoaderFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const type = formData.get('type') as string; // 'email' or 'link'
  
  if (!email) {
    return data({ success: false, error: 'Missing email' }, { status: 400 });
  }
  
  try {
    const env = context.cloudflare.env;
    if (env?.KV) {
      // 获取当前统计数据
      const statsData = await env.KV.get('test-mailbox-copy-stats');
      const copyStats: Record<string, number> = statsData ? JSON.parse(statsData) : {};
      
      // 更新复制次数
      copyStats[email] = (copyStats[email] || 0) + 1;
      
      // 保存回KV存储
      await env.KV.put('test-mailbox-copy-stats', JSON.stringify(copyStats));
      
      return data({ success: true, newCount: copyStats[email] });
    }
    
    return data({ success: false, error: 'KV storage not available' });
  } catch (error) {
    console.error('Failed to update copy stats:', error);
    return data({ success: false, error: 'Failed to update stats' });
  }
}

export default function TestMailboxes() {
  const loaderData = useLoaderData<typeof loader>();
  const { mailboxes, totalCount, generatedAt, supportedDomains, error } = loaderData;
  const fetcher = useFetcher();
  
  // 状态管理
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedItems, setCopiedItems] = useState<Record<string, string>>({});
  const itemsPerPage = 50;
  
  // 搜索和分页逻辑
  const filteredMailboxes = useMemo(() => {
    if (!searchTerm) return mailboxes;
    return mailboxes.filter((mailbox: TestMailbox) =>
      mailbox.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mailbox.prefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mailbox.domain.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [mailboxes, searchTerm]);
  
  const totalPages = Math.ceil(filteredMailboxes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMailboxes = filteredMailboxes.slice(startIndex, startIndex + itemsPerPage);
  
  // 更新直链URL为当前域名
  const updateDirectLink = (originalLink: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gomail-app.amexiaowu.workers.dev';
    // 提取原链接的查询参数
    const url = new URL(originalLink);
    return `${baseUrl}/verify-mailbox${url.search}`;
  };
  
  // 复制功能
  const handleCopy = async (text: string, email: string, type: 'email' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      
      // 显示复制成功反馈
      const key = `${email}-${type}`;
      setCopiedItems(prev => ({ ...prev, [key]: 'copied' }));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      }, 2000);
      
      // 更新复制次数统计
      const formData = new FormData();
      formData.append('email', email);
      formData.append('type', type);
      fetcher.submit(formData, { method: 'POST' });
      
    } catch (error) {
      console.error('复制失败:', error);
    }
  };
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">加载失败</CardTitle>
              <CardDescription className="text-red-600">{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">测试邮箱管理</h1>
              <p className="text-gray-600 mt-1">
                管理和使用预生成的测试邮箱数据 • 共 {totalCount} 个邮箱
              </p>
            </div>
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                总邮箱数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">支持域名</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {supportedDomains.map((domain: string) => (
                  <Badge key={domain} variant="outline" className="mr-2">
                    {domain}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">生成时间</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                {generatedAt ? new Date(generatedAt).toLocaleString('zh-CN') : '未知'}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 搜索栏 */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索邮箱地址、前缀或域名..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {searchTerm && (
              <div className="mt-2 text-sm text-gray-600">
                找到 {filteredMailboxes.length} 个匹配的邮箱
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 邮箱列表 */}
        <Card>
          <CardHeader>
            <CardTitle>邮箱列表</CardTitle>
            <CardDescription>
              显示第 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredMailboxes.length)} 项，共 {filteredMailboxes.length} 项
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      邮箱地址
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      验证码
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      访问链接
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      复制次数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentMailboxes.map((mailbox: TestMailbox) => {
                    const verifyLink = updateDirectLink(mailbox.directLink);
                    const emailCopyKey = `${mailbox.email}-email`;
                    const linkCopyKey = `${mailbox.email}-link`;
                    
                    return (
                      <tr key={mailbox.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {mailbox.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                {mailbox.prefix}@{mailbox.domain}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="font-mono">
                            {mailbox.verification_code}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-blue-600 truncate max-w-xs">
                            {verifyLink}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="secondary">
                            {mailbox.copyCount || 0}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(mailbox.email, mailbox.email, 'email')}
                              className="flex items-center"
                            >
                              {copiedItems[emailCopyKey] ? (
                                <>
                                  <Check className="w-3 h-3 mr-1 text-green-500" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  复制邮箱
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(verifyLink, mailbox.email, 'link')}
                              className="flex items-center"
                            >
                              {copiedItems[linkCopyKey] ? (
                                <>
                                  <Check className="w-3 h-3 mr-1 text-green-500" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  复制链接
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* 分页 */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  第 {currentPage} 页，共 {totalPages} 页
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
