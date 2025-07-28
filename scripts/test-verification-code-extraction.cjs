/**
 * 测试验证码提取功能
 * 验证从邮件内容中提取验证码的各种场景
 */

/**
 * 从邮件内容中提取验证码
 * 支持多种常见的验证码格式
 */
function extractVerificationCode(textContent, htmlContent) {
  if (!textContent && !htmlContent) return null;
  
  // 合并文本内容和HTML内容进行搜索
  const content = `${textContent || ''} ${htmlContent || ''}`;
  
  // 定义多种验证码匹配模式
  const patterns = [
    // "Your verification code is: 123456"
    /(?:verification code|验证码)(?:\s*is)?(?:\s*[:：])\s*(\d{6})/i,
    // "验证码：123456"
    /验证码[:：]\s*(\d{6})/i,
    // "Code: 123456"
    /code[:：]\s*(\d{6})/i,
    // "OTP: 123456"
    /otp[:：]\s*(\d{6})/i,
    // "PIN: 123456"
    /pin[:：]\s*(\d{6})/i,
    // 独立的6位数字（更宽泛的匹配）
    /\b(\d{6})\b/,
  ];
  
  // 按优先级尝试匹配
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * 测试用例
 */
const testCases = [
  {
    name: "标准英文格式",
    textContent: "Your verification code is: 255625",
    expected: "255625"
  },
  {
    name: "中文格式",
    textContent: "您的验证码：123456",
    expected: "123456"
  },
  {
    name: "Code格式",
    textContent: "Code: 789012",
    expected: "789012"
  },
  {
    name: "OTP格式",
    textContent: "Your OTP is 345678",
    expected: "345678"
  },
  {
    name: "PIN格式",
    textContent: "PIN: 567890",
    expected: "567890"
  },
  {
    name: "HTML内容",
    htmlContent: "<p>Your verification code is: <strong>111222</strong></p>",
    expected: "111222"
  },
  {
    name: "复杂HTML",
    htmlContent: `
      <div>
        <h2>Welcome to Augment Code</h2>
        <p>Your verification code is: <span style="font-weight: bold;">333444</span></p>
        <p>If you are having any issues with your account, please don't hesitate to contact us.</p>
      </div>
    `,
    expected: "333444"
  },
  {
    name: "混合内容",
    textContent: "Please use this code to verify your account.",
    htmlContent: "<p>Verification code: 555666</p>",
    expected: "555666"
  },
  {
    name: "无验证码",
    textContent: "This is a regular email without any verification code.",
    expected: null
  },
  {
    name: "多个数字但只有一个6位",
    textContent: "Your account number is 12345 and verification code is: 777888. Thank you!",
    expected: "777888"
  },
  {
    name: "实际邮件示例",
    textContent: `
      Your verification code is: 255625

      If you are having any issues with your account, please don't hesitate to contact us by replying to this mail.

      Thanks!
      Augment Code
    `,
    expected: "255625"
  },
  {
    name: "带空格的格式",
    textContent: "verification code is : 999000",
    expected: "999000"
  },
  {
    name: "大小写混合",
    textContent: "Your VERIFICATION CODE is: 888777",
    expected: "888777"
  }
];

/**
 * 运行测试
 */
function runTests() {
  console.log('🧪 开始测试验证码提取功能...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const result = extractVerificationCode(testCase.textContent, testCase.htmlContent);
    const passed = result === testCase.expected;
    
    if (passed) {
      console.log(`✅ 测试 ${index + 1}: ${testCase.name}`);
      console.log(`   结果: ${result || 'null'}`);
      passedTests++;
    } else {
      console.log(`❌ 测试 ${index + 1}: ${testCase.name}`);
      console.log(`   期望: ${testCase.expected || 'null'}`);
      console.log(`   实际: ${result || 'null'}`);
      if (testCase.textContent) {
        console.log(`   文本: "${testCase.textContent.replace(/\n/g, '\\n')}"`);
      }
      if (testCase.htmlContent) {
        console.log(`   HTML: "${testCase.htmlContent.replace(/\n/g, '\\n')}"`);
      }
      failedTests++;
    }
    console.log('');
  });
  
  console.log('📊 测试结果:');
  console.log(`   通过: ${passedTests}/${testCases.length}`);
  console.log(`   失败: ${failedTests}/${testCases.length}`);
  console.log(`   成功率: ${(passedTests / testCases.length * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查正则表达式模式。');
  }
}

/**
 * 交互式测试
 */
function interactiveTest() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🔍 交互式验证码提取测试');
  console.log('输入邮件内容，程序将尝试提取验证码（输入 "exit" 退出）:\n');
  
  function askForInput() {
    rl.question('邮件内容: ', (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }
      
      const result = extractVerificationCode(input, null);
      if (result) {
        console.log(`✅ 找到验证码: ${result}\n`);
      } else {
        console.log(`❌ 未找到验证码\n`);
      }
      
      askForInput();
    });
  }
  
  askForInput();
}

/**
 * 生成测试邮件内容
 */
function generateTestEmails() {
  console.log('\n📧 生成测试邮件内容示例:\n');
  
  const templates = [
    {
      name: "Augment Code 验证邮件",
      content: `Your verification code is: 123456

If you are having any issues with your account, please don't hesitate to contact us by replying to this mail.

Thanks!
Augment Code`
    },
    {
      name: "GitHub 验证邮件",
      content: `[GitHub] Please verify your device

Your verification code is: 789012

If you did not request this code, please ignore this email.`
    },
    {
      name: "微信验证邮件",
      content: `微信验证码

您的验证码：456789

请在10分钟内完成验证，如非本人操作请忽略此邮件。`
    }
  ];
  
  templates.forEach((template, index) => {
    console.log(`${index + 1}. ${template.name}:`);
    console.log('---');
    console.log(template.content);
    console.log('---');
    
    const extracted = extractVerificationCode(template.content, null);
    console.log(`提取结果: ${extracted || '未找到'}\n`);
  });
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  
  switch (command) {
    case 'test':
      runTests();
      break;
    case 'interactive':
      interactiveTest();
      break;
    case 'generate':
      generateTestEmails();
      break;
    case 'all':
      runTests();
      generateTestEmails();
      break;
    default:
      console.log('用法:');
      console.log('  node scripts/test-verification-code-extraction.cjs test        # 运行自动测试');
      console.log('  node scripts/test-verification-code-extraction.cjs interactive # 交互式测试');
      console.log('  node scripts/test-verification-code-extraction.cjs generate    # 生成测试邮件');
      console.log('  node scripts/test-verification-code-extraction.cjs all         # 运行所有测试');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  extractVerificationCode,
  testCases,
  runTests
};
