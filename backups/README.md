# 🗄️ Go-Email 数据库备份与恢复指南

## 📋 快速命令参考

### 🔄 时间点管理
```bash
# 查看当前时间点
npm run db:timepoint:info

# 保存当前时间点
npm run db:timepoint:save "描述信息"

# 恢复时间点（交互式）
npm run db:timepoint:restore

# 查看所有已保存的时间点
npm run db:timepoint list
```

### 📦 数据库备份
```bash
# 创建完整备份
npm run db:backup

# 手动备份到指定文件
npx wrangler d1 export gomail-database --remote --output backup-custom.sql
```

### 🔄 数据库恢复
```bash
# 从备份文件恢复
npx wrangler d1 execute gomail-database --file=backups/backup-20250731-151934.sql

# 从时间点恢复
npx wrangler d1 time-travel restore gomail-database --bookmark=BOOKMARK_ID
```

## 📁 文件结构

```
backups/
├── README.md                    # 本文档
├── timepoints.md               # 时间点记录
├── backup-20250731-151934.sql # 完整数据库备份
└── ...                        # 其他备份文件
```

## 🕐 当前重要时间点

### 最新稳定时间点
- **书签ID**: `000001a0-00000025-00004f4c-fd17efca111db36b7790537d7badff6c`
- **时间**: 2025-07-31 15:25 (CST)
- **描述**: 添加新域名并完成部署后的稳定时间点
- **恢复命令**:
  ```bash
  npx wrangler d1 time-travel restore gomail-database --bookmark=000001a0-00000025-00004f4c-fd17efca111db36b7790537d7badff6c
  ```

### 初始备份时间点
- **书签ID**: `000001a0-0000001d-00004f4c-b748ad416e6a44db28f3847d5f427b80`
- **时间**: 2025-07-31 15:19 (CST)
- **描述**: 添加新域名后的完整备份时间点

## 🚨 紧急恢复流程

### 1. 快速恢复到最新稳定状态
```bash
# 恢复到最新稳定时间点
npx wrangler d1 time-travel restore gomail-database --bookmark=000001a0-00000025-00004f4c-fd17efca111db36b7790537d7badff6c
```

### 2. 从备份文件恢复
```bash
# 恢复最新备份
npx wrangler d1 execute gomail-database --file=backups/backup-20250731-151934.sql
```

### 3. 验证恢复结果
```bash
# 检查数据库状态
npx wrangler d1 execute gomail-database --command="SELECT COUNT(*) as total_mailboxes FROM mailboxes;"

# 检查域名配置
npx wrangler d1 execute gomail-database --command="SELECT DISTINCT substr(email, instr(email, '@')+1) as domain FROM mailboxes LIMIT 10;"
```

## 📊 数据库状态

### 当前配置
- **数据库名**: gomail-database
- **数据库ID**: 6cddafa5-8b18-4ad5-9945-2de44162bf3e
- **支持域名**: 5个
  - aug.qzz.io (主域名)
  - asksy.dpdns.org
  - v5augment.ggff.net ✨
  - xm252.qzz.io ✨
  - augmails.qzz.io ✨

### 表结构
- 15个数据表
- 完整的用户管理系统
- Telegram推送功能
- API令牌管理

## ⚠️ 重要注意事项

1. **时间点保留期**: Cloudflare D1的时间点通常保留30天
2. **恢复操作**: 恢复操作会完全覆盖当前数据库
3. **备份频率**: 建议在重要变更前创建备份
4. **测试恢复**: 定期测试备份和恢复流程

## 🔧 高级操作

### 只备份表结构
```bash
npx wrangler d1 export gomail-database --remote --no-data --output schema-only.sql
```

### 只备份数据
```bash
npx wrangler d1 export gomail-database --remote --no-schema --output data-only.sql
```

### 备份特定表
```bash
npx wrangler d1 export gomail-database --remote --table=mailboxes --output mailboxes-only.sql
```

### 查看数据库信息
```bash
npx wrangler d1 info gomail-database
```

## 📞 故障排除

### 常见问题

1. **时间点恢复失败**
   - 检查书签ID是否正确
   - 确认时间点未过期（30天内）
   - 尝试使用备份文件恢复

2. **备份文件损坏**
   - 使用时间点恢复功能
   - 检查其他备份文件

3. **权限问题**
   - 确认已登录Cloudflare: `npx wrangler whoami`
   - 重新登录: `npx wrangler login`

### 联系支持
如遇到无法解决的问题，请联系项目维护团队。

---

**最后更新**: 2025-07-31 15:25  
**维护者**: Go-Email 项目团队
