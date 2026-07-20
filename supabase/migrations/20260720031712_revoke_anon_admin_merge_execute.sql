-- Security advisor: admin_merge_profiles is SECURITY DEFINER and was executable
-- by anon. Keep is_admin() guard, but revoke anon / tighten grants.
-- Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

BEGIN;

REVOKE ALL ON FUNCTION public.admin_merge_profiles(UUID, UUID)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_merge_profiles(UUID, UUID)
  TO authenticated;

-- Transfer/claim helpers must stay non-callable from API roles
REVOKE ALL ON FUNCTION public.transfer_auth_identities_to_user(UUID, UUID)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_auth_users_for_emails(TEXT[], UUID, UUID)
  FROM PUBLIC, anon, authenticated;

COMMIT;
