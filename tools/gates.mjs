/* gates.mjs — roda TODOS os gates e relata TODOS, em vez de parar no primeiro.
 *
 * `npm run gates` era uma corrente de dezessete `npm run X && npm run Y`. Basta
 * o primeiro falhar para os dezesseis seguintes nunca rodarem, e quem roda
 * descobre um problema por execução. Medido em 2026-09-07: com `npm test`
 * vermelho por privilégio de symlink do Windows, `gates` morria no passo 2 de
 * 17 — o estado dos outros quinze era simplesmente desconhecido.
 *
 * Isso é caro para qualquer um e é pior para um agente: ele corrige o primeiro,
 * roda de novo, descobre o segundo, corrige, roda de novo. Um relatório que
 * mostra os dezessete de uma vez transforma dezessete rodadas em uma.
 *
 * A corrente continua existindo em espírito — a saída é não-zero se QUALQUER
 * gate falhar. O que muda é que agora dá para ver o conjunto inteiro antes de
 * decidir por onde começar.
 *
 * `--parar-no-primeiro` recupera o comportamento antigo para quem quiser um
 * laço curto enquanto conserta um gate específico.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/* Exportada porque `tools/mapa/gates-espelham-ci.test.mjs` compara esta lista
   com os passos do `ci.yml`, nos dois sentidos. A lista morava na corrente de
   `&&` do package.json; ao sair de lá, a fonte da verdade veio junto — senão o
   teste passaria a olhar para um lugar vazio e a garantia sumiria calada, que é
   exatamente o buraco que ele existe para tapar. */
export const GATES = [
  'typecheck', 'test', 'mcp:check', 'mcp:visual:check', 'build',
  'arquitetura:check', 'arquitetura:motor:check', 'autoria:schemas:check',
  'bancada:vazia:check', 'porteiro', 'exportar:check',
  'guarda:portas', 'guarda:camera', 'guarda:par', 'guarda:referencia', 'guarda:escolha', 'guarda:acervo',
  'mapa:check', 'reguas:check',
  'docs:toc:check', 'docs:links:check', 'planos:check', 'docs:estrutura:check',
  'docs:citacoes:check',
  'leitura:obrigatoria',
  /* O catálogo é derivado do registro do motor e assinado por hash, e é a
     camada que permite a skill NÃO carregar a tabela de operações: quem precisa
     de uma consulta `descrever_capacidade` e recebe schema, exemplo e limites
     de uma operação só. Ele existia com `--check` funcionando, saindo 1 na
     divergência, e não era rodado por gate nem por CI. Fonte de verdade que
     ninguém confere volta a ser texto solto: bastava uma operação mudar de
     intenção no código para o catálogo descrever um motor que não existe mais,
     e quem consulta não tem como saber. */
  'catalogo:check',
];

function executar() {
  const pararNoPrimeiro = process.argv.includes('--parar-no-primeiro');
  const silencioso = process.argv.includes('--silencioso');

  const resultados = [];
  for (const gate of GATES) {
    const inicio = Date.now();
    process.stdout.write(`▶ ${gate}\n`);
    /* `shell: true` porque no Windows `npm` é um .cmd; sem isso o spawn não
       encontra o executável e todo gate "falha" pelo motivo errado. */
    const execucao = spawnSync('npm', ['run', gate], {
      stdio: silencioso ? ['ignore', 'ignore', 'pipe'] : 'inherit',
      shell: true,
    });
    const duracao = Date.now() - inicio;
    const codigo = execucao.status ?? 1;
    resultados.push({ gate, codigo, duracao });
    if (codigo !== 0 && pararNoPrimeiro) break;
  }

  const falhos = resultados.filter((r) => r.codigo !== 0);
  const total = resultados.reduce((soma, r) => soma + r.duracao, 0);

  console.log(`\n${'─'.repeat(52)}`);
  for (const { gate, codigo, duracao } of resultados) {
    const marca = codigo === 0 ? '✓' : '✗';
    console.log(`${marca} ${gate.padEnd(24)} ${String(Math.round(duracao / 100) / 10).padStart(6)}s`);
  }
  const naoRodados = GATES.length - resultados.length;
  console.log('─'.repeat(52));
  console.log(
    `${resultados.length - falhos.length}/${GATES.length} gates verdes em ${Math.round(total / 1000)}s`
    + (falhos.length ? ` — falharam: ${falhos.map((r) => r.gate).join(', ')}` : '')
    + (naoRodados ? ` — ${naoRodados} não rodaram (--parar-no-primeiro)` : ''),
  );

  process.exitCode = falhos.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
