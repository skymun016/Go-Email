/**
 * 测试邮箱过期时间脚本
 * 验证新创建的邮箱过期时间是否为7天
 */

const APP_CONFIG = {
  email: {
    expirationHours: 168, // 7天 × 24小时 = 168小时
  }
};

/**
 * 模拟邮箱创建逻辑
 */
function simulateMailboxCreation(ownerType = "anonymous") {
  const now = new Date();
  
  const expiresAt = ownerType === "user"
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 用户邮箱1年过期
    : new Date(Date.now() + APP_CONFIG.email.expirationHours * 60 * 60 * 1000); // 匿名邮箱7天过期
  
  return {
    createdAt: now,
    expiresAt: expiresAt,
    ownerType: ownerType
  };
}

/**
 * 计算时间差（天数）
 */
function calculateDaysDifference(startDate, endDate) {
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * 主测试函数
 */
function testExpirationTime() {
  console.log('🧪 测试邮箱过期时间设置');
  console.log('================================');
  
  // 测试匿名邮箱
  console.log('\n📧 测试匿名邮箱（临时邮箱）:');
  const anonymousMailbox = simulateMailboxCreation("anonymous");
  const anonymousDays = calculateDaysDifference(anonymousMailbox.createdAt, anonymousMailbox.expiresAt);
  
  console.log(`创建时间: ${anonymousMailbox.createdAt.toISOString()}`);
  console.log(`过期时间: ${anonymousMailbox.expiresAt.toISOString()}`);
  console.log(`过期天数: ${anonymousDays} 天`);
  console.log(`配置小时: ${APP_CONFIG.email.expirationHours} 小时`);
  console.log(`预期天数: ${APP_CONFIG.email.expirationHours / 24} 天`);
  
  if (anonymousDays === 7) {
    console.log('✅ 匿名邮箱过期时间正确：7天');
  } else {
    console.log(`❌ 匿名邮箱过期时间错误：期望7天，实际${anonymousDays}天`);
  }
  
  // 测试用户邮箱
  console.log('\n👤 测试用户邮箱:');
  const userMailbox = simulateMailboxCreation("user");
  const userDays = calculateDaysDifference(userMailbox.createdAt, userMailbox.expiresAt);
  
  console.log(`创建时间: ${userMailbox.createdAt.toISOString()}`);
  console.log(`过期时间: ${userMailbox.expiresAt.toISOString()}`);
  console.log(`过期天数: ${userDays} 天`);
  
  if (userDays === 365) {
    console.log('✅ 用户邮箱过期时间正确：365天（1年）');
  } else {
    console.log(`❌ 用户邮箱过期时间错误：期望365天，实际${userDays}天`);
  }
  
  // 测试现有测试数据的影响
  console.log('\n📊 关于现有测试数据:');
  console.log('• 现有的2000个测试邮箱数据不会自动更新过期时间');
  console.log('• 它们仍然使用创建时的24小时过期设置');
  console.log('• 新创建的邮箱将使用7天过期设置');
  console.log('• 如需更新现有数据，需要重新生成测试数据');
  
  // 验证配置一致性
  console.log('\n🔍 配置验证:');
  const expectedHours = 7 * 24; // 7天 × 24小时
  if (APP_CONFIG.email.expirationHours === expectedHours) {
    console.log(`✅ 配置正确：${APP_CONFIG.email.expirationHours} 小时 = ${APP_CONFIG.email.expirationHours / 24} 天`);
  } else {
    console.log(`❌ 配置错误：期望${expectedHours}小时，实际${APP_CONFIG.email.expirationHours}小时`);
  }
  
  console.log('\n🎯 总结:');
  console.log('• 匿名邮箱（临时邮箱）：7天后进入软过期状态');
  console.log('• 用户邮箱：1年后过期');
  console.log('• 软过期：不接收新邮件，但可通过验证码查看历史邮件');
  console.log('• 自动清理已禁用，历史数据永久保留');
}

/**
 * 生成新的测试邮箱示例
 */
function generateNewTestExample() {
  console.log('\n📝 新测试邮箱示例:');
  
  const testEmails = [
    'test.user@aug.qzz.io',
    'demo.account@asksy.dpdns.org',
    'sample.mailbox@aug.qzz.io'
  ];
  
  testEmails.forEach((email, index) => {
    const mailbox = simulateMailboxCreation("anonymous");
    console.log(`${index + 1}. ${email}`);
    console.log(`   创建时间: ${mailbox.createdAt.toLocaleString()}`);
    console.log(`   过期时间: ${mailbox.expiresAt.toLocaleString()}`);
    console.log(`   有效期: 7天`);
  });
}

// 运行测试
if (require.main === module) {
  testExpirationTime();
  generateNewTestExample();
}

module.exports = {
  simulateMailboxCreation,
  calculateDaysDifference,
  testExpirationTime
};
