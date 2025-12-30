import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'google44489daa6fb5786d.html'],
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
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                navigateFallback: null,
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
                // Improved runtime caching strategies
                runtimeCaching: [
                    {
                        // Supabase API - Network First for real-time data
                        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'supabase-api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 5, // 5 minutes
                            },
                            networkTimeoutSeconds: 10,
                        },
                    },
                    {
                        // Supabase Storage - Stale While Revalidate for images
                        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'supabase-storage-cache',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        // External images - Cache First
                        urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                            },
                        },
                    },
                ],
            },
        }),
        // Gzip compression
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240, // Only compress files > 10KB
            algorithm: 'gzip',
            ext: '.gz',
            deleteOriginFile: false,
        }),
        // Brotli compression (better than gzip)
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: 'brotliCompress',
            ext: '.br',
            deleteOriginFile: false,
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
    // Optimize dependency pre-bundling
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router',
            '@supabase/supabase-js',
            '@refinedev/core',
            'date-fns',
        ],
        exclude: ['@refinedev/devtools'], // Exclude devtools - not used in production
    },
    build: {
        // Target modern browsers for smaller bundles
        target: 'esnext',

        // Enable CSS code splitting
        cssCodeSplit: true,

        // Optimize chunk size
        chunkSizeWarningLimit: 1000,

        // Use esbuild for faster and safer minification
        // Terser was too aggressive and broke React internals
        minify: 'esbuild',

        // Disable source maps for production (reduce bundle size)
        sourcemap: false,

        // Rollup optimizations
        rollupOptions: {
            output: {
                // Ensure proper chunk loading order
                // React must load before any providers that use it
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: (chunkInfo) => {
                    // Ensure react-vendor loads first
                    if (chunkInfo.name === 'react-vendor') {
                        return 'assets/react-vendor-[hash].js';
                    }
                    return 'assets/[name]-[hash].js';
                },
                // NO manual chunking - let Vite handle it automatically
                // Manual chunking was causing module loading order issues
                // React needs to be available before any code that uses it
                // See docs/95-Production-Bug-Root-Cause-Analysis.md and docs/96-Verification-Report-CRITICAL-BUG-FOUND.md
                // manualChunks: undefined, // Let Vite decide

                // Optimize asset naming
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },

            // Tree shaking optimizations
            // IMPORTANT: Don't be too aggressive with tree-shaking as it can break React internals
            treeshake: {
                moduleSideEffects: true, // Preserve ALL side effects to be safe
                propertyReadSideEffects: false,
            },
        },

        // Report compressed size
        reportCompressedSize: true,
    },
});
