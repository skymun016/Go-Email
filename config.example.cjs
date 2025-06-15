// GoMail 配置模板文件
// 复制此文件为 config.cjs 并填入你的真实配置

module.exports = {
  // 🏷️ 项目基本信息
  project: {
    name: "gomail-app",
    displayName: "GoMail",
    description: "免费、安全、无广告的临时邮箱服务",
    version: "1.0.0",
  },

  // 🌐 域名配置
  domain: {
    primary: "your-domain.com",        // 替换为你的域名
    website: "your-domain.com",        // 网站域名
  },

  // ☁️ Cloudflare 资源配置
  cloudflare: {
    // 数据库配置
    database: {
      binding: "DB",                   // 保持不变
    },
    // KV 存储配置
    kv: {
      binding: "gomail-kv",           // 替换为你的KV命名空间名称
    },
    // R2 对象存储配置
    r2: {
      binding: "gomail-attachments",   // 替换为你的R2存储桶名称
      bucketName: "gomail-attachments", // 替换为你的R2存储桶名称
    },
    // 邮件配置
    email: {
      domain: "your-domain.com",       // 替换为你的邮件域名
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
