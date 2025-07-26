-- Migration: Add User Management System
-- Created: 2024-01-26
-- Description: Add users table, user_mailboxes table, and extend mailboxes table for user ownership

-- 1. Add ownership fields to existing mailboxes table
ALTER TABLE mailboxes ADD COLUMN owner_id TEXT;
ALTER TABLE mailboxes ADD COLUMN owner_type TEXT DEFAULT 'anonymous';

-- 2. Create users table
CREATE TABLE users (
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

-- 3. Create user_mailboxes association table
CREATE TABLE user_mailboxes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mailbox_id TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- 4. Create indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_expires_at ON users(expires_at);

-- 5. Create indexes for user_mailboxes table
CREATE INDEX idx_user_mailboxes_user_id ON user_mailboxes(user_id);
CREATE INDEX idx_user_mailboxes_mailbox_id ON user_mailboxes(mailbox_id);
CREATE INDEX idx_user_mailboxes_user_mailbox ON user_mailboxes(user_id, mailbox_id);

-- 6. Create indexes for mailboxes ownership
CREATE INDEX idx_mailboxes_owner ON mailboxes(owner_id, owner_type);

-- 7. Update existing mailboxes to be anonymous type
UPDATE mailboxes SET owner_type = 'anonymous' WHERE owner_type IS NULL;

-- 8. Verify migration
-- This will be handled by the application code
