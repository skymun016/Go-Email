-- 创建全局 Telegram 推送配置表
CREATE TABLE IF NOT EXISTS global_telegram_configs (
    id TEXT PRIMARY KEY,
    bot_token TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_global_telegram_configs_enabled ON global_telegram_configs(enabled);
