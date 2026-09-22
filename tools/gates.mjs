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
import { spawn, spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { pathToFileURL } from 'node:url';

/* Exportada porque `tools/mapa/gates-espelham-ci.test.mjs` compara esta lista
   com os passos do `ci.yml`, nos dois sentidos. A lista morava na corrente de
   `&&` do package.json; ao sair de lá, a fonte da verdade veio junto — senão o
   teste passaria a olhar para um lugar vazio e a garantia sumiria calada, que é
   exatamente o buraco que ele existe para tapar. */
export const GATES = [
  'typecheck', 'test', 'mcp:check', 'mcp:visual:check', 'build',
  'arquitetura:check', 'arquitetura:motor:check', 'bancada:fronteira:check', 'autoria:schemas:check',
  'bancada:vazia:check', 'porteiro', 'exportar:check',
  'guarda:portas', 'guarda:camera', 'guarda:par', 'guarda:referencia', 'guarda:escolha', 'guarda:junta', 'guarda:edicao', 'guarda:gesto', 'guarda:acervo', 'guarda:referencial', 'origens:check',
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

/* OS GATES RODAM EM PARALELO, E O RELATÓRIO CONTINUA EM ORDEM.
 *
 * Medido em 2026-09-22: dos 259 segundos de uma execução, 77 eram a suíte de
 * testes, 130 os nove gates que abrem navegador de verdade e 42 os dois de MCP;
 * os outros vinte e um juntos não chegavam a dez. Cada gate de navegador sobe o
 * próprio Chromium e o próprio servidor, e um processador ocioso esperava o
 * anterior terminar.
 *
 * Nada do que cada gate afirma muda aqui: o que muda é quantos esperam ao mesmo
 * tempo.
 *
 * MAS ELES NÃO SÃO TODOS INDEPENDENTES, e supor que eram custou três gates
 * vermelhos na primeira execução. Dois recursos são compartilhados e não
 * aparecem em lugar nenhum do código de cada gate:
 *
 * O cache de pré-empacotamento do Vite, em `node_modules/.vite`, é um só para
 * todos os servidores de desenvolvimento. Dois subindo juntos reescrevem o
 * cache um do outro, e o pedido do outro volta com 504 "Outdated Optimize Dep".
 * Foi assim que `porteiro` reprovou duas fixtures de quatro.
 *
 * A suíte de MCP é rodada por três gates diferentes — `test` roda tudo,
 * `mcp:check` roda só ela, e `mcp:visual:check` roda `mcp:check` com o ensaio
 * visual ligado. Os mesmos arquivos de teste escrevem no mesmo repositório de
 * autoria, então dois deles ao mesmo tempo disputam o mesmo diretório.
 *
 * E cinco gates leem `dist/`, que é escrito pelo gate `build`. Em série a ordem
 * da lista bastava; em paralelo eles começavam antes e saíam com "`dist/` não
 * existe", que é recusa alta e correta, na hora errada.
 *
 * Por isso cada gate declara abaixo os RECURSOS que ele ocupa e de que gate ele
 * depende. Gate sem recurso roda com qualquer outro; dois que declaram o mesmo
 * recurso nunca rodam juntos; gate com dependência espera ela terminar. As três
 * restrições ficam escritas, e não descobertas por quem rodar.
 *
 * A saída de cada um é guardada e impressa INTEIRA quando ele termina, em vez
 * de sair caractere a caractere. Misturar nove saídas ao vivo daria um texto em
 * que nenhuma linha diz de quem é.
 *
 * `--parar-no-primeiro` continua existindo e volta a rodar um de cada vez, que
 * é o que serve para quem está consertando um gate específico. */
const CONCORRENCIA_PADRAO = Math.max(2, Math.min(4, availableParallelism()));

/* Os recursos que cada gate ocupa sozinho. Os ausentes não disputam nada.
   Os três de MCP aparecem nos dois grupos: além de rodarem os mesmos arquivos
   de teste, a promoção de autoria de montagem faz inspeção visual, que sobe
   servidor de desenvolvimento por `capturar-montagem.mjs`. Isso foi medido:
   com `mcp:check` só em `suite-mcp`, ele rodou ao lado de um gate de navegador
   e a inspeção visual falhou, e a promoção saiu `recusado` em vez de
   `aprovado` — a falha aponta para a promoção e a causa estava no cache. */
export const RECURSOS_DO_GATE = {
  test: ['suite-mcp', 'cache-vite'],
  'mcp:check': ['suite-mcp', 'cache-vite'],
  'mcp:visual:check': ['suite-mcp', 'cache-vite'],
  porteiro: ['cache-vite'],
  'bancada:vazia:check': ['cache-vite'],
  'guarda:camera': ['cache-vite'],
  'guarda:par': ['cache-vite'],
  'guarda:portas': ['cache-vite'],
};

/* Quem lê `dist/` só pode começar depois de quem escreve. */
export const DEPENDE_DE = Object.fromEntries(
  ['guarda:edicao', 'guarda:escolha', 'guarda:gesto', 'guarda:junta', 'guarda:referencia']
    .map((gate) => [gate, 'build']),
);

function limiteDeConcorrencia() {
  const pedido = process.argv.find((a) => a.startsWith('--concorrencia='));
  if (!pedido) return CONCORRENCIA_PADRAO;
  const valor = Number(pedido.split('=')[1]);
  if (!Number.isInteger(valor) || valor < 1) {
    console.error(`gates — '${pedido}' não é um número inteiro de processos.`);
    process.exit(2);
  }
  return valor;
}

function rodarGate(gate, { silencioso }) {
  return new Promise((resolver) => {
    const inicio = Date.now();
    /* `shell: true` porque no Windows `npm` é um .cmd; sem isso o spawn não
       encontra o executável e todo gate "falha" pelo motivo errado. */
    const processo = spawn('npm', ['run', gate], { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    const pedacos = [];
    processo.stdout.on('data', (d) => pedacos.push(d));
    processo.stderr.on('data', (d) => pedacos.push(d));
    processo.on('close', (status) => {
      const duracao = Date.now() - inicio;
      const codigo = status ?? 1;
      if (!silencioso || codigo !== 0) {
        process.stdout.write(`▶ ${gate} — ${codigo === 0 ? 'ok' : 'FALHOU'}\n`);
        process.stdout.write(Buffer.concat(pedacos).toString());
      }
      resolver({ gate, codigo, duracao });
    });
  });
}

async function executar() {
  const pararNoPrimeiro = process.argv.includes('--parar-no-primeiro');
  const silencioso = process.argv.includes('--silencioso');
  const concorrencia = pararNoPrimeiro ? 1 : limiteDeConcorrencia();

  const porGate = new Map();
  const fila = [...GATES];
  const ocupados = new Set();
  let abortado = false;

  /* Tira da fila o primeiro gate liberado: recursos livres e dependência já
     terminada. Devolver `null` com a fila cheia quer dizer que só sobrou gate
     bloqueado, e aí este trabalhador espera quem está à frente terminar. */
  function proximoLiberado() {
    const posicao = fila.findIndex((gate) => {
      const anterior = DEPENDE_DE[gate];
      if (anterior && !porGate.has(anterior)) return false;
      return (RECURSOS_DO_GATE[gate] ?? []).every((recurso) => !ocupados.has(recurso));
    });
    return posicao === -1 ? null : fila.splice(posicao, 1)[0];
  }

  async function trabalhador() {
    while (fila.length && !abortado) {
      const gate = proximoLiberado();
      if (!gate) { await new Promise((r) => { setTimeout(r, 50); }); continue; }
      const recursos = RECURSOS_DO_GATE[gate] ?? [];
      for (const recurso of recursos) ocupados.add(recurso);
      try {
        const resultado = await rodarGate(gate, { silencioso });
        porGate.set(gate, resultado);
        if (resultado.codigo !== 0 && pararNoPrimeiro) abortado = true;
      } finally {
        for (const recurso of recursos) ocupados.delete(recurso);
      }
    }
  }

  const relogio = Date.now();
  await Promise.all(Array.from({ length: concorrencia }, trabalhador));
  const decorrido = Date.now() - relogio;

  /* A ORDEM DO RELATÓRIO É A DA LISTA, e não a de quem terminou primeiro: a
     lista é a mesma do `ci.yml`, e comparar as duas a olho exige que sejam
     legíveis na mesma sequência. */
  const resultados = GATES.filter((gate) => porGate.has(gate)).map((gate) => porGate.get(gate));

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
    `${resultados.length - falhos.length}/${GATES.length} gates verdes em ${Math.round(decorrido / 1000)}s`
    + (concorrencia > 1 ? ` (${Math.round(total / 1000)}s somados, ${concorrencia} de cada vez)` : '')
    + (falhos.length ? ` — falharam: ${falhos.map((r) => r.gate).join(', ')}` : '')
    + (naoRodados ? ` — ${naoRodados} não rodaram (--parar-no-primeiro)` : ''),
  );

  process.exitCode = falhos.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await executar();
