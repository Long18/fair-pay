import { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "./utility";
import { AuthTracker, analyticsManager, ErrorTracker } from "./lib/analytics/index";
import { journeyTracking } from "./lib/journey-tracking";
import { isAnalyticsConsentGiven } from "./lib/analytics/consent-gate";
import {
    loginStatusSignOutMessage,
    shouldSignOutForLoginStatus,
    type LoginAccountStatusPayload,
} from "./lib/auth/login-account-status";

const getErrorMessage = (error: unknown): string | undefined => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string') return message;
    }
    return undefined;
};

const authProvider: AuthProvider = {
    login: async ({ email, password, providerName }) => {
        try {
            if (providerName) {
                const { data, error } = await supabaseClient.auth.signInWithOAuth({
                    provider: providerName,
                    options: {
                        redirectTo: window.location.origin,
                    },
                });

                if (error) {
                    ErrorTracker.apiError({
                        endpoint: 'auth/oauth',
                        errorMessage: error.message,
                    });
                    return {
                        success: false,
                        error,
                    };
                }

                if (data?.url) {
                    if (isAnalyticsConsentGiven()) {
                        AuthTracker.login('oauth', providerName as 'google');
                    }
                    return {
                        success: true,
                        redirectTo: "/",
                    };
                }
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                ErrorTracker.apiError({
                    endpoint: 'auth/login',
                    errorMessage: error.message,
                });
                return {
                    success: false,
                    error,
                };
            }

            if (data?.user) {
                if (isAnalyticsConsentGiven()) {
                    AuthTracker.login('email');
                    journeyTracking.identify(data.user.id);
                    journeyTracking.trackEvent({
                        event_name: 'auth_login',
                        event_category: 'auth',
                        page_path: window.location.pathname,
                        target_type: 'auth',
                        target_key: 'auth:login:email',
                        flow_name: 'auth-login',
                        step_name: 'success',
                        properties: {
                            method: 'email',
                        },
                    });
                }

                // Fetch profile to get full_name
                const { data: profile } = await supabaseClient
                    .from("profiles")
                    .select("full_name")
                    .eq("id", data.user.id)
                    .single();

                if (isAnalyticsConsentGiven()) {
                    analyticsManager.setUser(data.user.id, {
                        email: data.user.email,
                        name: profile?.full_name || data.user.email?.split("@")[0] || 'User',
                        createdAt: data.user.created_at,
                    });
                }
                return {
                    success: true,
                    redirectTo: "/",
                };
            }
        } catch (error: unknown) {
            ErrorTracker.apiError({
                endpoint: 'auth/login',
                errorMessage: getErrorMessage(error) || 'Login failed',
            });
            return {
                success: false,
                error: error as Error,
            };
        }

        return {
            success: false,
            error: {
                message: "Login failed",
                name: "Invalid email or password",
            },
        };
    },
    register: async ({ email, password, providerName }: { email?: string; password?: string; providerName?: string }) => {
        try {
            // OAuth registration (e.g. Google)
            if (providerName) {
                const { data, error } = await supabaseClient.auth.signInWithOAuth({
                    provider: providerName as "google",
                    options: {
                        redirectTo: window.location.origin,
                    },
                });

                if (error) {
                    ErrorTracker.apiError({
                        endpoint: 'auth/oauth-register',
                        errorMessage: error.message,
                    });
                    return {
                        success: false,
                        error,
                    };
                }

                if (data?.url) {
                    if (isAnalyticsConsentGiven()) {
                        AuthTracker.register('oauth');
                    }
                    return {
                        success: true,
                        redirectTo: "/",
                    };
                }
            }

            // Email/password registration
            const { data, error } = await supabaseClient.auth.signUp({
                email: email!,
                password: password!,
            });

            if (error) {
                ErrorTracker.apiError({
                    endpoint: 'auth/register',
                    errorMessage: error.message,
                });
                return {
                    success: false,
                    error,
                };
            }

            if (data) {
                if (isAnalyticsConsentGiven()) {
                    AuthTracker.register('email');
                }
                if (data.user) {
                    if (isAnalyticsConsentGiven()) {
                        journeyTracking.identify(data.user.id);
                        journeyTracking.trackEvent({
                            event_name: 'auth_register',
                            event_category: 'auth',
                            page_path: window.location.pathname,
                            target_type: 'auth',
                            target_key: 'auth:register:email',
                            flow_name: 'auth-register',
                            step_name: 'success',
                            properties: {
                                method: 'email',
                            },
                        });
                    }
                    // Fetch profile to get full_name (profile should be created via trigger)
                    const { data: profile } = await supabaseClient
                        .from("profiles")
                        .select("full_name")
                        .eq("id", data.user.id)
                        .single();

                    if (isAnalyticsConsentGiven()) {
                        analyticsManager.setUser(data.user.id, {
                            email: data.user.email,
                            name: profile?.full_name || data.user.email?.split("@")[0] || 'User',
                            createdAt: data.user.created_at,
                        });
                    }
                }
                return {
                    success: true,
                    redirectTo: "/",
                };
            }
        } catch (error: unknown) {
            ErrorTracker.apiError({
                endpoint: 'auth/register',
                errorMessage: getErrorMessage(error) || 'Register failed',
            });
            return {
                success: false,
                error: error as Error,
            };
        }

        return {
            success: false,
            error: {
                message: "Register failed",
                name: "Invalid email or password",
            },
        };
    },
    forgotPassword: async ({ email }) => {
        try {
            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo: `${window.location.origin}/update-password`,
                }
            );

            if (error) {
                return {
                    success: false,
                    error,
                };
            }

            if (data) {
                return {
                    success: true,
                };
            }
        } catch (error: unknown) {
            return {
                success: false,
                error: error as Error,
            };
        }

        return {
            success: false,
            error: {
                message: "Forgot password failed",
                name: "Invalid email",
            },
        };
    },
    updatePassword: async ({ password }) => {
        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                password,
            });

            if (error) {
                return {
                    success: false,
                    error,
                };
            }

            if (data) {
                return {
                    success: true,
                    redirectTo: "/",
                };
            }
        } catch (error: unknown) {
            return {
                success: false,
                error: error as Error,
            };
        }
        return {
            success: false,
            error: {
                message: "Update password failed",
                name: "Invalid password",
            },
        };
    },
    logout: async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            ErrorTracker.apiError({
                endpoint: 'auth/logout',
                errorMessage: error.message,
            });
            return {
                success: false,
                error,
            };
        }

        if (isAnalyticsConsentGiven()) {
            AuthTracker.logout();
            analyticsManager.clearUser();
            journeyTracking.clearUser();
        }

        return {
            success: true,
            redirectTo: "/login",
        };
    },
    onError: async (error) => {
        console.error(error);
        return { error };
    },
    check: async () => {
        try {
            const { data } = await supabaseClient.auth.getSession();
            const { session } = data;

            if (!session) {
                return {
                    authenticated: false,
                    error: {
                        message: "Check failed",
                        name: "Session not found",
                    },
                    logout: true,
                    redirectTo: "/login",
                };
            }

            // Orphan / deleted-auth JWT after merge (option-1 identity transfer)
            const { data: status, error: statusError } = await supabaseClient.rpc(
                "get_login_account_status",
            );
            if (statusError) {
                console.warn("[auth] get_login_account_status failed", statusError);
            } else if (status && typeof status === "object") {
                const payload = status as LoginAccountStatusPayload;
                if (shouldSignOutForLoginStatus(payload)) {
                    await supabaseClient.auth.signOut();
                    return {
                        authenticated: false,
                        error: {
                            message: loginStatusSignOutMessage(payload),
                            name: "MergedAccount",
                        },
                        logout: true,
                        redirectTo: "/login",
                    };
                }
            }
        } catch (error: unknown) {
            return {
                authenticated: false,
                error: (error as Error) || {
                    message: "Check failed",
                    name: "Not authenticated",
                },
                logout: true,
                redirectTo: "/login",
            };
        }

        return {
            authenticated: true,
        };
    },
    getPermissions: async () => {
        const user = await supabaseClient.auth.getUser();

        if (user) {
            return user.data.user?.role;
        }

        return null;
    },
    getIdentity: async () => {
        const { data: authData } = await supabaseClient.auth.getUser();

        if (!authData?.user) {
            return null;
        }

        // Fetch full profile from profiles table
        const { data: profile, error } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", authData.user.id)
            .single();

        if (error || !profile) {
            // If profile doesn't exist, return basic auth user data
            const fallbackName = authData.user.email?.split("@")[0] || "User";

            // Set analytics user even if profile fetch fails
            if (isAnalyticsConsentGiven()) {
                analyticsManager.setUser(authData.user.id, {
                    email: authData.user.email,
                    name: fallbackName,
                });
                journeyTracking.identify(authData.user.id);
            }

            return {
                id: authData.user.id,
                email: authData.user.email || "",
                full_name: fallbackName,
                avatar_url: null,
            };
        }

        // Set analytics user with full profile data
        if (isAnalyticsConsentGiven()) {
            analyticsManager.setUser(profile.id, {
                email: profile.email,
                name: profile.full_name,
            });
            journeyTracking.identify(profile.id);
        }

        // Return full profile data
        return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
        };
    },
};

export default authProvider;
