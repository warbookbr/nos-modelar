/* vite.config.js — build estático da BANCADA de autoria, publicada em
   warbookbr/nos-mecanifica no GitHub Pages. O produto que o cliente abre
   vive em warbookbr/mecanica e se constrói de lá. */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { escritaDeParametro } from './tools/bancadas/servir-escrita.mjs';
import { descreverVersao, lerVersaoPublicada } from './tools/bancadas/versao-publicada.mjs';

/* A versão entra como texto fixo no pacote: a página publicada não tem git para
   consultar, e sem isto quem abre a bancada não sabe se está vendo a construção
   de hoje ou uma guardada pelo navegador. */
const VERSAO_DA_BANCADA = descreverVersao(lerVersaoPublicada({
  executar: (comando) => execSync(comando, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
}));

export default defineConfig({
  base: '/nos-mecanifica/',
  define: { __VERSAO_DA_BANCADA__: JSON.stringify(VERSAO_DA_BANCADA) },
  /* Só no servidor de desenvolvimento: a página publicada não escreve arquivo
     nenhum, e quem a abre não tem o repositório para escrever nele. */
  plugins: [escritaDeParametro()],
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
