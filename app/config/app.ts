// 应用配置文件
// 由 scripts/generate-configs.js 自动生成，请勿手动修改

export const APP_CONFIG = {
  project: {
    name: "gomail-app",
    displayName: "GoMail",
    description: "免费、安全、无广告的临时邮箱服务",
    version: "1.0.0",
  },

  domain: {
    primary: "184772.xyz",
    website: "184772.xyz",
  },

  cloudflare: {
    database: {
      binding: "DB",
    },
    kv: {
      binding: "gomail-kv",
    },
    r2: {
      binding: "gomail-attachments",
      bucketName: "gomail-attachments",
    },
    email: {
      domain: "184772.xyz",
    },
  },

  email: {
    expirationHours: 24,
    cleanupIntervalHours: 1,
    maxAttachmentSizeMB: 25,
  },

  ui: {
    primaryColor: "#2563eb",
    autoRefreshInterval: 10,
    brandName: "GoMail",
    tagline: "临时邮箱服务",
  },

  seo: {
    title: "GoMail - 免费临时邮箱生成器 | 一次性邮箱地址生成 | 24小时有效保护隐私",
    description: "GoMail提供最专业的免费临时邮箱服务，无需注册即可获得一次性邮件地址。24小时有效期，支持附件下载，完全匿名保护隐私。告别垃圾邮件，立即免费使用临时邮箱！",
    keywords: "GoMail,临时邮箱,一次性邮箱,临时邮件,临时email,免费邮箱,隐私保护,垃圾邮件防护,临时邮箱网站,免费临时邮箱,临时邮箱服务,24小时邮箱,无需注册邮箱",
    ogImage: "/og-image.png",
    twitterCard: "summary_large_image",
  },

  features: {
    attachments: true,
    emailPreview: true,
    analytics: true,
    devEmailHandler: true,
  },

  analytics: {
    baiduId: "355b8986398209e644715a515d608df3",
    enabled: true,
  },

  adsense: {
    clientId: "ca-pub-7869843338158511",
    enabled: false,
    adSlots: {
      headerBanner: {
        slotId: "1234567890",
        format: "auto",
        responsive: true,
      },
      sidebar: {
        slotId: "0987654321",
        format: "rectangle",
        responsive: true,
      },
      inContent: {
        slotId: "1122334455",
        format: "fluid",
        responsive: true,
      },
    },
  },

  admin: {
    accounts: [
    {
        "username": "admin",
        "password": "admin123456"
    }
],
  },
} as const;

// 运行时环境变量访问器
export function getKVNamespace(env: Env): KVNamespace {
  const kv = env[APP_CONFIG.cloudflare.kv.binding as keyof Env] as KVNamespace;
  if (!kv) {
    throw new Error(`KV namespace '${APP_CONFIG.cloudflare.kv.binding}' not found in environment`);
  }
  return kv;
}

export function getDatabase(env: Env): D1Database {
  const db = env[APP_CONFIG.cloudflare.database.binding as keyof Env] as D1Database;
  if (!db) {
    throw new Error(`Database '${APP_CONFIG.cloudflare.database.binding}' not found in environment`);
  }
  return db;
}

export function getR2Bucket(env: Env): R2Bucket {
  const bucket = env[APP_CONFIG.cloudflare.r2.binding as keyof Env] as R2Bucket;
  if (!bucket) {
    throw new Error(`R2 bucket '${APP_CONFIG.cloudflare.r2.binding}' not found in environment`);
  }
  return bucket;
}

export function getEmailSender(env: Env): SendEmail {
  const sender = env[APP_CONFIG.cloudflare.email.domain as keyof Env] as SendEmail;
  if (!sender) {
    throw new Error(`Email sender '${APP_CONFIG.cloudflare.email.domain}' not found in environment`);
  }
  return sender;
}
