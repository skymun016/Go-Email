#!/usr/bin/env node

/**
 * 项目初始化脚本
 * 为新用户自动设置必要的配置文件
 */

const fs = require('fs');
const path = require('path');

function initProject() {
  console.log('🚀 初始化 GoMail 项目...\n');

  // 1. 检查并复制 config.cjs
  if (!fs.existsSync('config.cjs')) {
    if (fs.existsSync('config.example.cjs')) {
      fs.copyFileSync('config.example.cjs', 'config.cjs');
      console.log('✅ 已创建 config.cjs (从模板复制)');
      console.log('⚠️  请编辑 config.cjs 填入你的配置信息');
    } else {
      console.error('❌ 找不到 config.example.cjs 模板文件');
      process.exit(1);
    }
  } else {
    console.log('✅ config.cjs 已存在');
  }

  // 2. 检查并复制 app/config/app.ts
  const appConfigPath = 'app/config/app.ts';
  const appConfigExamplePath = 'app/config/app.example.ts';
  
  if (!fs.existsSync(appConfigPath)) {
    if (fs.existsSync(appConfigExamplePath)) {
      // 确保目录存在
      const configDir = path.dirname(appConfigPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.copyFileSync(appConfigExamplePath, appConfigPath);
      console.log('✅ 已创建 app/config/app.ts (从模板复制)');
      console.log('⚠️  请运行 npm run generate-configs 生成正确的配置');
    } else {
      console.error('❌ 找不到 app/config/app.example.ts 模板文件');
      process.exit(1);
    }
  } else {
    console.log('✅ app/config/app.ts 已存在');
  }

  console.log('\n🎉 项目初始化完成！');
  console.log('\n📋 下一步操作：');
  console.log('1. 编辑 config.cjs 填入你的配置');
  console.log('2. 运行 npm run generate-configs');
  console.log('3. 按照 SETUP.md 进行部署');
}

if (require.main === module) {
  initProject();
}

module.exports = { initProject };
