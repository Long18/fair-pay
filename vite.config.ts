import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

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
                        type: 'image/x-icon',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                navigateFallback: null,
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
                runtimeCaching: [
                    {
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
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240, // Only compress files > 10KB
            algorithm: 'gzip',
            ext: '.gz',
            deleteOriginFile: false,
        }),
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
            '@': path.resolve(__dirname, './src'),
        },
    },
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router',
            '@supabase/supabase-js',
            '@refinedev/core',
            'date-fns',
        ],
        exclude: ['@refinedev/devtools'],
    },
    build: {
        target: 'esnext',

        cssMinify: 'lightningcss',
        cssCodeSplit: true,

        chunkSizeWarningLimit: 1000,

        minify: 'esbuild',

        esbuild: {
            drop: ['console', 'debugger'],
            legalComments: 'none',
        },

        sourcemap: false,

        rollupOptions: {
            output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router'],
                    'vendor-refine': ['@refinedev/core', '@refinedev/react-router', '@refinedev/supabase'],
                    'vendor-supabase': ['@supabase/supabase-js'],
                    'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-tooltip', '@radix-ui/react-dropdown-menu'],
                    'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
                    'vendor-table': ['@tanstack/react-table'],
                    'vendor-date': ['date-fns', 'dayjs'],
                    'vendor-i18n': ['i18next', 'react-i18next'],
                },
            },

            treeshake: {
                moduleSideEffects: true,
                propertyReadSideEffects: false,
            },
        },

        reportCompressedSize: true,
    },
});
