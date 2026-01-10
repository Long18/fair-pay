Initialising login role...
Dumping schemas from remote database...



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."expense_category" AS ENUM (
    'Food & Drink',
    'Transportation',
    'Accommodation',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Healthcare',
    'Education',
    'Other'
);


ALTER TYPE "public"."expense_category" OWNER TO "postgres";


COMMENT ON TYPE "public"."expense_category" IS 'Valid expense categories synchronized with frontend (src/modules/expenses/lib/categories.ts)';



CREATE OR REPLACE FUNCTION "public"."add_creator_as_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_creator_as_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_bulk_insert_expenses"("p_expenses" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required for bulk operations';
  END IF;

  -- Insert expenses from JSON array
  INSERT INTO expenses (
    context_type, group_id, description, amount, currency,
    expense_date, paid_by_user_id, created_by
  )
  SELECT
    (elem->>'context_type')::TEXT,
    (elem->>'group_id')::UUID,
    (elem->>'description')::TEXT,
    (elem->>'amount')::NUMERIC,
    COALESCE((elem->>'currency')::TEXT, 'VND'),
    COALESCE((elem->>'expense_date')::DATE, CURRENT_DATE),
    (elem->>'paid_by_user_id')::UUID,
    auth.uid()
  FROM jsonb_array_elements(p_expenses) elem;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."admin_bulk_insert_expenses"("p_expenses" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."are_friends"("user_id_1" "uuid", "user_id_2" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE ((user_a = user_id_1 AND user_b = user_id_2) OR (user_a = user_id_2 AND user_b = user_id_1))
      AND status = 'accepted'
  );
$$;


ALTER FUNCTION "public"."are_friends"("user_id_1" "uuid", "user_id_2" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_record_payments"("p_payments" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_payment JSONB;
  v_payment_ids UUID[] := '{}';
  v_payment_id UUID;
  v_created_count INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate payment limit (max 50 at a time)
  IF jsonb_array_length(p_payments) > 50 THEN
    RAISE EXCEPTION 'Cannot record more than 50 payments at once';
  END IF;

  -- Process each payment
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    -- Validate required fields
    IF (v_payment->>'from_user_id') IS NULL OR
       (v_payment->>'to_user_id') IS NULL OR
       (v_payment->>'amount') IS NULL THEN
      RAISE EXCEPTION 'Payment must have from_user_id, to_user_id, and amount';
    END IF;

    -- Validate context (group XOR friendship)
    IF ((v_payment->>'group_id') IS NULL AND (v_payment->>'friendship_id') IS NULL) OR
       ((v_payment->>'group_id') IS NOT NULL AND (v_payment->>'friendship_id') IS NOT NULL) THEN
      RAISE EXCEPTION 'Payment must belong to either a group or friendship, not both or neither';
    END IF;

    -- Create payment expense
    INSERT INTO expenses (
      description,
      amount,
      paid_by_user_id,
      group_id,
      friendship_id,
      is_payment,
      created_by,
      expense_date
    ) VALUES (
      COALESCE(v_payment->>'description', 'Payment'),
      (v_payment->>'amount')::NUMERIC(10,2),
      (v_payment->>'to_user_id')::UUID, -- Receiver is the "payer" in our model
      (v_payment->>'group_id')::UUID,
      (v_payment->>'friendship_id')::UUID,
      true,
      v_user_id,
      NOW()
    ) RETURNING id INTO v_payment_id;

    -- Create split for the sender (who owes the money)
    INSERT INTO expense_splits (
      expense_id,
      user_id,
      split_method,
      split_value,
      computed_amount,
      is_settled,
      settled_amount,
      settled_at
    ) VALUES (
      v_payment_id,
      (v_payment->>'from_user_id')::UUID,
      'equal',
      1,
      (v_payment->>'amount')::NUMERIC(10,2),
      true, -- Payments are immediately settled
      (v_payment->>'amount')::NUMERIC(10,2),
      NOW()
    );

    v_payment_ids := array_append(v_payment_ids, v_payment_id);
    v_created_count := v_created_count + 1;
  END LOOP;

  -- Log to audit_logs
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    changed_fields
  ) VALUES (
    v_user_id,
    'expenses',
    'BATCH_PAYMENT',
    NULL,
    jsonb_build_object(
      'payment_count', v_created_count,
      'payment_ids', v_payment_ids
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'payment_ids', v_payment_ids,
    'message', format('Recorded %s payment(s)', v_created_count)
  );
END;
$$;


ALTER FUNCTION "public"."batch_record_payments"("p_payments" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."batch_record_payments"("p_payments" "jsonb") IS 'Records multiple payments in one transaction. Max 50 payments at a time.
Each payment must have: from_user_id, to_user_id, amount, and either group_id or friendship_id.
Logs batch operation to audit_logs.
Returns: {success, created_count, payment_ids, message}';



CREATE OR REPLACE FUNCTION "public"."bulk_delete_expenses"("p_expense_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_expense RECORD;
  v_can_delete BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Validate expense limit (max 50 at a time)
  IF array_length(p_expense_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Cannot delete more than 50 expenses at once';
  END IF;

  -- Check permissions for each expense (skip if system admin)
  IF NOT v_is_system_admin THEN
    FOR v_expense IN
      SELECT e.*, gm.role as user_role
      FROM expenses e
      LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = v_user_id
      WHERE e.id = ANY(p_expense_ids)
    LOOP
      -- User can delete if they created it OR they are group admin
      v_can_delete := (v_expense.created_by = v_user_id) OR (v_expense.user_role = 'admin');

      IF NOT v_can_delete THEN
        RAISE EXCEPTION 'Permission denied to delete expense %', v_expense.id;
      END IF;
    END LOOP;
  END IF;

  -- Log each deletion to audit_logs
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    changed_fields
  )
  SELECT
    v_user_id,
    'expenses',
    'BULK_DELETE',
    e.id,
    jsonb_build_object(
      'description', e.description,
      'amount', e.amount,
      'group_id', e.group_id,
      'friendship_id', e.friendship_id,
      'deleted_by_admin', v_is_system_admin
    )
  FROM expenses e
  WHERE e.id = ANY(p_expense_ids);

  -- Delete expense splits (cascades will handle this, but explicit for clarity)
  DELETE FROM expense_splits
  WHERE expense_id = ANY(p_expense_ids);

  -- Delete expenses
  DELETE FROM expenses
  WHERE id = ANY(p_expense_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('Deleted %s expense(s)', v_deleted_count)
  );
END;
$$;


ALTER FUNCTION "public"."bulk_delete_expenses"("p_expense_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bulk_delete_expenses"("p_expense_ids" "uuid"[]) IS 'Deletes multiple expenses atomically. Max 50 expenses at a time. Can be called by expense creators, group admins, or system admins. Logs all deletions to audit_logs for audit trail.';



CREATE OR REPLACE FUNCTION "public"."calculate_daily_balance"("p_user_id" "uuid", "p_snapshot_date" "date" DEFAULT CURRENT_DATE, "p_currency" "text" DEFAULT 'USD'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total_owed NUMERIC(10,2);
  v_total_lent NUMERIC(10,2);
  v_net_balance NUMERIC(10,2);
BEGIN
  -- Calculate total owed (what user owes to others)
  SELECT COALESCE(SUM(es.computed_amount - COALESCE(es.settled_amount, 0)), 0)
  INTO v_total_owed
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.paid_by_user_id != p_user_id
    AND e.expense_date <= p_snapshot_date
    AND e.currency = p_currency
    AND e.is_payment = false;

  -- Calculate total lent (what others owe to user)
  SELECT COALESCE(SUM(es.computed_amount - COALESCE(es.settled_amount, 0)), 0)
  INTO v_total_lent
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.paid_by_user_id = p_user_id
    AND es.user_id != p_user_id
    AND e.expense_date <= p_snapshot_date
    AND e.currency = p_currency
    AND e.is_payment = false;

  -- Calculate net balance
  v_net_balance := v_total_lent - v_total_owed;

  -- Insert or update balance history
  INSERT INTO balance_history (
    user_id,
    snapshot_date,
    total_owed,
    total_lent,
    net_balance,
    currency
  )
  VALUES (
    p_user_id,
    p_snapshot_date,
    v_total_owed,
    v_total_lent,
    v_net_balance,
    p_currency
  )
  ON CONFLICT (user_id, snapshot_date, currency)
  DO UPDATE SET
    total_owed = EXCLUDED.total_owed,
    total_lent = EXCLUDED.total_lent,
    net_balance = EXCLUDED.net_balance,
    created_at = NOW();
END;
$$;


ALTER FUNCTION "public"."calculate_daily_balance"("p_user_id" "uuid", "p_snapshot_date" "date", "p_currency" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_daily_balance"("p_user_id" "uuid", "p_snapshot_date" "date", "p_currency" "text") IS 'Calculates and stores balance snapshot for a specific user and date. Used for populating balance_history table.';



CREATE OR REPLACE FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_interval_value" integer) RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 day');
    WHEN 'weekly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 week');
    WHEN 'monthly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 month');
    WHEN 'yearly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 year');
    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_interval_value" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_audit_logs"("p_days_to_keep" integer DEFAULT 365) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Only admins can clean up audit logs
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can clean up audit logs';
  END IF;
  
  -- Delete audit logs older than specified days
  DELETE FROM audit_logs
  WHERE created_at < CURRENT_DATE - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_audit_logs"("p_days_to_keep" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_audit_logs"("p_days_to_keep" integer) IS 'Clean up audit logs older than specified days (admin only)';



CREATE OR REPLACE FUNCTION "public"."create_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_changed_fields TEXT[];
  v_record_id UUID;
  v_ip_address INET;
  v_user_agent TEXT;
BEGIN
  -- Get IP address and user agent from request context if available
  BEGIN
    v_ip_address := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    v_ip_address := NULL;
  END;
  
  BEGIN
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;
  
  -- Handle different operations
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_record_id := OLD.id;
    v_changed_fields := NULL;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id;
    
    -- Identify changed fields
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM (
      SELECT key
      FROM jsonb_each(v_old_data) old_fields
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_each(v_new_data) new_fields
        WHERE new_fields.key = old_fields.key
          AND new_fields.value = old_fields.value
      )
      AND key NOT IN ('updated_at', 'created_at') -- Exclude timestamp fields
    ) changed;
    
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_changed_fields := NULL;
    
  END IF;
  
  -- Insert audit log entry
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    old_data,
    new_data,
    changed_fields,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_ip_address,
    v_user_agent
  );
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."create_audit_log"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_audit_log"() IS 'Generic trigger function that creates audit log entries for INSERT, UPDATE, DELETE operations';



CREATE OR REPLACE FUNCTION "public"."create_default_user_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_user_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_momo_payment_request"("p_expense_split_id" "uuid", "p_user_id" "uuid", "p_receiver_phone" "text", "p_amount" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
        v_reference_code TEXT;
        v_payment_request_id UUID;
        v_expense_split expense_splits%ROWTYPE;
    BEGIN
        -- Verify expense split exists and belongs to user
        SELECT * INTO v_expense_split
        FROM expense_splits
        WHERE id = p_expense_split_id
        AND user_id = p_user_id
        AND is_settled = FALSE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Expense split not found or already settled'
            );
        END IF;

        -- Check if there's already a pending request
        IF EXISTS (
            SELECT 1 FROM momo_payment_requests
            WHERE expense_split_id = p_expense_split_id
            AND status = 'pending'
        ) THEN
            -- Return existing request
            SELECT jsonb_build_object(
                'success', true,
                'id', id,
                'reference_code', reference_code,
                'qr_url', qr_url,
                'amount', amount,
                'status', status
            ) INTO v_reference_code
            FROM momo_payment_requests
            WHERE expense_split_id = p_expense_split_id
            AND status = 'pending'
            LIMIT 1;

            RETURN v_reference_code::JSONB;
        END IF;

        -- Generate unique reference code (FP-splitId-random)
        v_reference_code := 'FP-' || substring(p_expense_split_id::TEXT, 1, 8) || '-' || substring(gen_random_uuid()::TEXT, 1, 4);

        -- Create payment request
        INSERT INTO momo_payment_requests (
            expense_split_id,
            user_id,
            receiver_phone,
            amount,
            reference_code
        ) VALUES (
            p_expense_split_id,
            p_user_id,
            p_receiver_phone,
            p_amount,
            v_reference_code
        ) RETURNING id INTO v_payment_request_id;

        RETURN jsonb_build_object(
            'success', true,
            'id', v_payment_request_id,
            'reference_code', v_reference_code,
            'amount', p_amount,
            'status', 'pending'
        );
    END;
    $$;


ALTER FUNCTION "public"."create_momo_payment_request"("p_expense_split_id" "uuid", "p_user_id" "uuid", "p_receiver_phone" "text", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_link" "text" DEFAULT NULL::"text", "p_related_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, link, related_id)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, p_related_id)
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_related_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_related_id" "uuid") IS 'Helper function to create a new notification';



CREATE OR REPLACE FUNCTION "public"."create_user_if_not_exists"("p_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text" DEFAULT 'fairpay2025'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_id) THEN
        -- Insert into auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token,
            raw_app_meta_data,
            raw_user_meta_data
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            p_id,
            'authenticated',
            'authenticated',
            p_email,
            crypt(p_password, gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            '',
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
            jsonb_build_object('full_name', p_full_name)
        );

        RAISE NOTICE 'Created user: % (%)', p_full_name, p_email;
    ELSE
        RAISE NOTICE 'User already exists: % (%)', p_full_name, p_email;
    END IF;
END;
$$;


ALTER FUNCTION "public"."create_user_if_not_exists"("p_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_with_profile"("user_email" "text", "user_full_name" "text", "user_password" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- This function cannot directly create auth.users
  -- It's a placeholder - actual implementation must use Supabase Admin API
  --
  -- The Admin API call would be:
  -- POST /auth/v1/admin/users
  -- {
  --   "email": user_email,
  --   "password": user_password OR auto-generate,
  --   "email_confirm": true,
  --   "user_metadata": { "full_name": user_full_name }
  -- }

  RAISE EXCEPTION 'This function must be called via Supabase Admin API. Use create_users_via_api.js script instead.';

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."create_user_with_profile"("user_email" "text", "user_full_name" "text", "user_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_audit_statistics"("p_days" integer DEFAULT 30) RETURNS TABLE("total_events" integer, "insert_count" integer, "update_count" integer, "delete_count" integer, "unique_users" integer, "events_by_table" "jsonb", "daily_activity" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only admins can view audit statistics
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can view audit statistics';
  END IF;
  
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::INTEGER as total,
      SUM(CASE WHEN operation = 'INSERT' THEN 1 ELSE 0 END)::INTEGER as inserts,
      SUM(CASE WHEN operation = 'UPDATE' THEN 1 ELSE 0 END)::INTEGER as updates,
      SUM(CASE WHEN operation = 'DELETE' THEN 1 ELSE 0 END)::INTEGER as deletes,
      COUNT(DISTINCT user_id)::INTEGER as users
    FROM audit_logs
    WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ),
  by_table AS (
    SELECT jsonb_object_agg(table_name, count) as tables
    FROM (
      SELECT table_name, COUNT(*)::INTEGER as count
      FROM audit_logs
      WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      GROUP BY table_name
      ORDER BY count DESC
    ) t
  ),
  by_day AS (
    SELECT jsonb_object_agg(activity_date::TEXT, count) as daily
    FROM (
      SELECT 
        DATE(created_at) as activity_date,
        COUNT(*)::INTEGER as count
      FROM audit_logs
      WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      GROUP BY DATE(created_at)
      ORDER BY activity_date DESC
    ) d
  )
  SELECT
    s.total,
    s.inserts,
    s.updates,
    s.deletes,
    s.users,
    bt.tables,
    bd.daily
  FROM stats s
  CROSS JOIN by_table bt
  CROSS JOIN by_day bd;
END;
$$;


ALTER FUNCTION "public"."get_audit_statistics"("p_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_audit_statistics"("p_days" integer) IS 'Get audit statistics summary (admin only)';



CREATE OR REPLACE FUNCTION "public"."get_balance_history"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT (CURRENT_DATE - '30 days'::interval), "p_end_date" "date" DEFAULT CURRENT_DATE, "p_currency" "text" DEFAULT 'VND'::"text") RETURNS TABLE("snapshot_date" "date", "total_owed" numeric, "total_lent" numeric, "net_balance" numeric, "currency" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
BEGIN
  -- Use provided user_id or default to current user
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Ensure balance history exists for date range
  -- Calculate missing snapshots on-demand
  FOR v_date IN
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE
  LOOP
    -- Check if snapshot exists (use explicit table alias to avoid ambiguity)
    IF NOT EXISTS (
      SELECT 1 FROM balance_history bh_check
      WHERE bh_check.user_id = v_user_id
        AND bh_check.snapshot_date = v_date
        AND bh_check.currency = p_currency
    ) THEN
      -- Calculate and store snapshot
      PERFORM calculate_daily_balance(v_user_id, v_date, p_currency);
    END IF;
  END LOOP;

  -- Return balance history with explicit column aliases matching RETURN TABLE
  RETURN QUERY
  SELECT
    bh.snapshot_date AS snapshot_date,
    bh.total_owed AS total_owed,
    bh.total_lent AS total_lent,
    bh.net_balance AS net_balance,
    bh.currency AS currency
  FROM balance_history bh
  WHERE bh.user_id = v_user_id
    AND bh.snapshot_date BETWEEN p_start_date AND p_end_date
    AND bh.currency = p_currency
  ORDER BY bh.snapshot_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_balance_history"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_currency" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_balance_history"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_currency" "text") IS 'Retrieves historical balance data for trend charts. Auto-calculates missing snapshots on-demand. Fixed ambiguous column reference with explicit aliases and search_path.';



CREATE OR REPLACE FUNCTION "public"."get_due_recurring_expenses"() RETURNS TABLE("id" "uuid", "template_expense_id" "uuid", "frequency" "text", "interval_value" integer, "next_occurrence" "date", "context_type" "text", "group_id" "uuid", "friendship_id" "uuid", "created_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.template_expense_id,
    re.frequency,
    re.interval,
    re.next_occurrence,
    re.context_type,
    re.group_id,
    re.friendship_id,
    re.created_by
  FROM recurring_expenses re
  WHERE re.is_active = TRUE
    AND re.next_occurrence <= CURRENT_DATE
    AND (re.end_date IS NULL OR re.end_date >= CURRENT_DATE);
END;
$$;


ALTER FUNCTION "public"."get_due_recurring_expenses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_expense_categories"() RETURNS TABLE("category_name" "text")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT unnest(enum_range(NULL::expense_category))::TEXT;
$$;


ALTER FUNCTION "public"."get_expense_categories"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_expense_categories"() IS 'Returns list of all valid expense categories';



CREATE OR REPLACE FUNCTION "public"."get_expense_splits_public"("p_expense_id" "uuid") RETURNS TABLE("id" "uuid", "expense_id" "uuid", "user_id" "uuid", "split_method" "text", "split_value" numeric, "computed_amount" numeric, "is_settled" boolean, "settled_amount" numeric, "settled_at" timestamp with time zone, "created_at" timestamp with time zone, "user_full_name" "text", "user_avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.id,
    es.expense_id,
    es.user_id,
    es.split_method,
    es.split_value,
    es.computed_amount,
    es.is_settled,
    es.settled_amount,
    es.settled_at,
    es.created_at,
    p.full_name as user_full_name,
    p.avatar_url as user_avatar_url
  FROM expense_splits es
  JOIN profiles p ON p.id = es.user_id
  WHERE es.expense_id = p_expense_id
  ORDER BY p.full_name;
END;
$$;


ALTER FUNCTION "public"."get_expense_splits_public"("p_expense_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_expense_summary_by_category"("p_user_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("category" "text", "total_amount" numeric, "expense_count" integer, "avg_amount" numeric, "percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total_spent DECIMAL(12, 2);
BEGIN
  -- Set default dates if not provided
  p_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  p_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Calculate total spent for percentage calculation
  SELECT COALESCE(SUM(es.computed_amount), 0)
  INTO v_total_spent
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.deleted_at IS NULL
    AND e.is_payment = false;
  
  -- Return category breakdown
  RETURN QUERY
  SELECT 
    COALESCE(e.category, 'Uncategorized') as category,
    SUM(es.computed_amount)::DECIMAL(12, 2) as total_amount,
    COUNT(DISTINCT e.id)::INTEGER as expense_count,
    AVG(es.computed_amount)::DECIMAL(12, 2) as avg_amount,
    CASE 
      WHEN v_total_spent > 0 THEN (SUM(es.computed_amount) / v_total_spent * 100)::DECIMAL(5, 2)
      ELSE 0::DECIMAL(5, 2)
    END as percentage
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.deleted_at IS NULL
    AND e.is_payment = false
  GROUP BY e.category
  ORDER BY total_amount DESC;
END;
$$;


ALTER FUNCTION "public"."get_expense_summary_by_category"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_expense_summary_by_category"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS 'Get expense breakdown by category for a user within date range. Returns category totals, counts, averages, and percentages.';



CREATE OR REPLACE FUNCTION "public"."get_friendship"("user_id_1" "uuid", "user_id_2" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT id FROM friendships
  WHERE (user_a = LEAST(user_id_1, user_id_2) AND user_b = GREATEST(user_id_1, user_id_2))
     OR (user_a = LEAST(user_id_2, user_id_1) AND user_b = GREATEST(user_id_2, user_id_1))
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_friendship"("user_id_1" "uuid", "user_id_2" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_friendship_activity"("p_friendship_id" "uuid") RETURNS TABLE("total_expenses" numeric, "total_payments" numeric, "expense_count" integer, "payment_count" integer, "user_a_owes" numeric, "user_b_owes" numeric, "net_balance" numeric, "last_expense_date" "date", "last_payment_date" "date", "most_common_category" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user has access to this friendship
  IF NOT EXISTS (
    SELECT 1 FROM friendships 
    WHERE id = p_friendship_id 
      AND (user_a = auth.uid() OR user_b = auth.uid())
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not part of this friendship';
  END IF;
  
  RETURN QUERY
  WITH expense_data AS (
    SELECT 
      SUM(amount)::DECIMAL(12, 2) as total_exp,
      COUNT(*)::INTEGER as count_exp,
      MAX(expense_date) as last_exp_date
    FROM expenses
    WHERE friendship_id = p_friendship_id 
      AND deleted_at IS NULL 
      AND is_payment = false
  ),
  payment_data AS (
    SELECT 
      SUM(amount)::DECIMAL(12, 2) as total_pay,
      COUNT(*)::INTEGER as count_pay,
      MAX(payment_date) as last_pay_date
    FROM payments
    WHERE friendship_id = p_friendship_id 
      AND deleted_at IS NULL
  ),
  balance_data AS (
    SELECT
      f.user_a,
      f.user_b,
      COALESCE(SUM(CASE WHEN es.user_id = f.user_a THEN es.computed_amount ELSE 0 END), 0) as a_owes,
      COALESCE(SUM(CASE WHEN es.user_id = f.user_b THEN es.computed_amount ELSE 0 END), 0) as b_owes
    FROM friendships f
    LEFT JOIN expenses e ON e.friendship_id = f.id AND e.deleted_at IS NULL
    LEFT JOIN expense_splits es ON es.expense_id = e.id
    WHERE f.id = p_friendship_id
    GROUP BY f.user_a, f.user_b
  ),
  category_data AS (
    SELECT 
      e.category,
      COUNT(*) as cat_count
    FROM expenses e
    WHERE e.friendship_id = p_friendship_id 
      AND e.deleted_at IS NULL
      AND e.category IS NOT NULL
    GROUP BY e.category
    ORDER BY cat_count DESC
    LIMIT 1
  )
  SELECT
    COALESCE(ed.total_exp, 0)::DECIMAL(12, 2),
    COALESCE(pd.total_pay, 0)::DECIMAL(12, 2),
    COALESCE(ed.count_exp, 0)::INTEGER,
    COALESCE(pd.count_pay, 0)::INTEGER,
    COALESCE(bd.a_owes, 0)::DECIMAL(12, 2),
    COALESCE(bd.b_owes, 0)::DECIMAL(12, 2),
    (COALESCE(bd.b_owes, 0) - COALESCE(bd.a_owes, 0))::DECIMAL(12, 2) as net_bal,
    ed.last_exp_date,
    pd.last_pay_date,
    cd.category
  FROM expense_data ed
  CROSS JOIN payment_data pd
  CROSS JOIN balance_data bd
  LEFT JOIN category_data cd ON true;
END;
$$;


ALTER FUNCTION "public"."get_friendship_activity"("p_friendship_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_friendship_activity"("p_friendship_id" "uuid") IS 'Get activity summary for a friendship including expenses, payments, balances. Enforces friendship access.';



CREATE OR REPLACE FUNCTION "public"."get_group_stats"("p_group_id" "uuid") RETURNS TABLE("total_expenses" numeric, "total_payments" numeric, "expense_count" integer, "payment_count" integer, "member_count" integer, "most_active_user_id" "uuid", "most_active_user_name" "text", "most_active_user_count" integer, "total_outstanding" numeric, "created_at" timestamp with time zone, "last_activity" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user has access to this group
  IF NOT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = p_group_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this group';
  END IF;
  
  RETURN QUERY
  WITH group_data AS (
    SELECT 
      g.created_at as grp_created_at,
      COALESCE(
        (SELECT MAX(greatest_date) FROM (
          SELECT MAX(e.created_at) as greatest_date FROM expenses e WHERE e.group_id = p_group_id
          UNION ALL
          SELECT MAX(p.created_at) FROM payments p WHERE p.group_id = p_group_id
        ) dates),
        g.created_at
      ) as last_activity_date
    FROM groups g
    WHERE g.id = p_group_id
  ),
  expense_data AS (
    SELECT 
      SUM(amount)::DECIMAL(12, 2) as total_exp,
      COUNT(*)::INTEGER as count_exp
    FROM expenses
    WHERE group_id = p_group_id 
      AND deleted_at IS NULL 
      AND is_payment = false
  ),
  payment_data AS (
    SELECT 
      SUM(amount)::DECIMAL(12, 2) as total_pay,
      COUNT(*)::INTEGER as count_pay
    FROM payments
    WHERE group_id = p_group_id 
      AND deleted_at IS NULL
  ),
  member_data AS (
    SELECT COUNT(DISTINCT user_id)::INTEGER as member_cnt
    FROM group_members
    WHERE group_id = p_group_id
  ),
  active_user AS (
    SELECT 
      e.paid_by_user_id as user_id,
      COUNT(*)::INTEGER as activity_count
    FROM expenses e
    WHERE e.group_id = p_group_id 
      AND e.deleted_at IS NULL
    GROUP BY e.paid_by_user_id
    ORDER BY activity_count DESC
    LIMIT 1
  ),
  outstanding_data AS (
    SELECT 
      SUM(es.computed_amount)::DECIMAL(12, 2) as outstanding
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = p_group_id
      AND e.deleted_at IS NULL
      AND e.is_payment = false
  )
  SELECT
    COALESCE(ed.total_exp, 0)::DECIMAL(12, 2),
    COALESCE(pd.total_pay, 0)::DECIMAL(12, 2),
    COALESCE(ed.count_exp, 0)::INTEGER,
    COALESCE(pd.count_pay, 0)::INTEGER,
    COALESCE(md.member_cnt, 0)::INTEGER,
    au.user_id,
    p.display_name,
    COALESCE(au.activity_count, 0)::INTEGER,
    COALESCE(od.outstanding, 0)::DECIMAL(12, 2),
    gd.grp_created_at,
    gd.last_activity_date
  FROM group_data gd
  CROSS JOIN expense_data ed
  CROSS JOIN payment_data pd
  CROSS JOIN member_data md
  CROSS JOIN outstanding_data od
  LEFT JOIN active_user au ON true
  LEFT JOIN profiles p ON p.id = au.user_id;
END;
$$;


ALTER FUNCTION "public"."get_group_stats"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_group_stats"("p_group_id" "uuid") IS 'Get comprehensive statistics for a group including totals, counts, most active user, and outstanding balances. Enforces group membership.';



CREATE OR REPLACE FUNCTION "public"."get_leaderboard_data"("p_limit" integer DEFAULT 5, "p_offset" integer DEFAULT 0) RETURNS TABLE("top_debtors" "jsonb", "top_creditors" "jsonb", "stats" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_top_debtors JSONB;
  v_top_creditors JSONB;
  v_stats JSONB;
BEGIN
  -- Get top debtors (people who owe the most)
  -- Fixed: Order rows before aggregating into JSONB
  WITH debtors AS (
    SELECT p.id, p.full_name, p.avatar_url, balance_agg.total_debt
    FROM profiles p
    INNER JOIN (
      SELECT es.user_id, SUM(es.computed_amount) as total_debt
      FROM expense_splits es
      INNER JOIN expenses e ON es.expense_id = e.id
      WHERE es.user_id != e.paid_by_user_id
        AND e.is_payment = false
      GROUP BY es.user_id
      HAVING SUM(es.computed_amount) > 0
    ) balance_agg ON p.id = balance_agg.user_id
    ORDER BY balance_agg.total_debt DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', full_name,
      'avatar_url', avatar_url,
      'balance', COALESCE(total_debt, 0)
    )
  ), '[]'::jsonb)
  INTO v_top_debtors
  FROM debtors;

  -- Get top creditors (people owed the most)
  -- Fixed: Order rows before aggregating into JSONB
  WITH creditors AS (
    SELECT p.id, p.full_name, p.avatar_url, balance_agg.total_credit
    FROM profiles p
    INNER JOIN (
      SELECT e.paid_by_user_id as user_id,
             SUM(e.amount) - COALESCE(SUM(CASE WHEN es.user_id = e.paid_by_user_id THEN es.computed_amount ELSE 0 END), 0) as total_credit
      FROM expenses e
      LEFT JOIN expense_splits es ON e.id = es.expense_id
      WHERE e.is_payment = false
      GROUP BY e.paid_by_user_id
      HAVING SUM(e.amount) - COALESCE(SUM(CASE WHEN es.user_id = e.paid_by_user_id THEN es.computed_amount ELSE 0 END), 0) > 0
    ) balance_agg ON p.id = balance_agg.user_id
    ORDER BY balance_agg.total_credit DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', full_name,
      'avatar_url', avatar_url,
      'balance', COALESCE(total_credit, 0)
    )
  ), '[]'::jsonb)
  INTO v_top_creditors
  FROM creditors;

  -- Get statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_groups', (SELECT COUNT(*) FROM groups),
    'total_transactions', (SELECT COUNT(*) FROM expenses WHERE is_payment = false) + (SELECT COUNT(*) FROM payments),
    'total_amount_tracked', COALESCE((SELECT SUM(amount) FROM expenses WHERE is_payment = false), 0),
    'generated_at', NOW()
  ) INTO v_stats;

  RETURN QUERY SELECT v_top_debtors, v_top_creditors, v_stats;
END;
$$;


ALTER FUNCTION "public"."get_leaderboard_data"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_demo_debts"() RETURNS TABLE("counterparty_id" "uuid", "counterparty_name" "text", "amount" numeric, "currency" "text", "i_owe_them" boolean, "owed_to_name" "text", "owed_to_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        '00000000-0000-0000-0000-000000000001'::UUID AS counterparty_id,
        'Alice Johnson' AS counterparty_name,
        150.00 AS amount,
        'USD' AS currency,
        FALSE AS i_owe_them,
        'Demo User' AS owed_to_name,
        '00000000-0000-0000-0000-000000000000'::UUID AS owed_to_id
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000002'::UUID,
        'Bob Smith',
        75.50,
        'USD',
        TRUE,
        'Demo User',
        '00000000-0000-0000-0000-000000000000'::UUID
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000003'::UUID,
        'Charlie Brown',
        200.00,
        'EUR',
        FALSE,
        'Demo User',
        '00000000-0000-0000-0000-000000000000'::UUID
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000004'::UUID,
        'Diana Prince',
        50.00,
        'GBP',
        TRUE,
        'Demo User',
        '00000000-0000-0000-0000-000000000000'::UUID
    UNION ALL
    SELECT
        '00000000-0000-0000-0000-000000000005'::UUID,
        'Eve Wilson',
        120000.00,
        'VND',
        TRUE,
        'Demo User',
        '00000000-0000-0000-0000-000000000000'::UUID;
END;
$$;


ALTER FUNCTION "public"."get_public_demo_debts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_recent_activities"("p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "type" "text", "description" "text", "amount" numeric, "currency" "text", "date" "date", "group_id" "uuid", "group_name" "text", "created_by_id" "uuid", "created_by_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    -- Return real recent activities with hidden amounts for public users
    WITH recent_activities AS (
        -- Get recent expenses
        SELECT
            e.id,
            'expense'::TEXT AS type,
            e.description,
            0::NUMERIC AS amount, -- Hide actual amount for privacy
            COALESCE(e.currency, 'VND') AS currency,
            e.expense_date AS date,
            e.group_id,
            g.name AS group_name,
            e.created_by AS created_by_id,
            p.full_name AS created_by_name
        FROM expenses e
        LEFT JOIN groups g ON e.group_id = g.id
        LEFT JOIN profiles p ON e.created_by = p.id
        WHERE e.created_at > CURRENT_DATE - INTERVAL '30 days'
            AND NOT e.is_payment

        UNION ALL

        -- Get recent payments
        SELECT
            pay.id,
            'payment'::TEXT AS type,
            COALESCE(pay.note, 'Payment') AS description,
            0::NUMERIC AS amount, -- Hide actual amount for privacy
            COALESCE(pay.currency, 'VND') AS currency,
            pay.payment_date AS date,
            pay.group_id,
            g.name AS group_name,
            pay.from_user AS created_by_id,
            p.full_name AS created_by_name
        FROM payments pay
        LEFT JOIN groups g ON pay.group_id = g.id
        LEFT JOIN profiles p ON pay.from_user = p.id
        WHERE pay.created_at > CURRENT_DATE - INTERVAL '30 days'
    )
    SELECT * FROM recent_activities
    ORDER BY date DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_public_recent_activities"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_record_audit_history"("p_table_name" "text", "p_record_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "user_id" "uuid", "user_name" "text", "operation" "text", "changed_fields" "text"[], "old_data" "jsonb", "new_data" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user has access to this record
  -- (Simplified check - enhance based on specific table rules)
  IF NOT is_admin() THEN
    -- For non-admins, verify they have access to the record
    IF p_table_name = 'expenses' THEN
      IF NOT EXISTS (
        SELECT 1 FROM expenses e
        JOIN expense_splits es ON es.expense_id = e.id
        WHERE e.id = p_record_id
          AND (e.paid_by_user_id = auth.uid() OR es.user_id = auth.uid())
      ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to view this audit history';
      END IF;
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    p.display_name as user_name,
    al.operation,
    al.changed_fields,
    al.old_data,
    al.new_data,
    al.created_at
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_record_audit_history"("p_table_name" "text", "p_record_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_record_audit_history"("p_table_name" "text", "p_record_id" "uuid", "p_limit" integer) IS 'Get complete audit history for a specific record';



CREATE OR REPLACE FUNCTION "public"."get_spending_comparison"("p_current_start" "date", "p_current_end" "date", "p_group_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("current_total" numeric, "previous_total" numeric, "difference" numeric, "percentage_change" numeric, "trend" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_total NUMERIC(10,2);
  v_previous_total NUMERIC(10,2);
  v_difference NUMERIC(10,2);
  v_percentage_change NUMERIC(5,2);
  v_trend TEXT;
  v_period_days INT;
  v_previous_start DATE;
  v_previous_end DATE;
BEGIN
  -- Calculate period length
  v_period_days := p_current_end - p_current_start;
  
  -- Calculate previous period dates
  v_previous_end := p_current_start - INTERVAL '1 day';
  v_previous_start := v_previous_end - (v_period_days || ' days')::INTERVAL;

  -- Calculate current period total
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_current_total
  FROM expenses e
  WHERE e.expense_date BETWEEN p_current_start AND p_current_end
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    );

  -- Calculate previous period total
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_previous_total
  FROM expenses e
  WHERE e.expense_date BETWEEN v_previous_start AND v_previous_end
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    );

  -- Calculate difference and percentage change
  v_difference := v_current_total - v_previous_total;
  
  IF v_previous_total > 0 THEN
    v_percentage_change := ROUND((v_difference / v_previous_total * 100)::NUMERIC, 2);
  ELSE
    v_percentage_change := 0;
  END IF;

  -- Determine trend
  IF v_difference > 0 THEN
    v_trend := 'increasing';
  ELSIF v_difference < 0 THEN
    v_trend := 'decreasing';
  ELSE
    v_trend := 'stable';
  END IF;

  -- Return comparison
  RETURN QUERY SELECT
    v_current_total,
    v_previous_total,
    v_difference,
    v_percentage_change,
    v_trend;
END;
$$;


ALTER FUNCTION "public"."get_spending_comparison"("p_current_start" "date", "p_current_end" "date", "p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_spending_comparison"("p_current_start" "date", "p_current_end" "date", "p_group_id" "uuid") IS 'Compares current period spending vs previous period for trend analysis.';



CREATE OR REPLACE FUNCTION "public"."get_spending_trend"("p_user_id" "uuid", "p_weeks" integer DEFAULT 12) RETURNS TABLE("week_start" "date", "week_end" "date", "week_number" integer, "total_spent" numeric, "expense_count" integer, "avg_per_expense" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH week_series AS (
    SELECT 
      generate_series(
        date_trunc('week', CURRENT_DATE - (p_weeks || ' weeks')::INTERVAL),
        date_trunc('week', CURRENT_DATE),
        '1 week'::INTERVAL
      )::DATE as week_start
  ),
  weekly_expenses AS (
    SELECT
      date_trunc('week', e.expense_date)::DATE as week_start,
      SUM(es.computed_amount) as total,
      COUNT(DISTINCT e.id) as count
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date >= CURRENT_DATE - (p_weeks || ' weeks')::INTERVAL
      AND e.deleted_at IS NULL
      AND e.is_payment = false
    GROUP BY date_trunc('week', e.expense_date)::DATE
  )
  SELECT
    ws.week_start,
    (ws.week_start + INTERVAL '6 days')::DATE as week_end,
    (p_weeks - EXTRACT(WEEK FROM CURRENT_DATE - ws.week_start)::INTEGER) as week_number,
    COALESCE(we.total, 0)::DECIMAL(12, 2) as total_spent,
    COALESCE(we.count, 0)::INTEGER as expense_count,
    CASE 
      WHEN COALESCE(we.count, 0) > 0 THEN (COALESCE(we.total, 0) / we.count)::DECIMAL(12, 2)
      ELSE 0::DECIMAL(12, 2)
    END as avg_per_expense
  FROM week_series ws
  LEFT JOIN weekly_expenses we ON ws.week_start = we.week_start
  ORDER BY ws.week_start ASC;
END;
$$;


ALTER FUNCTION "public"."get_spending_trend"("p_user_id" "uuid", "p_weeks" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_spending_trend"("p_user_id" "uuid", "p_weeks" integer) IS 'Get weekly spending trend for specified number of weeks. Returns week-by-week spending with counts and averages.';



CREATE OR REPLACE FUNCTION "public"."get_top_categories"("p_start_date" "date" DEFAULT (CURRENT_DATE - '30 days'::interval), "p_end_date" "date" DEFAULT CURRENT_DATE, "p_group_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("category" "text", "total_amount" numeric, "expense_count" bigint, "percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_total NUMERIC(10,2);
BEGIN
  -- Calculate total spending for percentage calculation
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_total
  FROM expenses e
  WHERE e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    );

  -- Return top categories with explicit TEXT cast for ENUM type
  RETURN QUERY
  SELECT
    e.category::TEXT AS category,
    SUM(e.amount) AS total_amount,
    COUNT(*)::BIGINT AS expense_count,
    CASE
      WHEN v_total > 0 THEN ROUND((SUM(e.amount) / v_total * 100)::NUMERIC, 2)
      ELSE 0
    END AS percentage
  FROM expenses e
  WHERE e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false
    AND (p_group_id IS NULL OR e.group_id = p_group_id)
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
    )
  GROUP BY e.category
  ORDER BY total_amount DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_categories"("p_start_date" "date", "p_end_date" "date", "p_group_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_top_categories"("p_start_date" "date", "p_end_date" "date", "p_group_id" "uuid", "p_limit" integer) IS 'Returns top spending categories with amounts and percentages for analytics dashboard. Fixed type mismatch by explicitly casting expense_category ENUM to TEXT.';



CREATE OR REPLACE FUNCTION "public"."get_top_spenders"("p_group_id" "uuid", "p_start_date" "date" DEFAULT (CURRENT_DATE - '30 days'::interval), "p_end_date" "date" DEFAULT CURRENT_DATE, "p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "user_name" "text", "user_avatar" "text", "total_spent" numeric, "expense_count" bigint, "percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total NUMERIC(10,2);
BEGIN
  -- Calculate total group spending for percentage
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_total
  FROM expenses e
  WHERE e.group_id = p_group_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false;

  -- Return top spenders
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    SUM(e.amount) as total_spent,
    COUNT(*)::BIGINT as expense_count,
    CASE
      WHEN v_total > 0 THEN ROUND((SUM(e.amount) / v_total * 100)::NUMERIC, 2)
      ELSE 0
    END as percentage
  FROM expenses e
  JOIN profiles p ON p.id = e.paid_by_user_id
  WHERE e.group_id = p_group_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND e.is_payment = false
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY total_spent DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_spenders"("p_group_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_top_spenders"("p_group_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer) IS 'Returns top spenders in a group for leaderboard-style analytics.';



CREATE OR REPLACE FUNCTION "public"."get_user_activities"("p_user_id" "uuid", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "type" "text", "description" "text", "total_amount" numeric, "user_share" numeric, "currency" "text", "date" timestamp with time zone, "group_name" "text", "group_id" "uuid", "paid_by_user_id" "uuid", "paid_by_name" "text", "is_lender" boolean, "is_borrower" boolean, "is_payment" boolean, "is_involved" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH activities AS (
        -- Get expense activities
        SELECT
            e.id,
            'expense'::TEXT AS type,
            e.description AS description,
            e.amount AS total_amount,
            es.computed_amount AS user_share,
            COALESCE(e.currency, 'USD') AS currency,
            e.expense_date::TIMESTAMPTZ AS date,
            g.name AS group_name,
            g.id AS group_id,
            e.paid_by_user_id,
            p.full_name AS paid_by_name,
            e.paid_by_user_id = p_user_id AS is_lender,
            es.user_id = p_user_id AND e.paid_by_user_id != p_user_id AS is_borrower,
            FALSE AS is_payment,
            (e.paid_by_user_id = p_user_id OR es.user_id = p_user_id) AS is_involved,
            e.created_at
        FROM expenses e
        LEFT JOIN expense_splits es ON es.expense_id = e.id
        LEFT JOIN groups g ON e.group_id = g.id
        LEFT JOIN profiles p ON e.paid_by_user_id = p.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND e.expense_date <= CURRENT_DATE

        UNION ALL

        -- Get payment activities
        SELECT
            pay.id,
            'payment'::TEXT AS type,
            COALESCE(pay.note,
                CASE
                    WHEN pay.from_user = p_user_id
                    THEN 'Payment to ' || p_to.full_name
                    ELSE 'Payment from ' || p_from.full_name
                END) AS description,
            pay.amount AS total_amount,
            pay.amount AS user_share,
            COALESCE(pay.currency, 'USD') AS currency,
            pay.payment_date::TIMESTAMPTZ AS date,
            g.name AS group_name,
            g.id AS group_id,
            pay.from_user AS paid_by_user_id,
            p_from.full_name AS paid_by_name,
            pay.to_user = p_user_id AS is_lender,
            pay.from_user = p_user_id AS is_borrower,
            TRUE AS is_payment,
            (pay.from_user = p_user_id OR pay.to_user = p_user_id) AS is_involved,
            pay.created_at
        FROM payments pay
        LEFT JOIN groups g ON pay.group_id = g.id
        LEFT JOIN profiles p_from ON pay.from_user = p_from.id
        LEFT JOIN profiles p_to ON pay.to_user = p_to.id
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
            AND pay.payment_date <= CURRENT_DATE
    )
    SELECT
        a.id,
        a.type,
        a.description,
        a.total_amount,
        a.user_share,
        a.currency,
        a.date,
        a.group_name,
        a.group_id,
        a.paid_by_user_id,
        a.paid_by_name,
        a.is_lender,
        a.is_borrower,
        a.is_payment,
        a.is_involved,
        a.created_at
    FROM activities a
    ORDER BY a.date DESC, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_user_activities"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_activity_heatmap"("p_user_id" "uuid", "p_days" integer DEFAULT 90) RETURNS TABLE("activity_date" "date", "expense_count" integer, "payment_count" integer, "total_amount" numeric, "day_of_week" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days || ' days')::INTERVAL,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as activity_date
  ),
  daily_expenses AS (
    SELECT 
      e.expense_date as activity_date,
      COUNT(DISTINCT e.id) as exp_count,
      SUM(es.computed_amount) as exp_amount
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      AND e.deleted_at IS NULL
      AND e.is_payment = false
    GROUP BY e.expense_date
  ),
  daily_payments AS (
    SELECT 
      payment_date as activity_date,
      COUNT(*) as pay_count
    FROM payments
    WHERE (from_user = p_user_id OR to_user = p_user_id)
      AND payment_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
      AND deleted_at IS NULL
    GROUP BY payment_date
  )
  SELECT
    ds.activity_date,
    COALESCE(de.exp_count, 0)::INTEGER as expense_count,
    COALESCE(dp.pay_count, 0)::INTEGER as payment_count,
    COALESCE(de.exp_amount, 0)::DECIMAL(12, 2) as total_amount,
    EXTRACT(DOW FROM ds.activity_date)::INTEGER as day_of_week
  FROM date_series ds
  LEFT JOIN daily_expenses de ON ds.activity_date = de.activity_date
  LEFT JOIN daily_payments dp ON ds.activity_date = dp.activity_date
  ORDER BY ds.activity_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_user_activity_heatmap"("p_user_id" "uuid", "p_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_activity_heatmap"("p_user_id" "uuid", "p_days" integer) IS 'Get daily activity data for heatmap visualization. Returns expense/payment counts and amounts per day.';



CREATE OR REPLACE FUNCTION "public"."get_user_audit_activity"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_days" integer DEFAULT 30, "p_limit" integer DEFAULT 100) RETURNS TABLE("id" "uuid", "table_name" "text", "operation" "text", "record_id" "uuid", "changed_fields" "text"[], "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_target_user UUID;
BEGIN
  -- Default to current user if not specified
  v_target_user := COALESCE(p_user_id, auth.uid());
  
  -- Only allow viewing own activity unless admin
  IF v_target_user != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only view your own audit activity';
  END IF;
  
  RETURN QUERY
  SELECT 
    al.id,
    al.table_name,
    al.operation,
    al.record_id,
    al.changed_fields,
    al.created_at
  FROM audit_logs al
  WHERE al.user_id = v_target_user
    AND al.created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_user_audit_activity"("p_user_id" "uuid", "p_days" integer, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_audit_activity"("p_user_id" "uuid", "p_days" integer, "p_limit" integer) IS 'Get recent audit activity for a user';



CREATE OR REPLACE FUNCTION "public"."get_user_balance"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("total_owed_to_me" numeric, "total_i_owe" numeric, "net_balance" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_owed_to_me NUMERIC := 0;
  v_i_owe NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN e.paid_by_user_id = p_user_id THEN
        e.amount - COALESCE((
          SELECT computed_amount
          FROM expense_splits
          WHERE expense_id = e.id AND user_id = p_user_id
        ), 0)
      ELSE 0
    END
  ), 0) INTO v_owed_to_me
  FROM expenses e
  WHERE e.is_payment = false
    AND (
      e.paid_by_user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id AND es.user_id = p_user_id
      )
    );

  SELECT COALESCE(SUM(es.computed_amount), 0) INTO v_i_owe
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE es.user_id = p_user_id
    AND e.paid_by_user_id != p_user_id
    AND e.is_payment = false;

  v_owed_to_me := v_owed_to_me - COALESCE((
    SELECT SUM(amount) FROM payments WHERE from_user = p_user_id
  ), 0);

  v_i_owe := v_i_owe - COALESCE((
    SELECT SUM(amount) FROM payments WHERE to_user = p_user_id
  ), 0);

  RETURN QUERY SELECT
    GREATEST(v_owed_to_me, 0),
    GREATEST(v_i_owe, 0),
    v_owed_to_me - v_i_owe;
END;
$$;


ALTER FUNCTION "public"."get_user_balance"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_balances"("p_user_id" "uuid") RETURNS TABLE("counterparty_id" "uuid", "counterparty_name" "text", "amount" numeric, "currency" "text", "i_owe_them" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH expense_balances AS (
        -- Get balances from expenses where user is involved
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS balance_counterparty_id,
            e.currency AS balance_currency,
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS balance_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND NOT es.is_settled
    ),
    payment_balances AS (
        -- Get balances from payments
        SELECT
            CASE
                WHEN pay.from_user = p_user_id THEN pay.to_user
                ELSE pay.from_user
            END AS balance_counterparty_id,
            pay.currency AS balance_currency,
            CASE
                WHEN pay.from_user = p_user_id THEN pay.amount
                ELSE -pay.amount
            END AS balance_amount
        FROM payments pay
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
    ),
    all_balances AS (
        SELECT balance_counterparty_id, balance_currency, balance_amount FROM expense_balances
        UNION ALL
        SELECT balance_counterparty_id, balance_currency, balance_amount FROM payment_balances
    ),
    aggregated AS (
        SELECT
            ab.balance_counterparty_id,
            ab.balance_currency,
            SUM(ab.balance_amount) AS net_amount
        FROM all_balances ab
        WHERE ab.balance_counterparty_id != p_user_id
        GROUP BY ab.balance_counterparty_id, ab.balance_currency
        HAVING SUM(ab.balance_amount) != 0
    )
    SELECT
        a.balance_counterparty_id AS counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.net_amount) AS amount,
        a.balance_currency AS currency,
        a.net_amount > 0 AS i_owe_them
    FROM aggregated a
    JOIN profiles p ON a.balance_counterparty_id = p.id
    ORDER BY a.balance_currency, ABS(a.net_amount) DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_balances"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_balances_with_history"("p_user_id" "uuid") RETURNS TABLE("counterparty_id" "uuid", "counterparty_name" "text", "amount" numeric, "currency" "text", "i_owe_them" boolean, "total_amount" numeric, "settled_amount" numeric, "remaining_amount" numeric, "transaction_count" integer, "last_transaction_date" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH all_transactions AS (
        -- Get all expense transactions
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS counterparty_id,
            e.currency,
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS amount,
            es.is_settled,
            e.created_at
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment

        UNION ALL

        -- Get all payment transactions
        SELECT
            CASE
                WHEN p.from_user = p_user_id THEN p.to_user
                ELSE p.from_user
            END AS counterparty_id,
            p.currency,
            CASE
                WHEN p.from_user = p_user_id THEN p.amount
                ELSE -p.amount
            END AS amount,
            TRUE AS is_settled,
            p.created_at
        FROM payments p
        WHERE (p.from_user = p_user_id OR p.to_user = p_user_id)
    ),
    aggregated AS (
        SELECT
            at.counterparty_id,
            at.currency,
            SUM(CASE WHEN NOT at.is_settled THEN at.amount ELSE 0 END) AS current_balance,
            SUM(ABS(at.amount)) AS total_amount,
            SUM(CASE WHEN at.is_settled THEN ABS(at.amount) ELSE 0 END) AS settled_amount,
            COUNT(*) AS transaction_count,
            MAX(at.created_at) AS last_transaction_date
        FROM all_transactions at
        WHERE at.counterparty_id != p_user_id
        GROUP BY at.counterparty_id, at.currency
    )
    SELECT
        a.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.current_balance) AS amount,
        a.currency,
        a.current_balance > 0 AS i_owe_them,
        a.total_amount,
        a.settled_amount,
        ABS(a.current_balance) AS remaining_amount,
        a.transaction_count::INTEGER,
        a.last_transaction_date
    FROM aggregated a
    JOIN profiles p ON a.counterparty_id = p.id
    ORDER BY a.currency, a.last_transaction_date DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_balances_with_history"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_debts_aggregated"("p_user_id" "uuid") RETURNS TABLE("counterparty_id" "uuid", "counterparty_name" "text", "amount" numeric, "currency" "text", "i_owe_them" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    WITH expense_debts AS (
        -- Get debts from expenses where user is involved
        -- Only include unsettled or partially settled debts
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END as counterparty_id,
            COALESCE(e.currency, 'VND') as currency,
            SUM(
                CASE
                    WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN
                        CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN
                        -CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    ELSE 0
                END
            ) as net_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id  -- Exclude self-payments
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
            AND (
                (es.is_settled = false) OR
                (es.is_settled = true AND es.settled_amount < es.computed_amount)
            )
        GROUP BY
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END,
            COALESCE(e.currency, 'VND')
        HAVING SUM(
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                ELSE 0
            END
        ) != 0
    ),
    -- Note: Payments are settlement transactions, not outstanding debts
    -- They should NOT be included in get_user_debts_aggregated
    -- Payments reduce debts but are not debts themselves
    all_debts AS (
        SELECT ed.counterparty_id, ed.currency, ed.net_amount FROM expense_debts ed
    ),
    aggregated AS (
        SELECT
            ad.counterparty_id,
            ad.currency,
            SUM(ad.net_amount) AS net_amount
        FROM all_debts ad
        WHERE ad.counterparty_id IS DISTINCT FROM p_user_id  -- Exclude self
        GROUP BY ad.counterparty_id, ad.currency
        HAVING SUM(ad.net_amount) != 0  -- Only return non-zero balances
    )
    SELECT
        agg.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(agg.net_amount) AS amount,
        agg.currency,
        (agg.net_amount > 0) AS i_owe_them
    FROM aggregated agg
    INNER JOIN profiles p ON p.id = agg.counterparty_id  -- Use INNER JOIN to ensure only existing profiles
    WHERE agg.counterparty_id IS NOT NULL  -- Extra safety check
    ORDER BY agg.currency, ABS(agg.net_amount) DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_debts_aggregated"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_debts_history"("p_user_id" "uuid") RETURNS TABLE("counterparty_id" "uuid", "counterparty_name" "text", "amount" numeric, "currency" "text", "i_owe_them" boolean, "total_amount" numeric, "settled_amount" numeric, "remaining_amount" numeric, "transaction_count" integer, "last_transaction_date" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH all_transactions AS (
        -- Get all expense transactions (including settled)
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS balance_counterparty_id,
            e.currency AS balance_currency,
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS balance_amount,
            es.is_settled,
            e.created_at
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment

        UNION ALL

        -- Get all payment transactions
        SELECT
            CASE
                WHEN pay.from_user = p_user_id THEN pay.to_user
                ELSE pay.from_user
            END AS balance_counterparty_id,
            pay.currency AS balance_currency,
            CASE
                WHEN pay.from_user = p_user_id THEN pay.amount
                ELSE -pay.amount
            END AS balance_amount,
            TRUE AS is_settled, -- Payments are considered settled
            pay.created_at
        FROM payments pay
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
    ),
    aggregated AS (
        SELECT
            at.balance_counterparty_id,
            at.balance_currency,
            SUM(CASE WHEN NOT at.is_settled THEN at.balance_amount ELSE 0 END) AS current_balance,
            SUM(ABS(at.balance_amount)) AS total_amount,
            SUM(CASE WHEN at.is_settled THEN ABS(at.balance_amount) ELSE 0 END) AS settled_amount,
            COUNT(*) AS transaction_count,
            MAX(at.created_at) AS last_transaction_date
        FROM all_transactions at
        WHERE at.balance_counterparty_id != p_user_id
        GROUP BY at.balance_counterparty_id, at.balance_currency
    )
    SELECT
        a.balance_counterparty_id AS counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.current_balance) AS amount,
        a.balance_currency AS currency,
        a.current_balance > 0 AS i_owe_them,
        a.total_amount,
        a.settled_amount,
        ABS(a.current_balance) AS remaining_amount,
        a.transaction_count::INTEGER,
        a.last_transaction_date
    FROM aggregated a
    JOIN profiles p ON a.balance_counterparty_id = p.id
    WHERE a.total_amount > 0  -- Include all transactions even if fully settled
    ORDER BY a.balance_currency, a.last_transaction_date DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_debts_history"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_debts_public"() RETURNS TABLE("counterparty_id" "uuid", "counterparty_name" "text", "amount" numeric, "currency" "text", "i_owe_them" boolean, "is_real_data" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_sample_user_id UUID;
BEGIN
    -- Find a user with recent activity who has outstanding debts
    SELECT es.user_id INTO v_sample_user_id
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE NOT es.is_settled
        AND e.created_at > CURRENT_DATE - INTERVAL '30 days'
        AND es.user_id != e.paid_by_user_id
        AND e.expense_date <= CURRENT_DATE
    ORDER BY e.created_at DESC
    LIMIT 1;

    -- If no active user found, return empty
    IF v_sample_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Use the same logic as get_user_debts_aggregated for consistency
    RETURN QUERY
    WITH expense_debts AS (
        -- Get debts from expenses where sample user is involved
        -- Only include unsettled or partially settled debts
        SELECT
            CASE
                WHEN es.user_id = v_sample_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END as counterparty_id,
            COALESCE(e.currency, 'VND') as currency,
            SUM(
                CASE
                    WHEN es.user_id = v_sample_user_id AND e.paid_by_user_id != v_sample_user_id THEN
                        CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    WHEN es.user_id != v_sample_user_id AND e.paid_by_user_id = v_sample_user_id THEN
                        -CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    ELSE 0
                END
            ) as net_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = v_sample_user_id OR e.paid_by_user_id = v_sample_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id  -- Exclude self-payments
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
            AND (
                (es.is_settled = false) OR
                (es.is_settled = true AND es.settled_amount < es.computed_amount)
            )
        GROUP BY
            CASE
                WHEN es.user_id = v_sample_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END,
            COALESCE(e.currency, 'VND')
        HAVING SUM(
            CASE
                WHEN es.user_id = v_sample_user_id AND e.paid_by_user_id != v_sample_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                WHEN es.user_id != v_sample_user_id AND e.paid_by_user_id = v_sample_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                ELSE 0
            END
        ) != 0
    ),
    all_debts AS (
        SELECT ed.counterparty_id, ed.currency, ed.net_amount FROM expense_debts ed
    ),
    aggregated AS (
        SELECT
            ad.counterparty_id,
            ad.currency,
            SUM(ad.net_amount) AS net_amount
        FROM all_debts ad
        WHERE ad.counterparty_id IS DISTINCT FROM v_sample_user_id  -- Exclude self
        GROUP BY ad.counterparty_id, ad.currency
        HAVING SUM(ad.net_amount) != 0  -- Only return non-zero balances
    )
    SELECT
        agg.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(agg.net_amount) AS amount,
        agg.currency,
        (agg.net_amount > 0) AS i_owe_them,
        TRUE AS is_real_data
    FROM aggregated agg
    INNER JOIN profiles p ON p.id = agg.counterparty_id
    WHERE agg.counterparty_id IS NOT NULL
    ORDER BY agg.currency, ABS(agg.net_amount) DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_debts_public"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_monthly_report"("p_user_id" "uuid", "p_month" integer, "p_year" integer) RETURNS TABLE("total_spent" numeric, "total_owed_to_me" numeric, "total_i_owe" numeric, "net_balance" numeric, "expense_count" integer, "payment_count" integer, "top_category" "text", "top_category_amount" numeric, "most_expensive_date" "date", "most_expensive_amount" numeric, "avg_expense" numeric, "group_count" integer, "friend_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calculate date range for the month
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  RETURN QUERY
  WITH user_expenses AS (
    SELECT 
      SUM(es.computed_amount) as total_spent_amt,
      COUNT(DISTINCT e.id) as exp_count,
      AVG(es.computed_amount) as avg_exp_amt
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
  ),
  user_owes AS (
    SELECT 
      SUM(es.computed_amount) as owed_amt
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.paid_by_user_id != p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
  ),
  user_owed AS (
    SELECT 
      SUM(es.computed_amount) as owed_to_me_amt
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id != p_user_id
      AND e.paid_by_user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
  ),
  user_payments AS (
    SELECT COUNT(*) as pay_count
    FROM payments
    WHERE (from_user = p_user_id OR to_user = p_user_id)
      AND payment_date BETWEEN v_start_date AND v_end_date
      AND deleted_at IS NULL
  ),
  top_cat AS (
    SELECT 
      e.category,
      SUM(es.computed_amount) as cat_total
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
    GROUP BY e.category
    ORDER BY cat_total DESC
    LIMIT 1
  ),
  most_exp AS (
    SELECT 
      e.expense_date,
      SUM(es.computed_amount) as daily_total
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
      AND e.is_payment = false
    GROUP BY e.expense_date
    ORDER BY daily_total DESC
    LIMIT 1
  ),
  activity_counts AS (
    SELECT
      COUNT(DISTINCT e.group_id) as grp_count,
      COUNT(DISTINCT e.friendship_id) as friend_count
    FROM expenses e
    JOIN expense_splits es ON es.expense_id = e.id
    WHERE es.user_id = p_user_id
      AND e.expense_date BETWEEN v_start_date AND v_end_date
      AND e.deleted_at IS NULL
  )
  SELECT
    COALESCE(ue.total_spent_amt, 0)::DECIMAL(12, 2),
    COALESCE(uow.owed_to_me_amt, 0)::DECIMAL(12, 2),
    COALESCE(uo.owed_amt, 0)::DECIMAL(12, 2),
    (COALESCE(uow.owed_to_me_amt, 0) - COALESCE(uo.owed_amt, 0))::DECIMAL(12, 2) as net_bal,
    COALESCE(ue.exp_count, 0)::INTEGER,
    COALESCE(up.pay_count, 0)::INTEGER,
    tc.category,
    COALESCE(tc.cat_total, 0)::DECIMAL(12, 2),
    me.expense_date,
    COALESCE(me.daily_total, 0)::DECIMAL(12, 2),
    COALESCE(ue.avg_exp_amt, 0)::DECIMAL(12, 2),
    COALESCE(ac.grp_count, 0)::INTEGER,
    COALESCE(ac.friend_count, 0)::INTEGER
  FROM user_expenses ue
  CROSS JOIN user_owes uo
  CROSS JOIN user_owed uow
  CROSS JOIN user_payments up
  CROSS JOIN activity_counts ac
  LEFT JOIN top_cat tc ON true
  LEFT JOIN most_exp me ON true;
END;
$$;


ALTER FUNCTION "public"."get_user_monthly_report"("p_user_id" "uuid", "p_month" integer, "p_year" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_monthly_report"("p_user_id" "uuid", "p_month" integer, "p_year" integer) IS 'Get comprehensive monthly financial report for a user including spending, balances, top categories, and activity counts.';



CREATE OR REPLACE FUNCTION "public"."get_user_settings"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("user_id" "uuid", "default_currency" "text", "number_format" "text", "preferred_language" "text", "timezone" "text", "notifications_enabled" boolean, "email_notifications" boolean, "notify_on_expense_added" boolean, "notify_on_payment_received" boolean, "notify_on_friend_request" boolean, "notify_on_group_invite" boolean, "allow_friend_requests" boolean, "allow_group_invites" boolean, "profile_visibility" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_target_user UUID;
BEGIN
  -- Default to current user if not specified
  v_target_user := COALESCE(p_user_id, auth.uid());
  
  -- Only allow viewing own settings unless admin
  IF v_target_user != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only view your own settings';
  END IF;
  
  RETURN QUERY
  SELECT 
    us.user_id,
    us.default_currency,
    us.number_format,
    us.preferred_language,
    us.timezone,
    us.notifications_enabled,
    us.email_notifications,
    us.notify_on_expense_added,
    us.notify_on_payment_received,
    us.notify_on_friend_request,
    us.notify_on_group_invite,
    us.allow_friend_requests,
    us.allow_group_invites,
    us.profile_visibility,
    us.created_at,
    us.updated_at
  FROM user_settings us
  WHERE us.user_id = v_target_user;
END;
$$;


ALTER FUNCTION "public"."get_user_settings"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_settings"("p_user_id" "uuid") IS 'Get complete user settings with defaults. Returns backend-required settings only.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Temporarily disable RLS for this INSERT
  SET LOCAL row_security = off;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hard_delete_old_records"("p_days_old" integer DEFAULT 90) RETURNS TABLE("expenses_deleted" integer, "payments_deleted" integer, "groups_deleted" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
  v_expenses_count INTEGER;
  v_payments_count INTEGER;
  v_groups_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can permanently delete records';
  END IF;
  
  v_cutoff_date := NOW() - (p_days_old || ' days')::INTERVAL;
  
  -- Delete old expenses
  DELETE FROM expenses
  WHERE deleted_at IS NOT NULL
    AND deleted_at < v_cutoff_date;
  GET DIAGNOSTICS v_expenses_count = ROW_COUNT;
  
  -- Delete old payments
  DELETE FROM payments
  WHERE deleted_at IS NOT NULL
    AND deleted_at < v_cutoff_date;
  GET DIAGNOSTICS v_payments_count = ROW_COUNT;
  
  -- Delete old groups
  DELETE FROM groups
  WHERE deleted_at IS NOT NULL
    AND deleted_at < v_cutoff_date;
  GET DIAGNOSTICS v_groups_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_expenses_count, v_payments_count, v_groups_count;
END;
$$;


ALTER FUNCTION "public"."hard_delete_old_records"("p_days_old" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."hard_delete_old_records"("p_days_old" integer) IS 'Permanently delete records older than specified days (admin only, use with caution)';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Only check if user_roles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    );
  END IF;
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_added_to_group"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_group_name TEXT;
    v_adder_name TEXT;
BEGIN
    -- Get group name
    SELECT name INTO v_group_name
    FROM public.groups
    WHERE id = NEW.group_id;

    -- Get adder name (the creator of the group or current user)
    SELECT full_name INTO v_adder_name
    FROM public.profiles
    WHERE id = COALESCE(auth.uid(), NEW.user_id);

    -- Don't notify the user who created the group (they added themselves)
    IF NEW.user_id != (SELECT created_by FROM public.groups WHERE id = NEW.group_id) THEN
        PERFORM public.create_notification(
            NEW.user_id,
            'added_to_group',
            'Added to Group',
            'You were added to "' || v_group_name || '"',
            '/groups/show/' || NEW.group_id,
            NEW.group_id
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_added_to_group"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_added_to_group"() IS 'Trigger function to notify users when they are added to a group';



CREATE OR REPLACE FUNCTION "public"."notify_expense_added"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense RECORD;
  v_creator_name TEXT;
  v_notify_enabled BOOLEAN;
  v_link TEXT;
BEGIN
  -- Get expense details
  SELECT e.* INTO v_expense
  FROM expenses e
  WHERE e.id = NEW.expense_id;

  -- Skip if expense doesn't exist (shouldn't happen, but safety check)
  IF v_expense IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if this split belongs to the creator (they don't need notification)
  IF NEW.user_id = v_expense.created_by THEN
    RETURN NEW;
  END IF;

  -- Get creator's full name from profiles
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = v_expense.created_by;

  -- Check if user has expense notifications enabled
  SELECT COALESCE(notify_on_expense_added, TRUE) INTO v_notify_enabled
  FROM user_settings
  WHERE user_id = NEW.user_id;

  -- If notifications are disabled, skip
  IF v_notify_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  -- Determine link based on context
  IF v_expense.context_type = 'group' AND v_expense.group_id IS NOT NULL THEN
    v_link := '/groups/show/' || v_expense.group_id;
  ELSIF v_expense.context_type = 'friend' AND v_expense.friendship_id IS NOT NULL THEN
    v_link := '/friends/show/' || v_expense.friendship_id;
  ELSE
    v_link := '/expenses';
  END IF;

  -- Create notification for this participant
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    related_id,
    is_read,
    created_at
  ) VALUES (
    NEW.user_id,
    'expense_added',
    COALESCE(v_creator_name, 'Someone') || ' added a new expense',
    'Expense: "' || v_expense.description || '" - ' || v_expense.amount || ' ' || v_expense.currency,
    v_link,
    v_expense.id,
    FALSE,
    NOW()
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_expense_added"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_expense_added"() IS 'Trigger function to notify group members when an expense is added';



CREATE OR REPLACE FUNCTION "public"."notify_friend_accepted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_accepter_name TEXT;
    v_requester_id UUID;
BEGIN
    -- Only notify when status changes from pending to accepted
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        -- Get accepter name (the person who updated the status)
        SELECT full_name INTO v_accepter_name
        FROM public.profiles
        WHERE id = auth.uid();

        -- Determine original requester
        IF NEW.user_a = NEW.created_by THEN
            v_requester_id := NEW.user_a;
        ELSE
            v_requester_id := NEW.user_b;
        END IF;

        PERFORM public.create_notification(
            v_requester_id,
            'friend_accepted',
            'Friend Request Accepted',
            v_accepter_name || ' accepted your friend request',
            '/friends/show/' || NEW.id,
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_friend_accepted"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_friend_accepted"() IS 'Trigger function to notify users when their friend request is accepted';



CREATE OR REPLACE FUNCTION "public"."notify_friend_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_recipient_id UUID;
  v_requester_id UUID;
  v_requester_name TEXT;
  v_notify_enabled BOOLEAN;
BEGIN
  -- Only create notification for pending friend requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (the user who did NOT create the request)
  -- and requester (the user who created the request)
  v_requester_id := NEW.created_by;

  IF NEW.user_a = v_requester_id THEN
    v_recipient_id := NEW.user_b;
  ELSE
    v_recipient_id := NEW.user_a;
  END IF;

  -- Get requester's full name from profiles (if exists)
  BEGIN
    SELECT full_name INTO v_requester_name
    FROM profiles
    WHERE id = v_requester_id;
  EXCEPTION WHEN OTHERS THEN
    v_requester_name := 'Someone';
  END;

  -- Check if recipient has friend request notifications enabled (if user_settings exists)
  BEGIN
    SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled
    FROM user_settings
    WHERE user_id = v_recipient_id;
  EXCEPTION WHEN OTHERS THEN
    v_notify_enabled := TRUE;
  END;

  -- If notifications are disabled, skip
  IF v_notify_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  -- Create notification for recipient (if notifications table exists)
  BEGIN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      related_id,
      is_read,
      created_at
    ) VALUES (
      v_recipient_id,
      'friend_request',
      COALESCE(v_requester_name, 'Someone') || ' sent you a friend request',
      'Accept or reject this request on the Friends page',
      '/friends',
      NEW.id,
      FALSE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently fail if notifications table doesn't exist yet
    NULL;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_friend_request"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_friend_request"() IS 'Trigger function to notify users when they receive a friend request';



CREATE OR REPLACE FUNCTION "public"."notify_payment_recorded"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Notify the person receiving the payment
  IF should_send_notification(NEW.to_user, 'payment_received') THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      reference_id,
      reference_type
    ) VALUES (
      NEW.to_user,
      'payment_received',
      'Payment Received',
      'You received a payment of ' || NEW.amount || ' ' || NEW.currency,
      NEW.id,
      'payment'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_payment_recorded"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_payment_recorded"() IS 'Trigger function to notify users when a payment is recorded';



CREATE OR REPLACE FUNCTION "public"."prevent_self_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.from_user = NEW.to_user THEN
    RAISE EXCEPTION 'Cannot create payment from user to themselves (user_id: %)', NEW.from_user;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_self_payment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_self_payment"() IS 'Prevents users from creating payments to themselves';



CREATE OR REPLACE FUNCTION "public"."restore_deleted_expense"("p_expense_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore deleted expenses';
  END IF;
  
  -- Restore the expense
  UPDATE expenses
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_expense_id
    AND deleted_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."restore_deleted_expense"("p_expense_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_deleted_expense"("p_expense_id" "uuid") IS 'Restore a soft-deleted expense (admin only)';



CREATE OR REPLACE FUNCTION "public"."restore_deleted_group"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore deleted groups';
  END IF;
  
  -- Restore the group
  UPDATE groups
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_group_id
    AND deleted_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."restore_deleted_group"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_deleted_group"("p_group_id" "uuid") IS 'Restore a soft-deleted group (admin only)';



CREATE OR REPLACE FUNCTION "public"."restore_deleted_payment"("p_payment_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore deleted payments';
  END IF;
  
  -- Restore the payment
  UPDATE payments
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_payment_id
    AND deleted_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."restore_deleted_payment"("p_payment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_deleted_payment"("p_payment_id" "uuid") IS 'Restore a soft-deleted payment (admin only)';



CREATE OR REPLACE FUNCTION "public"."search_audit_logs"("p_table_name" "text" DEFAULT NULL::"text", "p_operation" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 100) RETURNS TABLE("id" "uuid", "user_id" "uuid", "user_name" "text", "table_name" "text", "operation" "text", "record_id" "uuid", "changed_fields" "text"[], "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only admins can search all audit logs
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can search audit logs';
  END IF;
  
  -- Set default dates
  p_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '90 days');
  p_end_date := COALESCE(p_end_date, NOW());
  
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    p.display_name as user_name,
    al.table_name,
    al.operation,
    al.record_id,
    al.changed_fields,
    al.created_at
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.user_id
  WHERE (p_table_name IS NULL OR al.table_name = p_table_name)
    AND (p_operation IS NULL OR al.operation = p_operation)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND al.created_at BETWEEN p_start_date AND p_end_date
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."search_audit_logs"("p_table_name" "text", "p_operation" "text", "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_audit_logs"("p_table_name" "text", "p_operation" "text", "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer) IS 'Search audit logs with filters (admin only)';



CREATE OR REPLACE FUNCTION "public"."settle_all_debts_with_person"("p_counterparty_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_settled_count integer := 0;
    v_total_amount decimal := 0;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Calculate total amount to settle
    SELECT COALESCE(SUM(es.computed_amount), 0)
    INTO v_total_amount
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE e.paid_by_user_id = v_user_id
      AND es.user_id = p_counterparty_id
      AND e.is_payment = false;

    -- Mark all unpaid expenses as paid
    UPDATE expenses e
    SET
        is_payment = true,
        updated_at = NOW()
    FROM expense_splits es
    WHERE e.id = es.expense_id
      AND e.paid_by_user_id = v_user_id
      AND es.user_id = p_counterparty_id
      AND e.is_payment = false;

    GET DIAGNOSTICS v_settled_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'settled_count', v_settled_count,
        'total_amount', v_total_amount,
        'counterparty_name', (SELECT full_name FROM profiles WHERE id = p_counterparty_id),
        'message', format('Settled all debts (₫%s) with %s',
            v_total_amount,
            (SELECT full_name FROM profiles WHERE id = p_counterparty_id))
    );
END;
$$;


ALTER FUNCTION "public"."settle_all_debts_with_person"("p_counterparty_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."settle_all_debts_with_person"("p_counterparty_id" "uuid") IS 'Settles all outstanding debts with a specific person. Converts all unpaid expenses to paid status.';



CREATE OR REPLACE FUNCTION "public"."settle_all_group_debts"("p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_is_group_admin BOOLEAN;
  v_is_system_admin BOOLEAN;
  v_splits_count INTEGER := 0;
  v_total_amount NUMERIC(10,2) := 0;
  v_expenses_count INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Check if user is group admin (only if not system admin)
  IF NOT v_is_system_admin THEN
    SELECT role = 'admin' INTO v_is_group_admin
    FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    IF NOT v_is_group_admin THEN
      RAISE EXCEPTION 'Only group admins or system admins can settle all debts';
    END IF;
  END IF;

  -- Calculate total amount to be settled
  SELECT
    COUNT(*),
    COALESCE(SUM(computed_amount - COALESCE(settled_amount, 0)), 0)
  INTO v_splits_count, v_total_amount
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.group_id = p_group_id
    AND e.is_payment = false
    AND es.is_settled = false;

  -- Mark all unsettled splits as settled
  UPDATE expense_splits es
  SET
    is_settled = true,
    settled_amount = computed_amount,
    settled_at = NOW()
  FROM expenses e
  WHERE es.expense_id = e.id
    AND e.group_id = p_group_id
    AND e.is_payment = false
    AND es.is_settled = false;

  -- Count affected expenses
  SELECT COUNT(DISTINCT e.id) INTO v_expenses_count
  FROM expenses e
  WHERE e.group_id = p_group_id
    AND e.is_payment = false
    AND EXISTS (
      SELECT 1 FROM expense_splits es
      WHERE es.expense_id = e.id AND es.is_settled = true
    );

  -- Mark all expenses as paid
  UPDATE expenses
  SET is_payment = true, updated_at = NOW()
  WHERE group_id = p_group_id
    AND is_payment = false;

  -- Log to audit_logs
  INSERT INTO audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    changed_fields
  ) VALUES (
    v_user_id,
    'expenses',
    'BULK_SETTLE',
    p_group_id,
    jsonb_build_object(
      'group_id', p_group_id,
      'splits_settled', v_splits_count,
      'expenses_settled', v_expenses_count,
      'total_amount', v_total_amount,
      'settled_by_admin', v_is_system_admin
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'splits_settled', v_splits_count,
    'expenses_settled', v_expenses_count,
    'total_amount', v_total_amount,
    'message', format('Settled %s debts totaling ₫%s', v_splits_count, v_total_amount)
  );
END;
$$;


ALTER FUNCTION "public"."settle_all_group_debts"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."settle_all_group_debts"("p_group_id" "uuid") IS 'Settles all outstanding debts in a group. Can be called by group admins or system admins. Marks all unsettled splits as settled and logs to audit_logs.';



CREATE OR REPLACE FUNCTION "public"."settle_expense"("p_expense_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense RECORD;
  v_splits_count INTEGER;
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can settle the expense';
  END IF;

  IF v_expense.is_payment THEN
    RAISE EXCEPTION 'Expense is already settled';
  END IF;

  UPDATE expense_splits
  SET is_settled = true, settled_amount = computed_amount, settled_at = NOW()
  WHERE expense_id = p_expense_id AND is_settled = false;

  GET DIAGNOSTICS v_splits_count = ROW_COUNT;

  UPDATE expenses SET is_payment = true WHERE id = p_expense_id;

  RETURN jsonb_build_object(
    'success', true,
    'expense_id', p_expense_id,
    'splits_settled', v_splits_count
  );
END;
$$;


ALTER FUNCTION "public"."settle_expense"("p_expense_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."settle_expense"("p_expense_id" "uuid") IS 'Settle all splits for an expense. Can be called by payer or system admin.';



CREATE OR REPLACE FUNCTION "public"."settle_individual_debt"("p_counterparty_id" "uuid", "p_amount" numeric) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_settled_count integer := 0;
    v_payment_id uuid;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Mark all matching unpaid expenses as paid
    -- These are expenses where:
    -- 1. paid_by_user_id = current user (I paid)
    -- 2. expense_splits.user_id = counterparty (they owe me)
    -- 3. is_payment = false (unpaid)
    UPDATE expenses e
    SET
        is_payment = true,
        updated_at = NOW()
    FROM expense_splits es
    WHERE e.id = es.expense_id
      AND e.paid_by_user_id = v_user_id
      AND es.user_id = p_counterparty_id
      AND e.is_payment = false
      AND es.computed_amount <= p_amount;

    GET DIAGNOSTICS v_settled_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'settled_count', v_settled_count,
        'message', format('Settled %s debt(s) with %s', v_settled_count,
            (SELECT full_name FROM profiles WHERE id = p_counterparty_id))
    );
END;
$$;


ALTER FUNCTION "public"."settle_individual_debt"("p_counterparty_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."settle_individual_debt"("p_counterparty_id" "uuid", "p_amount" numeric) IS 'Marks individual debt as paid by changing is_payment from false to true. Only authenticated users can settle their own debts.';



CREATE OR REPLACE FUNCTION "public"."settle_split"("p_split_id" "uuid", "p_amount" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_split RECORD;
  v_expense RECORD;
  v_settled_amount DECIMAL;
BEGIN
  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found'; END IF;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can settle splits';
  END IF;

  IF v_split.is_settled THEN
    RAISE EXCEPTION 'Split is already settled';
  END IF;

  v_settled_amount := COALESCE(p_amount, v_split.computed_amount);

  IF v_settled_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be greater than 0';
  END IF;

  IF v_settled_amount > v_split.computed_amount THEN
    RAISE EXCEPTION 'Settlement amount cannot exceed computed amount';
  END IF;

  UPDATE expense_splits
  SET is_settled = true, settled_amount = v_settled_amount, settled_at = NOW()
  WHERE id = p_split_id;

  RETURN jsonb_build_object(
    'success', true,
    'split_id', p_split_id,
    'settled_amount', v_settled_amount,
    'computed_amount', v_split.computed_amount,
    'is_partial', v_settled_amount < v_split.computed_amount
  );
END;
$$;


ALTER FUNCTION "public"."settle_split"("p_split_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."settle_split"("p_split_id" "uuid", "p_amount" numeric) IS 'Settle an individual split with optional custom amount. Can be called by payer or system admin.';



CREATE OR REPLACE FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Check master notification switch and specific notification type
  SELECT 
    CASE 
      WHEN NOT notifications_enabled THEN FALSE
      WHEN NOT email_notifications THEN FALSE
      WHEN p_notification_type = 'expense_added' THEN notify_on_expense_added
      WHEN p_notification_type = 'payment_received' THEN notify_on_payment_received
      WHEN p_notification_type = 'friend_request' THEN notify_on_friend_request
      WHEN p_notification_type = 'group_invite' THEN notify_on_group_invite
      ELSE FALSE
    END INTO v_result
  FROM user_settings
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$;


ALTER FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") IS 'Check if user should receive a notification based on their preferences. Used by notification triggers.';



CREATE OR REPLACE FUNCTION "public"."simplify_group_debts"("p_group_id" "uuid") RETURNS TABLE("from_user_id" "uuid", "to_user_id" "uuid", "amount" numeric, "from_user_name" "text", "to_user_name" "text", "from_user_avatar" "text", "to_user_avatar" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_giver RECORD;
  v_receiver RECORD;
  v_settle_amount NUMERIC(10,2);
BEGIN
  -- Step 1: Calculate net balance for each group member
  -- Net Balance = (Total Paid) - (Total Owed) + (Payments Received) - (Payments Made)
  CREATE TEMP TABLE temp_net_balances AS
  SELECT
    gm.user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    COALESCE(
      -- Amount this user paid for expenses
      (SELECT SUM(e.amount)
       FROM expenses e
       WHERE e.group_id = p_group_id
         AND e.paid_by_user_id = gm.user_id
         AND e.is_payment = false),
      0
    ) -
    COALESCE(
      -- Amount this user owes (minus settled amounts)
      (SELECT SUM(es.computed_amount - COALESCE(es.settled_amount, 0))
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = p_group_id
         AND es.user_id = gm.user_id
         AND e.is_payment = false),
      0
    ) +
    COALESCE(
      -- Payments received by this user
      (SELECT SUM(e.amount)
       FROM expenses e
       WHERE e.group_id = p_group_id
         AND e.paid_by_user_id = gm.user_id
         AND e.is_payment = true),
      0
    ) -
    COALESCE(
      -- Payments made by this user
      (SELECT SUM(es.computed_amount)
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = p_group_id
         AND es.user_id = gm.user_id
         AND e.is_payment = true),
      0
    ) as net_balance
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id;

  -- Step 2: Separate into Givers (negative) and Receivers (positive)
  CREATE TEMP TABLE temp_givers AS
  SELECT user_id, user_name, user_avatar, ABS(net_balance) as amount
  FROM temp_net_balances
  WHERE net_balance < -0.01  -- Use small threshold to avoid floating point issues
  ORDER BY ABS(net_balance) DESC;

  CREATE TEMP TABLE temp_receivers AS
  SELECT user_id, user_name, user_avatar, net_balance as amount
  FROM temp_net_balances
  WHERE net_balance > 0.01  -- Use small threshold to avoid floating point issues
  ORDER BY net_balance DESC;

  -- Step 3: Greedy matching - largest giver pays largest receiver
  FOR v_giver IN SELECT * FROM temp_givers LOOP
    FOR v_receiver IN SELECT * FROM temp_receivers WHERE amount > 0.01 LOOP
      -- Calculate settlement amount (minimum of what giver owes and receiver is owed)
      v_settle_amount := LEAST(v_giver.amount, v_receiver.amount);

      IF v_settle_amount > 0.01 THEN
        -- Return this simplified transaction
        from_user_id := v_giver.user_id;
        to_user_id := v_receiver.user_id;
        amount := ROUND(v_settle_amount, 2);
        from_user_name := v_giver.user_name;
        to_user_name := v_receiver.user_name;
        from_user_avatar := v_giver.user_avatar;
        to_user_avatar := v_receiver.user_avatar;
        RETURN NEXT;

        -- Update remaining amounts
        UPDATE temp_givers
        SET amount = amount - v_settle_amount
        WHERE user_id = v_giver.user_id;

        UPDATE temp_receivers
        SET amount = amount - v_settle_amount
        WHERE user_id = v_receiver.user_id;

        -- Update loop variable
        v_giver.amount := v_giver.amount - v_settle_amount;

        -- If giver is fully settled, move to next giver
        IF v_giver.amount < 0.01 THEN
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Cleanup temp tables
  DROP TABLE IF EXISTS temp_net_balances;
  DROP TABLE IF EXISTS temp_givers;
  DROP TABLE IF EXISTS temp_receivers;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."simplify_group_debts"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."simplify_group_debts"("p_group_id" "uuid") IS 'Simplifies group debts using Min-Cost Max-Flow algorithm.
Reduces complex multi-party transactions into minimal direct payments.
Example: Instead of A→B $10, B→C $15, C→A $5, returns: B→C $5 (67% reduction)';



CREATE OR REPLACE FUNCTION "public"."soft_delete_expense"("p_expense_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense_exists BOOLEAN;
  v_is_system_admin BOOLEAN;
BEGIN
  -- Check if user is system admin
  v_is_system_admin := is_admin();

  -- Check if expense exists and user has permission
  IF v_is_system_admin THEN
    -- System admin can delete any expense
    SELECT EXISTS(
      SELECT 1 FROM expenses
      WHERE id = p_expense_id
        AND deleted_at IS NULL
    ) INTO v_expense_exists;
  ELSE
    -- Regular users can only delete their own expenses
    SELECT EXISTS(
      SELECT 1 FROM expenses
      WHERE id = p_expense_id
        AND created_by = auth.uid()
        AND deleted_at IS NULL
    ) INTO v_expense_exists;
  END IF;

  IF NOT v_expense_exists THEN
    RAISE EXCEPTION 'Expense not found or you do not have permission to delete it';
  END IF;

  -- Soft delete the expense
  UPDATE expenses
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_expense_id
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."soft_delete_expense"("p_expense_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."soft_delete_expense"("p_expense_id" "uuid") IS 'Soft delete an expense. Can be called by expense creator or system admin.';



CREATE OR REPLACE FUNCTION "public"."soft_delete_group"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_group_exists BOOLEAN;
BEGIN
  -- Check if user is group admin
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only group admins can delete groups';
  END IF;
  
  -- Check if group exists and is not already deleted
  SELECT EXISTS(
    SELECT 1 FROM groups
    WHERE id = p_group_id
      AND deleted_at IS NULL
  ) INTO v_group_exists;
  
  IF NOT v_group_exists THEN
    RAISE EXCEPTION 'Group not found or already deleted';
  END IF;
  
  -- Soft delete the group
  UPDATE groups
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_group_id
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."soft_delete_group"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."soft_delete_group"("p_group_id" "uuid") IS 'Soft delete a group (admin only)';



CREATE OR REPLACE FUNCTION "public"."soft_delete_payment"("p_payment_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_payment_exists BOOLEAN;
BEGIN
  -- Check if payment exists and user has permission
  SELECT EXISTS(
    SELECT 1 FROM payments
    WHERE id = p_payment_id
      AND created_by = auth.uid()
      AND deleted_at IS NULL
  ) INTO v_payment_exists;
  
  IF NOT v_payment_exists THEN
    RAISE EXCEPTION 'Payment not found or you do not have permission to delete it';
  END IF;
  
  -- Soft delete the payment
  UPDATE payments
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_payment_id
    AND created_by = auth.uid()
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."soft_delete_payment"("p_payment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."soft_delete_payment"("p_payment_id" "uuid") IS 'Soft delete a payment (creator only)';



CREATE OR REPLACE FUNCTION "public"."unsettle_split"("p_split_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_split RECORD;
  v_expense RECORD;
BEGIN
  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = v_split.expense_id;

  -- Allow payer OR system admin
  IF v_expense.paid_by_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only the payer or admin can unsettle splits';
  END IF;

  UPDATE expense_splits
  SET is_settled = false, settled_amount = 0, settled_at = NULL
  WHERE id = p_split_id;

  RETURN jsonb_build_object('success', true, 'split_id', p_split_id);
END;
$$;


ALTER FUNCTION "public"."unsettle_split"("p_split_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unsettle_split"("p_split_id" "uuid") IS 'Unsettle a split (for corrections). Can be called by payer or system admin.';



CREATE OR REPLACE FUNCTION "public"."update_donation_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_donation_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_existing_profiles_from_mapping"() RETURNS TABLE("updated_count" integer, "email" "text", "full_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rec RECORD;
  update_count INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT 
      u.id,
      u.email,
      m.full_name
    FROM auth.users u
    INNER JOIN employee_name_mapping m ON u.email = m.email
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL OR p.full_name != m.full_name
  LOOP
    -- Insert or update profile
    INSERT INTO public.profiles (id, full_name, created_at, updated_at)
    VALUES (rec.id, rec.full_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, updated_at = NOW();

    update_count := update_count + 1;
    
    RETURN QUERY SELECT update_count, rec.email, rec.full_name;
  END LOOP;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."update_existing_profiles_from_mapping"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_friendships_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_friendships_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_momo_payment_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_momo_payment_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_momo_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_momo_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_name_by_email"("user_email" "text", "user_full_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get user ID from auth.users by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  IF user_uuid IS NOT NULL THEN
    -- Update or insert profile
    INSERT INTO public.profiles (id, full_name, created_at, updated_at)
    VALUES (user_uuid, user_full_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, updated_at = NOW();
  ELSE
    RAISE NOTICE 'User with email % not found in auth.users', user_email;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_profile_name_by_email"("user_email" "text", "user_full_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_recurring_expenses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_recurring_expenses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_group_member"("group_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Temporarily disable RLS to prevent recursion
  SET LOCAL row_security = off;

  RETURN EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_id = group_uuid
      AND user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."user_is_group_member"("group_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_currency_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_valid_currencies TEXT[] := ARRAY['VND', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'THB', 'SGD'];
BEGIN
  -- Check if currency is in allowed list
  IF NEW.currency IS NOT NULL AND NOT (NEW.currency = ANY(v_valid_currencies)) THEN
    RAISE EXCEPTION 'Invalid currency code: %. Allowed currencies: %', 
      NEW.currency, array_to_string(v_valid_currencies, ', ')
    USING HINT = 'Use standard ISO 4217 currency codes';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_currency_code"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_currency_code"() IS 'Validates currency code is one of supported currencies (VND, USD, EUR, etc.)';



CREATE OR REPLACE FUNCTION "public"."validate_date_not_future"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_max_future_days INTEGER := 365; -- Allow 1 year into future
  v_date DATE;
BEGIN
  -- Get the date to validate (different column names in different tables)
  IF TG_TABLE_NAME = 'expenses' THEN
    v_date := NEW.expense_date;
  ELSIF TG_TABLE_NAME = 'payments' THEN
    v_date := NEW.payment_date;
  ELSE
    RETURN NEW; -- No validation for other tables
  END IF;
  
  -- Check if date is too far in future
  IF v_date > (CURRENT_DATE + v_max_future_days) THEN
    RAISE EXCEPTION 'Date cannot be more than % days in the future, got: %',
      v_max_future_days, v_date
    USING HINT = 'Check if date is entered correctly';
  END IF;
  
  -- Warn if date is very old (more than 5 years ago)
  IF v_date < (CURRENT_DATE - 1825) THEN -- 5 years
    RAISE WARNING 'Date is more than 5 years in the past: %. Is this correct?', v_date;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_date_not_future"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_date_not_future"() IS 'Validates dates are not too far in future (max 1 year) and warns if too old (>5 years)';



CREATE OR REPLACE FUNCTION "public"."validate_description"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Trim whitespace and check if empty
  NEW.description := TRIM(NEW.description);
  
  IF LENGTH(NEW.description) = 0 THEN
    RAISE EXCEPTION 'Description cannot be empty or whitespace only';
  END IF;
  
  -- Check minimum length
  IF LENGTH(NEW.description) < 2 THEN
    RAISE EXCEPTION 'Description too short (minimum 2 characters), got: "%"', NEW.description;
  END IF;
  
  -- Check maximum length
  IF LENGTH(NEW.description) > 500 THEN
    RAISE EXCEPTION 'Description too long (maximum 500 characters), got % characters', 
      LENGTH(NEW.description);
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_description"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_description"() IS 'Validates description is not empty, has minimum 2 chars, maximum 500 chars';



CREATE OR REPLACE FUNCTION "public"."validate_expense_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be positive, got: %', NEW.amount;
  END IF;
  
  -- Check if amount is reasonable (not too large)
  IF NEW.amount > 999999999.99 THEN
    RAISE EXCEPTION 'Expense amount too large (maximum 999,999,999.99), got: %', NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_expense_amount"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_expense_amount"() IS 'Validates expense amount is positive and within reasonable limits (0.01 - 999,999,999.99)';



CREATE OR REPLACE FUNCTION "public"."validate_expense_context"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Validate context_type matches the provided IDs
  IF NEW.context_type = 'group' THEN
    IF NEW.group_id IS NULL THEN
      RAISE EXCEPTION 'Group expense must have a group_id';
    END IF;
    IF NEW.friendship_id IS NOT NULL THEN
      RAISE EXCEPTION 'Group expense cannot have a friendship_id';
    END IF;
  ELSIF NEW.context_type = 'friend' THEN
    IF NEW.friendship_id IS NULL THEN
      RAISE EXCEPTION 'Friend expense must have a friendship_id';
    END IF;
    IF NEW.group_id IS NOT NULL THEN
      RAISE EXCEPTION 'Friend expense cannot have a group_id';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid context_type: %. Must be "group" or "friend"', NEW.context_type;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_expense_context"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_expense_context"() IS 'Validates expense context_type matches provided group_id or friendship_id';



CREATE OR REPLACE FUNCTION "public"."validate_expense_splits"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_expense_amount DECIMAL(12, 2);
  v_total_splits DECIMAL(12, 2);
  v_difference DECIMAL(12, 2);
  v_tolerance DECIMAL(12, 2) := 0.01; -- Allow 1 cent difference for rounding
BEGIN
  -- Get the expense amount
  SELECT amount INTO v_expense_amount
  FROM expenses
  WHERE id = NEW.expense_id;
  
  IF v_expense_amount IS NULL THEN
    RAISE EXCEPTION 'Expense not found for split validation';
  END IF;
  
  -- Calculate total of all splits for this expense
  SELECT COALESCE(SUM(computed_amount), 0) INTO v_total_splits
  FROM expense_splits
  WHERE expense_id = NEW.expense_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID); -- Exclude current row if updating
  
  -- Add current split
  v_total_splits := v_total_splits + NEW.computed_amount;
  
  -- Calculate difference
  v_difference := ABS(v_total_splits - v_expense_amount);
  
  -- Check if total matches expense amount (within tolerance)
  IF v_difference > v_tolerance THEN
    RAISE EXCEPTION 'Sum of splits (%) does not match expense amount (%), difference: %',
      v_total_splits, v_expense_amount, v_difference
    USING HINT = 'Adjust split amounts to match expense total within ±0.01';
  END IF;
  
  -- Validate computed_amount is not negative
  IF NEW.computed_amount < 0 THEN
    RAISE EXCEPTION 'Split computed_amount cannot be negative, got: %', NEW.computed_amount;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_expense_splits"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_expense_splits"() IS 'Validates that expense splits sum to expense amount (±0.01 tolerance). Trigger is commented out by default.';



CREATE OR REPLACE FUNCTION "public"."validate_payment_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_debt DECIMAL(12, 2);
BEGIN
  -- Check if amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive, got: %', NEW.amount;
  END IF;
  
  -- Check if amount is reasonable
  IF NEW.amount > 999999999.99 THEN
    RAISE EXCEPTION 'Payment amount too large (maximum 999,999,999.99), got: %', NEW.amount;
  END IF;
  
  -- Calculate current debt (simplified check)
  -- Note: This is a soft warning, we allow overpayment for flexibility
  IF NEW.group_id IS NOT NULL THEN
    SELECT COALESCE(SUM(es.computed_amount), 0) 
    INTO v_current_debt
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = NEW.from_user
      AND e.paid_by_user_id = NEW.to_user
      AND e.group_id = NEW.group_id
      AND e.deleted_at IS NULL;
    
    -- Warn if payment exceeds debt by more than 10%
    IF NEW.amount > (v_current_debt * 1.1) THEN
      RAISE NOTICE 'Payment amount (%) may exceed current debt (%) in group', 
        NEW.amount, v_current_debt;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_payment_amount"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_payment_amount"() IS 'Validates payment amount is positive and warns if exceeds current debt';



CREATE OR REPLACE FUNCTION "public"."validate_split_method"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Validate split_method is one of allowed values
  IF NEW.split_method NOT IN ('equal', 'exact', 'percentage') THEN
    RAISE EXCEPTION 'Invalid split_method: %. Must be "equal", "exact", or "percentage"', 
      NEW.split_method;
  END IF;
  
  -- Validate split_value is provided when needed
  IF NEW.split_method IN ('exact', 'percentage') THEN
    IF NEW.split_value IS NULL THEN
      RAISE EXCEPTION 'split_value is required for split_method: %', NEW.split_method;
    END IF;
    
    -- Validate percentage is 0-100
    IF NEW.split_method = 'percentage' THEN
      IF NEW.split_value < 0 OR NEW.split_value > 100 THEN
        RAISE EXCEPTION 'Percentage split_value must be between 0 and 100, got: %', 
          NEW.split_value;
      END IF;
    END IF;
    
    -- Validate exact amount is positive
    IF NEW.split_method = 'exact' THEN
      IF NEW.split_value < 0 THEN
        RAISE EXCEPTION 'Exact split_value cannot be negative, got: %', NEW.split_value;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_split_method"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_split_method"() IS 'Validates split_method is valid and split_value is provided when required';



CREATE OR REPLACE FUNCTION "public"."verify_momo_payment"("p_reference_code" "text", "p_tran_id" "text", "p_amount" numeric, "p_webhook_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
        v_payment_request momo_payment_requests%ROWTYPE;
        v_expense_split expense_splits%ROWTYPE;
        v_result JSONB;
    BEGIN
        -- Find the payment request
        SELECT * INTO v_payment_request
        FROM momo_payment_requests
        WHERE reference_code = p_reference_code
        AND status = 'pending'
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Payment request not found or already processed'
            );
        END IF;

        -- Verify amount matches
        IF v_payment_request.amount != p_amount THEN
            -- Update status to failed
            UPDATE momo_payment_requests
            SET status = 'failed',
                momo_tran_id = p_tran_id,
                raw_webhook_data = p_webhook_data,
                updated_at = NOW()
            WHERE id = v_payment_request.id;

            RETURN jsonb_build_object(
                'success', false,
                'error', 'Amount mismatch'
            );
        END IF;

        -- Update payment request status
        UPDATE momo_payment_requests
        SET status = 'verified',
            verified_at = NOW(),
            momo_tran_id = p_tran_id,
            raw_webhook_data = p_webhook_data,
            updated_at = NOW()
        WHERE id = v_payment_request.id;

        -- Update expense split as settled
        UPDATE expense_splits
        SET is_settled = TRUE,
            settled_amount = p_amount,
            settled_at = NOW()
        WHERE id = v_payment_request.expense_split_id;

        -- Get updated split for return
        SELECT * INTO v_expense_split
        FROM expense_splits
        WHERE id = v_payment_request.expense_split_id;

        RETURN jsonb_build_object(
            'success', true,
            'payment_request_id', v_payment_request.id,
            'expense_split_id', v_expense_split.id,
            'settled_amount', v_expense_split.settled_amount
        );
    END;
    $$;


ALTER FUNCTION "public"."verify_momo_payment"("p_reference_code" "text", "p_tran_id" "text", "p_amount" numeric, "p_webhook_data" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text",
    "file_size" integer,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."attachments" IS 'File attachments (receipts) for expenses';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Audit trail for data changes';



CREATE TABLE IF NOT EXISTS "public"."balance_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "total_owed" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_lent" numeric(10,2) DEFAULT 0 NOT NULL,
    "net_balance" numeric(10,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."balance_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."balance_history" IS 'Stores daily snapshots of user balances for historical trend analysis and charts';



CREATE TABLE IF NOT EXISTS "public"."donation_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "avatar_image_url" "text",
    "qr_code_image_url" "text",
    "cta_text" "jsonb" DEFAULT '{"en": "Support us", "vi": "Ủng hộ chúng tôi"}'::"jsonb",
    "donate_message" "jsonb" DEFAULT '{"en": "Thank you for your support!", "vi": "Cảm ơn bạn đã ủng hộ!"}'::"jsonb",
    "bank_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."donation_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "context_type" "text" NOT NULL,
    "group_id" "uuid",
    "friendship_id" "uuid",
    "description" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'VND'::"text" NOT NULL,
    "category" "public"."expense_category",
    "expense_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "paid_by_user_id" "uuid" NOT NULL,
    "is_payment" boolean DEFAULT false NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comment" "text",
    CONSTRAINT "context_required" CHECK (((("context_type" = 'group'::"text") AND ("group_id" IS NOT NULL) AND ("friendship_id" IS NULL)) OR (("context_type" = 'friend'::"text") AND ("friendship_id" IS NOT NULL) AND ("group_id" IS NULL)))),
    CONSTRAINT "expenses_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "expenses_context_type_check" CHECK (("context_type" = ANY (ARRAY['group'::"text", 'friend'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


COMMENT ON TABLE "public"."expenses" IS 'Expense records with realtime enabled for debt updates';



COMMENT ON COLUMN "public"."expenses"."category" IS 'Expense category - must be one of the predefined categories or NULL for uncategorized';



COMMENT ON COLUMN "public"."expenses"."comment" IS 'Optional comment/note field for additional expense details and context';



CREATE OR REPLACE VIEW "public"."expense_category_stats" AS
 SELECT "category",
    "count"(*) AS "expense_count",
    "sum"("amount") AS "total_amount",
    "avg"("amount") AS "avg_amount",
    "min"("expense_date") AS "first_expense_date",
    "max"("expense_date") AS "last_expense_date"
   FROM "public"."expenses"
  WHERE (("category" IS NOT NULL) AND ("is_payment" = false))
  GROUP BY "category";


ALTER VIEW "public"."expense_category_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."expense_category_stats" IS 'Aggregated statistics for each expense category';



CREATE TABLE IF NOT EXISTS "public"."expense_splits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "split_method" "text" NOT NULL,
    "split_value" numeric(12,2),
    "computed_amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_settled" boolean DEFAULT false,
    "settled_amount" numeric(12,2) DEFAULT 0,
    "settled_at" timestamp with time zone,
    CONSTRAINT "expense_splits_computed_amount_check" CHECK (("computed_amount" >= (0)::numeric)),
    CONSTRAINT "expense_splits_split_method_check" CHECK (("split_method" = ANY (ARRAY['equal'::"text", 'exact'::"text", 'percentage'::"text"])))
);


ALTER TABLE "public"."expense_splits" OWNER TO "postgres";


COMMENT ON TABLE "public"."expense_splits" IS 'Expense split records with realtime enabled for debt calculations';



COMMENT ON COLUMN "public"."expense_splits"."is_settled" IS 'Whether this split has been settled by the payer';



COMMENT ON COLUMN "public"."expense_splits"."settled_amount" IS 'Amount that was settled (may be partial)';



COMMENT ON COLUMN "public"."expense_splits"."settled_at" IS 'Timestamp when the split was settled';



CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_a" "uuid" NOT NULL,
    "user_b" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "different_users" CHECK (("user_a" <> "user_b")),
    CONSTRAINT "friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"]))),
    CONSTRAINT "ordered_users" CHECK (("user_a" < "user_b"))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


COMMENT ON TABLE "public"."friendships" IS '1-on-1 friend connections between users';



CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "group_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."group_members" IS 'Many-to-many relationship between groups and users';



CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "simplify_debts" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text"
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."groups" IS 'Expense groups for organizing shared expenses';



CREATE TABLE IF NOT EXISTS "public"."momo_payment_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_split_id" "uuid",
    "user_id" "uuid",
    "receiver_phone" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'VND'::"text",
    "reference_code" "text" NOT NULL,
    "qr_url" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "verified_at" timestamp with time zone,
    "momo_tran_id" "text",
    "raw_webhook_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "momo_payment_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'failed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."momo_payment_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."momo_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "receiver_phone" "text" NOT NULL,
    "receiver_name" "text",
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."momo_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."momo_webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "phone" "text",
    "tran_id" "text",
    "amount" numeric(12,2),
    "comment" "text",
    "partner_id" "text",
    "partner_name" "text",
    "matched_request_id" "uuid",
    "raw_payload" "jsonb" NOT NULL,
    "processed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."momo_webhook_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "related_id" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'User notifications for various events';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "context_type" "text" NOT NULL,
    "group_id" "uuid",
    "friendship_id" "uuid",
    "from_user" "uuid" NOT NULL,
    "to_user" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'VND'::"text" NOT NULL,
    "payment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "note" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "context_required" CHECK (((("context_type" = 'group'::"text") AND ("group_id" IS NOT NULL) AND ("friendship_id" IS NULL)) OR (("context_type" = 'friend'::"text") AND ("friendship_id" IS NOT NULL) AND ("group_id" IS NULL)))),
    CONSTRAINT "different_users" CHECK (("from_user" <> "to_user")),
    CONSTRAINT "payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payments_context_type_check" CHECK (("context_type" = ANY (ARRAY['group'::"text", 'friend'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'Settlement payments between users to clear debts';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles with full Vietnamese names';



CREATE TABLE IF NOT EXISTS "public"."recurring_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_expense_id" "uuid" NOT NULL,
    "frequency" "text" NOT NULL,
    "interval" integer DEFAULT 1 NOT NULL,
    "next_occurrence" "date" NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recurring_expenses_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "recurring_expenses_interval_check" CHECK (("interval" > 0))
);


ALTER TABLE "public"."recurring_expenses" OWNER TO "postgres";


COMMENT ON TABLE "public"."recurring_expenses" IS 'Recurring expense templates and schedules';



CREATE OR REPLACE VIEW "public"."user_debts_history" AS
 SELECT "es"."user_id" AS "owes_user",
    "e"."paid_by_user_id" AS "owed_user",
    "sum"("es"."computed_amount") AS "total_amount",
    "sum"(COALESCE("es"."settled_amount", (0)::numeric)) AS "settled_amount",
    "sum"(
        CASE
            WHEN (("es"."is_settled" = true) AND ("es"."settled_amount" >= "es"."computed_amount")) THEN (0)::numeric
            WHEN ("es"."settled_amount" > (0)::numeric) THEN ("es"."computed_amount" - "es"."settled_amount")
            ELSE "es"."computed_amount"
        END) AS "remaining_amount",
    "count"(DISTINCT "e"."id") AS "transaction_count",
    "max"("e"."expense_date") AS "last_transaction_date"
   FROM ("public"."expense_splits" "es"
     JOIN "public"."expenses" "e" ON (("e"."id" = "es"."expense_id")))
  WHERE (("e"."is_payment" = false) AND ("es"."user_id" <> "e"."paid_by_user_id") AND ("e"."expense_date" <= CURRENT_DATE))
  GROUP BY "es"."user_id", "e"."paid_by_user_id"
 HAVING ("sum"("es"."computed_amount") > (0)::numeric);


ALTER VIEW "public"."user_debts_history" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_debts_history" IS 'Historical debts including settled debts, excluding future-dated expenses';



CREATE OR REPLACE VIEW "public"."user_debts_summary" AS
 SELECT "es"."user_id" AS "owes_user",
    "e"."paid_by_user_id" AS "owed_user",
    "sum"(
        CASE
            WHEN (("es"."is_settled" = true) AND ("es"."settled_amount" >= "es"."computed_amount")) THEN (0)::numeric
            WHEN ("es"."settled_amount" > (0)::numeric) THEN ("es"."computed_amount" - "es"."settled_amount")
            ELSE "es"."computed_amount"
        END) AS "amount_owed"
   FROM ("public"."expense_splits" "es"
     JOIN "public"."expenses" "e" ON (("e"."id" = "es"."expense_id")))
  WHERE (("e"."is_payment" = false) AND ("es"."user_id" <> "e"."paid_by_user_id") AND ("e"."expense_date" <= CURRENT_DATE) AND (("es"."is_settled" = false) OR (("es"."is_settled" = true) AND ("es"."settled_amount" < "es"."computed_amount"))))
  GROUP BY "es"."user_id", "e"."paid_by_user_id"
 HAVING ("sum"(
        CASE
            WHEN (("es"."is_settled" = true) AND ("es"."settled_amount" >= "es"."computed_amount")) THEN (0)::numeric
            WHEN ("es"."settled_amount" > (0)::numeric) THEN ("es"."computed_amount" - "es"."settled_amount")
            ELSE "es"."computed_amount"
        END) > (0)::numeric);


ALTER VIEW "public"."user_debts_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_debts_summary" IS 'Active debts summary excluding future-dated expenses';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_roles" IS 'RBAC role assignments (admin/user)';



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "default_currency" "text" DEFAULT 'VND'::"text",
    "number_format" "text" DEFAULT 'vi-VN'::"text",
    "email_notifications" boolean DEFAULT true,
    "notify_on_expense_added" boolean DEFAULT true,
    "notify_on_payment_received" boolean DEFAULT true,
    "notify_on_friend_request" boolean DEFAULT true,
    "notify_on_group_invite" boolean DEFAULT true,
    "allow_friend_requests" boolean DEFAULT true,
    "allow_group_invites" boolean DEFAULT true,
    "profile_visibility" "text" DEFAULT 'friends'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_settings_profile_visibility_check" CHECK (("profile_visibility" = ANY (ARRAY['public'::"text", 'friends'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'User preferences and settings';



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_history"
    ADD CONSTRAINT "balance_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_history"
    ADD CONSTRAINT "balance_history_user_date_currency_unique" UNIQUE ("user_id", "snapshot_date", "currency");



ALTER TABLE ONLY "public"."donation_settings"
    ADD CONSTRAINT "donation_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_expense_id_user_id_key" UNIQUE ("expense_id", "user_id");



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."momo_payment_requests"
    ADD CONSTRAINT "momo_payment_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."momo_payment_requests"
    ADD CONSTRAINT "momo_payment_requests_reference_code_key" UNIQUE ("reference_code");



ALTER TABLE ONLY "public"."momo_settings"
    ADD CONSTRAINT "momo_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."momo_webhook_logs"
    ADD CONSTRAINT "momo_webhook_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."momo_webhook_logs"
    ADD CONSTRAINT "momo_webhook_logs_tran_id_key" UNIQUE ("tran_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_attachments_expense_id" ON "public"."attachments" USING "btree" ("expense_id");



CREATE INDEX "idx_attachments_uploaded_by" ON "public"."attachments" USING "btree" ("uploaded_by");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_balance_history_date" ON "public"."balance_history" USING "btree" ("snapshot_date" DESC);



CREATE INDEX "idx_balance_history_user_currency" ON "public"."balance_history" USING "btree" ("user_id", "currency");



CREATE INDEX "idx_balance_history_user_date" ON "public"."balance_history" USING "btree" ("user_id", "snapshot_date" DESC);



CREATE INDEX "idx_expense_splits_expense_id" ON "public"."expense_splits" USING "btree" ("expense_id");



CREATE INDEX "idx_expense_splits_expense_user" ON "public"."expense_splits" USING "btree" ("expense_id", "user_id");



CREATE INDEX "idx_expense_splits_settled" ON "public"."expense_splits" USING "btree" ("is_settled", "expense_id") WHERE ("is_settled" = true);



CREATE INDEX "idx_expense_splits_user_computed" ON "public"."expense_splits" USING "btree" ("user_id", "computed_amount");



CREATE INDEX "idx_expense_splits_user_id" ON "public"."expense_splits" USING "btree" ("user_id");



CREATE INDEX "idx_expenses_category" ON "public"."expenses" USING "btree" ("category") WHERE ("category" IS NOT NULL);



CREATE INDEX "idx_expenses_category_date" ON "public"."expenses" USING "btree" ("category", "expense_date" DESC) WHERE ("category" IS NOT NULL);



CREATE INDEX "idx_expenses_comment_exists" ON "public"."expenses" USING "btree" ("id") WHERE ("comment" IS NOT NULL);



CREATE INDEX "idx_expenses_created_by" ON "public"."expenses" USING "btree" ("created_by");



CREATE INDEX "idx_expenses_expense_date" ON "public"."expenses" USING "btree" ("expense_date" DESC);



CREATE INDEX "idx_expenses_expense_date_user" ON "public"."expenses" USING "btree" ("expense_date" DESC, "paid_by_user_id");



CREATE INDEX "idx_expenses_friendship_id" ON "public"."expenses" USING "btree" ("friendship_id");



CREATE INDEX "idx_expenses_friendship_id_context" ON "public"."expenses" USING "btree" ("friendship_id", "context_type") WHERE ("context_type" = 'friend'::"text");



CREATE INDEX "idx_expenses_group_id" ON "public"."expenses" USING "btree" ("group_id");



CREATE INDEX "idx_expenses_group_id_context" ON "public"."expenses" USING "btree" ("group_id", "context_type") WHERE ("context_type" = 'group'::"text");



CREATE INDEX "idx_expenses_paid_by_user_amount" ON "public"."expenses" USING "btree" ("paid_by_user_id", "amount", "is_payment") WHERE ("is_payment" = false);



CREATE INDEX "idx_expenses_paid_by_user_id" ON "public"."expenses" USING "btree" ("paid_by_user_id");



CREATE INDEX "idx_friendships_status" ON "public"."friendships" USING "btree" ("status");



CREATE INDEX "idx_friendships_user_a" ON "public"."friendships" USING "btree" ("user_a");



CREATE INDEX "idx_friendships_user_a_status" ON "public"."friendships" USING "btree" ("user_a", "status") WHERE ("status" = 'accepted'::"text");



CREATE INDEX "idx_friendships_user_b" ON "public"."friendships" USING "btree" ("user_b");



CREATE INDEX "idx_friendships_user_b_status" ON "public"."friendships" USING "btree" ("user_b", "status") WHERE ("status" = 'accepted'::"text");



CREATE INDEX "idx_friendships_users_status" ON "public"."friendships" USING "btree" ("user_a", "user_b", "status") WHERE ("status" = 'accepted'::"text");



CREATE INDEX "idx_group_members_group_id" ON "public"."group_members" USING "btree" ("group_id");



CREATE INDEX "idx_group_members_user_id" ON "public"."group_members" USING "btree" ("user_id");



CREATE INDEX "idx_group_members_user_id_group_id" ON "public"."group_members" USING "btree" ("user_id", "group_id");



CREATE INDEX "idx_groups_created_by" ON "public"."groups" USING "btree" ("created_by");



CREATE INDEX "idx_momo_payment_requests_created_at" ON "public"."momo_payment_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_momo_payment_requests_expense_split_id" ON "public"."momo_payment_requests" USING "btree" ("expense_split_id");



CREATE INDEX "idx_momo_payment_requests_reference_code" ON "public"."momo_payment_requests" USING "btree" ("reference_code");



CREATE INDEX "idx_momo_payment_requests_status" ON "public"."momo_payment_requests" USING "btree" ("status");



CREATE INDEX "idx_momo_payment_requests_user_id" ON "public"."momo_payment_requests" USING "btree" ("user_id");



CREATE INDEX "idx_momo_webhook_logs_created_at" ON "public"."momo_webhook_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_momo_webhook_logs_processed" ON "public"."momo_webhook_logs" USING "btree" ("processed");



CREATE INDEX "idx_momo_webhook_logs_tran_id" ON "public"."momo_webhook_logs" USING "btree" ("tran_id");



CREATE INDEX "idx_notifications_type_created" ON "public"."notifications" USING "btree" ("type", "created_at" DESC);



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC) WHERE ("is_read" = false);



CREATE INDEX "idx_payments_friendship_id" ON "public"."payments" USING "btree" ("friendship_id") WHERE ("friendship_id" IS NOT NULL);



CREATE INDEX "idx_payments_from_user" ON "public"."payments" USING "btree" ("from_user");



CREATE INDEX "idx_payments_from_user_date" ON "public"."payments" USING "btree" ("from_user", "created_at" DESC);



CREATE INDEX "idx_payments_group_id" ON "public"."payments" USING "btree" ("group_id") WHERE ("group_id" IS NOT NULL);



CREATE INDEX "idx_payments_payment_date" ON "public"."payments" USING "btree" ("payment_date" DESC);



CREATE INDEX "idx_payments_to_user" ON "public"."payments" USING "btree" ("to_user");



CREATE INDEX "idx_payments_to_user_date" ON "public"."payments" USING "btree" ("to_user", "created_at" DESC);



CREATE INDEX "idx_payments_users" ON "public"."payments" USING "btree" ("from_user", "to_user");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_full_name" ON "public"."profiles" USING "btree" ("full_name");



CREATE INDEX "idx_recurring_expenses_active" ON "public"."recurring_expenses" USING "btree" ("is_active", "next_occurrence") WHERE ("is_active" = true);



CREATE INDEX "idx_recurring_expenses_template" ON "public"."recurring_expenses" USING "btree" ("template_expense_id");



CREATE OR REPLACE TRIGGER "donation_settings_updated_at" BEFORE UPDATE ON "public"."donation_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_donation_settings_updated_at"();



CREATE OR REPLACE TRIGGER "on_group_created" AFTER INSERT ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."add_creator_as_admin"();



CREATE OR REPLACE TRIGGER "trigger_notify_expense_added" AFTER INSERT ON "public"."expense_splits" FOR EACH ROW EXECUTE FUNCTION "public"."notify_expense_added"();



CREATE OR REPLACE TRIGGER "trigger_notify_friend_request" AFTER INSERT ON "public"."friendships" FOR EACH ROW EXECUTE FUNCTION "public"."notify_friend_request"();



CREATE OR REPLACE TRIGGER "update_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_friendships_updated_at" BEFORE UPDATE ON "public"."friendships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_groups_updated_at" BEFORE UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_momo_payment_requests_updated_at" BEFORE UPDATE ON "public"."momo_payment_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_momo_payment_requests_updated_at"();



CREATE OR REPLACE TRIGGER "update_momo_settings_updated_at" BEFORE UPDATE ON "public"."momo_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_momo_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recurring_expenses_updated_at" BEFORE UPDATE ON "public"."recurring_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balance_history"
    ADD CONSTRAINT "balance_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_friendship_id_fkey" FOREIGN KEY ("friendship_id") REFERENCES "public"."friendships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_a_fkey" FOREIGN KEY ("user_a") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_b_fkey" FOREIGN KEY ("user_b") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."momo_payment_requests"
    ADD CONSTRAINT "momo_payment_requests_expense_split_id_fkey" FOREIGN KEY ("expense_split_id") REFERENCES "public"."expense_splits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."momo_payment_requests"
    ADD CONSTRAINT "momo_payment_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."momo_webhook_logs"
    ADD CONSTRAINT "momo_webhook_logs_matched_request_id_fkey" FOREIGN KEY ("matched_request_id") REFERENCES "public"."momo_payment_requests"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_friendship_id_fkey" FOREIGN KEY ("friendship_id") REFERENCES "public"."friendships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_to_user_fkey" FOREIGN KEY ("to_user") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_template_expense_id_fkey" FOREIGN KEY ("template_expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Anyone can read donation settings" ON "public"."donation_settings" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create groups" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Authenticated users can insert donation settings" ON "public"."donation_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can update donation settings" ON "public"."donation_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Can view splits for accessible expenses" ON "public"."expense_splits" FOR SELECT TO "authenticated" USING (("expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ((("expenses"."context_type" = 'group'::"text") AND ("expenses"."group_id" IN ( SELECT "group_members"."group_id"
           FROM "public"."group_members"
          WHERE ("group_members"."user_id" = "auth"."uid"())))) OR (("expenses"."context_type" = 'friend'::"text") AND ("expenses"."friendship_id" IN ( SELECT "friendships"."id"
           FROM "public"."friendships"
          WHERE ((("friendships"."user_a" = "auth"."uid"()) OR ("friendships"."user_b" = "auth"."uid"())) AND ("friendships"."status" = 'accepted'::"text")))))))));



CREATE POLICY "Expense creator can add splits" ON "public"."expense_splits" FOR INSERT TO "authenticated" WITH CHECK ((("expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"()))) OR "public"."is_admin"()));



CREATE POLICY "Expense creator can delete" ON "public"."expenses" FOR DELETE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Expense creator can delete splits" ON "public"."expense_splits" FOR DELETE TO "authenticated" USING ((("expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"()))) OR "public"."is_admin"()));



CREATE POLICY "Expense creator can update" ON "public"."expenses" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Expense creator can update splits" ON "public"."expense_splits" FOR UPDATE TO "authenticated" USING ((("expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"()))) OR "public"."is_admin"())) WITH CHECK ((("expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"()))) OR "public"."is_admin"()));



CREATE POLICY "Group admins can update groups" ON "public"."groups" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Group creator can delete groups" ON "public"."groups" FOR DELETE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Group creators can add members" ON "public"."group_members" FOR INSERT TO "authenticated" WITH CHECK ((("group_id" IN ( SELECT "groups"."id"
   FROM "public"."groups"
  WHERE ("groups"."created_by" = "auth"."uid"()))) OR "public"."is_admin"()));



CREATE POLICY "Group creators can view members" ON "public"."group_members" FOR SELECT TO "authenticated" USING (("group_id" IN ( SELECT "groups"."id"
   FROM "public"."groups"
  WHERE ("groups"."created_by" = "auth"."uid"()))));



CREATE POLICY "Group members can view other members" ON "public"."group_members" FOR SELECT TO "authenticated" USING ("public"."user_is_group_member"("group_id"));



CREATE POLICY "Group members or friends can create expenses" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ((("context_type" = 'group'::"text") AND ("group_id" IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "expenses"."group_id") AND ("group_members"."user_id" = "auth"."uid"())))) OR "public"."is_admin"())) OR (("context_type" = 'friend'::"text") AND ("friendship_id" IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."friendships"
  WHERE (("friendships"."id" = "expenses"."friendship_id") AND (("friendships"."user_a" = "auth"."uid"()) OR ("friendships"."user_b" = "auth"."uid"())) AND ("friendships"."status" = 'accepted'::"text")))) OR "public"."is_admin"())))));



CREATE POLICY "Only admins can manage roles" ON "public"."user_roles" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Payment creator can delete" ON "public"."payments" FOR DELETE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Public can view all expenses" ON "public"."expenses" FOR SELECT USING (true);



CREATE POLICY "Public can view all groups" ON "public"."groups" FOR SELECT USING (true);



CREATE POLICY "Public can view all payments" ON "public"."payments" FOR SELECT USING (true);



CREATE POLICY "Public can view all profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can create friendships" ON "public"."friendships" FOR INSERT TO "authenticated" WITH CHECK (((("user_a" = "auth"."uid"()) OR ("user_b" = "auth"."uid"())) AND ("created_by" = "auth"."uid"()) AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can create recurring expenses for their expenses" ON "public"."recurring_expenses" FOR INSERT TO "authenticated" WITH CHECK (("template_expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"()))));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their friendships" ON "public"."friendships" FOR DELETE TO "authenticated" USING ((("user_a" = "auth"."uid"()) OR ("user_b" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can delete their own attachments" ON "public"."attachments" FOR DELETE TO "authenticated" USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can delete their recurring expenses" ON "public"."recurring_expenses" FOR DELETE TO "authenticated" USING (("template_expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"()))));



CREATE POLICY "Users can insert own settings" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



COMMENT ON POLICY "Users can insert their own profile" ON "public"."profiles" IS 'Allows users to create their own profile. The handle_new_user() trigger also bypasses RLS using SET LOCAL row_security = off';



CREATE POLICY "Users can leave or creators can remove members" ON "public"."group_members" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("group_id" IN ( SELECT "groups"."id"
   FROM "public"."groups"
  WHERE ("groups"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can record payments they make" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ((("from_user" = "auth"."uid"()) AND ("created_by" = "auth"."uid"()) AND ((("context_type" = 'group'::"text") AND ("group_id" IN ( SELECT "group_members"."group_id"
   FROM "public"."group_members"
  WHERE ("group_members"."user_id" = "auth"."uid"())))) OR (("context_type" = 'friend'::"text") AND ("friendship_id" IN ( SELECT "friendships"."id"
   FROM "public"."friendships"
  WHERE ((("friendships"."user_a" = "auth"."uid"()) OR ("friendships"."user_b" = "auth"."uid"())) AND ("friendships"."status" = 'accepted'::"text"))))))));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their friendships" ON "public"."friendships" FOR UPDATE TO "authenticated" USING ((("user_a" = "auth"."uid"()) OR ("user_b" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("user_a" = "auth"."uid"()) OR ("user_b" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can update their recurring expenses" ON "public"."recurring_expenses" FOR UPDATE TO "authenticated" USING (("template_expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"())))) WITH CHECK (("template_expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"()))));



CREATE POLICY "Users can upload attachments to their expenses" ON "public"."attachments" FOR INSERT TO "authenticated" WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND ("expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view attachments for their expenses" ON "public"."attachments" FOR SELECT TO "authenticated" USING (("expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ((("expenses"."context_type" = 'group'::"text") AND ("expenses"."group_id" IN ( SELECT "group_members"."group_id"
           FROM "public"."group_members"
          WHERE ("group_members"."user_id" = "auth"."uid"())))) OR (("expenses"."context_type" = 'friend'::"text") AND ("expenses"."friendship_id" IN ( SELECT "friendships"."id"
           FROM "public"."friendships"
          WHERE ((("friendships"."user_a" = "auth"."uid"()) OR ("friendships"."user_b" = "auth"."uid"())) AND ("friendships"."status" = 'accepted'::"text")))))))));



CREATE POLICY "Users can view own balance history" ON "public"."balance_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own membership" ON "public"."group_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own settings" ON "public"."user_settings" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view recurring expenses for their expenses" ON "public"."recurring_expenses" FOR SELECT TO "authenticated" USING (("template_expense_id" IN ( SELECT "expenses"."id"
   FROM "public"."expenses"
  WHERE ("expenses"."created_by" = "auth"."uid"()))));



CREATE POLICY "Users can view their friendships" ON "public"."friendships" FOR SELECT TO "authenticated" USING ((("user_a" = "auth"."uid"()) OR ("user_b" = "auth"."uid"())));



CREATE POLICY "Users can view their own role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "View member groups" ON "public"."groups" FOR SELECT TO "authenticated" USING ("public"."user_is_group_member"("id"));



CREATE POLICY "View own created groups" ON "public"."groups" FOR SELECT TO "authenticated" USING (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."balance_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."donation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_splits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."momo_payment_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "momo_payment_requests_create_own" ON "public"."momo_payment_requests" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "momo_payment_requests_read_own" ON "public"."momo_payment_requests" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "momo_payment_requests_update_own" ON "public"."momo_payment_requests" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."momo_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "momo_settings_read_policy" ON "public"."momo_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "momo_settings_update_policy" ON "public"."momo_settings" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."momo_webhook_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "momo_webhook_logs_admin_only" ON "public"."momo_webhook_logs" TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_read_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_creator_as_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_creator_as_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_creator_as_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_bulk_insert_expenses"("p_expenses" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_bulk_insert_expenses"("p_expenses" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_bulk_insert_expenses"("p_expenses" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."are_friends"("user_id_1" "uuid", "user_id_2" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."are_friends"("user_id_1" "uuid", "user_id_2" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."are_friends"("user_id_1" "uuid", "user_id_2" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."batch_record_payments"("p_payments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."batch_record_payments"("p_payments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_record_payments"("p_payments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_delete_expenses"("p_expense_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_delete_expenses"("p_expense_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_delete_expenses"("p_expense_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_daily_balance"("p_user_id" "uuid", "p_snapshot_date" "date", "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_daily_balance"("p_user_id" "uuid", "p_snapshot_date" "date", "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_daily_balance"("p_user_id" "uuid", "p_snapshot_date" "date", "p_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_interval_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_interval_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_interval_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"("p_days_to_keep" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"("p_days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"("p_days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_audit_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_user_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_user_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_user_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_momo_payment_request"("p_expense_split_id" "uuid", "p_user_id" "uuid", "p_receiver_phone" "text", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."create_momo_payment_request"("p_expense_split_id" "uuid", "p_user_id" "uuid", "p_receiver_phone" "text", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_momo_payment_request"("p_expense_split_id" "uuid", "p_user_id" "uuid", "p_receiver_phone" "text", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_related_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_related_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_related_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_if_not_exists"("p_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_if_not_exists"("p_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_if_not_exists"("p_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_with_profile"("user_email" "text", "user_full_name" "text", "user_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_with_profile"("user_email" "text", "user_full_name" "text", "user_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_with_profile"("user_email" "text", "user_full_name" "text", "user_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_audit_statistics"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_audit_statistics"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audit_statistics"("p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_balance_history"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_balance_history"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_balance_history"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_due_recurring_expenses"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_due_recurring_expenses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_due_recurring_expenses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_expense_categories"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_expense_categories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expense_categories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_expense_splits_public"("p_expense_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_expense_splits_public"("p_expense_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expense_splits_public"("p_expense_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_expense_summary_by_category"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_expense_summary_by_category"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expense_summary_by_category"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friendship"("user_id_1" "uuid", "user_id_2" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friendship"("user_id_1" "uuid", "user_id_2" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friendship"("user_id_1" "uuid", "user_id_2" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friendship_activity"("p_friendship_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friendship_activity"("p_friendship_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friendship_activity"("p_friendship_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_stats"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_stats"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_stats"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_leaderboard_data"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_leaderboard_data"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leaderboard_data"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_demo_debts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_demo_debts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_demo_debts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_recent_activities"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_recent_activities"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_recent_activities"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_record_audit_history"("p_table_name" "text", "p_record_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_record_audit_history"("p_table_name" "text", "p_record_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_record_audit_history"("p_table_name" "text", "p_record_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_comparison"("p_current_start" "date", "p_current_end" "date", "p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_comparison"("p_current_start" "date", "p_current_end" "date", "p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_comparison"("p_current_start" "date", "p_current_end" "date", "p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_trend"("p_user_id" "uuid", "p_weeks" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_trend"("p_user_id" "uuid", "p_weeks" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_trend"("p_user_id" "uuid", "p_weeks" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_categories"("p_start_date" "date", "p_end_date" "date", "p_group_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_categories"("p_start_date" "date", "p_end_date" "date", "p_group_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_categories"("p_start_date" "date", "p_end_date" "date", "p_group_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_spenders"("p_group_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_spenders"("p_group_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_spenders"("p_group_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activities"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activities"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activities"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activity_heatmap"("p_user_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activity_heatmap"("p_user_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activity_heatmap"("p_user_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_audit_activity"("p_user_id" "uuid", "p_days" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_audit_activity"("p_user_id" "uuid", "p_days" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_audit_activity"("p_user_id" "uuid", "p_days" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_balance"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_balance"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_balance"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_balances"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_balances"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_balances"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_balances_with_history"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_balances_with_history"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_balances_with_history"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_debts_aggregated"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_debts_aggregated"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_debts_aggregated"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_debts_history"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_debts_history"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_debts_history"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_debts_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_debts_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_debts_public"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_monthly_report"("p_user_id" "uuid", "p_month" integer, "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_monthly_report"("p_user_id" "uuid", "p_month" integer, "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_monthly_report"("p_user_id" "uuid", "p_month" integer, "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_settings"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_settings"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_settings"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hard_delete_old_records"("p_days_old" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."hard_delete_old_records"("p_days_old" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hard_delete_old_records"("p_days_old" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_added_to_group"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_added_to_group"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_added_to_group"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_friend_accepted"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_friend_accepted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_friend_accepted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_friend_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_friend_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_friend_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_payment_recorded"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_payment_recorded"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_payment_recorded"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_self_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_self_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_self_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_deleted_expense"("p_expense_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_deleted_expense"("p_expense_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_deleted_expense"("p_expense_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_deleted_group"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_deleted_group"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_deleted_group"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_deleted_payment"("p_payment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_deleted_payment"("p_payment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_deleted_payment"("p_payment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_audit_logs"("p_table_name" "text", "p_operation" "text", "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_audit_logs"("p_table_name" "text", "p_operation" "text", "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_audit_logs"("p_table_name" "text", "p_operation" "text", "p_user_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."settle_all_debts_with_person"("p_counterparty_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."settle_all_debts_with_person"("p_counterparty_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."settle_all_debts_with_person"("p_counterparty_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."settle_all_group_debts"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."settle_all_group_debts"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."settle_all_group_debts"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."settle_expense"("p_expense_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."settle_expense"("p_expense_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."settle_expense"("p_expense_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."settle_individual_debt"("p_counterparty_id" "uuid", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."settle_individual_debt"("p_counterparty_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."settle_individual_debt"("p_counterparty_id" "uuid", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."settle_split"("p_split_id" "uuid", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."settle_split"("p_split_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."settle_split"("p_split_id" "uuid", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."simplify_group_debts"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."simplify_group_debts"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."simplify_group_debts"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_expense"("p_expense_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_expense"("p_expense_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_expense"("p_expense_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_group"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_group"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_group"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_payment"("p_payment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_payment"("p_payment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_payment"("p_payment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."unsettle_split"("p_split_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unsettle_split"("p_split_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unsettle_split"("p_split_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_donation_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_donation_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_donation_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_existing_profiles_from_mapping"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_existing_profiles_from_mapping"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_existing_profiles_from_mapping"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_friendships_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_friendships_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_friendships_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_momo_payment_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_momo_payment_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_momo_payment_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_momo_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_momo_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_momo_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile_name_by_email"("user_email" "text", "user_full_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile_name_by_email"("user_email" "text", "user_full_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile_name_by_email"("user_email" "text", "user_full_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_recurring_expenses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_recurring_expenses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_recurring_expenses_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_group_member"("group_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_group_member"("group_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_group_member"("group_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_currency_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_currency_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_currency_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_date_not_future"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_date_not_future"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_date_not_future"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_description"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_description"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_description"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_expense_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_expense_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_expense_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_expense_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_expense_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_expense_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_expense_splits"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_expense_splits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_expense_splits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_payment_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_payment_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_payment_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_split_method"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_split_method"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_split_method"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_momo_payment"("p_reference_code" "text", "p_tran_id" "text", "p_amount" numeric, "p_webhook_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_momo_payment"("p_reference_code" "text", "p_tran_id" "text", "p_amount" numeric, "p_webhook_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_momo_payment"("p_reference_code" "text", "p_tran_id" "text", "p_amount" numeric, "p_webhook_data" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."balance_history" TO "anon";
GRANT ALL ON TABLE "public"."balance_history" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_history" TO "service_role";



GRANT ALL ON TABLE "public"."donation_settings" TO "anon";
GRANT ALL ON TABLE "public"."donation_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."donation_settings" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."expense_category_stats" TO "anon";
GRANT ALL ON TABLE "public"."expense_category_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_category_stats" TO "service_role";



GRANT ALL ON TABLE "public"."expense_splits" TO "anon";
GRANT ALL ON TABLE "public"."expense_splits" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_splits" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."momo_payment_requests" TO "anon";
GRANT ALL ON TABLE "public"."momo_payment_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."momo_payment_requests" TO "service_role";



GRANT ALL ON TABLE "public"."momo_settings" TO "anon";
GRANT ALL ON TABLE "public"."momo_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."momo_settings" TO "service_role";



GRANT ALL ON TABLE "public"."momo_webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."momo_webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."momo_webhook_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_expenses" TO "anon";
GRANT ALL ON TABLE "public"."recurring_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."user_debts_history" TO "anon";
GRANT ALL ON TABLE "public"."user_debts_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_debts_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_debts_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_debts_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_debts_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







