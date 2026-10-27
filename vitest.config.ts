/* Config do Vitest: cobre os contratos do Modelar e os núcleos herdados em tools/**. */
import { configDefaults, defineConfig } from 'vitest/config';
import { TESTES_LENTOS } from './tools/testes-lentos.mjs';

/* `npm run test:rapidos` e `npm run test:lentos` (tools/testes-lentos.mjs) dividem a suíte pela lista dos lentos; sem a
   variável, `npm test` roda tudo. */
const MODO = process.env.MECANIFICA_TESTES;

export default defineConfig({
  test: {
    /* `.mjs` também. A regra nasceu de `tools/mecanifica/sistema-freio.test.mjs`,
       que existia desde a Fase 4 e NUNCA rodou, porque o include só aceitava
       `.test.ts`. Arquivo de teste que o runner não enxerga é pior que teste
       nenhum — dá a impressão de cobertura que não existe.

       Aquele arquivo mudou de casa para warbookbr/mecanica junto com o produto,
       mas a regra continua servindo a seis outros, entre eles
       `tools/bancadas/criar-aliases.test.mjs`. */
    include: [
      'src/**/*.test.js', 'src/**/*.test.mjs',
      /* `.test.ts` entrou aqui em 2026-09-22, quando os testes do núcleo vieram
         de `tools/` para a pasta dele: sem esta linha, quinze arquivos movidos
         deixariam de rodar em silêncio, que é o mesmo defeito descrito acima. */
      'procedural/**/*.test.js', 'procedural/**/*.test.mjs', 'procedural/**/*.test.ts',
      'tools/**/*.test.ts', 'tools/**/*.test.mjs',
      'modulos/**/*.test.js', 'modulos/**/*.test.mjs',
    ],
    exclude: MODO === 'rapidos' ? [...configDefaults.exclude, ...TESTES_LENTOS] : configDefaults.exclude,
    ...(MODO === 'lentos' ? { include: TESTES_LENTOS } : {}),
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
    testTimeout: 180_000,

    /* A máquina local expõe mais núcleos lógicos do que esta suíte pesada
       sustenta ao mesmo tempo. Com o padrão do Vitest, a oficina e o estudo
       de revalidação só ultrapassavam o limite quando concorriam com dezenas
       de arquivos; isolados e com dois trabalhadores, ambos continuam
       rápidos. Dois preserva paralelismo sem transformar contenção de CPU e
       disco em falso vermelho. A bateria dos rápidos, sem os lentos, usa
       quatro (plano gates em poucos minutos, 2026-10-16). */
    maxWorkers: MODO === 'rapidos' ? 4 : 2,

    /* O segundo repórter grava a duração de cada arquivo em
       `tmp/gates/duracoes-dos-testes.json`, que o `tools/gates.mjs` lê para
       listar os arquivos mais lentos depois do gate `test`. */
    reporters: ['default', './tools/vitest-duracoes.mjs'],
  },
});
