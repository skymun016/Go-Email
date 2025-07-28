/**
 * 批量更新邮箱过期时间脚本
 * 将现有的测试邮箱过期时间更新为7天
 */

const fs = require('fs');

// 配置
const EXPIRATION_HOURS = 168; // 7天 × 24小时
const CSV_FILE = 'output/test-emails-2000.csv';

/**
 * 生成SQL更新语句
 */
function generateUpdateSQL() {
  console.log('📝 生成邮箱过期时间更新SQL...');
  
  // 检查CSV文件是否存在
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV文件不存在: ${CSV_FILE}`);
    console.log('请先运行 node scripts/generate-test-data.cjs 生成测试数据');
    return;
  }
  
  // 读取CSV文件
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.trim().split('\n');
  const dataLines = lines.slice(1); // 跳过标题行
  
  console.log(`📊 找到 ${dataLines.length} 个邮箱记录`);
  
  // 计算新的过期时间（从现在开始7天后）
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + EXPIRATION_HOURS * 60 * 60 * 1000);
  const expiresAtISO = newExpiresAt.toISOString();
  
  console.log(`⏰ 新过期时间: ${newExpiresAt.toLocaleString('zh-CN')}`);
  
  // 提取所有邮箱地址
  const emails = [];
  dataLines.forEach((line, index) => {
    const columns = line.split(',');
    if (columns.length >= 2) {
      const emailAddress = columns[1];
      emails.push(emailAddress);
    } else {
      console.warn(`第${index + 2}行数据格式不正确: ${line}`);
    }
  });
  
  console.log(`✅ 解析出 ${emails.length} 个邮箱地址`);
  
  // 生成SQL语句
  const sqlStatements = [];
  
  // 1. 单个UPDATE语句（推荐用于小批量）
  const singleUpdateSQL = `
-- 批量更新测试邮箱过期时间为7天
-- 执行时间: ${new Date().toISOString()}
-- 影响邮箱数量: ${emails.length}

UPDATE mailboxes 
SET expires_at = '${expiresAtISO}'
WHERE email IN (
${emails.map(email => `  '${email}'`).join(',\n')}
);

-- 验证更新结果
SELECT 
  COUNT(*) as updated_count,
  MIN(expires_at) as min_expires_at,
  MAX(expires_at) as max_expires_at
FROM mailboxes 
WHERE email IN (
${emails.slice(0, 5).map(email => `  '${email}'`).join(',\n')}
  -- ... 还有 ${emails.length - 5} 个邮箱
);
`;
  
  sqlStatements.push(singleUpdateSQL);
  
  // 2. 分批UPDATE语句（推荐用于大批量）
  const batchSize = 100;
  const batches = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    batches.push(batch);
  }
  
  const batchUpdateSQL = `
-- 分批更新测试邮箱过期时间（每批${batchSize}个）
-- 总批次数: ${batches.length}

${batches.map((batch, index) => `
-- 批次 ${index + 1}/${batches.length}
UPDATE mailboxes 
SET expires_at = '${expiresAtISO}'
WHERE email IN (
${batch.map(email => `  '${email}'`).join(',\n')}
);
`).join('\n')}

-- 最终验证
SELECT 
  COUNT(*) as total_updated,
  COUNT(CASE WHEN expires_at = '${expiresAtISO}' THEN 1 END) as correctly_updated,
  MIN(expires_at) as min_expires_at,
  MAX(expires_at) as max_expires_at
FROM mailboxes 
WHERE email IN (
${emails.slice(0, 3).map(email => `  '${email}'`).join(',\n')}
  -- ... 总共 ${emails.length} 个邮箱
);
`;
  
  sqlStatements.push(batchUpdateSQL);
  
  // 3. 生成Cloudflare D1 CLI命令
  const d1Commands = `
# Cloudflare D1 数据库更新命令
# 注意：请将 YOUR_DATABASE_NAME 替换为实际的数据库名称

# 方法1: 直接执行SQL
wrangler d1 execute YOUR_DATABASE_NAME --command="UPDATE mailboxes SET expires_at = '${expiresAtISO}' WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org';"

# 方法2: 从文件执行SQL
wrangler d1 execute YOUR_DATABASE_NAME --file=update-mailbox-expiration.sql

# 验证更新结果
wrangler d1 execute YOUR_DATABASE_NAME --command="SELECT COUNT(*) as total_mailboxes, COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_mailboxes FROM mailboxes WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org';"
`;
  
  // 写入SQL文件
  const outputFile = 'output/update-mailbox-expiration.sql';
  const fullSQL = sqlStatements.join('\n\n') + '\n\n' + d1Commands;
  
  try {
    fs.writeFileSync(outputFile, fullSQL, 'utf-8');
    console.log(`✅ SQL文件已生成: ${outputFile}`);
    console.log(`📝 包含 ${batches.length} 个批次的更新语句`);
    
    // 显示统计信息
    console.log('\n📊 更新统计:');
    console.log(`  总邮箱数: ${emails.length}`);
    console.log(`  批次大小: ${batchSize}`);
    console.log(`  批次数量: ${batches.length}`);
    console.log(`  新过期时间: ${expiresAtISO}`);
    console.log(`  过期天数: ${EXPIRATION_HOURS / 24} 天`);
    
    // 显示域名分布
    const domainCount = {};
    emails.forEach(email => {
      const domain = email.split('@')[1];
      domainCount[domain] = (domainCount[domain] || 0) + 1;
    });
    
    console.log('\n🌐 域名分布:');
    Object.entries(domainCount).forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count} 个邮箱`);
    });
    
    console.log('\n💡 使用说明:');
    console.log('1. 查看生成的SQL文件进行手动执行');
    console.log('2. 或使用Cloudflare D1 CLI命令');
    console.log('3. 建议先在测试环境验证SQL语句');
    
  } catch (error) {
    console.error(`❌ 写入SQL文件失败: ${error.message}`);
  }
}

/**
 * 生成验证查询
 */
function generateVerificationSQL() {
  console.log('\n🔍 生成验证查询SQL...');
  
  const verificationSQL = `
-- 验证邮箱过期时间更新情况
-- 执行时间: ${new Date().toISOString()}

-- 1. 检查总体更新情况
SELECT 
  COUNT(*) as total_mailboxes,
  COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_mailboxes,
  COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired_mailboxes,
  MIN(expires_at) as earliest_expiry,
  MAX(expires_at) as latest_expiry
FROM mailboxes 
WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org';

-- 2. 按域名统计
SELECT 
  CASE 
    WHEN email LIKE '%@aug.qzz.io' THEN 'aug.qzz.io'
    WHEN email LIKE '%@asksy.dpdns.org' THEN 'asksy.dpdns.org'
    ELSE 'other'
  END as domain,
  COUNT(*) as total_count,
  COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_count,
  MIN(expires_at) as min_expiry,
  MAX(expires_at) as max_expiry
FROM mailboxes 
WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org'
GROUP BY domain;

-- 3. 检查过期时间分布
SELECT 
  DATE(expires_at) as expiry_date,
  COUNT(*) as mailbox_count
FROM mailboxes 
WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org'
GROUP BY DATE(expires_at)
ORDER BY expiry_date;

-- 4. 随机抽样检查
SELECT 
  email,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at > datetime('now') THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as status,
  ROUND((julianday(expires_at) - julianday('now')) * 24, 2) as hours_until_expiry
FROM mailboxes 
WHERE email LIKE '%@aug.qzz.io' OR email LIKE '%@asksy.dpdns.org'
ORDER BY RANDOM()
LIMIT 10;
`;
  
  const verificationFile = 'output/verify-mailbox-expiration.sql';
  try {
    fs.writeFileSync(verificationFile, verificationSQL, 'utf-8');
    console.log(`✅ 验证SQL文件已生成: ${verificationFile}`);
  } catch (error) {
    console.error(`❌ 写入验证SQL文件失败: ${error.message}`);
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';
  
  switch (command) {
    case 'generate':
      generateUpdateSQL();
      generateVerificationSQL();
      break;
    case 'verify':
      generateVerificationSQL();
      break;
    default:
      console.log('用法:');
      console.log('  node scripts/update-mailbox-expiration.cjs generate  # 生成更新SQL');
      console.log('  node scripts/update-mailbox-expiration.cjs verify    # 生成验证SQL');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateUpdateSQL,
  generateVerificationSQL
};
