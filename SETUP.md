# 🚀 GoMail 完整配置和部署指南

## 📋 快速开始

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/xn030523/Go-Email.git
cd Go-Email
npm install
```

### 2. 创建配置文件

```bash
# 复制配置模板
cp config.example.cjs config.cjs
```

## 🌐 域名配置详解

### 🔹 单域名配置（最简单）

如果你只有一个域名，配置非常简单：

```javascript
// config.cjs
module.exports = {
  domain: {
    primary: "example.com",          // 🔥 替换为你的域名
    website: "example.com",          // 网站访问域名
    strategy: "smart",               // 保持默认即可
  },
  // ... 其他配置
};
```

### 🔹 多域名配置（推荐）

多域名可以提高服务可用性，分散负载：

```javascript
// config.cjs
module.exports = {
  domain: {
    primary: "main-domain.com",      // 🔥 主域名
    website: "main-domain.com",      // 网站访问域名
    additional: [                    // 🌟 备用域名列表
      "backup-domain.com",           // 备用域名1
      "mail.example.org",            // 备用域名2
      "temp.dpdns.org",              // 免费子域名
    ],
    strategy: "smart",               // 域名选择策略
  },
  // ... 其他配置
};
```

### 📊 域名选择策略说明

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `smart` | 智能选择：80%使用备用域名，20%使用主域名 | **推荐**，保护主域名 |
| `random` | 随机选择：从所有域名中完全随机选择 | 平均分配负载 |
| `manual` | 手动选择：用户在界面上手动选择域名 | 给用户最大控制权 |

## ☁️ Cloudflare 配置

### 🔧 基础资源配置

```javascript
// config.cjs
cloudflare: {
  database: {
    name: "gomail-database",         // 数据库名称
    binding: "DB",                   // 保持不变
  },
  kv: {
    name: "gomail-kv",              // KV命名空间名称
    binding: "gomail-kv",           // 保持不变
  },
  r2: {
    name: "gomail-attachments",     // R2存储桶名称
    binding: "gomail-attachments", // 保持不变
  },
  email: {
    domain: "your-domain.com",      // 🔥 主邮件域名（与 domain.primary 一致）
    // supportedDomains 会自动生成，包含所有配置的域名
  },
},
```

### 📧 多域名邮件配置示例

配置多域名后，`supportedDomains` 会自动生成：

```javascript
// 如果你配置了：
domain: {
  primary: "main.com",
  additional: ["backup.com", "temp.org"],
}

// 系统会自动生成：
email: {
  domain: "main.com",
  supportedDomains: ["main.com", "backup.com", "temp.org"],
}
```

## 🚀 部署步骤

### 1. 生成配置文件

```bash
# 根据 config.cjs 生成所有配置文件
npm run generate-configs
```

这会自动生成：
- `wrangler.jsonc` - Cloudflare Workers 配置
- `app/config/app.ts` - 应用配置
- `.dev.vars` - 开发环境变量

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库
npx wrangler d1 create gomail-database

# 创建 KV 命名空间
npx wrangler kv:namespace create "gomail-kv"

# 创建 R2 存储桶
npx wrangler r2 bucket create gomail-attachments
```

### 4. 数据库迁移

```bash
# 运行数据库迁移
npm run db:migrate
```

### 5. 创建管理员账号

```bash
npm run init-admin
```

### 6. 构建和部署

```bash
# 构建项目
npm run build

# 部署到 Cloudflare
npx wrangler deploy
```

## 📧 域名邮件配置

### 🔹 单域名邮件配置

对于你配置的每个域名，都需要在 Cloudflare 中设置邮件路由：

1. **进入 Cloudflare Dashboard**
2. **选择你的域名**
3. **点击 "Email" → "Email Routing"**
4. **启用 Email Routing**
5. **添加路由规则**：
   ```
   Catch-all: *@your-domain.com → Send to Worker: gomail-app
   ```

### 🔹 多域名邮件配置

如果你配置了多个域名，需要为每个域名重复上述步骤：

```bash
# 示例：如果你配置了这些域名
domain: {
  primary: "main.com",
  additional: ["backup.com", "temp.org"],
}

# 需要在 Cloudflare 中为每个域名配置 Email Routing：
# 1. main.com → Email Routing → *@main.com → gomail-app
# 2. backup.com → Email Routing → *@backup.com → gomail-app
# 3. temp.org → Email Routing → *@temp.org → gomail-app
```

## 🔍 部署验证

### 测试邮件接收

部署完成后，测试每个域名的邮件接收：

```bash
# 测试主域名
echo "Test email" | mail -s "Test" test@your-main-domain.com

# 测试备用域名
echo "Test email" | mail -s "Test" test@your-backup-domain.com
```

### 检查域名选择

在网站上多次生成邮箱，验证域名选择策略是否正常工作。

## 💡 最佳实践

### 🌟 推荐的域名配置

```javascript
domain: {
  primary: "your-main-domain.com",     // 主域名，用于品牌展示
  additional: [
    "mail.your-domain.com",            // 子域名，专门用于邮件
    "temp.your-domain.com",            // 临时邮件专用域名
    "backup.dpdns.org",                // 免费备用域名
  ],
  strategy: "smart",                   // 保护主域名，优先使用备用域名
}
```

### 🔧 域名管理技巧

1. **主域名保护**：使用 `smart` 策略，减少主域名的邮件负载
2. **备用域名**：至少配置1-2个备用域名，提高可用性
3. **免费域名**：可以使用 dpdns.org 等免费子域名服务
4. **监控告警**：定期检查域名状态和邮件接收情况

## ⚠️ 重要提醒

### 🔒 隐私保护

- ❌ **不要提交** `config.cjs` 文件到 Git
- ❌ **不要提交** 自动生成的配置文件
- ✅ **只提交** `config.example.cjs` 模板文件
- ✅ **确保** `.gitignore` 包含所有隐私文件

### 📁 隐私文件列表

以下文件包含隐私信息，已在 `.gitignore` 中排除：
- `config.cjs` - 主配置文件
- `app/config/app.ts` - 自动生成的应用配置
- `wrangler.jsonc` - Cloudflare 配置
- `.dev.vars` - 开发环境变量

## 🆘 故障排除

### 常见问题

1. **邮件无法接收**
   - 检查 DNS 配置是否正确
   - 验证 Email Routing 设置
   - 查看 Workers 日志

2. **域名选择不生效**
   - 确认 `npm run generate-configs` 已执行
   - 重新部署 Workers
   - 清除浏览器缓存

3. **部署失败**
   - 检查 Cloudflare 资源是否创建成功
   - 验证配置文件格式
   - 查看部署日志错误信息

### 获取帮助

如果遇到问题：
1. 📖 查看本文档的详细说明
2. 🔍 检查配置文件格式是否正确
3. 📊 确认 Cloudflare 资源已正确创建
4. 📝 查看部署日志中的错误信息
5. 💬 加入 QQ 群 1017212982 寻求帮助
6. 🌐 访问在线演示：http://184772.xyz/

---

**🎉 恭喜！你已经成功配置了 GoMail 多域名临时邮箱服务！**
