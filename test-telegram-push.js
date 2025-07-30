/**
 * 测试 Telegram 推送功能
 */

// 测试配置
const TEST_CONFIG = {
  // 请替换为你的实际 Bot Token 和 Chat ID
  botToken: "YOUR_BOT_TOKEN_HERE",
  chatId: "YOUR_CHAT_ID_HERE",
  enabled: true
};

// 模拟邮件数据
const TEST_EMAIL = {
  from: "test@example.com",
  to: "user@augmails.com",
  subject: "测试邮件 - Telegram 推送功能",
  textContent: "这是一封测试邮件，用于验证 Telegram 推送功能是否正常工作。\n\n邮件内容包含多行文本，测试格式化效果。",
  receivedAt: new Date(),
  mailboxEmail: "user@augmails.com"
};

// 导入推送服务（需要在实际环境中运行）
async function testTelegramPush() {
  try {
    console.log("🧪 开始测试 Telegram 推送功能...");
    
    // 这里需要导入实际的推送服务
    // const { createTelegramPushService } = require('./app/lib/telegram-push');
    
    console.log("📋 测试配置:");
    console.log("- Bot Token:", TEST_CONFIG.botToken.replace(/^(\d+:)(.{4}).*(.{4})$/, '$1$2****$3'));
    console.log("- Chat ID:", TEST_CONFIG.chatId);
    console.log("- 启用状态:", TEST_CONFIG.enabled);
    
    console.log("\n📧 测试邮件:");
    console.log("- 发件人:", TEST_EMAIL.from);
    console.log("- 收件人:", TEST_EMAIL.to);
    console.log("- 主题:", TEST_EMAIL.subject);
    console.log("- 内容长度:", TEST_EMAIL.textContent.length, "字符");
    
    // 创建推送服务实例
    // const pushService = createTelegramPushService(TEST_CONFIG);
    
    // 测试连接
    // console.log("\n🔗 测试 Bot 连接...");
    // const connectionTest = await pushService.testConnection();
    // console.log("连接测试结果:", connectionTest);
    
    // 发送邮件通知
    // console.log("\n📤 发送邮件通知...");
    // const notificationResult = await pushService.sendEmailNotification(TEST_EMAIL);
    // console.log("通知发送结果:", notificationResult);
    
    console.log("\n✅ 测试完成！");
    console.log("\n💡 使用说明:");
    console.log("1. 替换 TEST_CONFIG 中的 botToken 和 chatId");
    console.log("2. 在 Node.js 环境中运行此脚本");
    console.log("3. 检查 Telegram 是否收到测试消息");
    
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 配置验证函数
function validateConfig() {
  console.log("🔍 验证配置...");
  
  const issues = [];
  
  if (!TEST_CONFIG.botToken || TEST_CONFIG.botToken === "YOUR_BOT_TOKEN_HERE") {
    issues.push("❌ Bot Token 未配置");
  } else if (!/^\d+:[A-Za-z0-9_-]{35}$/.test(TEST_CONFIG.botToken)) {
    issues.push("❌ Bot Token 格式不正确");
  } else {
    console.log("✅ Bot Token 格式正确");
  }
  
  if (!TEST_CONFIG.chatId || TEST_CONFIG.chatId === "YOUR_CHAT_ID_HERE") {
    issues.push("❌ Chat ID 未配置");
  } else if (!/^-?\d+$/.test(TEST_CONFIG.chatId)) {
    issues.push("❌ Chat ID 格式不正确（应为数字）");
  } else {
    console.log("✅ Chat ID 格式正确");
  }
  
  if (issues.length > 0) {
    console.log("\n⚠️ 配置问题:");
    issues.forEach(issue => console.log(issue));
    console.log("\n📖 配置指南:");
    console.log("1. 创建 Telegram Bot:");
    console.log("   - 发送 /newbot 给 @BotFather");
    console.log("   - 按提示设置 Bot 名称");
    console.log("   - 获取 Bot Token");
    console.log("\n2. 获取 Chat ID:");
    console.log("   - 发送消息给你的 Bot");
    console.log("   - 访问: https://api.telegram.org/bot<TOKEN>/getUpdates");
    console.log("   - 从响应中找到 chat.id");
    console.log("   - 或使用 @userinfobot 获取个人 Chat ID");
    return false;
  }
  
  console.log("✅ 配置验证通过");
  return true;
}

// 运行测试
if (require.main === module) {
  console.log("🚀 Telegram 推送功能测试工具");
  console.log("=====================================\n");
  
  if (validateConfig()) {
    testTelegramPush();
  }
}

module.exports = {
  testTelegramPush,
  validateConfig,
  TEST_CONFIG,
  TEST_EMAIL
};
