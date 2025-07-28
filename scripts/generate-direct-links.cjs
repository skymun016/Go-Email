/**
 * 生成测试邮箱直链脚本
 * 基于现有的测试数据生成所有邮箱的直链URL列表
 */

const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = 'https://gomail-app.amexiaowu.workers.dev';
const INPUT_FILE = 'output/test-emails-2000.csv';
const OUTPUT_FILE = 'output/direct-links.txt';

/**
 * URL编码邮箱地址
 */
function encodeEmailForUrl(email) {
  return encodeURIComponent(email);
}

/**
 * 生成单个邮箱的直链
 */
function generateDirectLink(email, code) {
  const encodedEmail = encodeEmailForUrl(email);
  return `${BASE_URL}/verify-mailbox?email=${encodedEmail}&code=${code}`;
}

/**
 * 解析CSV文件
 */
function parseCsvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    // 跳过标题行
    const dataLines = lines.slice(1);
    
    const emails = [];
    dataLines.forEach((line, index) => {
      const columns = line.split(',');
      if (columns.length >= 5) {
        const id = columns[0];
        const emailAddress = columns[1];
        const emailPrefix = columns[2];
        const domain = columns[3];
        const verificationCode = columns[4];
        
        emails.push({
          id: parseInt(id),
          email: emailAddress,
          prefix: emailPrefix,
          domain: domain,
          code: verificationCode
        });
      } else {
        console.warn(`第${index + 2}行数据格式不正确: ${line}`);
      }
    });
    
    return emails;
  } catch (error) {
    console.error(`读取CSV文件失败: ${error.message}`);
    return [];
  }
}

/**
 * 生成直链列表
 */
function generateDirectLinks() {
  console.log('🔗 开始生成测试邮箱直链...');
  
  // 检查输入文件是否存在
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ 输入文件不存在: ${INPUT_FILE}`);
    console.log('请先运行 node scripts/generate-test-data.cjs 生成测试数据');
    return;
  }
  
  // 解析CSV文件
  const emails = parseCsvFile(INPUT_FILE);
  if (emails.length === 0) {
    console.error('❌ 没有找到有效的邮箱数据');
    return;
  }
  
  console.log(`📊 找到 ${emails.length} 个邮箱数据`);
  
  // 生成直链
  const links = [];
  const linkMap = new Map(); // 用于去重和统计
  
  emails.forEach((emailData) => {
    const directLink = generateDirectLink(emailData.email, emailData.code);
    const linkText = `${emailData.email} -> ${directLink}`;
    
    links.push(linkText);
    
    // 统计域名分布
    if (!linkMap.has(emailData.domain)) {
      linkMap.set(emailData.domain, 0);
    }
    linkMap.set(emailData.domain, linkMap.get(emailData.domain) + 1);
  });
  
  // 创建输出目录
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 生成文件内容
  const fileContent = [
    '# 测试邮箱直链列表',
    `# 生成时间: ${new Date().toISOString()}`,
    `# 总数量: ${links.length} 个邮箱`,
    '# 格式: 邮箱地址 -> 直链URL',
    '',
    '## 域名分布统计',
    ...Array.from(linkMap.entries()).map(([domain, count]) => 
      `# ${domain}: ${count} 个邮箱 (${(count/links.length*100).toFixed(1)}%)`
    ),
    '',
    '## 直链列表',
    ...links
  ].join('\n');
  
  // 写入文件
  try {
    fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
    console.log(`✅ 直链列表已生成: ${OUTPUT_FILE}`);
    console.log(`📝 总共生成 ${links.length} 个直链`);
    
    // 显示域名统计
    console.log('\n📊 域名分布:');
    linkMap.forEach((count, domain) => {
      console.log(`  ${domain}: ${count} 个邮箱 (${(count/links.length*100).toFixed(1)}%)`);
    });
    
    // 显示示例链接
    console.log('\n🔗 示例直链:');
    links.slice(0, 5).forEach((link, index) => {
      console.log(`  ${index + 1}. ${link}`);
    });
    
    if (links.length > 5) {
      console.log(`  ... 还有 ${links.length - 5} 个链接`);
    }
    
  } catch (error) {
    console.error(`❌ 写入文件失败: ${error.message}`);
  }
}

/**
 * 验证直链格式
 */
function validateDirectLinks() {
  console.log('\n🔍 验证直链格式...');
  
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error(`❌ 输出文件不存在: ${OUTPUT_FILE}`);
    return;
  }
  
  const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.includes(' -> '));
  
  let validCount = 0;
  let invalidCount = 0;
  
  lines.forEach((line, index) => {
    const [email, url] = line.split(' -> ');
    
    // 验证邮箱格式
    const emailValid = email && email.includes('@');
    
    // 验证URL格式
    const urlValid = url && url.startsWith(BASE_URL) && url.includes('email=') && url.includes('code=');
    
    if (emailValid && urlValid) {
      validCount++;
    } else {
      invalidCount++;
      console.warn(`⚠️  第${index + 1}行格式不正确: ${line}`);
    }
  });
  
  console.log(`✅ 验证完成: ${validCount} 个有效链接, ${invalidCount} 个无效链接`);
}

/**
 * 生成测试用的随机链接
 */
function generateTestLinks(count = 10) {
  console.log(`\n🧪 生成 ${count} 个测试链接...`);
  
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error(`❌ 输出文件不存在: ${OUTPUT_FILE}`);
    return;
  }
  
  const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.includes(' -> '));
  
  // 随机选择链接
  const testLinks = [];
  for (let i = 0; i < Math.min(count, lines.length); i++) {
    const randomIndex = Math.floor(Math.random() * lines.length);
    const line = lines[randomIndex];
    const [email, url] = line.split(' -> ');
    
    testLinks.push({
      email: email,
      url: url,
      index: randomIndex + 1
    });
  }
  
  console.log('🔗 随机测试链接:');
  testLinks.forEach((link, index) => {
    console.log(`  ${index + 1}. ${link.email}`);
    console.log(`     ${link.url}`);
    console.log('');
  });
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';
  
  switch (command) {
    case 'generate':
      generateDirectLinks();
      validateDirectLinks();
      break;
    case 'validate':
      validateDirectLinks();
      break;
    case 'test':
      const count = parseInt(args[1]) || 10;
      generateTestLinks(count);
      break;
    default:
      console.log('用法:');
      console.log('  node scripts/generate-direct-links.cjs generate  # 生成直链列表');
      console.log('  node scripts/generate-direct-links.cjs validate  # 验证直链格式');
      console.log('  node scripts/generate-direct-links.cjs test [数量] # 生成测试链接');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateDirectLink,
  parseCsvFile,
  generateDirectLinks,
  validateDirectLinks
};
