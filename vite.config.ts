import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

const NON_PRECACHE_URLS = new Set(['version.json', 'manifest.webmanifest']);
const NON_PRECACHE_PATTERNS = [/^assets\/web-llm\.worker-.*\.js(?:\.map)?$/];

const shouldPrecache = (url: string) => (
  !NON_PRECACHE_URLS.has(url) &&
  !NON_PRECACHE_PATTERNS.some((pattern) => pattern.test(url))
);

type PwaManifestEntry = string | { url: string };
type PwaApiPlugin = {
    api?: {
        extendManifestEntries?: (fn: (entries: PwaManifestEntry[]) => PwaManifestEntry[]) => void;
    };
};

const pwaPlugins = VitePWA({
    injectRegister: false,
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
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        globIgnores: [
            '**/version.json',
            '**/manifest.webmanifest',
            '**/web-llm.worker-*.js',
            '**/web-llm.worker-*.js.map',
        ],
        manifestTransforms: [
            async (entries) => ({
                manifest: entries.filter(({ url }) => shouldPrecache(url)),
                warnings: [],
            }),
        ],
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
        runtimeCaching: [
            // Navigation requests always go to network (SPA)
            {
                urlPattern: ({ request }) => request.mode === 'navigate',
                handler: 'NetworkOnly',
            },
            // Google Fonts stylesheet — serve from cache, revalidate in background
            {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                    cacheName: 'google-fonts-stylesheets',
                    expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                    },
                    cacheableResponse: { statuses: [0, 200] },
                },
            },
            // Google Fonts files — cache-first, virtually immutable
            {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'google-fonts-files',
                    expiration: {
                        maxEntries: 30,
                        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                    },
                    cacheableResponse: { statuses: [0, 200] },
                },
            },
            // Local woff2/woff/ttf fonts (precached by globPatterns, but belt-and-suspenders)
            {
                urlPattern: /\.(woff2?|ttf|otf|eot)$/i,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'font-cache',
                    expiration: {
                        maxEntries: 20,
                        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                    },
                    cacheableResponse: { statuses: [0, 200] },
                },
            },
            // Supabase REST API — network-first with fast fallback to cache
            {
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'supabase-api-cache',
                    expiration: {
                        maxEntries: 150,
                        maxAgeSeconds: 60 * 5, // 5 minutes
                    },
                    // Fall back to cache quickly so offline/slow connections still work
                    networkTimeoutSeconds: 4,
                },
            },
            // Supabase Storage (avatars, attachments) — serve stale, update in background
            {
                urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                    cacheName: 'supabase-storage-cache',
                    expiration: {
                        maxEntries: 300,
                        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                    },
                    cacheableResponse: { statuses: [0, 200] },
                },
            },
            // Generic images (extension-based URLs, e.g. OG images, third-party assets)
            {
                urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'image-cache',
                    expiration: {
                        maxEntries: 150,
                        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                    },
                    cacheableResponse: { statuses: [0, 200] },
                },
            },
        ],
    },
});

const pwaApiPlugin = pwaPlugins[0] as PwaApiPlugin | undefined;
let hasPatchedPrecacheEntries = false;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    ...pwaPlugins,
    {
        name: 'strip-pwa-metadata-from-precache',
        apply: 'build',
        buildStart() {
            if (hasPatchedPrecacheEntries) {
                return;
            }

            pwaApiPlugin?.api?.extendManifestEntries?.((entries) => (
                entries.filter((entry) => {
                    const url = typeof entry === 'string' ? entry : entry.url;
                            return shouldPrecache(url);
                })
            ));
            hasPatchedPrecacheEntries = true;
        },
    },
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
        exclude: ['@refinedev/devtools', '@mlc-ai/web-llm'],
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
                manualChunks(id: string) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react-dom') || id.includes('react-router') || id.match(/\/react\//) ) {
                            return 'vendor-react';
                        }
                        if (id.includes('@refinedev/core') || id.includes('@refinedev/react-router') || id.includes('@refinedev/supabase')) {
                            return 'vendor-refine';
                        }
                        if (id.includes('@supabase/supabase-js') || id.includes('@supabase/auth-js')) {
                            return 'vendor-supabase';
                        }
                        if (id.includes('@radix-ui/')) {
                            return 'vendor-ui';
                        }
                        if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('/zod/')) {
                            return 'vendor-form';
                        }
                        if (id.includes('@tanstack/react-table')) {
                            return 'vendor-table';
                        }
                        if (id.includes('date-fns') || id.includes('dayjs')) {
                            return 'vendor-date';
                        }
                        if (id.includes('i18next') || id.includes('react-i18next')) {
                            return 'vendor-i18n';
                        }
                    }
                    return undefined;
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
