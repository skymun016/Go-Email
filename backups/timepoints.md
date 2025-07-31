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
