/**
 * 基于数据库的测试邮箱管理页面
 */

import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useRouteError, isRouteErrorResponse, useSearchParams } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { testMailboxes } from "~/db/schema";
import { asc, count, eq } from "drizzle-orm";

// 处理延长时间的action
export async function action({ context, request }: ActionFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    const db = createDB(getDatabase(env));

    const formData = await request.formData();
    const action = formData.get('action');
    const mailboxId = formData.get('mailboxId');

    if (action === 'extend' && mailboxId) {
      // 延长7天
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db
        .update(testMailboxes)
        .set({ expiresAt: newExpiresAt })
        .where(eq(testMailboxes.id, parseInt(mailboxId as string)));

      return { success: true, message: '邮箱有效期已延长7天' };
    }

    return { success: false, message: '无效的操作' };
  } catch (error) {
    console.error("延长时间失败:", error);
    return { success: false, message: `延长时间失败: ${error.message}` };
  }
}

// 加载测试邮箱数据
export async function loader({ context, request }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    const db = createDB(getDatabase(env));

    // 获取分页参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const itemsPerPage = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * itemsPerPage;

    console.log(`开始加载测试邮箱数据... 页码: ${page}, 每页: ${itemsPerPage}`);

    // 第一步：获取分页的测试邮箱（升序排序）
    const mailboxes = await db
      .select()
      .from(testMailboxes)
      .orderBy(asc(testMailboxes.id))
      .limit(itemsPerPage)
      .offset(offset);

    console.log(`成功获取 ${mailboxes.length} 个邮箱`);

    // 第二步：获取总数（简单的count查询）
    let totalCount = 0;
    try {
      const totalCountResult = await db.select({ count: count() }).from(testMailboxes);
      totalCount = totalCountResult[0]?.count || 0;
      console.log(`总数查询成功: ${totalCount}`);
    } catch (countError) {
      console.error("总数查询失败:", countError);
      // 如果count查询失败，使用邮箱数组长度作为备选
      totalCount = mailboxes.length;
    }

    console.log("所有数据加载完成");

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return {
      mailboxes,
      totalCount,
      currentPage: page,
      itemsPerPage,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

  } catch (error) {
    console.error("加载测试邮箱失败:", error);
    throw new Response(`加载测试邮箱失败: ${error.message}`, { status: 500 });
  }
}

export default function TestMailboxesDB() {
  const { mailboxes, totalCount, currentPage, itemsPerPage, totalPages, hasNextPage, hasPrevPage } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [currentHost, setCurrentHost] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 备注编辑状态管理
  const [editingRemark, setEditingRemark] = useState<Record<number, boolean>>({});
  const [remarkValues, setRemarkValues] = useState<Record<number, string>>({});
  const [remarkLoading, setRemarkLoading] = useState<Record<number, boolean>>({});

  // 延长时间按钮状态管理
  const [extendingTime, setExtendingTime] = useState<Record<number, boolean>>({});

  // 响应式样式
  const mobileStyles = `
    @media (max-width: 768px) {
      .table-container {
        font-size: 12px !important;
      }
      .table-container th {
        padding: 8px 4px !important;
        font-size: 11px !important;
      }
      .table-container td {
        padding: 8px 4px !important;
        font-size: 11px !important;
      }
      .email-cell {
        font-size: 10px !important;
      }
      .action-buttons {
        flex-direction: column !important;
        gap: 2px !important;
      }
      .action-button {
        padding: 4px 6px !important;
        font-size: 10px !important;
        min-width: 50px !important;
      }
      .remark-input {
        max-width: 70px !important;
        font-size: 10px !important;
      }
      .email-cell {
        font-size: 10px !important;
        word-break: break-all !important;
      }
      .stats-container {
        font-size: 18px !important;
        padding: 15px !important;
      }
    }

    @media (max-width: 480px) {
      .table-container {
        font-size: 10px !important;
      }
      .stats-container {
        font-size: 16px !important;
        padding: 12px !important;
      }
    }
  `;

  // 在客户端获取当前域名
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHost(window.location.host);
    }
  }, []);

  // 处理fetcher响应
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      setNotification({
        message: fetcher.data.message,
        type: fetcher.data.success ? 'success' : 'error'
      });
      // 3秒后自动隐藏通知
      setTimeout(() => setNotification(null), 3000);
    }
  }, [fetcher.data, fetcher.state]);

  // 分页导航函数
  const goToPage = (page: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', page.toString());
    setSearchParams(newSearchParams);
  };
  
  // 复制到剪贴板
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => ({ ...prev, [key]: true }));
      
      // 2秒后重置状态
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [key]: false }));
      }, 2000);
      
      // 更新复制次数（如果是邮箱地址）
      if (key.endsWith('-email')) {
        const email = text;
        fetcher.submit(
          { action: "incrementCopy", email },
          { method: "post", action: "/api/test-mailboxes" }
        );
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 备注编辑相关函数
  const startEditingRemark = (mailboxId: number, currentRemark: string | null) => {
    setEditingRemark(prev => ({ ...prev, [mailboxId]: true }));
    setRemarkValues(prev => ({ ...prev, [mailboxId]: currentRemark || '' }));
  };

  const cancelEditingRemark = (mailboxId: number) => {
    setEditingRemark(prev => ({ ...prev, [mailboxId]: false }));
    setRemarkValues(prev => ({ ...prev, [mailboxId]: '' }));
  };

  const saveRemark = async (mailboxId: number, email: string) => {
    const newRemark = remarkValues[mailboxId] || '';

    setRemarkLoading(prev => ({ ...prev, [mailboxId]: true }));

    try {
      const formData = new FormData();
      formData.append('action', 'updateRemark');
      formData.append('email', email);
      formData.append('remark', newRemark);

      const response = await fetch('/api/test-mailboxes', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNotification({
            message: '备注已更新',
            type: 'success'
          });
          setTimeout(() => setNotification(null), 2000);

          // 退出编辑模式
          setEditingRemark(prev => ({ ...prev, [mailboxId]: false }));

          // 刷新页面数据
          window.location.reload();
        } else {
          setNotification({
            message: result.error || '更新备注失败',
            type: 'error'
          });
          setTimeout(() => setNotification(null), 3000);
        }
      }
    } catch (error) {
      console.error('更新备注失败:', error);
      setNotification({
        message: '更新备注失败',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setRemarkLoading(prev => ({ ...prev, [mailboxId]: false }));
    }
  };

  // 延长时间函数
  const extendTime = async (mailboxId: number) => {
    setExtendingTime(prev => ({ ...prev, [mailboxId]: true }));

    try {
      fetcher.submit(
        { action: 'extend', mailboxId: mailboxId.toString() },
        { method: 'post' }
      );
    } catch (error) {
      console.error('延长时间失败:', error);
      setNotification({
        message: '延长时间失败',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      // 延迟重置状态，等待fetcher完成
      setTimeout(() => {
        setExtendingTime(prev => ({ ...prev, [mailboxId]: false }));
      }, 1000);
    }
  };

  // 错误现在由ErrorBoundary处理，不需要在这里处理
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* 响应式样式 */}
      <style dangerouslySetInnerHTML={{ __html: mobileStyles }} />

      {/* 通知消息 */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: notification.type === 'success' ? '#d4edda' : '#f8d7da',
          color: notification.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${notification.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          {notification.message}
        </div>
      )}


      
      {/* 统计信息 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        {/* 居中的总邮箱数 - 一行显示 */}
        <div className="stats-container" style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          textAlign: 'center',
          minWidth: '200px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            <span style={{ color: '#495057' }}>总邮箱数：</span>
            <span style={{ color: '#007bff' }}>{totalCount}</span>
          </div>
        </div>


      </div>
      
      {/* 邮箱列表 */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: '1px solid #e9ecef',
        overflow: 'hidden'
      }}>


        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '8%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>ID</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '25%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>邮箱地址</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '12%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>复制次数</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '15%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>过期时间</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '15%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>备注</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  width: '25%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {mailboxes.map((mailbox) => {
                const emailKey = `${mailbox.id}-email`;
                const linkKey = `${mailbox.id}-link`;
                // 使用状态中的域名，避免SSR不一致问题
                const verifyLink = currentHost
                  ? mailbox.directLink.replace('app.aug.qzz.io', currentHost)
                  : mailbox.directLink;
                
                // 格式化过期时间
                const expiresAt = mailbox.expiresAt ? new Date(mailbox.expiresAt) : null;
                const isExpired = expiresAt && expiresAt < new Date();
                const timeLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

                return (
                  <tr key={mailbox.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>{mailbox.id}</td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '25%'
                    }}>
                      <div className="email-cell" style={{
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        wordBreak: 'break-all',
                        lineHeight: '1.4',
                        color: '#495057'
                      }}>
                        {mailbox.email}
                      </div>
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '12%'
                    }}>
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1565c0',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-block',
                        minWidth: '35px'
                      }}>
                        {mailbox.copyCount}次
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '15%'
                    }}>
                      {expiresAt ? (
                        <div>
                          <div style={{ fontSize: '12px', color: isExpired ? '#dc3545' : '#495057' }}>
                            {expiresAt.toLocaleDateString('zh-CN')}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: isExpired ? '#dc3545' : timeLeft <= 1 ? '#ffc107' : '#28a745',
                            fontWeight: isExpired || timeLeft <= 1 ? 'bold' : 'normal'
                          }}>
                            {isExpired ? '已过期' : timeLeft <= 0 ? '今天过期' : `${timeLeft}天后过期`}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>未设置</span>
                      )}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '15%'
                    }}>
                      {editingRemark[mailbox.id] ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                          <input
                            className="remark-input"
                            type="text"
                            value={remarkValues[mailbox.id] || ''}
                            onChange={(e) => setRemarkValues(prev => ({ ...prev, [mailbox.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveRemark(mailbox.id, mailbox.email);
                              } else if (e.key === 'Escape') {
                                cancelEditingRemark(mailbox.id);
                              }
                            }}
                            onBlur={() => saveRemark(mailbox.id, mailbox.email)}
                            autoFocus
                            disabled={remarkLoading[mailbox.id]}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              width: '100%',
                              maxWidth: '120px',
                              backgroundColor: remarkLoading[mailbox.id] ? '#f8f9fa' : 'white'
                            }}
                            placeholder="输入备注..."
                          />
                          {remarkLoading[mailbox.id] && (
                            <span style={{ fontSize: '11px', color: '#6c757d' }}>保存中...</span>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditingRemark(mailbox.id, mailbox.remark)}
                          style={{
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: '12px',
                            minHeight: '20px',
                            borderRadius: '4px',
                            backgroundColor: 'transparent',
                            border: '1px solid transparent',
                            color: mailbox.remark ? '#495057' : '#6c757d',
                            wordBreak: 'break-all',
                            lineHeight: '1.3'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.border = '1px solid #ddd';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.border = '1px solid transparent';
                          }}
                        >
                          {mailbox.remark || '点击添加备注'}
                        </div>
                      )}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      width: '25%'
                    }}>
                      <div className="action-buttons" style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <button
                          className="action-button"
                          onClick={() => copyToClipboard(mailbox.email, emailKey)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            border: '1px solid #007bff',
                            backgroundColor: copiedItems[emailKey] ? '#28a745' : '#007bff',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            minWidth: '60px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {copiedItems[emailKey] ? '✓ 已复制' : '复制邮箱'}
                        </button>
                        <button
                          className="action-button"
                          onClick={() => copyToClipboard(verifyLink, linkKey)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            border: '1px solid #17a2b8',
                            backgroundColor: copiedItems[linkKey] ? '#28a745' : '#17a2b8',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            minWidth: '60px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {copiedItems[linkKey] ? '✓ 已复制' : '复制链接'}
                        </button>
                        <button
                          className="action-button"
                          onClick={() => extendTime(mailbox.id)}
                          disabled={extendingTime[mailbox.id]}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            border: '1px solid #ffc107',
                            backgroundColor: extendingTime[mailbox.id] ? '#6c757d' : '#ffc107',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: extendingTime[mailbox.id] ? 'not-allowed' : 'pointer',
                            minWidth: '60px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {extendingTime[mailbox.id] ? '处理中...' : '延长时间'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div style={{
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={!hasPrevPage}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  border: '1px solid #007bff',
                  backgroundColor: hasPrevPage ? '#007bff' : '#6c757d',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: hasPrevPage ? 'pointer' : 'not-allowed'
                }}
              >
                上一页
              </button>

              <span style={{ color: '#495057', fontSize: '14px' }}>
                第 {currentPage} 页 / 共 {totalPages} 页
              </span>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={!hasNextPage}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  border: '1px solid #007bff',
                  backgroundColor: hasNextPage ? '#007bff' : '#6c757d',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: hasNextPage ? 'pointer' : 'not-allowed'
                }}
              >
                下一页
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ color: '#6c757d', fontSize: '14px' }}>跳转到:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                placeholder={currentPage.toString()}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt((e.target as HTMLInputElement).value);
                    if (page >= 1 && page <= totalPages) {
                      goToPage(page);
                    }
                  }
                }}
                style={{
                  width: '60px',
                  padding: '4px 8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              <span style={{ color: '#6c757d', fontSize: '14px' }}>页</span>
            </div>
          </div>
        )}
      </div>

      {mailboxes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6c757d'
        }}>
          <p>暂无测试邮箱数据</p>
          <p style={{ fontSize: '14px' }}>
            请先运行导入脚本将数据导入到数据库中
          </p>
        </div>
      )}
    </div>
  );
}

// ErrorBoundary组件处理加载错误
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #f5c6cb'
        }}>
          <h1 style={{ margin: '0 0 10px 0' }}>
            {error.status} {error.statusText}
          </h1>
          <p style={{ margin: 0 }}>
            {error.status === 500 ? '服务器内部错误，请稍后重试' : error.data}
          </p>
        </div>
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #f5c6cb'
        }}>
          <h1 style={{ margin: '0 0 10px 0' }}>系统错误</h1>
          <p style={{ margin: '0 0 10px 0' }}>{error.message}</p>
          {import.meta.env.DEV && (
            <pre style={{
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {error.stack}
            </pre>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #f5c6cb'
        }}>
          <h1 style={{ margin: '0 0 10px 0' }}>未知错误</h1>
          <p style={{ margin: 0 }}>发生了未知错误，请稍后重试</p>
        </div>
      </div>
    );
  }
}
