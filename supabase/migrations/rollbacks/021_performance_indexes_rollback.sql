-- Rollback: 021_performance_indexes.sql
-- Removes all performance indexes added for RLS optimization

BEGIN;

-- ========================================
-- Drop Group Members Indexes
-- ========================================

DROP INDEX IF EXISTS idx_group_members_user_id_group_id;
DROP INDEX IF EXISTS idx_group_members_group_id;

-- ========================================
-- Drop Friendships Indexes
-- ========================================

DROP INDEX IF EXISTS idx_friendships_user_a_status;
DROP INDEX IF EXISTS idx_friendships_user_b_status;
DROP INDEX IF EXISTS idx_friendships_users_status;

-- ========================================
-- Drop Expenses Indexes
-- ========================================

DROP INDEX IF EXISTS idx_expenses_group_id_context;
DROP INDEX IF EXISTS idx_expenses_friendship_id_context;
DROP INDEX IF EXISTS idx_expenses_expense_date_user;
DROP INDEX IF EXISTS idx_expenses_paid_by_user_amount;

-- ========================================
-- Drop Expense Splits Indexes
-- ========================================

DROP INDEX IF EXISTS idx_expense_splits_expense_user;
DROP INDEX IF EXISTS idx_expense_splits_user_computed;

-- ========================================
-- Drop Payments Indexes
-- ========================================

DROP INDEX IF EXISTS idx_payments_from_user_date;
DROP INDEX IF EXISTS idx_payments_to_user_date;
DROP INDEX IF EXISTS idx_payments_group_id;
DROP INDEX IF EXISTS idx_payments_friendship_id;

-- ========================================
-- Drop Notifications Indexes
-- ========================================

DROP INDEX IF EXISTS idx_notifications_user_unread_created;
DROP INDEX IF EXISTS idx_notifications_user_created;
DROP INDEX IF EXISTS idx_notifications_type_created;

-- ========================================
-- Drop User Settings Indexes
-- ========================================

DROP INDEX IF EXISTS idx_user_settings_theme;
DROP INDEX IF EXISTS idx_user_settings_notifications;

-- ========================================
-- Drop Recurring Expenses Indexes
-- ========================================

DROP INDEX IF EXISTS idx_recurring_expenses_active;
DROP INDEX IF EXISTS idx_recurring_expenses_template;

COMMIT;

-- Warning: After rollback, query performance will degrade significantly
-- RLS checks will perform full table scans
-- Consider running VACUUM ANALYZE after rollback
