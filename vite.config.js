/* vite.config.js — build estático da Mecanifica para warbookbr/nos-mecanifica no GitHub Pages. */
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/nos-mecanifica/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 700,
  },
});
