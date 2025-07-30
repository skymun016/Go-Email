/**
 * 测试脚本：验证是否可以通过HTTP请求获取Credit balance值
 * 不依赖浏览器，直接访问View usage链接并解析HTML
 */

// Node.js环境下的HTTP模块
import https from 'https';
import { URL } from 'url';

// 测试用的View usage链接
const TEST_VIEW_USAGE_LINK = "https://portal.withorb.com/view?token=IjNkSGhHdXNOTEx1Njg3YWMi.XDJhUCCtWvYZHP2kHezsJZBzGYg";

/**
 * 从HTML内容中提取Credit balance值
 * @param {string} html - HTML内容
 * @returns {object} 提取结果
 */
function extractCreditBalanceFromHTML(html) {
    try {
        // 方法1: 使用正则表达式匹配 "Credit balance:" 后面的数字
        const creditBalanceRegex = /Credit\s+balance:\s*(\d+)\s*User\s+Messages/i;
        const match = html.match(creditBalanceRegex);
        
        if (match) {
            return {
                success: true,
                creditBalance: parseInt(match[1]),
                method: 'regex_credit_balance',
                rawMatch: match[0]
            };
        }
        
        // 方法2: 查找包含数字和"User Messages"的模式
        const userMessagesRegex = /(\d+)\s*User\s+Messages/i;
        const userMessagesMatch = html.match(userMessagesRegex);
        
        if (userMessagesMatch) {
            return {
                success: true,
                creditBalance: parseInt(userMessagesMatch[1]),
                method: 'regex_user_messages',
                rawMatch: userMessagesMatch[0]
            };
        }
        
        // 方法3: 查找JSON数据中的信息（如果页面包含结构化数据）
        const jsonRegex = /"creditBalance":\s*(\d+)/i;
        const jsonMatch = html.match(jsonRegex);
        
        if (jsonMatch) {
            return {
                success: true,
                creditBalance: parseInt(jsonMatch[1]),
                method: 'json_data',
                rawMatch: jsonMatch[0]
            };
        }
        
        return {
            success: false,
            error: 'No credit balance pattern found in HTML',
            htmlLength: html.length,
            htmlPreview: html.substring(0, 500) + '...'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            htmlLength: html ? html.length : 0
        };
    }
}

/**
 * Node.js环境下的HTTP请求函数
 * @param {string} url - 请求URL
 * @returns {Promise<object>} 响应结果
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
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    body: data
                });
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
 * 获取Credit balance值
 * @param {string} viewUsageLink - View usage链接
 * @returns {Promise<object>} 获取结果
 */
async function getCreditBalance(viewUsageLink) {
    try {
        console.log('🔍 开始获取Credit balance...');
        console.log('🔗 链接:', viewUsageLink);

        // 发送HTTP请求
        const response = await makeHttpRequest(viewUsageLink);

        console.log('📡 响应状态:', response.status, response.statusText);
        console.log('📋 响应头:', response.headers);

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 获取HTML内容
        const html = response.body;
        console.log('📄 HTML长度:', html.length);
        
        // 输出完整HTML内容用于调试
        console.log('📄 完整HTML内容:');
        console.log('='.repeat(80));
        console.log(html);
        console.log('='.repeat(80));

        // 提取Credit balance
        const result = extractCreditBalanceFromHTML(html);

        if (result.success) {
            console.log('✅ 成功提取Credit balance:', result.creditBalance);
            console.log('🔧 提取方法:', result.method);
            console.log('📝 原始匹配:', result.rawMatch);
        } else {
            console.log('❌ 提取失败:', result.error);
            if (result.htmlPreview) {
                console.log('📄 HTML预览:', result.htmlPreview);
            }
        }
        
        return {
            success: result.success,
            creditBalance: result.creditBalance,
            method: result.method,
            rawMatch: result.rawMatch,
            error: result.error,
            responseStatus: response.status,
            responseHeaders: response.headers,
            htmlLength: html.length
        };
        
    } catch (error) {
        console.log('❌ 请求失败:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 运行测试
 */
async function runTest() {
    console.log('🧪 开始测试Credit balance获取功能...\n');
    
    const result = await getCreditBalance(TEST_VIEW_USAGE_LINK);
    
    console.log('\n📊 测试结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
        console.log('\n🎉 测试成功！可以通过HTTP请求获取Credit balance值');
        console.log(`💰 Credit balance: ${result.creditBalance} User Messages`);
    } else {
        console.log('\n❌ 测试失败，需要进一步调试');
    }
}

// ES模块导出
export {
    getCreditBalance,
    extractCreditBalanceFromHTML,
    runTest
};

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    runTest().catch(console.error);
}
