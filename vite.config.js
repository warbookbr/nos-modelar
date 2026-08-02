/* vite.config.js — build estático da BANCADA de autoria, publicada em
   warbookbr/nos-mecanifica no GitHub Pages. O produto que o cliente abre
   vive em warbookbr/mecanica e se constrói de lá. */
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
      /* só a BANCADA. O produto saiu para warbookbr/mecanica: ele lê peças já
         resolvidas e não precisa do núcleo, então não faz sentido construí-lo
         a partir da oficina. */
      input: {
        bancada: resolve(import.meta.dirname, 'bancada.html'),
      },
    },
  },
});
