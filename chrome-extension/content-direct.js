// AugmentCode自动注册 - Chrome插件版本
// 直接从油猴脚本转换，保持完全一致的逻辑

(function() {
    'use strict';

    // 自动化API配置 - 与油猴脚本完全一致
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

    // 全局状态跟踪，防止重复操作 - 与油猴脚本完全一致
    let copyOperationCompleted = false;
    let oauthPushCompleted = false;
    let subscriptionPageProcessed = false;
    let currentGeneratedEmail = null;

    // Chrome API 包装函数 - 替换油猴API
    const GM_xmlhttpRequest = function(config) {
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
                    const mockResponse = {
                        status: response.data.status,
                        statusText: response.data.statusText,
                        responseText: JSON.stringify(response.data.data),
                        response: response.data.data
                    };
                    if (config.onload) config.onload(mockResponse);
                    resolve(mockResponse);
                } else {
                    const error = new Error(response.error || 'Request failed');
                    if (config.onerror) config.onerror(error);
                    reject(error);
                }
            });
        });
    };

    const GM_setValue = function(key, value) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'setValue',
                key: key,
                value: value
            }, () => resolve());
        });
    };

    const GM_getValue = function(key, defaultValue = null) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'getValue',
                key: key
            }, (response) => {
                resolve(response.success ? (response.value || defaultValue) : defaultValue);
            });
        });
    };

    const GM_log = function(message) {
        console.log('[AugmentCode助手]', message);
    };

    // 重置操作状态（用于调试或重新开始流程）- 与油猴脚本完全一致
    function resetOperationStates() {
        copyOperationCompleted = false;
        oauthPushCompleted = false;
        subscriptionPageProcessed = false;
        currentGeneratedEmail = null;
        GM_setValue('augment_current_email', '');
        logger.log('🔄 操作状态已重置', 'info');
    }

    // 创建日志弹窗
    function createLogPopup() {
        // 检查是否已存在日志弹窗
        if (document.getElementById('augment-log-popup')) {
            return;
        }

        const popup = document.createElement('div');
        popup.id = 'augment-log-popup';
        popup.innerHTML = `
            <div style="position: fixed; bottom: 20px; left: 20px; z-index: 10001; background: rgba(0,0,0,0.9); color: #00ff00; padding: 15px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); font-family: 'Courier New', monospace; width: 400px; max-height: 300px; overflow-y: auto; font-size: 12px; border: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                    <div style="font-weight: bold; color: #00ff00;">📋 AugmentCode 助手日志</div>
                    <div style="display: flex; gap: 5px;">
                        <button id="clear-log-btn" style="background: #ff4444; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px;">清空</button>
                        <button id="toggle-log-btn" style="background: #4444ff; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px;">隐藏</button>
                    </div>
                </div>
                <div id="log-content" style="white-space: pre-wrap; word-break: break-all; line-height: 1.4;"></div>
            </div>
        `;

        document.body.appendChild(popup);

        // 绑定按钮事件
        document.getElementById('clear-log-btn').onclick = () => {
            document.getElementById('log-content').innerHTML = '';
        };

        let isHidden = false;
        const logContainer = popup.querySelector('div');
        document.getElementById('toggle-log-btn').onclick = () => {
            if (isHidden) {
                logContainer.style.display = 'block';
                document.getElementById('toggle-log-btn').textContent = '隐藏';
                isHidden = false;
            } else {
                logContainer.style.display = 'none';
                document.getElementById('toggle-log-btn').textContent = '显示';
                isHidden = true;
            }
        };
    }

    // 添加日志到弹窗
    function addLogToPopup(message, level = 'info') {
        const logContent = document.getElementById('log-content');
        if (!logContent) return;

        const timestamp = new Date().toLocaleTimeString();
        let color = '#00ff00'; // 默认绿色
        let icon = 'ℹ️';

        switch(level) {
            case 'error':
                color = '#ff4444';
                icon = '❌';
                break;
            case 'warning':
                color = '#ffaa00';
                icon = '⚠️';
                break;
            case 'success':
                color = '#44ff44';
                icon = '✅';
                break;
            case 'info':
                color = '#4488ff';
                icon = 'ℹ️';
                break;
        }

        const logEntry = document.createElement('div');
        logEntry.style.color = color;
        logEntry.style.marginBottom = '2px';
        logEntry.innerHTML = `[${timestamp}] ${icon} ${message}`;

        logContent.appendChild(logEntry);

        // 自动滚动到底部
        logContent.scrollTop = logContent.scrollHeight;

        // 限制日志条数，避免内存占用过多
        const logEntries = logContent.children;
        if (logEntries.length > 100) {
            logContent.removeChild(logEntries[0]);
        }
    }

    // 日志系统 - 增强版，同时输出到控制台和弹窗
    const logger = {
        log: function(message, level = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${timestamp}]`;

            // 输出到控制台
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

            // 输出到弹窗
            addLogToPopup(message, level);
        }
    };

    // 等待元素出现 - 与油猴脚本完全一致
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    // 模拟人类点击 - 与油猴脚本完全一致
    async function simulateHumanClick(element) {
        // 模拟鼠标移动到元素上
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

        // 模拟鼠标按下
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));

        // 模拟鼠标释放和点击
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // 在事件之间添加小延迟
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
    }

    // 模拟人类输入 - 与油猴脚本完全一致
    async function simulateHumanInput(element, text) {
        element.focus();
        element.value = '';

        for (let i = 0; i < text.length; i++) {
            element.value += text[i];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));
    }

    // 从API获取可用邮箱 - 与油猴脚本完全一致
    async function generateEmail() {
        return new Promise((resolve, reject) => {
            logger.log('🔍 正在从API获取可用邮箱...', 'info');
            const url = `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getAvailableMailboxes}&limit=1`;
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: {
                    "Authorization": `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.success && data.data && data.data.mailboxes && data.data.mailboxes.length > 0) {
                            const email = data.data.mailboxes[0].email;
                            logger.log('✅ 获取到可用邮箱: ' + email, 'success');
                            resolve(email);
                        } else {
                            logger.log('❌ API返回格式错误或无可用邮箱', 'error');
                            reject(new Error('无可用邮箱'));
                        }
                    } catch (error) {
                        logger.log('❌ 解析API响应失败: ' + error.message, 'error');
                        reject(error);
                    }
                },
                onerror: function(error) {
                    logger.log('❌ API请求失败: ' + error.message, 'error');
                    reject(error);
                }
            });
        });
    }

    // 获取验证码 - 与油猴脚本完全一致
    async function getVerificationCode(email) {
        return new Promise((resolve, reject) => {
            logger.log('🔐 正在获取验证码: ' + email, 'info');
            const url = `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getVerificationCodes}&email=${encodeURIComponent(email)}`;
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: {
                    "Authorization": `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.success && data.data && data.data.verificationCodes && data.data.verificationCodes.length > 0) {
                            const code = data.data.verificationCodes[0].code;
                            logger.log('✅ 获取到验证码: ' + code, 'success');
                            resolve(code);
                        } else {
                            reject(new Error('暂无验证码'));
                        }
                    } catch (error) {
                        logger.log('❌ 解析验证码响应失败: ' + error.message, 'error');
                        reject(error);
                    }
                },
                onerror: function(error) {
                    logger.log('❌ 获取验证码失败: ' + error.message, 'error');
                    reject(error);
                }
            });
        });
    }

    // 标记邮箱为已注册 - 与油猴脚本完全一致
    async function markEmailAsRegistered(email, viewUsageLink = null) {
        return new Promise((resolve, reject) => {
            logger.log('📝 标记邮箱为已注册: ' + email, 'info');

            const requestData = {
                action: "mark-registered",
                email: email,
                registeredAt: new Date().toISOString()
            };

            if (viewUsageLink) {
                requestData.viewUsageLink = viewUsageLink;
                logger.log('🔗 包含 View usage 链接: ' + viewUsageLink, 'info');
            }

            GM_xmlhttpRequest({
                method: "POST",
                url: `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.markRegistered}`,
                headers: {
                    "Authorization": `Bearer ${AUTOMATION_API_CONFIG.apiToken}`,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(requestData),
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.success) {
                            logger.log('✅ 邮箱状态更新成功', 'success');
                            resolve(true);
                        } else {
                            logger.log('❌ 邮箱状态更新失败: ' + (data.error || '未知错误'), 'error');
                            reject(new Error(data.error || '更新失败'));
                        }
                    } catch (error) {
                        logger.log('❌ 解析更新响应失败: ' + error.message, 'error');
                        reject(error);
                    }
                },
                onerror: function(error) {
                    logger.log('❌ 更新请求失败: ' + error.message, 'error');
                    reject(error);
                }
            });
        });
    }

    // 发送授权数据到后端OAuth回调接口 - 与油猴脚本完全一致
    async function sendToBackendOAuth(jsonText) {
        return new Promise((resolve, reject) => {
        try {
            // 检查是否已经推送过
            if (oauthPushCompleted) {
                logger.log('⏭️ OAuth推送已完成，跳过重复执行', 'info');
                resolve({ status: 'already_completed' });
                return;
            }

            logger.log('🚀 开始发送授权数据到后端...', 'info');
            logger.log('📋 原始JSON数据: ' + jsonText, 'info');

            // 解析JSON数据
            const parsed = JSON.parse(jsonText);
            if (!parsed.code || !parsed.tenant_url) {
                throw new Error('JSON数据格式不正确，缺少必要字段');
            }

            // 构建回调数据
            const callbackData = {
                code: parsed.code,
                tenant_url: parsed.tenant_url,
                email: currentGeneratedEmail || 'unknown',
                timestamp: new Date().toISOString()
            };

            logger.log('📤 准备发送的回调数据: ' + JSON.stringify(callbackData), 'info');

            GM_xmlhttpRequest({
                method: "POST",
                url: `${BACKEND_CONFIG.url}/oauth/callback`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${BACKEND_CONFIG.adminToken}`
                },
                data: JSON.stringify(callbackData),
                timeout: 30000,
                onload: function(response) {
                    logger.log('📡 收到后端响应，状态码: ' + response.status, 'info');
                    logger.log('📄 响应内容: ' + response.responseText, 'info');

                    if (response.status >= 200 && response.status < 300) {
                        logger.log('✅ OAuth数据推送成功！', 'success');
                        oauthPushCompleted = true;

                        // 标记邮箱为已注册
                        if (currentGeneratedEmail) {
                            markEmailAsRegistered(currentGeneratedEmail)
                                .then(() => {
                                    logger.log('✅ 注册流程完全完成！', 'success');
                                })
                                .catch(error => {
                                    logger.log('⚠️ 标记邮箱状态失败，但OAuth推送成功: ' + error.message, 'warning');
                                });
                        }

                        resolve({
                            status: 'success',
                            response: response.responseText
                        });
                    } else {
                        logger.log('❌ 后端返回错误状态: ' + response.status, 'error');
                        reject(new Error(`HTTP ${response.status}: ${response.responseText}`));
                    }
                },
                onerror: function(error) {
                    logger.log('❌ 网络请求失败: ' + error.toString(), 'error');
                    reject(new Error('网络请求失败: ' + error.toString()));
                }
            });

        } catch (error) {
            logger.log('❌ 发送OAuth数据失败: ' + error.message, 'error');
            reject(error);
        }
        });
    }

    // 复制JSON到剪贴板并发送到后端 - 与油猴脚本完全一致
    async function copyJsonToClipboard(jsonText) {
        try {
            await navigator.clipboard.writeText(jsonText);
            logger.log('📋 JSON数据已复制到剪贴板', 'success');

            // 发送到后端
            try {
                await sendToBackendOAuth(jsonText);
                logger.log('🎉 授权数据推送成功！', 'success');
            } catch (pushError) {
                logger.log('❌ 推送到后端失败: ' + pushError.message, 'error');
            }
        } catch (error) {
            logger.log('❌ 复制到剪贴板失败: ' + error.message, 'error');
        }
    }

    // 从订阅页面提取邮箱 - 与油猴脚本完全一致
    function extractEmailFromSubscriptionPage() {
        const emailSelectors = [
            'span[data-testid="user-email"]',
            '.user-email',
            '[data-email]',
            'span:contains("@")',
            'div:contains("@")'
        ];

        for (const selector of emailSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent || element.innerText || '';
                const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (emailMatch) {
                    return emailMatch[0];
                }
            }
        }

        // 如果没找到，尝试从页面所有文本中提取
        const pageText = document.body.innerText || document.body.textContent || '';
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
            return emailMatch[0];
        }

        logger.log('❌ 未能从页面提取到邮箱地址', 'error');
        return null;
    }

    // 从订阅页面提取View usage链接 - 与油猴脚本完全一致
    function extractViewUsageLinkFromSubscriptionPage() {
        const linkSelectors = [
            'a[href*="portal.orb.live"]',
            'a[href*="usage"]',
            'a:contains("View usage")',
            'a:contains("usage")'
        ];

        for (const selector of linkSelectors) {
            const element = document.querySelector(selector);
            if (element && element.href) {
                return element.href;
            }
        }

        logger.log('⚠️ 未能从页面提取到View usage链接', 'warning');
        return null;
    }

    // 填写邮箱 - 与油猴脚本完全一致
    async function fillEmail() {
        try {
            logger.log('📧 开始填写邮箱...', 'info');

            // 获取邮箱
            const email = await generateEmail();
            if (!email) {
                throw new Error('无法获取邮箱');
            }

            // 保存当前邮箱
            currentGeneratedEmail = email;
            await GM_setValue('augment_current_email', email);

            // 查找邮箱输入框
            const emailInput = document.querySelector('input[name="username"]') ||
                              document.querySelector('input[type="email"]');

            if (!emailInput) {
                throw new Error('未找到邮箱输入框');
            }

            // 填写邮箱
            await simulateHumanInput(emailInput, email);
            logger.log('✅ 邮箱填写完成: ' + email, 'success');

            // 查找并点击提交按钮
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

            const submitButton = Array.from(document.querySelectorAll('button')).find(btn =>
                                   btn.textContent.toLowerCase().includes('continue') ||
                                   btn.textContent.toLowerCase().includes('next') ||
                                   btn.textContent.toLowerCase().includes('submit')
                               ) || document.querySelector('button[type="submit"]');

            if (submitButton) {
                await simulateHumanClick(submitButton);
                logger.log('✅ 提交按钮已点击', 'success');
                return true;
            } else {
                throw new Error('未找到提交按钮');
            }

        } catch (error) {
            logger.log('❌ 填写邮箱失败: ' + error.message, 'error');
            return false;
        }
    }

    // 填写验证码 - 与油猴脚本完全一致
    async function fillVerificationCode() {
        try {
            logger.log('🔐 开始填写验证码...', 'info');

            // 获取当前邮箱
            const email = currentGeneratedEmail || await GM_getValue('augment_current_email');
            if (!email) {
                throw new Error('未找到当前邮箱');
            }

            // 等待验证码输入框出现
            logger.log('⏳ 等待验证码输入框出现...', 'info');
            let verificationInput = null;
            let attempts = 0;
            const maxAttempts = 30;

            while (!verificationInput && attempts < maxAttempts) {
                verificationInput = document.querySelector('input[name="code"]') ||
                                  document.querySelector('input[type="text"][placeholder*="code"]') ||
                                  document.querySelector('input[name*="code"]') ||
                                  document.querySelector('input[placeholder*="code"]') ||
                                  document.querySelector('input[type="text"][maxlength="6"]');

                if (!verificationInput) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
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
            const maxCodeAttempts = 60;

            while (!verificationCode && attempts < maxCodeAttempts) {
                try {
                    verificationCode = await getVerificationCode(email);
                    break;
                } catch (error) {
                    logger.log('⏳ 等待验证码... (' + (attempts + 1) + '/' + maxCodeAttempts + ')', 'info');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                }
            }

            if (!verificationCode) {
                throw new Error('获取验证码超时');
            }

            // 填写验证码
            await simulateHumanInput(verificationInput, verificationCode);
            logger.log('✅ 验证码填写完成: ' + verificationCode, 'success');

            // 等待一下再点击验证按钮
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

            // 查找并点击验证按钮
            const verifyButton = Array.from(document.querySelectorAll('button')).find(btn =>
                                   btn.textContent.toLowerCase().includes('verify') ||
                                   btn.textContent.toLowerCase().includes('submit')
                               ) || document.querySelector('button[type="submit"]');

            if (verifyButton) {
                await simulateHumanClick(verifyButton);
                logger.log('✅ 验证按钮已点击', 'success');
            }

            return true;

        } catch (error) {
            logger.log('❌ 填写验证码失败: ' + error.message, 'error');
            return false;
        }
    }

    // 处理服务条款页面 - 与油猴脚本完全一致
    async function handleTermsPage() {
        try {
            logger.log('📋 检测到服务条款页面，开始处理...', 'info');

            // 模拟阅读服务条款的时间
            logger.log('👀 模拟阅读服务条款...', 'info');
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

            // 查找复选框
            const checkbox = document.querySelector('input[type="checkbox"]');
            if (!checkbox) {
                throw new Error('未找到服务条款复选框');
            }

            // 如果复选框未勾选，则勾选它
            if (!checkbox.checked) {
                logger.log('☑️ 勾选服务条款复选框...', 'info');

                // 模拟鼠标悬停
                checkbox.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));

                // 点击复选框
                await simulateHumanClick(checkbox);
                await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
            }

            // 查找注册按钮
            let signupBtn = null;
            const buttons = document.querySelectorAll('button');
            for (const button of buttons) {
                const buttonText = button.textContent.toLowerCase();
                if (buttonText.includes('sign up and start coding') ||
                    buttonText.includes('sign up') ||
                    buttonText.includes('start coding')) {
                    signupBtn = button;
                    break;
                }
            }

            // 如果没找到特定文本的按钮，尝试找submit按钮
            if (!signupBtn) {
                signupBtn = document.querySelector('button[type="submit"]');
            }

            if (!signupBtn) {
                throw new Error('未找到注册按钮');
            }

            logger.log('🚀 点击注册按钮...', 'info');
            await simulateHumanClick(signupBtn);

            // 等待页面跳转
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 标记邮箱为已注册
            const email = currentGeneratedEmail || await GM_getValue('augment_current_email');
            if (email) {
                await markEmailAsRegistered(email);
                logger.log('🎉 注册完成！邮箱已标记为已注册: ' + email, 'success');
            }

            return true;

        } catch (error) {
            logger.log('❌ 处理服务条款失败: ' + error.message, 'error');
            return false;
        }
    }

    // 页面监控 - 与油猴脚本完全一致
    function startPageObserver() {
        let observer;
        let isProcessing = false;

        // 停止监控函数
        window.stopPageObserver = () => {
            if (observer) {
                observer.disconnect();
                logger.log('🛑 页面监控已停止', 'warning');
            }
        };

        observer = new MutationObserver(() => {
            if (isProcessing) return;

            const currentUrl = window.location.href;
            const currentPath = window.location.pathname;

            // 检查是否在登录/注册页面
            const isLoginPage = currentUrl.includes('augmentcode.com') &&
                               (currentPath.includes('/auth/') || currentPath.includes('/u/login/'));

            // 检查是否在服务条款页面
            const isTermsPage = currentUrl.includes('augmentcode.com') &&
                               (currentPath.includes('/terms-accept') || currentUrl.includes('terms-accept'));

            // 检查是否在订阅页面（注册成功）
            const isSubscriptionPage = currentUrl.includes('app.augmentcode.com/account/subscription');

            if (isLoginPage) {
                // 查找邮箱输入框
                const emailInput = document.querySelector('input[name="username"]') ||
                                  document.querySelector('input[type="email"]');

                // 查找验证码输入框
                const codeInput = document.querySelector('input[name="code"]');

                // 邮箱输入页面
                if (emailInput && !codeInput) {
                    const autoRegisterBtn = document.getElementById('auto-register-btn');
                    if (autoRegisterBtn && autoRegisterBtn.style.display !== 'block') {
                        autoRegisterBtn.style.display = 'block';
                        autoRegisterBtn.onclick = async () => {
                            isProcessing = true;
                            logger.log('🚀 开始自动注册流程...', 'info');
                            const success = await fillEmail();
                            if (!success) {
                                logger.log('❌ 邮箱填写失败', 'error');
                            }
                            isProcessing = false;
                        };
                    }
                }

                // 验证码输入页面
                if (codeInput && !isProcessing) {
                    isProcessing = true;
                    logger.log('📧 检测到验证码页面，开始自动填写验证码...', 'info');
                    setTimeout(async () => {
                        const success = await fillVerificationCode();
                        if (!success) {
                            logger.log('❌ 验证码填写失败', 'error');
                        }
                        isProcessing = false;
                    }, 2000);
                }
            }

            // 处理服务条款页面
            if (isTermsPage && !isProcessing) {
                const checkbox = document.querySelector('input[type="checkbox"]');
                // 查找包含特定文本的按钮
                let signupBtn = null;
                const buttons = document.querySelectorAll('button');
                for (const button of buttons) {
                    const buttonText = button.textContent.toLowerCase();
                    if (buttonText.includes('sign up') || buttonText.includes('start coding')) {
                        signupBtn = button;
                        break;
                    }
                }

                if (!signupBtn) {
                    signupBtn = document.querySelector('button[type="submit"]');
                }

                if (checkbox && signupBtn) {
                    isProcessing = true;
                    logger.log('📋 检测到服务条款页面，开始自动处理...', 'info');
                    setTimeout(async () => {
                        const success = await handleTermsPage();
                        if (!success) {
                            logger.log('❌ 服务条款处理失败', 'error');
                        }
                        isProcessing = false;
                    }, 1000);
                }
            }

            // 处理注册成功页面（订阅页面）
            if (isSubscriptionPage && !isProcessing && !subscriptionPageProcessed) {
                isProcessing = true;
                subscriptionPageProcessed = true;
                logger.log('🎉 检测到注册成功页面！开始处理后续操作...', 'success');

                setTimeout(async () => {
                    try {
                        // 尝试恢复邮箱地址
                        let emailToUpdate = currentGeneratedEmail;
                        if (!emailToUpdate) {
                            emailToUpdate = await GM_getValue('augment_current_email');
                            if (emailToUpdate) {
                                currentGeneratedEmail = emailToUpdate;
                            }
                        }

                        // 如果还是没有邮箱，尝试从页面提取
                        if (!emailToUpdate) {
                            logger.log('🔍 尝试从订阅页面提取邮箱地址...', 'info');
                            emailToUpdate = extractEmailFromSubscriptionPage();
                            if (emailToUpdate) {
                                logger.log('✅ 成功从页面提取邮箱: ' + emailToUpdate, 'success');
                                currentGeneratedEmail = emailToUpdate;
                                await GM_setValue('augment_current_email', emailToUpdate);
                            }
                        }

                        // 提取 View usage 链接
                        const viewUsageLink = extractViewUsageLinkFromSubscriptionPage();

                        // 调试信息
                        logger.log('🔍 页面监控 - 邮箱状态调试:', 'info');
                        logger.log('- currentGeneratedEmail: ' + (currentGeneratedEmail || '未设置'), 'info');
                        logger.log('- emailToUpdate: ' + (emailToUpdate || '未设置'), 'info');
                        logger.log('- viewUsageLink: ' + (viewUsageLink || '未设置'), 'info');

                        if (emailToUpdate) {
                            logger.log('📧 检测到注册成功的邮箱: ' + emailToUpdate, 'success');
                            await markEmailAsRegistered(emailToUpdate, viewUsageLink);
                            logger.log('🎉 注册流程完成！邮箱状态已更新', 'success');

                            // 清理存储
                            await GM_setValue('augment_current_email', null);
                            currentGeneratedEmail = null;
                        } else {
                            logger.log('⚠️ 未能从订阅页面提取到邮箱', 'warning');
                        }
                    } catch (error) {
                        logger.log('❌ 处理订阅页面失败: ' + error.message, 'error');
                    }
                    isProcessing = false;
                }, 2000);
            }

            // 检查订阅页面的JSON数据（OAuth处理）- 与油猴脚本完全一致
            if (currentUrl.includes('/account/subscription')) {
                const scriptTags = document.querySelectorAll('script');
                for (const script of scriptTags) {
                    const content = script.textContent || script.innerText;
                    if (content.includes('"code":') && content.includes('"tenant_url":')) {
                        const jsonMatch = content.match(/\{[^}]*"code"[^}]*"tenant_url"[^}]*\}/);
                        if (jsonMatch) {
                            const jsonText = jsonMatch[0];
                            logger.log('🎯 检测到授权数据: ' + jsonText, 'success');
                            copyJsonToClipboard(jsonText);
                            break;
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        logger.log('👀 页面监控已启动', 'info');
    }

    // 创建控制面板和日志弹窗 - 增强版
    function createControlPanel() {
        // 检查是否已存在控制面板
        if (document.getElementById('augment-control-panel')) {
            return;
        }

        // 创建日志弹窗
        createLogPopup();

        const panel = document.createElement('div');
        panel.id = 'augment-control-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-width: 280px;">
                <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">🤖 AugmentCode 助手</div>
                <button id="auto-register-btn" style="display: none; width: 100%; padding: 8px; margin: 5px 0; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">🚀 开始自动注册</button>
                <button id="reset-states-btn" style="width: 100%; padding: 8px; margin: 5px 0; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">🔄 重置状态</button>
                <div id="status-display" style="margin-top: 10px; font-size: 11px; opacity: 0.9;">
                    <div>状态: 已就绪 | 日志弹窗已启用</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 绑定重置按钮事件
        document.getElementById('reset-states-btn').onclick = resetOperationStates;

        logger.log('🎛️ 控制面板已创建', 'info');
        logger.log('📋 日志弹窗已启用，可在左下角查看实时日志', 'success');
    }

    // 紧急停止所有脚本活动 - 与油猴脚本完全一致
    window.emergencyStop = () => {
        copyOperationCompleted = true;
        oauthPushCompleted = true;
        if (window.stopPageObserver) {
            window.stopPageObserver();
        }
        logger.log('🚨 紧急停止：所有脚本活动已停止', 'warning');
    };

    // 主初始化函数 - 增强版，在所有页面显示日志弹窗
    async function initializeScript() {
        // 首先创建日志弹窗，在所有页面都显示
        createLogPopup();

        logger.log('🚀 AugmentCode 自动注册助手已启动 (Chrome插件版)', 'info');
        logger.log('📍 当前页面: ' + window.location.href, 'info');

        // 检查是否有之前保存的邮箱
        const savedEmail = await GM_getValue('augment_current_email');
        if (savedEmail) {
            logger.log('📧 发现之前保存的邮箱: ' + savedEmail, 'info');
            currentGeneratedEmail = savedEmail;
        }

        // 启动页面监控
        startPageObserver();

        // 页面加载完成后的初始检查
        setTimeout(() => {
            const currentUrl = window.location.href;
            const currentPath = window.location.pathname;

            logger.log('🔍 开始页面类型检测...', 'info');

            // 检查当前页面并执行相应逻辑
            if (currentUrl.includes('app.augmentcode.com/account/subscription')) {
                logger.log('📄 检测到订阅页面', 'success');
                // 订阅页面处理
                if (!subscriptionPageProcessed) {
                    subscriptionPageProcessed = true;
                    logger.log('🎉 检测到注册成功页面！开始处理后续操作...', 'success');

                    setTimeout(async () => {
                        try {
                            const email = extractEmailFromSubscriptionPage();
                            const viewUsageLink = extractViewUsageLinkFromSubscriptionPage();

                            if (email) {
                                logger.log('📧 检测到注册成功的邮箱: ' + email, 'success');
                                await markEmailAsRegistered(email, viewUsageLink);
                                logger.log('🎉 注册流程完成！邮箱状态已更新', 'success');

                                // 清理存储
                                await GM_setValue('augment_current_email', null);
                                currentGeneratedEmail = null;
                            } else {
                                logger.log('⚠️ 未能从订阅页面提取到邮箱', 'warning');
                            }
                        } catch (error) {
                            logger.log('❌ 处理订阅页面失败: ' + error.message, 'error');
                        }
                    }, 3000);
                } else {
                    logger.log('⚠️ 订阅页面已处理过，跳过重复处理', 'warning');
                }
            } else if (currentUrl.includes('augmentcode.com')) {
                logger.log('🏠 检测到AugmentCode主站页面', 'success');
                // 主站页面处理
                createControlPanel();
            } else {
                logger.log('❓ 未识别的页面类型', 'warning');
            }
        }, 2000);
    }

    // 页面加载完成后初始化 - 与油猴脚本完全一致
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeScript);
    } else {
        initializeScript();
    }

    logger.log('🚀 AugmentCode 自动注册助手已加载 (Chrome插件版)', 'success');

})();
