import { supabaseClient } from "@/utility";
import type {
  OAuthAuthorizationRequest,
  OAuthClient,
  OAuthScope,
  OAuthErrorResponse,
} from "@/types/oauth";

const STANDARD_SCOPES: Record<string, OAuthScope> = {
  openid: {
    name: "openid",
    description: "Access your basic profile information",
    required: true,
  },
  email: {
    name: "email",
    description: "Access your email address",
    required: false,
  },
  profile: {
    name: "profile",
    description: "Access your profile information (name, avatar)",
    required: false,
  },
  phone: {
    name: "phone",
    description: "Access your phone number",
    required: false,
  },
};

export function parseAuthorizationRequest(
  searchParams: URLSearchParams
): OAuthAuthorizationRequest | OAuthErrorResponse {
  const client_id = searchParams.get("client_id");
  const redirect_uri = searchParams.get("redirect_uri");
  const response_type = searchParams.get("response_type");
  const scope = searchParams.get("scope");
  const state = searchParams.get("state") || undefined;
  const code_challenge = searchParams.get("code_challenge");
  const code_challenge_method = searchParams.get("code_challenge_method");

  if (!client_id) {
    return {
      error: "invalid_request",
      error_description: "Missing required parameter: client_id",
      state,
    };
  }

  if (!redirect_uri) {
    return {
      error: "invalid_request",
      error_description: "Missing required parameter: redirect_uri",
      state,
    };
  }

  if (response_type !== "code") {
    return {
      error: "unsupported_response_type",
      error_description: "Only 'code' response type is supported",
      state,
    };
  }

  if (!scope) {
    return {
      error: "invalid_request",
      error_description: "Missing required parameter: scope",
      state,
    };
  }

  if (!code_challenge) {
    return {
      error: "invalid_request",
      error_description: "Missing required parameter: code_challenge (PKCE is mandatory)",
      state,
    };
  }

  if (code_challenge_method !== "S256") {
    return {
      error: "invalid_request",
      error_description: "Only 'S256' code_challenge_method is supported",
      state,
    };
  }

  return {
    client_id,
    redirect_uri,
    response_type: "code",
    scope,
    state,
    code_challenge,
    code_challenge_method: "S256",
  };
}

export function parseScopes(scopeString: string): OAuthScope[] {
  const requestedScopes = scopeString.split(" ").filter(Boolean);
  const scopes: OAuthScope[] = [];

  for (const scopeName of requestedScopes) {
    const scope = STANDARD_SCOPES[scopeName];
    if (scope) {
      scopes.push(scope);
    } else {
      scopes.push({
        name: scopeName,
        description: `Access to ${scopeName}`,
        required: false,
      });
    }
  }

  return scopes;
}

export function isValidRedirectUri(redirectUri: string, allowedUris: string[]): boolean {
  try {
    const url = new URL(redirectUri);

    for (const allowedUri of allowedUris) {
      const allowedUrl = new URL(allowedUri);

      if (url.origin === allowedUrl.origin && url.pathname === allowedUrl.pathname) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function fetchClientInfo(clientId: string): Promise<OAuthClient | null> {
  try {
    const { data, error } = await supabaseClient
      .from("oauth_clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error || !data) {
      console.error("Failed to fetch OAuth client:", error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      logo_url: data.logo_url,
      redirect_uris: data.redirect_uris || [],
      created_at: data.created_at,
    };
  } catch (error) {
    console.error("Error fetching client info:", error);
    return null;
  }
}

export async function approveAuthorization(
  request: OAuthAuthorizationRequest,
  userId: string,
  approvedScopes: string[]
): Promise<{ code: string } | OAuthErrorResponse> {
  try {
    const { data, error } = await supabaseClient.rpc("create_authorization_code", {
      p_client_id: request.client_id,
      p_user_id: userId,
      p_redirect_uri: request.redirect_uri,
      p_scope: approvedScopes.join(" "),
      p_code_challenge: request.code_challenge,
      p_code_challenge_method: request.code_challenge_method,
    });

    if (error || !data) {
      console.error("Failed to create authorization code:", error);
      return {
        error: "server_error",
        error_description: "Failed to generate authorization code",
        state: request.state,
      };
    }

    return { code: data };
  } catch (error) {
    console.error("Error approving authorization:", error);
    return {
      error: "server_error",
      error_description: "An unexpected error occurred",
      state: request.state,
    };
  }
}

export function buildRedirectUrl(
  redirectUri: string,
  params: Record<string, string>
): string {
  const url = new URL(redirectUri);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function isErrorResponse(
  response: OAuthAuthorizationRequest | OAuthErrorResponse
): response is OAuthErrorResponse {
  return "error" in response;
}
