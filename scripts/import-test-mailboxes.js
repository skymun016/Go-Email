/**
 * 导入测试邮箱数据到数据库
 * 从 output/direct-links.txt 文件读取数据并导入到 test_mailboxes 表
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { drizzle } from 'drizzle-orm/d1';
import { testMailboxes } from '../app/db/schema.js';

// 解析direct-links.txt文件
function parseDirectLinksFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const mailboxes = [];
  
  for (const line of lines) {
    // 跳过注释行和空行
    if (line.startsWith('#') || line.startsWith('##') || line.trim() === '') {
      continue;
    }
    
    // 解析格式: email -> directLink
    const match = line.match(/^(.+?)\s*->\s*(.+)$/);
    if (match) {
      const email = match[1].trim();
      const directLink = match[2].trim();
      
      // 提取验证码
      const codeMatch = directLink.match(/code=([^&]+)/);
      const verificationCode = codeMatch ? decodeURIComponent(codeMatch[1]) : '';
      
      // 分离邮箱前缀和域名
      const [prefix, domain] = email.split('@');
      
      if (prefix && domain && verificationCode) {
        mailboxes.push({
          email,
          verificationCode,
          domain,
          prefix,
          directLink,
          copyCount: 0,
          createdAt: new Date()
        });
      }
    }
  }
  
  return mailboxes;
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始导入测试邮箱数据...');
    
    // 解析文件
    const filePath = join(process.cwd(), 'output/direct-links.txt');
    const mailboxes = parseDirectLinksFile(filePath);
    
    console.log(`📧 解析到 ${mailboxes.length} 个测试邮箱`);
    
    // 这里需要数据库连接，在实际使用时需要传入D1数据库实例
    console.log('⚠️  注意：此脚本需要在Cloudflare Workers环境中运行，或者需要配置本地D1数据库');
    console.log('📊 解析结果预览:');
    console.log('前5个邮箱:');
    mailboxes.slice(0, 5).forEach((mailbox, index) => {
      console.log(`${index + 1}. ${mailbox.email} - ${mailbox.verificationCode} (${mailbox.domain})`);
    });
    
    console.log('\n✅ 数据解析完成！');
    console.log(`📈 统计信息:`);
    
    // 统计域名分布
    const domainStats = {};
    mailboxes.forEach(mailbox => {
      domainStats[mailbox.domain] = (domainStats[mailbox.domain] || 0) + 1;
    });
    
    console.log('域名分布:');
    Object.entries(domainStats).forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count} 个邮箱`);
    });
    
    return mailboxes;
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseDirectLinksFile, main };
