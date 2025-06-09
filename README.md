# Smail - 临时邮箱服务

一个基于 React Router v7 和 Cloudflare Workers 构建的现代化临时邮箱服务。

## 🌟 功能特性

- 🚀 **快速生成**: 一键生成临时邮箱地址
- 📧 **实时接收**: 即时接收和查看邮件
- 🔒 **隐私保护**: 邮箱到期后自动删除数据
- 📱 **响应式设计**: 完美适配桌面和移动设备
- ⚡️ **无服务器架构**: 基于 Cloudflare Workers，全球加速
- 🗄️ **现代化技术栈**: React Router v7、TypeScript、TailwindCSS
- 📊 **数据存储**: 使用 Cloudflare D1 数据库和 R2 对象存储

## 🛠️ 技术栈

- **前端**: React Router v7, TypeScript, TailwindCSS
- **后端**: Cloudflare Workers, Email Workers
- **数据库**: Cloudflare D1 (SQLite)
- **存储**: Cloudflare R2 (附件存储)
- **ORM**: Drizzle ORM
- **邮件解析**: postal-mime

## ⚠️ 重要修复说明

在部署之前，请确保已经应用了以下关键修复：

### 1. 数据库连接修复
**文件**: `app/lib/db.ts`
- 移除了有问题的 `import { env } from "cloudflare:workers"`
- 修改 `createDB` 函数要求必须传递数据库参数
- 修复了环境变量访问问题

### 2. Session 配置修复
**文件**: `app/.server/session.ts`
- 重构为工厂函数模式，避免环境变量导入问题
- 所有 session 函数现在需要传递 `env` 参数

### 3. 路由文件修复
**文件**: `app/routes/home.tsx`
- 更新所有 session 调用以正确传递环境变量
- 确保数据库连接正确传递参数

### 4. 环境变量配置
需要在 Cloudflare Workers 中设置 `SESSION_SECRET` 环境变量

## 🚀 完整部署流程

### 第一步：环境准备

#### 1.1 安装依赖
```bash
pnpm install
```

#### 1.2 配置本地环境变量
```bash
# 复制环境变量示例文件
cp .dev.vars.example .dev.vars

# 生成 Session 密钥
openssl rand -base64 32

# 编辑 .dev.vars 文件，填入生成的密钥
# SESSION_SECRET=你生成的密钥
```

### 第二步：Cloudflare 资源创建

#### 2.1 登录 Cloudflare
```bash
# 登录 Cloudflare 账户
wrangler auth login
```

#### 2.2 创建 D1 数据库
```bash
# 创建数据库
wrangler d1 create gomail-database

# 记录返回的数据库 ID，更新到 wrangler.jsonc 中
```

#### 2.3 创建 KV 命名空间
```bash
# 创建 KV 存储
wrangler kv namespace create "gomail-kv"

# 记录返回的 KV ID，更新到 wrangler.jsonc 中
```

#### 2.4 创建 R2 存储桶
```bash
# 创建 R2 存储桶
wrangler r2 bucket create gomail-attachments

# 存储桶名称会自动配置到 wrangler.jsonc 中
```

#### 2.5 配置邮件路由
```bash
# 在 Cloudflare Dashboard 中配置邮件路由
# 1. 进入 Email Routing 页面
# 2. 添加你的域名（如 184772.xyz）
# 3. 配置 MX 记录
# 4. 启用 Email Workers
```

### 第三步：数据库设置

#### 3.1 生成迁移文件
```bash
pnpm run db:generate
```

#### 3.2 应用数据库迁移
```bash
# 本地开发环境
pnpm run db:migrate

# 生产环境
wrangler d1 migrations apply gomail-database
```

### 第四步：环境变量配置

#### 4.1 设置 Session Secret
```bash
# 设置 SESSION_SECRET 环境变量
wrangler secret put SESSION_SECRET

# 输入之前生成的密钥
```

#### 4.2 验证环境变量
```bash
# 查看已设置的环境变量
wrangler secret list
```

### 第五步：构建和部署

#### 5.1 构建项目
```bash
pnpm run build
```

#### 5.2 部署到 Cloudflare Workers
```bash
wrangler deploy
```

#### 5.3 验证部署
```bash
# 检查部署状态
wrangler deployments list

# 查看实时日志
wrangler tail
```

### 第六步：本地开发（可选）

#### 6.1 启动开发服务器
```bash
pnpm dev
```

#### 6.2 测试邮件功能
```bash
# 发送测试邮件
pnpm run test:email

# 发送自定义测试邮件
pnpm run test:email:custom mytest@184772.xyz sender@example.com 5173 true
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. "Database not available" 错误
**原因**: 数据库连接参数未正确传递
**解决方案**: 
- 确保 `wrangler.jsonc` 中的数据库配置正确
- 检查 `createDB` 函数调用是否传递了 `env.DB` 参数

#### 2. "Imported HMAC key length (0)" 错误
**原因**: `SESSION_SECRET` 环境变量未设置
**解决方案**:
```bash
# 生成新的密钥
openssl rand -base64 32

# 设置环境变量
wrangler secret put SESSION_SECRET
```

#### 3. "no such table: mailboxes" 错误
**原因**: 数据库迁移未执行
**解决方案**:
```bash
# 本地环境
pnpm run db:migrate

# 生产环境
wrangler d1 migrations apply gomail-database
```

#### 4. 邮件接收失败
**检查项**:
- 确认域名的 MX 记录配置正确
- 检查 Email Workers 是否启用
- 验证邮件路由规则配置

#### 5. 附件下载失败
**检查项**:
- 确认 R2 存储桶创建成功
- 检查 R2 存储桶权限配置
- 验证附件上传状态

### 调试命令

```bash
# 查看实时日志
wrangler tail

# 检查数据库内容
wrangler d1 execute gomail-database --command="SELECT * FROM mailboxes LIMIT 5;"
wrangler d1 execute gomail-database --command="SELECT * FROM emails LIMIT 5;"

# 查看环境变量
wrangler secret list

# 查看部署状态
wrangler deployments list
```

## 📦 项目结构

```
smail/
├── app/                    # React Router 应用
│   ├── .server/           # 服务端代码
│   │   └── session.ts     # Session 管理（已修复）
│   ├── components/        # React 组件
│   ├── db/               # 数据库相关
│   │   ├── migrations/   # 数据库迁移文件
│   │   └── schema.ts     # 数据库模式
│   ├── lib/              # 工具库
│   │   └── db.ts         # 数据库操作（已修复）
│   └── routes/           # 路由页面
│       └── home.tsx      # 主页（已修复）
├── workers/              # Cloudflare Workers
│   ├── app.ts           # 主 Worker（处理 HTTP 请求和邮件）
│   └── email.ts         # 邮件处理 Worker
├── docs/                # 文档
├── wrangler.jsonc       # Cloudflare Workers 配置
└── .dev.vars.example    # 环境变量示例
```

## 🧪 本地开发和测试

### 发送测试邮件

```bash
# 快速发送测试邮件
pnpm run test:email

# 发送自定义测试邮件（带附件）
pnpm run test:email:custom [收件人] [发件人] [端口] [是否包含附件]

# 例如：
pnpm run test:email:custom mytest@184772.xyz sender@example.com 5173 true
```

### 数据库管理

```bash
# 查看迁移状态
pnpm run db:list

# 重置数据库（清空所有数据）
pnpm run db:reset

# 重新应用迁移
pnpm run db:migrate
```

详细的本地开发指南请查看：[docs/local-development.md](docs/local-development.md)

## 🔧 配置文件说明

### wrangler.jsonc 配置示例

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "gomail-app",
  "compatibility_date": "2025-04-04",
  "main": "./workers/app.ts",
  "observability": {
    "enabled": true
  },
  "send_email": [
    {
      "name": "184772.xyz"  // 替换为你的域名
    }
  ],
  "kv_namespaces": [
    {
      "binding": "gomail-kv",
      "id": "你的KV命名空间ID"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "gomail-database",
      "database_id": "你的数据库ID",
      "preview_database_id": "你的预览数据库ID",
      "migrations_dir": "./app/db/migrations"
    }
  ],
  "r2_buckets": [
    {
      "binding": "gomail_attachments",
      "bucket_name": "gomail-attachments",
      "preview_bucket_name": "gomail-attachments"
    }
  ],
  "assets": {
    "directory": "./build/client"
  }
}
```

### 环境变量配置

| 变量名 | 说明 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `SESSION_SECRET` | 用户会话加密密钥 | `openssl rand -base64 32` | `AqVx9BFitbs47wFzgUjXTZh0L+I/fKQnXoQzA/cKuyw=` |
| `BAIDU_ANALYTICS_ID` | 百度统计ID | 百度统计后台获取 | `1234567890abcdef` |
| `ENABLE_ANALYTICS` | 是否启用统计 | 手动设置 | `true` 或 `false` |

### 百度统计配置

#### 1. 获取百度统计ID
1. 访问 [百度统计](https://tongji.baidu.com/)
2. 登录并创建新站点
3. 进入 **管理** -> **代码获取**
4. 复制代码中的ID（形如：`hm.js?后面的字符串`）

#### 2. 配置环境变量
```bash
# 本地开发环境（.dev.vars）
BAIDU_ANALYTICS_ID=你的百度统计ID
ENABLE_ANALYTICS=true

# 生产环境
wrangler secret put BAIDU_ANALYTICS_ID
# 输入你的百度统计ID

wrangler secret put ENABLE_ANALYTICS
# 输入 true
```

#### 3. 验证配置
- 部署后访问网站，检查页面源码是否包含百度统计代码
- 在百度统计后台查看实时访客数据
- 页脚会显示"网站统计"链接（仅在配置正确时显示）

### Cloudflare 资源清单

- **D1 数据库**: 存储邮箱和邮件数据
- **R2 存储**: 存储邮件附件
- **KV 存储**: 存储用户会话
- **Email Workers**: 处理入站邮件
- **域名**: 配置邮件路由的域名

## 🚀 快速部署检查清单

在部署前，请确认以下项目已完成：

- [ ] 已安装 `pnpm` 和 `wrangler`
- [ ] 已登录 Cloudflare 账户 (`wrangler auth login`)
- [ ] 已创建 D1 数据库并更新配置
- [ ] 已创建 KV 命名空间并更新配置
- [ ] 已创建 R2 存储桶
- [ ] 已配置域名的 MX 记录
- [ ] 已设置 `SESSION_SECRET` 环境变量
- [ ] 已执行数据库迁移
- [ ] 已成功构建项目 (`pnpm run build`)
- [ ] 已成功部署 (`wrangler deploy`)

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. 检查上述故障排除部分
2. 查看 Cloudflare Workers 日志 (`wrangler tail`)
3. 确认所有配置文件正确
4. 提交 Issue 并附上错误日志

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

使用 ❤️ 和 React Router v7 构建 - GoMail 临时邮箱服务。
