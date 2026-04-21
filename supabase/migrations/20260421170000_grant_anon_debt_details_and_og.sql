-- Grant anon role access to debt and expense OG functions
-- so edge-runtime share endpoints can fetch data without service role key.
-- Both functions are SECURITY DEFINER so they run with owner privileges regardless.

GRANT EXECUTE ON FUNCTION get_user_debt_details(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO anon;
