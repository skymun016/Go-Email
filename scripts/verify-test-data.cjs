/**
 * 验证测试数据脚本
 * 验证生成的2000个邮箱数据是否与在线系统的验证码算法一致
 */

const fs = require('fs');
const path = require('path');

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
 * 验证测试数据
 */
function verifyTestData() {
  try {
    console.log('🔍 开始验证测试数据...');
    
    // 读取JSON文件
    const jsonPath = path.join(__dirname, '..', 'output', 'test-emails-2000.json');
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ 测试数据文件不存在:', jsonPath);
      return false;
    }
    
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const emails = data.emails;
    
    console.log(`📊 总邮箱数: ${emails.length}`);
    
    let correctCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // 验证每个邮箱的验证码
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const expectedCode = generateVerificationCode(email.prefix);
      
      if (email.verification_code === expectedCode) {
        correctCount++;
      } else {
        errorCount++;
        errors.push({
          id: email.id,
          email: email.email,
          prefix: email.prefix,
          expected: expectedCode,
          actual: email.verification_code
        });
        
        // 只显示前10个错误
        if (errors.length <= 10) {
          console.error(`❌ 错误 ${errors.length}: ${email.email}`);
          console.error(`   前缀: ${email.prefix}`);
          console.error(`   期望: ${expectedCode}`);
          console.error(`   实际: ${email.verification_code}`);
        }
      }
      
      // 每验证500个显示进度
      if ((i + 1) % 500 === 0) {
        console.log(`✅ 已验证 ${i + 1}/${emails.length} 个邮箱`);
      }
    }
    
    // 显示验证结果
    console.log('\n📈 验证结果:');
    console.log(`✅ 正确: ${correctCount} 个`);
    console.log(`❌ 错误: ${errorCount} 个`);
    console.log(`📊 准确率: ${((correctCount / emails.length) * 100).toFixed(2)}%`);
    
    if (errorCount > 10) {
      console.log(`⚠️  只显示了前10个错误，总共有 ${errorCount} 个错误`);
    }
    
    // 验证邮箱地址唯一性
    const uniqueEmails = new Set(emails.map(e => e.email));
    const uniquePrefixes = new Set(emails.map(e => e.prefix));
    
    console.log('\n🔍 唯一性检查:');
    console.log(`📧 唯一邮箱地址: ${uniqueEmails.size}/${emails.length}`);
    console.log(`🏷️  唯一前缀: ${uniquePrefixes.size}/${emails.length}`);
    
    if (uniqueEmails.size !== emails.length) {
      console.error('❌ 发现重复的邮箱地址！');
    }
    
    if (uniquePrefixes.size !== emails.length) {
      console.error('❌ 发现重复的邮箱前缀！');
    }
    
    // 域名分布统计
    const domainStats = {};
    emails.forEach(email => {
      domainStats[email.domain] = (domainStats[email.domain] || 0) + 1;
    });
    
    console.log('\n📊 域名分布:');
    Object.entries(domainStats).forEach(([domain, count]) => {
      const percentage = ((count / emails.length) * 100).toFixed(1);
      console.log(`${domain}: ${count} 个 (${percentage}%)`);
    });
    
    // 前缀类型分析
    console.log('\n🔍 前缀类型分析:');
    let dotSeparated = 0;
    let underscoreSeparated = 0;
    let withNumbers = 0;
    let pureWords = 0;
    
    emails.forEach(email => {
      const prefix = email.prefix;
      if (prefix.includes('.')) dotSeparated++;
      if (prefix.includes('_')) underscoreSeparated++;
      if (/\d/.test(prefix)) withNumbers++;
      if (!/[._\d]/.test(prefix)) pureWords++;
    });
    
    console.log(`📍 点分隔: ${dotSeparated} 个`);
    console.log(`📍 下划线分隔: ${underscoreSeparated} 个`);
    console.log(`🔢 包含数字: ${withNumbers} 个`);
    console.log(`📝 纯单词: ${pureWords} 个`);
    
    return errorCount === 0 && uniqueEmails.size === emails.length;
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('📧 Go-Email 测试数据验证器');
  console.log('================================');
  
  const isValid = verifyTestData();
  
  if (isValid) {
    console.log('\n🎉 验证通过！所有测试数据都是有效的。');
    process.exit(0);
  } else {
    console.log('\n❌ 验证失败！请检查测试数据。');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateVerificationCode,
  verifyTestData
};
