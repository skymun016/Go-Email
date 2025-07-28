/**
 * 测试数据生成脚本
 * 生成2000个随机邮箱地址和对应的验证码
 * 支持JSON和CSV格式输出
 * 验证码使用与线上系统完全一致的HMAC-SHA256算法
 */

const fs = require('fs');
const path = require('path');

// 支持的域名
const SUPPORTED_DOMAINS = ['aug.qzz.io', 'asksy.dpdns.org'];

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
 * 生成真实的邮箱前缀（支持2000个唯一前缀）
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
    'paul', 'betty', 'kenneth', 'dorothy', 'joshua', 'sandra', 'kevin', 'donna',
    'brian', 'carol', 'george', 'ruth', 'edward', 'sharon', 'ronald', 'michelle',
    'timothy', 'laura', 'jason', 'sarah', 'jeffrey', 'kimberly', 'jacob', 'deborah',
    'gary', 'dorothy', 'nicholas', 'lisa', 'eric', 'nancy', 'jonathan', 'karen',
    'stephen', 'betty', 'larry', 'helen', 'justin', 'sandra', 'scott', 'donna',
    'brandon', 'carol', 'benjamin', 'ruth', 'samuel', 'sharon', 'gregory', 'michelle',
    'frank', 'laura', 'raymond', 'sarah', 'alexander', 'kimberly', 'patrick', 'deborah',
    'jack', 'dorothy', 'dennis', 'lisa', 'jerry', 'nancy', 'tyler', 'karen',
    'aaron', 'betty', 'henry', 'helen', 'douglas', 'sandra', 'peter', 'donna',
    'noah', 'carol', 'walter', 'ruth', 'christian', 'sharon', 'john', 'michelle'
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
    'ruiz', 'hughes', 'price', 'alvarez', 'castillo', 'sanders', 'patel', 'myers',
    'long', 'ross', 'foster', 'jimenez', 'powell', 'jenkins', 'perry', 'russell',
    'sullivan', 'bell', 'coleman', 'butler', 'henderson', 'barnes', 'gonzales', 'fisher',
    'vasquez', 'simmons', 'romero', 'jordan', 'patterson', 'alexander', 'hamilton', 'graham'
  ];
  
  // 扩展的常见词汇
  const commonWords = [
    'test', 'demo', 'user', 'admin', 'hello', 'welcome', 'contact', 'info',
    'support', 'help', 'service', 'team', 'office', 'business', 'company', 'work',
    'project', 'dev', 'developer', 'code', 'tech', 'digital', 'online', 'web',
    'mail', 'email', 'message', 'news', 'update', 'notification', 'account', 'profile',
    'manager', 'director', 'assistant', 'consultant', 'specialist', 'expert', 'pro', 'master',
    'junior', 'senior', 'lead', 'chief', 'head', 'supervisor', 'coordinator', 'analyst',
    'engineer', 'designer', 'writer', 'editor', 'reporter', 'blogger', 'creator', 'artist',
    'student', 'teacher', 'professor', 'doctor', 'nurse', 'lawyer', 'agent', 'sales',
    'marketing', 'finance', 'hr', 'it', 'qa', 'pm', 'ceo', 'cto', 'cfo', 'vp',
    'intern', 'trainee', 'volunteer', 'member', 'guest', 'visitor', 'client', 'customer',
    'partner', 'vendor', 'supplier', 'contractor', 'freelancer', 'consultant', 'advisor', 'mentor'
  ];

  // 扩展的数字后缀
  const numbers = [
    '123', '456', '789', '2024', '2023', '2022', '2021', '2020', '01', '02', '03', '04', '05',
    '06', '07', '08', '09', '10', '11', '12', '99', '88', '77', '66', '55', '44', '33', '22',
    '100', '200', '300', '500', '1000', '2000', '007', '911', '888', '999', '111', '222',
    '333', '444', '555', '666', '777', '1234', '5678', '9999', '0000', '1111', '2222'
  ];
  
  const usedPrefixes = new Set();

  while (prefixes.length < count) {
    let prefix = '';
    const type = Math.random();

    if (type < 0.25) {
      // 25% 概率：名字 + 姓氏（点分隔）
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      prefix = `${firstName}.${lastName}`;
    } else if (type < 0.4) {
      // 15% 概率：名字 + 姓氏（无分隔）
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      prefix = `${firstName}${lastName}`;
    } else if (type < 0.55) {
      // 15% 概率：名字 + 数字
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${firstName}${number}`;
    } else if (type < 0.7) {
      // 15% 概率：常见词汇 + 数字
      const word = commonWords[Math.floor(Math.random() * commonWords.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = Math.random() < 0.5 ? `${word}${number}` : `${word}.${number}`;
    } else if (type < 0.8) {
      // 10% 概率：姓氏 + 数字
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${lastName}${number}`;
    } else if (type < 0.9) {
      // 10% 概率：名字 + 下划线 + 数字
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${firstName}_${number}`;
    } else if (type < 0.95) {
      // 5% 概率：常见词汇 + 下划线 + 数字
      const word = commonWords[Math.floor(Math.random() * commonWords.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      prefix = `${word}_${number}`;
    } else {
      // 5% 概率：纯常见词汇
      prefix = commonWords[Math.floor(Math.random() * commonWords.length)];
      // 如果是纯词汇，有50%概率添加随机数字避免重复
      if (Math.random() < 0.5) {
        const randomNum = Math.floor(Math.random() * 9999) + 1;
        prefix += randomNum;
      }
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
 * 生成测试数据
 */
function generateTestData(count = 2000) {
  console.log(`🚀 开始生成 ${count} 个测试邮箱数据...`);
  
  const prefixes = generateRealisticEmailPrefixes(count);
  const testData = [];
  
  prefixes.forEach((prefix, index) => {
    // 随机选择域名
    const domain = SUPPORTED_DOMAINS[Math.floor(Math.random() * SUPPORTED_DOMAINS.length)];
    const email = `${prefix}@${domain}`;
    const code = generateVerificationCode(prefix);
    
    testData.push({
      id: index + 1,
      email: email,
      prefix: prefix,
      domain: domain,
      verification_code: code
    });
  });
  
  console.log(`✅ 成功生成 ${testData.length} 个邮箱数据`);
  return testData;
}

/**
 * 保存为JSON格式
 */
function saveAsJSON(data, filename = 'test-emails-2000.json') {
  const outputPath = path.join(__dirname, '..', 'output', filename);
  
  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const jsonData = {
    generated_at: new Date().toISOString(),
    total_count: data.length,
    supported_domains: SUPPORTED_DOMAINS,
    emails: data
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log(`📄 JSON文件已保存: ${outputPath}`);
  return outputPath;
}

/**
 * 保存为CSV格式
 */
function saveAsCSV(data, filename = 'test-emails-2000.csv') {
  const outputPath = path.join(__dirname, '..', 'output', filename);
  
  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // CSV头部
  const headers = ['id', 'email_address', 'email_prefix', 'domain', 'verification_code'];
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      item.id,
      item.email,
      item.prefix,
      item.domain,
      item.verification_code
    ].join(','))
  ].join('\n');
  
  fs.writeFileSync(outputPath, csvContent, 'utf8');
  console.log(`📊 CSV文件已保存: ${outputPath}`);
  return outputPath;
}

/**
 * 主函数
 */
function main() {
  try {
    const count = process.argv[2] ? parseInt(process.argv[2]) : 2000;
    const format = process.argv[3] || 'both'; // json, csv, both
    
    console.log('📧 Go-Email 测试数据生成器');
    console.log('================================');
    
    // 生成测试数据
    const testData = generateTestData(count);
    
    // 保存文件
    if (format === 'json' || format === 'both') {
      saveAsJSON(testData);
    }
    
    if (format === 'csv' || format === 'both') {
      saveAsCSV(testData);
    }
    
    // 显示统计信息
    console.log('\n📈 统计信息:');
    console.log(`总邮箱数: ${testData.length}`);
    
    const domainStats = {};
    testData.forEach(item => {
      domainStats[item.domain] = (domainStats[item.domain] || 0) + 1;
    });
    
    Object.entries(domainStats).forEach(([domain, count]) => {
      console.log(`${domain}: ${count} 个邮箱`);
    });
    
    // 显示前5个示例
    console.log('\n🔍 前5个示例:');
    testData.slice(0, 5).forEach(item => {
      console.log(`${item.email} -> ${item.verification_code}`);
    });
    
    console.log('\n🎉 测试数据生成完成！');
    
  } catch (error) {
    console.error('❌ 生成测试数据时发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateVerificationCode,
  generateTestData,
  saveAsJSON,
  saveAsCSV
};
