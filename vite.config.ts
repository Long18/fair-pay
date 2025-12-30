import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh with optimizations
      fastRefresh: true,
    }),
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
    exclude: ['@refinedev/devtools'], // Don't pre-bundle devtools
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'esnext',

    // Enable CSS code splitting
    cssCodeSplit: true,

    // Optimize chunk size
    chunkSizeWarningLimit: 1000,

    // Use Terser for better compression (Oxc not available in current version)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Safari 10 compatibility
      },
      format: {
        comments: false, // Remove all comments
      },
    },

    // Disable source maps for production (reduce bundle size)
    sourcemap: false,

    // Rollup optimizations
    rollupOptions: {
      output: {
        // Improved manual chunking strategy
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }

          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'react-router-vendor';
          }

          // Refine core framework
          if (id.includes('@refinedev/core')) {
            return 'refine-core';
          }

          // Refine providers (separate chunk)
          if (id.includes('@refinedev/') && !id.includes('@refinedev/core')) {
            return 'refine-providers';
          }

          // Supabase
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }

          // Radix UI components (large library)
          if (id.includes('@radix-ui/')) {
            return 'radix-ui';
          }

          // TanStack libraries
          if (id.includes('@tanstack/')) {
            return 'tanstack';
          }

          // Form libraries
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform/')) {
            return 'forms';
          }

          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }

          // Date libraries
          if (id.includes('date-fns') || id.includes('dayjs')) {
            return 'date-utils';
          }

          // UI utilities (icons, etc)
          if (id.includes('lucide-react') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'ui-utils';
          }

          // Other large node_modules
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },

        // Optimize asset naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },

      // Tree shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },

    // Report compressed size
    reportCompressedSize: true,
  },
});
