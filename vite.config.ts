
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Inject the API Key from the build environment (Vercel)
    // If undefined, fallback to empty string to prevent ReferenceError in client code
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
