# 🕐 Go-Email 数据库时间点记录

## 📋 时间点书签列表

### 当前活跃时间点
- **时间**: 2025-07-31 15:19 (UTC+8)
- **书签ID**: `000001a0-0000001d-00004f4c-b748ad416e6a44db28f3847d5f427b80`
- **描述**: 添加新域名后的完整备份时间点
- **状态**: ✅ 活跃
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a0-0000001d-00004f4c-b748ad416e6a44db28f3847d5f427b80
  ```

## 📊 数据库状态记录

### 当前配置
- **数据库名**: gomail-database
- **数据库ID**: 6cddafa5-8b18-4ad5-9945-2de44162bf3e
- **支持域名**: 
  - aug.qzz.io (主域名)
  - asksy.dpdns.org
  - v5augment.ggff.net ✨ 新增
  - xm252.qzz.io ✨ 新增
  - augmails.qzz.io ✨ 新增

### 数据库表结构
- ✅ d1_migrations - 迁移记录
- ✅ attachments - 邮件附件
- ✅ emails - 邮件内容
- ✅ mailboxes - 邮箱管理
- ✅ admins - 管理员
- ✅ api_tokens - API令牌
- ✅ token_usage_logs - 使用日志
- ✅ users - 用户管理
- ✅ user_sessions - 用户会话
- ✅ user_mailboxes - 用户邮箱关联
- ✅ user_activity_logs - 用户活动
- ✅ test_mailboxes - 测试邮箱
- ✅ telegram_push_configs - Telegram推送
- ✅ push_logs - 推送日志
- ✅ global_telegram_configs - 全局Telegram配置

## 🔄 时间点使用说明

### 查看可用时间点
```bash
npx wrangler d1 time-travel info gomail-database
```

### 恢复到指定时间点
```bash
# 恢复到当前记录的时间点
npx wrangler d1 time-travel restore gomail-database --bookmark=000001a0-0000001d-00004f4c-b748ad416e6a44db28f3847d5f427b80

# 恢复到指定时间戳
npx wrangler d1 time-travel restore gomail-database --timestamp="2025-07-31T07:19:00Z"
```

### 创建新的时间点
```bash
# 查看当前时间点
npx wrangler d1 time-travel info gomail-database

# 记录新的时间点到此文件
```

## ⚠️ 重要提醒

1. **时间点保留期**: Cloudflare D1的时间点通常保留30天
2. **恢复操作**: 恢复操作会覆盖当前数据库，请谨慎操作
3. **备份建议**: 在恢复前建议先创建当前状态的备份
4. **测试环境**: 建议先在本地或测试环境验证恢复效果

## 📝 变更日志

### 2025-07-31 15:19
- ✅ 添加了3个新域名邮箱支持
- ✅ 重新部署了应用
- ✅ 创建了完整备份
- ✅ 记录了时间点书签

---

**最后更新**: 2025-07-31 15:19  
**维护者**: Go-Email 项目团队

### 2025-07-31 15:25
- **时间**: 2025年 7月31日 星期四 15时25分09秒 CST
- **UTC时间**: 2025-07-31T07:25:09Z
- **书签ID**: `000001a0-00000025-00004f4c-fd17efca111db36b7790537d7badff6c`
- **描述**: 添加新域名并完成部署后的稳定时间点
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a0-00000025-00004f4c-fd17efca111db36b7790537d7badff6c
  ```

### 2025-07-31 15:40
- **时间**: 2025年 7月31日 星期四 15时40分05秒 CST
- **UTC时间**: 2025-07-31T07:40:05Z
- **书签ID**: `000001a0-00000027-00004f4c-b49103806324c9d0b16f27a926245e81`
- **描述**: 添加adtg.qzz.io和amdt.qzz.io两个新域名后的部署
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a0-00000027-00004f4c-b49103806324c9d0b16f27a926245e81
  ```

### 2025-07-31 15:48
- **时间**: 2025年 7月31日 星期四 15时48分00秒 CST
- **UTC时间**: 2025-07-31T07:48:00Z
- **书签ID**: `000001a0-00000085-00004f4c-106b6daf448d51928eed9139fee7d2f5`
- **描述**: 清理id>150的数据并生成200个新邮箱，使用6个备用域名
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a0-00000085-00004f4c-106b6daf448d51928eed9139fee7d2f5
  ```

### 2025-07-31 15:51
- **时间**: 2025年 7月31日 星期四 15时51分50秒 CST
- **UTC时间**: 2025-07-31T07:51:50Z
- **书签ID**: `000001a0-0000009b-00004f4c-7b47be68d03a99054db2a4c6afcb3dbf`
- **描述**: 清空新建200个邮箱的次数字段并设置过期时间
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a0-0000009b-00004f4c-7b47be68d03a99054db2a4c6afcb3dbf
  ```

### 2025-07-31 17:33
- **时间**: 2025年 7月31日 星期四 17时33分02秒 CST
- **UTC时间**: 2025-07-31T09:33:02Z
- **书签ID**: `000001a3-00000008-00004f4c-24c4b64fd3fa444a12d4520a79bb6e19`
- **描述**: 添加生成邮箱按钮功能，支持在页面直接生成测试邮箱
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a3-00000008-00004f4c-24c4b64fd3fa444a12d4520a79bb6e19
  ```

### 2025-07-31 17:38
- **时间**: 2025年 7月31日 星期四 17时38分58秒 CST
- **UTC时间**: 2025-07-31T09:38:58Z
- **书签ID**: `000001a3-00000046-00004f4c-a1f45b3ebfca235b378244583a7cb1c7`
- **描述**: 修复生成邮箱功能的数据库字段映射问题
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a3-00000046-00004f4c-a1f45b3ebfca235b378244583a7cb1c7
  ```

### 2025-07-31 17:42
- **时间**: 2025年 7月31日 星期四 17时42分51秒 CST
- **UTC时间**: 2025-07-31T09:42:51Z
- **书签ID**: `000001a3-00000062-00004f4c-4687b993d2f8ac915f3155f94694cf25`
- **描述**: 修复生成邮箱功能的JSON解析错误，使用fetcher替代fetch
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a3-00000062-00004f4c-4687b993d2f8ac915f3155f94694cf25
  ```

### 2025-07-31 18:09
- **时间**: 2025年 7月31日 星期四 18时09分40秒 CST
- **UTC时间**: 2025-07-31T10:09:40Z
- **书签ID**: `000001a5-00000000-00004f4c-9b61d5b67dabc32bd626d23e9dba4029`
- **描述**: 优化Telegram推送功能，优先发送验证码而不是完整邮件内容
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a5-00000000-00004f4c-9b61d5b67dabc32bd626d23e9dba4029
  ```

### 2025-07-31 18:17
- **时间**: 2025年 7月31日 星期四 18时17分35秒 CST
- **UTC时间**: 2025-07-31T10:17:35Z
- **书签ID**: `000001a5-00000014-00004f4c-7cdacd61c8307cf98601d99c7cb1ca1e`
- **描述**: 优化test-mailboxes-db页面布局，移除批量更新按钮，改进统计信息、Tab导航和筛选区域的布局
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a5-00000014-00004f4c-7cdacd61c8307cf98601d99c7cb1ca1e
  ```

### 2025-07-31 18:36
- **时间**: 2025年 7月31日 星期四 18时36分45秒 CST
- **UTC时间**: 2025-07-31T10:36:45Z
- **书签ID**: `000001a7-0000001c-00004f4c-71845a770341a6d6986c472e5bcc1e30`
- **描述**: 将统计信息和Tab导航改为一行显示，优化页面布局紧凑性
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a7-0000001c-00004f4c-71845a770341a6d6986c472e5bcc1e30
  ```

### 2025-07-31 18:41
- **时间**: 2025年 7月31日 星期四 18时41分28秒 CST
- **UTC时间**: 2025-07-31T10:41:28Z
- **书签ID**: `000001a7-0000003a-00004f4c-225ac3b0ed3b26474a3cd82485721f27`
- **描述**: 将统计信息和Tab导航设置为固定位置，不随页面滚动
- **状态**: ✅ 已保存
- **恢复命令**: 
  ```bash
  wrangler d1 time-travel restore gomail-database --bookmark=000001a7-0000003a-00004f4c-225ac3b0ed3b26474a3cd82485721f27
  ```
