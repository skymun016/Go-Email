#!/usr/bin/env node

/**
 * 手动触发Cron任务 - 更新所有邮箱的Credit balance
 * 模拟scheduled handler的完整流程
 */

const DOMAIN = 'app.aug.qzz.io';
const USER_AGENT = 'Cloudflare-Workers-Cron/1.0';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT
    },
    body: data
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function getAllMailboxes() {
  console.log('📧 获取所有邮箱列表...');
  
  const result = await makeRequest(
    `https://${DOMAIN}/api/automation`,
    'action=get-all-mailboxes'
  );

  if (!result.success) {
    throw new Error(`获取邮箱列表失败: ${result.error}`);
  }

  return result.data || [];
}

async function updateCreditBalance(email) {
  const result = await makeRequest(
    `https://${DOMAIN}/api/automation`,
    `action=update-credit-balance&email=${encodeURIComponent(email)}`
  );

  return result;
}

async function runCronJob() {
  console.log('🕐 开始手动触发Cron任务...');
  console.log(`🌐 目标域名: ${DOMAIN}`);
  console.log('');

  try {
    // 1. 获取所有邮箱
    const mailboxes = await getAllMailboxes();
    console.log(`📊 找到 ${mailboxes.length} 个邮箱`);

    // 2. 筛选有viewUsageLink的邮箱
    const mailboxesWithLinks = mailboxes.filter(m => m.viewUsageLink);
    console.log(`🔗 其中 ${mailboxesWithLinks.length} 个邮箱有viewUsageLink需要更新`);
    console.log('');

    if (mailboxesWithLinks.length === 0) {
      console.log('✅ 没有需要更新的邮箱');
      return;
    }

    // 3. 批量更新Credit balance
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    console.log('🚀 开始批量更新Credit balance...');
    console.log('');

    for (let i = 0; i < mailboxesWithLinks.length; i++) {
      const mailbox = mailboxesWithLinks[i];
      const progress = `[${i + 1}/${mailboxesWithLinks.length}]`;
      
      try {
        console.log(`${progress} 更新 ${mailbox.email}...`);
        
        const result = await updateCreditBalance(mailbox.email);
        
        if (result.success) {
          successCount++;
          const creditBalance = result.data?.creditBalance || 'N/A';
          console.log(`  ✅ 成功: ${creditBalance} credits`);
        } else {
          if (result.message && result.message.includes('跳过')) {
            skippedCount++;
            console.log(`  ⏭️  跳过: ${result.message}`);
          } else {
            errorCount++;
            console.log(`  ❌ 失败: ${result.error || result.message}`);
          }
        }
        
      } catch (error) {
        errorCount++;
        console.log(`  ❌ 异常: ${error.message}`);
      }

      // 添加延迟避免API限制
      if (i < mailboxesWithLinks.length - 1) {
        await sleep(1000);
      }
    }

    console.log('');
    console.log('📈 批量更新完成!');
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ⏭️  跳过: ${skippedCount}`);
    console.log(`  ❌ 错误: ${errorCount}`);
    console.log(`  📊 总计: ${successCount + skippedCount + errorCount}`);

  } catch (error) {
    console.error('❌ Cron任务执行失败:', error.message);
    process.exit(1);
  }
}

// 执行任务
runCronJob().then(() => {
  console.log('');
  console.log('🎉 手动Cron任务执行完成!');
}).catch(error => {
  console.error('💥 执行失败:', error);
  process.exit(1);
});
