# 🚀 GoMail 配置和部署指南

## 📋 配置文件设置

### 1. 创建配置文件

```bash
# 复制配置模板
cp config.example.cjs config.cjs
```

### 2. 编辑配置文件

打开 `config.cjs` 文件，按照以下说明填入你的配置：

#### 🌐 域名配置
```javascript
domain: {
  primary: "your-domain.com",        // 替换为你的域名
  website: "your-domain.com",        // 网站域名
},
```

#### ☁️ Cloudflare 资源配置
```javascript
cloudflare: {
  database: {
    binding: "DB",                   // 保持不变
  },
  kv: {
    binding: "your-kv-namespace",    // 你的KV命名空间名称
  },
  r2: {
    binding: "your-r2-bucket",       // 你的R2存储桶名称
    bucketName: "your-r2-bucket",    // 你的R2存储桶名称
  },
  email: {
    domain: "your-domain.com",       // 你的邮件域名
  },
},
```

#### 📊 可选配置 (AdSense和统计)
```javascript
secrets: {
  googleAdsense: {
    clientId: "ca-pub-xxxxxxxxxxxxxxxxx",  // 你的AdSense客户端ID
    enabled: true,                         // 是否启用广告
  },
  baiduAnalytics: {
    id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // 你的百度统计ID
    enabled: true,                          // 是否启用统计
  },
},
```

## 🔧 Cloudflare 资源创建

### 1. 创建数据库
```bash
wrangler d1 create gomail-db
```

### 2. 创建KV命名空间
```bash
wrangler kv:namespace create "gomail-sessions"
```

### 3. 创建R2存储桶
```bash
wrangler r2 bucket create gomail-attachments
```

## 📧 邮件路由配置

1. 在Cloudflare Dashboard中进入你的域名
2. 点击 "Email" → "Email Routing"
3. 启用Email Routing
4. 添加MX记录 (通常会自动添加)
5. 配置Catch-all规则转发到Worker

## 🚀 部署步骤

### 1. 生成配置文件
```bash
npm run generate-configs
```

### 2. 数据库迁移
```bash
wrangler d1 execute DB --file=./app/db/migrations/0000_tired_slayback.sql
wrangler d1 execute DB --file=./app/db/migrations/0001_shocking_gladiator.sql
wrangler d1 execute DB --file=./app/db/migrations/0002_performance_optimization.sql
```

### 3. 创建管理员账号
```bash
npm run init-admin
```

### 4. 部署应用
```bash
npm run deploy
```

## ⚠️ 重要提醒

- ❌ **不要提交** `config.cjs` 文件到Git
- ❌ **不要提交** 自动生成的配置文件
- ✅ **只提交** `config.example.cjs` 模板文件
- ✅ **确保** `.gitignore` 包含所有隐私文件

## 🔒 隐私保护

以下文件包含隐私信息，已在 `.gitignore` 中排除：
- `config.cjs` - 主配置文件
- `app/config/app.ts` - 自动生成的应用配置
- `wrangler.jsonc` - Cloudflare配置
- `.dev.vars` - 开发环境变量
- `DEPLOYMENT.md` - 自动生成的部署指南

## 🆘 获取帮助

如果遇到问题：
1. 检查配置文件格式是否正确
2. 确认Cloudflare资源已正确创建
3. 查看部署日志中的错误信息
4. 加入QQ群 1017212982 寻求帮助
