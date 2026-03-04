/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    // MoMo Integration
    readonly VITE_MOMO_API_URL?: string;
    readonly VITE_MOMO_ACCESS_TOKEN?: string;
    readonly VITE_MOMO_RECEIVER_PHONE?: string;
    // Feature flags
    readonly VITE_ENABLE_VERCEL_ANALYTICS?: string;
    readonly VITE_ENABLE_ADMIN_API_DOCS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
