/* Config do Vitest: cobre os contratos do Modelar e os núcleos herdados em tools/**. */
import { configDefaults, defineConfig } from 'vitest/config';
import { TESTES_LENTOS } from './tools/testes-lentos.mjs';
import { doAmbiente } from './tools/ambiente.mjs';

/* `npm run test:rapidos` e `npm run test:lentos` (tools/testes-lentos.mjs) dividem a suíte pela lista dos lentos; sem a
   variável, `npm test` roda tudo. */
const MODO = doAmbiente('TESTES');

export default defineConfig({
  test: {
    /* `.mjs` também. A regra nasceu de `tools/modelar/sistema-freio.test.mjs`,
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

    /* 900 s por teste: guarda contra teste TRAVADO, e não medida de lentidão. A lentidão é julgada pelo teto relativo à mediana
     * das durações guardadas (`tools/testes-lentos.mjs`, `avaliarTeto`), que só reprova com três execuções seguidas acima do teto;
     * um prazo do vitest abaixo disso aborta o teste antes de o teto opinar, e foi o que reprovou o CI com a peça certa.
     *
     * Medido: `abre-na-bancada` levou 266 s no CI em 2026-11-12 e estourou os 180 s que valiam aqui, e a máquina do CI varia de duas a
     * três vezes de uma execução para outra (as conferências solares, 27 s sozinhas e 80 s no CI; o furgão, 104, 188 e 368 s em três
     * baterias). Três vezes a maior medida (266 s) dá uns 800 s, e 900 s é o prazo que os testes mais pesados já declaravam
     * (`abre-na-bancada`, `acervo-real`). Teste travado passa de 900 s igual; o que some é a falha por contenção, que nunca foi
     * sinal de nada (a cascata persistida a 1,2 s, a sonda da armadura a 0,7 s e a exportação STEP a 4 s, isoladas, já estouraram os
     * 5 s do padrão do Vitest quando os arquivos rodaram em paralelo). Quem precisar de prazo menor ou maior declara no `it`. */
    testTimeout: 900_000,

    /* A máquina local expõe mais núcleos lógicos do que esta suíte pesada
       sustenta ao mesmo tempo. Com o padrão do Vitest, a oficina e o estudo
       de revalidação só ultrapassavam o limite quando concorriam com dezenas
       de arquivos; isolados e com dois trabalhadores, ambos continuam
       rápidos. Dois preserva paralelismo sem transformar contenção de CPU e
       disco em falso vermelho. A bateria dos rápidos, sem os lentos, usa
       quatro (plano gates em poucos minutos, 2026-10-16). Desde 2026-10-27 os lentos também usam quatro: a bateria os
       agenda sozinhos na máquina (`PESO_DO_GATE` em tools/gates.mjs), e com dois a bateria completa esperava 17 minutos por
       eles enquanto dois processadores ficavam parados. `npm test`, que roda tudo de uma vez, continua com dois. */
    maxWorkers: MODO === 'rapidos' || MODO === 'lentos' ? 4 : 2,

    /* O segundo repórter grava a duração de cada arquivo em
       `tmp/gates/duracoes-dos-testes.json`, que o `tools/gates.mjs` lê para
       listar os arquivos mais lentos depois do gate `test`. */
    reporters: ['default', './tools/vitest-duracoes.mjs'],

    /* Com GATES_LEITURAS_DIR, que a bateria liga fora do CI, cada arquivo de teste anota o que lê do repositório, e o seletor
       roda só os testes que leem o que mudou fora do grafo de imports (tools/gates/leituras.mjs). */
    setupFiles: process.env.GATES_LEITURAS_DIR ? ['./tools/gates/leituras-do-teste.mjs'] : [],
  },
});
