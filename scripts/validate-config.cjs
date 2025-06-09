#!/usr/bin/env node

/**
 * 🔍 配置验证脚本
 * 
 * 验证 config.cjs 中的配置是否完整和正确
 * 运行: node scripts/validate-config.cjs
 */

const fs = require('fs');
const path = require('path');

// 读取配置
const config = require('../config.cjs');

// 验证规则
const validationRules = [
  {
    path: 'project.name',
    required: true,
    type: 'string',
    description: '项目名称'
  },
  {
    path: 'project.displayName',
    required: true,
    type: 'string',
    description: '项目显示名称'
  },
  {
    path: 'domain.primary',
    required: true,
    type: 'string',
    pattern: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    description: '主域名'
  },
  {
    path: 'cloudflare.database.name',
    required: true,
    type: 'string',
    description: '数据库名称'
  },
  {
    path: 'cloudflare.database.id',
    required: true,
    type: 'string',
    pattern: /^[a-f0-9-]{36}$/,
    description: '数据库ID (UUID格式)'
  },
  {
    path: 'cloudflare.kv.id',
    required: true,
    type: 'string',
    pattern: /^[a-f0-9]{32}$/,
    description: 'KV命名空间ID'
  },
  {
    path: 'secrets.sessionSecret',
    required: true,
    type: 'string',
    minLength: 32,
    description: 'Session密钥 (至少32字符)'
  },
  {
    path: 'secrets.baiduAnalytics.id',
    required: false,
    type: 'string',
    pattern: /^[a-f0-9]{32}$/,
    description: '百度统计ID'
  },
  {
    path: 'secrets.googleAdsense.clientId',
    required: false,
    type: 'string',
    pattern: /^ca-pub-\d+$/,
    description: 'Google AdSense 客户端ID (格式: ca-pub-xxxxxxxxxx)'
  },
  {
    path: 'secrets.googleAdsense.adSlots.headerBanner.slotId',
    required: false,
    type: 'string',
    pattern: /^\d+$/,
    description: '顶部横幅广告位ID'
  },
  {
    path: 'secrets.googleAdsense.adSlots.sidebar.slotId',
    required: false,
    type: 'string',
    pattern: /^\d+$/,
    description: '侧边栏广告位ID'
  },
  {
    path: 'secrets.googleAdsense.adSlots.inContent.slotId',
    required: false,
    type: 'string',
    pattern: /^\d+$/,
    description: '内容广告位ID'
  }
];

// 获取嵌套对象的值
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

// 验证单个配置项
function validateConfigItem(rule) {
  const value = getNestedValue(config, rule.path);
  const errors = [];

  // 检查必需项
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push(`${rule.description} (${rule.path}) 是必需的`);
    return errors;
  }

  // 如果值不存在且不是必需的，跳过其他验证
  if (value === undefined || value === null || value === '') {
    return errors;
  }

  // 检查类型
  if (rule.type && typeof value !== rule.type) {
    errors.push(`${rule.description} (${rule.path}) 应该是 ${rule.type} 类型，当前是 ${typeof value}`);
  }

  // 检查模式
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    errors.push(`${rule.description} (${rule.path}) 格式不正确: ${value}`);
  }

  // 检查最小长度
  if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
    errors.push(`${rule.description} (${rule.path}) 长度至少需要 ${rule.minLength} 字符，当前是 ${value.length} 字符`);
  }

  return errors;
}

// 验证域名一致性
function validateDomainConsistency() {
  const errors = [];
  const primaryDomain = config.domain.primary;
  const emailDomain = config.cloudflare.email.domain;

  if (primaryDomain !== emailDomain) {
    errors.push(`主域名 (${primaryDomain}) 与邮件域名 (${emailDomain}) 不一致`);
  }

  return errors;
}

// 检查生成的文件是否存在
function checkGeneratedFiles() {
  const errors = [];
  const requiredFiles = [
    'wrangler.jsonc',
    '.dev.vars',
    'app/config/app.ts'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      errors.push(`生成的文件不存在: ${file} (运行 'pnpm run generate-configs' 生成)`);
    }
  }

  return errors;
}

// 主验证函数
function validateConfig() {
  console.log('🔍 正在验证配置...\n');

  let allErrors = [];

  // 验证基本配置项
  for (const rule of validationRules) {
    const errors = validateConfigItem(rule);
    allErrors = allErrors.concat(errors);
  }

  // 验证域名一致性
  const domainErrors = validateDomainConsistency();
  allErrors = allErrors.concat(domainErrors);

  // 检查生成的文件
  const fileErrors = checkGeneratedFiles();
  allErrors = allErrors.concat(fileErrors);

  // 输出结果
  if (allErrors.length === 0) {
    console.log('✅ 配置验证通过！');
    console.log('\n📋 当前配置概览:');
    console.log(`   项目名称: ${config.project.displayName}`);
    console.log(`   主域名: ${config.domain.primary}`);
    console.log(`   数据库: ${config.cloudflare.database.name}`);
    console.log(`   KV存储: ${config.cloudflare.kv.name}`);
    console.log(`   R2存储: ${config.cloudflare.r2.name}`);
    console.log(`   百度统计: ${config.secrets.baiduAnalytics.enabled ? '启用' : '禁用'}`);
    
    console.log('\n💡 下一步:');
    console.log('   1. 确保所有 Cloudflare 资源已创建');
    console.log('   2. 设置环境变量: wrangler secret put SESSION_SECRET');
    console.log('   3. 运行数据库迁移: pnpm run db:migrate');
    console.log('   4. 部署应用: pnpm run deploy');
  } else {
    console.log('❌ 配置验证失败:\n');
    for (const error of allErrors) {
      console.log(`   • ${error}`);
    }
    console.log('\n💡 修复建议:');
    console.log('   1. 编辑 config.cjs 文件修复上述问题');
    console.log('   2. 运行 pnpm run generate-configs 重新生成配置文件');
    console.log('   3. 再次运行此验证脚本');
    process.exit(1);
  }
}

if (require.main === module) {
  validateConfig();
}

module.exports = { validateConfig };
