/**
 * 🚀 GoMail 配置模板文件
 *
 * 📋 使用步骤：
 * 1. 复制此文件为 config.cjs：cp config.example.cjs config.cjs
 * 2. 根据下面的说明修改配置
 * 3. 运行 npm run generate-configs 生成配置文件
 * 4. 部署到 Cloudflare
 */

module.exports = {
  // 🏷️ 项目基本信息
  project: {
    name: "gomail-app",                              // 项目名称（保持不变）
    displayName: "GoMail",                           // 显示名称（可修改）
    description: "免费、安全、无广告的临时邮箱服务",    // 项目描述
    version: "1.0.0",
  },

  // 🌐 域名配置 - 这是最重要的配置部分
  domain: {
    // 主域名 - 必须配置
    primary: "your-domain.com",                      // 🔥 替换为你的主域名

    // 网站访问域名（通常与主域名相同）
    website: "your-domain.com",                      // 🔥 替换为你的网站域名

    // 🌟 多域名支持（可选）- 添加备用域名提高可用性
    additional: [
      // "backup-domain.com",                       // 备用域名1
      // "another-domain.xyz",                      // 备用域名2
      // "subdomain.dpdns.org",                     // 免费子域名
    ],

    // 域名选择策略
    strategy: "smart",                               // smart(智能) | random(随机) | manual(手动)

    /* 域名策略说明：
     * - smart: 智能选择，80%使用备用域名，20%使用主域名（推荐）
     * - random: 完全随机选择所有域名
     * - manual: 用户手动选择域名
     */
  },

  // ☁️ Cloudflare 资源配置
  cloudflare: {
    // D1 数据库配置
    database: {
      name: "gomail-database",                       // 数据库名称
      binding: "DB",                                 // 绑定名称（保持不变）
      // 部署后会自动填入：
      // id: "your-database-id",
      // previewId: "your-preview-database-id",
    },

    // KV 存储配置
    kv: {
      name: "gomail-kv",                            // KV命名空间名称
      binding: "gomail-kv",                         // 绑定名称
      // 部署后会自动填入：
      // id: "your-kv-namespace-id",
    },

    // R2 对象存储配置（用于存储邮件附件）
    r2: {
      name: "gomail-attachments",                   // R2存储桶名称
      binding: "gomail-attachments",               // 绑定名称
    },

    // 邮件配置 - 重要！
    email: {
      domain: "your-domain.com",                    // 🔥 主邮件域名（与 domain.primary 保持一致）

      // 支持的所有邮件域名（自动生成，包含主域名+额外域名）
      supportedDomains: [
        "your-domain.com",                          // 主域名
        // 如果配置了 domain.additional，会自动添加到这里
      ],
    },
  },

  // 📧 邮件服务配置
  email: {
    expirationHours: 24,               // 邮箱过期时间(小时)
    cleanupIntervalHours: 1,           // 清理间隔(小时)
    maxAttachmentSizeMB: 25,           // 最大附件大小(MB)
  },

  // 🎨 UI 配置
  ui: {
    primaryColor: "#2563eb",           // 主题色
    autoRefreshInterval: 10,           // 自动刷新间隔(秒)
    brandName: "GoMail",               // 品牌名称
    tagline: "临时邮箱服务",           // 标语
  },

  // 📊 统计和广告配置 (可选)
  secrets: {
    // Google AdSense 配置
    googleAdsense: {
      clientId: "ca-pub-xxxxxxxxxxxxxxxxx",  // 替换为你的AdSense客户端ID
      enabled: false,                        // 是否启用广告
    },
    // 百度统计配置
    baiduAnalytics: {
      id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // 替换为你的百度统计ID
      enabled: false,                         // 是否启用统计
    },
  },

  // 📞 联系信息
  contact: {
    email: "your-email@example.com",   // 替换为你的联系邮箱
    qqGroup: "1234567890",             // 替换为你的QQ群号
  },

  // 🔧 开发配置
  development: {
    port: 5173,                        // 开发服务器端口
    host: "localhost",                 // 开发服务器主机
  },
};

/*
📚 配置示例：

🔹 单域名配置（最简单）：
domain: {
  primary: "example.com",
  website: "example.com",
  strategy: "smart",
},

🔹 多域名配置（推荐）：
domain: {
  primary: "example.com",
  website: "example.com",
  additional: [
    "backup.example.com",
    "mail.example.org",
  ],
  strategy: "smart",
},

🔹 完整多域名配置：
domain: {
  primary: "main-domain.com",
  website: "main-domain.com",
  additional: [
    "backup1.com",
    "backup2.net",
    "subdomain.dpdns.org",
    "another.xyz",
  ],
  strategy: "random",  // 随机选择所有域名
},

📋 部署步骤：
1. 复制配置：cp config.example.cjs config.cjs
2. 修改域名：编辑 config.cjs 中的域名配置
3. 生成配置：npm run generate-configs
4. 构建项目：npm run build
5. 部署项目：npx wrangler deploy
6. 配置域名：在 Cloudflare 中设置 DNS 和 Email Routing

💡 提示：
- 主域名必须配置，额外域名可选
- 所有域名都需要在 Cloudflare 中配置 Email Routing
- 建议使用 smart 策略来分散主域名负载
- 更多详细说明请查看 SETUP.md
*/
