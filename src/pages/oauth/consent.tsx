"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/utility";
import {
  parseAuthorizationRequest,
  parseScopes,
  fetchClientInfo,
  approveAuthorization,
  buildRedirectUrl,
  isErrorResponse,
  isValidRedirectUri,
} from "@/lib/oauth-server";
import type { OAuthClient, OAuthScope } from "@/types/oauth";

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<OAuthClient | null>(null);
  const [scopes, setScopes] = useState<OAuthScope[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const initializeConsent = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
          const currentUrl = window.location.href;
          navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
          return;
        }

        setUserEmail(user.email || "");

        const authRequest = parseAuthorizationRequest(searchParams);

        if (isErrorResponse(authRequest)) {
          setError(authRequest.error_description || "Invalid authorization request");
          setLoading(false);
          return;
        }

        const clientInfo = await fetchClientInfo(authRequest.client_id);

        if (!clientInfo) {
          setError("Invalid or unknown client application");
          setLoading(false);
          return;
        }

        if (!isValidRedirectUri(authRequest.redirect_uri, clientInfo.redirect_uris)) {
          setError("Invalid redirect URI for this client");
          setLoading(false);
          return;
        }

        setClient(clientInfo);

        const requestedScopes = parseScopes(authRequest.scope);
        setScopes(requestedScopes);

        const initialScopes = new Set<string>();
        requestedScopes.forEach((scope) => {
          if (scope.required || scope.name === "openid") {
            initialScopes.add(scope.name);
          }
        });
        setSelectedScopes(initialScopes);

        setLoading(false);
      } catch (err) {
        console.error("Error initializing consent:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    initializeConsent();
  }, [searchParams, navigate]);

  const handleScopeToggle = (scopeName: string, required: boolean) => {
    if (required) return;

    setSelectedScopes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scopeName)) {
        newSet.delete(scopeName);
      } else {
        newSet.add(scopeName);
      }
      return newSet;
    });
  };

  const handleApprove = async () => {
    setProcessing(true);

    try {
      const authRequest = parseAuthorizationRequest(searchParams);

      if (isErrorResponse(authRequest)) {
        setError(authRequest.error_description || "Invalid request");
        setProcessing(false);
        return;
      }

      const { data: { user } } = await supabaseClient.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const result = await approveAuthorization(
        authRequest,
        user.id,
        Array.from(selectedScopes)
      );

      if ("error" in result) {
        setError(result.error_description || "Failed to approve authorization");
        setProcessing(false);
        return;
      }

      const redirectUrl = buildRedirectUrl(authRequest.redirect_uri, {
        code: result.code,
        state: authRequest.state || "",
      });

      window.location.href = redirectUrl;
    } catch (err) {
      console.error("Error approving authorization:", err);
      setError("An unexpected error occurred");
      setProcessing(false);
    }
  };

  const handleDeny = () => {
    const authRequest = parseAuthorizationRequest(searchParams);

    if (!isErrorResponse(authRequest)) {
      const redirectUrl = buildRedirectUrl(authRequest.redirect_uri, {
        error: "access_denied",
        error_description: "User denied authorization",
        state: authRequest.state || "",
      });

      window.location.href = redirectUrl;
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex",
          "items-center",
          "justify-center",
          "min-h-svh",
          "bg-gradient-to-br from-teal-50 via-background to-purple-50",
          "dark:from-gray-900 dark:via-background dark:to-gray-800"
        )}
      >
        <Card className={cn("sm:w-[456px]", "p-8", "shadow-xl", "border", "bg-card/95", "backdrop-blur-sm")}>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex",
          "items-center",
          "justify-center",
          "min-h-svh",
          "bg-gradient-to-br from-teal-50 via-background to-purple-50",
          "dark:from-gray-900 dark:via-background dark:to-gray-800"
        )}
      >
        <Card className={cn("sm:w-[456px]", "p-8", "shadow-xl", "border", "bg-card/95", "backdrop-blur-sm")}>
          <CardHeader className={cn("px-0", "pb-6", "text-center")}>
            <CardTitle className={cn("text-2xl", "font-bold", "text-destructive")}>
              Authorization Error
            </CardTitle>
          </CardHeader>
          <CardContent className={cn("px-0")}>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className={cn("px-0", "pt-6")}>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/")}
            >
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex",
        "items-center",
        "justify-center",
        "min-h-svh",
        "bg-gradient-to-br from-teal-50 via-background to-purple-50",
        "dark:from-gray-900 dark:via-background dark:to-gray-800",
        "relative",
        "overflow-hidden",
        "p-4"
      )}
    >
      <Card className={cn("sm:w-[500px]", "w-full", "p-8", "shadow-xl", "border", "bg-card/95", "backdrop-blur-sm", "z-10")}>
        <CardHeader className={cn("px-0", "pb-6", "text-center")}>
          {client?.logo_url && (
            <div className={cn("flex", "items-center", "justify-center", "mb-4")}>
              <img
                src={client.logo_url}
                alt={`${client.name} logo`}
                className="w-16 h-16 rounded-lg object-contain"
              />
            </div>
          )}
          <CardTitle className={cn("text-2xl", "font-bold", "text-foreground")}>
            Authorize {client?.name}
          </CardTitle>
          <CardDescription className="mt-2">
            {client?.description || `${client?.name} is requesting access to your FairPay account`}
          </CardDescription>
        </CardHeader>

        <Separator className="mb-6" />

        <CardContent className={cn("px-0", "space-y-6")}>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Signed in as
            </Label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              This application will be able to:
            </Label>
            <div className="space-y-3">
              {scopes.map((scope) => (
                <div key={scope.name} className="flex items-start space-x-3">
                  <Checkbox
                    id={`scope-${scope.name}`}
                    checked={selectedScopes.has(scope.name)}
                    onCheckedChange={() => handleScopeToggle(scope.name, scope.required)}
                    disabled={scope.required || scope.name === "openid"}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`scope-${scope.name}`}
                      className={cn(
                        "text-sm font-medium cursor-pointer",
                        (scope.required || scope.name === "openid") && "text-muted-foreground"
                      )}
                    >
                      {scope.description}
                    </Label>
                    {(scope.required || scope.name === "openid") && (
                      <p className="text-xs text-muted-foreground mt-1">Required</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              By authorizing this application, you allow it to access your data according to the
              permissions above. You can revoke access at any time from your account settings.
            </AlertDescription>
          </Alert>
        </CardContent>

        <Separator className="my-6" />

        <CardFooter className={cn("px-0", "flex", "gap-3")}>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDeny}
            disabled={processing}
          >
            Deny
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleApprove}
            disabled={processing || selectedScopes.size === 0}
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Authorizing...
              </>
            ) : (
              "Authorize"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
