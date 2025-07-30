/**
 * 自动化注册脚本 API
 * 提供邮箱获取、验证码提取和状态更新功能
 */

import { data } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { testMailboxes, emails, mailboxes } from "~/db/schema";
import { eq, and, isNull, or, desc, like } from "drizzle-orm";
import { requireApiToken } from "~/lib/auth";
import { useApiToken } from "~/lib/db";

/**
 * 提取Credit balance查询逻辑为独立函数
 * 用于在注册成功后立即查询Credit balance
 */
async function updateCreditBalanceForMailbox(db: any, email: string, viewUsageLink: string) {
  try {
    console.log(`🔄 开始为邮箱 ${email} 更新Credit balance`);

    // 从 viewUsageLink 中提取必要的参数
    const url = new URL(viewUsageLink);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error("无效的 viewUsageLink，缺少 token");
    }

    // 调用 Orb API 获取 customer_id
    const customerResponse = await fetch(`https://portal.withorb.com/api/v1/customer_from_link?token=${token}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!customerResponse.ok) {
      throw new Error(`获取客户信息失败: ${customerResponse.status}`);
    }

    const customerData = await customerResponse.json() as any;
    const customerId = customerData.customer?.id;

    if (!customerId) {
      throw new Error("无法获取客户ID");
    }

    // 调用 Orb API 获取 Credit balance
    const ledgerResponse = await fetch(`https://portal.withorb.com/api/v1/customers/${customerId}/ledger_summary?pricing_unit_id=jWTJo9ptbapMWkvg&token=${token}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!ledgerResponse.ok) {
      throw new Error(`获取Credit balance失败: ${ledgerResponse.status}`);
    }

    const ledgerData = await ledgerResponse.json() as any;
    const creditBalance = parseFloat(ledgerData.credits_balance || "0");

    // 更新数据库中的Credit balance
    await db
      .update(testMailboxes)
      .set({
        creditBalance: Math.round(creditBalance),
        creditBalanceUpdatedAt: new Date()
      })
      .where(eq(testMailboxes.email, email));

    console.log(`✅ 邮箱 ${email} 的Credit balance已更新为: ${Math.round(creditBalance)}`);
    return Math.round(creditBalance);

  } catch (error) {
    console.error(`❌ 更新邮箱 ${email} 的Credit balance失败:`, error);
    throw error;
  }
}

/**
 * 从邮件内容中提取验证码
 * 支持多种常见的验证码格式
 */
function extractVerificationCode(textContent?: string, htmlContent?: string): string | null {
  if (!textContent && !htmlContent) return null;
  
  // 合并文本内容和HTML内容进行搜索
  const content = `${textContent || ''} ${htmlContent || ''}`;
  
  // 定义多种验证码匹配模式
  const patterns = [
    // "Your verification code is: 123456"
    /(?:verification code|验证码)(?:\s*is)?(?:\s*[:：])\s*(\d{6})/i,
    // "验证码：123456"
    /验证码[:：]\s*(\d{6})/i,
    // "Code: 123456"
    /code[:：]\s*(\d{6})/i,
    // "OTP: 123456"
    /otp[:：]\s*(\d{6})/i,
    // "PIN: 123456"
    /pin[:：]\s*(\d{6})/i,
    // 独立的6位数字（更宽泛的匹配）
    /\b(\d{6})\b/,
  ];
  
  // 按优先级尝试匹配
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// GET - 获取可用邮箱和验证码
export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    
    // 验证 API Token
    const apiToken = await requireApiToken(request, env);
    
    const db = createDB(getDatabase(env));
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    
    switch (action) {
      case "get-available-mailboxes": {
        const limit = parseInt(url.searchParams.get("limit") || "10");
        
        // 查询未注册且未售出的邮箱
        const availableMailboxes = await db
          .select({
            id: testMailboxes.id,
            email: testMailboxes.email,
            domain: testMailboxes.domain,
            verificationCode: testMailboxes.verificationCode,
            directLink: testMailboxes.directLink,
            createdAt: testMailboxes.createdAt,
            expiresAt: testMailboxes.expiresAt
          })
          .from(testMailboxes)
          .where(
            and(
              or(
                eq(testMailboxes.registrationStatus, "unregistered"),
                isNull(testMailboxes.registrationStatus)
              ),
              or(
                eq(testMailboxes.saleStatus, "unsold"),
                isNull(testMailboxes.saleStatus)
              )
            )
          )
          .limit(limit)
          .orderBy(testMailboxes.id);

        // 记录 API 使用
        await useApiToken(
          db,
          apiToken.id,
          `get-available-mailboxes:${limit}`,
          request.headers.get("CF-Connecting-IP") || undefined,
          request.headers.get("User-Agent") || undefined
        );

        return data({
          success: true,
          data: {
            mailboxes: availableMailboxes,
            count: availableMailboxes.length,
            timestamp: new Date().toISOString()
          }
        });
      }

      case "get-verification-codes": {
        const email = url.searchParams.get("email");
        
        if (!email) {
          return data({
            success: false,
            error: "邮箱地址参数缺失"
          }, { status: 400 });
        }

        // 验证邮箱是否在测试邮箱列表中
        const testMailbox = await db
          .select({ id: testMailboxes.id })
          .from(testMailboxes)
          .where(eq(testMailboxes.email, email))
          .limit(1);

        if (testMailbox.length === 0) {
          return data({
            success: false,
            error: "邮箱不存在于测试邮箱列表中"
          }, { status: 404 });
        }

        // 查找对应的邮箱记录
        const mailbox = await db
          .select({ id: mailboxes.id })
          .from(mailboxes)
          .where(eq(mailboxes.email, email))
          .limit(1);

        if (mailbox.length === 0) {
          return data({
            success: true,
            data: {
              email: email,
              emails: [],
              verificationCodes: [],
              message: "邮箱尚未接收到任何邮件"
            }
          });
        }

        // 获取该邮箱的所有邮件
        const emailList = await db
          .select({
            id: emails.id,
            subject: emails.subject,
            textContent: emails.textContent,
            htmlContent: emails.htmlContent,
            receivedAt: emails.receivedAt
          })
          .from(emails)
          .where(eq(emails.mailboxId, mailbox[0].id))
          .orderBy(desc(emails.receivedAt));

        // 提取验证码
        const emailsWithCodes = emailList.map(email => {
          const verificationCode = extractVerificationCode(email.textContent, email.htmlContent);
          return {
            ...email,
            verificationCode
          };
        });

        // 收集所有找到的验证码
        const verificationCodes = emailsWithCodes
          .filter(email => email.verificationCode)
          .map(email => ({
            code: email.verificationCode,
            subject: email.subject,
            receivedAt: email.receivedAt
          }));

        // 记录 API 使用
        await useApiToken(
          db,
          apiToken.id,
          email,
          request.headers.get("CF-Connecting-IP") || undefined,
          request.headers.get("User-Agent") || undefined
        );

        return data({
          success: true,
          data: {
            email: email,
            emails: emailsWithCodes,
            verificationCodes: verificationCodes,
            totalEmails: emailList.length,
            codesFound: verificationCodes.length
          }
        });
      }

      default:
        return data({
          success: false,
          error: "不支持的操作。支持的操作: get-available-mailboxes, get-verification-codes"
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error("自动化 API 错误:", error);
    
    // 如果是认证错误，返回401
    if (error instanceof Response && error.status === 401) {
      return error;
    }
    
    return data({
      success: false,
      error: "服务器内部错误"
    }, { status: 500 });
  }
}

// POST - 更新邮箱状态
export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const env = context.cloudflare.env;

    // 检查是否是 Cron 任务
    const userAgent = request.headers.get("User-Agent") || "";
    const isCronTask = userAgent.includes("Cloudflare-Workers-Cron");

    // 验证 API Token（Cron 任务除外）
    let apiToken = null;
    if (!isCronTask) {
      apiToken = await requireApiToken(request, env);
    }

    const db = createDB(getDatabase(env));

    // 支持JSON和FormData两种请求格式
    let action: string;
    let email: string;
    let requestData: any = {};

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // 处理JSON请求
      const jsonData = await request.json() as any;
      action = jsonData.action;
      email = jsonData.email;
      requestData = jsonData;
    } else {
      // 处理FormData请求
      const formData = await request.formData();
      action = formData.get("action") as string;
      email = formData.get("email") as string;
      // 将FormData转换为对象
      for (const [key, value] of formData.entries()) {
        requestData[key] = value;
      }
    }

    switch (action) {
      case "get-all-mailboxes": {
        // 获取所有邮箱（用于 Cron 任务）
        const allMailboxes = await db
          .select({
            id: testMailboxes.id,
            email: testMailboxes.email,
            viewUsageLink: testMailboxes.viewUsageLink,
            creditBalance: testMailboxes.creditBalance,
            creditBalanceUpdatedAt: testMailboxes.creditBalanceUpdatedAt
          })
          .from(testMailboxes)
          .orderBy(testMailboxes.id);

        return data({
          success: true,
          data: allMailboxes,
          count: allMailboxes.length
        });
      }

      case "update-credit-balance": {
        // 更新单个邮箱的Credit balance
        const email = requestData.email as string;
        const viewUsageLink = requestData.viewUsageLink as string;

        if (!email && !viewUsageLink) {
          return data({
            success: false,
            error: "缺少 email 或 viewUsageLink 参数"
          }, { status: 400 });
        }

        try {
          // 首先查找邮箱记录
          let mailboxRecord;
          if (email) {
            const result = await db
              .select()
              .from(testMailboxes)
              .where(eq(testMailboxes.email, email))
              .limit(1);
            mailboxRecord = result[0];
          } else if (viewUsageLink) {
            const result = await db
              .select()
              .from(testMailboxes)
              .where(eq(testMailboxes.viewUsageLink, viewUsageLink))
              .limit(1);
            mailboxRecord = result[0];
          }

          if (!mailboxRecord) {
            return data({
              success: false,
              error: "未找到匹配的邮箱记录"
            }, { status: 404 });
          }

          if (!mailboxRecord.viewUsageLink) {
            return data({
              success: false,
              error: "邮箱记录缺少 viewUsageLink"
            }, { status: 400 });
          }

          // 从 viewUsageLink 中提取必要的参数
          const url = new URL(mailboxRecord.viewUsageLink);
          const token = url.searchParams.get('token');

          if (!token) {
            return data({
              success: false,
              error: "无效的 viewUsageLink，缺少 token"
            }, { status: 400 });
          }

          // 调用 Orb API 获取 customer_id
          const customerResponse = await fetch(`https://portal.withorb.com/api/v1/customer_from_link?token=${token}`, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          });

          if (!customerResponse.ok) {
            return data({
              success: false,
              error: `获取客户信息失败: ${customerResponse.status}`
            }, { status: 500 });
          }

          const customerData = await customerResponse.json() as any;
          const customerId = customerData.customer?.id;

          if (!customerId) {
            return data({
              success: false,
              error: "无法获取客户ID"
            }, { status: 500 });
          }

          // 调用 Orb API 获取 Credit balance
          const ledgerResponse = await fetch(`https://portal.withorb.com/api/v1/customers/${customerId}/ledger_summary?pricing_unit_id=jWTJo9ptbapMWkvg&token=${token}`, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          });

          if (!ledgerResponse.ok) {
            return data({
              success: false,
              error: `获取Credit balance失败: ${ledgerResponse.status}`
            }, { status: 500 });
          }

          const ledgerData = await ledgerResponse.json() as any;
          const creditBalance = parseFloat(ledgerData.credits_balance || "0");

          // 更新数据库中的Credit balance
          const result = await db
            .update(testMailboxes)
            .set({
              creditBalance: Math.round(creditBalance),
              creditBalanceUpdatedAt: new Date()
            })
            .where(eq(testMailboxes.email, mailboxRecord.email))
            .returning({ id: testMailboxes.id, email: testMailboxes.email });

          return data({
            success: true,
            message: "Credit balance更新成功",
            data: {
              email: result[0].email,
              creditBalance: Math.round(creditBalance),
              updatedAt: new Date().toISOString()
            }
          });

        } catch (error) {
          console.error("更新Credit balance错误:", error);
          return data({
            success: false,
            error: "更新Credit balance时发生错误"
          }, { status: 500 });
        }
      }

      case "mark-registered": {
        if (!email) {
          return data({
            success: false,
            error: "邮箱地址不能为空"
          }, { status: 400 });
        }

        // 获取可选的 viewUsageLink 参数
        const viewUsageLink = requestData.viewUsageLink as string | null;
        console.log("🔗 API接收到的 viewUsageLink:", viewUsageLink);

        // 检查邮箱是否存在
        const existingMailbox = await db
          .select({ id: testMailboxes.id })
          .from(testMailboxes)
          .where(eq(testMailboxes.email, email))
          .limit(1);

        if (existingMailbox.length === 0) {
          return data({
            success: false,
            error: "邮箱不存在"
          }, { status: 404 });
        }

        // 准备更新数据
        const updateData: any = {
          registrationStatus: "registered",
          count: "125",
          saleStatus: "unsold",
          isAutoRegistered: true,
          updatedAt: new Date()
        };

        // 如果提供了 viewUsageLink，则添加到更新数据中
        if (viewUsageLink) {
          updateData.viewUsageLink = viewUsageLink;
        }

        // 更新邮箱状态：已注册，次数125，未售出，标记为自动注册
        await db
          .update(testMailboxes)
          .set(updateData)
          .where(eq(testMailboxes.email, email));

        // 记录 API 使用（仅非 Cron 任务）
        if (apiToken) {
          await useApiToken(
            db,
            apiToken.id,
            email,
            request.headers.get("CF-Connecting-IP") || undefined,
            request.headers.get("User-Agent") || undefined
          );
        }

        // 准备返回数据
        const responseData: any = {
          email: email,
          registrationStatus: "registered",
          count: "125",
          saleStatus: "unsold",
          isAutoRegistered: true
        };

        // 如果提供了 viewUsageLink，立即查询并更新 Credit balance
        if (viewUsageLink) {
          responseData.viewUsageLink = viewUsageLink;

          try {
            console.log(`🚀 注册成功后立即查询 Credit balance: ${email}`);
            const creditBalance = await updateCreditBalanceForMailbox(db, email, viewUsageLink);
            responseData.creditBalance = creditBalance;
            responseData.creditBalanceUpdated = true;
            console.log(`✅ 注册后立即更新 Credit balance 成功: ${email} -> ${creditBalance}`);
          } catch (creditError) {
            console.error(`⚠️ 注册后立即更新 Credit balance 失败: ${email}`, creditError);
            // 不影响主要的注册流程，只记录警告
            responseData.creditBalanceUpdated = false;
            responseData.creditBalanceError = creditError instanceof Error ? creditError.message : String(creditError);
          }
        }

        return data({
          success: true,
          message: "邮箱状态已更新为已注册（自动注册脚本）",
          data: responseData
        });
      }
      
      default:
        return data({
          success: false,
          error: "不支持的操作。支持的操作: mark-registered"
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error("自动化 API 操作错误:", error);
    console.error("错误详情:", error instanceof Error ? error.message : String(error));
    console.error("错误堆栈:", error instanceof Error ? error.stack : "无堆栈信息");

    // 如果是认证错误，返回401
    if (error instanceof Response && error.status === 401) {
      return error;
    }

    return data({
      success: false,
      error: `服务器内部错误: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
