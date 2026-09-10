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
      'src/**/*.test.js', 'src/**/*.test.mjs',
      'prototipos/**/*.test.js', 'prototipos/**/*.test.mjs',
      'tools/**/*.test.ts', 'tools/**/*.test.mjs',
      'autoria-assistida/**/*.test.mjs',
      'modulos/**/*.test.js', 'modulos/**/*.test.mjs',
    ],
    watch: false,

    /* 20 s por teste, não os 5 s do padrão do Vitest.
     *
     * Três testes desta suíte já falharam por este motivo, e nenhum tinha
     * defeito: o estudo de campo da cascata persistida (1,2 s isolado), a sonda
     * da armadura humanoide (0,7 s isolada) e a exportação STEP com occt-wasm
     * (4 s isolada). Todos passam sozinhos e estouram quando os arquivos rodam
     * em paralelo e disputam CPU e disco.
     *
     * Teste que passa isolado e falha junto é pior que teste vermelho: ensina
     * quem roda — pessoa ou agente — a desconfiar da suíte inteira e a repetir
     * "só para ver se passa desta vez". Corrigir um a um virou caça sem fim; o
     * orçamento tem de caber no trabalho que a suíte de fato faz, com malha,
     * WASM e navegador dentro dela.
     *
     * Isto NÃO esconde teste travado: travado passa de 20 s igual. O que some é
     * a falha por contenção, que nunca foi sinal de nada. */
    testTimeout: 20_000,

    /* A máquina local expõe mais núcleos lógicos do que esta suíte pesada
       sustenta ao mesmo tempo. Com o padrão do Vitest, a oficina e o estudo
       de revalidação só ultrapassavam o limite quando concorriam com dezenas
       de arquivos; isolados e com dois trabalhadores, ambos continuam
       rápidos. Dois preserva paralelismo sem transformar contenção de CPU e
       disco em falso vermelho. */
    maxWorkers: 2,
  },
});
