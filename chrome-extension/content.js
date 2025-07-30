// AugmentCode 自动注册助手 - Chrome 插件版本
// 转换自油猴脚本，移除油猴依赖

(function() {
    'use strict';

    // 自动化API配置
    const AUTOMATION_API_CONFIG = {
        baseUrl: "https://gomail-app.amexiaowu.workers.dev",
        apiToken: "gm_VS-Bg8f_nGaGDI-a9IWqMxZIw9wy50wQ",
        endpoints: {
            getAvailableMailboxes: "/api/automation?action=get-available-mailboxes",
            getVerificationCodes: "/api/automation?action=get-verification-codes",
            markRegistered: "/api/automation"
        }
    };

    // 后端配置
    const BACKEND_CONFIG = {
        url: "https://api.amw.qzz.io",
        adminToken: "krAPyH5MVK8uJUXsbO4nLrqEgRS5lEho3LjIiKjBMH6mXRLaU4kzmUPabrJN67cx"
    };

    // 全局状态跟踪
    let copyOperationCompleted = false;
    let oauthPushCompleted = false;
    let subscriptionPageProcessed = false;
    let currentGeneratedEmail = null;

    // Chrome 插件存储和请求包装函数
    const ChromeAPI = {
        // 存储数据
        setValue: function(key, value) {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'setValue',
                    key: key,
                    value: value
                }, (response) => {
                    resolve(response.success);
                });
            });
        },

        // 获取数据
        getValue: function(key, defaultValue = null) {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getValue',
                    key: key
                }, (response) => {
                    resolve(response.success ? (response.value || defaultValue) : defaultValue);
                });
            });
        },

        // 发送 HTTP 请求
        xmlhttpRequest: function(config) {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'makeRequest',
                    config: {
                        url: config.url,
                        method: config.method || 'GET',
                        headers: config.headers || {},
                        body: config.data,
                        responseType: 'json'
                    }
                }, (response) => {
                    if (response.success) {
                        // 模拟油猴的响应格式
                        const mockResponse = {
                            status: response.data.status,
                            statusText: response.data.statusText,
                            responseText: JSON.stringify(response.data.data),
                            response: response.data.data
                        };
                        
                        if (config.onload) {
                            config.onload(mockResponse);
                        }
                        resolve(mockResponse);
                    } else {
                        const error = new Error(response.error || 'Request failed');
                        if (config.onerror) {
                            config.onerror(error);
                        }
                        reject(error);
                    }
                });
            });
        },

        // 日志函数
        log: function(message) {
            console.log('[AugmentCode助手]', message);
        }
    };

    // 日志系统
    const logger = {
        log: function(message, level = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${timestamp}] [AugmentCode助手]`;
            
            switch(level) {
                case 'error':
                    console.error(prefix, message);
                    break;
                case 'warning':
                    console.warn(prefix, message);
                    break;
                case 'success':
                    console.log(prefix, '✅', message);
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    };

    // 重置操作状态
    function resetOperationStates() {
        copyOperationCompleted = false;
        oauthPushCompleted = false;
        subscriptionPageProcessed = false;
        currentGeneratedEmail = null;
        logger.log('🔄 操作状态已重置', 'info');
    }

    // 暴露到全局，方便调试
    window.resetAugmentStates = resetOperationStates;

    // 测试邮箱提取功能
    window.testExtractEmail = function() {
        logger.log('🧪 开始测试邮箱提取功能...', 'info');
        const extractedEmail = extractEmailFromSubscriptionPage();
        if (extractedEmail) {
            logger.log('✅ 测试成功！提取到邮箱: ' + extractedEmail, 'success');
            return extractedEmail;
        } else {
            logger.log('❌ 测试失败！未能提取到邮箱', 'error');
            return null;
        }
    };

    // 测试 View usage 链接提取功能
    window.testExtractViewUsageLink = function() {
        logger.log('🧪 开始测试 View usage 链接提取功能...', 'info');
        const extractedLink = extractViewUsageLinkFromSubscriptionPage();
        if (extractedLink) {
            logger.log('✅ 测试成功！提取到 View usage 链接: ' + extractedLink, 'success');
            return extractedLink;
        } else {
            logger.log('❌ 测试失败！未能提取到 View usage 链接', 'error');
            return null;
        }
    };

    // 从订阅页面提取邮箱地址
    function extractEmailFromSubscriptionPage() {
        logger.log('🔍 尝试从订阅页面提取邮箱地址...', 'info');

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        // 策略1: 使用具体选择器
        const specificSelectors = [
            'body > div.radix-themes > div.rt-Container.rt-r-size-4.rt-r-mx-4 > div > div.rt-Box.topnav-container > div.rt-Box.base-header-container > div > div > div.rt-Flex.rt-r-ai-center.rt-r-gap-3.base-header-right-section > span:nth-child(1)',
            '.base-header-right-section span:first-child',
            '.base-header-email',
            '[data-testid="user-email"]'
        ];

        for (const selector of specificSelectors) {
            try {
                const element = document.querySelector(selector);
                if (element && element.textContent) {
                    const text = element.textContent.trim();
                    if (emailRegex.test(text)) {
                        logger.log('✅ 通过选择器提取到邮箱: ' + text, 'success');
                        return text;
                    }
                }
            } catch (error) {
                logger.log('⚠️ 选择器失败: ' + selector, 'warning');
            }
        }

        // 策略2: 搜索所有包含邮箱格式的文本元素
        const allElements = document.querySelectorAll('span, div, p, td, th');
        for (const element of allElements) {
            if (element.textContent) {
                const text = element.textContent.trim();
                if (emailRegex.test(text) && text.includes('@')) {
                    logger.log('✅ 通过文本搜索提取到邮箱: ' + text, 'success');
                    return text;
                }
            }
        }

        // 策略3: 搜索页面中所有文本内容
        const pageText = document.body.innerText || document.body.textContent || '';
        const emailMatches = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatches && emailMatches.length > 0) {
            const validEmails = emailMatches.filter(email =>
                !email.includes('example.com') &&
                !email.includes('test.com') &&
                !email.includes('placeholder')
            );
            if (validEmails.length > 0) {
                logger.log('✅ 通过正则匹配提取到邮箱: ' + validEmails[0], 'success');
                return validEmails[0];
            }
        }

        logger.log('❌ 未能从页面提取到邮箱地址', 'error');
        return null;
    }

    // 初始化脚本
    function initializeScript() {
        logger.log('🚀 AugmentCode 自动注册助手已启动 (Chrome插件版)', 'info');
        
        // 检查当前页面并执行相应逻辑
        if (window.location.href.includes('app.augmentcode.com/account/subscription')) {
            handleSubscriptionPage();
        } else if (window.location.href.includes('augmentcode.com')) {
            handleMainSite();
        }
    }

    // 处理订阅页面
    function handleSubscriptionPage() {
        logger.log('📄 检测到订阅页面', 'info');

        if (subscriptionPageProcessed) {
            logger.log('⚠️ 订阅页面已处理过，跳过', 'warning');
            return;
        }

        subscriptionPageProcessed = true;

        // 自动提取邮箱和View usage链接并更新状态
        setTimeout(async () => {
            try {
                const email = extractEmailFromSubscriptionPage();
                const viewUsageLink = extractViewUsageLinkFromSubscriptionPage();

                if (email) {
                    logger.log('📧 检测到注册成功的邮箱: ' + email, 'success');
                    await markEmailAsRegistered(email, viewUsageLink);
                    logger.log('🎉 注册流程完成！邮箱状态已更新', 'success');

                    // 清理存储
                    await ChromeAPI.setValue('augment_current_email', null);
                    currentGeneratedEmail = null;
                } else {
                    logger.log('⚠️ 未能从订阅页面提取到邮箱', 'warning');
                }
            } catch (error) {
                logger.log('❌ 处理订阅页面失败: ' + error.message, 'error');
            }
        }, 2000);
    }

    // 处理主站页面
    function handleMainSite() {
        logger.log('🏠 检测到主站页面', 'info');

        // 创建控制面板
        createControlPanel();

        // 检查是否有注册表单
        const emailInput = document.querySelector('input[type="email"]');
        if (emailInput) {
            logger.log('📝 检测到注册表单', 'info');
            // 可以在这里添加自动填写逻辑
        }
    }

    // 创建控制面板
    function createControlPanel() {
        // 检查是否已存在控制面板
        if (document.getElementById('augment-control-panel')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'augment-control-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: linear-gradient(135deg, rgba(45, 55, 72, 0.95) 0%, rgba(68, 90, 120, 0.9) 100%);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #e2e8f0;
        `;

        panel.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="width: 8px; height: 8px; background: #4facfe; border-radius: 50%; margin-right: 8px;"></div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">AugmentCode 助手</h3>
            </div>

            <div style="margin-bottom: 15px;">
                <button id="start-auto-register" style="
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 8px;
                ">🚀 开始自动注册</button>

                <button id="manual-update-status" style="
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 8px;
                ">📝 手动更新状态</button>

                <button id="reset-states" style="
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">🔄 重置状态</button>
            </div>

            <div id="status-display" style="
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 12px;
                font-size: 12px;
                line-height: 1.4;
                max-height: 200px;
                overflow-y: auto;
            ">
                <div style="color: #a0aec0;">等待操作...</div>
            </div>
        `;

        document.body.appendChild(panel);

        // 添加事件监听器
        document.getElementById('start-auto-register').addEventListener('click', () => {
            startAutoRegistration();
        });

        document.getElementById('manual-update-status').addEventListener('click', () => {
            window.manualUpdateEmailStatus();
        });

        document.getElementById('reset-states').addEventListener('click', () => {
            resetOperationStates();
            updateStatusDisplay('状态已重置');
        });

        // 重写logger.log以在面板中显示
        const originalLog = logger.log;
        logger.log = function(message, level = 'info') {
            originalLog.call(this, message, level);
            updateStatusDisplay(message, level);
        };
    }

    // 更新状态显示
    function updateStatusDisplay(message, level = 'info') {
        const statusDisplay = document.getElementById('status-display');
        if (!statusDisplay) return;

        const timestamp = new Date().toLocaleTimeString();
        const levelColors = {
            'info': '#a0aec0',
            'success': '#4facfe',
            'error': '#fa709a',
            'warning': '#fcb69f'
        };

        const color = levelColors[level] || levelColors.info;

        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin-bottom: 4px;
            color: ${color};
            font-size: 11px;
        `;
        logEntry.innerHTML = `<span style="opacity: 0.7;">[${timestamp}]</span> ${message}`;

        statusDisplay.appendChild(logEntry);
        statusDisplay.scrollTop = statusDisplay.scrollHeight;

        // 限制日志条目数量
        while (statusDisplay.children.length > 50) {
            statusDisplay.removeChild(statusDisplay.firstChild);
        }
    }

    // 从订阅页面提取 View usage 链接
    function extractViewUsageLinkFromSubscriptionPage() {
        logger.log('🔍 尝试从订阅页面提取 View usage 链接...', 'info');

        // 策略1: 查找包含 "View usage" 文本的链接
        const linkSelectors = [
            'a[href*="usage"]',
            'a[href*="billing"]',
            'a[href*="portal"]',
            'a',
            'button'
        ];

        for (const selector of linkSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent?.trim().toLowerCase() || '';
                    const href = element.href || element.getAttribute('href') || '';

                    if (text.includes('view usage') || text.includes('usage')) {
                        if (href) {
                            logger.log('✅ 通过选择器找到 View usage 链接: ' + href, 'success');
                            return href;
                        }
                    }
                }
            } catch (error) {
                logger.log('⚠️ 选择器失败: ' + selector + ' - ' + error.message, 'warning');
            }
        }

        logger.log('❌ 未能从页面提取到 View usage 链接', 'error');
        return null;
    }

    // 手动触发邮箱状态更新的函数
    window.manualUpdateEmailStatus = async function() {
        let emailToUpdate = currentGeneratedEmail;
        if (!emailToUpdate) {
            emailToUpdate = await ChromeAPI.getValue('augment_current_email');
            if (emailToUpdate) {
                logger.log('📧 从存储恢复邮箱地址: ' + emailToUpdate, 'info');
                currentGeneratedEmail = emailToUpdate;
            }
        }

        // 如果还是没有邮箱，尝试从页面提取
        if (!emailToUpdate) {
            emailToUpdate = extractEmailFromSubscriptionPage();
            if (emailToUpdate) {
                currentGeneratedEmail = emailToUpdate;
                await ChromeAPI.setValue('augment_current_email', emailToUpdate);
            }
        }

        if (!emailToUpdate) {
            logger.log('❌ 未找到邮箱地址！请先运行注册流程', 'error');
            return false;
        }

        // 尝试提取 View usage 链接
        let viewUsageLink = null;
        if (window.location.href.includes('/account/subscription')) {
            viewUsageLink = extractViewUsageLinkFromSubscriptionPage();
        }

        try {
            logger.log('📝 手动更新邮箱状态: ' + emailToUpdate, 'info');
            await markEmailAsRegistered(emailToUpdate, viewUsageLink);
            logger.log('✅ 邮箱状态已成功更新为已注册', 'success');

            // 清理存储中的邮箱信息
            await ChromeAPI.setValue('augment_current_email', null);
            currentGeneratedEmail = null;

            logger.log('🎊 手动更新完成！', 'success');
            return true;
        } catch (error) {
            logger.log('❌ 手动更新邮箱状态失败: ' + error.message, 'error');
            return false;
        }
    };

    // 紧急停止所有脚本活动
    window.emergencyStop = () => {
        copyOperationCompleted = true;
        oauthPushCompleted = true;
        if (window.stopPageObserver) {
            window.stopPageObserver();
        }
        logger.log('🚨 紧急停止：所有脚本活动已停止', 'warning');
    };

    // 获取可用邮箱
    async function getAvailableMailbox() {
        logger.log('📬 正在获取可用邮箱...', 'info');

        try {
            const response = await ChromeAPI.xmlhttpRequest({
                method: 'POST',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getAvailableMailboxes}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                data: 'action=get-available-mailboxes'
            });

            if (response.response && response.response.success && response.response.data) {
                const mailbox = response.response.data;
                logger.log('✅ 获取到可用邮箱: ' + mailbox.email, 'success');
                return mailbox;
            } else {
                throw new Error(response.response?.message || '获取邮箱失败');
            }
        } catch (error) {
            logger.log('❌ 获取可用邮箱失败: ' + error.message, 'error');
            throw error;
        }
    }

    // 获取验证码
    async function getVerificationCode(email) {
        logger.log('🔐 正在获取验证码: ' + email, 'info');

        try {
            const response = await ChromeAPI.xmlhttpRequest({
                method: 'POST',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getVerificationCodes}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                data: `action=get-verification-codes&email=${encodeURIComponent(email)}`
            });

            if (response.response && response.response.success && response.response.data) {
                const codes = response.response.data;
                if (codes.length > 0) {
                    logger.log('✅ 获取到验证码: ' + codes[0].code, 'success');
                    return codes[0].code;
                } else {
                    throw new Error('暂无验证码');
                }
            } else {
                throw new Error(response.response?.message || '获取验证码失败');
            }
        } catch (error) {
            logger.log('❌ 获取验证码失败: ' + error.message, 'error');
            throw error;
        }
    }

    // 标记邮箱为已注册
    async function markEmailAsRegistered(email, viewUsageLink = null) {
        logger.log('📝 标记邮箱为已注册: ' + email, 'info');

        try {
            let requestData = `action=mark-registered&email=${encodeURIComponent(email)}`;
            if (viewUsageLink) {
                requestData += `&viewUsageLink=${encodeURIComponent(viewUsageLink)}`;
            }

            const response = await ChromeAPI.xmlhttpRequest({
                method: 'POST',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.markRegistered}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                data: requestData
            });

            if (response.response && response.response.success) {
                logger.log('✅ 邮箱状态已更新为已注册', 'success');
                return true;
            } else {
                throw new Error(response.response?.message || '更新状态失败');
            }
        } catch (error) {
            logger.log('❌ 标记邮箱失败: ' + error.message, 'error');
            throw error;
        }
    }

    // 从订阅页面提取 View usage 链接
    function extractViewUsageLinkFromSubscriptionPage() {
        logger.log('🔍 尝试从订阅页面提取 View usage 链接...', 'info');

        // 策略1: 查找包含 "View usage" 文本的链接
        const linkSelectors = [
            'a[href*="usage"]',
            'a[href*="billing"]',
            'a[href*="portal"]',
            'a',
            'button'
        ];

        for (const selector of linkSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent?.trim().toLowerCase() || '';
                    const href = element.href || element.getAttribute('href') || '';

                    if (text.includes('view usage') || text.includes('usage')) {
                        if (href) {
                            logger.log('✅ 通过选择器找到 View usage 链接: ' + href, 'success');
                            return href;
                        }
                    }
                }
            } catch (error) {
                logger.log('⚠️ 选择器失败: ' + selector + ' - ' + error.message, 'warning');
            }
        }

        logger.log('❌ 未能从页面提取到 View usage 链接', 'error');
        return null;
    }

    // 手动触发邮箱状态更新的函数
    window.manualUpdateEmailStatus = async function() {
        let emailToUpdate = currentGeneratedEmail;
        if (!emailToUpdate) {
            emailToUpdate = await ChromeAPI.getValue('augment_current_email');
            if (emailToUpdate) {
                logger.log('📧 从存储恢复邮箱地址: ' + emailToUpdate, 'info');
                currentGeneratedEmail = emailToUpdate;
            }
        }

        // 如果还是没有邮箱，尝试从页面提取
        if (!emailToUpdate) {
            emailToUpdate = extractEmailFromSubscriptionPage();
            if (emailToUpdate) {
                currentGeneratedEmail = emailToUpdate;
                await ChromeAPI.setValue('augment_current_email', emailToUpdate);
            }
        }

        if (!emailToUpdate) {
            logger.log('❌ 未找到邮箱地址！请先运行注册流程', 'error');
            return false;
        }

        // 尝试提取 View usage 链接
        let viewUsageLink = null;
        if (window.location.href.includes('/account/subscription')) {
            viewUsageLink = extractViewUsageLinkFromSubscriptionPage();
        }

        try {
            logger.log('📝 手动更新邮箱状态: ' + emailToUpdate, 'info');
            await markEmailAsRegistered(emailToUpdate, viewUsageLink);
            logger.log('✅ 邮箱状态已成功更新为已注册', 'success');

            // 清理存储中的邮箱信息
            await ChromeAPI.setValue('augment_current_email', null);
            currentGeneratedEmail = null;

            logger.log('🎊 手动更新完成！', 'success');
            return true;
        } catch (error) {
            logger.log('❌ 手动更新邮箱状态失败: ' + error.message, 'error');
            return false;
        }
    };

    // 紧急停止所有脚本活动
    window.emergencyStop = () => {
        copyOperationCompleted = true;
        oauthPushCompleted = true;
        if (window.stopPageObserver) {
            window.stopPageObserver();
        }
        logger.log('🚨 紧急停止：所有脚本活动已停止', 'warning');
    };

    // 获取可用邮箱
    async function getAvailableMailbox() {
        logger.log('📬 正在获取可用邮箱...', 'info');

        try {
            const response = await ChromeAPI.xmlhttpRequest({
                method: 'POST',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getAvailableMailboxes}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                data: 'action=get-available-mailboxes'
            });

            if (response.response && response.response.success && response.response.data) {
                const mailbox = response.response.data;
                logger.log('✅ 获取到可用邮箱: ' + mailbox.email, 'success');
                return mailbox;
            } else {
                throw new Error(response.response?.message || '获取邮箱失败');
            }
        } catch (error) {
            logger.log('❌ 获取可用邮箱失败: ' + error.message, 'error');
            throw error;
        }
    }

    // 获取验证码
    async function getVerificationCode(email) {
        logger.log('🔐 正在获取验证码: ' + email, 'info');

        try {
            const response = await ChromeAPI.xmlhttpRequest({
                method: 'POST',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getVerificationCodes}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                data: `action=get-verification-codes&email=${encodeURIComponent(email)}`
            });

            if (response.response && response.response.success && response.response.data) {
                const codes = response.response.data;
                if (codes.length > 0) {
                    logger.log('✅ 获取到验证码: ' + codes[0].code, 'success');
                    return codes[0].code;
                } else {
                    throw new Error('暂无验证码');
                }
            } else {
                throw new Error(response.response?.message || '获取验证码失败');
            }
        } catch (error) {
            logger.log('❌ 获取验证码失败: ' + error.message, 'error');
            throw error;
        }
    }

    // 标记邮箱为已注册
    async function markEmailAsRegistered(email, viewUsageLink = null) {
        logger.log('📝 标记邮箱为已注册: ' + email, 'info');

        try {
            let requestData = `action=mark-registered&email=${encodeURIComponent(email)}`;
            if (viewUsageLink) {
                requestData += `&viewUsageLink=${encodeURIComponent(viewUsageLink)}`;
            }

            const response = await ChromeAPI.xmlhttpRequest({
                method: 'POST',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.markRegistered}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                data: requestData
            });

            if (response.response && response.response.success) {
                logger.log('✅ 邮箱状态已更新为已注册', 'success');
                return true;
            } else {
                throw new Error(response.response?.message || '更新状态失败');
            }
        } catch (error) {
            logger.log('❌ 标记邮箱失败: ' + error.message, 'error');
            throw error;
        }
    }

    // 模拟人类行为的延迟函数
    function humanDelay(min = 1000, max = 3000) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    // 模拟鼠标移动和点击
    function simulateHumanClick(element) {
        if (!element) return false;

        // 模拟鼠标移动到元素
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // 触发鼠标事件序列
        const events = ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'];
        events.forEach(eventType => {
            const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            element.dispatchEvent(event);
        });

        return true;
    }

    // 模拟人类输入
    async function simulateHumanInput(element, text) {
        if (!element) return false;

        element.focus();
        await humanDelay(200, 500);

        // 清空现有内容
        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // 逐字符输入
        for (let i = 0; i < text.length; i++) {
            await humanDelay(50, 150);
            element.value = text.substring(0, i + 1);
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    // 主要的自动注册流程
    async function startAutoRegistration() {
        logger.log('🚀 开始自动注册流程...', 'info');

        try {
            // 1. 获取可用邮箱
            const mailbox = await getAvailableMailbox();
            currentGeneratedEmail = mailbox.email;
            await ChromeAPI.setValue('augment_current_email', mailbox.email);

            logger.log('📧 使用邮箱: ' + mailbox.email, 'info');

            // 2. 填写注册表单
            await fillRegistrationForm(mailbox.email);

            // 3. 等待验证码并填写
            await waitAndFillVerificationCode(mailbox.email);

            logger.log('✅ 自动注册流程完成！', 'success');

        } catch (error) {
            logger.log('❌ 自动注册失败: ' + error.message, 'error');
        }
    }

    // 填写注册表单
    async function fillRegistrationForm(email) {
        logger.log('📝 填写注册表单...', 'info');

        // 查找邮箱输入框
        const emailInput = document.querySelector('input[type="email"]') ||
                          document.querySelector('input[name*="email"]') ||
                          document.querySelector('input[placeholder*="email"]');

        if (emailInput) {
            await simulateHumanInput(emailInput, email);
            logger.log('✅ 邮箱已填写', 'success');
        } else {
            throw new Error('未找到邮箱输入框');
        }

        await humanDelay(1000, 2000);

        // 查找并点击提交按钮
        const submitButton = document.querySelector('button[type="submit"]') ||
                           document.querySelector('input[type="submit"]') ||
                           Array.from(document.querySelectorAll('button')).find(btn =>
                               btn.textContent.toLowerCase().includes('sign up') ||
                               btn.textContent.toLowerCase().includes('register')
                           );

        if (submitButton) {
            simulateHumanClick(submitButton);
            logger.log('✅ 提交按钮已点击', 'success');
        } else {
            logger.log('⚠️ 未找到提交按钮，请手动点击', 'warning');
        }
    }

    // 等待并填写验证码
    async function waitAndFillVerificationCode(email) {
        logger.log('⏳ 等待验证码输入框出现...', 'info');

        // 等待验证码输入框出现
        let verificationInput = null;
        let attempts = 0;
        const maxAttempts = 30; // 30秒超时

        while (!verificationInput && attempts < maxAttempts) {
            verificationInput = document.querySelector('input[name*="code"]') ||
                              document.querySelector('input[placeholder*="code"]') ||
                              document.querySelector('input[type="text"][maxlength="6"]');

            if (!verificationInput) {
                await humanDelay(1000, 1000);
                attempts++;
            }
        }

        if (!verificationInput) {
            throw new Error('验证码输入框未出现');
        }

        logger.log('✅ 验证码输入框已找到', 'success');

        // 获取验证码
        let verificationCode = null;
        attempts = 0;
        const maxCodeAttempts = 60; // 60秒超时

        while (!verificationCode && attempts < maxCodeAttempts) {
            try {
                verificationCode = await getVerificationCode(email);
                break;
            } catch (error) {
                logger.log('⏳ 等待验证码... (' + (attempts + 1) + '/' + maxCodeAttempts + ')', 'info');
                await humanDelay(1000, 1000);
                attempts++;
            }
        }

        if (!verificationCode) {
            throw new Error('获取验证码超时');
        }

        // 填写验证码
        await simulateHumanInput(verificationInput, verificationCode);
        logger.log('✅ 验证码已填写', 'success');

        await humanDelay(1000, 2000);

        // 查找并点击验证按钮
        const verifyButton = Array.from(document.querySelectorAll('button')).find(btn =>
                               btn.textContent.toLowerCase().includes('verify') ||
                               btn.textContent.toLowerCase().includes('submit')
                           ) || document.querySelector('button[type="submit"]');

        if (verifyButton) {
            simulateHumanClick(verifyButton);
            logger.log('✅ 验证按钮已点击', 'success');
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeScript);
    } else {
        initializeScript();
    }

})();
