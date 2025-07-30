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
    let isProcessingTerms = false; // 防止重复处理服务条款

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
        isProcessingTerms = false;
        logger.log('🔄 操作状态已重置', 'info');
    }

    // 处理服务条款页面 - 从油猴脚本复制
    async function handleTermsPage() {
        logger.log('📋 检测到服务条款页面，开始处理...', 'info');

        // 模拟阅读页面的延迟
        logger.log('👀 模拟阅读服务条款...', 'info');
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

        // 查找服务条款复选框
        const checkbox = await waitForElement('input[type="checkbox"]', 5000);
        if (!checkbox) {
            logger.log('❌ 未找到服务条款复选框', 'error');
            return false;
        }

        // 勾选复选框
        if (!checkbox.checked) {
            logger.log('✅ 准备勾选服务条款同意框...', 'info');

            // 模拟鼠标悬停
            checkbox.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

            // 模拟人工点击
            simulateHumanClick(checkbox);
            logger.log('✅ 已勾选服务条款同意框', 'success');
        } else {
            logger.log('✅ 服务条款已经勾选', 'info');
        }

        // 等待一下确保勾选生效，模拟用户思考时间
        logger.log('🤔 等待页面响应...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

        // 查找并点击注册按钮
        let signupBtn = null;
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
            const buttonText = button.textContent.toLowerCase();
            if (buttonText.includes('sign up and start coding') ||
                buttonText.includes('start coding') ||
                buttonText.includes('sign up')) {
                signupBtn = button;
                break;
            }
        }

        if (!signupBtn) {
            signupBtn = document.querySelector('button[type="submit"]');
        }

        if (signupBtn) {
            logger.log('✅ 找到注册按钮，准备点击', 'info');

            // 模拟鼠标悬停
            signupBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

            // 模拟人工点击
            simulateHumanClick(signupBtn);
            logger.log('🎉 已点击注册按钮，完成注册流程！', 'success');

            // 标记邮箱为已注册
            if (currentGeneratedEmail) {
                await markEmailAsRegistered(currentGeneratedEmail);
            }

            return true;
        } else {
            logger.log('❌ 未找到注册按钮', 'error');
            return false;
        }
    }

    // 暴露到全局，方便调试
    window.resetAugmentStates = resetOperationStates;
    window.handleTermsPage = handleTermsPage;

    // 测试验证码获取
    window.testGetVerificationCode = async function(email) {
        if (!email) {
            const savedEmail = await ChromeAPI.getValue('current_email');
            email = savedEmail || prompt('请输入邮箱地址:');
        }

        if (!email) {
            logger.log('❌ 未提供邮箱地址', 'error');
            return;
        }

        logger.log('🧪 开始测试验证码获取...', 'info');
        logger.log('📧 使用邮箱: ' + email, 'info');

        try {
            const code = await getVerificationCode(email);
            logger.log('✅ 测试成功！获取到验证码: ' + code, 'success');
            return code;
        } catch (error) {
            logger.log('❌ 测试失败: ' + error.message, 'error');
            return null;
        }
    };

    // 调试页面输入框
    window.debugPageInputs = function() {
        logger.log('🔍 调试当前页面的输入框...', 'info');
        logger.log('📍 当前页面URL: ' + window.location.href, 'info');

        const allInputs = document.querySelectorAll('input');
        logger.log('📊 页面总输入框数量: ' + allInputs.length, 'info');

        allInputs.forEach((input, index) => {
            const info = {
                index: index,
                type: input.type,
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                className: input.className
            };
            logger.log(`📝 输入框 ${index}: ` + JSON.stringify(info), 'info');
        });

        // 测试各种选择器
        const selectors = [
            'input[name="username"]',
            'input[type="email"]',
            'input[name*="email"]',
            'input[placeholder*="email"]',
            'input[name="code"]'
        ];

        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            logger.log(`🎯 选择器 "${selector}": ` + (element ? '找到' : '未找到'), element ? 'success' : 'warning');
        });
    };

    // 测试API连接
    window.testAPIConnection = async function() {
        logger.log('🧪 开始测试API连接...', 'info');
        try {
            const requestUrl = `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getAvailableMailboxes}`;
            logger.log('🔗 测试URL: ' + requestUrl, 'info');

            const response = await ChromeAPI.xmlhttpRequest({
                method: 'GET',
                url: requestUrl,
                headers: {
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                }
            });

            logger.log('✅ API连接成功！', 'success');
            logger.log('📥 完整响应: ' + JSON.stringify(response, null, 2), 'info');
            logger.log('📊 API数据: ' + JSON.stringify(response.response, null, 2), 'info');
            return response;
        } catch (error) {
            logger.log('❌ API连接失败: ' + error.message, 'error');
            logger.log('🔍 错误详情: ' + JSON.stringify(error, null, 2), 'error');
            throw error;
        }
    };

    // 测试邮箱获取功能（根据页面类型使用不同方法）
    window.testExtractEmail = async function() {
        logger.log('🧪 开始测试邮箱获取功能...', 'info');
        logger.log('📍 当前页面URL: ' + window.location.href, 'info');

        const currentUrl = window.location.href;
        const isSubscriptionPage = currentUrl.includes('app.augmentcode.com/account/subscription');
        const isLoginPage = currentUrl.includes('augmentcode.com') &&
                           (currentUrl.includes('/auth/') || currentUrl.includes('/u/login/'));

        if (isSubscriptionPage) {
            // 订阅页面：从页面提取邮箱
            logger.log('📄 检测到订阅页面，尝试从页面提取邮箱...', 'info');
            const extractedEmail = extractEmailFromSubscriptionPage();
            if (extractedEmail) {
                logger.log('✅ 测试成功！从页面提取到邮箱: ' + extractedEmail, 'success');
                return extractedEmail;
            } else {
                logger.log('❌ 测试失败！未能从页面提取到邮箱', 'error');
                return null;
            }
        } else if (isLoginPage) {
            // 注册页面：通过API获取邮箱
            logger.log('🔐 检测到注册页面，尝试通过API获取邮箱...', 'info');
            try {
                const apiEmail = await getAvailableMailbox();
                if (apiEmail && apiEmail.email) {
                    logger.log('✅ 测试成功！通过API获取到邮箱: ' + apiEmail.email, 'success');
                    return apiEmail.email;
                } else {
                    logger.log('❌ 测试失败！API未返回有效邮箱', 'error');
                    return null;
                }
            } catch (error) {
                logger.log('❌ 测试失败！API请求出错: ' + error.message, 'error');
                return null;
            }
        } else {
            logger.log('⚠️ 当前页面不是注册页面或订阅页面', 'warning');
            logger.log('💡 请在注册页面测试API获取邮箱，或在订阅页面测试页面提取邮箱', 'info');
            return null;
        }
    };

    // 测试 View usage 链接提取功能
    window.testExtractViewUsageLink = function() {
        logger.log('🧪 开始测试 View usage 链接提取功能...', 'info');
        logger.log('📍 当前页面URL: ' + window.location.href, 'info');

        const currentUrl = window.location.href;
        const isSubscriptionPage = currentUrl.includes('app.augmentcode.com/account/subscription');

        if (isSubscriptionPage) {
            logger.log('📄 检测到订阅页面，尝试提取 View usage 链接...', 'info');
            const extractedLink = extractViewUsageLinkFromSubscriptionPage();
            if (extractedLink) {
                logger.log('✅ 测试成功！提取到 View usage 链接: ' + extractedLink, 'success');
                return extractedLink;
            } else {
                logger.log('❌ 测试失败！未能提取到 View usage 链接', 'error');
                return null;
            }
        } else {
            logger.log('⚠️ 当前页面不是订阅页面', 'warning');
            logger.log('💡 请在订阅页面 (app.augmentcode.com/account/subscription) 测试此功能', 'info');
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

        // 检查页面类型并自动处理
        checkPageTypeAndAutoHandle();

        // 监听页面变化
        setupPageChangeListener();
    }

    // 检查页面类型并自动处理
    function checkPageTypeAndAutoHandle() {
        const currentUrl = window.location.href;
        const currentPath = window.location.pathname;

        // 检查是否在服务条款页面
        const isTermsPage = currentUrl.includes('augmentcode.com') &&
                           (currentPath.includes('/terms-accept') || currentUrl.includes('terms-accept'));

        const emailInput = document.querySelector('input[name="username"]') ||
                          document.querySelector('input[type="email"]');
        const codeInput = document.querySelector('input[name="code"]');
        const checkbox = document.querySelector('input[type="checkbox"]');

        if (isTermsPage && checkbox && !isProcessingTerms) {
            logger.log('📋 检测到服务条款页面', 'info');
            isProcessingTerms = true;
            // 显示处理按钮或自动处理
            setTimeout(async () => {
                logger.log('🚀 开始自动处理服务条款...', 'info');
                const success = await handleTermsPage();
                if (!success) {
                    logger.log('❌ 服务条款处理失败', 'error');
                }
                isProcessingTerms = false;
            }, 2000);
        } else if (emailInput && !codeInput) {
            logger.log('📝 检测到邮箱输入页面', 'info');
        } else if (codeInput) {
            logger.log('📧 检测到验证码输入页面', 'info');
            // 自动填写验证码（如果有保存的邮箱）
            autoFillVerificationCodeIfNeeded();
        }
    }

    // 设置页面变化监听器
    let lastCheckTime = 0;
    function setupPageChangeListener() {
        // 监听DOM变化
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });

            if (shouldCheck) {
                const now = Date.now();
                // 防止频繁触发，至少间隔3秒
                if (now - lastCheckTime > 3000) {
                    lastCheckTime = now;
                    setTimeout(() => {
                        checkPageTypeAndAutoHandle();
                    }, 1000);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 自动填写验证码（如果需要）
    async function autoFillVerificationCodeIfNeeded() {
        // 检查是否有保存的邮箱
        const savedEmail = await ChromeAPI.getValue('current_email');
        if (!savedEmail) {
            logger.log('⚠️ 未找到保存的邮箱，无法自动获取验证码', 'warning');
            return;
        }

        // 检查是否已经在处理中
        const isProcessing = await ChromeAPI.getValue('is_processing_verification');
        if (isProcessing) {
            logger.log('⏳ 验证码处理中，跳过重复处理', 'info');
            return;
        }

        logger.log('🔄 开始自动填写验证码...', 'info');
        await ChromeAPI.setValue('is_processing_verification', true);

        try {
            await waitAndFillVerificationCode(savedEmail);
        } catch (error) {
            logger.log('❌ 自动验证码填写失败: ' + error.message, 'error');
        } finally {
            await ChromeAPI.setValue('is_processing_verification', false);
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
            const requestUrl = `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getAvailableMailboxes}`;
            logger.log('🔗 请求URL: ' + requestUrl, 'info');

            const response = await ChromeAPI.xmlhttpRequest({
                method: 'GET',
                url: requestUrl,
                headers: {
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                }
            });

            logger.log('📥 API响应: ' + JSON.stringify(response, null, 2), 'info');

            // Chrome插件返回的是模拟油猴格式：response.response 包含实际数据
            const apiData = response.response;
            logger.log('📊 API数据: ' + JSON.stringify(apiData, null, 2), 'info');

            if (apiData && apiData.success && apiData.data && apiData.data.mailboxes && apiData.data.mailboxes.length > 0) {
                const mailbox = apiData.data.mailboxes[0]; // 取第一个可用邮箱
                logger.log('✅ 获取到可用邮箱: ' + mailbox.email, 'success');
                return mailbox;
            } else {
                logger.log('❌ API响应格式错误或无可用邮箱', 'error');
                logger.log('📊 响应数据: ' + JSON.stringify(apiData, null, 2), 'error');
                throw new Error(apiData?.error || '获取邮箱失败');
            }
        } catch (error) {
            logger.log('❌ 获取可用邮箱失败: ' + error.message, 'error');
            logger.log('🔍 错误详情: ' + JSON.stringify(error, null, 2), 'error');
            throw error;
        }
    }

    // 获取验证码
    async function getVerificationCode(email) {
        logger.log('🔐 正在获取验证码: ' + email, 'info');

        try {
            const response = await ChromeAPI.xmlhttpRequest({
                method: 'GET',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getVerificationCodes}&email=${encodeURIComponent(email)}`,
                headers: {
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                }
            });

            // Chrome插件返回的是模拟油猴格式：response.response 包含实际数据
            const apiData = response.response;
            if (apiData && apiData.success && apiData.data) {
                const codes = apiData.data.verificationCodes;
                if (codes && codes.length > 0) {
                    logger.log('✅ 获取到验证码: ' + codes[0].code, 'success');
                    return codes[0].code;
                } else {
                    throw new Error('暂无验证码');
                }
            } else {
                throw new Error(apiData?.error || '获取验证码失败');
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

            // Chrome插件返回的是模拟油猴格式：response.response 包含实际数据
            const apiData = response.response;
            if (apiData && apiData.success) {
                logger.log('✅ 邮箱状态已更新为已注册', 'success');
                return true;
            } else {
                throw new Error(apiData?.error || '更新状态失败');
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
                method: 'GET',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getAvailableMailboxes}`,
                headers: {
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                }
            });

            // Chrome插件返回的是模拟油猴格式：response.response 包含实际数据
            const apiData = response.response;
            if (apiData && apiData.success && apiData.data && apiData.data.mailboxes && apiData.data.mailboxes.length > 0) {
                const mailbox = apiData.data.mailboxes[0]; // 取第一个可用邮箱
                logger.log('✅ 获取到可用邮箱: ' + mailbox.email, 'success');
                return mailbox;
            } else {
                throw new Error(apiData?.error || '获取邮箱失败');
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
                method: 'GET',
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getVerificationCodes}&email=${encodeURIComponent(email)}`,
                headers: {
                    'Authorization': `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                }
            });

            // Chrome插件返回的是模拟油猴格式：response.response 包含实际数据
            const apiData = response.response;
            if (apiData && apiData.success && apiData.data) {
                const codes = apiData.data.verificationCodes;
                if (codes && codes.length > 0) {
                    logger.log('✅ 获取到验证码: ' + codes[0].code, 'success');
                    return codes[0].code;
                } else {
                    throw new Error('暂无验证码');
                }
            } else {
                throw new Error(apiData?.error || '获取验证码失败');
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

            // Chrome插件返回的是模拟油猴格式：response.response 包含实际数据
            const apiData = response.response;
            if (apiData && apiData.success) {
                logger.log('✅ 邮箱状态已更新为已注册', 'success');
                return true;
            } else {
                throw new Error(apiData?.error || '更新状态失败');
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
            await ChromeAPI.setValue('current_email', mailbox.email);

            logger.log('📧 使用邮箱: ' + mailbox.email, 'info');

            // 2. 填写注册表单
            await fillRegistrationForm(mailbox.email);

            logger.log('✅ 邮箱填写完成！页面跳转后将自动填写验证码', 'success');

        } catch (error) {
            logger.log('❌ 自动注册失败: ' + error.message, 'error');
        }
    }

    // 填写注册表单
    async function fillRegistrationForm(email) {
        logger.log('📝 填写注册表单...', 'info');

        // 查找邮箱输入框（按照AugmentCode网站的实际结构）
        const emailInput = document.querySelector('input[name="username"]') ||
                          document.querySelector('input[type="email"]') ||
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
            verificationInput = document.querySelector('input[name="code"]') ||
                              document.querySelector('input[name*="code"]') ||
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
