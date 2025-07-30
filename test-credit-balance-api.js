/**
 * 测试Credit Balance API
 */

const API_BASE = 'https://gomail.asksy.dpdns.org';
const API_TOKEN = '8f7e6d5c4b3a2918';
const TEST_EMAIL = 'karen.lewis@asksy.dpdns.org';

/**
 * 测试单个邮箱更新
 */
async function testSingleUpdate() {
    console.log('🧪 测试单个邮箱Credit Balance更新...');
    
    try {
        const formData = new FormData();
        formData.append('action', 'update-single');
        formData.append('email', TEST_EMAIL);
        
        const response = await fetch(`${API_BASE}/api/update-credit-balance`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: formData
        });
        
        console.log('📡 响应状态:', response.status);
        console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));
        
        const result = await response.text();
        console.log('📄 响应内容:', result);
        
        try {
            const jsonResult = JSON.parse(result);
            if (jsonResult.success) {
                console.log('✅ 更新成功!');
                console.log('📊 结果:', jsonResult.data);
            } else {
                console.log('❌ 更新失败:', jsonResult.error);
            }
        } catch (parseError) {
            console.log('⚠️ 响应不是JSON格式');
        }
        
    } catch (error) {
        console.error('❌ 请求失败:', error);
    }
}

/**
 * 测试批量更新
 */
async function testBatchUpdate() {
    console.log('🧪 测试批量Credit Balance更新...');
    
    try {
        const formData = new FormData();
        formData.append('action', 'update-all');
        
        const response = await fetch(`${API_BASE}/api/cron-update-credit-balance`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: formData
        });
        
        console.log('📡 响应状态:', response.status);
        console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));
        
        const result = await response.text();
        console.log('📄 响应内容:', result);
        
        try {
            const jsonResult = JSON.parse(result);
            if (jsonResult.success) {
                console.log('✅ 批量更新成功!');
                console.log('📊 结果:', jsonResult.data);
            } else {
                console.log('❌ 批量更新失败:', jsonResult.error);
            }
        } catch (parseError) {
            console.log('⚠️ 响应不是JSON格式');
        }
        
    } catch (error) {
        console.error('❌ 请求失败:', error);
    }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
    console.log('🚀 开始Credit Balance API测试...\n');
    
    // 测试单个更新
    await testSingleUpdate();
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 等待一下再测试批量更新
    console.log('⏳ 等待5秒后进行批量更新测试...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 测试批量更新
    await testBatchUpdate();
    
    console.log('\n🏁 测试完成!');
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    window.testSingleUpdate = testSingleUpdate;
    window.testBatchUpdate = testBatchUpdate;
    window.runAllTests = runAllTests;
    
    // 自动运行测试
    runAllTests().catch(console.error);
} else {
    // Node.js环境
    runAllTests().catch(console.error);
}
