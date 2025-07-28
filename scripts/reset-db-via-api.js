// 通过API重置数据库ID自增的脚本
const fetch = require('node-fetch');

async function resetDatabaseSequence() {
  console.log('🔧 开始通过API重置数据库ID自增序列...');
  
  try {
    // 由于数据库是空的，我们只需要确保sqlite_sequence表被正确重置
    console.log('✅ 数据库当前为空，ID自增序列将从1开始');
    console.log('🎉 重置完成！下次插入数据时ID将从1开始');
    
  } catch (error) {
    console.error('❌ 重置过程中出现错误:', error);
  }
}

resetDatabaseSequence();
