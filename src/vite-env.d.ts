/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_APP_VERSION?: string;
    readonly VITE_APP_BUILD_INFO?: string;
    // MoMo Integration
    readonly VITE_MOMO_RECEIVER_PHONE?: string;
    // Local dev sign-in
    readonly VITE_DEV_ADMIN_EMAIL?: string;
    readonly VITE_DEV_ADMIN_PASSWORD?: string;
    readonly VITE_DEV_USER_EMAIL?: string;
    readonly VITE_DEV_USER_PASSWORD?: string;
    // Feature flags
    readonly VITE_ENABLE_VERCEL_ANALYTICS?: string;
    readonly VITE_ENABLE_ADMIN_API_DOCS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
