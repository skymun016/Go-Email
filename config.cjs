/**
 * 🚀 GoMail 项目统一配置文件
 *
 * 只需要修改这个文件，就能完成整个项目的配置和部署
 * 所有其他配置文件都会基于这个文件自动生成
 */

module.exports = {
  // 🏷️ 项目基本信息
  project: {
    name: "gomail-app",
    displayName: "GoMail",
    description: "免费、安全、无广告的临时邮箱服务",
    version: "1.0.0",
    author: "Your Name",
  },

  // 🌐 域名配置
  domain: {
    // 主域名 - 用于邮件接收和网站访问
    primary: "184772.xyz",
    // 网站访问域名（如果不同的话）
    website: "184772.xyz",
  },

  // ☁️ Cloudflare 资源配置
  cloudflare: {
    // D1 数据库配置
    database: {
      name: "gomail-database",
      binding: "DB",
      // 这些 ID 在创建资源后会自动填入，初次部署时可以留空
      id: "63ec8b5e-6181-414e-b211-6ad49bb09c3e",
      previewId: "63ec8b5e-6181-414e-b211-6ad49bb09c3e",
    },

    // KV 存储配置
    kv: {
      name: "gomail-kv",
      binding: "gomail-kv",
      // 这个 ID 在创建资源后会自动填入
      id: "cced8d49e2e9455c89df7f19d9f148d7",
    },

    // R2 存储配置
    r2: {
      name: "gomail-attachments",
      binding: "gomail-attachments",
    },

    // Email Workers 配置
    email: {
      domain: "184772.xyz", // 应该与 domain.primary 相同
    },
  },

  // 🔐 环境变量配置
  secrets: {
    // Session 密钥 - 运行 `openssl rand -base64 32` 生成
    sessionSecret: "AqVx9BFitbs47wFzgUjXTZh0L+I/fKQnXoQzA/cKuyw=",

    // 百度统计配置
    baiduAnalytics: {
      id: "355b8986398209e644715a515d608df3",
      enabled: true,
    },

    // Google AdSense 配置
    googleAdsense: {
      clientId: "ca-pub-7869843338158511", // 您的 AdSense 客户端ID
      enabled: false,
      // 广告位配置
      adSlots: {
        // 页面顶部横幅广告
        headerBanner: {
          slotId: "1234567890", // 替换为您的广告位ID
          format: "auto",
          responsive: true,
        },
        // 侧边栏广告
        sidebar: {
          slotId: "0987654321", // 替换为您的广告位ID
          format: "rectangle",
          responsive: true,
        },
        // 文章内容广告
        inContent: {
          slotId: "1122334455", // 替换为您的广告位ID
          format: "fluid",
          responsive: true,
        },
      },
    },
  },

  // 👤 管理员配置
  admin: {
    // 管理员账号配置 - 可以配置多个管理员
    accounts: [
      {
        username: "admin",
        password: "admin123456", // 建议使用强密码
      },
      // 可以添加更多管理员账号
      // {
      //   username: "admin2",
      //   password: "another_strong_password",
      // },
    ],
  },

  // 📁 目录配置
  paths: {
    migrations: "./app/db/migrations",
    assets: "./build/client",
    workers: "./workers/app.ts",
  },

  // 🛠️ 开发配置
  development: {
    port: 5173,
    host: "localhost",
  },

  // 🚀 部署配置
  deployment: {
    // Cloudflare Workers 兼容性日期
    compatibilityDate: "2025-04-04",
    // 是否启用观测性
    observability: true,
  },

  // 📧 邮件配置
  email: {
    // 邮箱有效期（小时）
    expirationHours: 24,
    // 自动清理间隔（小时）
    cleanupIntervalHours: 1,
    // 最大附件大小（MB）
    maxAttachmentSizeMB: 25,
  },

  // 🎨 UI 配置
  ui: {
    // 主题色
    primaryColor: "#2563eb",
    // 自动刷新间隔（秒）
    autoRefreshInterval: 10,
    // 品牌名称
    brandName: "GoMail",
    // 标语
    tagline: "临时邮箱服务",
  },

  // 📊 SEO 配置
  seo: {
    title: "GoMail - 免费临时邮箱生成器 | 一次性邮箱地址生成 | 24小时有效保护隐私",
    description: "GoMail提供最专业的免费临时邮箱服务，无需注册即可获得一次性邮件地址。24小时有效期，支持附件下载，完全匿名保护隐私。告别垃圾邮件，立即免费使用临时邮箱！",
    keywords: "GoMail,临时邮箱,一次性邮箱,临时邮件,临时email,免费邮箱,隐私保护,垃圾邮件防护,临时邮箱网站,免费临时邮箱,临时邮箱服务,24小时邮箱,无需注册邮箱",
    ogImage: "/og-image.png",
    twitterCard: "summary_large_image",
  },

  // 🔧 功能开关
  features: {
    // 是否启用附件功能
    attachments: true,
    // 是否启用邮件预览
    emailPreview: true,
    // 是否启用统计功能
    analytics: true,
    // 是否启用开发模式邮件处理器
    devEmailHandler: true,
  },
};
