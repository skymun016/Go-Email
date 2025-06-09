# 🚀 GoMail 一键部署指南

## 📋 配置概览

当前配置基于 `config.js` 文件自动生成：

- **项目名称**: GoMail
- **主域名**: 184772.xyz
- **数据库**: gomail-database
- **KV存储**: gomail-kv
- **R2存储**: gomail-attachments

## 🛠️ 部署步骤

### 1. 修改配置
编辑 `config.js` 文件，修改以下关键配置：
- `domain.primary`: 您的域名
- `secrets.sessionSecret`: 运行 `openssl rand -base64 32` 生成
- `secrets.baiduAnalytics.id`: 您的百度统计ID

### 2. 生成配置文件
```bash
pnpm run generate-configs
```

### 3. 登录 Cloudflare
```bash
wrangler auth login
```

### 4. 创建 Cloudflare 资源
```bash
# 创建 D1 数据库
wrangler d1 create gomail-database

# 创建 KV 命名空间
wrangler kv namespace create "gomail-kv"

# 创建 R2 存储桶
wrangler r2 bucket create gomail-attachments
```

### 5. 更新资源 ID
将上述命令返回的 ID 更新到 `config.js` 中的对应字段，然后重新运行：
```bash
pnpm run generate-configs
```

### 6. 设置环境变量
```bash
wrangler secret put SESSION_SECRET
wrangler secret put BAIDU_ANALYTICS_ID
wrangler secret put ENABLE_ANALYTICS
```

### 7. 数据库迁移
```bash
pnpm run db:generate
pnpm run db:migrate
```

### 8. 部署
```bash
pnpm run deploy
```

## 🔄 更新配置

当您需要修改配置时：
1. 编辑 `config.js`
2. 运行 `pnpm run generate-configs`
3. 重新部署 `pnpm run deploy`

## 📞 支持

如有问题，请检查：
1. 所有 Cloudflare 资源是否正确创建
2. 环境变量是否正确设置
3. 域名 MX 记录是否正确配置
