-- Rollback for 20261112090000_pay2s_oauth.sql
DROP FUNCTION IF EXISTS public.pay2s_try_acquire_refresh_lease(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.dismiss_pay2s_transaction(UUID);
DROP TABLE IF EXISTS public.pay2s_bank_transactions;
DROP TABLE IF EXISTS public.pay2s_oauth_states;
DROP TABLE IF EXISTS public.pay2s_connection_secrets;
DROP TABLE IF EXISTS public.pay2s_connections;
DROP FUNCTION IF EXISTS public.pay2s_touch_updated_at();
