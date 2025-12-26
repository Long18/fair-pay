export interface OAuthAuthorizationRequest {
  client_id: string;
  redirect_uri: string;
  response_type: "code";
  scope: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: "S256";
}

export interface OAuthClient {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  redirect_uris: string[];
  created_at: string;
}

export interface OAuthScope {
  name: string;
  description: string;
  required: boolean;
}

export interface OAuthConsentDecision {
  approved: boolean;
  scopes: string[];
}

export interface OAuthAuthorizationResponse {
  code: string;
  state?: string;
}

export interface OAuthErrorResponse {
  error: "invalid_request" | "unauthorized_client" | "access_denied" | "unsupported_response_type" | "invalid_scope" | "server_error" | "temporarily_unavailable";
  error_description?: string;
  error_uri?: string;
  state?: string;
}
