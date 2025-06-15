#!/usr/bin/env node

/**
 * 修复构建后的 wrangler.json 配置
 * 添加 nodejs_compat 兼容性标志
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wranglerJsonPath = path.join(__dirname, '../build/server/wrangler.json');

if (fs.existsSync(wranglerJsonPath)) {
  try {
    // 读取现有配置
    const config = JSON.parse(fs.readFileSync(wranglerJsonPath, 'utf8'));

    // 添加 nodejs_compat 标志
    config.compatibility_flags = ['nodejs_compat'];

    // 写回文件
    fs.writeFileSync(wranglerJsonPath, JSON.stringify(config));

    console.log('✅ 已修复 build/server/wrangler.json 配置');
    console.log('   添加了 nodejs_compat 兼容性标志');
  } catch (error) {
    console.error('❌ 修复配置失败:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ 找不到 build/server/wrangler.json 文件');
  console.error('   请先运行 npm run build');
  process.exit(1);
}
