/**
 * 数据库迁移脚本：为 test_mailboxes 表添加 expires_at 字段
 */

import { createDB } from "../app/lib/db.js";
import { getDatabase } from "../app/config/app.js";

async function addExpiresAtField() {
  try {
    console.log("开始添加 expires_at 字段到 test_mailboxes 表...");
    
    // 从环境变量获取数据库配置
    const env = process.env;
    const db = createDB(getDatabase(env));
    
    // 添加 expires_at 字段，默认值为创建时间 + 7天
    await db.run(`
      ALTER TABLE test_mailboxes 
      ADD COLUMN expires_at INTEGER DEFAULT NULL
    `);
    
    console.log("✅ expires_at 字段添加成功");
    
    // 为现有记录设置默认过期时间（创建时间 + 7天）
    console.log("为现有记录设置默认过期时间...");
    
    await db.run(`
      UPDATE test_mailboxes 
      SET expires_at = created_at + (7 * 24 * 60 * 60 * 1000)
      WHERE expires_at IS NULL
    `);
    
    console.log("✅ 现有记录的过期时间设置完成");
    console.log("🎉 数据库迁移完成！");
    
  } catch (error) {
    console.error("❌ 数据库迁移失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  addExpiresAtField();
}

export { addExpiresAtField };
