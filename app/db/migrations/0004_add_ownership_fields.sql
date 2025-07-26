-- Add ownership fields to existing mailboxes table
-- This is an incremental migration for production database

-- Add ownership fields to mailboxes table
ALTER TABLE mailboxes ADD COLUMN owner_id TEXT;
ALTER TABLE mailboxes ADD COLUMN owner_type TEXT DEFAULT 'anonymous';

-- Create indexes for ownership
CREATE INDEX IF NOT EXISTS idx_mailboxes_owner ON mailboxes(owner_id, owner_type);

-- Update existing mailboxes to be anonymous type
UPDATE mailboxes SET owner_type = 'anonymous' WHERE owner_type IS NULL;
