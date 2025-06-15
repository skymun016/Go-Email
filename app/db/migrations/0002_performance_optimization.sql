-- 性能优化迁移
-- 添加复合索引以优化常用查询

-- 邮件表的复合索引
CREATE INDEX IF NOT EXISTS `idx_emails_mailbox_received` ON `emails` (`mailbox_id`, `received_at`);
CREATE INDEX IF NOT EXISTS `idx_emails_mailbox_read` ON `emails` (`mailbox_id`, `is_read`);
CREATE INDEX IF NOT EXISTS `idx_emails_from_address` ON `emails` (`from_address`);
CREATE INDEX IF NOT EXISTS `idx_emails_to_address` ON `emails` (`to_address`);

-- API Token表的复合索引
CREATE INDEX IF NOT EXISTS `idx_api_tokens_active_expires` ON `api_tokens` (`is_active`, `expires_at`);
CREATE INDEX IF NOT EXISTS `idx_api_tokens_usage` ON `api_tokens` (`usage_count`, `usage_limit`);

-- 添加邮箱表的额外索引（如果需要）
CREATE INDEX IF NOT EXISTS `idx_mailboxes_active_expires` ON `mailboxes` (`is_active`, `expires_at`);

-- 优化Token使用日志查询
CREATE INDEX IF NOT EXISTS `idx_token_usage_logs_email` ON `token_usage_logs` (`email`);
CREATE INDEX IF NOT EXISTS `idx_token_usage_logs_ip` ON `token_usage_logs` (`ip_address`);
