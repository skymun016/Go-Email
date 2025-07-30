// 手动触发 Cron 任务测试脚本
// 模拟 Cloudflare Cron Trigger 的行为

const API_BASE = 'https://gomail-app.amexiaowu.workers.dev';
const API_TOKEN = 'gm_credit_update_token_123456789012';

async function simulateCronTrigger() {
  console.log('🕐 模拟 Cron 触发器...\n');

  try {
    // 1. 获取所有邮箱
    console.log('1️⃣ 获取所有邮箱...');
    const mailboxesResponse = await fetch(`${API_BASE}/api/automation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Cloudflare-Workers-Cron/1.0'
      },
      body: 'action=get-all-mailboxes'
    });

    if (!mailboxesResponse.ok) {
      console.error('❌ Failed to get mailboxes:', mailboxesResponse.statusText);
      return;
    }

    const mailboxesData = await mailboxesResponse.json();
    const mailboxes = mailboxesData.data || [];

    console.log(`📧 Found ${mailboxes.length} mailboxes to check`);

    // 2. 筛选有 viewUsageLink 的邮箱
    const mailboxesWithLinks = mailboxes.filter(m => m.viewUsageLink);
    console.log(`🔗 其中 ${mailboxesWithLinks.length} 个邮箱有 viewUsageLink`);

    if (mailboxesWithLinks.length === 0) {
      console.log('⚠️ 没有找到有 viewUsageLink 的邮箱，结束任务');
      return;
    }

    // 3. 为每个有 viewUsageLink 的邮箱更新 Credit balance
    let successCount = 0;
    let errorCount = 0;

    console.log('\n2️⃣ 开始批量更新 Credit balance...');

    for (const mailbox of mailboxesWithLinks) {
      try {
        console.log(`🔄 正在更新 ${mailbox.email}...`);
        
        const updateResponse = await fetch(`${API_BASE}/api/automation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Cloudflare-Workers-Cron/1.0'
          },
          body: `action=update-credit-balance&email=${encodeURIComponent(mailbox.email)}`
        });

        if (updateResponse.ok) {
          const result = await updateResponse.json();
          if (result.success) {
            successCount++;
            console.log(`✅ 成功更新 ${mailbox.email}: ${result.data?.creditBalance} Credit`);
          } else {
            errorCount++;
            console.error(`❌ 更新失败 ${mailbox.email}: ${result.error}`);
          }
        } else {
          errorCount++;
          console.error(`❌ HTTP 错误 ${mailbox.email}: ${updateResponse.status}`);
        }

        // 添加延迟避免 API 限制
        console.log('⏳ 等待 1 秒...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errorCount++;
        console.error(`❌ 异常 ${mailbox.email}:`, error.message);
      }
    }

    console.log(`\n📊 Cron 任务完成: ${successCount} 成功, ${errorCount} 错误`);

  } catch (error) {
    console.error('❌ Cron 任务异常:', error.message);
  }
}

// 运行模拟 Cron 任务
simulateCronTrigger().catch(console.error);
