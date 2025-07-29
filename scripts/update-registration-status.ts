#!/usr/bin/env tsx

/**
 * 批量更新测试邮箱的注册状态
 * 将所有现有记录的 registrationStatus 从 'registered' 更新为 'unregistered'
 */

import { createDB } from "../app/lib/db";
import { testMailboxes } from "../app/db/schema";
import { eq } from "drizzle-orm";

async function updateRegistrationStatus() {
  console.log("开始批量更新测试邮箱的注册状态...");
  
  try {
    // 创建数据库连接
    const db = createDB(process.env.DB as D1Database);
    
    // 更新所有 registrationStatus 为 'registered' 的记录
    const result = await db
      .update(testMailboxes)
      .set({ registrationStatus: 'unregistered' })
      .where(eq(testMailboxes.registrationStatus, 'registered'));
    
    console.log(`✅ 成功更新了记录的注册状态`);
    console.log("更新完成！");
    
  } catch (error) {
    console.error("❌ 更新失败:", error);
    process.exit(1);
  }
}

// 直接运行脚本
updateRegistrationStatus();

export { updateRegistrationStatus };
