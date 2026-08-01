/* Config do Vitest: cobre os contratos da Mecanifica e os núcleos herdados em tools/**. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /* `.mjs` também: `tools/mecanifica/sistema-freio.test.mjs` existia desde a
       Fase 4 e NUNCA rodou, porque o include só aceitava `.test.ts`. Arquivo de
       teste que o runner não enxerga é pior que teste nenhum — ele dá a
       impressão de cobertura que não existe. */
    include: ['tools/**/*.test.ts', 'tools/**/*.test.mjs'],
    watch: false,
  },
});
