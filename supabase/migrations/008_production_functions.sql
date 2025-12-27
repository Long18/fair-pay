drop trigger if exists "trigger_auto_create_friendships" on "public"."group_members";

drop function if exists "public"."auto_create_friendships_from_group"();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_bulk_insert_expenses(p_expenses jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_days_to_keep integer DEFAULT 365)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_default_user_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text, p_related_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, link, related_id)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, p_related_id)
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_user_if_not_exists(p_id uuid, p_email text, p_full_name text, p_password text DEFAULT 'fairpay2025'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_user_with_profile(user_email text, user_full_name text, user_password text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_statistics(p_days integer DEFAULT 30)
 RETURNS TABLE(total_events integer, insert_count integer, update_count integer, delete_count integer, unique_users integer, events_by_table jsonb, daily_activity jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_due_recurring_expenses()
 RETURNS TABLE(id uuid, template_expense_id uuid, frequency text, interval_value integer, next_occurrence date, context_type text, group_id uuid, friendship_id uuid, created_by uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_expense_summary_by_category(p_user_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(category text, total_amount numeric, expense_count integer, avg_amount numeric, percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_friendship_activity(p_friendship_id uuid)
 RETURNS TABLE(total_expenses numeric, total_payments numeric, expense_count integer, payment_count integer, user_a_owes numeric, user_b_owes numeric, net_balance numeric, last_expense_date date, last_payment_date date, most_common_category text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_group_stats(p_group_id uuid)
 RETURNS TABLE(total_expenses numeric, total_payments numeric, expense_count integer, payment_count integer, member_count integer, most_active_user_id uuid, most_active_user_name text, most_active_user_count integer, total_outstanding numeric, created_at timestamp with time zone, last_activity timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_record_audit_history(p_table_name text, p_record_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, user_id uuid, user_name text, operation text, changed_fields text[], old_data jsonb, new_data jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_spending_trend(p_user_id uuid, p_weeks integer DEFAULT 12)
 RETURNS TABLE(week_start date, week_end date, week_number integer, total_spent numeric, expense_count integer, avg_per_expense numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_activity_heatmap(p_user_id uuid, p_days integer DEFAULT 90)
 RETURNS TABLE(activity_date date, expense_count integer, payment_count integer, total_amount numeric, day_of_week integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_audit_activity(p_user_id uuid DEFAULT NULL::uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, table_name text, operation text, record_id uuid, changed_fields text[], created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_monthly_report(p_user_id uuid, p_month integer, p_year integer)
 RETURNS TABLE(total_spent numeric, total_owed_to_me numeric, total_i_owe numeric, net_balance numeric, expense_count integer, payment_count integer, top_category text, top_category_amount numeric, most_expensive_date date, most_expensive_amount numeric, avg_expense numeric, group_count integer, friend_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_settings(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, default_currency text, number_format text, preferred_language text, timezone text, notifications_enabled boolean, email_notifications boolean, notify_on_expense_added boolean, notify_on_payment_received boolean, notify_on_friend_request boolean, notify_on_group_invite boolean, allow_friend_requests boolean, allow_group_invites boolean, profile_visibility text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.hard_delete_old_records(p_days_old integer DEFAULT 90)
 RETURNS TABLE(expenses_deleted integer, payments_deleted integer, groups_deleted integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.notify_added_to_group()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.notify_expense_added()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_participant_id UUID;
BEGIN
  -- Notify all participants except the creator
  FOR v_participant_id IN 
    SELECT user_id 
    FROM expense_splits 
    WHERE expense_id = NEW.id 
      AND user_id != NEW.created_by
  LOOP
    -- Only create notification if user has enabled this notification type
    IF should_send_notification(v_participant_id, 'expense_added') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        v_participant_id,
        'expense_added',
        'New Expense Added',
        'A new expense "' || NEW.description || '" was added',
        NEW.id,
        'expense'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.notify_friend_request()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only notify if the recipient allows friend requests
  IF NEW.status = 'pending' THEN
    -- Check if user_b allows friend requests and notifications
    IF should_send_notification(NEW.user_b, 'friend_request') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        NEW.user_b,
        'friend_request',
        'New Friend Request',
        'You have a new friend request',
        NEW.id,
        'friendship'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_payment_recorded()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_self_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.from_user = NEW.to_user THEN
    RAISE EXCEPTION 'Cannot create payment from user to themselves (user_id: %)', NEW.from_user;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_deleted_expense(p_expense_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.restore_deleted_group(p_group_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.restore_deleted_payment(p_payment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.search_audit_logs(p_table_name text DEFAULT NULL::text, p_operation text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, user_id uuid, user_name text, table_name text, operation text, record_id uuid, changed_fields text[], created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.should_send_notification(p_user_id uuid, p_notification_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_expense(p_expense_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_expense_exists BOOLEAN;
BEGIN
  -- Check if expense exists and user has permission
  SELECT EXISTS(
    SELECT 1 FROM expenses
    WHERE id = p_expense_id
      AND created_by = auth.uid()
      AND deleted_at IS NULL
  ) INTO v_expense_exists;
  
  IF NOT v_expense_exists THEN
    RAISE EXCEPTION 'Expense not found or you do not have permission to delete it';
  END IF;
  
  -- Soft delete the expense
  UPDATE expenses
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_expense_id
    AND created_by = auth.uid()
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_group(p_group_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_payment(p_payment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_existing_profiles_from_mapping()
 RETURNS TABLE(updated_count integer, email text, full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_friendships_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_profile_name_by_email(user_email text, user_full_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_recurring_expenses_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_currency_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_date_not_future()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_description()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_expense_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_expense_context()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_expense_splits()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_payment_amount()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_split_method()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;



