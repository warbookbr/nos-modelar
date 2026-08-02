/* Config do Vitest: cobre os contratos da Mecanifica e os núcleos herdados em tools/**. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /* `.mjs` também. A regra nasceu de `tools/mecanifica/sistema-freio.test.mjs`,
       que existia desde a Fase 4 e NUNCA rodou, porque o include só aceitava
       `.test.ts`. Arquivo de teste que o runner não enxerga é pior que teste
       nenhum — dá a impressão de cobertura que não existe.

       Aquele arquivo mudou de casa para warbookbr/mecanica junto com o produto,
       mas a regra continua servindo a seis outros, entre eles
       `tools/bancadas/criar-aliases.test.mjs` e `tools/coordenacao/coord.test.mjs`. */
    include: ['tools/**/*.test.ts', 'tools/**/*.test.mjs'],
    watch: false,
  },
});
