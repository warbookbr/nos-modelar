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
 * `executar()` devolve o `{ entrada, neutro }` da receita, executando uma vez só. Nada é escrito e nenhuma receita é alterada.
 *
 * O CACHE POR PASSO NAS MEDIDAS (plano das ferramentas das rodadas, fatia 2). `executarComCachePorPasso` executa a receita com a memória
 * por prefixo de `tmp/cache-por-prefixo/` (a mesma do `descrever` e da bancada, sem mudar o que ela guarda nem a chave dela): a medida
 * recomeça do estado que o comando anterior guardou para o mesmo prefixo de passos. `lerParams` e `receitaComParams` dão a variante de
 * parâmetros (`--params`), que entra na chave pelo que a chave já encadeia (o dicionário da receita, os aliases e o conteúdo de cada
 * passo), e recusam a receita que lê a tabela dos parâmetros direto, fora de `this.PARAMS`. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deserialize, serialize } from 'node:v8';
import { entradaDaReceita, executarReceita } from '../../src/autoria/executar-receita.js';
import { pularNaoCodigo } from './conferir-pontos.mjs';
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
 * dos arquivos de dados (json, csv, txt) da pasta da entrada, que o módulo pode ler sem importar; do valor de cada variável de ambiente que a entrada
 * e o que ela importa dentro do repositório leem (`process.env.X`, ou `process.env['X']`; a variável não definida também entra), porque o esboço
 * que muda de forma por variável monta outra coisa com ela; mais a versão do cache e do Node.
 * Importação com expressão no lugar do texto não é seguida, e o arquivo lido por `readFileSync` fora da pasta da entrada também não:
 * quem usa isso desliga o cache com `--sem-cache`.
 * @returns {{ chave: string, arquivos: number }}
 */
const RAIZES_DA_MONTAGEM = ['tools/modelar/entrada-de-medida.mjs', 'tools/modelar/esboco-nucleo.mjs', 'tools/modelar/importar-receita.mjs', 'src/autoria/executar-receita.js'];

/* as variáveis de ambiente que o texto lê: `process.env.X` e `process.env['X']` */
const VARIAVEL_DE_AMBIENTE = /\bprocess\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*(['"])([A-Za-z_][A-Za-z0-9_]*)\2\s*\])/g;
export function variaveisDeAmbienteDoTexto(texto) {
  const nomes = new Set();
  for (const m of texto.matchAll(VARIAVEL_DE_AMBIENTE)) nomes.add(m[1] ?? m[3]);
  return nomes;
}

export function assinaturaDaEntrada(abs, extras = RAIZES_DA_MONTAGEM, ambiente = process.env) {
  const vistos = new Set();
  const doEsboco = new Set();
  const seguir = (inicio, conjunto) => {
    const pilha = [...inicio];
    while (pilha.length) {
      const f = pilha.pop();
      if (conjunto.has(f) || !existsSync(f)) continue;
      conjunto.add(f); vistos.add(f);
      if (!/\.(mjs|js|cjs|ts)$/.test(f) || !f.startsWith(RAIZ)) continue;
      const texto = readFileSync(f, 'utf8');
      for (const m of texto.matchAll(ESPECIFICADOR)) { const r = resolverImportacao(f, m[2]); if (r?.startsWith(RAIZ)) pilha.push(r); }
    }
  };
  /* o arquivo da entrada e o que ele importa, dentro do repositório: é onde o esboço lê as variáveis de ambiente que mudam a montagem */
  seguir([abs], doEsboco);
  seguir([...extras.map((e) => resolve(RAIZ, e)), ...arquivosDe(join(RAIZ, 'procedural/nucleo'), { recursivo: true, filtro: (n) => CODIGO.test(n) && !/\.test\.[a-z]+$/.test(n) })], new Set(vistos));
  for (const f of arquivosDe(dirname(abs), { recursivo: false, filtro: (n) => !CODIGO.test(n) && /\.(csv|txt|tsv|obj)$/.test(n) })) vistos.add(f);
  const variaveis = new Set();
  for (const f of doEsboco) if (/\.(mjs|js|cjs|ts)$/.test(f) && (f === abs || f.startsWith(RAIZ))) for (const nome of variaveisDeAmbienteDoTexto(readFileSync(f, 'utf8'))) variaveis.add(nome);
  const h = createHash('sha256').update(VERSAO_DO_CACHE);
  for (const f of [...vistos].sort()) h.update(`\n${relative(RAIZ, f)}\n`).update(readFileSync(f));
  /* o valor de cada variável lida (ou a falta dela): a cabine montada com HD_CABINE=so não é a montada sem ela */
  for (const nome of [...variaveis].sort()) h.update(`\nambiente ${nome}=${ambiente[nome] === undefined ? '\u0000indefinida' : JSON.stringify(String(ambiente[nome]))}`);
  return { chave: h.digest('hex').slice(0, 32), arquivos: vistos.size, variaveis: [...variaveis].sort() };
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

/**
 * A execução da receita (`{ entrada, neutro }`) guardada por assinatura do conteúdo, a mesma de `lerEntradaDeMedida`: quem executa a receita em Node
 * (a ativação da bancada, a medida de contatos, as ferramentas de medida) lê a execução da última rodada quando nada mudou e grava a sua quando mudou,
 * de modo que a receita é executada uma vez só entre elas. `cache: false` executa de novo e regrava. Uma receita copiada com outro perfil, ou
 * outros PARAMS, não é a do arquivo: quem a passa deve chamar com `cache: false`. `memoria` (a do cache por prefixo, `memoriaDoHost` de
 * `procedural/nucleo/planejador/armazem-em-pasta.mjs`) vale quando a receita executa: ela recomeça do estado que o comando anterior
 * guardou para o mesmo prefixo de passos, e o resultado é o mesmo.
 * @returns {{ executada: object, doCache: boolean }}
 */
export function executarReceitaGuardada(abs, receita, { cache = true, pastaDoCache = PASTA_DO_CACHE, memoria = null } = {}) {
  let sig = null;
  if (cache) { try { sig = assinaturaDaEntrada(abs); } catch { sig = null; } }
  const guardada = sig ? lerDoCache(pastaDoCache, sig.chave, rotuloDe(abs, 'r')) : null;
  if (guardada) return { executada: guardada, doCache: true };
  const executada = executarReceita(receita, memoria ? { memoria } : {});
  if (sig) gravarNoCache(pastaDoCache, sig.chave, rotuloDe(abs, 'r'), executada);
  return { executada, doCache: false };
}

export class ErroDeEntrada extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDeEntrada'; }
}

/* ---- o cache por passo e a variante de parâmetros nas medidas ---- */

/**
 * Executa a receita com o cache por passo (`tmp/cache-por-prefixo/`): a execução recomeça do último estado que um comando anterior guardou
 * para o mesmo prefixo de passos, e o neutro é o mesmo da execução inteira. `abs` é o caminho do arquivo da receita e dá o rótulo do índice;
 * `variante` (um texto curto) separa o índice da receita que a ferramenta mudou antes de executar (só os passos `subdivisao`, outros
 * parâmetros), para a variante não tirar do índice os pontos da receita do arquivo. A chave de cada ponto não leva o rótulo: é a do
 * conteúdo, de modo que duas ferramentas que executam o mesmo prefixo dividem o ponto. `cache: false` (`--sem-cache`), ou `abs` nulo,
 * executa inteira, sem ler nem gravar. `soOFim` guarda só o estado final (um ponto por receita, em vez de um por passo caro): é para a
 * receita que ninguém edita, como a cópia que a rodada guardou, em que o ponto do meio nunca serviria e cada um pesa dezenas de MB numa
 * chapa de lataria. Devolve `{ executada, cachePorPasso, segundos }`, com `cachePorPasso` nulo sem cache e, com ele,
 * `{ recomecouDoPasso, total, lidos, guardados }` (`recomecouDoPasso` é quantos passos não rodaram).
 */
export async function executarComCachePorPasso(abs, receita, { cache = true, variante = null, soOFim = false, pastaDoCachePorPrefixo = null, execucao = {} } = {}) {
  let host = null;
  if (cache && abs) {
    try {
      const { memoriaDoHost } = await import('../../procedural/nucleo/planejador/armazem-em-pasta.mjs');
      /* só o fim: o limiar de custo alto deixa a memória guardar os dois últimos passos, e o máximo de um ponto fica com o último */
      host = memoriaDoHost({ rotulo: variante ? `${abs}#${variante}` : abs, ...(pastaDoCachePorPrefixo ? { pasta: pastaDoCachePorPrefixo } : {}), ...(soOFim ? { maximo: 1, limiarDeCustoMs: Number.MAX_SAFE_INTEGER } : {}) });
    } catch { host = null; /* o cache é conveniência: sem disco, a medida executa inteira */ }
  }
  const t0 = performance.now();
  const executada = executarReceita(receita, host ? { ...execucao, memoria: host.memoria } : execucao);
  const segundos = (performance.now() - t0) / 1000;
  const e = host?.memoria.estatisticas;
  const cachePorPasso = e ? { recomecouDoPasso: e.recomecouDoPasso ?? 0, total: executada.entrada?.PASSOS?.length ?? null, lidos: e.lidos, guardados: e.guardados } : null;
  return { executada, cachePorPasso, segundos };
}

/** A linha que diz, na saída de erro, de onde a execução recomeçou; vazia sem cache. */
export function avisoDoCachePorPasso({ cachePorPasso, segundos }, ferramenta) {
  if (!cachePorPasso) return '';
  const { recomecouDoPasso: n, total } = cachePorPasso;
  const oQue = n > 0 ? `recomeçou do estado guardado depois de ${n} de ${total ?? '?'} passo(s)` : 'nenhum estado guardado servia, a receita executou inteira e os pontos ficaram guardados';
  return `${ferramenta}: cache por passo (tmp/cache-por-prefixo/): ${oQue}, em ${segundos.toFixed(1)} s; --sem-cache executa inteira\n`;
}

const ehObjetoSimples = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

/** `--params=<json ou caminho de .json>` -> o objeto dos parâmetros da variante, ou null quando a opção não veio. */
export function lerParams(texto) {
  if (texto === null || texto === undefined) return null;
  const bruto = String(texto).trim();
  let json = bruto;
  if (!bruto.startsWith('{')) {
    if (!/\.json$/.test(bruto) || !existsSync(resolve(bruto))) throw new ErroDeEntrada(`--params espera um objeto em JSON ou o caminho de um .json que existe, e veio '${bruto}'`);
    json = readFileSync(resolve(bruto), 'utf8');
  }
  let params;
  try { params = JSON.parse(json); } catch (e) { throw new ErroDeEntrada(`--params não é JSON válido (${e.message}); espera um objeto como '{"chapa":{"niveis":2}}'`); }
  if (!ehObjetoSimples(params) || Object.keys(params).length === 0) throw new ErroDeEntrada(`--params espera um objeto com ao menos um parâmetro, e veio ${JSON.stringify(params)}`);
  return params;
}

/* o texto só com o código: comentário, texto entre aspas e template viram espaço, e as quebras de linha ficam onde estavam */
function soCodigo(texto) {
  let saida = '';
  for (let k = 0; k < texto.length; k += 1) {
    const depois = pularNaoCodigo(texto, k);
    if (depois === k) { saida += texto[k]; continue; }
    saida += texto.slice(k, depois).replace(/[^\n]/g, ' ');
    k = depois - 1;
  }
  return saida;
}

/**
 * Onde o arquivo da receita lê a tabela dos parâmetros direto, pelo nome dela, em vez de `this.PARAMS` ou do argumento de uma função:
 * `[{ linha, texto }]`. A tabela é o identificador de `PARAMS: <nome>` (ou `PARAMS` abreviado); não contam a declaração dela nem essa
 * atribuição. Cada leitura dessas usa a tabela do arquivo, na importação (`export const PONTOS = [... TABELA ...]`) ou a cada chamada
 * (`get PASSOS() { return gerar(TABELA); }`), e não muda com a variante. A leitura é por texto e só do arquivo da receita: o parâmetro de
 * função com o mesmo nome da tabela é acusado sem ser leitura dela, e o arquivo importado que leia a tabela não é visto.
 */
export function leiturasDiretasDaTabela(textoDaReceita) {
  const codigo = soCodigo(String(textoDaReceita ?? ''));
  const atribuicao = /(?<![\w$.])PARAMS\s*(?::\s*([A-Za-z_$][\w$]*)\s*)?(?=[,}])/.exec(codigo);
  if (!atribuicao) return [];
  const nome = atribuicao[1] ?? 'PARAMS';
  const linhas = String(textoDaReceita).split('\n');
  const achadas = [];
  const usos = new RegExp(`(?<![\\w$.])${nome.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
  for (const m of codigo.matchAll(usos)) {
    if (m.index >= atribuicao.index && m.index < atribuicao.index + atribuicao[0].length) continue;
    const antes = codigo.slice(Math.max(0, m.index - 40), m.index);
    if (/(?:const|let|var)\s+$/.test(antes) && /^\s*=(?!=)/.test(codigo.slice(m.index + nome.length))) continue;
    const linha = codigo.slice(0, m.index).split('\n').length;
    if (!achadas.some((a) => a.linha === linha)) achadas.push({ linha, texto: linhas[linha - 1].trim().slice(0, 110) });
  }
  return achadas;
}

function descritorDe(objeto, campo) {
  for (let o = objeto; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) { const d = Object.getOwnPropertyDescriptor(o, campo); if (d) return d; }
  return null;
}

function fundirParams(base, novos, caminho = '') {
  const saida = { ...base };
  for (const [chave, valor] of Object.entries(novos)) {
    if (!Object.hasOwn(base, chave)) throw new ErroDeEntrada(`--params traz '${caminho}${chave}', que a receita não declara em PARAMS${caminho ? ` (em ${caminho.slice(0, -1)})` : ''}; os declarados ali são ${Object.keys(base).sort().join(', ') || '(nenhum)'}`);
    saida[chave] = ehObjetoSimples(valor) && ehObjetoSimples(base[chave]) ? fundirParams(base[chave], valor, `${caminho}${chave}.`) : valor;
  }
  return saida;
}

/**
 * A receita com outros parâmetros, para medir uma variante sem editar o arquivo: a cópia leva `PARAMS` fundido com `params` (objeto dentro de
 * objeto funde chave a chave; lista e número trocam inteiros) e mantém os getters, que passam a ler a tabela nova por `this.PARAMS`.
 * Recusa, com `ErroDeEntrada`: o parâmetro que a receita não declara; a receita sem `PARAMS`; a que traz `PASSOS` (ou
 * `CHAMADAS_COMPOSICOES`) como lista fixa, em que a variante não mudaria nada; e a que lê a tabela direto (`leiturasDiretasDaTabela`,
 * sobre `texto`, o texto do arquivo dela), em que a variante teria os passos novos e os dados velhos. `nome` é como a recusa chama a receita.
 */
export function receitaComParams(receita, params, { texto = null, nome = 'a receita' } = {}) {
  if (!ehObjetoSimples(receita?.PARAMS)) throw new ErroDeEntrada(`--params pede uma receita com PARAMS, e ${nome} não declara nenhum (ou não é uma receita em arquivo)`);
  for (const campo of ['PASSOS', 'CHAMADAS_COMPOSICOES']) {
    const d = descritorDe(receita, campo);
    if (d && !d.get) throw new ErroDeEntrada(`--params não muda ${nome}: ${campo} é uma lista fixa, calculada na importação, e não um getter que lê this.PARAMS; escreva \`get ${campo}() { return gerarPassos(this.PARAMS); }\` ou edite a tabela no arquivo`);
  }
  const diretas = texto === null ? [] : leiturasDiretasDaTabela(texto);
  if (diretas.length) {
    throw new ErroDeEntrada(`--params recusado: ${nome} lê a tabela dos parâmetros direto, fora de this.PARAMS, em ${diretas.length} linha(s):\n${diretas.slice(0, 8).map((d) => `  linha ${d.linha}: ${d.texto}`).join('\n')}${diretas.length > 8 ? `\n  e mais ${diretas.length - 8}` : ''}\n`
      + 'Esses dados saem da tabela do arquivo e não mudam com --params: a variante teria os passos novos e esses dados velhos. '
      + 'O esperado é cada leitura por this.PARAMS, num getter da receita (`get PONTOS() { return pontos(this.PARAMS); }`), ou pelo argumento da função. '
      + 'Enquanto a receita não for assim, meça a variante editando a tabela no arquivo: o cache por passo refaz só do passo que mudar.');
  }
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita));
  Object.defineProperty(copia, 'PARAMS', { value: fundirParams(receita.PARAMS, params), enumerable: true, configurable: true });
  return copia;
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
      const r = executarReceitaGuardada(abs, receita, { cache: !!sig, pastaDoCache });
      lida.doCache = r.doCache;
      return (executada = r.executada);
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
