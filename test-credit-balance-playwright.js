/**
 * 使用Playwright测试Credit Balance功能
 */

import { chromium } from 'playwright';

const API_BASE = 'https://gomail.asksy.dpdns.org';
const API_TOKEN = '8f7e6d5c4b3a2918';
const TEST_EMAIL = 'karen.lewis@asksy.dpdns.org';

/**
 * 测试Credit Balance API
 */
async function testCreditBalanceAPI() {
    console.log('🚀 启动Playwright测试...');
    
    // 启动浏览器
    const browser = await chromium.launch({ 
        headless: false, // 显示浏览器窗口
        slowMo: 1000 // 每个操作间隔1秒，便于观察
    });
    
    const context = await browser.newContext({
        // 设置用户代理
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        console.log('📱 开始测试Credit Balance API...');
        
        // 1. 测试单个邮箱更新API
        console.log('🧪 测试1: 单个邮箱Credit Balance更新');
        
        const singleUpdateResponse = await page.evaluate(async ({ apiBase, apiToken, testEmail }) => {
            try {
                const formData = new FormData();
                formData.append('action', 'update-single');
                formData.append('email', testEmail);
                
                const response = await fetch(`${apiBase}/api/update-credit-balance`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiToken}`
                    },
                    body: formData
                });
                
                const result = await response.text();
                
                return {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: result
                };
            } catch (error) {
                return {
                    error: error.message
                };
            }
        }, { apiBase: API_BASE, apiToken: API_TOKEN, testEmail: TEST_EMAIL });
        
        console.log('📡 单个更新API响应:');
        console.log('  状态:', singleUpdateResponse.status);
        console.log('  响应体:', singleUpdateResponse.body);

        // 检查响应是否有错误
        if (singleUpdateResponse.error) {
            console.log('❌ 请求失败:', singleUpdateResponse.error);
        } else if (singleUpdateResponse.body) {
            // 尝试解析JSON响应
            try {
                const singleResult = JSON.parse(singleUpdateResponse.body);
                if (singleResult.success) {
                    console.log('✅ 单个邮箱更新成功!');
                    console.log('📊 更新结果:', singleResult.data);
                } else {
                    console.log('❌ 单个邮箱更新失败:', singleResult.error);
                }
            } catch (parseError) {
                console.log('⚠️ 响应不是JSON格式，可能是HTML错误页面');
                console.log('📄 原始响应:', singleUpdateResponse.body.substring(0, 500));
            }
        } else {
            console.log('❌ 没有收到响应');
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
        
        // 2. 等待一下，然后测试批量更新
        console.log('⏳ 等待5秒后测试批量更新...');
        await page.waitForTimeout(5000);
        
        console.log('🧪 测试2: 批量Credit Balance更新');
        
        const batchUpdateResponse = await page.evaluate(async ({ apiBase, apiToken }) => {
            try {
                const formData = new FormData();
                formData.append('action', 'update-all');
                
                const response = await fetch(`${apiBase}/api/cron-update-credit-balance`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiToken}`
                    },
                    body: formData
                });
                
                const result = await response.text();
                
                return {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: result
                };
            } catch (error) {
                return {
                    error: error.message
                };
            }
        }, { apiBase: API_BASE, apiToken: API_TOKEN });
        
        console.log('📡 批量更新API响应:');
        console.log('  状态:', batchUpdateResponse.status);
        console.log('  响应体:', batchUpdateResponse.body);

        // 检查响应是否有错误
        if (batchUpdateResponse.error) {
            console.log('❌ 请求失败:', batchUpdateResponse.error);
        } else if (batchUpdateResponse.body) {
            // 尝试解析JSON响应
            try {
                const batchResult = JSON.parse(batchUpdateResponse.body);
                if (batchResult.success) {
                    console.log('✅ 批量更新成功!');
                    console.log('📊 更新结果:', batchResult.data);
                } else {
                    console.log('❌ 批量更新失败:', batchResult.error);
                }
            } catch (parseError) {
                console.log('⚠️ 响应不是JSON格式，可能是HTML错误页面');
                console.log('📄 原始响应:', batchUpdateResponse.body.substring(0, 500));
            }
        } else {
            console.log('❌ 没有收到响应');
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
        
        // 3. 测试管理页面显示
        console.log('🧪 测试3: 访问管理页面查看Credit Balance显示');
        
        // 导航到管理页面
        await page.goto(`${API_BASE}/test-mailboxes-db`);
        
        // 等待页面加载
        await page.waitForLoadState('networkidle');
        
        // 检查是否需要登录
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            console.log('🔐 需要登录，正在登录...');
            
            // 填写登录信息
            await page.fill('input[name="username"]', 'admin');
            await page.fill('input[name="password"]', 'admin123');
            await page.click('button[type="submit"]');
            
            // 等待登录完成
            await page.waitForLoadState('networkidle');
            
            console.log('✅ 登录成功');
        }
        
        // 检查Credit Balance列是否存在
        const creditBalanceHeader = await page.locator('th:has-text("Credit")').first();
        const headerExists = await creditBalanceHeader.count() > 0;
        
        if (headerExists) {
            console.log('✅ Credit Balance列标题存在');
            
            // 查找测试邮箱的行
            const testEmailRow = page.locator(`tr:has-text("${TEST_EMAIL}")`);
            const rowExists = await testEmailRow.count() > 0;
            
            if (rowExists) {
                console.log('✅ 找到测试邮箱行');
                
                // 获取Credit Balance值
                const creditBalanceCell = testEmailRow.locator('td').nth(6); // Credit Balance是第7列（索引6）
                const creditBalanceText = await creditBalanceCell.textContent();
                
                console.log('💰 Credit Balance显示值:', creditBalanceText?.trim());
                
                // 截图保存
                await page.screenshot({ 
                    path: 'credit-balance-test-screenshot.png',
                    fullPage: true 
                });
                console.log('📸 已保存页面截图: credit-balance-test-screenshot.png');
                
            } else {
                console.log('⚠️ 未找到测试邮箱行');
            }
        } else {
            console.log('❌ Credit Balance列标题不存在');
        }
        
        console.log('\n🏁 Playwright测试完成!');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    } finally {
        // 保持浏览器打开10秒以便观察
        console.log('⏳ 保持浏览器打开10秒以便观察...');
        await page.waitForTimeout(10000);
        
        await browser.close();
        console.log('🔚 浏览器已关闭');
    }
}

/**
 * 测试Orb API直接调用
 */
async function testOrbAPIDirect() {
    console.log('🧪 测试直接调用Orb API...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // 测试我们之前发现的API端点
        const token = "IjNkSGhHdXNOTEx1Njg3YWMi.XDJhUCCtWvYZHP2kHezsJZBzGYg";
        
        const orbApiResult = await page.evaluate(async (token) => {
            try {
                // 1. 获取客户信息
                const customerResponse = await fetch(`https://portal.withorb.com/api/v1/customer_from_link?token=${token}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'Referer': `https://portal.withorb.com/view?token=${token}`
                    }
                });
                
                const customerData = await customerResponse.json();
                
                // 2. 获取Credit balance
                const customerId = customerData.customer.id;
                const pricingUnitId = 'jWTJo9ptbapMWkvg'; // User Messages ID
                
                const ledgerResponse = await fetch(`https://portal.withorb.com/api/v1/customers/${customerId}/ledger_summary?pricing_unit_id=${pricingUnitId}&token=${token}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'Referer': `https://portal.withorb.com/view?token=${token}`
                    }
                });
                
                const ledgerData = await ledgerResponse.json();
                
                return {
                    success: true,
                    customerData,
                    ledgerData,
                    creditBalance: ledgerData.credits_balance
                };
                
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }, token);
        
        if (orbApiResult.success) {
            console.log('✅ Orb API调用成功!');
            console.log('💰 Credit Balance:', orbApiResult.creditBalance);
            console.log('👤 客户ID:', orbApiResult.customerData.customer.id);
            console.log('📧 客户邮箱:', orbApiResult.customerData.customer.email);
        } else {
            console.log('❌ Orb API调用失败:', orbApiResult.error);
        }
        
    } catch (error) {
        console.error('❌ Orb API测试失败:', error);
    } finally {
        await browser.close();
    }
}

// 运行测试
async function runAllTests() {
    console.log('🎯 开始完整的Credit Balance测试套件...\n');
    
    // 1. 测试Orb API直接调用
    await testOrbAPIDirect();
    console.log('\n' + '='.repeat(100) + '\n');
    
    // 2. 测试我们的Credit Balance API
    await testCreditBalanceAPI();
    
    console.log('\n🎉 所有测试完成!');
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}

export {
    testCreditBalanceAPI,
    testOrbAPIDirect,
    runAllTests
};
