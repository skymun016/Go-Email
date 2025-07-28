-- Migration: Add remark field to test_mailboxes table
-- Created: 2025-07-28

-- Add remark column to test_mailboxes table
ALTER TABLE test_mailboxes ADD COLUMN remark TEXT;

-- The column is nullable by default, so existing records will have NULL values
-- This is the desired behavior as specified in the requirements
