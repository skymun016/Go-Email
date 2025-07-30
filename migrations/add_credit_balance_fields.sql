-- 添加Credit balance相关字段
-- 执行时间: 2025-07-29

-- 添加credit_balance字段，存储Credit balance数值
ALTER TABLE test_mailboxes ADD COLUMN credit_balance INTEGER;

-- 添加credit_balance_updated_at字段，存储最后更新时间
ALTER TABLE test_mailboxes ADD COLUMN credit_balance_updated_at INTEGER;

-- 添加注释说明
-- credit_balance: 存储用户的Credit balance数值（如125）
-- credit_balance_updated_at: 存储Credit balance最后更新的时间戳
