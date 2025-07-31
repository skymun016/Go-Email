/**
 * 基于数据库的测试邮箱管理页面
 */

import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useRouteError, isRouteErrorResponse, useSearchParams } from "react-router";
import type { Route } from "./+types/test-mailboxes-db";
import { createDB } from "~/lib/db";
import { getDatabase } from "~/config/app";
import { testMailboxes, mailboxes } from "~/db/schema";
import { asc, count, eq, like, sql, and, isNull } from "drizzle-orm";
import { requireAdmin } from "~/lib/auth";

// 当前支持的域名列表（与 config.cjs 中的配置保持一致）
const BACKUP_DOMAINS = [
  'aug.qzz.io',           // 主域名
  'asksy.dpdns.org',      // 备用域名1
  'v5augment.ggff.net',   // 备用域名2
  'xm252.qzz.io',        // 备用域名3
  'augmails.qzz.io',     // 备用域名4
  'adtg.qzz.io',         // 备用域名5
  'amdt.qzz.io'          // 备用域名6
];

// 验证码生成密钥
const VERIFICATION_SECRET = "gomail-verification-secret-2024";

/**
 * 生成验证码的算法
 */
function generateVerificationCode(emailPrefix: string): string {
  try {
    const normalizedPrefix = emailPrefix.toLowerCase().trim();
    let hash = 0;
    const combined = VERIFICATION_SECRET + normalizedPrefix;

    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const positiveHash = Math.abs(hash);
    const code = positiveHash % 1000000;

    return code.toString().padStart(6, '0');
  } catch (error) {
    let fallbackCode = 0;
    for (let i = 0; i < emailPrefix.length; i++) {
      fallbackCode += emailPrefix.charCodeAt(i) * (i + 1);
    }
    return (fallbackCode % 1000000).toString().padStart(6, '0');
  }
}

/**
 * 生成真实的邮箱前缀
 */
function generateRealisticEmailPrefixes(count: number): string[] {
  const prefixes: string[] = [];
  const firstNames = [
    'john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'chris', 'anna',
    'tom', 'mary', 'james', 'emma', 'robert', 'olivia', 'william', 'sophia',
    'alex', 'emily', 'daniel', 'jessica', 'michael', 'ashley', 'matthew', 'amanda',
    'andrew', 'jennifer', 'joshua', 'michelle', 'ryan', 'stephanie', 'kevin', 'nicole'
  ];

  const lastNames = [
    'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
    'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas',
    'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez', 'thompson', 'white'
  ];

  const commonWords = [
    'test', 'demo', 'user', 'admin', 'hello', 'welcome', 'contact', 'info',
    'support', 'help', 'service', 'team', 'office', 'business', 'company', 'work',
    'project', 'dev', 'developer', 'code', 'tech', 'digital', 'online', 'web'
  ];

  const numbers = [
    '123', '456', '789', '2024', '2023', '01', '02', '03', '04', '05',
    '06', '07', '08', '09', '10', '99', '88', '77', '66', '55'
  ];

  const usedPrefixes = new Set<string>();

  while (prefixes.length < count) {
    let prefix = '';
    const type = Math.random();

    if (type < 0.3) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      prefix = `${firstName}.${lastName}`;
    } else if (type < 0.5) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      prefix = `${firstName}${lastName}`;
    } else if (type < 0.7) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${firstName}${number}`;
    } else if (type < 0.85) {
      const word = commonWords[Math.floor(Math.random() * commonWords.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${word}${number}`;
    } else {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${firstName}_${number}`;
    }

    if (!usedPrefixes.has(prefix)) {
      usedPrefixes.add(prefix);
      prefixes.push(prefix);
    }
  }

  return prefixes;
}

/**
 * 生成测试邮箱数据
 */
function generateTestMailboxes(startId: number, count: number) {
  const prefixes = generateRealisticEmailPrefixes(count);
  const testData = [];

  prefixes.forEach((prefix, index) => {
    const domain = BACKUP_DOMAINS[Math.floor(Math.random() * BACKUP_DOMAINS.length)];
    const email = `${prefix}@${domain}`;
    const code = generateVerificationCode(prefix);

    testData.push({
      id: startId + index,
      email: email,
      prefix: prefix,
      domain: domain,
      verification_code: code,
      direct_link: `https://app.aug.qzz.io/verify-mailbox?email=${encodeURIComponent(email)}&code=${code}`,
      copy_count: 0,
      created_at: Math.floor(Date.now() / 1000),
      expires_at: null,
      registration_status: 'unregistered',
      count: null,
      sale_status: 'unsold',
      updated_at: null,
      remark: null,
      is_auto_registered: 0,
      view_usage_link: null,
      credit_balance: null,
      credit_balance_updated_at: null
    });
  });

  return testData;
}

/**
 * 生成自定义前缀的测试邮箱数据
 */
function generateCustomTestMailboxes(startId: number, count: number, customPrefix: string, selectedDomain: string) {
  const testData = [];

  for (let i = 0; i < count; i++) {
    // 使用自定义前缀和选择的域名
    let prefix = customPrefix;

    // 如果生成多个邮箱，在前缀后添加数字后缀
    if (count > 1) {
      prefix = `${customPrefix}_${i + 1}`;
    }

    const email = `${prefix}@${selectedDomain}`;
    const code = generateVerificationCode(prefix);

    testData.push({
      id: startId + i,
      email: email,
      prefix: prefix,
      domain: selectedDomain,
      verification_code: code,
      direct_link: `https://app.aug.qzz.io/verify-mailbox?email=${encodeURIComponent(email)}&code=${code}`,
      copy_count: 0,
      created_at: Math.floor(Date.now() / 1000),
      expires_at: null,
      registration_status: 'unregistered',
      count: null,
      sale_status: 'unsold',
      updated_at: null,
      remark: null,
      is_auto_registered: 0,
      view_usage_link: null,
      credit_balance: null,
      credit_balance_updated_at: null
    });
  }

  return testData;
}

// 处理延长时间的action
export async function action({ context, request }: Route.ActionArgs) {
  console.log('🎯 Action函数被调用！');
  console.log('📋 请求方法:', request.method);
  console.log('🌐 请求URL:', request.url);
  console.log('📝 请求Headers:', Object.fromEntries(request.headers.entries()));

  try {
    const env = context.cloudflare.env;

    // 验证管理员权限
    const adminResult = await requireAdmin(request, env);
    if (adminResult instanceof Response) {
      return adminResult; // 返回重定向响应
    }

    const db = createDB(getDatabase(env));

    const formData = await request.formData();
    const action = formData.get('action');
    const mailboxId = formData.get('mailboxId');

    console.log('📦 FormData内容:', {
      action: action,
      mailboxId: mailboxId,
      allEntries: Object.fromEntries(formData.entries())
    });

    if (action === 'updateRegistrationStatus') {
      // 批量更新注册状态
      try {
        await db
          .update(testMailboxes)
          .set({ registrationStatus: 'unregistered' })
          .where(eq(testMailboxes.registrationStatus, 'registered'));

        return new Response(JSON.stringify({ success: true, message: '成功更新所有记录的注册状态为"未注册"' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('更新注册状态失败:', error);
        return new Response(JSON.stringify({ success: false, message: '更新注册状态失败' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'delete' && mailboxId) {
      // 删除邮箱
      try {
        const mailboxIdInt = parseInt(mailboxId as string);

        // 首先获取测试邮箱信息
        const testMailbox = await db
          .select()
          .from(testMailboxes)
          .where(eq(testMailboxes.id, mailboxIdInt))
          .limit(1);

        if (testMailbox.length === 0) {
          // 邮箱不存在，但这可能意味着已经被删除了
          // 检查是否确实不存在，如果不存在则认为删除成功
          console.log(`⚠️ 邮箱ID ${mailboxIdInt} 不存在，可能已经被删除`);
          return new Response(JSON.stringify({
            success: true,
            message: '邮箱已删除（邮箱不存在或已被删除）'
          }), {
            status: 200, // 返回200而不是404，因为删除的目标已经达成
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const email = testMailbox[0].email;
        console.log(`🗑️ 开始删除邮箱: ${email} (ID: ${mailboxIdInt})`);

        // 从测试邮箱表删除
        const deleteResult = await db
          .delete(testMailboxes)
          .where(eq(testMailboxes.id, mailboxIdInt));

        console.log(`✅ 从测试邮箱表删除成功: ${email}`);

        // 同时从实际邮箱表删除（如果存在）
        try {
          await db
            .delete(mailboxes)
            .where(eq(mailboxes.email, email));

          console.log(`✅ 同时删除了邮箱 ${email} 在两个表中的记录`);
        } catch (error) {
          console.log(`⚠️ 删除实际邮箱表记录失败，可能邮箱不存在: ${error}`);
          // 不影响主要操作，继续执行
        }

        return new Response(JSON.stringify({
          success: true,
          message: `邮箱 ${email} 已成功删除`
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error("删除邮箱失败:", error);
        return new Response(JSON.stringify({
          success: false,
          message: `删除邮箱失败: ${error instanceof Error ? error.message : '未知错误'}`
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'extend' && mailboxId) {
      // 首先获取测试邮箱信息
      const testMailbox = await db
        .select()
        .from(testMailboxes)
        .where(eq(testMailboxes.id, parseInt(mailboxId as string)))
        .limit(1);

      if (testMailbox.length === 0) {
        return new Response(JSON.stringify({ success: false, message: '测试邮箱不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 从当前过期时间延长7天（修复逻辑）
      const currentExpiresAt = new Date(testMailbox[0].expiresAt);
      const newExpiresAt = new Date(currentExpiresAt.getTime() + 7 * 24 * 60 * 60 * 1000);

      console.log(`📅 延长时间逻辑：从 ${currentExpiresAt.toISOString()} 延长到 ${newExpiresAt.toISOString()}`);

      // 更新测试邮箱表的过期时间
      await db
        .update(testMailboxes)
        .set({ expiresAt: newExpiresAt })
        .where(eq(testMailboxes.id, parseInt(mailboxId as string)));

      // 同时更新实际邮箱表的过期时间（如果存在）
      try {
        await db
          .update(mailboxes)
          .set({ expiresAt: newExpiresAt })
          .where(eq(mailboxes.email, testMailbox[0].email));

        console.log(`✅ 同时更新了邮箱 ${testMailbox[0].email} 在两个表中的过期时间`);
      } catch (error) {
        console.log(`⚠️ 更新实际邮箱表失败，可能邮箱不存在: ${error}`);
        // 不影响主要操作，继续执行
      }

      return new Response(JSON.stringify({ success: true, message: '邮箱有效期已延长7天' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'generate' && formData.get('count')) {
      // 生成新的测试邮箱
      const count = parseInt(formData.get('count') as string);
      const mode = formData.get('mode') as string || 'random';
      const customPrefix = formData.get('customPrefix') as string;
      const selectedDomain = formData.get('selectedDomain') as string;

      if (isNaN(count) || count <= 0 || count > 500) {
        return new Response(JSON.stringify({
          success: false,
          message: '生成数量必须是1-500之间的数字'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 自定义模式下的验证
      if (mode === 'custom') {
        if (!customPrefix || !selectedDomain) {
          return new Response(JSON.stringify({
            success: false,
            message: '自定义模式下必须提供前缀和域名'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(customPrefix)) {
          return new Response(JSON.stringify({
            success: false,
            message: '邮箱前缀只能包含字母、数字、下划线和连字符'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (customPrefix.length < 3 || customPrefix.length > 20) {
          return new Response(JSON.stringify({
            success: false,
            message: '邮箱前缀长度必须在3-20个字符之间'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!BACKUP_DOMAINS.includes(selectedDomain)) {
          return new Response(JSON.stringify({
            success: false,
            message: '选择的域名不在支持列表中'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      try {
        // 获取当前最大ID
        const maxIdResult = await db
          .select({ maxId: sql<number>`MAX(id)` })
          .from(testMailboxes)
          .limit(1);

        const startId = (maxIdResult[0]?.maxId || 0) + 1;

        // 生成新邮箱数据的逻辑
        const newMailboxes = mode === 'custom'
          ? generateCustomTestMailboxes(startId, count, customPrefix, selectedDomain)
          : generateTestMailboxes(startId, count);

        // 批量插入新邮箱
        for (const mailbox of newMailboxes) {
          await db.insert(testMailboxes).values({
            id: mailbox.id,
            email: mailbox.email,
            verificationCode: mailbox.verification_code,
            domain: mailbox.domain,
            prefix: mailbox.prefix,
            directLink: mailbox.direct_link,
            emailCopyCount: mailbox.copy_count,
            linkCopyCount: 0,
            createdAt: new Date(mailbox.created_at * 1000),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
            registrationStatus: mailbox.registration_status as "registered" | "unregistered",
            count: mailbox.count as "125" | "650" | null,
            saleStatus: mailbox.sale_status as "sold" | "unsold",
            updatedAt: new Date(),
            remark: mailbox.remark,
            isAutoRegistered: Boolean(mailbox.is_auto_registered),
            viewUsageLink: mailbox.view_usage_link,
            creditBalance: mailbox.credit_balance,
            creditBalanceUpdatedAt: mailbox.credit_balance_updated_at ? new Date(mailbox.credit_balance_updated_at) : null
          });
        }

        const modeText = mode === 'custom'
          ? `自定义前缀 "${customPrefix}" 在域名 "${selectedDomain}"`
          : '随机生成';

        console.log(`✅ 成功${modeText}生成 ${count} 个新邮箱，ID范围: ${startId}-${startId + count - 1}`);

        return new Response(JSON.stringify({
          success: true,
          message: `成功${modeText}生成 ${count} 个新邮箱！ID范围: ${startId}-${startId + count - 1}`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('生成邮箱失败:', error);
        return new Response(JSON.stringify({
          success: false,
          message: `生成邮箱失败: ${error instanceof Error ? error.message : '未知错误'}`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'updateCopyCount' && mailboxId) {
      // 更新复制次数
      const copyType = formData.get('copyType') as string;

      try {
        const mailboxIdInt = parseInt(mailboxId as string);

        if (copyType === 'email') {
          // 更新邮箱复制次数
          await db
            .update(testMailboxes)
            .set({ emailCopyCount: sql`${testMailboxes.emailCopyCount} + 1` })
            .where(eq(testMailboxes.id, mailboxIdInt));
        } else if (copyType === 'link') {
          // 更新链接复制次数
          await db
            .update(testMailboxes)
            .set({ linkCopyCount: sql`${testMailboxes.linkCopyCount} + 1` })
            .where(eq(testMailboxes.id, mailboxIdInt));
        }

        return new Response(JSON.stringify({ success: true, message: '复制次数已更新' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error("更新复制次数失败:", error);
        return new Response(JSON.stringify({ success: false, message: '更新复制次数失败' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'updateField' && mailboxId) {
      // 更新字段（备注、注册状态、次数、售出状态）
      const fieldName = formData.get('fieldName') as string;
      const fieldValue = formData.get('fieldValue') as string;

      if (!fieldName) {
        return new Response(JSON.stringify({ success: false, message: '字段名称不能为空' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const updateData: any = {
          updatedAt: new Date()
        };

        // 根据字段名称设置更新值
        switch (fieldName) {
          case 'remark':
            updateData.remark = fieldValue || null;
            break;
          case 'registrationStatus':
            updateData.registrationStatus = fieldValue === 'clear' ? null : fieldValue;
            break;
          case 'count':
            updateData.count = fieldValue === 'clear' ? null : fieldValue;
            break;
          case 'saleStatus':
            updateData.saleStatus = fieldValue === 'clear' ? null : fieldValue;
            break;
          default:
            return new Response(JSON.stringify({ success: false, message: '无效的字段名称' }), {
              headers: { 'Content-Type': 'application/json' }
            });
        }

        await db
          .update(testMailboxes)
          .set(updateData)
          .where(eq(testMailboxes.id, parseInt(mailboxId as string)));

        return new Response(JSON.stringify({ success: true, message: '字段已更新' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error("更新字段失败:", error);
        return new Response(JSON.stringify({ success: false, message: `更新字段失败: ${error instanceof Error ? error.message : '未知错误'}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ success: false, message: '无效的操作' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("操作失败:", error);
    return new Response(JSON.stringify({ success: false, message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 加载测试邮箱数据
export async function loader({ context, request }: Route.LoaderArgs) {
  try {
    const env = context.cloudflare.env;

    // 验证管理员权限
    const adminResult = await requireAdmin(request, env);
    if (adminResult instanceof Response) {
      return adminResult; // 返回重定向响应
    }

    const db = createDB(getDatabase(env));

    // 获取分页、搜索、筛选和Tab参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const itemsPerPage = parseInt(url.searchParams.get('limit') || '50');
    const searchQuery = url.searchParams.get('search')?.trim() || '';
    const registrationStatusFilter = decodeURIComponent(url.searchParams.get('registrationStatus') || '');
    const countFilter = decodeURIComponent(url.searchParams.get('count') || '');
    const saleStatusFilter = decodeURIComponent(url.searchParams.get('saleStatus') || '');
    const activeTab = url.searchParams.get('tab') || 'all'; // 新增Tab参数，默认显示全部
    const sortBy = url.searchParams.get('sortBy') || 'id'; // 新增排序参数
    const sortOrder = url.searchParams.get('sortOrder') || 'asc'; // 新增排序方向
    const offset = (page - 1) * itemsPerPage;

    // 映射中文筛选值到数据库值
    const mapRegistrationStatus = (value: string) => {
      switch (value) {
        case '已注册': return 'registered';
        case '未注册': return 'unregistered';
        case '未设置':
        case 'unset': return null;
        default: return null;
      }
    };

    const mapSaleStatus = (value: string) => {
      switch (value) {
        case '已出': return 'sold';
        case '未出': return 'unsold';
        case '未设置':
        case 'unset': return null;
        default: return null;
      }
    };

    const mapCount = (value: string) => {
      switch (value) {
        case '125': return '125';
        case '650': return '650';
        case '未设置':
        case 'unset': return null;
        default: return null;
      }
    };

    console.log(`开始加载测试邮箱数据... 页码: ${page}, 每页: ${itemsPerPage}, 搜索: "${searchQuery}", 筛选: 注册状态=${registrationStatusFilter}, 次数=${countFilter}, 售出状态=${saleStatusFilter}`);

    // 构建查询条件
    const conditions = [];

    // 搜索条件
    if (searchQuery.length >= 2) {
      conditions.push(sql`LOWER(${testMailboxes.email}) LIKE LOWER(${`%${searchQuery}%`})`);
    }

    // 筛选条件
    if (registrationStatusFilter && registrationStatusFilter !== '全部') {
      const dbValue = mapRegistrationStatus(registrationStatusFilter);
      if (dbValue === null) {
        conditions.push(isNull(testMailboxes.registrationStatus));
      } else {
        conditions.push(eq(testMailboxes.registrationStatus, dbValue));
      }
    }

    if (countFilter && countFilter !== '全部') {
      const dbValue = mapCount(countFilter);
      if (dbValue === null) {
        conditions.push(isNull(testMailboxes.count));
      } else {
        conditions.push(eq(testMailboxes.count, dbValue));
      }
    }

    if (saleStatusFilter && saleStatusFilter !== '全部') {
      const dbValue = mapSaleStatus(saleStatusFilter);
      if (dbValue === null) {
        conditions.push(isNull(testMailboxes.saleStatus));
      } else {
        conditions.push(eq(testMailboxes.saleStatus, dbValue));
      }
    }

    // Tab分类条件
    switch (activeTab) {
      case 'all':
        // Tab 0: 全部邮箱 - 不添加任何过滤条件
        break;
      case 'unregistered':
        // Tab 1: 未注册且未售出/-
        conditions.push(eq(testMailboxes.registrationStatus, 'unregistered'));
        conditions.push(
          sql`(${testMailboxes.saleStatus} IS NULL OR ${testMailboxes.saleStatus} = 'unsold')`
        );
        break;
      case 'registered_unsold':
        // Tab 2: 已注册未售出（包含售出状态为-的邮箱）
        conditions.push(eq(testMailboxes.registrationStatus, 'registered'));
        conditions.push(
          sql`(${testMailboxes.saleStatus} IS NULL OR ${testMailboxes.saleStatus} = 'unsold')`
        );
        break;
      case 'registered_sold':
        // Tab 3: 已注册已售出
        conditions.push(eq(testMailboxes.registrationStatus, 'registered'));
        conditions.push(eq(testMailboxes.saleStatus, 'sold'));
        break;
      case 'auto_registered':
        // Tab 4: 自动注册邮箱
        conditions.push(eq(testMailboxes.isAutoRegistered, true));
        break;
    }

    // 构建排序条件
    const getSortColumn = (sortBy: string) => {
      switch (sortBy) {
        case 'email': return testMailboxes.email;
        case 'emailCopyCount': return testMailboxes.emailCopyCount;
        case 'linkCopyCount': return testMailboxes.linkCopyCount;
        case 'expiresAt': return testMailboxes.expiresAt;
        case 'registrationStatus': return testMailboxes.registrationStatus;
        case 'saleStatus': return testMailboxes.saleStatus;
        case 'updatedAt': return testMailboxes.updatedAt;
        case 'creditBalance': return testMailboxes.creditBalance;
        default: return testMailboxes.id;
      }
    };

    const sortColumn = getSortColumn(sortBy);
    const orderByClause = sortOrder === 'desc' ? sql`${sortColumn} DESC` : asc(sortColumn);

    // 第一步：获取分页的测试邮箱（支持动态排序、搜索和筛选）
    let mailboxes;
    if (conditions.length > 0) {
      // 使用and()函数来组合多个条件
      const combinedCondition = conditions.length === 1
        ? conditions[0]
        : and(...conditions);

      mailboxes = await db
        .select()
        .from(testMailboxes)
        .where(combinedCondition)
        .orderBy(orderByClause)
        .limit(itemsPerPage)
        .offset(offset);
    } else {
      mailboxes = await db
        .select()
        .from(testMailboxes)
        .orderBy(orderByClause)
        .limit(itemsPerPage)
        .offset(offset);
    }

    console.log(`成功获取 ${mailboxes.length} 个邮箱`);

    // 第二步：获取总数（支持搜索和筛选条件）
    let totalCount = 0;
    try {
      if (conditions.length > 0) {
        // 有条件的总数查询
        const combinedCondition = conditions.length === 1
          ? conditions[0]
          : and(...conditions);

        const totalCountResult = await db
          .select({ count: count() })
          .from(testMailboxes)
          .where(combinedCondition);
        totalCount = totalCountResult[0]?.count || 0;
      } else {
        // 无条件的总数查询
        const totalCountResult = await db.select({ count: count() }).from(testMailboxes);
        totalCount = totalCountResult[0]?.count || 0;
      }
      console.log(`总数查询成功: ${totalCount} (搜索: "${searchQuery}", 筛选条件: ${conditions.length}个)`);
    } catch (countError) {
      console.error("总数查询失败:", countError);
      // 如果count查询失败，使用邮箱数组长度作为备选
      totalCount = mailboxes.length;
    }

    // 第三步：获取自动注册邮箱统计
    let autoRegisteredCount = 0;
    try {
      const autoRegisteredResult = await db
        .select({ count: count() })
        .from(testMailboxes)
        .where(eq(testMailboxes.isAutoRegistered, true));
      autoRegisteredCount = autoRegisteredResult[0]?.count || 0;
      console.log(`自动注册邮箱统计: ${autoRegisteredCount}`);
    } catch (autoCountError) {
      console.error("自动注册邮箱统计查询失败:", autoCountError);
    }

    console.log("所有数据加载完成");

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const isFiltering = !!(registrationStatusFilter || countFilter || saleStatusFilter);

    return {
      mailboxes,
      totalCount,
      autoRegisteredCount,
      currentPage: page,
      itemsPerPage,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      searchQuery,
      isSearching: searchQuery.length >= 2,
      filters: {
        registrationStatus: registrationStatusFilter,
        count: countFilter,
        saleStatus: saleStatusFilter
      },
      isFiltering,
      activeTab,
      sortBy,
      sortOrder
    };

  } catch (error) {
    console.error("加载测试邮箱失败:", error);
    throw new Response(`加载测试邮箱失败: ${error instanceof Error ? error.message : '未知错误'}`, { status: 500 });
  }
}

export default function TestMailboxesDB() {
  const { mailboxes, totalCount, autoRegisteredCount, currentPage, itemsPerPage, totalPages, hasNextPage, hasPrevPage, searchQuery, isSearching, filters, isFiltering, activeTab, sortBy, sortOrder } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [currentHost, setCurrentHost] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchInput, setSearchInput] = useState(searchQuery || '');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; email: string } | null>(null);

  // 本地状态管理复制次数，实现实时更新
  const [localMailboxes, setLocalMailboxes] = useState(mailboxes);

  // 同步服务器数据到本地状态
  useEffect(() => {
    setLocalMailboxes(mailboxes);
  }, [mailboxes]);

  // 备注编辑状态管理
  const [editingRemark, setEditingRemark] = useState<Record<number, boolean>>({});
  const [remarkValues, setRemarkValues] = useState<Record<number, string>>({});
  const [remarkLoading, setRemarkLoading] = useState<Record<number, boolean>>({});



  // 搜索处理函数
  const handleSearch = (query: string) => {
    setIsSearchLoading(true);
    const newSearchParams = new URLSearchParams(searchParams);

    if (query.trim().length >= 2) {
      newSearchParams.set('search', query.trim());
      newSearchParams.set('page', '1'); // 搜索时重置到第一页
    } else {
      newSearchParams.delete('search');
      newSearchParams.set('page', '1');
    }

    setSearchParams(newSearchParams);
    setIsSearchLoading(false);
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchInput('');
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('search');
    newSearchParams.set('page', '1');
    setSearchParams(newSearchParams);
  };

  // 防抖搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== searchQuery) {
        handleSearch(searchInput);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // 同步搜索输入框
  useEffect(() => {
    setSearchInput(searchQuery || '');
  }, [searchQuery]);

  // 筛选处理函数
  const handleFilter = (filterType: string, value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);

    if (value && value !== 'all' && value !== '全部') {
      newSearchParams.set(filterType, value);
    } else {
      newSearchParams.delete(filterType);
    }

    newSearchParams.set('page', '1'); // 筛选时重置到第一页
    setSearchParams(newSearchParams);
  };

  // 清除所有筛选
  const clearAllFilters = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('registrationStatus');
    newSearchParams.delete('count');
    newSearchParams.delete('saleStatus');
    newSearchParams.set('page', '1');
    setSearchParams(newSearchParams);
  };

  // 重置所有筛选和搜索
  const resetAllFilters = () => {
    setSearchInput('');
    const newSearchParams = new URLSearchParams();
    newSearchParams.set('page', '1');
    setSearchParams(newSearchParams);
  };

  // 删除邮箱
  const handleDelete = async (id: string, email: string) => {
    setDeleteConfirm({ id, email });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    console.log('🚀 开始删除操作，邮箱ID:', deleteConfirm.id);

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('mailboxId', deleteConfirm.id);

    console.log('📤 使用React Router fetcher发送删除请求...');
    fetcher.submit(formData, { method: 'POST' });

    console.log('🏁 删除操作完成，清理确认对话框');
    setDeleteConfirm(null);
  };



  // 更新字段 - 立即保存数据并更新本地显示
  const updateField = async (mailboxId: number, fieldName: string, fieldValue: string) => {
    try {
      // 立即更新本地状态
      setLocalMailboxes(prev =>
        prev.map(mailbox =>
          mailbox.id === mailboxId
            ? { ...mailbox, [fieldName]: fieldValue }
            : mailbox
        )
      );

      const formData = new FormData();
      formData.append('mailboxId', mailboxId.toString());
      formData.append('fieldName', fieldName);
      formData.append('fieldValue', fieldValue);

      const response = await fetch('/api/update-field', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        // 如果更新失败，恢复原始状态
        setLocalMailboxes(mailboxes);
        console.error('更新失败:', result.message);
      }
    } catch (error) {
      console.error('更新字段失败:', error);
      // 恢复原始状态
      setLocalMailboxes(mailboxes);
    }
  };

  // 延长时间按钮状态管理
  const [extendingTime, setExtendingTime] = useState<Record<number, boolean>>({});

  // 生成邮箱弹窗状态管理
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateCount, setGenerateCount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 新增：邮箱生成方式状态管理
  const [generateMode, setGenerateMode] = useState('random');
  const [customPrefix, setCustomPrefix] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('aug.qzz.io');

  // Credit余额更新弹窗状态管理
  const [showUpdateCreditModal, setShowUpdateCreditModal] = useState(false);
  const [isUpdatingCredit, setIsUpdatingCredit] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0, currentEmail: '' });

  // 监听fetcher状态变化
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      setIsGenerating(false);

      // 检查是否是生成邮箱的响应
      if (fetcher.data.success !== undefined) {
        if (fetcher.data.success) {
          setNotification({
            message: fetcher.data.message || '邮箱生成成功！',
            type: 'success'
          });
        } else {
          setNotification({
            message: fetcher.data.message || '邮箱生成失败',
            type: 'error'
          });
        }
        setTimeout(() => setNotification(null), 5000);
      }
    } else if (fetcher.state === 'submitting') {
      // 如果是生成邮箱的提交
      const formData = fetcher.formData;
      if (formData && formData.get('action') === 'generate') {
        setIsGenerating(true);
      }
    }
  }, [fetcher.state, fetcher.data]);

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
      console.log('📥 Fetcher响应数据:', fetcher.data);
      setNotification({
        message: fetcher.data.message,
        type: fetcher.data.success ? 'success' : 'error'
      });
      // 3秒后自动隐藏通知
      setTimeout(() => setNotification(null), 3000);

      // 如果删除成功，刷新页面
      if (fetcher.data.success) {
        console.log('✅ 删除成功，1.5秒后刷新页面');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    }
  }, [fetcher.data, fetcher.state]);

  // 分页导航函数
  const goToPage = (page: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', page.toString());
    setSearchParams(newSearchParams);
  };

  // Tab切换函数
  const switchTab = (tab: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    newSearchParams.set('page', '1'); // 切换Tab时重置到第一页
    setSearchParams(newSearchParams);
  };

  // 排序函数
  const handleSort = (column: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    const currentSortBy = searchParams.get('sortBy');
    const currentSortOrder = searchParams.get('sortOrder') || 'asc';

    if (currentSortBy === column) {
      // 如果点击的是当前排序列，切换排序方向
      newSearchParams.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果点击的是新列，设置为升序
      newSearchParams.set('sortBy', column);
      newSearchParams.set('sortOrder', 'asc');
    }
    newSearchParams.set('page', '1'); // 排序时重置到第一页
    setSearchParams(newSearchParams);
  };

  // 邮箱地址复制函数
  const copyEmailAddress = async (email: string, mailboxId: number) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedItems(prev => ({ ...prev, [`email-${mailboxId}`]: true }));

      // 立即更新本地状态中的邮箱复制次数
      setLocalMailboxes(prev =>
        prev.map(mailbox =>
          mailbox.id === mailboxId
            ? { ...mailbox, emailCopyCount: mailbox.emailCopyCount + 1 }
            : mailbox
        )
      );

      // 更新邮箱复制次数到服务器
      const formData = new FormData();
      formData.append('action', 'updateCopyCount');
      formData.append('mailboxId', mailboxId.toString());
      formData.append('copyType', 'email');

      fetch(window.location.pathname, {
        method: 'POST',
        body: formData
      });

      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [`email-${mailboxId}`]: false }));
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
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

  // 生成邮箱函数
  const handleGenerate = () => {
    const count = parseInt(generateCount);

    if (isNaN(count) || count <= 0 || count > 500) {
      setNotification({
        message: '生成数量必须是1-500之间的数字',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // 自定义模式下的验证
    if (generateMode === 'custom') {
      if (!customPrefix.trim()) {
        setNotification({
          message: '请输入邮箱前缀',
          type: 'error'
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(customPrefix)) {
        setNotification({
          message: '邮箱前缀只能包含字母、数字、下划线和连字符',
          type: 'error'
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      if (customPrefix.length < 3 || customPrefix.length > 20) {
        setNotification({
          message: '邮箱前缀长度必须在3-20个字符之间',
          type: 'error'
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    setIsGenerating(true);

    try {
      // 构建提交数据
      const submitData: Record<string, string> = {
        action: 'generate',
        count: count.toString(),
        mode: generateMode
      };

      if (generateMode === 'custom') {
        submitData.customPrefix = customPrefix;
        submitData.selectedDomain = selectedDomain;
      }

      // 使用 fetcher.submit 来处理请求
      fetcher.submit(submitData, { method: 'post' });

      setShowGenerateModal(false);
      setGenerateCount('');
      setCustomPrefix('');

      const modeText = generateMode === 'custom'
        ? `自定义前缀 "${customPrefix}" 在域名 "${selectedDomain}"`
        : '随机生成';

      setNotification({
        message: `正在${modeText}生成 ${count} 个邮箱，请稍候...`,
        type: 'success'
      });

    } catch (error) {
      console.error('生成邮箱失败:', error);
      setNotification({
        message: '生成邮箱失败',
        type: 'error'
      });
      setIsGenerating(false);
    }
  };

  // Credit余额更新函数
  const handleUpdateCreditBalance = async () => {
    setIsUpdatingCredit(true);
    setUpdateProgress({ current: 0, total: 0, currentEmail: '' });

    try {
      // 1. 获取所有邮箱列表
      setUpdateProgress(prev => ({ ...prev, currentEmail: '正在获取邮箱列表...' }));

      const response = await fetch('https://app.aug.qzz.io/api/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Bearer gm_credit_update_token_123456789012'
        },
        body: 'action=get-all-mailboxes'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API响应错误:', response.status, errorText);
        throw new Error(`获取邮箱列表失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(`获取邮箱列表失败: ${result.error}`);
      }

      const allMailboxes = result.data || [];
      const mailboxesWithLinks = allMailboxes.filter(m => m.viewUsageLink);

      setUpdateProgress({
        current: 0,
        total: mailboxesWithLinks.length,
        currentEmail: `找到 ${mailboxesWithLinks.length} 个需要更新的邮箱`
      });

      if (mailboxesWithLinks.length === 0) {
        setNotification({
          message: '没有找到需要更新Credit余额的邮箱',
          type: 'success'
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      // 2. 批量更新Credit余额
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < mailboxesWithLinks.length; i++) {
        const mailbox = mailboxesWithLinks[i];

        setUpdateProgress({
          current: i + 1,
          total: mailboxesWithLinks.length,
          currentEmail: `[${i + 1}/${mailboxesWithLinks.length}] ${mailbox.email}`
        });

        try {
          const updateResponse = await fetch('https://app.aug.qzz.io/api/automation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Bearer gm_credit_update_token_123456789012'
            },
            body: `action=update-credit-balance&email=${encodeURIComponent(mailbox.email)}`
          });

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            if (updateResult.success) {
              successCount++;
            } else {
              if (updateResult.message && updateResult.message.includes('跳过')) {
                skippedCount++;
              } else {
                errorCount++;
              }
            }
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`更新 ${mailbox.email} 失败:`, error);
        }

        // 添加延迟避免API限制
        if (i < mailboxesWithLinks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 显示最终结果
      setNotification({
        message: `Credit余额更新完成！成功: ${successCount}, 跳过: ${skippedCount}, 错误: ${errorCount}`,
        type: successCount > 0 ? 'success' : 'error'
      });
      setTimeout(() => setNotification(null), 5000);

      // 刷新页面数据
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Credit余额更新失败:', error);
      setNotification({
        message: `Credit余额更新失败: ${error instanceof Error ? error.message : '未知错误'}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsUpdatingCredit(false);
      setShowUpdateCreditModal(false);
      setUpdateProgress({ current: 0, total: 0, currentEmail: '' });
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


      
      {/* 统计信息和Tab导航 - 固定位置 */}
      <div style={{
        position: 'sticky',
        top: '0',
        zIndex: 100,
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef',
        paddingTop: '15px',
        paddingBottom: '15px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingLeft: '20px',
          paddingRight: '20px'
        }}>
        {/* 左侧：统计信息 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          padding: '12px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          minWidth: 'fit-content'
        }}>
          {/* 总邮箱数 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#495057'
            }}>
              总邮箱数：
            </span>
            <span style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#007bff'
            }}>
              {totalCount}
            </span>
          </div>

          {/* 自动注册邮箱统计 */}
          {autoRegisteredCount > 0 && (
            <>
              <div style={{
                width: '1px',
                height: '24px',
                backgroundColor: '#dee2e6'
              }}></div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '14px' }}>🤖</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#28a745'
                }}>
                  自动注册：{autoRegisteredCount}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: '#6c757d',
                  fontWeight: 'normal',
                  marginLeft: '2px'
                }}>
                  ({((autoRegisteredCount / totalCount) * 100).toFixed(1)}%)
                </span>
              </div>
            </>
          )}
        </div>

        {/* 右侧：Tab导航 */}
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
        <button
          onClick={() => switchTab('all')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'all' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'all' ? 'white' : '#495057',
            border: `1px solid ${activeTab === 'all' ? '#007bff' : '#e9ecef'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          全部
        </button>
        <button
          onClick={() => switchTab('unregistered')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'unregistered' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'unregistered' ? 'white' : '#495057',
            border: `1px solid ${activeTab === 'unregistered' ? '#007bff' : '#e9ecef'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          未注册邮箱
        </button>
        <button
          onClick={() => switchTab('registered_unsold')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'registered_unsold' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'registered_unsold' ? 'white' : '#495057',
            border: `1px solid ${activeTab === 'registered_unsold' ? '#007bff' : '#e9ecef'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          已注册未售出
        </button>
        <button
          onClick={() => switchTab('registered_sold')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'registered_sold' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'registered_sold' ? 'white' : '#495057',
            border: `1px solid ${activeTab === 'registered_sold' ? '#007bff' : '#e9ecef'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          已注册已售出
        </button>
        {autoRegisteredCount > 0 && (
          <button
            onClick={() => switchTab('auto_registered')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'auto_registered' ? '#28a745' : '#f8f9fa',
              color: activeTab === 'auto_registered' ? 'white' : '#495057',
              border: `1px solid ${activeTab === 'auto_registered' ? '#28a745' : '#e9ecef'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            🤖 自动注册
            <span style={{
              marginLeft: '6px',
              fontSize: '12px',
              backgroundColor: activeTab === 'auto_registered' ? 'rgba(255,255,255,0.2)' : '#28a745',
              color: activeTab === 'auto_registered' ? 'white' : 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 'bold'
            }}>
              {autoRegisteredCount}
            </span>
          </button>
        )}
        </div>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        marginBottom: '20px',
        marginTop: '10px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          {/* 左侧：搜索框和筛选器 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            flex: '1'
          }}>
            {/* 搜索框 */}
            <div style={{
              position: 'relative',
              minWidth: '250px',
              maxWidth: '300px'
            }}>
              <input
                type="text"
                placeholder="搜索邮箱地址..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchInput);
                  }
                  if (e.key === 'Escape') {
                    clearSearch();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 35px 8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              />
              <div style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                {searchInput && (
                  <button
                    onClick={clearSearch}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: '#6c757d',
                      fontSize: '14px'
                    }}
                    title="清除搜索"
                  >
                    ×
                  </button>
                )}
                <button
                  onClick={() => handleSearch(searchInput)}
                  disabled={isSearchLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: isSearchLoading ? 'not-allowed' : 'pointer',
                    padding: '2px',
                    color: '#6c757d',
                    fontSize: '14px'
                  }}
                  title="搜索"
                >
                  {isSearchLoading ? '⏳' : '🔍'}
                </button>
              </div>
            </div>

            {/* 分隔线 */}
            <div style={{
              width: '1px',
              height: '24px',
              backgroundColor: '#dee2e6'
            }}></div>
            {/* 注册状态筛选 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#495057', minWidth: '80px' }}>注册状态:</label>
              <select
                value={filters.registrationStatus || '全部'}
                onChange={(e) => handleFilter('registrationStatus', e.target.value)}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="全部">全部</option>
                <option value="已注册">已注册</option>
                <option value="未注册">未注册</option>
                <option value="未设置">未设置</option>
              </select>
            </div>

            {/* 次数筛选 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#495057', minWidth: '50px' }}>次数:</label>
              <select
                value={filters.count || '全部'}
                onChange={(e) => handleFilter('count', e.target.value)}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="全部">全部</option>
                <option value="125">125</option>
                <option value="650">650</option>
                <option value="未设置">未设置</option>
              </select>
            </div>

            {/* 售出状态筛选 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#495057', minWidth: '80px' }}>售出状态:</label>
              <select
                value={filters.saleStatus || '全部'}
                onChange={(e) => handleFilter('saleStatus', e.target.value)}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="全部">全部</option>
                <option value="已出">已出</option>
                <option value="未出">未出</option>
                <option value="未设置">未设置</option>
              </select>
            </div>

            {/* 分隔线 */}
            {(isFiltering || isSearching) && (
              <div style={{
                width: '1px',
                height: '24px',
                backgroundColor: '#dee2e6'
              }}></div>
            )}

            {/* 清除筛选按钮 */}
            {isFiltering && (
              <button
                onClick={clearAllFilters}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  border: '1px solid #dc3545',
                  backgroundColor: 'white',
                  color: '#dc3545',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                清除筛选
              </button>
            )}

            {/* 重置所有按钮 */}
            {(isFiltering || isSearching) && (
              <button
                onClick={resetAllFilters}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  border: '1px solid #6c757d',
                  backgroundColor: 'white',
                  color: '#6c757d',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                重置所有
              </button>
            )}
          </div>

          {/* 右侧：操作按钮 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              onClick={() => setShowGenerateModal(true)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: '1px solid #28a745',
                backgroundColor: '#28a745',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ✨ 生成邮箱
            </button>

            <button
              onClick={() => setShowUpdateCreditModal(true)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: '1px solid #007bff',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              💰 更新Credit余额
            </button>
          </div>
        </div>

        {/* 筛选结果统计 */}
        {(isFiltering || isSearching) && (
          <div style={{
            marginTop: '12px',
            fontSize: '14px',
            color: '#6c757d',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <span>
              {isSearching && isFiltering ? '搜索和筛选' : isSearching ? '搜索' : '筛选'}结果：
              找到 <strong style={{ color: '#495057' }}>{totalCount}</strong> 个邮箱
            </span>

            {/* 当前筛选条件显示 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {isSearching && (
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  搜索: "{searchQuery}"
                </span>
              )}
              {filters.registrationStatus && (
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: '#f3e5f5',
                  color: '#7b1fa2',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  注册状态: {filters.registrationStatus}
                </span>
              )}
              {filters.count && (
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: '#e8f5e8',
                  color: '#388e3c',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  次数: {filters.count}
                </span>
              )}
              {filters.saleStatus && (
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: '#fff3e0',
                  color: '#f57c00',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  售出状态: {filters.saleStatus}
                </span>
              )}
            </div>
          </div>
        )}
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
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none'
                }} onClick={() => handleSort('id')}>
                  ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '22%',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none'
                }} onClick={() => handleSort('email')}>
                  邮箱地址 {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '8%',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none'
                }} onClick={() => handleSort('emailCopyCount')}>
                  邮箱复制 {sortBy === 'emailCopyCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '8%',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none'
                }} onClick={() => handleSort('linkCopyCount')}>
                  链接复制 {sortBy === 'linkCopyCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '10%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>过期时间</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '6%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>备注</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '8%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>注册状态</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '9%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>次数</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '8%',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none'
                }} onClick={() => handleSort('creditBalance')}>
                  Credit {sortBy === 'creditBalance' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '12%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>售出状态</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  borderRight: '1px solid #e9ecef',
                  width: '12%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>更新日期</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '1px solid #e9ecef',
                  width: '15%',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {localMailboxes.map((mailbox) => {
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
                  <tr key={mailbox.id} style={{
                    borderBottom: '1px solid #f8f9fa'
                  }}>
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
                      width: '22%'
                    }}>
                      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <div
                          className="email-cell"
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            wordBreak: 'break-all',
                            lineHeight: '1.4',
                            color: '#007bff',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: copiedItems[`email-${mailbox.id}`] ? '#d4edda' : 'transparent'
                          }}
                          onClick={() => copyEmailAddress(mailbox.email, mailbox.id)}
                          onMouseEnter={(e) => {
                            if (!copiedItems[`email-${mailbox.id}`]) {
                              e.currentTarget.style.backgroundColor = '#f8f9fa';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!copiedItems[`email-${mailbox.id}`]) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                          title="点击复制邮箱地址"
                        >
                          {copiedItems[`email-${mailbox.id}`] ? '✓ 已复制' : mailbox.email}
                        </div>
                        {/* 自动注册角标 */}
                        {mailbox.isAutoRegistered && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '2px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              fontSize: '9px',
                              fontWeight: 'bold',
                              padding: '2px 4px',
                              borderRadius: '8px',
                              lineHeight: '1',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              zIndex: 10,
                              whiteSpace: 'nowrap'
                            }}
                            title="此邮箱通过自动注册脚本完成注册"
                          >
                            🤖 AUTO
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '8%'
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
                        {mailbox.emailCopyCount || 0}次
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '8%'
                    }}>
                      <span style={{
                        backgroundColor: '#f3e5f5',
                        color: '#7b1fa2',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-block',
                        minWidth: '35px'
                      }}>
                        {mailbox.linkCopyCount || 0}次
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
                      width: '6%'
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

                    {/* 注册状态列 */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '8%'
                    }}>
                      <select
                        value={mailbox.registrationStatus || 'unregistered'}
                        onChange={(e) => updateField(mailbox.id, 'registrationStatus', e.target.value)}
                        style={{
                          padding: '4px 6px',
                          fontSize: '11px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          width: '100%',
                          maxWidth: '80px'
                        }}
                      >
                        <option value="registered">已注册</option>
                        <option value="unregistered">未注册</option>
                      </select>
                    </td>

                    {/* 次数列 */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '6%'
                    }}>
                      <select
                        value={mailbox.count || ''}
                        onChange={(e) => updateField(mailbox.id, 'count', e.target.value)}
                        style={{
                          padding: '4px 6px',
                          fontSize: '11px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          width: '100%',
                          maxWidth: '60px'
                        }}
                      >
                        <option value="">-</option>
                        <option value="125">125</option>
                        <option value="650">650</option>
                      </select>
                    </td>

                    {/* Credit Balance列 */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '8%'
                    }}>
                      {mailbox.creditBalance !== null && mailbox.creditBalance !== undefined ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{
                            backgroundColor: '#e8f5e8',
                            color: '#2e7d32',
                            padding: '3px 6px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            display: 'inline-block',
                            minWidth: '35px'
                          }}>
                            {mailbox.creditBalance}
                          </span>
                          {mailbox.creditBalanceUpdatedAt && (
                            <span style={{
                              fontSize: '9px',
                              color: '#6c757d',
                              lineHeight: '1'
                            }}>
                              {new Date(mailbox.creditBalanceUpdatedAt).toLocaleDateString('zh-CN', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          color: '#6c757d',
                          fontSize: '11px'
                        }}>-</span>
                      )}
                    </td>

                    {/* 售出状态列 */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '12%'
                    }}>
                      <select
                        value={mailbox.saleStatus || ''}
                        onChange={(e) => updateField(mailbox.id, 'saleStatus', e.target.value)}
                        style={{
                          padding: '4px 6px',
                          fontSize: '11px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          width: '100%',
                          maxWidth: '70px'
                        }}
                      >
                        <option value="">-</option>
                        <option value="sold">已出</option>
                        <option value="unsold">未出</option>
                      </select>
                    </td>

                    {/* 更新日期列 */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e9ecef',
                      width: '12%'
                    }}>
                      {mailbox.updatedAt && !isNaN(new Date(mailbox.updatedAt).getTime()) ? (
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {new Date(mailbox.updatedAt).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#adb5bd' }}>-</span>
                      )}
                    </td>

                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      width: '15%'
                    }}>
                      <div className="action-buttons" style={{
                        display: 'flex',
                        gap: '6px',
                        flexWrap: 'nowrap',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <button
                          className="action-button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(verifyLink);
                              setCopiedItems(prev => ({ ...prev, [linkKey]: true }));

                              // 立即更新本地状态中的链接复制次数
                              setLocalMailboxes(prev =>
                                prev.map(mb =>
                                  mb.id === mailbox.id
                                    ? { ...mb, linkCopyCount: mb.linkCopyCount + 1 }
                                    : mb
                                )
                              );

                              // 更新链接复制次数到服务器
                              const formData = new FormData();
                              formData.append('action', 'updateCopyCount');
                              formData.append('mailboxId', mailbox.id.toString());
                              formData.append('copyType', 'link');

                              fetch(window.location.pathname, {
                                method: 'POST',
                                body: formData
                              });

                              setTimeout(() => {
                                setCopiedItems(prev => ({ ...prev, [linkKey]: false }));
                              }, 2000);
                            } catch (err) {
                              console.error('复制失败:', err);
                            }
                          }}
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

                        <button
                          className="action-button"
                          onClick={() => handleDelete(mailbox.id.toString(), mailbox.email)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            border: '1px solid #dc3545',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            minWidth: '60px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🗑️ 删除
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
                第 {currentPage} 页 / 共 {totalPages} 页{isSearching ? '（搜索结果）' : ''}
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
              {isSearching && (
                <button
                  onClick={clearSearch}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    border: '1px solid #6c757d',
                    backgroundColor: 'white',
                    color: '#6c757d',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="清除搜索，返回全部数据"
                >
                  清除搜索
                </button>
              )}
              <span style={{ color: '#6c757d', fontSize: '14px' }}>跳转到:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                placeholder={currentPage.toString()}
                onKeyDown={(e) => {
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

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#dc3545'
            }}>
              确认删除
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#495057',
              lineHeight: '1.5'
            }}>
              确定要删除邮箱 <strong>{deleteConfirm.email}</strong> 吗？此操作不可撤销。
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid #6c757d',
                  backgroundColor: 'white',
                  color: '#6c757d',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid #dc3545',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 生成邮箱弹窗 */}
      {showGenerateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#333',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              ✨ 生成新邮箱
            </h3>

            {/* 生成模式选择 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#495057',
                fontWeight: '500'
              }}>
                生成模式:
              </label>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="generateMode"
                    value="random"
                    checked={generateMode === 'random'}
                    onChange={(e) => setGenerateMode(e.target.value)}
                    style={{ marginRight: '6px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#495057' }}>随机生成</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="generateMode"
                    value="custom"
                    checked={generateMode === 'custom'}
                    onChange={(e) => setGenerateMode(e.target.value)}
                    style={{ marginRight: '6px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#495057' }}>自定义前缀</span>
                </label>
              </div>
            </div>

            {/* 自定义前缀选项 */}
            {generateMode === 'custom' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    color: '#495057',
                    fontWeight: '500'
                  }}>
                    邮箱前缀:
                  </label>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder="请输入邮箱前缀（3-20个字符）"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    marginTop: '4px'
                  }}>
                    只能包含字母、数字、下划线和连字符，长度3-20个字符
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    color: '#495057',
                    fontWeight: '500'
                  }}>
                    选择域名:
                  </label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      backgroundColor: 'white'
                    }}
                  >
                    {BACKUP_DOMAINS.map(domain => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#495057',
                fontWeight: '500'
              }}>
                生成数量:
              </label>
              <input
                type="number"
                value={generateCount}
                onChange={(e) => setGenerateCount(e.target.value)}
                placeholder="请输入1-500之间的数字"
                min="1"
                max="500"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                marginTop: '4px'
              }}>
                {generateMode === 'custom'
                  ? `将生成 ${customPrefix}_1, ${customPrefix}_2, ... 格式的邮箱（单个邮箱时不添加数字后缀）`
                  : '新邮箱将使用6个备用域名随机分配，过期时间为7天'
                }
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenerateCount('');
                  setCustomPrefix('');
                  setGenerateMode('random');
                }}
                disabled={isGenerating}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid #6c757d',
                  backgroundColor: 'white',
                  color: '#6c757d',
                  borderRadius: '4px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !generateCount}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid #28a745',
                  backgroundColor: isGenerating ? '#6c757d' : '#28a745',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: (isGenerating || !generateCount) ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isGenerating ? '生成中...' : '开始生成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit余额更新弹窗 */}
      {showUpdateCreditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#333',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              💰 更新Credit余额
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <p style={{
                fontSize: '14px',
                color: '#495057',
                margin: '0 0 12px 0',
                lineHeight: '1.5'
              }}>
                此操作将获取所有邮箱列表，并更新有viewUsageLink的邮箱的Credit余额。
              </p>

              {isUpdatingCredit && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                  marginTop: '12px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    {updateProgress.currentEmail}
                  </div>

                  {updateProgress.total > 0 && (
                    <>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '4px'
                      }}>
                        <div style={{
                          width: `${(updateProgress.current / updateProgress.total) * 100}%`,
                          height: '100%',
                          backgroundColor: '#007bff',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        textAlign: 'center'
                      }}>
                        {updateProgress.current} / {updateProgress.total}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                marginTop: '8px'
              }}>
                ⚠️ 此操作可能需要几分钟时间，请耐心等待
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowUpdateCreditModal(false);
                  setUpdateProgress({ current: 0, total: 0, currentEmail: '' });
                }}
                disabled={isUpdatingCredit}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid #6c757d',
                  backgroundColor: 'white',
                  color: '#6c757d',
                  borderRadius: '4px',
                  cursor: isUpdatingCredit ? 'not-allowed' : 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handleUpdateCreditBalance}
                disabled={isUpdatingCredit}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid #007bff',
                  backgroundColor: isUpdatingCredit ? '#6c757d' : '#007bff',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: isUpdatingCredit ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isUpdatingCredit ? '更新中...' : '开始更新'}
              </button>
            </div>
          </div>
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
