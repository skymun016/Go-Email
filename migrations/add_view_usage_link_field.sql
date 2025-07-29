-- 添加 view_usage_link 字段到 test_mailboxes 表
-- 用于存储 View usage 按钮的链接地址

-- 添加新字段
ALTER TABLE test_mailboxes ADD COLUMN view_usage_link TEXT;

-- 添加注释说明
-- view_usage_link: 存储订阅页面中 View usage 按钮的链接地址，用于跟踪用户的使用情况页面
