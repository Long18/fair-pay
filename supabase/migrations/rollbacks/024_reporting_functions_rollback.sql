-- Rollback: 024_reporting_functions.sql
-- Removes all reporting and analytics RPC functions

BEGIN;

-- ========================================
-- Revoke Permissions First
-- ========================================

REVOKE EXECUTE ON FUNCTION get_expense_summary_by_category(UUID, DATE, DATE) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_spending_trend(UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_group_stats(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_user_monthly_report(UUID, INTEGER, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_friendship_activity(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_user_activity_heatmap(UUID, INTEGER) FROM authenticated;

-- ========================================
-- Drop All Reporting Functions
-- ========================================

DROP FUNCTION IF EXISTS get_expense_summary_by_category(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_spending_trend(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_group_stats(UUID);
DROP FUNCTION IF EXISTS get_user_monthly_report(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_friendship_activity(UUID);
DROP FUNCTION IF EXISTS get_user_activity_heatmap(UUID, INTEGER);

COMMIT;

-- Note: After rollback, the following features will require frontend implementation:
-- - Category breakdown for expenses
-- - Weekly spending trends
-- - Group statistics
-- - Monthly financial reports
-- - Friendship activity summaries
-- - Activity heatmap data
--
-- The frontend will need to aggregate data client-side or implement custom queries
