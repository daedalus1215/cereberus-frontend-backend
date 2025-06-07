import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { env } from './vite.env.config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), 
    },
  },
  preview: {
    allowedHosts: [env.VITE_ALLOWED_HOSTS],
    host: env.VITE_HOST,
    port: parseInt(env.VITE_PORT),
    proxy: {
      '/api': {
        target: env.VITE_API_URL,
        changeOrigin: true
      }
    }
  }
});
