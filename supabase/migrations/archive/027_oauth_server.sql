BEGIN;

CREATE TABLE IF NOT EXISTS oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  code TEXT PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_client_user
  ON oauth_authorization_codes(client_id, user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_expires
  ON oauth_authorization_codes(expires_at)
  WHERE NOT used;

CREATE OR REPLACE FUNCTION create_authorization_code(
  p_client_id UUID,
  p_user_id UUID,
  p_redirect_uri TEXT,
  p_scope TEXT,
  p_code_challenge TEXT,
  p_code_challenge_method TEXT
) RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_code := encode(gen_random_bytes(32), 'base64');
  v_code := replace(replace(replace(v_code, '+', '-'), '/', '_'), '=', '');

  v_expires_at := NOW() + INTERVAL '10 minutes';

  INSERT INTO oauth_authorization_codes (
    code,
    client_id,
    user_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method,
    expires_at
  ) VALUES (
    v_code,
    p_client_id,
    p_user_id,
    p_redirect_uri,
    p_scope,
    p_code_challenge,
    p_code_challenge_method,
    v_expires_at
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_authorization_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_authorization_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_client_user
  ON oauth_access_tokens(client_id, user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_hash
  ON oauth_access_tokens(token_hash)
  WHERE NOT revoked;

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_id UUID NOT NULL REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_hash
  ON oauth_refresh_tokens(token_hash)
  WHERE NOT revoked;

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OAuth clients are publicly readable"
  ON oauth_clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view their own authorization codes"
  ON oauth_authorization_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own access tokens"
  ON oauth_access_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own refresh tokens"
  ON oauth_refresh_tokens FOR SELECT
  TO authenticated
  USING (
    access_token_id IN (
      SELECT id FROM oauth_access_tokens WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE oauth_clients IS 'OAuth 2.1 registered clients';
COMMENT ON TABLE oauth_authorization_codes IS 'Temporary authorization codes for OAuth flow';
COMMENT ON TABLE oauth_access_tokens IS 'OAuth access tokens for API access';
COMMENT ON TABLE oauth_refresh_tokens IS 'OAuth refresh tokens for token renewal';

COMMENT ON FUNCTION create_authorization_code IS 'Generate secure authorization code for OAuth flow';
COMMENT ON FUNCTION cleanup_expired_authorization_codes IS 'Remove expired authorization codes';

COMMIT;
