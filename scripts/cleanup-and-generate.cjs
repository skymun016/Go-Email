/**
 * 清理和生成脚本
 * 1. 删除test_mailboxes表中id>150的所有记录
 * 2. 使用6个备用域名生成200个新的测试邮箱
 */

const fs = require('fs');
const path = require('path');

// 当前支持的6个备用域名（不包括主域名）
const BACKUP_DOMAINS = [
  'asksy.dpdns.org',
  'v5augment.ggff.net', 
  'xm252.qzz.io',
  'augmails.qzz.io',
  'adtg.qzz.io',
  'amdt.qzz.io'
];

// 验证码生成密钥（与mailbox-verification.ts中保持一致）
const VERIFICATION_SECRET = "gomail-verification-secret-2024";

/**
 * 生成验证码的算法（与mailbox-verification.ts中的算法保持一致）
 */
function generateVerificationCode(emailPrefix) {
  try {
    // 标准化邮箱前缀
    const normalizedPrefix = emailPrefix.toLowerCase().trim();
    
    // 创建简化的哈希算法
    let hash = 0;
    const combined = VERIFICATION_SECRET + normalizedPrefix;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 确保是正数并转换为6位数验证码
    const positiveHash = Math.abs(hash);
    const code = positiveHash % 1000000;
    
    return code.toString().padStart(6, '0');
  } catch (error) {
    console.error("生成验证码失败:", error);
    // 降级方案
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
function generateRealisticEmailPrefixes(count) {
  const prefixes = [];

  // 扩展的英文名字库
  const firstNames = [
    'john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'chris', 'anna',
    'tom', 'mary', 'james', 'emma', 'robert', 'olivia', 'william', 'sophia',
    'alex', 'emily', 'daniel', 'jessica', 'michael', 'ashley', 'matthew', 'amanda',
    'andrew', 'jennifer', 'joshua', 'michelle', 'ryan', 'stephanie', 'kevin', 'nicole',
    'brian', 'elizabeth', 'jason', 'helen', 'mark', 'karen', 'steven', 'nancy',
    'paul', 'betty', 'kenneth', 'dorothy', 'ronald', 'sandra', 'timothy', 'donna',
    'gary', 'carol', 'nicholas', 'ruth', 'eric', 'sharon', 'jonathan', 'michelle',
    'stephen', 'laura', 'larry', 'sarah', 'justin', 'kimberly', 'scott', 'deborah',
    'brandon', 'dorothy', 'benjamin', 'lisa', 'samuel', 'nancy', 'gregory', 'karen',
    'frank', 'betty', 'raymond', 'helen', 'alexander', 'sandra', 'patrick', 'donna',
    'jack', 'carol', 'dennis', 'ruth', 'jerry', 'sharon', 'tyler', 'michelle',
    'aaron', 'laura', 'henry', 'sarah', 'douglas', 'kimberly', 'peter', 'deborah'
  ];
  
  // 扩展的姓氏库
  const lastNames = [
    'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
    'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas',
    'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez', 'thompson', 'white',
    'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker', 'young',
    'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill', 'flores',
    'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell',
    'carter', 'roberts', 'gomez', 'phillips', 'evans', 'turner', 'diaz', 'parker',
    'cruz', 'edwards', 'collins', 'reyes', 'stewart', 'morris', 'morales', 'murphy',
    'cook', 'rogers', 'gutierrez', 'ortiz', 'morgan', 'cooper', 'peterson', 'bailey',
    'reed', 'kelly', 'howard', 'ramos', 'kim', 'cox', 'ward', 'richardson',
    'watson', 'brooks', 'chavez', 'wood', 'james', 'bennett', 'gray', 'mendoza',
    'ruiz', 'hughes', 'price', 'alvarez', 'castillo', 'sanders', 'patel', 'myers'
  ];
  
  // 常见词汇
  const commonWords = [
    'test', 'demo', 'user', 'admin', 'hello', 'welcome', 'contact', 'info',
    'support', 'help', 'service', 'team', 'office', 'business', 'company', 'work',
    'project', 'dev', 'developer', 'code', 'tech', 'digital', 'online', 'web',
    'mail', 'email', 'message', 'news', 'update', 'notification', 'account', 'profile',
    'manager', 'director', 'assistant', 'consultant', 'specialist', 'expert', 'pro', 'master',
    'junior', 'senior', 'lead', 'chief', 'head', 'supervisor', 'coordinator', 'analyst'
  ];

  // 数字后缀
  const numbers = [
    '123', '456', '789', '2024', '2023', '01', '02', '03', '04', '05',
    '06', '07', '08', '09', '10', '99', '88', '77', '66', '55', '44', '33',
    '100', '200', '300', '500', '007', '888', '999', '111', '222', '333'
  ];
  
  const usedPrefixes = new Set();

  while (prefixes.length < count) {
    let prefix = '';
    const type = Math.random();

    if (type < 0.3) {
      // 30% 概率：名字 + 姓氏（点分隔）
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      prefix = `${firstName}.${lastName}`;
    } else if (type < 0.5) {
      // 20% 概率：名字 + 姓氏（无分隔）
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      prefix = `${firstName}${lastName}`;
    } else if (type < 0.7) {
      // 20% 概率：名字 + 数字
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${firstName}${number}`;
    } else if (type < 0.85) {
      // 15% 概率：常见词汇 + 数字
      const word = commonWords[Math.floor(Math.random() * commonWords.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${word}${number}`;
    } else {
      // 15% 概率：名字 + 下划线 + 数字
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${firstName}_${number}`;
    }

    // 确保前缀唯一
    if (!usedPrefixes.has(prefix)) {
      usedPrefixes.add(prefix);
      prefixes.push(prefix);
    }
  }
  
  return prefixes;
}

/**
 * 生成200个新的测试邮箱数据
 */
function generateNewTestData(startId = 151) {
  console.log(`🚀 开始生成200个新的测试邮箱数据（从ID ${startId}开始）...`);
  
  const prefixes = generateRealisticEmailPrefixes(200);
  const testData = [];
  
  prefixes.forEach((prefix, index) => {
    // 随机选择备用域名（不包括主域名）
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
      count: Math.random() < 0.5 ? '125' : '650',
      sale_status: 'unsold',
      updated_at: null,
      remark: null,
      is_auto_registered: 0,
      view_usage_link: null,
      credit_balance: null,
      credit_balance_updated_at: null
    });
  });
  
  console.log(`✅ 成功生成 ${testData.length} 个邮箱数据`);
  return testData;
}

/**
 * 生成SQL删除语句
 */
function generateDeleteSQL() {
  return `-- 删除test_mailboxes表中id>150的所有记录
DELETE FROM test_mailboxes WHERE id > 150;

-- 重置自增序列（如果需要）
-- DELETE FROM sqlite_sequence WHERE name='test_mailboxes';
-- INSERT INTO sqlite_sequence (name, seq) VALUES ('test_mailboxes', 150);
`;
}

/**
 * 生成SQL插入语句
 */
function generateInsertSQL(testData) {
  const insertStatements = testData.map(item => {
    const email = item.email.replace(/'/g, "''"); // 转义单引号
    const prefix = item.prefix.replace(/'/g, "''");
    const domain = item.domain.replace(/'/g, "''");
    const directLink = item.direct_link.replace(/'/g, "''");

    return `INSERT INTO test_mailboxes (id, email, verification_code, domain, prefix, direct_link, copy_count, created_at, expires_at, registration_status, count, sale_status, updated_at, remark, is_auto_registered, view_usage_link, credit_balance, credit_balance_updated_at) VALUES (${item.id}, '${email}', '${item.verification_code}', '${domain}', '${prefix}', '${directLink}', ${item.copy_count}, ${item.created_at}, ${item.expires_at || 'NULL'}, '${item.registration_status}', '${item.count}', '${item.sale_status}', ${item.updated_at || 'NULL'}, ${item.remark ? `'${item.remark}'` : 'NULL'}, ${item.is_auto_registered}, ${item.view_usage_link ? `'${item.view_usage_link}'` : 'NULL'}, ${item.credit_balance || 'NULL'}, ${item.credit_balance_updated_at || 'NULL'});`;
  });

  return insertStatements.join('\n');
}

/**
 * 保存SQL文件
 */
function saveSQLFile(testData) {
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `cleanup-and-generate-${timestamp}.sql`;
  const outputPath = path.join(outputDir, filename);
  
  const sqlContent = `-- Go-Email 数据库清理和生成脚本
-- 生成时间: ${new Date().toISOString()}
-- 操作: 删除id>150的记录，生成200个新邮箱

${generateDeleteSQL()}

-- 插入200个新的测试邮箱数据
${generateInsertSQL(testData)}

-- 验证插入结果
SELECT COUNT(*) as total_count FROM test_mailboxes;
SELECT domain, COUNT(*) as count FROM test_mailboxes GROUP BY domain ORDER BY count DESC;
`;
  
  fs.writeFileSync(outputPath, sqlContent, 'utf8');
  console.log(`📄 SQL文件已保存: ${outputPath}`);
  return outputPath;
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('🧹 Go-Email 数据库清理和生成工具');
    console.log('=====================================');
    console.log('📋 操作计划:');
    console.log('  1. 删除test_mailboxes表中id>150的所有记录');
    console.log('  2. 生成200个新的测试邮箱（使用6个备用域名）');
    console.log('  3. 生成SQL执行文件');
    console.log('');
    
    // 生成新的测试数据
    const testData = generateNewTestData(151);
    
    // 保存SQL文件
    const sqlFilePath = saveSQLFile(testData);
    
    // 显示统计信息
    console.log('\n📈 统计信息:');
    console.log(`新生成邮箱数: ${testData.length}`);
    console.log(`ID范围: ${testData[0].id} - ${testData[testData.length - 1].id}`);
    
    const domainStats = {};
    testData.forEach(item => {
      domainStats[item.domain] = (domainStats[item.domain] || 0) + 1;
    });
    
    console.log('\n🌐 域名分布:');
    Object.entries(domainStats).forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count} 个邮箱`);
    });
    
    // 显示前5个示例
    console.log('\n🔍 前5个示例:');
    testData.slice(0, 5).forEach(item => {
      console.log(`  ${item.email} -> ${item.verification_code}`);
    });
    
    console.log('\n🚀 下一步操作:');
    console.log(`  1. 执行SQL文件: ${path.basename(sqlFilePath)}`);
    console.log(`  2. 使用命令: npx wrangler d1 execute gomail-database --file=${sqlFilePath}`);
    console.log('\n🎉 脚本执行完成！');
    
  } catch (error) {
    console.error('❌ 执行过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateVerificationCode,
  generateNewTestData,
  generateDeleteSQL,
  generateInsertSQL,
  saveSQLFile
};
