-- ========================================
-- DATABASE INVENTORY SCRIPT
-- ========================================
-- Purpose: Comprehensive audit of all database objects
-- Usage: psql -h localhost -p 54322 -U postgres -d postgres -f scripts/db-inventory.sql > docs/database/inventory.txt

\echo '========================================'
\echo 'DATABASE INVENTORY - FairPay'
\echo '========================================'
\echo ''

-- ========================================
-- SECTION 1: EXTENSIONS
-- ========================================
\echo '=== EXTENSIONS ==='
SELECT extname AS extension_name, extversion AS version
FROM pg_extension
WHERE extname NOT IN ('plpgsql')
ORDER BY extname;
\echo ''

-- ========================================
-- SECTION 2: SCHEMAS
-- ========================================
\echo '=== SCHEMAS ==='
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name;
\echo ''

-- ========================================
-- SECTION 3: TABLES
-- ========================================
\echo '=== TABLES (with row counts) ==='
SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM pg_class c WHERE c.relname = tablename AND c.relnamespace = n.oid) as table_count
FROM pg_tables t
JOIN pg_namespace n ON n.nspname = t.schemaname
WHERE schemaname = 'public'
ORDER BY tablename;
\echo ''

\echo '=== TABLE COLUMNS ==='
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
\echo ''

-- ========================================
-- SECTION 4: CONSTRAINTS
-- ========================================
\echo '=== PRIMARY KEYS ==='
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
\echo ''

\echo '=== FOREIGN KEYS ==='
SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
\echo ''

\echo '=== CHECK CONSTRAINTS ==='
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
\echo ''

\echo '=== UNIQUE CONSTRAINTS ==='
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
\echo ''

-- ========================================
-- SECTION 5: INDEXES
-- ========================================
\echo '=== INDEXES ==='
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
\echo ''

-- ========================================
-- SECTION 6: VIEWS
-- ========================================
\echo '=== VIEWS ==='
SELECT
  table_name AS view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
\echo ''

\echo '=== MATERIALIZED VIEWS ==='
SELECT
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
\echo ''

-- ========================================
-- SECTION 7: FUNCTIONS
-- ========================================
\echo '=== FUNCTIONS ==='
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS volatility,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;
\echo ''

-- ========================================
-- SECTION 8: TRIGGERS
-- ========================================
\echo '=== TRIGGERS ==='
SELECT
  trigger_schema,
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
\echo ''

-- ========================================
-- SECTION 9: SEQUENCES
-- ========================================
\echo '=== SEQUENCES ==='
SELECT
  schemaname,
  sequencename,
  start_value,
  min_value,
  max_value,
  increment_by
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;
\echo ''

-- ========================================
-- SECTION 10: TYPES & ENUMS
-- ========================================
\echo '=== CUSTOM TYPES ==='
SELECT
  n.nspname AS schema,
  t.typname AS type_name,
  t.typtype AS type_category
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.typtype IN ('e', 'c', 'd')
ORDER BY t.typname;
\echo ''

-- ========================================
-- SECTION 11: RLS POLICIES
-- ========================================
\echo '=== RLS POLICIES (grouped by table) ==='
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
\echo ''

\echo '=== RLS ENABLED TABLES ==='
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
\echo ''

-- ========================================
-- SECTION 12: STORAGE BUCKETS
-- ========================================
\echo '=== STORAGE BUCKETS ==='
SELECT
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY name;
\echo ''

\echo '=== STORAGE POLICIES ==='
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
\echo ''

-- ========================================
-- SECTION 13: GRANTS & PERMISSIONS
-- ========================================
\echo '=== FUNCTION GRANTS ==='
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  (
    SELECT string_agg(pr.rolname, ', ')
    FROM pg_proc_acl pa
    CROSS JOIN LATERAL aclexplode(pa.proacl) AS acl
    JOIN pg_roles pr ON acl.grantee = pr.oid
    WHERE pa.oid = p.oid
  ) AS granted_to
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;
\echo ''

\echo '=== TABLE GRANTS ==='
SELECT
  schemaname,
  tablename,
  (
    SELECT string_agg(privilege_type, ', ')
    FROM information_schema.table_privileges tp
    WHERE tp.table_schema = t.schemaname
      AND tp.table_name = t.tablename
    GROUP BY table_name
  ) AS privileges
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
\echo ''

-- ========================================
-- SECTION 14: OBJECT COUNT SUMMARY
-- ========================================
\echo '=== SUMMARY ==='
SELECT
  'Tables' AS object_type,
  COUNT(*) AS count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
UNION ALL
SELECT
  'Views',
  COUNT(*)
FROM information_schema.views
WHERE table_schema = 'public'
UNION ALL
SELECT
  'Functions',
  COUNT(*)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
UNION ALL
SELECT
  'Triggers',
  COUNT(*)
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT
  'RLS Policies',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Indexes',
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Storage Buckets',
  COUNT(*)
FROM storage.buckets
UNION ALL
SELECT
  'Extensions',
  COUNT(*)
FROM pg_extension
WHERE extname NOT IN ('plpgsql');

\echo ''
\echo '========================================'
\echo 'INVENTORY COMPLETE'
\echo '========================================'
