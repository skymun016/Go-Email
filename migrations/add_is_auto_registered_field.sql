-- 添加 is_auto_registered 字段到 test_mailboxes 表
-- 用于标识邮箱是否通过自动注册脚本完成注册

ALTER TABLE test_mailboxes 
ADD COLUMN is_auto_registered INTEGER DEFAULT 0 NOT NULL;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_test_mailboxes_is_auto_registered 
ON test_mailboxes(is_auto_registered);

-- 创建复合索引，优化按注册方式和状态查询
CREATE INDEX IF NOT EXISTS idx_test_mailboxes_auto_reg_status 
ON test_mailboxes(is_auto_registered, registration_status);
