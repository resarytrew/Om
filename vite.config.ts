import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Om/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
