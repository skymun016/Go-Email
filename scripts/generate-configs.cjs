#!/usr/bin/env node

/**
 * 🚀 配置文件生成器
 *
 * 根据 config.js 自动生成所有必要的配置文件
 * 运行: pnpm run generate-configs
 */

const fs = require('fs');
const path = require('path');

// 读取主配置文件
const config = require('../config.cjs');

// 生成 wrangler.jsonc
function generateWranglerConfig() {
  const wranglerConfig = {
    "$schema": "node_modules/wrangler/config-schema.json",
    "name": config.project.name,
    "compatibility_date": config.deployment.compatibilityDate,
    "compatibility_flags": ["nodejs_compat"],
    "main": config.paths.workers,
    "observability": {
      "enabled": config.deployment.observability
    },
    "send_email": [
      {
        "name": config.cloudflare.email.domain
      }
    ],
    "kv_namespaces": [
      {
        "binding": config.cloudflare.kv.binding,
        "id": config.cloudflare.kv.id
      }
    ],
    "d1_databases": [
      {
        "binding": config.cloudflare.database.binding,
        "database_name": config.cloudflare.database.name,
        "database_id": config.cloudflare.database.id,
        "preview_database_id": config.cloudflare.database.previewId,
        "migrations_dir": config.paths.migrations
      }
    ],
    "r2_buckets": [
      {
        "binding": config.cloudflare.r2.binding,
        "bucket_name": config.cloudflare.r2.name,
        "preview_bucket_name": config.cloudflare.r2.name
      }
    ],
    "assets": {
      "directory": config.paths.assets
    }
  };

  const content = JSON.stringify(wranglerConfig, null, 2);
  fs.writeFileSync('wrangler.jsonc', content);
  console.log('✅ 已生成 wrangler.jsonc');
}

// 生成 .dev.vars
function generateDevVars() {
  const devVars = `# 本地开发环境变量配置
# 由 scripts/generate-configs.js 自动生成

# Session 密钥 - 用于用户会话加密
SESSION_SECRET=${config.secrets.sessionSecret}

# 百度统计配置
BAIDU_ANALYTICS_ID=${config.secrets.baiduAnalytics.id}
ENABLE_ANALYTICS=${config.secrets.baiduAnalytics.enabled}
`;

  fs.writeFileSync('.dev.vars', devVars);
  console.log('✅ 已生成 .dev.vars');
}

// 生成 app/config/app.ts
function generateAppConfig() {
  const appConfig = `// 应用配置文件
// 由 scripts/generate-configs.js 自动生成，请勿手动修改

export const APP_CONFIG = {
  project: {
    name: "${config.project.name}",
    displayName: "${config.project.displayName}",
    description: "${config.project.description}",
    version: "${config.project.version}",
  },

  domain: {
    primary: "${config.domain.primary}",
    website: "${config.domain.website}",
    additional: ${JSON.stringify(config.domain.additional || [])},
    strategy: "${config.domain.strategy || 'smart'}",
  },

  cloudflare: {
    database: {
      binding: "${config.cloudflare.database.binding}",
    },
    kv: {
      binding: "${config.cloudflare.kv.binding}",
    },
    r2: {
      binding: "${config.cloudflare.r2.binding}",
      bucketName: "${config.cloudflare.r2.name}",
    },
    email: {
      domain: "${config.cloudflare.email.domain}",
      supportedDomains: ${JSON.stringify(config.cloudflare.email.supportedDomains || [config.cloudflare.email.domain])},
    },
  },

  email: {
    expirationHours: ${config.email.expirationHours},
    cleanupIntervalHours: ${config.email.cleanupIntervalHours},
    maxAttachmentSizeMB: ${config.email.maxAttachmentSizeMB},
  },

  ui: {
    primaryColor: "${config.ui.primaryColor}",
    autoRefreshInterval: ${config.ui.autoRefreshInterval},
    brandName: "${config.ui.brandName}",
    tagline: "${config.ui.tagline}",
  },

  seo: {
    title: "${config.seo.title}",
    description: "${config.seo.description}",
    keywords: "${config.seo.keywords}",
    ogImage: "${config.seo.ogImage}",
    twitterCard: "${config.seo.twitterCard}",
  },

  features: {
    attachments: ${config.features.attachments},
    emailPreview: ${config.features.emailPreview},
    analytics: ${config.features.analytics},
    devEmailHandler: ${config.features.devEmailHandler},
  },

  analytics: {
    baiduId: "${config.secrets.baiduAnalytics.id}",
    enabled: ${config.secrets.baiduAnalytics.enabled},
  },

  adsense: {
    clientId: "${config.secrets.googleAdsense.clientId}",
    enabled: ${config.secrets.googleAdsense.enabled},
    adSlots: {
      headerBanner: {
        slotId: "${config.secrets.googleAdsense.adSlots.headerBanner.slotId}",
        format: "${config.secrets.googleAdsense.adSlots.headerBanner.format}",
        responsive: ${config.secrets.googleAdsense.adSlots.headerBanner.responsive},
      },
      sidebar: {
        slotId: "${config.secrets.googleAdsense.adSlots.sidebar.slotId}",
        format: "${config.secrets.googleAdsense.adSlots.sidebar.format}",
        responsive: ${config.secrets.googleAdsense.adSlots.sidebar.responsive},
      },
      inContent: {
        slotId: "${config.secrets.googleAdsense.adSlots.inContent.slotId}",
        format: "${config.secrets.googleAdsense.adSlots.inContent.format}",
        responsive: ${config.secrets.googleAdsense.adSlots.inContent.responsive},
      },
    },
  },

  admin: {
    accounts: ${JSON.stringify(config.admin.accounts, null, 4)},
  },
} as const;

// 运行时环境变量访问器
export function getKVNamespace(env: Env): KVNamespace {
  const kv = env[APP_CONFIG.cloudflare.kv.binding as keyof Env] as KVNamespace;
  if (!kv) {
    throw new Error(\`KV namespace '\${APP_CONFIG.cloudflare.kv.binding}' not found in environment\`);
  }
  return kv;
}

export function getDatabase(env: Env): D1Database {
  const db = env[APP_CONFIG.cloudflare.database.binding as keyof Env] as D1Database;
  if (!db) {
    throw new Error(\`Database '\${APP_CONFIG.cloudflare.database.binding}' not found in environment\`);
  }
  return db;
}

export function getR2Bucket(env: Env): R2Bucket {
  const bucket = env[APP_CONFIG.cloudflare.r2.binding as keyof Env] as R2Bucket;
  if (!bucket) {
    throw new Error(\`R2 bucket '\${APP_CONFIG.cloudflare.r2.binding}' not found in environment\`);
  }
  return bucket;
}

export function getEmailSender(env: Env): SendEmail {
  const sender = env[APP_CONFIG.cloudflare.email.domain as keyof Env] as SendEmail;
  if (!sender) {
    throw new Error(\`Email sender '\${APP_CONFIG.cloudflare.email.domain}' not found in environment\`);
  }
  return sender;
}
`;

  // 确保目录存在
  const configDir = path.join('app', 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(path.join(configDir, 'app.ts'), appConfig);
  console.log('✅ 已生成 app/config/app.ts');
}

// 更新 package.json 中的数据库命令
function updatePackageJsonScripts() {
  const packageJsonPath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // 更新数据库相关的脚本命令
  packageJson.scripts['db:migrate'] = `wrangler d1 migrations apply ${config.cloudflare.database.name}`;
  packageJson.scripts['db:migrate:remote'] = `wrangler d1 migrations apply ${config.cloudflare.database.name} --remote`;
  packageJson.scripts['db:list'] = `wrangler d1 migrations list ${config.cloudflare.database.name}`;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ 已更新 package.json 中的数据库命令');
}

// 生成部署说明文档
function generateDeploymentGuide() {
  const guide = `# 🚀 GoMail 一键部署指南

## 📋 配置概览

当前配置基于 \`config.js\` 文件自动生成：

- **项目名称**: ${config.project.displayName}
- **主域名**: ${config.domain.primary}
- **数据库**: ${config.cloudflare.database.name}
- **KV存储**: ${config.cloudflare.kv.name}
- **R2存储**: ${config.cloudflare.r2.name}

## 🛠️ 部署步骤

### 1. 修改配置
编辑 \`config.js\` 文件，修改以下关键配置：
- \`domain.primary\`: 您的域名
- \`secrets.sessionSecret\`: 运行 \`openssl rand -base64 32\` 生成
- \`secrets.baiduAnalytics.id\`: 您的百度统计ID

### 2. 生成配置文件
\`\`\`bash
pnpm run generate-configs
\`\`\`

### 3. 登录 Cloudflare
\`\`\`bash
wrangler auth login
\`\`\`

### 4. 创建 Cloudflare 资源
\`\`\`bash
# 创建 D1 数据库
wrangler d1 create ${config.cloudflare.database.name}

# 创建 KV 命名空间
wrangler kv namespace create "${config.cloudflare.kv.name}"

# 创建 R2 存储桶
wrangler r2 bucket create ${config.cloudflare.r2.name}
\`\`\`

### 5. 更新资源 ID
将上述命令返回的 ID 更新到 \`config.js\` 中的对应字段，然后重新运行：
\`\`\`bash
pnpm run generate-configs
\`\`\`

### 6. 设置环境变量
\`\`\`bash
wrangler secret put SESSION_SECRET
wrangler secret put BAIDU_ANALYTICS_ID
wrangler secret put ENABLE_ANALYTICS
\`\`\`

### 7. 数据库迁移
\`\`\`bash
pnpm run db:generate
pnpm run db:migrate
\`\`\`

### 8. 部署
\`\`\`bash
pnpm run deploy
\`\`\`

## 🔄 更新配置

当您需要修改配置时：
1. 编辑 \`config.js\`
2. 运行 \`pnpm run generate-configs\`
3. 重新部署 \`pnpm run deploy\`

## 📞 支持

如有问题，请检查：
1. 所有 Cloudflare 资源是否正确创建
2. 环境变量是否正确设置
3. 域名 MX 记录是否正确配置
`;

  fs.writeFileSync('DEPLOYMENT.md', guide);
  console.log('✅ 已生成 DEPLOYMENT.md');
}

// 主函数
function main() {
  console.log('🚀 正在生成配置文件...\n');

  try {
    generateWranglerConfig();
    generateDevVars();
    generateAppConfig();
    updatePackageJsonScripts();
    generateDeploymentGuide();

    console.log('\n🎉 所有配置文件生成完成！');
    console.log('\n📋 生成的文件：');
    console.log('  - wrangler.jsonc');
    console.log('  - .dev.vars');
    console.log('  - app/config/app.ts');
    console.log('  - package.json (更新了数据库命令)');
    console.log('  - DEPLOYMENT.md');
    console.log('\n💡 下一步：');
    console.log('  1. 检查并修改 config.js 中的配置');
    console.log('  2. 按照 DEPLOYMENT.md 中的步骤进行部署');

  } catch (error) {
    console.error('❌ 生成配置文件失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateWranglerConfig, generateDevVars, generateAppConfig };
