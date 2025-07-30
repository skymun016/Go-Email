// AugmentCode 自动注册助手 - 弹窗脚本

document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const logContainer = document.getElementById('log-container');
    const startRegistrationBtn = document.getElementById('start-registration');
    const manualUpdateBtn = document.getElementById('manual-update');
    const resetStatesBtn = document.getElementById('reset-states');
    const testExtractionBtn = document.getElementById('test-extraction');

    // 初始化
    init();

    async function init() {
        try {
            // 检查当前标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab.url.includes('augmentcode.com')) {
                updateStatus('active', '已连接到 AugmentCode 网站');
                enableButtons(true);
            } else {
                updateStatus('inactive', '请访问 AugmentCode 网站使用此插件');
                enableButtons(false);
            }

            addLog('插件初始化完成');
        } catch (error) {
            updateStatus('inactive', '初始化失败: ' + error.message);
            addLog('初始化错误: ' + error.message, 'error');
        }
    }

    // 更新状态显示
    function updateStatus(status, text) {
        statusIndicator.className = `status-indicator ${status}`;
        statusText.textContent = text;
    }

    // 启用/禁用按钮
    function enableButtons(enabled) {
        const buttons = [startRegistrationBtn, manualUpdateBtn, resetStatesBtn, testExtractionBtn];
        buttons.forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    // 添加日志
    function addLog(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const levelColors = {
            'info': '#a0aec0',
            'success': '#4facfe',
            'error': '#fa709a',
            'warning': '#fcb69f'
        };

        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span style="color: ${levelColors[level] || levelColors.info}">${message}</span>
        `;

        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;

        // 限制日志条目数量
        while (logContainer.children.length > 20) {
            logContainer.removeChild(logContainer.firstChild);
        }
    }

    // 执行内容脚本函数
    async function executeContentScript(functionName, ...args) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: function(funcName, ...funcArgs) {
                    if (window[funcName] && typeof window[funcName] === 'function') {
                        return window[funcName](...funcArgs);
                    } else {
                        throw new Error(`函数 ${funcName} 不存在`);
                    }
                },
                args: [functionName, ...args]
            });

            return results[0].result;
        } catch (error) {
            throw new Error(`执行失败: ${error.message}`);
        }
    }

    // 事件监听器
    startRegistrationBtn.addEventListener('click', async function() {
        this.disabled = true;
        this.textContent = '🔄 正在启动...';
        
        try {
            addLog('开始自动注册流程...', 'info');
            await executeContentScript('startAutoRegistration');
            addLog('自动注册已启动', 'success');
        } catch (error) {
            addLog('启动失败: ' + error.message, 'error');
        } finally {
            this.disabled = false;
            this.textContent = '🚀 开始自动注册';
        }
    });

    manualUpdateBtn.addEventListener('click', async function() {
        this.disabled = true;
        this.textContent = '🔄 更新中...';
        
        try {
            addLog('手动更新邮箱状态...', 'info');
            const result = await executeContentScript('manualUpdateEmailStatus');
            if (result) {
                addLog('状态更新成功', 'success');
            } else {
                addLog('状态更新失败', 'error');
            }
        } catch (error) {
            addLog('更新失败: ' + error.message, 'error');
        } finally {
            this.disabled = false;
            this.textContent = '📝 手动更新状态';
        }
    });

    resetStatesBtn.addEventListener('click', async function() {
        try {
            addLog('重置所有状态...', 'info');
            await executeContentScript('resetAugmentStates');
            addLog('状态已重置', 'success');
        } catch (error) {
            addLog('重置失败: ' + error.message, 'error');
        }
    });

    testExtractionBtn.addEventListener('click', async function() {
        this.disabled = true;
        this.textContent = '🔄 测试中...';
        
        try {
            addLog('测试邮箱提取功能...', 'info');
            const email = await executeContentScript('testExtractEmail');
            if (email) {
                addLog('提取成功: ' + email, 'success');
            } else {
                addLog('未能提取到邮箱', 'warning');
            }

            addLog('测试 View usage 链接提取...', 'info');
            const link = await executeContentScript('testExtractViewUsageLink');
            if (link) {
                addLog('链接提取成功: ' + link, 'success');
            } else {
                addLog('未能提取到链接', 'warning');
            }
        } catch (error) {
            addLog('测试失败: ' + error.message, 'error');
        } finally {
            this.disabled = false;
            this.textContent = '🧪 测试邮箱提取';
        }
    });

    // 监听来自内容脚本的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'log') {
            addLog(message.message, message.level);
        } else if (message.type === 'status') {
            updateStatus(message.status, message.text);
        }
    });

    // 定期检查页面状态
    setInterval(async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.url.includes('augmentcode.com')) {
                if (statusIndicator.classList.contains('inactive')) {
                    updateStatus('active', '已连接到 AugmentCode 网站');
                    enableButtons(true);
                }
            } else {
                if (statusIndicator.classList.contains('active')) {
                    updateStatus('inactive', '请访问 AugmentCode 网站使用此插件');
                    enableButtons(false);
                }
            }
        } catch (error) {
            // 忽略错误，可能是标签页已关闭
        }
    }, 2000);
});
