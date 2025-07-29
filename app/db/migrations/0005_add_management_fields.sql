-- Migration: Add management fields to test_mailboxes table
-- Created: 2025-07-29

-- Add registration_status column
ALTER TABLE test_mailboxes ADD COLUMN registration_status TEXT DEFAULT 'unregistered';

-- Add count column
ALTER TABLE test_mailboxes ADD COLUMN count TEXT;

-- Add sale_status column  
ALTER TABLE test_mailboxes ADD COLUMN sale_status TEXT;

-- Add updated_at column
ALTER TABLE test_mailboxes ADD COLUMN updated_at INTEGER;

-- Update existing records to have default values
UPDATE test_mailboxes SET 
  registration_status = 'registered',
  updated_at = strftime('%s', 'now') * 1000
WHERE registration_status IS NULL;
