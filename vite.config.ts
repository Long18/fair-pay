import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico'],
            manifest: {
                name: 'FairPay - Expense Splitting Made Easy',
                short_name: 'FairPay',
                description: 'Split expenses fairly with friends and groups',
                theme_color: '#0f172a',
                background_color: '#ffffff',
                display: 'standalone',
                icons: [
                    {
                        src: 'favicon.ico',
                        sizes: '64x64 32x32 24x24 16x16',
                        type: 'image/x-icon'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
                navigateFallback: null,
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'supabase-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                            },
                        },
                    },
                ],
            },
        }),
    ],
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        host: true,
        strictPort: false,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        // Enable code splitting and optimization
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunk for React and core libraries
                    'react-vendor': ['react', 'react-dom'],

                    // Refine framework (core only - other packages auto-chunked)
                    'refine': ['@refinedev/core'],

                    // UI libraries
                    'ui': ['lucide-react', 'date-fns'],

                    // Supabase
                    'supabase': ['@supabase/supabase-js'],

                    // i18n
                    'i18n': ['react-i18next', 'i18next'],
                },
            },
        },

        // Optimize chunk size
        chunkSizeWarningLimit: 1000,

        // Minification
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.log in production
                drop_debugger: true,
            },
        },

        // Source maps for production debugging (optional)
        sourcemap: false,
    },
});
