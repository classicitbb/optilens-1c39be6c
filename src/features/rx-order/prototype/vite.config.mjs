import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import tailwind from '@tailwindcss/postcss';

// Deliberately independent of the application, its environment and its API clients.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  envDir: false,
  publicDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('../../../', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  css: { postcss: { plugins: [tailwind()] } },
  server: { host: '127.0.0.1', port: 5187, strictPort: true, fs: { strict: true, allow: [fileURLToPath(new URL('../../../../', import.meta.url))] } },
  build: { outDir: '../../../../node_modules/.cache/stock-order-prototype', emptyOutDir: true },
});
