-- Complete database initialization with user management
-- This creates all tables including the new user management tables

-- 1. Create mailboxes table with ownership support
CREATE TABLE IF NOT EXISTS mailboxes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    owner_id TEXT,
    owner_type TEXT DEFAULT 'anonymous'
);

-- 2. Create emails table
CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    mailbox_id TEXT NOT NULL,
    message_id TEXT,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    subject TEXT,
    text_content TEXT,
    html_content TEXT,
    raw_email TEXT NOT NULL,
    received_at INTEGER NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    size INTEGER NOT NULL
);

-- 3. Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    email_id TEXT NOT NULL,
    filename TEXT,
    content_type TEXT,
    size INTEGER,
    content_id TEXT,
    is_inline INTEGER NOT NULL DEFAULT 0,
    r2_key TEXT,
    r2_bucket TEXT,
    upload_status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
);

-- 4. Create API tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    usage_limit INTEGER NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    expires_at INTEGER
);

-- 5. Create token usage logs table
CREATE TABLE IF NOT EXISTS token_usage_logs (
    id TEXT PRIMARY KEY,
    token_id TEXT NOT NULL,
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL
);

-- 6. Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
);

-- 7. Create users table (NEW)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT,
    mailbox_quota INTEGER NOT NULL DEFAULT 5,
    used_quota INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    last_login_at INTEGER
);

-- 8. Create user_mailboxes association table (NEW)
CREATE TABLE IF NOT EXISTS user_mailboxes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mailbox_id TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- Create all indexes
-- Mailboxes indexes
CREATE INDEX IF NOT EXISTS idx_mailboxes_email ON mailboxes(email);
CREATE INDEX IF NOT EXISTS idx_mailboxes_expires_at ON mailboxes(expires_at);
CREATE INDEX IF NOT EXISTS idx_mailboxes_owner ON mailboxes(owner_id, owner_type);

-- Emails indexes
CREATE INDEX IF NOT EXISTS idx_emails_mailbox_id ON emails(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_mailbox_received ON emails(mailbox_id, received_at);
CREATE INDEX IF NOT EXISTS idx_emails_mailbox_read ON emails(mailbox_id, is_read);
CREATE INDEX IF NOT EXISTS idx_emails_from_address ON emails(from_address);
CREATE INDEX IF NOT EXISTS idx_emails_to_address ON emails(to_address);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_attachments_r2_key ON attachments(r2_key);

-- API tokens indexes
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_api_tokens_is_active ON api_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_api_tokens_active_expires ON api_tokens(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_api_tokens_usage ON api_tokens(usage_count, usage_limit);

-- Token usage logs indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_token_id ON token_usage_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at ON token_usage_logs(created_at);

-- Admins indexes
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- Users indexes (NEW)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at);

-- User mailboxes indexes (NEW)
CREATE INDEX IF NOT EXISTS idx_user_mailboxes_user_id ON user_mailboxes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mailboxes_mailbox_id ON user_mailboxes(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_user_mailboxes_user_mailbox ON user_mailboxes(user_id, mailbox_id);
