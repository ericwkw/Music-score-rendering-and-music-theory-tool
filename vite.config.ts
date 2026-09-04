import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env files plus real environment variables (Vercel etc.)
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.API_KEY || env.LLM_API_KEY || env.GLM_API_KEY || env.VITE_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Injected at build time; the client reads process.env.*.
      // No key => the app runs in offline mode.
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.LLM_BASE_URL': JSON.stringify(env.LLM_BASE_URL || ''),
      'process.env.LLM_MODEL': JSON.stringify(env.LLM_MODEL || ''),
    },
  };
});
