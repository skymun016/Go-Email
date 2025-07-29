// ==UserScript==
// @name         AugmentCode自动注册
// @namespace    http://tampermonkey.net/
// @version      0.3.0
// @description  自动完成AugmentCode的注册流程，包括自动点击Copy to Clipboard按钮并获取Session Cookie
// @author       Your name
// @match        https://*.augmentcode.com/*
// @match        https://app.augmentcode.com/account/subscription
// @icon         https://www.google.com/s2/favicons?sz=64&domain=augmentcode.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @connect      tempmail.plus
// @connect      api.amw.qzz.io
// ==/UserScript==

(function() {
    'use strict';

    // 主邮箱域名常量，用于生成标准格式的邮箱地址
    const EMAIL_DOMAIN = "@amw.qzz.io";

    // 后端配置
    const BACKEND_CONFIG = {
        url: "https://api.amw.qzz.io",
        adminToken: "krAPyH5MVK8uJUXsbO4nLrqEgRS5lEho3LjIiKjBMH6mXRLaU4kzmUPabrJN67cx"
    };

    // 全局状态跟踪，防止重复操作
    let copyOperationCompleted = false;
    let oauthPushCompleted = false;

    // 保存当前注册流程中生成的邮箱地址
    let currentGeneratedEmail = null;

    // 重置操作状态（用于调试或重新开始流程）
    function resetOperationStates() {
        copyOperationCompleted = false;
        oauthPushCompleted = false;
        currentGeneratedEmail = null;
        logger.log('🔄 操作状态已重置', 'info');
    }

    // 将重置函数暴露到全局，方便调试
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

    /**
     * 临时邮箱服务配置
     * 用于需要临时接收验证邮件的场景
     */
    const TEMP_MAIL_CONFIG = {
        username: "nmuhqew",          // 临时邮箱用户名
        emailExtension: "@mailto.plus", // 临时邮箱扩展域名
        epin: "123456"             // 邮箱访问PIN码，用于登录临时邮箱
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

        @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
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




    const FIRST_NAMES = ["alex", "emily", "jason", "olivia", "ryan", "sophia", "thomas", "isabella", "william", "mia", "james", "ava", "noah", "charlotte", "ethan", "amelia", "jacob", "evelyn", "mason", "abigail"];
    const LAST_NAMES = ["taylor", "anderson", "thompson", "jackson", "white", "harris", "martin", "thomas", "lewis", "clark", "lee", "walker", "hall", "young", "allen", "king", "wright", "scott", "green", "adams"];


    // 颜色配置 - 更现代的配色方案
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

    // 日志UI配置 - 增强的配置选项
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

    // 创建日志UI - 现代化设计风格
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
                    <span>🚀 自动注册助手</span>
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
                    ">💻</span>
                    <span style="font-weight: 500;">操作控制台</span>
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

        // 增强的按钮交互效果
        const registerBtn = document.getElementById('auto-register-btn');

        if (registerBtn) {
            registerBtn.addEventListener('mouseenter', () => {
                registerBtn.style.transform = 'scale(1.05) translateY(-1px)';
                registerBtn.style.boxShadow = '0 6px 20px rgba(240, 147, 251, 0.4)';
            });
            registerBtn.addEventListener('mouseleave', () => {
                registerBtn.style.transform = 'scale(1) translateY(0)';
                registerBtn.style.boxShadow = '0 4px 12px rgba(240, 147, 251, 0.3)';
            });
        }

        [clearBtn, minimizeBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'scale(1.1)';
                    btn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'scale(1)';
                    btn.style.backgroundColor = COLORS.cardBg;
                });
            }
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
                logEntry.style.position = 'relative';
                logEntry.style.overflow = 'hidden';

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

                // 添加悬停效果
                logEntry.addEventListener('mouseenter', () => {
                    logEntry.style.transform = 'translateX(4px)';
                    logEntry.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                });
                logEntry.addEventListener('mouseleave', () => {
                    logEntry.style.transform = 'translateX(0)';
                    logEntry.style.boxShadow = 'none';
                });
            },
            showRegisterButton: function() {
                const registerBtn = document.getElementById('auto-register-btn');
                if (registerBtn) {
                    this.log('找到注册按钮，正在显示...');
                    registerBtn.style.display = 'inline-block';
                    return registerBtn;
                } else {
                    this.log('未找到注册按钮元素', 'error');
                    return null;
                }
            }
        };
    }

    // 创建全局日志对象
    const logger = createLogUI();

    // 生成随机邮箱
    function generateEmail() {
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const timestamp = Date.now().toString(36); // 转换为36进制以缩短长度
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 生成4位随机数
        const username = `${firstName}${lastName}${timestamp}${randomNum}`;
        return `${username}${EMAIL_DOMAIN}`;
    }

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
                tenant_url: parsed.tenant_url
            };

            // 如果有生成的邮箱地址，添加到请求数据中
            if (currentGeneratedEmail) {
                callbackData.email = currentGeneratedEmail;
                logger.log('📧 包含邮箱地址: ' + currentGeneratedEmail, 'info');
            } else {
                logger.log('⚠️ 未找到生成的邮箱地址，将使用默认Token名称', 'warning');
            }

            logger.log('📤 发送到: ' + BACKEND_CONFIG.url + '/api/oauth/callback', 'info');
            logger.log('📦 发送数据: ' + JSON.stringify(callbackData), 'info');
            logger.log('🔑 使用Token: ' + BACKEND_CONFIG.adminToken.substring(0, 20) + '...', 'info');

            GM_xmlhttpRequest({
                method: "POST",
                url: BACKEND_CONFIG.url + '/api/oauth/callback',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + BACKEND_CONFIG.adminToken
                },
                data: JSON.stringify(callbackData),
                timeout: 30000,
                onload: function(response) {
                    logger.log('📥 收到响应，状态码: ' + response.status, 'info');
                    logger.log('📄 响应内容: ' + response.responseText, 'info');

                    if (response.status === 200) {
                        try {
                            const result = JSON.parse(response.responseText);
                            if (result.status === 'success') {
                                logger.log('✅ 授权数据发送成功！', 'success');
                                logger.log('🎯 Token已存储到数据库', 'success');
                                if (result.token) {
                                    logger.log('🆔 数据库ID: ' + result.token.id, 'info');
                                    logger.log('🔗 Token名称: ' + result.token.name, 'info');
                                    logger.log('🎯 生成的Token: ' + result.token.token.substring(0, 20) + '...', 'info');
                                }

                                // 标记OAuth推送已完成
                                oauthPushCompleted = true;
                                resolve(result);
                            } else {
                                logger.log('❌ 后端处理失败: ' + JSON.stringify(result), 'error');
                                reject(new Error('后端处理失败: ' + result.message));
                            }
                        } catch (e) {
                            logger.log('❌ 解析响应失败: ' + e.message, 'error');
                            logger.log('📄 原始响应: ' + response.responseText, 'error');
                            reject(new Error('解析响应失败: ' + e.message));
                        }
                    } else {
                        logger.log('❌ 请求失败: ' + response.status, 'error');
                        logger.log('📄 错误响应: ' + response.responseText, 'error');
                        reject(new Error('请求失败: ' + response.status));
                    }
                },
                onerror: function(error) {
                    logger.log('❌ 网络错误: ' + error.toString(), 'error');
                    reject(new Error('网络错误: ' + error.toString()));
                },
                ontimeout: function() {
                    logger.log('❌ 请求超时', 'error');
                    reject(new Error('请求超时'));
                }
            });
        } catch (error) {
            logger.log('❌ 发送失败: ' + error.message, 'error');
            logger.log('📄 错误详情: ' + error.stack, 'error');
            reject(error);
        }
        });
    }

    // 从邮件文本中提取验证码
    function extractVerificationCode(mailText) {
        const codeMatch = mailText.match(/(?<![a-zA-Z@.])\b\d{6}\b/);
        return codeMatch ? codeMatch[0] : null;
    }

    // 删除邮件
    async function deleteEmail(firstId) {
        return new Promise((resolve, reject) => {
            const deleteUrl = 'https://tempmail.plus/api/mails/';
            const maxRetries = 5;
            let retryCount = 0;

            function tryDelete() {
                GM_xmlhttpRequest({
                    method: "DELETE",
                    url: deleteUrl,
                    data: `email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&first_id=${firstId}&epin=${TEMP_MAIL_CONFIG.epin}`,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    onload: function(response) {
                        try {
                            const result = JSON.parse(response.responseText).result;
                            if (result === true) {
                                logger.log("邮件删除成功", 'success');
                                resolve(true);
                                return;
                            }
                        } catch (error) {
                            logger.log("解析删除响应失败: " + error, 'warning');
                        }

                        // 如果还有重试次数，继续尝试
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            logger.log(`删除邮件失败，正在重试 (${retryCount}/${maxRetries})...`, 'warning');
                            setTimeout(tryDelete, 500);
                        } else {
                            logger.log("删除邮件失败，已达到最大重试次数", 'error');
                            resolve(false);
                        }
                    },
                    onerror: function(error) {
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            logger.log(`删除邮件出错，正在重试 (${retryCount}/${maxRetries})...`, 'warning');
                            setTimeout(tryDelete, 500);
                        } else {
                            logger.log("删除邮件失败: " + error, 'error');
                            resolve(false);
                        }
                    }
                });
            }

            tryDelete();
        });
    }

    // 获取最新邮件中的验证码
    async function getLatestMailCode() {
        return new Promise((resolve, reject) => {
            const mailListUrl = `https://tempmail.plus/api/mails?email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&limit=20&epin=${TEMP_MAIL_CONFIG.epin}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: mailListUrl,
                onload: async function(mailListResponse) {
                    try {
                        const mailListData = JSON.parse(mailListResponse.responseText);
                        if (!mailListData.result || !mailListData.first_id) {
                            resolve(null);
                            return;
                        }

                        const firstId = mailListData.first_id;
                        const mailDetailUrl = `https://tempmail.plus/api/mails/${firstId}?email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&epin=${TEMP_MAIL_CONFIG.epin}`;

                        GM_xmlhttpRequest({
                            method: "GET",
                            url: mailDetailUrl,
                            onload: async function(mailDetailResponse) {
                                try {
                                    const mailDetailData = JSON.parse(mailDetailResponse.responseText);
                                    if (!mailDetailData.result) {
                                        resolve(null);
                                        return;
                                    }

                                    const mailText = mailDetailData.text || "";
                                    const mailSubject = mailDetailData.subject || "";
                                    logger.log("找到邮件主题: " + mailSubject);

                                    const code = extractVerificationCode(mailText);

                                    // 获取到验证码后，尝试删除邮件
                                    if (code) {
                                        await deleteEmail(firstId);
                                    }

                                    resolve(code);
                                } catch (error) {
                                    logger.log("解析邮件详情失败: " + error, 'error');
                                    resolve(null);
                                }
                            },
                            onerror: function(error) {
                                logger.log("获取邮件详情失败: " + error, 'error');
                                resolve(null);
                            }
                        });
                    } catch (error) {
                        logger.log("解析邮件列表失败: " + error, 'error');
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    logger.log("获取邮件列表失败: " + error, 'error');
                    resolve(null);
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

    // 自动填写邮箱并提交
    async function fillEmail() {
        const email = generateEmail();
        // 保存生成的邮箱到全局变量
        currentGeneratedEmail = email;
        logger.log('使用邮箱: ' + email);
        logger.log('📧 邮箱已保存，将用于后续OAuth推送', 'info');

        const emailInput = await waitForElement('input[name="username"]');
        if (!emailInput) {
            logger.log('未找到邮箱输入框', 'error');
            return false;
        }

        logger.log('找到邮箱输入框，开始填写');

        // 填写邮箱
        emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));

        // 点击继续按钮
        const continueBtn = await waitForElement('button[type="submit"]');
        if (!continueBtn) {
            logger.log('未找到继续按钮', 'error');
            return false;
        }

        continueBtn.click();
        return true;
    }

    // 填写验证码
    async function fillVerificationCode() {
        const code = await getVerificationCode();
        if (!code) {
            logger.log('未能获取验证码', 'error');
            return false;
        }

        const codeInput = await waitForElement('input[name="code"]');
        if (!codeInput) {
            logger.log('未找到验证码输入框', 'error');
            return false;
        }

        // 填写验证码
        codeInput.value = code;
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));

        // 点击继续按钮
        const continueBtn = await waitForElement('button[type="submit"]');
        if (!continueBtn) {
            logger.log('未找到继续按钮', 'error');
            return false;
        }

        continueBtn.click();
        return true;
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

    // 同意服务条款并完成注册
    async function completeRegistration() {
        const checkbox = await waitForElement('input[type="checkbox"]');
        if (checkbox) {
            if (!checkbox.checked) {
                checkbox.click();
                logger.log('已自动勾选服务条款同意框', 'success');
            }
        } else {
            logger.log('未找到服务条款复选框', 'warning');
        }

        // 尝试多种注册按钮选择器
        const signupSelectors = [
            'button[type="submit"]',
            'button[type="button"]',
            '.signup-btn',
            '.register-btn',
            '[data-testid="signup-button"]'
        ];

        let signupBtn = null;
        for (const selector of signupSelectors) {
            signupBtn = await waitForElement(selector, 2000);
            if (signupBtn) {
                logger.log(`找到注册按钮，使用选择器: ${selector}`, 'success');
                break;
            }
        }

        if (!signupBtn) {
            // 使用文本查找按钮
            logger.log('通过选择器未找到注册按钮，尝试文本匹配...');
            const textOptions = ['sign up', 'register', '注册', '完成', 'signup'];
            signupBtn = await findButtonByText(textOptions, 3000);

            if (signupBtn) {
                logger.log(`通过文本匹配找到注册按钮: "${signupBtn.textContent.trim()}"`, 'success');
            }
        }

        if (!signupBtn) {
            logger.log('未找到注册按钮', 'error');
            return false;
        }

        signupBtn.click();
        logger.log('点击注册按钮', 'success');

        // 等待注册完成并查找 "Copy to Clipboard" 按钮
        await new Promise(resolve => setTimeout(resolve, 3000));

        return await handleCopyToClipboard();
    }

    // 处理注册完成后的复制按钮
    async function handleCopyToClipboard() {
        // 检查是否已经执行过复制操作
        if (copyOperationCompleted) {
            logger.log('⏭️ 复制操作已完成，跳过重复执行', 'info');
            return true;
        }

        logger.log('查找 Copy to Clipboard 按钮...', 'info');

        // 尝试多种复制按钮选择器
        const copySelectors = [
            '.copy-btn',
            '.clipboard-btn',
            '[data-testid="copy-button"]',
            'button[class*="copy"]',
            'button[onclick*="copy"]'
        ];

        let copyBtn = null;
        for (const selector of copySelectors) {
            copyBtn = await waitForElement(selector, 3000);
            if (copyBtn) {
                logger.log(`找到复制按钮，使用选择器: ${selector}`, 'success');
                break;
            }
        }

        if (!copyBtn) {
            // 使用文本查找按钮
            logger.log('通过选择器未找到复制按钮，尝试文本匹配...');
            const textOptions = ['copy to clipboard', 'copy', '复制', 'clipboard', '剪贴板'];
            copyBtn = await findButtonByText(textOptions, 5000);

            if (copyBtn) {
                logger.log(`通过文本匹配找到复制按钮: "${copyBtn.textContent.trim()}"`, 'success');
            }
        }

        if (copyBtn) {
            // 点击复制按钮
            copyBtn.click();
            logger.log('✅ 已自动点击 Copy to Clipboard 按钮！', 'success');

            // 标记复制操作已完成
            copyOperationCompleted = true;

            // 等待一下确保复制完成
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 尝试获取剪贴板内容并显示
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    const clipboardText = await navigator.clipboard.readText();
                    if (clipboardText) {
                        logger.log('📋 授权数据已复制到剪贴板:', 'success');
                        logger.log(clipboardText.substring(0, 100) + '...', 'info');

                        // 发送到后端OAuth回调接口
                        try {
                            await sendToBackendOAuth(clipboardText);
                            logger.log('🎉 授权数据推送成功，准备跳转到订阅页面...', 'success');

                            // 推送成功后再跳转到订阅页面获取 Cookie
                            await redirectToSubscriptionPage();
                        } catch (pushError) {
                            logger.log('❌ 推送到后端失败: ' + pushError.message, 'error');
                            logger.log('⚠️ 将继续跳转到订阅页面获取Cookie', 'warning');

                            // 即使推送失败也继续跳转
                            await redirectToSubscriptionPage();
                        }
                    } else {
                        logger.log('⚠️ 剪贴板内容为空，直接跳转到订阅页面', 'warning');
                        await redirectToSubscriptionPage();
                    }
                } else {
                    logger.log('⚠️ 无法访问剪贴板，直接跳转到订阅页面', 'warning');
                    await redirectToSubscriptionPage();
                }
            } catch (error) {
                logger.log('无法读取剪贴板内容，但复制操作已执行', 'warning');
                logger.log('⚠️ 直接跳转到订阅页面', 'warning');
                await redirectToSubscriptionPage();
            }

            logger.log('🎉 注册流程完全完成！', 'success');

            return true;
        } else {
            logger.log('❌ 未找到 Copy to Clipboard 按钮，请手动复制授权数据', 'warning');
            return false;
        }
    }

    // 从请求头中提取 Session Cookie
    async function extractSessionCookieFromHeader(cookieHeader) {
        logger.log('🔍 分析请求头中的 Cookie...', 'info');
        logger.log('Cookie 内容: ' + cookieHeader.substring(0, 200) + '...', 'info');

        // 查找 _session cookie
        const sessionMatch = cookieHeader.match(/_session=([^;]+)/);
        if (sessionMatch) {
            const sessionCookie = sessionMatch[1];
            logger.log('✅ 成功从请求头中提取到 Session Cookie！', 'success');
            logger.log('Cookie 长度: ' + sessionCookie.length + ' 字符', 'info');

            // 检查是否以 eyJ 开头（JWT 格式）
            if (sessionCookie.startsWith('eyJ')) {
                logger.log('✅ Cookie 格式正确（JWT格式，以 eyJ 开头）', 'success');
            }

            // 自动复制到剪贴板
            try {
                await navigator.clipboard.writeText(sessionCookie);
                logger.log('📋 Session Cookie 已自动复制到剪贴板！', 'success');
                logger.log('🎯 完整流程已完成！Cookie 获取成功！', 'success');

                // 显示复制的内容确认（只显示前50和后50字符）
                const preview = sessionCookie.length > 100 ?
                    sessionCookie.substring(0, 50) + '...' + sessionCookie.substring(sessionCookie.length - 50) :
                    sessionCookie;
                logger.log('📋 已复制的 Cookie 预览: ' + preview, 'info');

                return true; // 成功获取

            } catch (clipboardError) {
                logger.log('❌ 无法复制到剪贴板: ' + clipboardError, 'error');
                logger.log('📋 请手动复制以下 Cookie:', 'warning');
                logger.log('_session=' + sessionCookie, 'info');
                return true; // 即使复制失败，也算获取成功
            }
        } else {
            logger.log('⚠️ 请求头中未找到 _session Cookie', 'warning');
            return false;
        }
    }

    // 监听网络请求来捕获 set-cookie 响应头
    function interceptNetworkRequests() {
        logger.log('🔍 开始监听网络请求...', 'info');

        // 拦截 fetch 请求
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            // 记录所有请求用于调试
            const url = args[0];
            logger.log('🌐 Fetch 请求: ' + url, 'info');

            // 检查是否是 /api/user 请求 - 在发送前拦截请求头
            if (args[0] && (args[0].includes('/api/user') || args[0].includes('api/user'))) {
                logger.log('🔍 检测到 /api/user 请求', 'info');
                logger.log('🔍 请求URL: ' + args[0], 'info');

                // 检查请求选项中的headers
                const options = args[1] || {};
                if (options.headers) {
                    logger.log('📋 请求头信息:', 'info');
                    for (const [key, value] of Object.entries(options.headers)) {
                        logger.log(`${key}: ${value}`, 'info');
                        if (key.toLowerCase() === 'cookie') {
                            logger.log('🎯 找到请求头中的 Cookie！', 'success');
                            await extractSessionCookieFromHeader(value);
                        }
                    }
                }
            }

            const response = await originalFetch.apply(this, args);

            // 检查响应
            if (args[0] && (args[0].includes('/api/user') || args[0].includes('api/user'))) {
                logger.log('🔍 检测到 /api/user 请求响应', 'info');

                // 尝试从响应头获取 Set-Cookie
                try {
                    // 注意：由于浏览器安全限制，可能无法直接读取 Set-Cookie 响应头
                    // 但我们可以尝试其他方法
                    logger.log('📋 响应状态: ' + response.status, 'info');
                    logger.log('📋 响应头信息:', 'info');

                    // 遍历可访问的响应头
                    for (let [key, value] of response.headers.entries()) {
                        logger.log(`${key}: ${value}`, 'info');
                    }

                } catch (error) {
                    logger.log('⚠️ 无法读取响应头: ' + error, 'warning');
                }

                // 等待一下让 Cookie 设置完成，然后从 document.cookie 获取
                setTimeout(() => {
                    const cookies = document.cookie;
                    const sessionMatch = cookies.match(/_session=([^;]+)/);
                    if (sessionMatch) {
                        const sessionCookie = sessionMatch[1];
                        logger.log('✅ /api/user 请求后检测到新的 Session Cookie', 'success');
                        logger.log('📋 从响应中获取的 Cookie:', 'info');
                        logger.log('_session=' + sessionCookie, 'info');

                        // 自动复制
                        navigator.clipboard.writeText(sessionCookie).then(() => {
                            logger.log('📋 Cookie 已自动复制到剪贴板！', 'success');
                        }).catch(err => {
                            logger.log('❌ 自动复制失败: ' + err, 'error');
                        });
                    }
                }, 1000);
            }

            return response;
        };

        // 同时拦截 XMLHttpRequest
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;

            xhr.open = function(method, url, ...args) {
                this._url = url;
                return originalOpen.apply(this, [method, url, ...args]);
            };

            xhr.send = function(...args) {
                // 记录所有 XHR 请求用于调试
                if (this._url) {
                    logger.log('🌐 XHR 请求: ' + this._url, 'info');
                }

                if (this._url && (this._url.includes('/api/user') || this._url.includes('api/user'))) {
                    // 在请求发送前，尝试获取当前的Cookie信息
                    logger.log('🔍 XHR 检测到 /api/user 请求，准备发送...', 'info');

                    // 由于浏览器会自动添加Cookie到请求头，我们无法直接访问
                    // 但我们可以在这里触发一个检查
                    setTimeout(async () => {
                        logger.log('🔍 检查当前页面的所有可用Cookie信息...', 'info');

                        // 尝试通过其他方式获取Cookie
                        try {
                            // 检查是否有其他方式可以访问Cookie
                            const allCookies = document.cookie;
                            logger.log('📋 当前 document.cookie: ' + allCookies, 'info');

                            // 尝试检查 navigator.cookieEnabled
                            logger.log('🔍 Cookie 启用状态: ' + navigator.cookieEnabled, 'info');

                            // 检查当前域名
                            logger.log('🔍 当前域名: ' + window.location.hostname, 'info');

                            // 尝试读取存储在其他地方的认证信息
                            const localStorage = window.localStorage;
                            const sessionStorage = window.sessionStorage;

                            logger.log('🔍 检查 localStorage...', 'info');
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key && (key.includes('session') || key.includes('auth') || key.includes('token'))) {
                                    logger.log(`LocalStorage ${key}: ${localStorage.getItem(key).substring(0, 100)}...`, 'info');
                                }
                            }

                            logger.log('🔍 检查 sessionStorage...', 'info');
                            for (let i = 0; i < sessionStorage.length; i++) {
                                const key = sessionStorage.key(i);
                                if (key && (key.includes('session') || key.includes('auth') || key.includes('token'))) {
                                    logger.log(`SessionStorage ${key}: ${sessionStorage.getItem(key).substring(0, 100)}...`, 'info');
                                }
                            }

                        } catch (error) {
                            logger.log('❌ 检查存储时出错: ' + error, 'error');
                        }
                    }, 100);

                    this.addEventListener('readystatechange', function() {
                        if (this.readyState === 4 && this.status === 200) {
                            logger.log('🔍 XHR 检测到 /api/user 请求完成', 'info');
                            logger.log('🔍 请求URL: ' + this._url, 'info');

                            // 尝试获取 Set-Cookie 响应头
                            try {
                                const setCookie = this.getResponseHeader('Set-Cookie');
                                if (setCookie) {
                                    logger.log('📋 找到 Set-Cookie 响应头:', 'success');
                                    logger.log(setCookie, 'info');

                                    // 提取 _session Cookie
                                    const sessionMatch = setCookie.match(/_session=([^;]+)/);
                                    if (sessionMatch) {
                                        const sessionCookie = sessionMatch[1];
                                        logger.log('✅ 从 Set-Cookie 响应头提取到 Session Cookie！', 'success');
                                        logger.log('_session=' + sessionCookie, 'info');

                                        // 自动复制
                                        navigator.clipboard.writeText(sessionCookie).then(() => {
                                            logger.log('📋 Cookie 已自动复制到剪贴板！', 'success');
                                        }).catch(err => {
                                            logger.log('❌ 自动复制失败: ' + err, 'error');
                                        });
                                    }
                                } else {
                                    logger.log('⚠️ 未找到 Set-Cookie 响应头', 'warning');
                                }
                            } catch (error) {
                                logger.log('❌ 获取响应头失败: ' + error, 'error');
                            }
                        }
                    });
                }
                return originalSend.apply(this, args);
            };

            return xhr;
        };

        // 添加通用的网络监听器来捕获所有可能的请求
        logger.log('🔍 添加通用网络监听器...', 'info');

        // 监听所有网络活动
        if (window.PerformanceObserver) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name && entry.name.includes('api/user')) {
                            logger.log('🎯 PerformanceObserver 检测到 api/user 请求: ' + entry.name, 'success');
                        }
                    }
                });
                observer.observe({ entryTypes: ['resource'] });
            } catch (error) {
                logger.log('⚠️ PerformanceObserver 设置失败: ' + error, 'warning');
            }
        }
    }

    // 跳转到订阅页面并打开开发者工具
    async function redirectToSubscriptionPage() {
        logger.log('🔄 正在跳转到订阅页面...', 'info');
        logger.log('💡 跳转后将自动打开开发者工具，方便复制Request Headers', 'info');

        // 等待 3 秒确保 Token 复制完成
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 跳转到订阅页面
        window.location.href = 'https://app.augmentcode.com/account/subscription';
    }

    // 在订阅页面获取 Cookie
    async function getCookieFromSubscriptionPage() {
        // 检查是否在订阅页面
        if (!window.location.href.includes('app.augmentcode.com/account/subscription')) {
            return;
        }

        logger.log('📍 已到达订阅页面，正在打开开发者工具...', 'info');

        // 等待页面完全加载
        logger.log('⏳ 等待页面完全加载...', 'info');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 自动打开开发者工具
        try {
            logger.log('🔧 正在尝试打开开发者工具...', 'info');

            // 方法1: 使用 debugger 语句（如果开发者工具未打开会自动打开）
            setTimeout(() => {
                debugger;
            }, 1000);

            // 方法2: 尝试使用快捷键模拟
            setTimeout(() => {
                const event = new KeyboardEvent('keydown', {
                    key: 'F12',
                    code: 'F12',
                    keyCode: 123,
                    which: 123,
                    bubbles: true
                });
                document.dispatchEvent(event);
            }, 2000);

            logger.log('✅ 开发者工具打开指令已发送', 'success');
            logger.log('💡 如果开发者工具未自动打开，请手动按 F12', 'info');

        } catch (error) {
            logger.log('⚠️ 自动打开开发者工具失败: ' + error, 'warning');
            logger.log('💡 请手动按 F12 打开开发者工具', 'info');
        }

        // 显示完成提示
        logger.log('🎯 自动注册流程已完成！', 'success');
        logger.log('📋 开发者工具已打开，您可以手动复制Request Headers中的Cookie', 'info');
        logger.log('✅ 脚本任务完成，停止运行', 'success');










    }

    // 主函数
    async function main() {


        // 检查是否在订阅页面
        if (window.location.href.includes('app.augmentcode.com/account/subscription')) {
            logger.log('检测到订阅页面，正在打开开发者工具...', 'info');




            await getCookieFromSubscriptionPage();
            return;
        }

        // 只在注册相关页面运行
        if (!window.location.href.includes('login.augmentcode.com') && !window.location.href.includes('auth.augmentcode.com')) {
            logger.log('当前页面不是注册或订阅页面，脚本不执行', 'info');
            return;
        }

        logger.log('===== 开始自动注册流程 =====', 'info');

        // 检查当前页面状态
        const emailInput = document.querySelector('input[name="username"]');
        const codeInput = document.querySelector('input[name="code"]');
        const termsCheckbox = document.querySelector('#terms-of-service-checkbox');
        const copyButton = Array.from(document.querySelectorAll('button')).find(btn =>
            btn.textContent.toLowerCase().includes('copy to clipboard') ||
            btn.textContent.toLowerCase().includes('copy') ||
            btn.textContent.toLowerCase().includes('复制'));

        // 如果是授权完成页面，优先处理复制操作，避免启动监听器
        if (copyButton && window.location.href.includes('terms-accept')) {
            logger.log('🎯 检测到授权完成页面，直接处理复制操作', 'info');
            await handleCopyToClipboard();
            return; // 处理完成后直接返回，不启动监听器
        }

        // 检查是否在授权完成页面（有Copy to Clipboard按钮）
        if (copyButton && !copyOperationCompleted) {
            logger.log('检测到授权完成页面，自动点击复制按钮...', 'info');
            await handleCopyToClipboard();
        } else if (copyButton && copyOperationCompleted) {
            logger.log('⏭️ 检测到复制按钮，但复制操作已完成，跳过执行', 'info');
        } else if (emailInput) {
            logger.log('检测到邮箱输入页面');
            // 显示注册按钮
            const registerButton = logger.showRegisterButton();
            if (registerButton) {
                registerButton.addEventListener('click', async () => {
                    try {
                        registerButton.disabled = true;
                        registerButton.textContent = '处理中...';
                        registerButton.style.background = COLORS.warning;

                        if (await fillEmail()) {
                            logger.log('邮箱填写完成，请等待页面跳转到验证码输入...', 'success');
                        }
                    } catch (error) {
                        logger.log('填写邮箱过程出错: ' + error, 'error');
                    } finally {
                        registerButton.disabled = false;
                        registerButton.textContent = '开始注册';
                        registerButton.style.background = COLORS.secondary;
                    }
                });
            }
        } else if (codeInput) {
            logger.log('检测到验证码输入页面，自动执行验证码填写...');
            try {
                if (await fillVerificationCode()) {
                    logger.log('验证码填写完成，正在完成注册...', 'success');
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    if (await completeRegistration()) {
                        logger.log('===== 注册流程完成！ =====', 'success');
                    }
                }
            } catch (error) {
                logger.log('填写验证码过程出错: ' + error, 'error');
            }
        } else if (termsCheckbox) {
            logger.log('检测到服务条款页面，自动勾选同意框...');
            try {
                if (!termsCheckbox.checked) {
                    termsCheckbox.click();
                    logger.log('已自动勾选服务条款同意框', 'success');
                }

                // 查找并点击注册按钮
                const signupBtn = await waitForElement('button[type="button"]');
                if (signupBtn) {
                    signupBtn.click();
                    logger.log('点击注册按钮完成', 'success');
                }
            } catch (error) {
                logger.log('勾选服务条款过程出错: ' + error, 'error');
            }
        } else {
            logger.log('无法识别当前页面状态', 'warning');
        }
    }

    // 监听页面变化，处理动态加载的内容
    function observePageChanges() {
        let debounceTimer = null;
        let observerActive = true;

        const observer = new MutationObserver((mutations) => {
            // 如果复制操作已完成，停止监听以避免性能问题
            if (copyOperationCompleted) {
                if (observerActive) {
                    logger.log('⏭️ 复制操作已完成，停止页面变化监听', 'info');
                    observer.disconnect();
                    observerActive = false;
                }
                return;
            }

            // 防抖处理，避免频繁执行
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            debounceTimer = setTimeout(() => {
                try {
                    // 只在有相关变化时才检查按钮
                    const hasRelevantChanges = mutations.some(mutation =>
                        mutation.type === 'childList' &&
                        mutation.addedNodes.length > 0 &&
                        Array.from(mutation.addedNodes).some(node =>
                            node.nodeType === Node.ELEMENT_NODE &&
                            (node.tagName === 'BUTTON' || node.querySelector('button'))
                        )
                    );

                    if (hasRelevantChanges) {
                        // 检查是否有新的Copy to Clipboard按钮出现
                        const copyButton = Array.from(document.querySelectorAll('button')).find(btn =>
                            btn.textContent.toLowerCase().includes('copy to clipboard') ||
                            btn.textContent.toLowerCase().includes('copy') ||
                            btn.textContent.toLowerCase().includes('复制'));

                        if (copyButton && !copyButton.dataset.processed && !copyOperationCompleted) {
                            copyButton.dataset.processed = 'true';
                            logger.log('检测到新的复制按钮，自动点击...', 'info');
                            setTimeout(() => {
                                handleCopyToClipboard();
                            }, 1000);
                        }
                    }
                } catch (error) {
                    logger.log('页面监听器出错: ' + error.message, 'error');
                }
            }, 500); // 500ms防抖延迟
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 暴露停止监听的方法
        window.stopPageObserver = () => {
            observer.disconnect();
            observerActive = false;
            logger.log('🛑 页面变化监听已手动停止', 'info');
        };

        return observer;
    }

    // 创建Cookie提取工具界面
    function createCookieExtractorUI() {
        logger.log('🛠️ 创建 Cookie 提取工具...', 'info');

        // 创建工具面板
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            top: 150px;
            right: 20px;
            width: 400px;
            background: white;
            border: 2px solid #4CAF50;
            border-radius: 10px;
            padding: 20px;
            z-index: 10001;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
        `;

        panel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4CAF50;">🍪 Cookie 提取工具</h3>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">
                由于 HttpOnly 限制，请手动复制 Request Headers 中的 Cookie
            </p>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                    粘贴 Request Headers 中的 Cookie:
                </label>
                <textarea id="cookieInput" placeholder="粘贴完整的 Cookie 字符串..."
                    style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; resize: vertical;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <button id="extractBtn" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-right: 10px;
                ">提取 _session Cookie</button>
                <button id="closeBtn" style="
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                ">关闭</button>
            </div>
            <div id="result" style="
                background: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                font-size: 12px;
                min-height: 40px;
                display: none;
            "></div>
        `;

        document.body.appendChild(panel);

        // 绑定事件
        const extractBtn = panel.querySelector('#extractBtn');
        const closeBtn = panel.querySelector('#closeBtn');
        const cookieInput = panel.querySelector('#cookieInput');
        const result = panel.querySelector('#result');

        extractBtn.addEventListener('click', async () => {
            const cookieText = cookieInput.value.trim();
            if (!cookieText) {
                result.style.display = 'block';
                result.style.background = '#ffebee';
                result.innerHTML = '❌ 请先粘贴 Cookie 内容';
                return;
            }

            // 提取 _session Cookie
            const sessionMatch = cookieText.match(/_session=([^;]+)/);
            if (sessionMatch) {
                const sessionCookie = sessionMatch[1];

                try {
                    await navigator.clipboard.writeText(sessionCookie);
                    result.style.display = 'block';
                    result.style.background = '#e8f5e8';
                    result.innerHTML = `
                        ✅ 成功提取并复制 _session Cookie！<br>
                        <strong>长度:</strong> ${sessionCookie.length} 字符<br>
                        <strong>格式:</strong> ${sessionCookie.startsWith('eyJ') ? 'JWT (正确)' : '未知格式'}<br>
                        <strong>预览:</strong> ${sessionCookie.substring(0, 50)}...
                    `;

                    logger.log('✅ Cookie 提取工具：成功提取并复制 _session Cookie！', 'success');
                    logger.log('_session=' + sessionCookie, 'info');

                } catch (clipboardError) {
                    result.style.display = 'block';
                    result.style.background = '#fff3e0';
                    result.innerHTML = `
                        ⚠️ 提取成功但复制失败，请手动复制：<br>
                        <textarea readonly style="width: 100%; height: 60px; margin-top: 5px; font-size: 11px;">${sessionCookie}</textarea>
                    `;
                }
            } else {
                result.style.display = 'block';
                result.style.background = '#ffebee';
                result.innerHTML = '❌ 未找到 _session Cookie，请检查粘贴的内容是否正确';
            }
        });

        closeBtn.addEventListener('click', () => {
            panel.remove();
        });

        // 自动聚焦到输入框
        setTimeout(() => cookieInput.focus(), 100);
    }

    // 启动脚本
    main().catch(error => logger.log('脚本执行出错: ' + error, 'error'));

    // 启动页面变化监听
    observePageChanges();
})();