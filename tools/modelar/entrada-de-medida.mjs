/* entrada-de-medida.mjs — o resolvedor de entrada das ferramentas de medida: o que o `vao:partes` já lia (esboço 2.0, receita ou
 * montagem persistida) numa função só, para `ondulacao`, `malha:lascas`, `vistas:superficie`, `exportar:obj` e `raio:aresta`.
 *
 * O rascunho de um objeto é um esboço 2.0 (`*.esboco.mjs` ou `.esboco.json`), e a receita do acervo é outra coisa; uma ferramenta que
 * só lia receita obrigava a escrever um arquivo de conversão. Aqui o arquivo é achado como o `resolverCaminhoReceita` acha (caminho,
 * nome curto, pasta da peça) e classificado pelo conteúdo:
 *   - receita: o módulo traz PASSOS ou CHAMADAS_COMPOSICOES; sai a própria receita;
 *   - esboço: JSON, ou módulo sem PASSOS (o `default` ou o `ESBOCO`); a opção `opcao` (de 1) é montada pelo núcleo e sai a receita
 *     em metro dela, com o neutro já executado, de modo que a ferramenta não monta a chapa duas vezes;
 *   - montagem persistida (`mecanifica.montagem`): saem as receitas das peças que ela cita, uma por referência.
 * O resultado da montagem (esboço ou receita) fica em `tmp/cache-de-medida/`, com chave pela assinatura do conteúdo que a define (ver
 * `assinaturaDaEntrada`), e a ferramenta que passa `cache: false` (`--sem-cache`) monta de novo; `doCache` diz se a montagem veio dele.
 * `executar()` devolve o `{ entrada, neutro }` da receita, executando uma vez só. Nada é escrito e nenhuma receita é alterada. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deserialize, serialize } from 'node:v8';
import { entradaDaReceita, executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PASTA_DO_CACHE = join(RAIZ, 'tmp', 'cache-de-medida');
/* `v8.serialize` troca de formato com a versão do motor, e o cache velho de outra versão não deve ser lido */
const VERSAO_DO_CACHE = `1|${process.version}`;
const CODIGO = /\.(mjs|js|cjs|ts|json)$/;
const ESPECIFICADOR = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"\n]+)\1/g;

function arquivosDe(pasta, { recursivo, filtro }) {
  const saida = [];
  let itens = [];
  try { itens = readdirSync(pasta, { withFileTypes: true }); } catch { return saida; }
  for (const d of itens.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const abs = join(pasta, d.name);
    if (d.isDirectory()) { if (recursivo && d.name !== 'node_modules') saida.push(...arquivosDe(abs, { recursivo, filtro })); } else if (filtro(d.name)) saida.push(abs);
  }
  return saida;
}

function resolverImportacao(de, especificador) {
  const base = resolve(dirname(de), especificador);
  for (const c of [base, `${base}.js`, `${base}.mjs`, `${base}.ts`, join(base, 'index.js'), join(base, 'index.mjs')]) {
    try { if (statSync(c).isFile()) return c; } catch { /* tenta o próximo */ }
  }
  return null;
}

/**
 * A assinatura do que define uma montagem: o conteúdo (sha256) do arquivo da entrada e de tudo o que ele importa, transitivamente, dentro do
 * repositório; do núcleo inteiro (`procedural/nucleo/`, sem os testes) e do que o resolvedor, o montador de esboço e o executor de receita importam;
 * dos arquivos de dados (json, csv, txt) da pasta da entrada, que o módulo pode ler sem importar; mais a versão do cache e do Node.
 * Importação com expressão no lugar do texto não é seguida, e o arquivo lido por `readFileSync` fora da pasta da entrada também não:
 * quem usa isso desliga o cache com `--sem-cache`.
 * @returns {{ chave: string, arquivos: number }}
 */
const RAIZES_DA_MONTAGEM = ['tools/modelar/entrada-de-medida.mjs', 'tools/modelar/esboco-nucleo.mjs', 'tools/modelar/importar-receita.mjs', 'src/autoria/executar-receita.js'];

export function assinaturaDaEntrada(abs, extras = RAIZES_DA_MONTAGEM) {
  const vistos = new Set();
  const pilha = [abs, ...extras.map((e) => resolve(RAIZ, e))];
  for (const f of arquivosDe(join(RAIZ, 'procedural/nucleo'), { recursivo: true, filtro: (n) => CODIGO.test(n) && !/\.test\.[a-z]+$/.test(n) })) pilha.push(f);
  while (pilha.length) {
    const f = pilha.pop();
    if (vistos.has(f) || !existsSync(f)) continue;
    vistos.add(f);
    if (!/\.(mjs|js|cjs|ts)$/.test(f) || !f.startsWith(RAIZ)) continue;
    const texto = readFileSync(f, 'utf8');
    for (const m of texto.matchAll(ESPECIFICADOR)) { const r = resolverImportacao(f, m[2]); if (r?.startsWith(RAIZ)) pilha.push(r); }
  }
  for (const f of arquivosDe(dirname(abs), { recursivo: false, filtro: (n) => !CODIGO.test(n) && /\.(csv|txt|tsv|obj)$/.test(n) })) vistos.add(f);
  const h = createHash('sha256').update(VERSAO_DO_CACHE);
  for (const f of [...vistos].sort()) h.update(`\n${relative(RAIZ, f)}\n`).update(readFileSync(f));
  return { chave: h.digest('hex').slice(0, 32), arquivos: vistos.size };
}

function lerDoCache(pasta, chave, rotulo) {
  try { const v = deserialize(readFileSync(join(pasta, `${rotulo}-${chave}.v8`))); return v?.versao === VERSAO_DO_CACHE ? v.dado : null; } catch { return null; }
}
function gravarNoCache(pasta, chave, rotulo, dado) {
  try {
    mkdirSync(pasta, { recursive: true });
    const destino = join(pasta, `${rotulo}-${chave}.v8`);
    const parcial = `${destino}.${process.pid}.parcial`;
    writeFileSync(parcial, serialize({ versao: VERSAO_DO_CACHE, dado }));
    renameSync(parcial, destino);
    /* uma entrada guarda só a montagem da última versão do arquivo dela: as de outra chave saem */
    for (const f of readdirSync(pasta)) if (f.startsWith(`${rotulo}-`) && f !== `${rotulo}-${chave}.v8` && f.endsWith('.v8')) { try { unlinkSync(join(pasta, f)); } catch { /* outra rodada pode tê-lo apagado */ } }
  } catch { /* o cache é conveniência: sem disco, a medida continua sem ele */ }
}
const rotuloDe = (abs, opcao) => `${basename(abs).replace(/[^A-Za-z0-9._-]/g, '_')}.${createHash('sha256').update(abs).digest('hex').slice(0, 6)}.o${opcao}`;

export class ErroDeEntrada extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDeEntrada'; }
}

const temPassos = (r) => r && typeof r === 'object' && (Array.isArray(r.PASSOS) || Array.isArray(r.CHAMADAS_COMPOSICOES));

/**
 * lerEntradaDeMedida(alvo, { opcao = 1, montagem = true }) -> uma de
 *   { tipo: 'receita', abs, nome, origem, receita, executar }
 *   { tipo: 'esboco', abs, nome, origem, receita, opcao, titulo, opcoes, painel, executar }
 *   { tipo: 'montagem', abs, nome, origem, dado, partes: [{ nome, receita }] }
 * `painel` é o painel de `montarOpcoes` (contatos e apoios declarados incluídos). Com `montagem: false` a montagem é recusada com o
 * motivo, para a ferramenta que só faz sentido sobre uma peça.
 */
export async function lerEntradaDeMedida(alvo, { opcao = 1, montagem = true, cache = true, pastaDoCache = PASTA_DO_CACHE } = {}) {
  /* o arquivo como foi dado (qualquer pasta, como o `vao:partes` sempre leu), e só então o nome curto da receita */
  let abs = resolve(alvo);
  if (!existsSync(abs) || statSync(abs).isDirectory()) {
    try { abs = resolverCaminhoReceita(alvo); } catch { throw new ErroDeEntrada(`${alvo} não existe, nem como esboço nem como receita`); }
  }
  const nome = basename(abs);
  let modulo = null; let json = null;
  const ehModulo = /\.(mjs|js)$/.test(abs);
  if (!ehModulo) json = JSON.parse(readFileSync(abs, 'utf8'));
  /* o módulo de um esboço custa a maior parte da montagem (o sedã leva cerca de 37 s só para importá-lo), de modo que a montagem guardada
     vale antes de importar; a receita e a montagem persistida não passam por aqui e importam como sempre */
  const sig = cache && json?.formato !== 'mecanifica.montagem' ? assinaturaDaEntrada(abs) : null;
  const guardado = sig ? lerDoCache(pastaDoCache, sig.chave, rotuloDe(abs, opcao)) : null;
  if (guardado) return esbocoDaEntrada({ abs, nome, opcao, guardado, doCache: true });
  if (ehModulo) modulo = await importarReceita(abs);
  if (json?.formato === 'mecanifica.montagem') {
    if (!montagem) throw new ErroDeEntrada(`${alvo} é uma montagem; esta ferramenta lê uma receita ou um esboço (rode-a sobre a peça)`);
    const { lerMontagemPersistida } = await import('../../src/autoria/ler-montagem-persistida.js');
    const { receitasDaMontagem } = await import('./etapas-da-montagem.mjs');
    let receitas;
    try { receitas = await receitasDaMontagem(lerMontagemPersistida(json)); } catch (e) { throw new ErroDeEntrada(`a montagem não resolve: ${e.message}`); }
    return { tipo: 'montagem', abs, nome, origem: `montagem ${nome}`, dado: json, partes: Object.entries(receitas).map(([ref, receita]) => ({ nome: ref, receita })) };
  }
  const doModulo = modulo ? receitaDoModulo(modulo) : null;
  const receita = modulo ? (temPassos(doModulo) ? doModulo : Object.values(modulo).find(temPassos) ?? null) : null;
  if (receita) {
    let executada = null;
    const lida = { tipo: 'receita', abs, nome, origem: `receita ${nome}`, doCache: false, receita, executar: () => {
      if (executada) return executada;
      const guardada = sig ? lerDoCache(pastaDoCache, sig.chave, rotuloDe(abs, 'r')) : null;
      if (guardada) { lida.doCache = true; return (executada = guardada); }
      executada = executarReceita(receita);
      if (sig) gravarNoCache(pastaDoCache, sig.chave, rotuloDe(abs, 'r'), executada);
      return executada;
    } };
    return lida;
  }
  const esboco = modulo ? (modulo.default ?? modulo.ESBOCO) : json;
  if (!esboco || typeof esboco !== 'object') throw new ErroDeEntrada(`${alvo} não exporta o esboço como default nem é uma receita`);
  /* a montagem do esboço é o que custa (de 50 a 80 s no sedã), e cada medida a pagava de novo: ela é guardada por assinatura do conteúdo */
  const { montarOpcoes } = await import('./esboco-nucleo.mjs');
  let montado;
  try { montado = montarOpcoes(esboco, { nome: nome.replace(/\.[^.]+$/, ''), relato: false }); } catch (e) { throw new ErroDeEntrada(`o esboço ${nome} não monta: ${e.message}`); }
  if (montado.recusas?.length) throw new ErroDeEntrada(`o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r.motivo ?? r}`).join('\n')}`);
  const painel = montado.paineis[opcao - 1];
  if (!painel) throw new ErroDeEntrada(`o esboço tem ${montado.paineis.length} opções e veio --opcao=${opcao}`);
  const guardar = { opcoes: montado.paineis.length, painel };
  if (sig) gravarNoCache(pastaDoCache, sig.chave, rotuloDe(abs, opcao), guardar);
  return esbocoDaEntrada({ abs, nome, opcao, guardado: guardar, doCache: false });
}

function esbocoDaEntrada({ abs, nome, opcao, guardado, doCache }) {
  const { painel, opcoes } = guardado;
  /* a receita do esboço não traz PARAMS quando a opção não os declara, e as ferramentas leem `receita.PARAMS` sem conferir */
  const receitaDoEsboco = { ...painel.receita, PARAMS: painel.receita.PARAMS ?? {} };
  const executada = { entrada: entradaDaReceita(receitaDoEsboco), neutro: painel.neutro, expansao: null };
  return {
    tipo: 'esboco', abs, nome, origem: `esboço ${nome}, opção ${opcao}`, doCache, receita: receitaDoEsboco, opcao, titulo: painel.titulo, opcoes, painel,
    executar: () => executada,
  };
}

/** A linha que diz, na saída de erro, que a montagem veio do cache (a saída em JSON não muda de uma rodada para outra); vazia quando não veio. */
export function avisoDeCache(lida, ferramenta) {
  return lida?.doCache ? `${ferramenta}: montagem lida do cache (tmp/cache-de-medida/); --sem-cache monta de novo\n` : '';
}

/** A opção escolhida na linha de comando (`--opcao=<n>`), de 1, ou 1 quando não veio. */
export function opcaoDaLinha(texto) {
  if (texto === null || texto === undefined) return 1;
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 1) throw new ErroDeEntrada(`--opcao espera um inteiro a partir de 1, e veio '${texto}'`);
  return n;
}
