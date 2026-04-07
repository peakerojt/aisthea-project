import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    build: {
      modulePreload: {
        resolveDependencies(_filename, deps) {
          return deps.filter(
            (dependency) =>
              !dependency.includes('charts-vendor') &&
              !dependency.includes('forms-vendor')
          );
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('@tanstack')) {
              return 'query-vendor';
            }

            if (id.includes('i18next')) {
              return 'i18n-vendor';
            }

            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }

            if (id.includes('recharts') || id.includes('/d3-')) {
              return 'charts-vendor';
            }

            if (id.includes('@dnd-kit')) {
              return 'dnd-vendor';
            }

            if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
              return 'realtime-vendor';
            }

            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('zod')
            ) {
              return 'forms-vendor';
            }

            if (
              id.includes('jsqr') ||
              id.includes('vietnam-qr-pay') ||
              id.includes('browser-image-compression')
            ) {
              return 'media-vendor';
            }

            return undefined;
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['vietnam-qr-pay'],
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      dedupe: ['react', 'react-dom', 'zod'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@validation': path.resolve(__dirname, '../server/src/shared/validation'),
      }
    }
  };
});
