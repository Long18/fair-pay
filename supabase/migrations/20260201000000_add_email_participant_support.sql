-- Make user_id nullable to support pending participants
ALTER TABLE expense_splits
ALTER COLUMN user_id DROP NOT NULL;

-- Add pending_email column for unclaimed participants
ALTER TABLE expense_splits
ADD COLUMN pending_email TEXT;

-- Add constraint: either user_id OR pending_email must be set (not both null)
ALTER TABLE expense_splits
ADD CONSTRAINT user_id_or_email_check
CHECK ((user_id IS NOT NULL) OR (pending_email IS NOT NULL));

-- Add constraint: cannot have both user_id and pending_email
ALTER TABLE expense_splits
ADD CONSTRAINT user_id_and_email_exclusive
CHECK (NOT (user_id IS NOT NULL AND pending_email IS NOT NULL));

-- Add claim tracking
ALTER TABLE expense_splits
ADD COLUMN is_claimed BOOLEAN DEFAULT TRUE;

-- Update constraint: when pending_email set, is_claimed should be false
ALTER TABLE expense_splits
ADD CONSTRAINT claim_status_check
CHECK (
  (pending_email IS NULL AND is_claimed = TRUE) OR
  (pending_email IS NOT NULL)
);

-- Index for finding pending splits by email
CREATE INDEX idx_expense_splits_pending_email ON expense_splits(pending_email)
WHERE pending_email IS NOT NULL;
