#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/d1';
import { testMailboxes } from '../app/db/schema.js';
import { eq, count } from 'drizzle-orm';

async function updateCountValues() {
  try {
    console.log("开始更新次数值：将 625 改为 650...");

    // 检查是否有数据库环境变量
    if (!process.env.DB) {
      console.error("❌ 错误：未找到 DB 环境变量");
      console.log("请确保设置了 DB 环境变量，或者在本地运行时使用 wrangler dev");
      process.exit(1);
    }

    const db = drizzle(process.env.DB);
    
    // 查询当前有多少条记录的count值为"625"
    const countResult = await db
      .select({ count: count() })
      .from(testMailboxes)
      .where(eq(testMailboxes.count, '625'));

    const recordsToUpdate = countResult[0]?.count || 0;
    console.log(`找到 ${recordsToUpdate} 条记录需要更新`);

    if (recordsToUpdate === 0) {
      console.log("✅ 没有需要更新的记录");
      return;
    }

    // 更新count值从"625"到"650"
    const updateResult = await db
      .update(testMailboxes)
      .set({
        count: '650',
        updatedAt: new Date()
      })
      .where(eq(testMailboxes.count, '625'));

    console.log(`✅ 成功更新了记录`);

    // 验证更新结果
    const verifyResult = await db
      .select({ count: count() })
      .from(testMailboxes)
      .where(eq(testMailboxes.count, '650'));

    const updatedRecords = verifyResult[0]?.count || 0;
    console.log(`✅ 验证：现在有 ${updatedRecords} 条记录的count值为 '650'`);

    // 确认没有遗留的"625"记录
    const remainingResult = await db
      .select({ count: count() })
      .from(testMailboxes)
      .where(eq(testMailboxes.count, '625'));

    const remainingRecords = remainingResult[0]?.count || 0;
    if (remainingRecords === 0) {
      console.log("✅ 确认：没有遗留的 '625' 记录");
    } else {
      console.warn(`⚠️  警告：还有 ${remainingRecords} 条记录的count值仍为 '625'`);
    }
    
    console.log("🎉 数据更新完成！");
    
  } catch (error) {
    console.error("❌ 数据更新失败:", error);
    process.exit(1);
  }
}

// 运行更新
updateCountValues();
