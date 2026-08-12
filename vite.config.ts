import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Om/',
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
