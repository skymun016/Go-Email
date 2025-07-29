// ==UserScript==
// @name         AugmentCode自动注册 (自有邮箱版)
// @namespace    http://tampermonkey.net/
// @version      0.3.1
// @description  自动完成AugmentCode的注册流程，使用自有邮箱系统
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

    // 自动化API配置 - 替换原来的临时邮箱配置
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

    // 全局状态跟踪，防止重复操作
    let copyOperationCompleted = false;
    let oauthPushCompleted = false;
    let subscriptionPageProcessed = false; // 防止重复处理订阅页面

    // 保存当前注册流程中生成的邮箱地址
    let currentGeneratedEmail = null;

    // 重置操作状态（用于调试或重新开始流程）
    function resetOperationStates() {
        copyOperationCompleted = false;
        oauthPushCompleted = false;
        subscriptionPageProcessed = false;
        currentGeneratedEmail = null;
        logger.log('🔄 操作状态已重置', 'info');
    }

    // 将重置函数暴露到全局，方便调试
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

    // 从订阅页面提取邮箱地址
    function extractEmailFromSubscriptionPage() {
        logger.log('🔍 尝试从订阅页面提取邮箱地址...', 'info');

        // 邮箱格式验证正则
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        // 策略1: 使用用户提供的具体选择器
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
            // 过滤掉常见的示例邮箱
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

    // 手动触发邮箱状态更新的函数
    window.manualUpdateEmailStatus = async function() {
        let emailToUpdate = currentGeneratedEmail;
        if (!emailToUpdate) {
            emailToUpdate = localStorage.getItem('augment_current_email');
            if (emailToUpdate) {
                logger.log('📧 从localStorage恢复邮箱地址: ' + emailToUpdate, 'info');
                currentGeneratedEmail = emailToUpdate;
            }
        }

        // 如果还是没有邮箱，尝试从页面提取
        if (!emailToUpdate) {
            emailToUpdate = extractEmailFromSubscriptionPage();
            if (emailToUpdate) {
                currentGeneratedEmail = emailToUpdate;
                localStorage.setItem('augment_current_email', emailToUpdate);
            }
        }

        if (!emailToUpdate) {
            logger.log('❌ 未找到邮箱地址！请先运行注册流程', 'error');
            return false;
        }

        try {
            logger.log('📝 手动更新邮箱状态: ' + emailToUpdate, 'info');
            await markEmailAsRegistered(emailToUpdate);
            logger.log('✅ 邮箱状态已成功更新为已注册', 'success');

            // 清理localStorage中的邮箱信息
            localStorage.removeItem('augment_current_email');
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

    // 常用名字列表，用于生成随机邮箱（保留原有逻辑，但实际不使用）
    const FIRST_NAMES = [
        'james', 'mary', 'john', 'patricia', 'robert', 'jennifer', 'michael', 'linda',
        'william', 'elizabeth', 'david', 'barbara', 'richard', 'susan', 'joseph', 'jessica',
        'thomas', 'sarah', 'charles', 'karen', 'christopher', 'nancy', 'daniel', 'lisa',
        'matthew', 'betty', 'anthony', 'helen', 'mark', 'sandra', 'donald', 'donna',
        'steven', 'carol', 'paul', 'ruth', 'andrew', 'sharon', 'joshua', 'michelle',
        'kenneth', 'laura', 'kevin', 'sarah', 'brian', 'kimberly', 'george', 'deborah',
        'edward', 'dorothy', 'ronald', 'lisa', 'timothy', 'nancy', 'jason', 'karen',
        'jeffrey', 'betty', 'ryan', 'helen', 'jacob', 'sandra', 'gary', 'donna',
        'nicholas', 'carol', 'eric', 'ruth', 'jonathan', 'sharon', 'stephen', 'michelle',
        'larry', 'laura', 'justin', 'sarah', 'scott', 'kimberly', 'brandon', 'deborah',
        'benjamin', 'dorothy', 'samuel', 'lisa', 'gregory', 'nancy', 'alexander', 'karen',
        'patrick', 'betty', 'frank', 'helen', 'raymond', 'sandra', 'jack', 'donna',
        'dennis', 'carol', 'jerry', 'ruth', 'tyler', 'sharon', 'aaron', 'michelle',
        'jose', 'laura', 'henry', 'sarah', 'adam', 'kimberly', 'douglas', 'deborah',
        'nathan', 'dorothy', 'peter', 'lisa', 'zachary', 'nancy', 'kyle', 'karen',
        'noah', 'betty', 'alan', 'helen', 'ethan', 'sandra', 'jeremy', 'donna',
        'lionel', 'carol', 'mike', 'ruth', 'albert', 'sharon', 'wayne', 'michelle',
        'mason', 'laura', 'ralph', 'sarah', 'roy', 'kimberly', 'eugene', 'deborah',
        'louis', 'dorothy', 'philip', 'lisa', 'bobby', 'nancy', 'johnny', 'karen'
    ];

    const LAST_NAMES = [
        'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
        'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas',
        'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez', 'thompson', 'white',
        'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker', 'young',
        'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill', 'flores',
        'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell',
        'carter', 'roberts', 'gomez', 'phillips', 'evans', 'turner', 'diaz', 'parker',
        'cruz', 'edwards', 'collins', 'reyes', 'stewart', 'morris', 'morales', 'murphy',
        'cook', 'rogers', 'gutierrez', 'ortiz', 'morgan', 'cooper', 'peterson', 'bailey',
        'reed', 'kelly', 'howard', 'ramos', 'kim', 'cox', 'ward', 'richardson',
        'watson', 'brooks', 'chavez', 'wood', 'james', 'bennett', 'gray', 'mendoza',
        'ruiz', 'hughes', 'price', 'alvarez', 'castillo', 'sanders', 'patel', 'myers',
        'long', 'ross', 'foster', 'jimenez', 'powell', 'jenkins', 'perry', 'russell',
        'sullivan', 'bell', 'coleman', 'butler', 'henderson', 'barnes', 'gonzales', 'fisher',
        'vasquez', 'simmons', 'romero', 'jordan', 'patterson', 'alexander', 'hamilton', 'graham',
        'reynolds', 'griffin', 'wallace', 'moreno', 'west', 'cole', 'hayes', 'bryant'
    ];

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

    // 从我们的API获取可用邮箱 - 替换原来的generateEmail函数
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

    // 从我们的API获取验证码 - 替换原来的getLatestMailCode函数
    async function getLatestMailCode() {
        return new Promise((resolve, reject) => {
            // 尝试从多个来源获取邮箱地址
            let email = currentGeneratedEmail;
            if (!email) {
                email = localStorage.getItem('augment_current_email');
                if (email) {
                    logger.log('📧 从localStorage恢复邮箱地址: ' + email, 'info');
                    currentGeneratedEmail = email; // 恢复到全局变量
                }
            }

            if (!email) {
                logger.log('❌ 无法获取邮箱地址！', 'error');
                logger.log('🔍 调试信息:', 'info');
                logger.log('- currentGeneratedEmail: ' + currentGeneratedEmail, 'info');
                logger.log('- localStorage: ' + localStorage.getItem('augment_current_email'), 'info');
                reject(new Error('没有可用的邮箱地址'));
                return;
            }

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
                            logger.log('📊 API响应: ' + JSON.stringify(result), 'info');
                            resolve(null);
                        }
                    } catch (error) {
                        logger.log('❌ 解析API响应失败: ' + error.message, 'error');
                        logger.log('📄 原始响应: ' + response.responseText, 'error');
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
                            logger.log('📊 更新详情:', 'info');
                            logger.log(`   - 注册状态: ${result.data.registrationStatus}`, 'info');
                            logger.log(`   - 使用次数: ${result.data.count}`, 'info');
                            logger.log(`   - 售出状态: ${result.data.saleStatus}`, 'info');
                            logger.log(`   - 自动注册: ${result.data.isAutoRegistered ? '是' : '否'}`, 'info');
                            resolve(result);
                        } else {
                            logger.log('❌ 标记邮箱状态失败: ' + result.error, 'error');
                            reject(new Error(result.error));
                        }
                    } catch (error) {
                        logger.log('❌ 解析API响应失败: ' + error.message, 'error');
                        logger.log('📄 原始响应: ' + response.responseText, 'error');
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
    async function getVerificationCode(maxRetries = 6, retryInterval = 5000) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            logger.log(`尝试获取验证码 (第 ${attempt + 1}/${maxRetries} 次)...`);

            try {
                const code = await getLatestMailCode();
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

    // 模拟人工输入文本
    async function simulateTyping(element, text) {
        element.focus();
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));

        // 清空输入框
        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // 逐字符输入，模拟真实打字
        for (let i = 0; i < text.length; i++) {
            element.value = text.substring(0, i + 1);
            element.dispatchEvent(new Event('input', { bubbles: true }));

            // 随机打字速度，模拟人工输入
            const delay = 80 + Math.random() * 120;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // 输入完成后的短暂停顿
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
    }

    // 自动填写邮箱并提交
    async function fillEmail() {
        try {
            logger.log('🔄 开始获取邮箱...', 'info');
            const email = await generateEmail(); // 使用我们的API获取邮箱

            if (!email) {
                logger.log('❌ 获取邮箱失败：返回值为空', 'error');
                return false;
            }

            // 保存生成的邮箱到全局变量和localStorage
            currentGeneratedEmail = email;
            localStorage.setItem('augment_current_email', email);
            logger.log('✅ 使用邮箱: ' + email, 'success');
            logger.log('📧 邮箱已保存到内存和localStorage，将用于后续验证码获取', 'info');

            const emailInput = await waitForElement('input[name="username"]');
            if (!emailInput) {
                logger.log('❌ 未找到邮箱输入框', 'error');
                return false;
            }

            logger.log('✅ 找到邮箱输入框，开始填写', 'info');

            // 模拟人工输入邮箱
            await simulateTyping(emailInput, email);
            logger.log('✅ 邮箱填写完成', 'success');

            // 模拟用户检查输入的短暂停顿
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

            // 点击继续按钮
            const continueBtn = await waitForElement('button[type="submit"]');
            if (!continueBtn) {
                logger.log('❌ 未找到继续按钮', 'error');
                return false;
            }

            logger.log('✅ 准备点击继续按钮...', 'info');

            // 模拟鼠标悬停
            continueBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

            // 模拟人工点击
            await simulateHumanClick(continueBtn);
            logger.log('✅ 已点击继续按钮，跳转到验证码页面', 'success');
            return true;
        } catch (error) {
            logger.log('❌ fillEmail函数执行失败: ' + error.message, 'error');
            return false;
        }
    }

    // 填写验证码
    async function fillVerificationCode() {
        logger.log('📧 开始获取验证码...', 'info');
        const code = await getVerificationCode();
        if (!code) {
            logger.log('❌ 未能获取验证码', 'error');
            return false;
        }

        const codeInput = await waitForElement('input[name="code"]');
        if (!codeInput) {
            logger.log('❌ 未找到验证码输入框', 'error');
            return false;
        }

        logger.log('✅ 找到验证码输入框，开始填写验证码: ' + code, 'success');

        // 模拟人工输入验证码
        await simulateTyping(codeInput, code);
        logger.log('✅ 验证码填写完成', 'success');

        // 模拟用户检查验证码的短暂停顿
        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

        // 点击继续按钮
        const continueBtn = await waitForElement('button[type="submit"]');
        if (!continueBtn) {
            logger.log('❌ 未找到继续按钮', 'error');
            return false;
        }

        logger.log('✅ 准备点击继续按钮...', 'info');

        // 模拟鼠标悬停
        continueBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

        // 模拟人工点击
        await simulateHumanClick(continueBtn);
        logger.log('✅ 已点击继续按钮，跳转到下一步', 'success');
        return true;
    }

    // 模拟人工点击
    async function simulateHumanClick(element) {
        // 模拟鼠标移动到元素上
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // 触发鼠标事件序列
        const events = ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'];

        for (const eventType of events) {
            const event = new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
                button: 0
            });
            element.dispatchEvent(event);

            // 在事件之间添加小延迟
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
        }
    }

    // 处理服务条款页面
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
            await simulateHumanClick(checkbox);
            logger.log('✅ 已勾选服务条款同意框', 'success');
        } else {
            logger.log('✅ 服务条款已经勾选', 'info');
        }

        // 等待一下确保勾选生效，模拟用户思考时间
        logger.log('🤔 等待页面响应...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

        // 查找并点击注册按钮
        const signupBtn = await findButtonByText(['Sign up and start coding', 'start coding', 'Sign up'], 3000);
        if (!signupBtn) {
            // 尝试其他可能的按钮选择器
            const altSignupBtn = document.querySelector('button[type="submit"]');

            if (altSignupBtn) {
                logger.log('✅ 找到提交按钮，准备点击', 'info');

                // 模拟鼠标悬停
                altSignupBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

                // 模拟人工点击
                await simulateHumanClick(altSignupBtn);
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
        } else {
            logger.log('✅ 找到注册按钮，准备点击', 'info');

            // 模拟鼠标悬停
            signupBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

            // 模拟人工点击
            await simulateHumanClick(signupBtn);
            logger.log('🎉 已点击注册按钮，完成注册流程！', 'success');

            // 标记邮箱为已注册
            if (currentGeneratedEmail) {
                await markEmailAsRegistered(currentGeneratedEmail);
            }

            return true;
        }
    }

    // 通过文本内容查找按钮
    async function findButtonByText(textOptions, timeout = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const buttons = document.querySelectorAll('button');
            for (const button of buttons) {
                const buttonText = button.textContent.toLowerCase().trim();
                for (const option of textOptions) {
                    if (buttonText.includes(option.toLowerCase())) {
                        return button;
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
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

    // 复制JSON到剪贴板
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

    // 页面监控
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
                    // 尝试恢复邮箱地址
                    let emailToUpdate = currentGeneratedEmail;
                    if (!emailToUpdate) {
                        emailToUpdate = localStorage.getItem('augment_current_email');
                        if (emailToUpdate) {
                            logger.log('📧 从localStorage恢复邮箱地址: ' + emailToUpdate, 'info');
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
                            localStorage.setItem('augment_current_email', emailToUpdate);
                        }
                    }

                    // 调试信息
                    logger.log('🔍 页面监控 - 邮箱状态调试:', 'info');
                    logger.log('- currentGeneratedEmail: ' + (currentGeneratedEmail || '未设置'), 'info');
                    logger.log('- localStorage: ' + (localStorage.getItem('augment_current_email') || '未设置'), 'info');
                    logger.log('- emailToUpdate: ' + (emailToUpdate || '未设置'), 'info');

                    // 标记邮箱为已注册
                    if (emailToUpdate) {
                        try {
                            await markEmailAsRegistered(emailToUpdate);
                            logger.log('✅ 邮箱状态已成功更新为已注册', 'success');

                            // 清理localStorage中的邮箱信息
                            localStorage.removeItem('augment_current_email');
                            currentGeneratedEmail = null;

                            logger.log('🎊 注册流程完全完成！邮箱已标记为已注册状态', 'success');
                            logger.log('✨ 脚本将停止重复处理此页面', 'info');
                        } catch (error) {
                            logger.log('❌ 更新邮箱状态失败: ' + error.message, 'error');
                        }
                    } else {
                        logger.log('⚠️ 未找到当前邮箱地址，无法更新状态', 'warning');
                        logger.log('💡 提示：可能需要手动设置邮箱地址或重新运行注册流程', 'info');
                    }

                    isProcessing = false;
                }, 2000);
            }

            // 检查订阅页面的JSON数据（OAuth处理）
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

    // 初始化
    function init() {
        logger.log('🎉 AugmentCode自动注册助手已启动 (使用自有邮箱系统)', 'success');
        logger.log('📧 邮箱系统: ' + AUTOMATION_API_CONFIG.baseUrl, 'info');
        logger.log('💡 手动命令: window.manualUpdateEmailStatus() - 手动更新邮箱状态', 'info');
        logger.log('💡 测试命令: window.testExtractEmail() - 测试邮箱提取功能', 'info');

        // 检查是否有之前保存的邮箱
        const savedEmail = localStorage.getItem('augment_current_email');
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
            logger.log('🌐 当前页面: ' + currentUrl, 'info');
            logger.log('📍 当前路径: ' + currentPath, 'info');

            // 检查是否在登录/注册页面
            const isLoginPage = currentUrl.includes('augmentcode.com') &&
                               (currentPath.includes('/auth/') || currentPath.includes('/u/login/'));

            // 检查是否在服务条款页面
            const isTermsPage = currentUrl.includes('augmentcode.com') &&
                               (currentPath.includes('/terms-accept') || currentUrl.includes('terms-accept'));

            // 检查是否在订阅页面（注册成功）
            const isSubscriptionPage = currentUrl.includes('app.augmentcode.com/account/subscription');

            if (isLoginPage) {
                logger.log('✅ 检测到登录/注册页面', 'success');

                // 检查页面类型
                const emailInput = document.querySelector('input[name="username"]') ||
                                  document.querySelector('input[type="email"]');
                const codeInput = document.querySelector('input[name="code"]');

                if (emailInput && !codeInput) {
                    logger.log('📝 当前是邮箱输入页面', 'info');
                } else if (codeInput) {
                    logger.log('📧 当前是验证码输入页面', 'info');
                    logger.log('🔍 当前邮箱状态: ' + (currentGeneratedEmail || '未设置'), 'info');
                }

                // 显示开始注册按钮
                const autoRegisterBtn = document.getElementById('auto-register-btn');
                if (autoRegisterBtn) {
                    autoRegisterBtn.style.display = 'block';
                    autoRegisterBtn.onclick = async () => {
                        logger.log('🚀 手动触发自动注册流程...', 'info');

                        if (codeInput) {
                            // 验证码页面
                            logger.log('📧 检测到验证码页面，开始填写验证码...', 'info');
                            const success = await fillVerificationCode();
                            if (!success) {
                                logger.log('❌ 验证码填写失败', 'error');
                            }
                        } else {
                            // 邮箱页面
                            const success = await fillEmail();
                            if (!success) {
                                logger.log('❌ 邮箱填写失败', 'error');
                            }
                        }
                    };
                    logger.log('🎯 "开始注册"按钮已显示，可以手动点击开始', 'info');
                }
            } else if (isTermsPage) {
                logger.log('📋 检测到服务条款页面', 'success');

                // 显示处理按钮
                const autoRegisterBtn = document.getElementById('auto-register-btn');
                if (autoRegisterBtn) {
                    autoRegisterBtn.style.display = 'block';
                    autoRegisterBtn.textContent = '同意条款';
                    autoRegisterBtn.onclick = async () => {
                        logger.log('📋 手动触发服务条款处理...', 'info');
                        const success = await handleTermsPage();
                        if (!success) {
                            logger.log('❌ 服务条款处理失败', 'error');
                        }
                    };
                    logger.log('🎯 "同意条款"按钮已显示，可以手动点击处理', 'info');
                }
            } else if (isSubscriptionPage && !subscriptionPageProcessed) {
                subscriptionPageProcessed = true;
                logger.log('🎉 检测到注册成功页面（订阅页面）', 'success');

                // 尝试恢复邮箱地址
                let emailToUpdate = currentGeneratedEmail;
                if (!emailToUpdate) {
                    emailToUpdate = localStorage.getItem('augment_current_email');
                    if (emailToUpdate) {
                        logger.log('📧 从localStorage恢复邮箱地址: ' + emailToUpdate, 'info');
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
                        localStorage.setItem('augment_current_email', emailToUpdate);
                    }
                }

                // 调试信息
                logger.log('🔍 邮箱状态调试:', 'info');
                logger.log('- currentGeneratedEmail: ' + (currentGeneratedEmail || '未设置'), 'info');
                logger.log('- localStorage: ' + (localStorage.getItem('augment_current_email') || '未设置'), 'info');
                logger.log('- emailToUpdate: ' + (emailToUpdate || '未设置'), 'info');

                // 自动处理邮箱状态更新
                if (emailToUpdate) {
                    logger.log('📝 准备更新邮箱状态为已注册...', 'info');
                    setTimeout(async () => {
                        try {
                            await markEmailAsRegistered(emailToUpdate);
                            logger.log('✅ 邮箱状态已成功更新为已注册', 'success');

                            // 清理localStorage中的邮箱信息
                            localStorage.removeItem('augment_current_email');
                            currentGeneratedEmail = null;

                            logger.log('🎊 注册流程完全完成！', 'success');
                            logger.log('✨ 脚本将停止重复处理此页面', 'info');
                        } catch (error) {
                            logger.log('❌ 更新邮箱状态失败: ' + error.message, 'error');
                        }
                    }, 3000);
                } else {
                    logger.log('⚠️ 未找到当前邮箱地址，无法更新状态', 'warning');
                    logger.log('💡 提示：可能需要手动设置邮箱地址或重新运行注册流程', 'info');
                }
            } else {
                logger.log('ℹ️ 当前不在登录/注册页面', 'info');
            }
        }, 1000);
    }

    // 页面加载完成后启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
