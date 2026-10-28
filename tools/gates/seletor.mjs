/* seletor.mjs — decide o que cada gate precisa rodar, comparando o repositório de agora com o da última vez que o gate passou.
 *
 * Medido em 2026-10-27: a bateria comparava com o ramo remoto, e "mudado" queria dizer "diferente do último envio". Depois de
 * corrigir um gate, a rodada seguinte via como mudado tudo o que não tinha sido enviado e rodava tudo de novo, e uma mudança
 * larga fazia a bateria padrão rodar quase todos os testes lentos, do tamanho da completa. Aqui "mudado" é diferente da última
 * rodada VERDE daquele gate: a foto do repositório (o blob de cada arquivo) é guardada quando o gate passa, e a rodada seguinte
 * só olha o que mudou desde então.
 *
 * Os testes rodam pelo grafo de imports (`vitest related`), quando tudo o que mudou é código que o grafo enxerga. O que ele não
 * enxerga (receita carregada pelo caminho, JSON, documento, configuração, fixtura, HTML) faz o modo inteiro rodar, porque um
 * teste pode ler esse arquivo sem importá-lo. Os outros gates declaram em LE_O_GATE o que leem; o que não declara roda sempre.
 * Nada aqui vale no CI nem com `--completo`, que rodam tudo. */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { lerLeituras, testesQueLeem } from './leituras.mjs';

export const ARQUIVO_DOS_VERDES = join('tmp', 'gates', 'verdes.json');
export const diretorioDasLeituras = (gate) => join('tmp', 'gates', `leituras-${gate.split(':')[1]}`);

/* Arquivos de dados que os testes leem pelo `fs` do node, e que o registro de leituras (tools/gates/leituras.mjs) enxerga. Os
   demais fora do grafo (receita carregada por import dinâmico, script de Blender, HTML servido) fazem o modo inteiro rodar. */
export const DADOS_LIDOS_PELO_FS = /\.(md|json|jsonl|txt|csv|svg|png|jpe?g|webp|ya?ml)$/;

/* Código cujo efeito o grafo de imports do vitest acompanha. Fica fora o que é carregado por caminho em tempo de execução: as
   receitas, famílias e fixturas, que as ferramentas importam pelo nome da peça. */
export function visivelNoGrafo(caminho) {
  if (!/\.(m?js|ts)$/.test(caminho)) return false;
  if (/^procedural\/(pecas|familias)\//.test(caminho)) return false;
  if (/(^|\/)fixtures?\//.test(caminho)) return false;
  if (/(^|\/)(vitest|vite)\.config\./.test(caminho)) return false;
  return /^(src|modulos|tools|procedural)\//.test(caminho);
}

/* O que cada gate lê, além de si mesmo. O gate que não está aqui roda sempre; um padrão largo demais só faz ele rodar mais. */
const CODIGO = [/^src\//, /^procedural\//, /^modulos\//, /^tools\//, /^package(-lock)?\.json$/, /\.html$/, /^public\//, /^vite\.config\.js$/];
export const LE_O_GATE = {
  'guarda:acervo': [/^procedural\//, /^src\//, /^modulos\//, /^tools\/mecanifica\//, /^package(-lock)?\.json$/],
  'familias:check': [/^procedural\//, /^src\//, /^modulos\//, /^tools\/mecanifica\//, /^package(-lock)?\.json$/],
  'guarda:referencial': [/^procedural\//, /^src\//, /^modulos\//, /^tools\/mecanifica\//, /^package(-lock)?\.json$/],
  'mcp:visual:check': CODIGO,
  build: CODIGO,
  typecheck: [...CODIGO, /^tsconfig\.json$/, /\.d\.ts$/],
  'bancada:guardas': CODIGO,
  'exportar:check': CODIGO,
  'arquitetura:motor:check': CODIGO,
  'calibracao:check': [],
};

/* Os gates que rodam um programa sobre o código declaram as ENTRADAS dele, e leem o fecho dos imports estáticos delas, mais o que
   carregam pelo caminho (TAMBEM). Medido em 2026-10-28: com o padrão largo de código, uma mudança em `tools/testes-lentos.mjs`
   rodava as dez guardas da bancada (142 s) e a prova visual do MCP (64 s), que não importam esse arquivo. Import com caminho
   calculado não entra no fecho; o que um gate carrega assim vai no TAMBEM. */
const DO_NAVEGADOR = [/\.html$/, /^public\//, /^vite\.config\.js$/, /^package(-lock)?\.json$/, /^procedural\/(pecas|familias)\//, /(^|\/)fixtures?\//];
export const ENTRADAS_DO_GATE = {
  'bancada:guardas': {
    entradas: ['src/bancada/entrada.js', 'tools/mecanifica/guardas/rodar-guardas.mjs', 'tools/bancadas/porteiro.mjs',
      ...['bancada-vazia', 'portas-bancada', 'camera-livre', 'inspecao-par', 'referencia-da-peca', 'escolha-da-peca', 'junta-da-bancada',
        'gesto', 'edicao-de-malha'].map((g) => `tools/mecanifica/guardas/guarda-${g}.mjs`)],
    tambem: [...DO_NAVEGADOR, /^tools\/bancadas\//],
  },
  /* Medido com o registro de leituras em 2026-10-28: o código dele, as imagens e fontes da calibração, o esboço da rodada do
     guarda-roupa, o agente crítico e as famílias que as fontes chamam. */
  'calibracao:check': {
    entradas: ['tools/mecanifica/calibracao-do-critico.mjs'],
    tambem: [/^docs\/mecanifica\/banco-de-provas\/(calibracao-do-critico|rodada-2026-10-08)\//, /^\.claude\/agents\//, /^procedural\/(pecas|familias)\//,
      /(^|\/)fixtures?\//, /^package(-lock)?\.json$/, /^\.npmrc$/],
  },
  'mcp:visual:check': {
    entradas: ['src/bancada/entrada.js', 'tools/mcp/mcp.test.mjs', 'tools/mcp/procedural.test.mjs', 'tools/mcp/perfis/autoria-execucao.test.mjs',
      'tools/mcp/perfis/parametros.test.mjs'],
    tambem: [...DO_NAVEGADOR, /^tools\/mcp\//],
  },
};

const IMPORTS = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

export function fechoDosImports(raiz, entradas, foto) {
  const vistos = new Set();
  const pilha = entradas.filter((e) => foto[e]);
  const resolver = (de, alvo) => {
    if (!alvo.startsWith('.') && !alvo.startsWith('/')) return null;
    const base = alvo.startsWith('/') ? alvo.slice(1) : join(dirname(de), alvo).split('\\').join('/');
    for (const c of [base, `${base}.js`, `${base}.mjs`, `${base}.ts`, `${base}/index.js`, `${base}/index.mjs`]) if (foto[c]) return c;
    return null;
  };
  while (pilha.length) {
    const arquivo = pilha.pop();
    if (vistos.has(arquivo)) continue;
    vistos.add(arquivo);
    if (!/\.(m?js|ts)$/.test(arquivo)) continue;
    let texto = '';
    try { texto = readFileSync(join(raiz, arquivo), 'utf8'); } catch { continue; }
    for (const m of texto.matchAll(IMPORTS)) {
      const alvo = resolver(arquivo, m[1] ?? m[2] ?? m[3] ?? m[4]);
      if (alvo && !vistos.has(alvo)) pilha.push(alvo);
    }
  }
  return vistos;
}

const git = (raiz, args, input) => spawnSync('git', args, { cwd: raiz, encoding: 'utf8', input, maxBuffer: 1 << 28 });

/* A foto: o blob de cada arquivo rastreado ou solto, com o que está no disco agora (modificado, novo ou apagado). */
export function fotografar(raiz) {
  const foto = {};
  for (const l of git(raiz, ['ls-files', '-s', '-z']).stdout.split('\0')) {
    if (!l) continue;
    const [meta, caminho] = l.split('\t');
    foto[caminho] = meta.split(' ')[1];
  }
  const sujos = [];
  for (const l of git(raiz, ['status', '--porcelain', '-z', '--untracked-files=all']).stdout.split('\0')) {
    if (l.length < 4) continue;
    const caminho = l.slice(3);
    if (existsSync(join(raiz, caminho))) sujos.push(caminho); else delete foto[caminho];
  }
  if (sujos.length) {
    const ids = git(raiz, ['hash-object', '--stdin-paths'], `${sujos.join('\n')}\n`).stdout.trim().split('\n');
    sujos.forEach((c, i) => { foto[c] = ids[i]; });
  }
  return foto;
}

export function mudadosEntre(antes, agora) {
  const caminhos = new Set([...Object.keys(antes), ...Object.keys(agora)]);
  return [...caminhos].filter((c) => antes[c] !== agora[c]).sort();
}

export function impressaoDoGate(gate, foto, raiz = '.') {
  const declarado = ENTRADAS_DO_GATE[gate];
  /* O que o gate carrega pelo caminho (as receitas que a bancada acha por `import.meta.glob`) também importa código: o fecho
     parte das entradas e desses arquivos. */
  const fecho = declarado ? fechoDosImports(raiz, [...declarado.entradas, ...Object.keys(foto).filter((c) => declarado.tambem.some((re) => re.test(c)))], foto) : null;
  const padroes = declarado ? declarado.tambem : LE_O_GATE[gate];
  const linhas = Object.keys(foto).filter((c) => fecho?.has(c) || padroes.some((re) => re.test(c))).sort().map((c) => `${c} ${foto[c]}`);
  return createHash('sha256').update(linhas.join('\n')).digest('hex');
}

export function lerLeiturasDoGate(raiz, gate) {
  return lerLeituras(join(raiz, diretorioDasLeituras(gate)));
}

export function lerVerdes(raiz) {
  try { return JSON.parse(readFileSync(join(raiz, ARQUIVO_DOS_VERDES), 'utf8')); } catch { return {}; }
}

export function gravarVerdes(raiz, verdes) {
  const caminho = join(raiz, ARQUIVO_DOS_VERDES);
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, JSON.stringify(verdes));
}

/* O que o gate precisa fazer agora: { rodar: false, motivo } quando nada do que ele lê mudou desde a última vez verde, ou
   { rodar: true, motivo, testes? } com, nos gates de teste, a lista de arquivos para o `vitest related` (null = o modo inteiro). */
export function decidir(gate, foto, verdes, leituras = null, raiz = '.') {
  const d = decidirSemNota(gate, foto, verdes, leituras, raiz);
  /* O "modo inteiro" do test:lentos fora do --completo são os ligados ao que mudou desde o ramo remoto (ver rodouInteiro). */
  if (gate === 'test:lentos' && d.rodar && d.testes === null) return { ...d, motivo: d.motivo.replace('roda o modo inteiro', 'roda os ligados ao que mudou desde o ramo remoto, sem gravar verde (o --completo e o CI rodam todos)') };
  return d;
}

function decidirSemNota(gate, foto, verdes, leituras, raiz) {
  const verde = verdes[gate];
  if (gate === 'test:rapidos' || gate === 'test:lentos') {
    if (!verde?.foto) return { rodar: true, motivo: 'sem rodada verde guardada, roda o modo inteiro', testes: null };
    const mudados = mudadosEntre(verde.foto, foto);
    if (!mudados.length) return { rodar: false, motivo: 'nada mudou desde a última rodada verde' };
    const codigo = mudados.filter(visivelNoGrafo);
    /* Um módulo apagado não tem mais teste ligado a ele no grafo, e o teste que o importava quebraria sem rodar. */
    const apagado = codigo.find((c) => !foto[c]);
    if (apagado) return { rodar: true, motivo: `'${apagado}' foi apagado e o grafo de imports não diz mais quem o usava, roda o modo inteiro`, testes: null };
    const foraDoGrafo = mudados.filter((c) => !visivelNoGrafo(c));
    if (!foraDoGrafo.length) return { rodar: true, motivo: `${mudados.length} arquivo(s) de código mudaram, rodam os testes ligados a eles`, testes: codigo };
    const naoDado = foraDoGrafo.find((c) => !DADOS_LIDOS_PELO_FS.test(c));
    if (naoDado) return { rodar: true, motivo: `'${naoDado}' mudou e nem o grafo de imports nem o registro de leituras o acompanham, roda o modo inteiro`, testes: null };
    if (!verde.leiturasCompletas || !leituras) return { rodar: true, motivo: `'${foraDoGrafo[0]}' mudou e ainda não há registro de leituras de todos os testes, roda o modo inteiro`, testes: null };
    const estruturais = foraDoGrafo.filter((c) => !verde.foto[c] || !foto[c]);
    const queLeem = testesQueLeem(leituras, foraDoGrafo, estruturais).filter((t) => foto[t]);
    const testes = [...new Set([...codigo, ...queLeem])];
    if (!testes.length) return { rodar: false, motivo: `nenhum teste lê os ${foraDoGrafo.length} arquivo(s) de dados mudados` };
    return { rodar: true, motivo: `${codigo.length} arquivo(s) de código mudaram e ${queLeem.length} teste(s) leem os ${foraDoGrafo.length} arquivo(s) de dados mudados`, testes };
  }
  if (!LE_O_GATE[gate]) return { rodar: true, motivo: 'não declara o que lê' };
  if (verde?.impressao && verde.impressao === impressaoDoGate(gate, foto, raiz)) return { rodar: false, motivo: 'nada do que ele lê mudou desde a última rodada verde' };
  return { rodar: true, motivo: verde ? 'algo do que ele lê mudou' : 'sem rodada verde guardada' };
}

/* Se a rodada verde cobriu o que o registro diz. Sem lista do seletor, o `test:lentos` fora do `--completo` roda só os ligados ao
   que mudou desde o ramo remoto (tools/testes-lentos.mjs), e não o modo inteiro: medido em 2026-10-28, rodou zero arquivos e o
   verde foi guardado como se todos tivessem passado. Essa rodada não grava verde. */
export function rodouInteiro(gate, testes, completo) {
  return gate !== 'test:lentos' || testes !== null || completo;
}

/* O registro da rodada verde: a foto inteira nos gates de teste, que precisam saber QUAIS arquivos mudaram, e a impressão nos
   outros, que só precisam saber SE mudou. */
export function registroVerde(gate, foto, { testes = null, anterior = null, raiz = '.' } = {}) {
  /* O registro de leituras fica completo depois de uma rodada do modo inteiro com a anotação ligada, e continua completo
     nas rodadas parciais, que só renovam o registro dos testes que rodaram. */
  if (gate === 'test:rapidos' || gate === 'test:lentos') return { foto, leiturasCompletas: testes === null || Boolean(anterior?.leiturasCompletas), quando: new Date().toISOString() };
  if (LE_O_GATE[gate]) return { impressao: impressaoDoGate(gate, foto, raiz), quando: new Date().toISOString() };
  return null;
}
