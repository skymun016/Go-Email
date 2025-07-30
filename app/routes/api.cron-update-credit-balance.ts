/**
 * Cron任务：定时更新所有邮箱的Credit balance
 * 通过Cloudflare Cron Triggers触发
 */

import { data } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { testMailboxes } from "~/db/schema";
import { and, isNotNull, eq } from "drizzle-orm";

/**
 * 从View usage链接中提取token
 */
function extractTokenFromViewUsageLink(viewUsageLink: string): string | null {
  try {
    const url = new URL(viewUsageLink);
    return url.searchParams.get('token');
  } catch (error) {
    console.error('提取token失败:', error);
    return null;
  }
}

/**
 * 调用Orb API获取客户信息
 */
async function getCustomerFromLink(token: string) {
  const url = `https://portal.withorb.com/api/v1/customer_from_link?token=${token}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GoMail-CronJob/1.0)',
      'Accept': 'application/json',
      'Referer': `https://portal.withorb.com/view?token=${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * 调用Orb API获取Credit balance
 */
async function getCreditBalanceFromOrb(customerId: string, pricingUnitId: string, token: string) {
  const url = `https://portal.withorb.com/api/v1/customers/${customerId}/ledger_summary?pricing_unit_id=${pricingUnitId}&token=${token}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GoMail-CronJob/1.0)',
      'Accept': 'application/json',
      'Referer': `https://portal.withorb.com/view?token=${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.credits_balance ? parseFloat(data.credits_balance) : null;
}

/**
 * 更新单个邮箱的Credit balance
 */
async function updateMailboxCreditBalance(mailboxData: any, db: any) {
  const email = mailboxData.email;
  
  try {
    console.log(`🔍 处理邮箱: ${email}`);
    
    if (!mailboxData.viewUsageLink) {
      console.log(`⚠️ 邮箱 ${email} 没有View usage链接，跳过`);
      return { email, status: 'skipped', reason: 'no_view_usage_link' };
    }
    
    // 提取token
    const token = extractTokenFromViewUsageLink(mailboxData.viewUsageLink);
    if (!token) {
      console.log(`⚠️ 邮箱 ${email} 无法提取token，跳过`);
      return { email, status: 'skipped', reason: 'invalid_token' };
    }
    
    // 获取客户信息
    const customerData = await getCustomerFromLink(token);
    if (!customerData.customer || !customerData.customer.id) {
      console.log(`⚠️ 邮箱 ${email} 无法获取客户信息，跳过`);
      return { email, status: 'skipped', reason: 'no_customer_data' };
    }
    
    const customerId = customerData.customer.id;
    
    // 获取User Messages的pricing unit ID
    const userMessagesPricingUnit = customerData.customer.ledger_pricing_units?.find(
      (unit: any) => unit.name === 'usermessages'
    );
    
    if (!userMessagesPricingUnit) {
      console.log(`⚠️ 邮箱 ${email} 找不到User Messages pricing unit，跳过`);
      return { email, status: 'skipped', reason: 'no_pricing_unit' };
    }
    
    // 获取Credit balance
    const creditBalance = await getCreditBalanceFromOrb(
      customerId, 
      userMessagesPricingUnit.id, 
      token
    );
    
    if (creditBalance === null) {
      console.log(`⚠️ 邮箱 ${email} 无法获取Credit balance，跳过`);
      return { email, status: 'skipped', reason: 'no_credit_balance' };
    }
    
    // 更新数据库
    await db
      .update(testMailboxes)
      .set({
        creditBalance: Math.round(creditBalance),
        creditBalanceUpdatedAt: new Date()
      })
      .where(eq(testMailboxes.email, email));
    
    console.log(`✅ 成功更新邮箱 ${email} 的Credit balance: ${creditBalance}`);
    
    return { 
      email, 
      status: 'updated', 
      creditBalance: Math.round(creditBalance),
      updatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ 更新邮箱 ${email} 失败:`, error);
    return { 
      email, 
      status: 'error', 
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 批量更新所有邮箱的Credit balance
 */
async function updateAllCreditBalances(db: any) {
  console.log('🚀 开始批量更新Credit balance...');
  
  // 获取所有有View usage链接的邮箱
  const mailboxes = await db
    .select()
    .from(testMailboxes)
    .where(
      and(
        isNotNull(testMailboxes.viewUsageLink),
        eq(testMailboxes.registrationStatus, "registered")
      )
    );
  
  console.log(`📊 找到 ${mailboxes.length} 个需要更新的邮箱`);
  
  const results = [];
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  // 逐个处理邮箱（避免并发过多导致API限制）
  for (const mailbox of mailboxes) {
    const result = await updateMailboxCreditBalance(mailbox, db);
    results.push(result);
    
    switch (result.status) {
      case 'updated':
        successCount++;
        break;
      case 'skipped':
        skipCount++;
        break;
      case 'error':
        errorCount++;
        break;
    }
    
    // 添加延迟避免API限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`📈 批量更新完成: 成功 ${successCount}, 跳过 ${skipCount}, 错误 ${errorCount}`);
  
  return {
    total: mailboxes.length,
    success: successCount,
    skipped: skipCount,
    errors: errorCount,
    results
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    // 验证请求来源（Cron触发器或管理员）
    const userAgent = request.headers.get('User-Agent');
    const isCronTrigger = userAgent?.includes('Cloudflare-Workers');
    
    if (!isCronTrigger) {
      // 如果不是Cron触发器，需要验证API token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return data({ success: false, error: '需要API token认证' }, { status: 401 });
      }
    }

    const db = createDB(getDatabase(context.cloudflare.env));

    const result = await updateAllCreditBalances(db);

    return data({
      success: true,
      message: `批量更新完成: 成功 ${result.success}, 跳过 ${result.skipped}, 错误 ${result.errors}`,
      data: result
    });

  } catch (error) {
    console.error("Cron任务执行失败:", error);
    return data({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    }, { status: 500 });
  }
}
