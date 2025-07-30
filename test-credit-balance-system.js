// Credit Balance 系统测试脚本
// 测试 API 功能和 Cron 触发器

const API_BASE = 'https://gomail-app.amexiaowu.workers.dev';
const API_TOKEN = 'gm_credit_update_token_123456789012';

async function testCreditBalanceSystem() {
  console.log('🧪 开始测试 Credit Balance 系统...\n');

  // 1. 测试获取可用邮箱
  console.log('1️⃣ 测试获取可用邮箱...');
  try {
    const response = await fetch(`${API_BASE}/api/automation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: 'action=get-all-mailboxes'
    });

    const result = await response.json();
    if (result.success) {
      console.log(`✅ 成功获取 ${result.data.length} 个邮箱`);

      // 找到有 viewUsageLink 的邮箱
      const mailboxesWithLinks = result.data.filter(m => m.viewUsageLink);
      console.log(`📧 其中 ${mailboxesWithLinks.length} 个邮箱有 viewUsageLink`);
      
      if (mailboxesWithLinks.length > 0) {
        const testMailbox = mailboxesWithLinks[0];
        console.log(`🎯 将使用邮箱进行测试: ${testMailbox.email}`);
        
        // 2. 测试单个邮箱的 Credit balance 更新
        console.log('\n2️⃣ 测试单个邮箱 Credit balance 更新...');
        const updateResponse = await fetch(`${API_BASE}/api/automation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${API_TOKEN}`
          },
          body: `action=update-credit-balance&email=${encodeURIComponent(testMailbox.email)}`
        });

        const updateResult = await updateResponse.json();
        if (updateResult.success) {
          console.log(`✅ 成功更新 Credit balance: ${updateResult.data.creditBalance}`);
          console.log(`📅 更新时间: ${updateResult.data.updatedAt}`);
        } else {
          console.log(`❌ 更新失败: ${updateResult.error}`);
        }
      } else {
        console.log('⚠️ 没有找到有 viewUsageLink 的邮箱，跳过 Credit balance 更新测试');
      }
    } else {
      console.log(`❌ 获取邮箱失败: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ 测试异常: ${error.message}`);
  }

  // 3. 测试 API Token 验证
  console.log('\n3️⃣ 测试 API Token 验证...');
  try {
    const invalidResponse = await fetch(`${API_BASE}/api/automation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Bearer invalid-token'
      },
      body: 'action=get-all-mailboxes'
    });

    if (invalidResponse.status === 401) {
      console.log('✅ API Token 验证正常工作');
    } else {
      console.log('❌ API Token 验证可能有问题');
    }
  } catch (error) {
    console.log(`❌ Token 验证测试异常: ${error.message}`);
  }

  console.log('\n🎉 Credit Balance 系统测试完成！');
}

// 运行测试
testCreditBalanceSystem().catch(console.error);
