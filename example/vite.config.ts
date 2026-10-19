import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'nepal-administrative-map': resolve(__dirname, '../src/index.ts'),
      'nepal-administrative-map/core': resolve(__dirname, '../src/core.ts'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
