/**
 * 测试Orb API端点，获取Credit balance数据
 */

import https from 'https';
import { URL } from 'url';

// 测试用的token
const TEST_TOKEN = "IjNkSGhHdXNOTEx1Njg3YWMi.XDJhUCCtWvYZHP2kHezsJZBzGYg";

/**
 * 发送HTTP请求
 */
function makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Referer': `https://portal.withorb.com/view?token=${TEST_TOKEN}`
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        headers: res.headers,
                        data: data,
                        parseError: error.message
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

/**
 * 测试客户信息API
 */
async function testCustomerFromLink() {
    console.log('🔍 测试 customer_from_link API...');
    
    const url = `https://portal.withorb.com/api/v1/customer_from_link?token=${TEST_TOKEN}`;
    
    try {
        const response = await makeHttpRequest(url);
        console.log('📡 响应状态:', response.status);
        console.log('📋 响应数据:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return null;
    }
}

/**
 * 测试账本摘要API
 */
async function testLedgerSummary(customerId, pricingUnitId) {
    console.log('🔍 测试 ledger_summary API...');
    
    const url = `https://portal.withorb.com/api/v1/customers/${customerId}/ledger_summary?pricing_unit_id=${pricingUnitId}&token=${TEST_TOKEN}`;
    
    try {
        const response = await makeHttpRequest(url);
        console.log('📡 响应状态:', response.status);
        console.log('📋 响应数据:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return null;
    }
}

/**
 * 测试订阅信息API
 */
async function testSubscriptionsFromLink() {
    console.log('🔍 测试 subscriptions_from_link API...');
    
    const url = `https://portal.withorb.com/api/v1/subscriptions_from_link?token=${TEST_TOKEN}`;
    
    try {
        const response = await makeHttpRequest(url);
        console.log('📡 响应状态:', response.status);
        console.log('📋 响应数据:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return null;
    }
}

/**
 * 从API响应中提取Credit balance
 */
function extractCreditBalanceFromAPI(customerData, ledgerData, subscriptionData) {
    console.log('🔍 分析API数据，查找Credit balance...');

    // 检查ledger_summary数据
    if (ledgerData && ledgerData.credits_balance) {
        console.log('💰 在ledger_summary中找到credits_balance:', ledgerData.credits_balance);
        return {
            source: 'ledger_summary',
            creditBalance: parseFloat(ledgerData.credits_balance),
            currency: 'User Messages',
            rawData: ledgerData
        };
    }

    // 检查subscription数据中的fixed_price_quantity (这很可能是Credit balance)
    if (subscriptionData && subscriptionData.data && Array.isArray(subscriptionData.data)) {
        for (const subscription of subscriptionData.data) {
            if (subscription.subscription_items) {
                for (const item of subscription.subscription_items) {
                    if (item.price && item.price.price &&
                        item.price.price.currency === 'usermessages' &&
                        item.price.price.fixed_price_quantity) {
                        const balance = item.price.price.fixed_price_quantity;
                        console.log('💰 在subscription的fixed_price_quantity中找到User Messages:', balance);
                        return {
                            source: 'subscription_fixed_quantity',
                            creditBalance: balance,
                            currency: 'User Messages',
                            rawData: item
                        };
                    }
                }
            }
        }
    }

    // 检查customer数据
    if (customerData && customerData.balance) {
        console.log('💰 在customer数据中找到balance:', customerData.balance);
        return {
            source: 'customer',
            creditBalance: customerData.balance,
            rawData: customerData
        };
    }

    console.log('❌ 未在API数据中找到Credit balance');
    return null;
}

/**
 * 运行完整测试
 */
async function runFullTest() {
    console.log('🧪 开始测试Orb API端点...\n');
    
    // 1. 获取客户信息
    const customerData = await testCustomerFromLink();
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 2. 获取订阅信息
    const subscriptionData = await testSubscriptionsFromLink();
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 3. 如果有客户ID，获取账本摘要
    let ledgerData = null;
    if (customerData && customerData.customer && customerData.customer.id) {
        // 从API响应中获取客户ID和定价单位ID
        const customerId = customerData.customer.id;
        const pricingUnitId = 'jWTJo9ptbapMWkvg'; // User Messages的ID

        ledgerData = await testLedgerSummary(customerId, pricingUnitId);
        console.log('\n' + '='.repeat(80) + '\n');
    }
    
    // 4. 分析数据，提取Credit balance
    const creditBalanceResult = extractCreditBalanceFromAPI(customerData, ledgerData, subscriptionData);
    
    console.log('📊 最终结果:');
    if (creditBalanceResult) {
        console.log('✅ 成功找到Credit balance!');
        console.log('🔧 数据源:', creditBalanceResult.source);
        console.log('💰 Credit balance:', creditBalanceResult.creditBalance);
        if (creditBalanceResult.currency) {
            console.log('💱 货币:', creditBalanceResult.currency);
        }
    } else {
        console.log('❌ 未找到Credit balance数据');
    }
    
    return creditBalanceResult;
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    runFullTest().catch(console.error);
}

export {
    testCustomerFromLink,
    testLedgerSummary,
    testSubscriptionsFromLink,
    extractCreditBalanceFromAPI,
    runFullTest
};
