-- 创建测试邮箱表
CREATE TABLE IF NOT EXISTS test_mailboxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    verification_code TEXT NOT NULL,
    domain TEXT NOT NULL,
    prefix TEXT NOT NULL,
    direct_link TEXT NOT NULL,
    copy_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_test_mailboxes_email ON test_mailboxes(email);
CREATE INDEX IF NOT EXISTS idx_test_mailboxes_domain ON test_mailboxes(domain);
CREATE INDEX IF NOT EXISTS idx_test_mailboxes_prefix ON test_mailboxes(prefix);
