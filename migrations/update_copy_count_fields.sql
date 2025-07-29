-- 迁移脚本：将copyCount字段拆分为emailCopyCount和linkCopyCount
-- 执行时间：2025-07-29

-- 1. 添加新的字段
ALTER TABLE test_mailboxes ADD COLUMN email_copy_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE test_mailboxes ADD COLUMN link_copy_count INTEGER NOT NULL DEFAULT 0;

-- 2. 将现有的copy_count数据迁移到email_copy_count（假设之前的复制都是邮箱复制）
UPDATE test_mailboxes SET email_copy_count = copy_count WHERE copy_count IS NOT NULL;

-- 3. 删除旧的copy_count字段（可选，如果需要保留历史数据可以不执行这一步）
-- ALTER TABLE test_mailboxes DROP COLUMN copy_count;
