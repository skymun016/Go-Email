#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/d1';
import { testMailboxes } from '../app/db/schema';
import { eq, sql } from 'drizzle-orm';

// 这个脚本用于修复测试邮箱数据库中的问题：
// 1. 修复复制次数中的 "[object Object]1" 问题
// 2. 修复邮箱的过期时间问题

async function fixMailboxData() {
  console.log('🔧 开始修复邮箱数据...');
  
  // 从环境变量获取数据库连接
  const DB = process.env.DB;
  if (!DB) {
    console.error('❌ 未找到数据库连接信息');
    process.exit(1);
  }

  const db = drizzle(DB as any);

  try {
    // 1. 修复复制次数问题
    console.log('📊 修复复制次数数据...');
    
    // 查找所有需要修复的记录
    const allMailboxes = await db.select().from(testMailboxes);
    console.log(`📋 找到 ${allMailboxes.length} 个邮箱记录`);
    
    let fixedCopyCount = 0;
    let fixedExpirationTime = 0;
    
    for (const mailbox of allMailboxes) {
      let needsUpdate = false;
      const updates: any = {};
      
      // 修复复制次数
      if (typeof mailbox.copyCount === 'string' && mailbox.copyCount.includes('[object Object]')) {
        // 尝试从字符串中提取数字
        const match = mailbox.copyCount.match(/(\d+)/);
        const newCopyCount = match ? parseInt(match[1]) : 0;
        updates.copyCount = newCopyCount;
        needsUpdate = true;
        fixedCopyCount++;
        console.log(`🔧 修复邮箱 ${mailbox.email} 的复制次数: ${mailbox.copyCount} -> ${newCopyCount}`);
      }
      
      // 修复过期时间
      if (!mailbox.expiresAt || new Date(mailbox.expiresAt) < new Date()) {
        // 设置为7天后过期
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        updates.expiresAt = expiresAt;
        needsUpdate = true;
        fixedExpirationTime++;
        console.log(`⏰ 修复邮箱 ${mailbox.email} 的过期时间: ${mailbox.expiresAt} -> ${expiresAt.toISOString()}`);
      }
      
      // 执行更新
      if (needsUpdate) {
        await db
          .update(testMailboxes)
          .set(updates)
          .where(eq(testMailboxes.id, mailbox.id));
      }
    }
    
    console.log('✅ 数据修复完成！');
    console.log(`📊 修复了 ${fixedCopyCount} 个复制次数记录`);
    console.log(`⏰ 修复了 ${fixedExpirationTime} 个过期时间记录`);
    
    // 验证修复结果
    console.log('🔍 验证修复结果...');
    const verifyResults = await db.select().from(testMailboxes).limit(5);
    
    for (const mailbox of verifyResults) {
      console.log(`✓ ${mailbox.email}: 复制次数=${mailbox.copyCount}, 过期时间=${mailbox.expiresAt}`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行修复脚本
fixMailboxData().then(() => {
  console.log('🎉 所有数据修复完成！');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
