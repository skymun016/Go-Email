# Telegram 推送功能设置指南

## 功能概述

Telegram 推送功能允许用户在收到新邮件时自动接收 Telegram 通知。该功能基于 Telegram Bot API 实现，支持：

- 📧 新邮件实时推送通知
- ⚙️ 灵活的推送配置管理
- 📊 推送历史记录和状态跟踪
- 🔒 安全的配置存储和验证

## 快速开始

### 1. 创建 Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 命令
3. 按提示设置 Bot 名称和用户名
4. 获取 Bot Token（格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

### 2. 获取 Chat ID

#### 方法一：通过 API 获取
1. 向你的 Bot 发送任意消息
2. 访问：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. 在响应中找到 `chat.id` 字段

#### 方法二：使用 @userinfobot
1. 在 Telegram 中找到 [@userinfobot](https://t.me/userinfobot)
2. 发送任意消息获取你的 Chat ID

### 3. 配置推送

1. 登录到邮箱管理页面
2. 选择要配置推送的邮箱
3. 在右侧设置面板中找到"Telegram 推送设置"
4. 点击"立即配置"
5. 输入 Bot Token 和 Chat ID
6. 点击"保存配置"
7. 使用"测试推送"功能验证配置

## 技术实现

### 核心组件

#### 1. TelegramPushService (`app/lib/telegram-push.ts`)
- 负责与 Telegram Bot API 交互
- 提供邮件通知格式化
- 支持配置验证和连接测试

#### 2. 数据库表结构
```sql
-- Telegram 推送配置表
telegram_push_configs (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL,
  bot_token TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)

-- 推送日志表
push_logs (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  push_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at INTEGER NOT NULL
)
```

#### 3. API 路由 (`app/routes/api.telegram-push.ts`)
- `GET /api/telegram-push?email=<email>` - 获取推送配置
- `POST /api/telegram-push` - 管理推送配置
  - `action=save` - 保存配置
  - `action=test` - 测试推送
  - `action=toggle` - 启用/禁用
  - `action=delete` - 删除配置

#### 4. 用户界面 (`app/components/TelegramPushSettings.tsx`)
- 推送配置管理界面
- 实时状态显示
- 配置验证和测试功能

### 邮件处理流程集成

邮件处理流程在 `workers/app.ts` 中的 `sendTelegramNotification` 函数：

1. 邮件存储成功后触发
2. 查询邮箱的推送配置
3. 异步发送推送通知（不阻塞邮件处理）
4. 记录推送结果到日志表

## 消息格式

推送消息采用 HTML 格式，包含：

```html
📧 <b>新邮件通知</b>

<b>发件人:</b> sender@example.com
<b>收件人:</b> user@augmails.com
<b>主题:</b> 邮件主题
<b>时间:</b> 2025-01-30 10:30:00

<b>内容预览:</b>
邮件内容的前200个字符...

---
<i>来自 AugMails 邮件服务</i>
```

## 安全考虑

1. **Token 安全**
   - Bot Token 加密存储
   - 前端仅显示脱敏的 Token
   - API 响应不包含完整 Token

2. **权限控制**
   - 用户只能管理自己邮箱的推送配置
   - 严格的邮箱所有权验证

3. **错误处理**
   - 推送失败不影响邮件接收
   - 详细的错误日志记录
   - 自动重试机制（待实现）

## 故障排除

### 常见问题

#### 1. Bot Token 无效
- **症状**：保存配置时提示"Bot Token 验证失败"
- **解决**：检查 Token 格式，确保从 @BotFather 获取的是完整 Token

#### 2. Chat ID 错误
- **症状**：测试推送失败，提示"chat not found"
- **解决**：确保 Chat ID 是数字格式，先向 Bot 发送消息建立会话

#### 3. 推送不工作
- **症状**：收到邮件但没有推送通知
- **解决**：
  1. 检查推送配置是否启用
  2. 查看推送日志确认错误信息
  3. 验证 Bot 是否被阻止或删除

#### 4. 消息格式问题
- **症状**：推送消息显示异常
- **解决**：检查邮件内容是否包含特殊字符，系统会自动转义 HTML

### 调试工具

1. **测试脚本**：使用 `test-telegram-push.js` 进行本地测试
2. **API 测试**：直接调用 `/api/telegram-push` 接口
3. **日志查看**：检查 `push_logs` 表中的错误信息

## 性能优化

1. **异步处理**：推送操作不阻塞邮件接收流程
2. **批量处理**：支持批量推送（待实现）
3. **缓存机制**：配置信息缓存减少数据库查询
4. **日志清理**：定期清理过期的推送日志

## 扩展功能

### 计划中的功能
- [ ] 推送模板自定义
- [ ] 推送频率限制
- [ ] 多 Bot 支持
- [ ] 推送统计分析
- [ ] 失败重试机制
- [ ] Webhook 推送支持

### 集成其他服务
- Discord 推送
- 企业微信推送
- 邮件转发推送
- SMS 推送

## API 参考

### 获取推送配置
```http
GET /api/telegram-push?email=user@example.com
```

### 保存推送配置
```http
POST /api/telegram-push
Content-Type: application/x-www-form-urlencoded

action=save&email=user@example.com&botToken=123:ABC&chatId=456&enabled=true
```

### 测试推送
```http
POST /api/telegram-push
Content-Type: application/x-www-form-urlencoded

action=test&email=user@example.com
```

## 更新日志

### v1.0.0 (2025-01-30)
- ✅ 基础推送功能实现
- ✅ 配置管理界面
- ✅ API 接口完整
- ✅ 数据库表结构
- ✅ 邮件处理流程集成
- ✅ 安全验证机制

---

如有问题或建议，请联系开发团队或提交 Issue。
