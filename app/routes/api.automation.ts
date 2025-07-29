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
    
    // 验证 API Token
    const apiToken = await requireApiToken(request, env);
    
    const db = createDB(getDatabase(env));
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const email = formData.get("email") as string;
    
    if (!email) {
      return data({
        success: false,
        error: "邮箱地址不能为空"
      }, { status: 400 });
    }
    
    switch (action) {
      case "mark-registered": {
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
        
        // 更新邮箱状态：已注册，次数125，未售出
        await db
          .update(testMailboxes)
          .set({
            registrationStatus: "registered",
            count: "125",
            saleStatus: "unsold",
            updatedAt: new Date()
          })
          .where(eq(testMailboxes.email, email));
        
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
          message: "邮箱状态已更新为已注册",
          data: {
            email: email,
            registrationStatus: "registered",
            count: "125",
            saleStatus: "unsold"
          }
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
