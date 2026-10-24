import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import localReview from './review-server.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (mode === 'production' && env.VITE_LOCAL_REVIEW === 'true') {
    throw new Error('Production build cannot use local review mode.');
  }
  return ({
  plugins: [react(), ...(mode === 'review' ? [localReview()] : [])],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    globals: true
  },
  server: {
    host: '127.0.0.1',
    port: mode === 'review' ? 4204 : 5173,
    strictPort: true,
    proxy: mode === 'review' ? undefined : {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true }
    }
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react') || id.includes('react-router-dom')) return 'vendor';
          return 'vendor';
        }
      }
    }
  }
});
});
