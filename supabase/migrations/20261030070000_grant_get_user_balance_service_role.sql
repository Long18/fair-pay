-- The send-email-notifications worker (service role) calls get_user_balance as a live
-- stale check before sending a debt reminder from an enqueue-time snapshot.
-- Grant explicitly instead of relying on default privileges; authenticated/anon unchanged.
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
