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
 *
 * Desde 2026-10-28 os gates baratos rodam antes, todos, e uma falha entre eles
 * para a bateria ali (ver `separarEstagios`): o relatório de todos continua
 * valendo dentro de cada estágio.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decidir, diretorioDasLeituras, fotografar, gravarVerdes, lerLeiturasDoGate, lerVerdes, registroVerde, rodouInteiro } from './gates/seletor.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/* A SAÍDA INTEIRA DE UM GATE QUE FALHA VAI PARA UM ARQUIVO.
 *
 * Quem roda `npm run gates` lê o fim do relatório, e um gate que falha com
 * centenas de linhas de teste perde o começo: a falha que interessa costuma
 * estar lá. Uma falha do gate `test` ficou sem investigação porque a saída se
 * perdeu no terminal.
 *
 * Por isso a saída de cada gate que falha é gravada inteira em `tmp/gates/`,
 * que é ignorado pelo git, e a linha de falha, tanto a do bloco do gate quanto
 * a do resumo final, traz o caminho. Gate que passa não deixa arquivo; o
 * arquivo de uma falha anterior é apagado quando o mesmo gate passa. Cada gate
 * tem um arquivo só, sobrescrito a cada execução, então o caminho é o mesmo
 * entre rodadas. */
export const DIRETORIO_DAS_SAIDAS = join('tmp', 'gates');

export function guardarSaidaDoGate(gate, saida, codigo, raiz = RAIZ) {
  const caminho = join(raiz, DIRETORIO_DAS_SAIDAS, `${gate.replace(/:/g, '-')}.log`);
  if (codigo === 0) {
    rmSync(caminho, { force: true });
    return null;
  }
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, saida, 'utf8');
  return caminho;
}

export function linhaDeFalha(gate, arquivo) {
  return `▶ ${gate} — FALHOU; saída inteira em ${arquivo}`;
}

/* OS ARQUIVOS DE TESTE MAIS LENTOS.
 *
 * O resumo mostra o gate `test` inteiro, e em 2026-10-13 a bateria completa
 * passou de 4 a 6 minutos para 22 sem que nada apontasse o arquivo culpado. O
 * repórter `tools/vitest-duracoes.mjs` grava a duração de cada arquivo, este
 * relatório a lê assim que o gate `test` termina (outro gate que rode o Vitest
 * depois sobrescreveria o arquivo) e o resumo lista os cinco mais lentos, com
 * aviso para o que passa de `TETO_POR_ARQUIVO_DE_TESTE_MS`. É aviso e não
 * reprovação: o arquivo lento pede medição por etapa antes de ser dividido. */
export const TETO_POR_ARQUIVO_DE_TESTE_MS = 120_000;
const arquivoDasDuracoes = (gate) => join('tmp', 'gates', `duracoes-dos-testes-${gate.split(':')[1]}.json`);

export function arquivosMaisLentos(duracoes, quantos = 5, teto = TETO_POR_ARQUIVO_DE_TESTE_MS) {
  return [...duracoes].sort((a, b) => b.ms - a.ms).slice(0, quantos)
    .map(({ arquivo, ms }) => `${ms > teto ? '⚠' : ' '} ${String(Math.round(ms / 100) / 10).padStart(6)}s  ${arquivo}`
      + (ms > teto ? `  (passa de ${teto / 1000}s; meça por etapa antes de dividir)` : ''));
}

/* Só vale o arquivo gravado depois de o gate começar; um de execução anterior
   listaria durações velhas como se fossem desta. */
function lerDuracoesDosTestes(gate, desde, raiz = RAIZ) {
  const caminho = join(raiz, arquivoDasDuracoes(gate));
  if (!existsSync(caminho)) return null;
  try {
    const { gravado, duracoes } = JSON.parse(readFileSync(caminho, 'utf8'));
    return Date.parse(gravado) >= desde ? duracoes : null;
  } catch { return null; }
}

/* Exportada porque `tools/mapa/gates-espelham-ci.test.mjs` compara esta lista
   com os passos do `ci.yml`, nos dois sentidos. A lista morava na corrente de
   `&&` do package.json; ao sair de lá, a fonte da verdade veio junto — senão o
   teste passaria a olhar para um lugar vazio e a garantia sumiria calada, que é
   exatamente o buraco que ele existe para tapar. */
export const GATES = [
  'typecheck', 'test:rapidos', 'test:lentos', 'mcp:visual:check', 'build',
  'arquitetura:check', 'arquitetura:motor:check', 'bancada:fronteira:check',
  /* As dez guardas que abrem a bancada (porteiro, bancada:vazia:check, guarda:portas, :camera, :par, :referencia, :escolha, :junta,
     :edicao e :gesto) rodam aqui dentro, num Chromium e num servidor do Vite só (tools/modelar/guardas/rodar-guardas.mjs). Cada
     uma continua sendo um script que roda sozinho, e o relatório do gate diz o nome e o veredito de cada uma. */
  'bancada:guardas', 'exportar:check',
  'guarda:acervo', 'guarda:referencial', 'origens:check',
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
  'ferramentas:check',
  'banco-de-provas:check',
  /* O hash da geometria dos três pontos de cada família registrada em `procedural/familias`, preso ao `aprovacao.json`.
     Geometria que muda sem reaprovação reprova dizendo o ponto; sem família registrada, passa dizendo isso. */
  'familias:check',
  /* O conjunto de calibração do crítico: as doze imagens com a fonte que as reproduz, o hash do agente e do brief gravados
     e a medida reprovando, sem o crítico, o que o conjunto diz ser dela. Mudar o crítico, o desenhista ou a geometria de uma
     fonte exige gerar e medir de novo. */
  'calibracao:check',
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
 * A suíte de MCP é rodada por dois gates — `test:lentos` roda os arquivos
 * dela entre os lentos, e `mcp:visual:check` roda `mcp:check` com o ensaio
 * visual ligado (o `mcp:check` sozinho saiu da bateria em 2026-10-25, porque
 * repetia os mesmos arquivos sem o ensaio). Os mesmos arquivos de teste escrevem no mesmo repositório de
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

/* Os recursos que cada gate ocupa sozinho. Os ausentes não disputam nada. As guardas da bancada, que eram oito gates com um
   servidor do Vite cada, são um gate só (`bancada:guardas`) com um servidor para todas, e é ele que ocupa o cache.
   Os de MCP aparecem nos dois grupos: além de rodarem os mesmos arquivos
   de teste, a promoção de autoria de montagem faz inspeção visual, que sobe
   servidor de desenvolvimento por `capturar-montagem.mjs`. Isso foi medido:
   com `mcp:check` só em `suite-mcp`, ele rodou ao lado de um gate de navegador
   e a inspeção visual falhou, e a promoção saiu `recusado` em vez de
   `aprovado` — a falha aponta para a promoção e a causa estava no cache. */
export const RECURSOS_DO_GATE = {
  'test:lentos': ['suite-mcp', 'cache-vite'],
  'mcp:visual:check': ['suite-mcp', 'cache-vite'],
  'bancada:guardas': ['cache-vite'],
};

/* O PESO DE CADA GATE NA MÁQUINA.
 *
 * Medido em 2026-10-27: os gates rodavam quatro de cada vez numa máquina de quatro processadores, mas os testes rápidos sozinhos
 * abrem quatro trabalhadores e os lentos dois, e os gates de navegador sobem cada um um Chromium e um servidor. Com tudo junto
 * havia dez ou mais processos pesados disputando quatro processadores, e cada teste ficava duas a três vezes mais lento do que
 * sozinho (a blocagem do esboço, 130 s sozinha e 336 s na bateria; o alisamento da rede, 260 s e 447 s). Contar só quantos gates
 * rodam não via isso. Cada gate declara aqui quantos processadores ocupa (o padrão é 1), e o agendador só começa um gate quando
 * a soma dos que estão rodando mais o dele cabe na máquina; um gate mais pesado que a máquina roda sozinho. */
export const PESO_DO_GATE = {
  'test:rapidos': 4,
  'test:lentos': 4,
  'mcp:visual:check': 2,
  'bancada:guardas': 2,
};
const ORCAMENTO_DA_MAQUINA = Math.max(2, availableParallelism());

/* BATERIA CURTA QUANDO SÓ MUDOU PEÇA OU DOCUMENTO.
 *
 * Contado em 2026-09-24: numa conversa de autoria do braço robótico a bateria
 * completa rodou cerca de 270 vezes, a quatro minutos cada, e a maior parte
 * dessas rodadas vinha de mudança só em receita ou em documento. Os gates que
 * abrem navegador e os de MCP conferem bancada, gesto, câmera e o servidor de
 * autoria, e nenhum arquivo de peça ou de documento chega a eles.
 *
 * Por isso a bateria olha o que mudou desde o ramo remoto, commitado ou não.
 * Se tudo cabe em PASTAS_LEVES roda GATES_CURTOS; qualquer outro arquivo, ou
 * não conseguir saber o que mudou, roda todos. `--completo` força todos. O
 * build e a suíte de testes ficam na curta: a cópia da receita da rodada 7 do
 * ombro, com import relativo errado, só foi pega pelo build. */
export const PASTAS_LEVES = [/^procedural\/pecas\//, /^docs\//, /^[^/]+\.md$/];

export const GATES_CURTOS = [
  'typecheck', 'test:rapidos', 'test:lentos', 'build', 'exportar:check',
  'guarda:acervo', 'guarda:referencial', 'origens:check',
  'mapa:check', 'reguas:check',
  'docs:toc:check', 'docs:links:check', 'planos:check', 'docs:estrutura:check',
  'docs:citacoes:check', 'leitura:obrigatoria', 'catalogo:check', 'ferramentas:check',
  'banco-de-provas:check', 'calibracao:check',
];

export function escolherBateria(alterados) {
  if (!alterados || !alterados.length) return { bateria: GATES, motivo: alterados ? 'nada mudou desde o ramo remoto, roda tudo' : 'não deu para saber o que mudou, roda tudo' };
  const pesado = alterados.find((f) => !PASTAS_LEVES.some((re) => re.test(f)));
  return pesado
    ? { bateria: GATES, motivo: `'${pesado}' está fora de peça e documento, roda tudo` }
    : { bateria: GATES_CURTOS, motivo: `${alterados.length} arquivo(s) só de peça ou documento, bateria curta` };
}

/* GATES QUE SÓ RODAM QUANDO MUDA O QUE ELES CONFEREM.
 *
 * Medido em 2026-10-16 (plano gates em poucos minutos): depois de a suíte se dividir em rápidos e lentos, a bateria padrão
 * levava 5 minutos, e a guarda do acervo, que gera e mede todas as peças, era sozinha 3,7 deles. Ela confere geometria, e
 * mudança em documento ou em ferramenta que não toca peça, família, núcleo nem a própria guarda não muda o veredito dela. Por
 * isso fica de fora da bateria local quando nada desses caminhos mudou; roda com `--completo`, quando não dá para saber o que
 * mudou, e sempre no CI, que chama o script direto. */
export const GATES_POR_CAMINHO = {
  'guarda:acervo': [/^procedural\//, /^src\//, /^tools\/modelar\/(guardas\/|descrever-peca|resolver-caminho-receita)/, /^package(-lock)?\.json$/],
  /* As duas conferências de família, medidas na mesma rodada em 133 s e 116 s, seguem a mesma regra pelo que importam. */
  'familias:check': [/^procedural\//, /^src\//, /^modulos\//, /^tools\/modelar\/(familia|aprovacao-da-familia|importar-receita|resolver-caminho-receita|montagem-da-familia)/, /^package(-lock)?\.json$/],
};

export function filtrarPorCaminho(bateria, alterados) {
  if (!alterados) return { bateria, pulados: [] };
  const pulados = bateria.filter((g) => GATES_POR_CAMINHO[g] && !alterados.some((f) => GATES_POR_CAMINHO[g].some((re) => re.test(f))));
  return { bateria: bateria.filter((g) => !pulados.includes(g)), pulados };
}

function arquivosAlterados() {
  const git = (args) => spawnSync('git', args, { encoding: 'utf8' });
  const base = git(['rev-parse', '--abbrev-ref', '@{u}']);
  if (base.status !== 0) return null;
  const commitados = git(['diff', '--name-only', `${base.stdout.trim()}...HEAD`]);
  const soltos = git(['status', '--porcelain', '--untracked-files=all']);
  if (commitados.status !== 0 || soltos.status !== 0) return null;
  const lista = [
    ...commitados.stdout.split('\n'),
    ...soltos.stdout.split('\n').map((l) => l.slice(3).split(' -> ').pop()),
  ].map((f) => f.trim().replace(/^"|"$/g, '')).filter(Boolean);
  return [...new Set(lista)];
}

/* OS BARATOS PRIMEIRO, E A BATERIA PARA SE UM DELES FALHAR.
 *
 * Medido em 2026-10-27: o mapa de arquivos desatualizado e um script fora da lista de réguas, conferências de menos de um
 * segundo, apareceram depois de 21 minutos, no fim da bateria, porque o relatório só sai quando o último gate termina e os
 * baratos esperavam na fila atrás dos testes. Cada gate grava a duração da última rodada em `tmp/gates/duracoes-dos-gates.json`;
 * os que levaram menos de `TETO_DO_ESTAGIO_BARATO_MS` rodam primeiro, todos, e se algum falha a bateria para ali, com o relatório
 * deles, sem começar os caros. Os caros rodam do mais longo para o mais curto, que é a ordem que termina primeiro com a máquina
 * cheia, e os que nunca foram medidos vão à frente, porque podem ser longos. Gate que depende de um caro é caro também, senão
 * esperaria um gate que só começa depois dele. */
export const TETO_DO_ESTAGIO_BARATO_MS = 5_000;
export const ARQUIVO_DAS_DURACOES_DOS_GATES = join('tmp', 'gates', 'duracoes-dos-gates.json');

export function separarEstagios(lista, duracoes, teto = TETO_DO_ESTAGIO_BARATO_MS) {
  const barato = (g) => duracoes[g] !== undefined && duracoes[g] < teto && (!DEPENDE_DE[g] || barato(DEPENDE_DE[g]));
  const baratos = lista.filter(barato);
  const caros = lista.filter((g) => !barato(g))
    .map((g, i) => ({ g, i, ms: duracoes[g] ?? Infinity }))
    .sort((a, b) => b.ms - a.ms || a.i - b.i)
    .map(({ g }) => g);
  return { baratos, caros };
}

function lerDuracoesDosGates(raiz = RAIZ) {
  try { return JSON.parse(readFileSync(join(raiz, ARQUIVO_DAS_DURACOES_DOS_GATES), 'utf8')); } catch { return {}; }
}

/* O PESADO FICA PARA O CI.
 *
 * Medido em 2026-10-28: uma linha mudada no núcleo de geometria fez a bateria local rodar quase tudo, 23 minutos nesta máquina
 * de quatro processadores, enquanto o CI roda a lista inteira em oito máquinas em 5 minutos e só deixa a main andar com ela
 * verde. A pessoa decidiu no mesmo dia: a bateria local roda as conferências baratas e os testes rápidos ligados à mudança, e
 * os gates abaixo, quando algo do que leem mudou, ficam para o CI, ditos no relatório. `--com-pesados` e `--completo` os rodam
 * aqui. */
export const PESADOS_PARA_O_CI = ['test:lentos', 'mcp:visual:check', 'bancada:guardas', 'guarda:acervo', 'guarda:referencial', 'familias:check'];

/* Quem lê `dist/` só pode começar depois de quem escreve. */
export const DEPENDE_DE = Object.fromEntries(
  ['bancada:guardas']
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

const ambienteDosGates = {};

/* `sinal` (opcional) cancela o gate: o grupo de processos inteiro recebe SIGTERM e o resultado volta com `cancelado`, sem deixar
   saída guardada. Quem não passa `sinal` (a bateria) tem o comportamento de sempre. */
export function rodarGate(gate, { silencioso, testes = null, sinal = null }) {
  return new Promise((resolver) => {
    const inicio = Date.now();
    /* Os arquivos de teste que o seletor ligou ao que mudou vão por arquivo, porque a lista pode ser longa para o ambiente. */
    const ambienteDoGate = { ...process.env, ...ambienteDosGates };
    if (testes) {
      const lista = join('tmp', 'gates', `relacionados-${gate.split(':')[1]}.json`);
      mkdirSync(dirname(lista), { recursive: true });
      writeFileSync(lista, JSON.stringify(testes));
      ambienteDoGate.GATES_TESTES_RELACIONADOS = lista;
    }
    /* Os testes anotam o que leem (tools/gates/leituras.mjs), fora do CI, que roda tudo. */
    if (gate.startsWith('test:') && !process.env.CI) ambienteDoGate.GATES_LEITURAS_DIR = join(RAIZ, diretorioDasLeituras(gate));
    /* `shell: true` porque no Windows `npm` é um .cmd; sem isso o spawn não
       encontra o executável e todo gate "falha" pelo motivo errado. */
    const processo = spawn('npm', ['run', gate], { stdio: ['ignore', 'pipe', 'pipe'], shell: true, env: ambienteDoGate, detached: Boolean(sinal) && process.platform !== 'win32' });
    let cancelado = false;
    const cancelar = () => {
      cancelado = true;
      try { if (process.platform === 'win32' || !processo.pid) processo.kill('SIGTERM'); else process.kill(-processo.pid, 'SIGTERM'); } catch { /* já terminou */ }
    };
    if (sinal) { if (sinal.aborted) cancelar(); else sinal.addEventListener('abort', cancelar, { once: true }); }
    const pedacos = [];
    processo.stdout.on('data', (d) => pedacos.push(d));
    processo.stderr.on('data', (d) => pedacos.push(d));
    processo.on('close', (status) => {
      sinal?.removeEventListener('abort', cancelar);
      const duracao = Date.now() - inicio;
      if (cancelado) { resolver({ gate, codigo: status ?? 1, duracao, arquivo: null, lentos: null, cancelado: true }); return; }
      const codigo = status ?? 1;
      const saida = Buffer.concat(pedacos).toString();
      const arquivo = guardarSaidaDoGate(gate, saida, codigo);
      const lentos = gate.startsWith('test:') ? lerDuracoesDosTestes(gate, inicio) : null;
      if (!silencioso || codigo !== 0) {
        process.stdout.write(codigo === 0 ? `▶ ${gate} — ok\n` : `${linhaDeFalha(gate, arquivo)}\n`);
        process.stdout.write(saida);
      }
      resolver({ gate, codigo, duracao, arquivo, lentos });
    });
  });
}

async function executar() {
  const pararNoPrimeiro = process.argv.includes('--parar-no-primeiro');
  const silencioso = process.argv.includes('--silencioso');
  const concorrencia = pararNoPrimeiro ? 1 : limiteDeConcorrencia();

  /* Com `--completo`, o `test:lentos` roda todos os lentos, e não só os ligados ao que mudou (tools/testes-lentos.mjs). */
  if (process.argv.includes('--completo')) ambienteDosGates.GATES_COMPLETO = '1';
  const completo = process.argv.includes('--completo');
  const alterados = completo ? null : arquivosAlterados();
  const escolha = completo ? { bateria: GATES, motivo: '--completo' } : escolherBateria(alterados);
  const { bateria: semPulados, pulados } = filtrarPorCaminho(escolha.bateria, alterados);
  const bateria = semPulados;
  const motivo = escolha.motivo + (pulados.length ? `; fora: ${pulados.join(', ')} (nada do que conferem mudou)` : '');
  console.log(`gates — ${motivo}.`);

  /* O SELETOR. Fora do CI e do `--completo`, cada gate roda só se algo do que ele lê mudou desde a última vez que passou, e os
     testes só os ligados ao que mudou (tools/gates/seletor.mjs). A foto é tirada uma vez, aqui, e é ela que fica guardada como
     verde: um arquivo editado durante a bateria aparece como mudado na rodada seguinte. */
  const comSeletor = !completo && !process.env.CI && !process.argv.includes('--sem-seletor');
  /* O `--completo` roda tudo e por isso grava o verde de todos, que é a rodada que deixa o registro de leituras completo. */
  const gravaVerdes = !process.env.CI && !process.argv.includes('--sem-seletor');
  const foto = gravaVerdes ? fotografar('.') : null;
  const verdes = gravaVerdes ? lerVerdes('.') : {};
  const decisoes = new Map();
  if (comSeletor) for (const gate of bateria) decisoes.set(gate, decidir(gate, foto, verdes, gate.startsWith('test:') ? lerLeiturasDoGate('.', gate) : null));
  const guardados = bateria.filter((g) => decisoes.get(g)?.rodar === false);
  if (guardados.length) console.log(`gates — guardados, sem rodar: ${guardados.join(', ')} (nada do que conferem mudou desde a última rodada verde).`);
  for (const gate of ['test:rapidos', 'test:lentos']) {
    const d = decisoes.get(gate);
    if (d?.rodar) console.log(`gates — ${gate}: ${d.motivo}.`);
  }

  const comPesados = completo || Boolean(process.env.CI) || process.argv.includes('--com-pesados');
  const paraOCi = comPesados ? [] : bateria.filter((g) => PESADOS_PARA_O_CI.includes(g) && !guardados.includes(g));
  if (paraOCi.length) console.log(`gates — ficam para o CI, que roda tudo antes de a main andar: ${paraOCi.join(', ')} (--com-pesados os roda aqui).`);

  const porGate = new Map();
  for (const gate of guardados) porGate.set(gate, { gate, codigo: 0, duracao: 0, arquivo: null, lentos: null, guardado: true });
  for (const gate of paraOCi) porGate.set(gate, { gate, codigo: 0, duracao: 0, arquivo: null, lentos: null, paraOCi: true });
  const duracoesDosGates = lerDuracoesDosGates();
  const estagios = separarEstagios(bateria.filter((g) => !guardados.includes(g) && !paraOCi.includes(g)), duracoesDosGates);
  let fila = [];
  const ocupados = new Set();
  let pesoEmUso = 0;
  let abortado = false;
  const pesoDe = (gate) => PESO_DO_GATE[gate] ?? 1;

  /* Tira da fila o primeiro gate liberado: recursos livres e dependência já
     terminada. Devolver `null` com a fila cheia quer dizer que só sobrou gate
     bloqueado, e aí este trabalhador espera quem está à frente terminar. */
  function proximoLiberado() {
    const posicao = fila.findIndex((gate) => {
      const anterior = DEPENDE_DE[gate];
      if (anterior && !porGate.has(anterior)) return false;
      if (pesoEmUso > 0 && pesoEmUso + pesoDe(gate) > ORCAMENTO_DA_MAQUINA) return false;
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
      pesoEmUso += pesoDe(gate);
      try {
        const resultado = await rodarGate(gate, { silencioso, testes: decisoes.get(gate)?.testes ?? null });
        porGate.set(gate, resultado);
        duracoesDosGates[gate] = resultado.duracao;
        if (gravaVerdes && resultado.codigo === 0 && rodouInteiro(gate, decisoes.get(gate)?.testes ?? null, completo)) {
          const r = registroVerde(gate, foto, { testes: decisoes.get(gate)?.testes ?? null, anterior: verdes[gate] });
          if (r) verdes[gate] = r;
        }
        if (resultado.codigo !== 0 && pararNoPrimeiro) abortado = true;
      } finally {
        pesoEmUso -= pesoDe(gate);
        for (const recurso of recursos) ocupados.delete(recurso);
      }
    }
  }

  const relogio = Date.now();
  const rodarEstagio = async (lista) => { fila = [...lista]; await Promise.all(Array.from({ length: concorrencia }, trabalhador)); };
  await rodarEstagio(estagios.baratos);
  const baratoFalhou = estagios.baratos.some((g) => porGate.get(g)?.codigo);
  if (baratoFalhou) console.log(`\ngates — um gate barato falhou; os caros (${estagios.caros.join(', ')}) não começaram.`);
  else await rodarEstagio(estagios.caros);
  const decorrido = Date.now() - relogio;
  if (gravaVerdes) gravarVerdes('.', verdes);
  mkdirSync(join(RAIZ, DIRETORIO_DAS_SAIDAS), { recursive: true });
  writeFileSync(join(RAIZ, ARQUIVO_DAS_DURACOES_DOS_GATES), JSON.stringify(duracoesDosGates));

  /* A ORDEM DO RELATÓRIO É A DA LISTA, e não a de quem terminou primeiro: a
     lista é a mesma do `ci.yml`, e comparar as duas a olho exige que sejam
     legíveis na mesma sequência. */
  const resultados = bateria.filter((gate) => porGate.has(gate)).map((gate) => porGate.get(gate));

  const falhos = resultados.filter((r) => r.codigo !== 0);
  const total = resultados.reduce((soma, r) => soma + r.duracao, 0);

  console.log(`\n${'─'.repeat(52)}`);
  for (const { gate, codigo, duracao, arquivo, guardado } of resultados) {
    if (guardado) { console.log(`= ${gate.padEnd(24)}  guardado`); continue; }
    if (porGate.get(gate).paraOCi) { console.log(`→ ${gate.padEnd(24)}  fica para o CI`); continue; }
    const marca = codigo === 0 ? '✓' : '✗';
    console.log(`${marca} ${gate.padEnd(24)} ${String(Math.round(duracao / 100) / 10).padStart(6)}s${arquivo ? `  saída: ${arquivo}` : ''}`);
  }
  const duracoes = ['test:rapidos', 'test:lentos'].flatMap((g) => porGate.get(g)?.lentos ?? []);
  if (duracoes.length) {
    console.log('─'.repeat(52));
    console.log('arquivos de teste mais lentos:');
    for (const linha of arquivosMaisLentos(duracoes)) console.log(linha);
  }
  const naoRodados = bateria.length - resultados.length;
  console.log('─'.repeat(52));
  console.log(
    `${resultados.length - falhos.length - paraOCi.length}/${bateria.length} gates verdes${bateria.length === GATES.length ? '' : ` (de ${GATES.length})`}${paraOCi.length ? `, ${paraOCi.length} para o CI` : ''} em ${Math.round(decorrido / 1000)}s`
    + (concorrencia > 1 ? ` (${Math.round(total / 1000)}s somados, ${concorrencia} de cada vez)` : '')
    + (falhos.length ? ` — falharam: ${falhos.map((r) => r.gate).join(', ')}` : '')
    + (naoRodados ? ` — ${naoRodados} não rodaram (${baratoFalhou ? 'um gate barato falhou' : '--parar-no-primeiro'})` : ''),
  );

  process.exitCode = falhos.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await executar();
