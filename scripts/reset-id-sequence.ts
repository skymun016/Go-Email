#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/d1';
import { testMailboxes } from '../app/db/schema';
import { sql } from 'drizzle-orm';

// 这个脚本用于重置testMailboxes表的ID自增序列

async function resetIdSequence() {
  console.log('🔧 开始重置testMailboxes表的ID自增序列...');
  
  // 从环境变量获取数据库连接
  const DB = process.env.DB;
  if (!DB) {
    console.error('❌ 未找到数据库连接信息');
    process.exit(1);
  }

  const db = drizzle(DB as any);

  try {
    // 1. 查看当前表的状态
    console.log('📊 查看当前表状态...');
    const currentData = await db.select().from(testMailboxes).limit(5);
    console.log(`当前表中有 ${currentData.length > 0 ? '数据' : '无数据'}`);
    
    if (currentData.length > 0) {
      console.log('前5条记录的ID:', currentData.map(item => item.id));
    }

    // 2. 获取当前最大ID
    const maxIdResult = await db.execute(sql`SELECT MAX(id) as max_id FROM testMailboxes`);
    const maxId = maxIdResult.results[0]?.max_id || 0;
    console.log(`📈 当前最大ID: ${maxId}`);

    // 3. 重置ID自增序列
    console.log('🔄 重置ID自增序列...');
    
    // 对于SQLite，我们需要更新sqlite_sequence表
    await db.execute(sql`UPDATE sqlite_sequence SET seq = 0 WHERE name = 'testMailboxes'`);
    
    console.log('✅ ID自增序列已重置为0');

    // 4. 验证重置结果
    console.log('🔍 验证重置结果...');
    const sequenceResult = await db.execute(sql`SELECT seq FROM sqlite_sequence WHERE name = 'testMailboxes'`);
    const currentSeq = sequenceResult.results[0]?.seq || 0;
    console.log(`📊 当前序列值: ${currentSeq}`);

    // 5. 如果表中有数据，重新分配ID
    if (currentData.length > 0) {
      console.log('🔄 重新分配现有数据的ID...');
      
      // 获取所有数据
      const allData = await db.select().from(testMailboxes);
      console.log(`📋 找到 ${allData.length} 条记录需要重新分配ID`);
      
      // 删除所有数据
      await db.delete(testMailboxes);
      console.log('🗑️ 已删除所有现有数据');
      
      // 重新插入数据（ID会自动从1开始）
      for (let i = 0; i < allData.length; i++) {
        const item = allData[i];
        await db.insert(testMailboxes).values({
          email: item.email,
          verificationCode: item.verificationCode,
          domain: item.domain,
          prefix: item.prefix,
          directLink: item.directLink,
          copyCount: item.copyCount,
          createdAt: item.createdAt,
          expiresAt: item.expiresAt
        });
        
        if ((i + 1) % 100 === 0) {
          console.log(`📝 已重新插入 ${i + 1}/${allData.length} 条记录`);
        }
      }
      
      console.log(`✅ 已重新插入所有 ${allData.length} 条记录，ID从1开始`);
    }

    // 6. 最终验证
    console.log('🔍 最终验证...');
    const finalData = await db.select().from(testMailboxes).limit(5);
    if (finalData.length > 0) {
      console.log('前5条记录的新ID:', finalData.map(item => item.id));
    }
    
    const finalSeq = await db.execute(sql`SELECT seq FROM sqlite_sequence WHERE name = 'testMailboxes'`);
    const finalSeqValue = finalSeq.results[0]?.seq || 0;
    console.log(`📊 最终序列值: ${finalSeqValue}`);
    
    console.log('🎉 ID自增序列重置完成！');
    
  } catch (error) {
    console.error('❌ 重置过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行重置脚本
resetIdSequence().then(() => {
  console.log('🎉 ID自增序列重置成功！');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
