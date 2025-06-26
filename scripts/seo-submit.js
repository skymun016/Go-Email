#!/usr/bin/env node

/**
 * SEO 提交工具
 * 用于向各大搜索引擎提交网站链接
 */

const https = require('https');
const fs = require('fs');

// 配置
const config = {
  domain: 'https://184772.xyz',
  
  // 重要页面列表
  pages: [
    '/',
    '/about',
    '/faq', 
    '/contact',
    '/privacy',
    '/terms',
    '/api-docs'
  ],
  
  // 百度推送配置 (需要在百度搜索资源平台获取)
  baidu: {
    site: '184772.xyz',
    token: 'YOUR_BAIDU_TOKEN' // 需要在百度搜索资源平台获取
  }
};

/**
 * 生成完整URL列表
 */
function generateUrls() {
  return config.pages.map(page => `${config.domain}${page}`);
}

/**
 * 向百度提交链接
 */
async function submitToBaidu(urls) {
  if (config.baidu.token === 'YOUR_BAIDU_TOKEN') {
    console.log('⚠️  请先在百度搜索资源平台获取token并更新配置');
    return;
  }

  const data = urls.join('\n');
  const postData = Buffer.from(data, 'utf8');
  
  const options = {
    hostname: 'data.zz.baidu.com',
    port: 443,
    path: `/urls?site=${config.baidu.site}&token=${config.baidu.token}`,
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': postData.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log('✅ 百度提交结果:', result);
          resolve(result);
        } catch (error) {
          console.log('📄 百度响应:', responseData);
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 百度提交失败:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 检查网站可访问性
 */
async function checkSiteAccessibility() {
  console.log('🔍 检查网站可访问性...');
  
  for (const page of config.pages) {
    const url = `${config.domain}${page}`;
    try {
      await checkUrl(url);
      console.log(`✅ ${url} - 可访问`);
    } catch (error) {
      console.log(`❌ ${url} - 无法访问: ${error.message}`);
    }
  }
}

/**
 * 检查单个URL
 */
function checkUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'HEAD',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(res.statusCode);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

/**
 * 生成提交用的URL文件
 */
function generateUrlFile() {
  const urls = generateUrls();
  const content = urls.join('\n');
  
  fs.writeFileSync('urls.txt', content);
  console.log('📝 已生成 urls.txt 文件，包含以下链接:');
  urls.forEach(url => console.log(`   ${url}`));
}

/**
 * 显示手动提交指南
 */
function showManualSubmissionGuide() {
  console.log('\n📋 手动提交指南:');
  console.log('\n1. 百度搜索资源平台:');
  console.log('   - 访问: https://ziyuan.baidu.com/');
  console.log('   - 验证网站所有权');
  console.log('   - 在"链接提交"中选择"手动提交"');
  console.log('   - 复制 urls.txt 中的链接进行提交');
  
  console.log('\n2. Google Search Console:');
  console.log('   - 访问: https://search.google.com/search-console/');
  console.log('   - 添加网站并验证所有权');
  console.log('   - 提交 sitemap: ' + config.domain + '/sitemap.xml');
  console.log('   - 使用"网址检查"工具逐个提交重要页面');
  
  console.log('\n3. 必应网站管理员工具:');
  console.log('   - 访问: https://www.bing.com/webmasters/');
  console.log('   - 添加网站并验证');
  console.log('   - 提交网站地图: ' + config.domain + '/sitemap.xml');
  
  console.log('\n4. 其他搜索引擎:');
  console.log('   - 360搜索: https://zhanzhang.so.com/');
  console.log('   - 搜狗搜索: https://zhanzhang.sogou.com/');
  console.log('   - 神马搜索: https://zhanzhang.sm.cn/');
}

/**
 * 检查收录情况
 */
function checkIndexStatus() {
  console.log('\n🔍 检查收录情况:');
  console.log('请手动在搜索引擎中搜索以下内容:');
  console.log(`   百度: site:${config.domain.replace('https://', '')}`);
  console.log(`   Google: site:${config.domain.replace('https://', '')}`);
  console.log(`   必应: site:${config.domain.replace('https://', '')}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 GoMail SEO 提交工具');
  console.log('='.repeat(50));
  
  // 检查网站可访问性
  await checkSiteAccessibility();
  
  // 生成URL文件
  console.log('\n📝 生成提交文件...');
  generateUrlFile();
  
  // 尝试自动提交到百度
  console.log('\n📤 尝试自动提交到百度...');
  const urls = generateUrls();
  try {
    await submitToBaidu(urls);
  } catch (error) {
    console.log('❌ 自动提交失败，请使用手动提交');
  }
  
  // 显示手动提交指南
  showManualSubmissionGuide();
  
  // 检查收录情况
  checkIndexStatus();
  
  console.log('\n✨ 提交完成！请耐心等待搜索引擎收录。');
  console.log('💡 建议每周检查一次收录情况，并持续更新网站内容。');
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateUrls,
  submitToBaidu,
  checkSiteAccessibility
};
