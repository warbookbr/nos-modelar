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

export const ARQUIVO_DOS_VERDES = join('tmp', 'gates', 'verdes.json');

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
  porteiro: CODIGO,
  'bancada:vazia:check': CODIGO,
  'guarda:portas': CODIGO,
  'guarda:camera': CODIGO,
  'guarda:par': CODIGO,
  'guarda:referencia': CODIGO,
  'guarda:escolha': CODIGO,
  'guarda:junta': CODIGO,
  'guarda:edicao': CODIGO,
  'guarda:gesto': CODIGO,
  'exportar:check': CODIGO,
  'arquitetura:motor:check': CODIGO,
};

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

export function impressaoDoGate(gate, foto) {
  const padroes = LE_O_GATE[gate];
  const linhas = Object.keys(foto).filter((c) => padroes.some((re) => re.test(c))).sort().map((c) => `${c} ${foto[c]}`);
  return createHash('sha256').update(linhas.join('\n')).digest('hex');
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
export function decidir(gate, foto, verdes) {
  const verde = verdes[gate];
  if (gate === 'test:rapidos' || gate === 'test:lentos') {
    if (!verde?.foto) return { rodar: true, motivo: 'sem rodada verde guardada, roda o modo inteiro', testes: null };
    const mudados = mudadosEntre(verde.foto, foto);
    if (!mudados.length) return { rodar: false, motivo: 'nada mudou desde a última rodada verde' };
    const foraDoGrafo = mudados.filter((c) => !visivelNoGrafo(c));
    if (foraDoGrafo.length) return { rodar: true, motivo: `'${foraDoGrafo[0]}' mudou e o grafo de imports não o acompanha, roda o modo inteiro`, testes: null };
    return { rodar: true, motivo: `${mudados.length} arquivo(s) de código mudaram, rodam os testes ligados a eles`, testes: mudados.filter((c) => foto[c]) };
  }
  if (!LE_O_GATE[gate]) return { rodar: true, motivo: 'não declara o que lê' };
  if (verde?.impressao && verde.impressao === impressaoDoGate(gate, foto)) return { rodar: false, motivo: 'nada do que ele lê mudou desde a última rodada verde' };
  return { rodar: true, motivo: verde ? 'algo do que ele lê mudou' : 'sem rodada verde guardada' };
}

/* O registro da rodada verde: a foto inteira nos gates de teste, que precisam saber QUAIS arquivos mudaram, e a impressão nos
   outros, que só precisam saber SE mudou. */
export function registroVerde(gate, foto) {
  if (gate === 'test:rapidos' || gate === 'test:lentos') return { foto, quando: new Date().toISOString() };
  if (LE_O_GATE[gate]) return { impressao: impressaoDoGate(gate, foto), quando: new Date().toISOString() };
  return null;
}
