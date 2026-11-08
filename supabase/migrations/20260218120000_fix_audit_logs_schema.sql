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

-- Keep log_table_changes() aligned with audit_logs column name (operation vs action)
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_user_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_record_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record_id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
  END IF;

  INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, user_id, created_at)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_user_id, NOW());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$fn$;
