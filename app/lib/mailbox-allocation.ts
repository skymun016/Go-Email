/**
 * 邮箱分配系统
 * 处理用户邮箱的自动分配、配额管理等功能
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import { generateRandomEmail } from "~/lib/email-generator";
import {
  createUserMailbox,
  updateUserQuota,
  checkUserQuota,
  type User
} from "~/lib/user-db";
import type { Mailbox } from "~/db/schema";

/**
 * 用户注册时自动分配邮箱配额
 */
export async function allocateUserMailboxes(
  db: DrizzleD1Database,
  userId: string,
  quota: number
): Promise<Mailbox[]> {
  console.log(`📧 开始为用户 ${userId} 分配 ${quota} 个邮箱...`);
  
  const allocatedMailboxes: Mailbox[] = [];
  
  try {
    for (let i = 0; i < quota; i++) {
      // 使用智能策略生成邮箱地址
      const email = generateRandomEmail("smart");
      
      // 创建用户邮箱（第一个设为永久）
      const mailbox = await createUserMailbox(db, userId, email, i === 0);
      allocatedMailboxes.push(mailbox);
      
      console.log(`✅ 已分配邮箱 ${i + 1}/${quota}: ${email}`);
    }
    
    // 更新用户已使用配额
    await updateUserQuota(db, userId, quota);
    
    console.log(`🎉 成功为用户 ${userId} 分配了 ${quota} 个邮箱`);
    return allocatedMailboxes;
    
  } catch (error) {
    console.error(`❌ 邮箱分配失败:`, error);
    
    // 回滚：删除已创建的邮箱
    // TODO: 实现回滚逻辑
    
    throw new Error(`邮箱分配失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 检查用户是否可以创建新邮箱
 */
export async function canUserCreateMailbox(
  db: DrizzleD1Database,
  userId: string
): Promise<{ canCreate: boolean; reason?: string }> {
  try {
    const quotaInfo = await checkUserQuota(db, userId);
    
    if (!quotaInfo.hasQuota) {
      return {
        canCreate: false,
        reason: `邮箱配额已用完 (${quotaInfo.current}/${quotaInfo.limit})`
      };
    }
    
    return { canCreate: true };
    
  } catch (error) {
    return {
      canCreate: false,
      reason: `检查配额失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 为用户手动创建新邮箱（如果有配额）
 */
export async function createNewUserMailbox(
  db: DrizzleD1Database,
  userId: string,
  customEmail?: string
): Promise<{ success: boolean; mailbox?: Mailbox; error?: string }> {
  try {
    // 检查配额
    const canCreate = await canUserCreateMailbox(db, userId);
    if (!canCreate.canCreate) {
      return {
        success: false,
        error: canCreate.reason
      };
    }
    
    // 生成或使用自定义邮箱地址
    const email = customEmail || generateRandomEmail("smart");
    
    // 创建邮箱
    const mailbox = await createUserMailbox(db, userId, email, false);
    
    // 更新配额
    const quotaInfo = await checkUserQuota(db, userId);
    await updateUserQuota(db, userId, quotaInfo.current + 1);
    
    console.log(`✅ 为用户 ${userId} 创建新邮箱: ${email}`);
    
    return {
      success: true,
      mailbox
    };
    
  } catch (error) {
    console.error(`❌ 创建用户邮箱失败:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建邮箱失败'
    };
  }
}

/**
 * 获取用户配额使用统计
 */
export async function getUserQuotaStats(
  db: DrizzleD1Database,
  userId: string
): Promise<{
  totalQuota: number;
  usedQuota: number;
  activeMailboxes: number;
  totalEmails: number;
  unreadEmails: number;
}> {
  // 这个函数在 user-db.ts 中实现，这里只是导出
  // 实际实现会在后续添加
  throw new Error("getUserQuotaStats not implemented yet");
}

/**
 * 用户邮箱过期管理
 */
export async function updateUserMailboxExpiration(
  db: DrizzleD1Database,
  userId: string,
  newExpirationDate: Date
): Promise<void> {
  // 这个函数会在后续实现
  console.log(`📅 更新用户 ${userId} 的邮箱过期时间至 ${newExpirationDate.toISOString()}`);
}

/**
 * 清理过期用户邮箱
 */
export async function cleanupExpiredUserMailboxes(
  db: DrizzleD1Database
): Promise<void> {
  // 这个函数会在后续实现
  console.log("🧹 开始清理过期用户邮箱...");
}

/**
 * 验证邮箱分配系统的完整性
 */
export async function validateMailboxAllocation(
  db: DrizzleD1Database,
  userId: string
): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    // 检查用户配额一致性
    const quotaInfo = await checkUserQuota(db, userId);
    
    // 这里可以添加更多验证逻辑
    // TODO: 实现完整的验证逻辑
    
    return {
      isValid: issues.length === 0,
      issues
    };
    
  } catch (error) {
    issues.push(`验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
    return {
      isValid: false,
      issues
    };
  }
}
