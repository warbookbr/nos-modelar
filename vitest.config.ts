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
       `tools/bancadas/criar-aliases.test.mjs` e `tools/coordenacao/coord.test.mjs`.

       A zona de experimentos entrou pelo mesmo motivo: a prova P2 do chassi
       nasce em `autoria-assistida/` e o gate dela exige teste. Deixar o teste
       fora do include repetiria exatamente o defeito de cima — arquivo que
       existe, nunca roda, e dá impressão de cobertura. */
    include: [
      'tools/**/*.test.ts', 'tools/**/*.test.mjs',
      'autoria-assistida/**/*.test.mjs',
    ],
    watch: false,
  },
});
