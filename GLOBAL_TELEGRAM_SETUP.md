# 🤖 全局 Telegram 推送配置指南

## 📋 概述

全局 Telegram 推送功能允许超级管理员配置系统级别的邮件转发，将**所有用户的新邮件**自动推送到指定的 Telegram 聊天。

## 🚀 功能特点

- ✅ **全局覆盖**：转发系统中所有用户的邮件（包括匿名邮箱和注册用户邮箱）
- ✅ **实时推送**：邮件到达后立即推送到 Telegram
- ✅ **智能格式化**：包含发件人、收件人、主题和内容预览
- ✅ **错误处理**：推送失败不影响邮件正常接收和存储
- ✅ **日志记录**：完整的推送历史和状态跟踪
- ✅ **安全存储**：Bot Token 安全加密存储

## 🔧 配置步骤

### 第1步：创建 Telegram Bot

1. 在 Telegram 中搜索 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 命令
3. 按提示设置 Bot 名称（如：`AugMails 全局推送Bot`）
4. 设置 Bot 用户名（如：`augmails_global_push_bot`）
5. 获取 Bot Token（格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

### 第2步：获取 Chat ID

**方法一（个人聊天）**：
1. 在 Telegram 中搜索 [@userinfobot](https://t.me/userinfobot)
2. 发送任意消息，获取你的 Chat ID

**方法二（群组聊天）**：
1. 创建一个群组或使用现有群组
2. 将你的 Bot 添加到群组
3. 在群组中使用 [@userinfobot](https://t.me/userinfobot) 获取群组 Chat ID
4. 或者向 Bot 发送消息后访问：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`

### 第3步：配置全局推送

1. **登录管理后台**：
   - 访问：https://gomail-app.amexiaowu.workers.dev/admin-login
   - 使用管理员账户登录

2. **进入全局推送配置**：
   - 在管理仪表板点击"📱 全局推送"按钮
   - 或直接访问：https://gomail-app.amexiaowu.workers.dev/admin/telegram-global

3. **填写配置信息**：
   - **Bot Token**：输入从 BotFather 获取的 Token
   - **Chat ID**：输入接收推送的聊天 ID
   - **启用推送**：确保开关是打开状态

4. **保存并测试**：
   - 点击"保存配置"
   - 点击"测试推送"验证配置是否正确
   - 检查 Telegram 是否收到测试消息

## 📱 推送消息格式

配置成功后，每当系统收到新邮件时，你会在 Telegram 收到如下格式的通知：

```
📧 新邮件通知

发件人: sender@example.com
收件人: user@augmails.com
主题: 重要通知
时间: 2025-01-30 15:30:00

内容预览:
这是邮件内容的前200个字符预览...

---
来自 AugMails 邮件服务
```

## ⚙️ 管理功能

### 启用/禁用推送
- 在配置页面使用"启用推送"/"禁用推送"按钮
- 禁用后不会发送新的推送，但不影响邮件接收

### 修改配置
- 可以随时更新 Bot Token 或 Chat ID
- 修改后建议进行测试推送验证

### 删除配置
- 如需完全停用全局推送，可删除配置
- 删除后需要重新配置才能恢复推送功能

## 🔍 故障排除

### 常见问题

**1. 测试推送失败**
- 检查 Bot Token 格式是否正确
- 确认 Chat ID 是否正确
- 验证 Bot 是否被阻止或删除

**2. 收不到邮件推送**
- 检查全局推送是否启用
- 查看系统日志确认邮件是否正常接收
- 验证 Telegram Bot 状态

**3. Bot Token 无效**
- 重新从 BotFather 获取 Token
- 确保 Token 格式为：`数字:字母数字组合`

**4. Chat ID 错误**
- 个人聊天 ID 通常是正数
- 群组聊天 ID 通常是负数（以 -100 开头）
- 使用 @userinfobot 重新获取正确的 ID

### 技术支持

如果遇到其他问题，请检查：
1. 管理员权限是否正确
2. 数据库连接是否正常
3. Cloudflare Workers 是否正常运行

## 🔒 安全注意事项

1. **Bot Token 保护**：
   - Bot Token 具有完全控制权限，请妥善保管
   - 不要在公开场所分享 Token
   - 如 Token 泄露，立即在 BotFather 中重新生成

2. **Chat ID 隐私**：
   - Chat ID 可以用于向聊天发送消息
   - 建议使用专门的群组接收推送

3. **权限管理**：
   - 只有超级管理员可以配置全局推送
   - 定期检查管理员账户安全

## 📊 监控和日志

系统会自动记录所有推送尝试的日志，包括：
- 推送状态（成功/失败/待处理）
- 错误信息（如果推送失败）
- 推送时间和邮件信息

这些日志有助于监控推送服务的健康状态和排查问题。

---

**部署信息**：
- 应用地址：https://gomail-app.amexiaowu.workers.dev
- 版本：cd5479c9-9ed5-4197-a0b5-94bcb564d86b
- 部署时间：2025-01-30

🎉 **配置完成后，系统将自动转发所有新邮件到你的 Telegram！**
