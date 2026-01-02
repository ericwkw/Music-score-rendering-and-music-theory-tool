
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel/Vite build time replacement. 
    // This safely turns process.env.API_KEY into "actual_key_string" or "" in the built JS.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
