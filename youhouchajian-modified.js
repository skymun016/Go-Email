// ==UserScript==
// @name         AugmentCode自动注册 (使用自有邮箱系统)
// @namespace    http://tampermonkey.net/
// @version      0.4.0
// @description  自动完成AugmentCode的注册流程，使用自有邮箱系统获取验证码
// @author       Your name
// @match        https://*.augmentcode.com/*
// @match        https://app.augmentcode.com/account/subscription
// @icon         https://www.google.com/s2/favicons?sz=64&domain=augmentcode.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @connect      gomail-app.amexiaowu.workers.dev
// @connect      api.amw.qzz.io
// ==/UserScript==

(function() {
    'use strict';

    // 自动化API配置 - 使用我们的邮箱系统
    const AUTOMATION_API_CONFIG = {
        baseUrl: "https://gomail-app.amexiaowu.workers.dev",
        apiToken: "gm_VS-Bg8f_nGaGDI-a9IWqMxZIw9wy50wQ", // 使用我们创建的API Token
        endpoints: {
            getAvailableMailboxes: "/api/automation?action=get-available-mailboxes",
            getVerificationCodes: "/api/automation?action=get-verification-codes",
            markRegistered: "/api/automation"
        }
    };

    // 后端配置 (保持原有的OAuth回调配置)
    const BACKEND_CONFIG = {
        url: "https://api.amw.qzz.io",
        adminToken: "krAPyH5MVK8uJUXsbO4nLrqEgRS5lEho3LjIiKjBMH6mXRLaU4kzmUPabrJN67cx"
    };

    // 全局状态跟踪
    let copyOperationCompleted = false;
    let oauthPushCompleted = false;
    let currentGeneratedEmail = null;

    // 重置操作状态
    function resetOperationStates() {
        copyOperationCompleted = false;
        oauthPushCompleted = false;
        currentGeneratedEmail = null;
        logger.log('🔄 操作状态已重置', 'info');
    }

    // 将重置函数暴露到全局
    window.resetAugmentStates = resetOperationStates;

    // 紧急停止所有脚本活动
    window.emergencyStop = () => {
        copyOperationCompleted = true;
        oauthPushCompleted = true;
        if (window.stopPageObserver) {
            window.stopPageObserver();
        }
        logger.log('🚨 紧急停止：所有脚本活动已停止', 'warning');
    };

    // 添加CSS动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes slideInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        #auto-register-log .log-entry {
            animation: slideInUp 0.3s ease-out;
        }

        #auto-register-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }

        #auto-register-btn:hover::before {
            left: 100%;
        }
    `;
    document.head.appendChild(style);

    // 颜色配置
    const COLORS = {
        primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        primarySolid: '#667eea',
        secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        secondarySolid: '#f093fb',
        success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        successSolid: '#4facfe',
        danger: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        dangerSolid: '#fa709a',
        warning: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        warningSolid: '#fcb69f',
        info: '#6c7b7f',
        light: '#f8f9fa',
        dark: '#2d3748',
        background: 'linear-gradient(135deg, rgba(45, 55, 72, 0.98) 0%, rgba(68, 90, 120, 0.95) 100%)',
        cardBg: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.12)',
        text: '#e2e8f0',
        textMuted: '#a0aec0'
    };

    // 日志UI配置
    const LOG_UI_CONFIG = {
        position: {
            bottom: 40,
            left: 20
        },
        dimensions: {
            width: 380,
            maxHeight: 500
        },
        animation: {
            duration: '0.4s',
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
    };

    // 创建日志UI
    function createLogUI() {
        const logContainer = document.createElement('div');
        logContainer.id = "auto-register-log";
        logContainer.style.cssText = `
            position: fixed;
            bottom: ${LOG_UI_CONFIG.position.bottom}px;
            left: ${LOG_UI_CONFIG.position.left}px;
            width: ${LOG_UI_CONFIG.dimensions.width}px;
            max-height: ${LOG_UI_CONFIG.dimensions.maxHeight}px;
            background: ${COLORS.background};
            border-radius: 16px;
            box-shadow:
                0 20px 40px rgba(0, 0, 0, 0.3),
                0 8px 16px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid ${COLORS.border};
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transform: translateY(0);
            transition: all ${LOG_UI_CONFIG.animation.duration} ${LOG_UI_CONFIG.animation.easing};
        `;

        logContainer.innerHTML = `
            <div style="
                padding: 18px 20px;
                background: ${COLORS.primary};
                color: white;
                font-weight: 700;
                font-size: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: none;
                position: relative;
                overflow: hidden;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="
                        display: inline-block;
                        width: 8px;
                        height: 8px;
                        background: #00ff88;
                        border-radius: 50%;
                        box-shadow: 0 0 10px #00ff88;
                        animation: pulse 2s infinite;
                    "></span>
                    <span>🚀 自动注册助手 (自有邮箱)</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button id="auto-register-btn" style="
                        background: ${COLORS.secondary};
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        padding: 8px 16px;
                        border-radius: 20px;
                        display: none;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);
                        position: relative;
                        overflow: hidden;
                    ">
                        <span style="position: relative; z-index: 1;">开始注册</span>
                    </button>
                    <button id="clear-log" style="
                        background: ${COLORS.cardBg};
                        border: 1px solid ${COLORS.border};
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                        padding: 8px 12px;
                        border-radius: 8px;
                        transition: all 0.3s ease;
                        backdrop-filter: blur(10px);
                    ">🗑️</button>
                    <button id="minimize-log" style="
                        background: ${COLORS.cardBg};
                        border: 1px solid ${COLORS.border};
                        color: white;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        padding: 8px 12px;
                        border-radius: 8px;
                        transition: all 0.3s ease;
                        backdrop-filter: blur(10px);
                    ">−</button>
                </div>
            </div>
            <div style="
                padding: 12px 20px;
                background: ${COLORS.cardBg};
                border-bottom: 1px solid ${COLORS.border};
                font-size: 13px;
                color: ${COLORS.textMuted};
                display: flex;
                align-items: center;
                justify-content: space-between;
                backdrop-filter: blur(10px);
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="
                        font-size: 16px;
                        filter: drop-shadow(0 0 4px currentColor);
                    ">📧</span>
                    <span style="font-weight: 500;">使用自有邮箱系统</span>
                </div>
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: ${COLORS.textMuted};
                ">
                    <span style="
                        width: 6px;
                        height: 6px;
                        background: ${COLORS.successSolid};
                        border-radius: 50%;
                        display: inline-block;
                        animation: pulse 2s infinite;
                    "></span>
                    <span>在线</span>
                </div>
            </div>
            <div id="log-content" style="
                padding: 20px;
                overflow-y: auto;
                max-height: calc(${LOG_UI_CONFIG.dimensions.maxHeight}px - 160px);
                font-size: 13px;
                color: ${COLORS.text};
                line-height: 1.6;
                background: rgba(0, 0, 0, 0.1);
                scrollbar-width: thin;
                scrollbar-color: ${COLORS.border} transparent;
            "></div>
        `;

        document.body.appendChild(logContainer);

        // 最小化功能
        let isMinimized = false;
        const logContent = document.getElementById('log-content');
        const minimizeBtn = document.getElementById('minimize-log');

        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            logContent.style.display = isMinimized ? 'none' : 'block';
            minimizeBtn.textContent = isMinimized ? '□' : '−';
            logContainer.style.transform = isMinimized ? 'scale(0.95)' : 'scale(1)';
        });

        // 清除日志功能
        const clearBtn = document.getElementById('clear-log');
        clearBtn.addEventListener('click', () => {
            logContent.innerHTML = '';
            log('日志已清除', 'info');
        });

        return {
            log: function(message, type = 'info') {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.style.marginBottom = '12px';
                logEntry.style.padding = '14px 16px';
                logEntry.style.borderRadius = '10px';
                logEntry.style.wordBreak = 'break-word';
                logEntry.style.transition = 'all 0.3s ease';
                logEntry.style.border = '1px solid transparent';

                let bgColor, textColor, borderColor, icon;

                switch(type) {
                    case 'success':
                        bgColor = 'rgba(79, 172, 254, 0.15)';
                        textColor = COLORS.successSolid;
                        borderColor = 'rgba(79, 172, 254, 0.3)';
                        icon = '✅';
                        break;
                    case 'error':
                        bgColor = 'rgba(250, 112, 154, 0.15)';
                        textColor = COLORS.dangerSolid;
                        borderColor = 'rgba(250, 112, 154, 0.3)';
                        icon = '❌';
                        break;
                    case 'warning':
                        bgColor = 'rgba(252, 182, 159, 0.15)';
                        textColor = COLORS.warningSolid;
                        borderColor = 'rgba(252, 182, 159, 0.3)';
                        icon = '⚠️';
                        break;
                    default:
                        bgColor = COLORS.cardBg;
                        textColor = COLORS.text;
                        borderColor = COLORS.border;
                        icon = 'ℹ️';
                }

                logEntry.style.backgroundColor = bgColor;
                logEntry.style.color = textColor;
                logEntry.style.borderColor = borderColor;

                const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' });
                logEntry.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span style="font-size: 14px; margin-top: 1px;">${icon}</span>
                        <div style="flex: 1;">
                            <div style="font-size: 11px; color: ${COLORS.textMuted}; margin-bottom: 4px;">${time}</div>
                            <div style="font-weight: 500; line-height: 1.4;">${message}</div>
                        </div>
                    </div>
                `;

                logContent.appendChild(logEntry);
                logContent.scrollTop = logContent.scrollHeight;
            }
        };
    }

    // 创建全局日志对象
    const logger = createLogUI();

    // 等待元素出现
    async function waitForElement(selector, timeout = 10000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
    }

    // 从我们的API获取可用邮箱
    async function getAvailableEmail() {
        return new Promise((resolve, reject) => {
            logger.log('🔍 正在从API获取可用邮箱...', 'info');

            const url = `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getAvailableMailboxes}&limit=1`;

            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: {
                    "Authorization": `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                timeout: 30000,
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.success && result.data.mailboxes && result.data.mailboxes.length > 0) {
                            const email = result.data.mailboxes[0].email;
                            logger.log(`✅ 成功获取邮箱: ${email}`, 'success');
                            resolve(email);
                        } else {
                            logger.log('❌ 没有可用的邮箱', 'error');
                            reject(new Error('没有可用的邮箱'));
                        }
                    } catch (error) {
                        logger.log('❌ 解析API响应失败: ' + error.message, 'error');
                        reject(error);
                    }
                },
                onerror: function(error) {
                    logger.log('❌ API请求失败: ' + error.toString(), 'error');
                    reject(new Error('API请求失败'));
                },
                ontimeout: function() {
                    logger.log('❌ API请求超时', 'error');
                    reject(new Error('API请求超时'));
                }
            });
        });
    }

    // 从我们的API获取验证码
    async function getVerificationCodeFromAPI(email) {
        return new Promise((resolve, reject) => {
            logger.log(`🔍 正在从API获取邮箱 ${email} 的验证码...`, 'info');

            const url = `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.getVerificationCodes}&email=${encodeURIComponent(email)}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: {
                    "Authorization": `Bearer ${AUTOMATION_API_CONFIG.apiToken}`
                },
                timeout: 30000,
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.success && result.data.verificationCodes && result.data.verificationCodes.length > 0) {
                            const code = result.data.verificationCodes[0].code;
                            logger.log(`✅ 成功获取验证码: ${code}`, 'success');
                            resolve(code);
                        } else {
                            logger.log('⚠️ 暂未收到验证码邮件', 'warning');
                            resolve(null);
                        }
                    } catch (error) {
                        logger.log('❌ 解析API响应失败: ' + error.message, 'error');
                        reject(error);
                    }
                },
                onerror: function(error) {
                    logger.log('❌ API请求失败: ' + error.toString(), 'error');
                    reject(new Error('API请求失败'));
                },
                ontimeout: function() {
                    logger.log('❌ API请求超时', 'error');
                    reject(new Error('API请求超时'));
                }
            });
        });
    }

    // 获取验证码（带重试机制）
    async function getVerificationCode(email, maxRetries = 6, retryInterval = 5000) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            logger.log(`尝试获取验证码 (第 ${attempt + 1}/${maxRetries} 次)...`);

            try {
                const code = await getVerificationCodeFromAPI(email);
                if (code) {
                    logger.log("成功获取验证码: " + code, 'success');
                    return code;
                }

                if (attempt < maxRetries - 1) {
                    logger.log(`未获取到验证码，${retryInterval/1000}秒后重试...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                }
            } catch (error) {
                logger.log("获取验证码出错: " + error, 'error');
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                }
            }
        }

        throw new Error(`经过 ${maxRetries} 次尝试后仍未获取到验证码。`);
    }

    // 标记邮箱为已注册
    async function markEmailAsRegistered(email) {
        return new Promise((resolve, reject) => {
            logger.log(`📝 正在标记邮箱 ${email} 为已注册...`, 'info');

            const url = `${AUTOMATION_API_CONFIG.baseUrl}${AUTOMATION_API_CONFIG.endpoints.markRegistered}`;
            const formData = `action=mark-registered&email=${encodeURIComponent(email)}`;

            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: {
                    "Authorization": `Bearer ${AUTOMATION_API_CONFIG.apiToken}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: formData,
                timeout: 30000,
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.success) {
                            logger.log(`✅ 邮箱 ${email} 已成功标记为已注册`, 'success');
                            resolve(result);
                        } else {
                            logger.log('❌ 标记邮箱状态失败: ' + result.error, 'error');
                            reject(new Error(result.error));
                        }
                    } catch (error) {
                        logger.log('❌ 解析API响应失败: ' + error.message, 'error');
                        reject(error);
                    }
                },
                onerror: function(error) {
                    logger.log('❌ API请求失败: ' + error.toString(), 'error');
                    reject(new Error('API请求失败'));
                },
                ontimeout: function() {
                    logger.log('❌ API请求超时', 'error');
                    reject(new Error('API请求超时'));
                }
            });
        });
    }

    // 自动填写邮箱并提交
    async function fillEmail() {
        try {
            const email = await getAvailableEmail();
            // 保存生成的邮箱到全局变量
            currentGeneratedEmail = email;
            logger.log('使用邮箱: ' + email);
            logger.log('📧 邮箱已保存，将用于后续OAuth推送', 'info');

            // 使用多种选择器查找邮箱输入框
            const emailSelectors = [
                'input[name="username"]',
                'input[type="email"]',
                'input[placeholder*="email" i]',
                'input[placeholder*="邮箱" i]',
                'input[id*="email" i]',
                'input[class*="email" i]'
            ];

            let emailInput = null;
            for (const selector of emailSelectors) {
                emailInput = document.querySelector(selector);
                if (emailInput) {
                    logger.log('✅ 找到邮箱输入框: ' + selector, 'success');
                    break;
                }
            }

            if (!emailInput) {
                logger.log('未找到邮箱输入框', 'error');
                return false;
            }

            logger.log('找到邮箱输入框，开始填写');

            // 填写邮箱
            emailInput.value = email;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));

            // 查找提交按钮 - 使用多种选择器
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:contains("Continue")',
                'button:contains("继续")',
                'button:contains("下一步")',
                '.btn-primary',
                '.submit-btn'
            ];

            let continueBtn = null;
            for (const selector of submitSelectors) {
                continueBtn = document.querySelector(selector);
                if (continueBtn) {
                    logger.log('✅ 找到提交按钮: ' + selector, 'success');
                    break;
                }
            }

            if (!continueBtn) {
                logger.log('未找到继续按钮', 'error');
                return false;
            }

            logger.log('点击继续按钮');
            continueBtn.click();
            return true;
        } catch (error) {
            logger.log('填写邮箱失败: ' + error.message, 'error');
            return false;
        }
    }

    // 自动填写验证码
    async function fillVerificationCode() {
        if (!currentGeneratedEmail) {
            logger.log('❌ 没有可用的邮箱地址', 'error');
            return false;
        }

        try {
            logger.log('开始获取验证码...');
            const code = await getVerificationCode(currentGeneratedEmail);

            // 使用多种选择器查找验证码输入框
            const codeSelectors = [
                'input[name="code"]',
                'input[placeholder*="code" i]',
                'input[placeholder*="验证码" i]',
                'input[id*="code" i]',
                'input[class*="code" i]'
            ];

            let codeInput = null;
            for (const selector of codeSelectors) {
                codeInput = document.querySelector(selector);
                if (codeInput) {
                    logger.log('✅ 找到验证码输入框: ' + selector, 'success');
                    break;
                }
            }

            if (!codeInput) {
                logger.log('未找到验证码输入框', 'error');
                return false;
            }

            logger.log('找到验证码输入框，开始填写');

            // 填写验证码
            codeInput.value = code;
            codeInput.dispatchEvent(new Event('input', { bubbles: true }));
            codeInput.dispatchEvent(new Event('change', { bubbles: true }));

            // 查找验证按钮
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:contains("Verify")',
                'button:contains("验证")',
                'button:contains("确认")',
                '.btn-primary',
                '.verify-btn'
            ];

            let verifyBtn = null;
            for (const selector of submitSelectors) {
                verifyBtn = document.querySelector(selector);
                if (verifyBtn) {
                    logger.log('✅ 找到验证按钮: ' + selector, 'success');
                    break;
                }
            }

            if (!verifyBtn) {
                logger.log('未找到验证按钮', 'error');
                return false;
            }

            logger.log('点击验证按钮');
            verifyBtn.click();
            return true;
        } catch (error) {
            logger.log('填写验证码失败: ' + error.message, 'error');
            return false;
        }
    }

    // 发送授权数据到后端OAuth回调接口
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
                logger.log('❌ JSON数据格式不正确，缺少必要字段', 'error');
                logger.log('📊 解析结果: ' + JSON.stringify(parsed), 'error');
                reject(new Error('JSON数据格式不正确'));
                return;
            }

            const callbackData = {
                code: parsed.code,
                state: parsed.state || null,
                tenant_url: parsed.tenant_url,
                email: currentGeneratedEmail || 'unknown@example.com'
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
                },
                ontimeout: function() {
                    logger.log('❌ 请求超时（30秒）', 'error');
                    reject(new Error('请求超时'));
                }
            });

        } catch (error) {
            logger.log('❌ 发送OAuth数据时发生错误: ' + error.message, 'error');
            reject(error);
        }
        });
    }

    // 复制JSON数据到剪贴板
    async function copyJsonToClipboard(jsonText) {
        if (copyOperationCompleted) {
            logger.log('⏭️ 复制操作已完成，跳过重复执行', 'info');
            return;
        }

        try {
            await navigator.clipboard.writeText(jsonText);
            logger.log('✅ JSON数据已复制到剪贴板', 'success');
            copyOperationCompleted = true;

            // 同时发送到后端
            try {
                await sendToBackendOAuth(jsonText);
            } catch (error) {
                logger.log('⚠️ 发送到后端失败，但数据已复制到剪贴板', 'warning');
            }
        } catch (error) {
            logger.log('❌ 复制到剪贴板失败: ' + error.message, 'error');
            // 如果复制失败，仍然尝试发送到后端
            try {
                await sendToBackendOAuth(jsonText);
            } catch (backendError) {
                logger.log('❌ 发送到后端也失败了', 'error');
            }
        }
    }

    // 页面监控和自动化逻辑
    function startPageObserver() {
        let isProcessing = false;
        let observer;
        let lastCheck = 0;
        const CHECK_INTERVAL = 2000; // 限制检查频率为2秒一次

        function stopObserver() {
            if (observer) {
                observer.disconnect();
                logger.log('🛑 页面监控已停止', 'info');
            }
        }

        // 暴露停止函数到全局
        window.stopPageObserver = stopObserver;

        // 防抖函数
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // 页面检查函数
        const checkPage = debounce(async () => {
            if (isProcessing) return;

            const now = Date.now();
            if (now - lastCheck < CHECK_INTERVAL) return;
            lastCheck = now;

            const currentUrl = window.location.href;
            const currentPath = window.location.pathname;

            // 检查是否在登录/注册页面
            const isLoginPage = currentUrl.includes('augmentcode.com') &&
                               (currentPath.includes('/auth/') || currentPath.includes('/u/login/'));

            if (isLoginPage) {
                // 查找邮箱输入框 - 使用多种选择器
                const emailSelectors = [
                    'input[name="username"]',
                    'input[type="email"]',
                    'input[placeholder*="email" i]',
                    'input[placeholder*="邮箱" i]',
                    'input[id*="email" i]',
                    'input[class*="email" i]'
                ];

                let emailInput = null;
                for (const selector of emailSelectors) {
                    emailInput = document.querySelector(selector);
                    if (emailInput) break;
                }

                // 查找验证码输入框
                const codeSelectors = [
                    'input[name="code"]',
                    'input[placeholder*="code" i]',
                    'input[placeholder*="验证码" i]',
                    'input[id*="code" i]',
                    'input[class*="code" i]'
                ];

                let codeInput = null;
                for (const selector of codeSelectors) {
                    codeInput = document.querySelector(selector);
                    if (codeInput) break;
                }

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

                // 验证码输入页面 - 只自动执行一次
                if (codeInput && !isProcessing && !window.codePageProcessed) {
                    window.codePageProcessed = true;
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

            // 检查订阅页面的JSON数据
            if (currentUrl.includes('/account/subscription') && !window.subscriptionPageProcessed) {
                window.subscriptionPageProcessed = true;
                const scriptTags = document.querySelectorAll('script');
                for (const script of scriptTags) {
                    const content = script.textContent || script.innerText;
                    if (content.includes('"code":') && content.includes('"tenant_url":')) {
                        const jsonMatch = content.match(/\{[^}]*"code"[^}]*"tenant_url"[^}]*\}/);
                        if (jsonMatch) {
                            const jsonText = jsonMatch[0];
                            logger.log('🎯 检测到授权数据: ' + jsonText, 'success');
                            await copyJsonToClipboard(jsonText);
                            break;
                        }
                    }
                }
            }
        }, 1000); // 1秒防抖

        // 使用更轻量的监听器
        observer = new MutationObserver(() => {
            checkPage();
        });

        // 只监听子元素变化，不监听属性变化
        observer.observe(document.body, {
            childList: true,
            subtree: false // 不监听深层子树变化
        });

        // 初始检查
        setTimeout(checkPage, 1000);

        logger.log('👀 页面监控已启动 (优化版)', 'info');
    }

    // 简化的初始化 - 只提供手动触发功能
    function init() {
        logger.log('🎉 AugmentCode自动注册助手已启动 (使用自有邮箱系统)', 'success');
        logger.log('📧 邮箱系统: ' + AUTOMATION_API_CONFIG.baseUrl, 'info');
        logger.log('⚠️ 为避免页面冲突，已切换为手动模式', 'warning');

        // 页面加载完成后的初始检查
        setTimeout(() => {
            const currentUrl = window.location.href;
            const currentPath = window.location.pathname;
            logger.log('🌐 当前页面: ' + currentUrl, 'info');

            // 检查是否在登录/注册页面
            const isLoginPage = currentUrl.includes('augmentcode.com') &&
                               (currentPath.includes('/auth/') || currentPath.includes('/u/login/'));

            if (isLoginPage) {
                logger.log('✅ 检测到登录/注册页面', 'success');

                // 显示开始注册按钮
                const autoRegisterBtn = document.getElementById('auto-register-btn');
                if (autoRegisterBtn) {
                    autoRegisterBtn.style.display = 'block';
                    autoRegisterBtn.onclick = async () => {
                        logger.log('🚀 手动触发自动注册流程...', 'info');

                        // 检查当前是邮箱页面还是验证码页面
                        const codeInput = document.querySelector('input[name="code"]') ||
                                         document.querySelector('input[placeholder*="code" i]');

                        if (codeInput) {
                            // 验证码页面
                            logger.log('📧 检测到验证码页面，开始填写验证码...', 'info');
                            const success = await fillVerificationCode();
                            if (!success) {
                                logger.log('❌ 验证码填写失败', 'error');
                            }
                        } else {
                            // 邮箱页面
                            logger.log('📝 检测到邮箱页面，开始填写邮箱...', 'info');
                            const success = await fillEmail();
                            if (!success) {
                                logger.log('❌ 邮箱填写失败', 'error');
                            }
                        }
                    };
                    logger.log('🎯 "开始注册"按钮已显示，请手动点击开始', 'info');
                }

                // 检查页面元素
                const emailInput = document.querySelector('input[type="email"]') ||
                                  document.querySelector('input[placeholder*="email" i]');
                const codeInput = document.querySelector('input[name="code"]') ||
                                 document.querySelector('input[placeholder*="code" i]');

                if (emailInput) {
                    logger.log('✅ 找到邮箱输入框', 'success');
                } else if (codeInput) {
                    logger.log('✅ 找到验证码输入框', 'success');
                } else {
                    logger.log('⚠️ 未找到输入框，请检查页面', 'warning');
                }
            } else {
                logger.log('ℹ️ 当前不在登录/注册页面', 'info');

                // 在其他页面也显示按钮，用于处理OAuth回调
                const autoRegisterBtn = document.getElementById('auto-register-btn');
                if (autoRegisterBtn && currentUrl.includes('/account/subscription')) {
                    autoRegisterBtn.style.display = 'block';
                    autoRegisterBtn.textContent = '提取授权';
                    autoRegisterBtn.onclick = async () => {
                        logger.log('🔍 手动提取授权数据...', 'info');
                        const scriptTags = document.querySelectorAll('script');
                        for (const script of scriptTags) {
                            const content = script.textContent || script.innerText;
                            if (content.includes('"code":') && content.includes('"tenant_url":')) {
                                const jsonMatch = content.match(/\{[^}]*"code"[^}]*"tenant_url"[^}]*\}/);
                                if (jsonMatch) {
                                    const jsonText = jsonMatch[0];
                                    logger.log('🎯 检测到授权数据: ' + jsonText, 'success');
                                    await copyJsonToClipboard(jsonText);
                                    break;
                                }
                            }
                        }
                    };
                }
            }
        }, 2000);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
