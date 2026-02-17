-- Migration: Fix audit_logs table schema to match create_audit_log() function
-- The function uses 'operation', 'changed_fields', 'ip_address', 'user_agent'
-- but the table only has 'action' column. This migration aligns them.

DO $$
BEGIN
  -- Rename 'action' to 'operation' if 'action' exists and 'operation' does not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'action'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'operation'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN action TO operation;
  END IF;

  -- Add 'operation' if neither 'action' nor 'operation' exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'operation'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN operation TEXT NOT NULL DEFAULT 'UNKNOWN';
  END IF;

  -- Add changed_fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'changed_fields'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN changed_fields TEXT[];
  END IF;

  -- Add ip_address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN ip_address INET;
  END IF;

  -- Add user_agent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
  END IF;
END $$;
