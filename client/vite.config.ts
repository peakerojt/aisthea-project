import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
    },
    plugins: [react()],
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
