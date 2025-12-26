BEGIN;

DROP POLICY IF EXISTS "Users can view their own refresh tokens" ON oauth_refresh_tokens;
DROP POLICY IF EXISTS "Users can view their own access tokens" ON oauth_access_tokens;
DROP POLICY IF EXISTS "Users can view their own authorization codes" ON oauth_authorization_codes;
DROP POLICY IF EXISTS "OAuth clients are publicly readable" ON oauth_clients;

DROP TABLE IF EXISTS oauth_refresh_tokens CASCADE;
DROP TABLE IF EXISTS oauth_access_tokens CASCADE;
DROP TABLE IF EXISTS oauth_authorization_codes CASCADE;
DROP TABLE IF EXISTS oauth_clients CASCADE;

DROP FUNCTION IF EXISTS cleanup_expired_authorization_codes();
DROP FUNCTION IF EXISTS create_authorization_code(UUID, UUID, TEXT, TEXT, TEXT, TEXT);

COMMIT;
