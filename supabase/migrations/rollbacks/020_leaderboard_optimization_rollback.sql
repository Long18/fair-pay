-- Rollback: 020_leaderboard_optimization.sql
-- Reverts the leaderboard optimization changes

BEGIN;

-- Drop the get_public_leaderboard_stats function
DROP FUNCTION IF EXISTS get_public_leaderboard_stats(INTEGER);

-- Drop the user balance cache materialized view
DROP MATERIALIZED VIEW IF EXISTS user_balance_cache;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_balance_cache_net_balance;
DROP INDEX IF EXISTS idx_user_balance_cache_updated;

COMMIT;

-- Note: After rollback, the frontend will need to revert to client-side aggregation
-- in use-sample-leaderboard.ts hook
