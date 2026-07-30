/* vite.config.js — build estático da Mecanifica para warbookbr/nos-mecanifica no GitHub Pages. */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/nos-mecanifica/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        produto: resolve(import.meta.dirname, 'index.html'),
        bancada: resolve(import.meta.dirname, 'bancada.html'),
      },
    },
  },
});
