-- Migration: Add Telegram push configuration and logging tables
-- Created: 2025-01-30

-- Telegram 推送配置表
CREATE TABLE IF NOT EXISTS telegram_push_configs (
    id TEXT PRIMARY KEY,
    mailbox_id TEXT NOT NULL,
    bot_token TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);

-- 推送日志表
CREATE TABLE IF NOT EXISTS push_logs (
    id TEXT PRIMARY KEY,
    mailbox_id TEXT NOT NULL,
    email_id TEXT NOT NULL,
    push_type TEXT NOT NULL CHECK (push_type IN ('telegram')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_telegram_push_configs_mailbox_id ON telegram_push_configs(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_mailbox_id ON push_logs(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_email_id ON push_logs(email_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_status ON push_logs(status);
CREATE INDEX IF NOT EXISTS idx_push_logs_created_at ON push_logs(created_at);
