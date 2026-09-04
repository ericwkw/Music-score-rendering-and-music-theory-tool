import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env files plus real environment variables (Vercel etc.)
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.API_KEY || env.GLM_API_KEY || env.VITE_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Client code reads process.env.API_KEY; inject it at build time.
      // Falls back to "" so the app runs in offline/fallback mode without a key.
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});
