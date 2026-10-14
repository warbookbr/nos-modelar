#!/usr/bin/env node
/* desenho.mjs — a porta de linha de comando do módulo `modulos/desenho-por-restricoes`, que desenha a vista de um objeto sem
 * imagem de referência: a IA declara pontos, partes e relações em `<vista>.desenho.json` e um resolvedor de restrições dá a
 * geometria. O módulo não lê nem grava arquivo; aqui entram o arquivo de descrição, a gravação dos contornos e a vista em traço
 * em PNG, e a razão interseção/união entre dois contornos. O fluxo está na skill `.claude/skills/desenho-por-restricoes`.
 *
 * USO
 *   npm run desenho -- <vista>.desenho.json [--so-relatorio] [--json] [--pecas=<catalogo.json>[,<outro.json>]]
 *   npm run desenho -- razao <a.contornos.json> <b.contornos.json> [--parte-a=<nome>] [--parte-b=<nome>] [--partes] [--ponto-a=h,v --ponto-b=h,v] [--medida=regioes|silhueta] [--json]
 *   npm run desenho -- familia <f.familia-de-desenho.json> [--perfil=<nome>|minimo|medio|maximo] [--valores=a=1,b=2] [--grava=<pasta>] [--pecas=...] [--so-relatorio] [--json]
 *   npm run desenho -- familia <f.familia-de-desenho.json> --provar [--pecas=...] [--json]
 *   npm run desenho -- familia <f.familia-de-desenho.json> --ajustar=<referencia.contornos.json> [--abrir=<fração>] [--soltos=a,b] [--perfil=...] [--valores=...] [--grava=<pasta>] [--json]
 *   npm run desenho -- conferir [<pasta das famílias>] [--json]
 *   npm run desenho -- --ajuda
 *
 * A família (`mecanifica.familia-de-desenho@1`) é um desenho parametrizado com a faixa de cada parâmetro. `familia` desenha para um
 * conjunto de valores (o padrão, o perfil, os `--valores`) e, com `--grava`, grava `<vista>.desenho.json` (com as peças dentro) e os
 * contornos e a vista ao lado; `--provar` desenha com cada parâmetro no mínimo, no médio e no máximo, com os pares nos extremos
 * cruzados e com cada perfil, e exige que todos os conjuntos que a família admite resolvam. A família diz em "catalogo" o catálogo de
 * peças que usa, relativo ao arquivo dela, e `--pecas` acrescenta outros. `--perfil` aceita também `minimo`, `medio` e `maximo`.
 * `--ajustar` procura os valores da família que dão a maior razão contra o contorno de uma referência, a partir do padrão, do perfil
 * ou dos `--valores`, e diz quais parâmetros ficaram no limite da faixa; com `--abrir=0.4` a busca vai além da faixa, 0,4 vez o
 * médio de cada lado, e diz quais ficaram fora dela, que é quanto a faixa precisa crescer para cobrir a referência. `--soltos`
 * limita a busca a alguns parâmetros. Com `--grava`, grava `ajuste.json` e o desenho dos valores achados, com os contornos e a vista.
 * `conferir` é o gate `familias-de-desenho:check`: roda a prova de toda família sob a pasta (a de `procedural/familias-de-desenho`
 * por padrão) e confere que a pasta ao lado dela com o nome de um perfil (`referencia/`, `minimo/`, `medio/`, `maximo/`) ainda é o
 * que a família gera, nos bytes do desenho e dos contornos; a vista em PNG depende das fontes da máquina e só precisa existir.
 *
 * A razão mede por padrão a união das regiões de cada arquivo, sem as `foraDoModelo` e com o vão que elas cercam como fora; a
 * medida antiga, pelo anel de fora da silhueta, é `--medida=silhueta`, e a outra medida sai ao lado quando dá outro número.
 *
 * Resolvido o desenho, grava `<vista>.contornos.json` (o formato `mecanifica.contornos@1`, com `origem` no lugar de `imagem`,
 * que o esboço e a prancha dos contornos leem sem mudança) e `<vista>.png` (a vista em traço, com os nomes das partes fora do
 * desenho, que é o alvo que o roteiro da prancha procura), ao lado da descrição. Nos outros estados (conflito, solto, lado
 * trocado) nada é gravado e os arquivos de uma execução anterior ficam como estavam: o `origem.sha256` do contorno diz de qual
 * descrição ele veio. Código de saída: 0 resolvido; 2 uso errado ou arquivo ilegível; 3 descrição inválida; 4 não resolvido; 1 erro
 * inesperado. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ajustarFamilia, catalogosDaFamilia, desenhar, ErroDeDesenho, especializarFamilia, lerCatalogoDePecas, lerFamiliaDeDesenho, PERFIS_DA_FAIXA, provarFamilia,
  razaoInterseccaoUniao, razaoPorParte, textoDaAjuda, valoresDaFamilia, VISTAS_DO_DESENHO,
} from '../../modulos/desenho-por-restricoes/src/index.js';

const SUFIXO = '.desenho.json';
const SUFIXO_DA_FAMILIA = '.familia-de-desenho.json';
const PASTA_DAS_FAMILIAS = 'procedural/familias-de-desenho';
const arquivoJson = (conteudo) => `${JSON.stringify(conteudo, null, 1)}\n`;
const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

async function svgParaPng(svg, destino) {
  const { chromium } = (await import('playwright')).default;
  const navegador = await chromium.launch();
  try {
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const pagina = await navegador.newPage({ viewport: { width: Number(w), height: Number(h) } });
    await pagina.setContent(`<body style="margin:0">${svg}</body>`);
    await pagina.screenshot({ path: destino });
  } finally {
    await navegador.close();
  }
}

function lerJson(caminho, io, quem = 'o arquivo') {
  if (!existsSync(caminho)) { io.err(`desenho: ${quem} ${caminho} não existe.\n`); return null; }
  const bytes = readFileSync(caminho);
  try { return { bytes, json: JSON.parse(bytes.toString('utf8')) }; } catch (e) { io.err(`desenho: ${caminho} não é um JSON legível (${e.message}).\n`); return null; }
}

const ponto = (texto) => {
  const p = texto?.split(',').map(Number);
  return p?.length === 2 && p.every(Number.isFinite) ? p : null;
};

const USO_DA_RAZAO = 'uso: npm run desenho -- razao <a.contornos.json> <b.contornos.json> [--parte-a=<nome>] [--parte-b=<nome>] [--partes] [--ponto-a=h,v --ponto-b=h,v] [--medida=regioes|silhueta]\n';

async function comandoRazao(args, valor, io) {
  const [a, b] = args;
  if (!a || !b) { io.err(USO_DA_RAZAO); return 2; }
  const A = lerJson(resolve(a), io); const B = lerJson(resolve(b), io);
  if (!A || !B) return 2;
  const pa = valor('ponto-a'); const pb = valor('ponto-b');
  const porParte = valor('partes') !== undefined;
  if (porParte && (valor('parte-a') !== undefined || valor('parte-b') !== undefined)) { io.err('desenho: --partes mede todas as regiões que os dois contornos têm pelo nome; não combina com --parte-a nem --parte-b.\n'); return 2; }
  if ((pa === undefined) !== (pb === undefined)) { io.err('desenho: --ponto-a e --ponto-b vêm juntos: o ponto de cada contorno que deve coincidir, "h,v" em milímetro.\n'); return 2; }
  if (pa !== undefined && (!ponto(pa) || !ponto(pb))) { io.err('desenho: --ponto-a e --ponto-b devem ser "h,v", dois números em milímetro.\n'); return 2; }
  let r; let tabela = null;
  const alinharPor = pa !== undefined ? { a: ponto(pa), b: ponto(pb) } : null;
  try {
    r = await razaoInterseccaoUniao(A.json, B.json, { parteA: valor('parte-a') ?? null, parteB: valor('parte-b') ?? null, alinharPor, medida: valor('medida') ?? 'regioes' });
    if (porParte) tabela = await razaoPorParte(A.json, B.json, { alinharPor });
  } catch (e) {
    if (e instanceof ErroDeDesenho) { io.err(`desenho: ${e.message}\n`); return 2; }
    throw e;
  }
  if (valor('json') !== undefined) { io.out(arquivoJson(tabela ? { ...r, porParte: tabela } : r)); return 0; }
  const f = (x) => x.toFixed(4).replace('.', ',');
  const d = (v) => `[${v.deslocamento.map((n) => n.toFixed(2).replace('.', ',')).join('; ')}] mm`;
  const lado = (parte, nome) => (parte ? `parte ${parte} de ${nome}` : `${r.medida === 'silhueta' ? 'silhueta (anel de fora)' : 'união das regiões'} de ${nome}`);
  const c = r.comparada;
  const nomeDaMedida = (medida) => (medida === 'silhueta' ? 'silhueta' : 'união das regiões');
  io.out(`razão interseção/união, ${lado(valor('parte-a'), basename(a))} contra ${lado(valor('parte-b'), basename(b))}${r.medida === 'regioes' && (!valor('parte-a') || !valor('parte-b')) ? ' (sem as regiões foraDoModelo)' : ''}\n`);
  const veja = (campo) => (c && f(c[campo].iou) !== f(r[campo].iou) ? ` (pela ${nomeDaMedida(c.medida)}: ${f(c[campo].iou)})` : '');
  io.out(`  sem alinhar (origens como estão): ${f(r.semAlinhar.iou)}${veja('semAlinhar')}\n`);
  if (r.porPonto) io.out(`  alinhada pelo ponto declarado: ${f(r.porPonto.iou)}${veja('porPonto')} (o segundo contorno deslocado de ${d(r.porPonto)})\n`);
  io.out(`  alinhada pela melhor translação: ${f(r.melhorTranslacao.iou)}${veja('melhorTranslacao')} (o segundo contorno deslocado de ${d(r.melhorTranslacao)}; separa erro de posição de erro de forma)\n`);
  const mm2 = (x) => `${Math.round(x)} mm²`;
  io.out(`  áreas: ${mm2(r.areaA)} e ${mm2(r.areaB)}${c && (Math.round(c.areaA) !== Math.round(r.areaA) || Math.round(c.areaB) !== Math.round(r.areaB)) ? ` (pela ${nomeDaMedida(c.medida)}: ${mm2(c.areaA)} e ${mm2(c.areaB)})` : ''}\n`);
  if (c) io.out('  as duas medidas diferem: a silhueta é o anel de fora e enche o vão que as regiões cercam (a barra fina que fecha um arco), e a união das regiões o deixa de fora. Razões de medidas diferentes não se comparam; a padrão é a união das regiões e --medida=silhueta escolhe a outra.\n');
  if (tabela) {
    const nome = tabela.partes.reduce((m, p) => Math.max(m, p.nome.length), 6);
    io.out(`por região, da pior para a melhor (cada região medida sozinha, como --parte-a=<nome> --parte-b=<nome>):\n  ${'região'.padEnd(nome)}  sem alinhar  melhor translação  deslocamento\n`);
    for (const p of tabela.partes) io.out(`  ${p.nome.padEnd(nome)}  ${f(p.semAlinhar).padStart(11)}  ${f(p.melhorTranslacao).padStart(16)}  ${d({ deslocamento: p.deslocamento })}${p.foraDoModelo ? ' (fora do modelo)' : ''}\n`);
    if (!tabela.partes.length) io.out('  os dois contornos não têm nenhuma região com o mesmo nome\n');
    if (tabela.soEmA.length) io.out(`só em ${basename(a)}: ${tabela.soEmA.join(', ')}\n`);
    if (tabela.soEmB.length) io.out(`só em ${basename(b)}: ${tabela.soEmB.join(', ')}\n`);
  }
  return 0;
}

/* Os arquivos de `--pecas=<a.json>[,<b.json>]`, em caminho absoluto: `{ caminhos }`, ou `{ codigo }` quando o valor está vazio (2). */
function listaDePecas(texto, io) {
  if (texto === undefined) return { caminhos: [] };
  if (texto === '') { io.err('desenho: --pecas precisa de um ou mais arquivos de catálogo, separados por vírgula (--pecas=<catalogo.json>[,<outro.json>]).\n'); return { codigo: 2 }; }
  return { caminhos: texto.split(',').filter(Boolean).map((c) => resolve(c)) };
}

/* Os catálogos de peças dos `caminhos` (`{ caminho, declarado }`): `{ pecas, hashes }`, ou `{ codigo }` quando um arquivo não lê (2) ou não vale (3). */
function lerCatalogos(caminhos, io) {
  const pecas = {}; const hashes = {};
  for (const { caminho, declarado } of caminhos) {
    const lido = lerJson(caminho, io, declarado ? 'o catálogo de peças que a família declara em "catalogo",' : 'o arquivo');
    if (!lido) return { codigo: 2 };
    const { erros, pecas: dele } = lerCatalogoDePecas(lido.json, basename(caminho));
    if (erros.length) { io.err(`desenho: ${erros.length} erro(s) no catálogo ${basename(caminho)}:\n${erros.map((e) => `- ${e}`).join('\n')}\n`); return { codigo: 3 }; }
    for (const nome of Object.keys(dele)) {
      if (Object.hasOwn(pecas, nome)) { io.err(`desenho: a peça ${JSON.stringify(nome)} está em mais de um catálogo; renomeie uma delas.\n`); return { codigo: 3 }; }
      pecas[nome] = dele[nome];
    }
    hashes[basename(caminho)] = sha256(lido.bytes);
  }
  return { pecas, hashes };
}

/* Os catálogos que a família declara (relativos ao arquivo dela) e os de `--pecas` (relativos a quem roda), sem repetir o mesmo arquivo. */
function catalogosDaFamiliaEmDisco(json, arquivo, pecasDoComando = []) {
  const { erros, caminhos } = catalogosDaFamilia(json);
  if (erros.length) return { erros };
  const vistos = new Set();
  const todos = [...caminhos.map((c) => ({ caminho: resolve(dirname(arquivo), c), declarado: true })), ...pecasDoComando.map((caminho) => ({ caminho, declarado: false }))];
  return { erros, caminhos: todos.filter(({ caminho }) => !vistos.has(caminho) && vistos.add(caminho)) };
}

const USO_DA_FAMILIA = 'uso: npm run desenho -- familia <f.familia-de-desenho.json> [--perfil=<nome>|minimo|medio|maximo] [--valores=a=1,b=2] [--grava=<pasta>] [--pecas=<catalogo.json>] [--so-relatorio] [--json]\n     npm run desenho -- familia <f.familia-de-desenho.json> --provar [--pecas=<catalogo.json>] [--json]\n';
const numeroDoParametro = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');

/* `--valores=a=1,b=2` em `{ a: 1, b: 2 }`, ou null com a frase do que está errado. */
function lerValores(texto) {
  const valores = {};
  for (const par of (texto ?? '').split(',').filter(Boolean)) {
    const i = par.indexOf('=');
    const n = Number(par.slice(i + 1));
    if (i <= 0 || par.slice(i + 1).trim() === '' || !Number.isFinite(n)) return { erro: `--valores deve ser nome=número separados por vírgula (por exemplo --valores=largura=120,altura=60), e ${JSON.stringify(par)} não é.` };
    valores[par.slice(0, i)] = n;
  }
  return { valores };
}

async function provarDaFamilia(familia, pecas, argv, io) {
  const prova = await provarFamilia(familia, { pecas });
  if (argv.includes('--json')) { io.out(arquivoJson(prova)); return prova.ok ? 0 : 4; }
  io.out(textoDaProva(familia, prova));
  return prova.ok ? 0 : 4;
}

/* O relatório da prova de uma família: um conjunto por linha, o que fere uma relação de ordem separado do que se desenhou. */
function textoDaProva(familia, prova) {
  const L = [];
  const padroes = Object.fromEntries(Object.entries(familia.parametros).map(([n, p]) => [n, p.padrao]));
  const rotulo = prova.casos.reduce((m, c) => Math.max(m, c.rotulo.length), 0);
  const ordem = prova.recusados ? `, dos quais ${prova.recusados} fora das relações de ordem da família` : '';
  L.push(`família ${JSON.stringify(prova.id)} ${prova.versao}: ${prova.casos.length} conjuntos de valores (todos no mínimo, no médio e no máximo; cada parâmetro no mínimo, no médio e no máximo com os outros no padrão; cada par de parâmetros nos extremos cruzados; cada perfil)${ordem}\n`);
  for (const c of prova.casos) {
    if (c.recusado) { L.push(`  recusa ${c.rotulo.padEnd(rotulo)}  fere ${c.feridas.map((id) => JSON.stringify(id)).join(', ')}\n`); continue; }
    const vista = c.vista ? `vista ${numeroDoParametro(c.vista.larguraMm)} x ${numeroDoParametro(c.vista.alturaMm)} mm` : '';
    L.push(`  ${c.ok ? 'ok    ' : 'FALHOU'} ${c.rotulo.padEnd(rotulo)}  ${vista}${c.redundantes.length ? `  (redundante: ${c.redundantes.join(', ')})` : ''}\n`);
    if (!c.ok) {
      const mudados = Object.entries(c.valores).filter(([n, v]) => v !== padroes[n]).map(([n, v]) => `${n} = ${numeroDoParametro(v)} ${familia.parametros[n].unidade}`);
      L.push(`         valores: ${mudados.length ? mudados.join(', ') : 'os padrões'}\n${c.problemas.map((m) => `         ${m}\n`).join('')}`);
    }
  }
  if (prova.recusados) {
    const ids = [...new Set(prova.casos.flatMap((c) => c.feridas ?? []))];
    L.push(`${prova.recusados} conjuntos ferem a relação de ordem ${ids.map((id) => JSON.stringify(id)).join(', ')} da família e não foram desenhados: a faixa de cada parâmetro vale sozinha, e a relação tira da família a combinação que a contradiz. Rode npm run desenho -- familia <arquivo> --valores=... com os valores de um deles para ler a frase da relação.\n`);
  }
  const falharam = prova.casos.filter((c) => !c.ok);
  L.push(falharam.length
    ? `${falharam.length} de ${prova.desenhados} falharam: ${falharam.map((c) => c.rotulo).join('; ')}. Rode npm run desenho -- familia <arquivo> --valores=... com os valores de um que falhou para ler o relatório inteiro.\n`
    : `${prova.desenhados} de ${prova.desenhados} resolvem, com zero grau de liberdade, sem conflito, sem lado trocado, sem polígono cruzado, sem parte escondida e sem peça virada.\n`);
  return L.join('');
}

async function comandoFamilia(args, valor, argv, io) {
  const [arquivo] = args;
  if (!arquivo) { io.err(USO_DA_FAMILIA); return 2; }
  const lido = lerJson(resolve(arquivo), io);
  if (!lido) return 2;
  const doComando = listaDePecas(valor('pecas'), io);
  if (doComando.codigo) return doComando.codigo;
  const declarados = catalogosDaFamiliaEmDisco(lido.json, resolve(arquivo), doComando.caminhos);
  if (declarados.erros.length) { io.err(`desenho: a família ${basename(arquivo)} tem ${declarados.erros.length} erro(s):\n${declarados.erros.map((e) => `- ${e}`).join('\n')}\n`); return 3; }
  const catalogo = lerCatalogos(declarados.caminhos, io);
  if (catalogo.codigo) return catalogo.codigo;
  const { erros, familia } = lerFamiliaDeDesenho(lido.json, { pecas: catalogo.pecas });
  if (erros.length) { io.err(`desenho: a família ${basename(arquivo)} tem ${erros.length} erro(s):\n${erros.map((e) => `- ${e}`).join('\n')}\n`); return 3; }
  if (argv.includes('--provar')) return provarDaFamilia(familia, catalogo.pecas, argv, io);

  const dados = lerValores(valor('valores'));
  if (dados.erro) { io.err(`desenho: ${dados.erro}\n`); return 2; }
  const { erros: errosDosValores, valores } = valoresDaFamilia(familia, { perfil: valor('perfil') ?? null, valores: dados.valores });
  if (errosDosValores.length) { io.err(`desenho: ${errosDosValores.map((e) => `${e}.`).join('\n')}\n`); return 3; }
  if (valor('ajustar') !== undefined) return ajustarDaFamilia(familia, catalogo, arquivo, valores, valor, argv, io);
  const descricao = especializarFamilia(familia, valores, { pecas: catalogo.pecas });
  const destino = valor('grava');
  if (destino === undefined) {
    try {
      const r = await desenhar(descricao, { origem: { desenho: null, sha256: sha256(arquivoJson(descricao)) } });
      io.out(argv.includes('--json') ? arquivoJson(r.relatorio) : r.texto);
      return r.relatorio.resolvido ? 0 : 4;
    } catch (e) {
      if (e instanceof ErroDeDesenho) { io.err(`desenho: ${e.message}\n`); return 3; }
      throw e;
    }
  }
  if (!destino) { io.err('desenho: --grava=<pasta> precisa da pasta onde gravar a vista.\n'); return 2; }
  mkdirSync(resolve(destino), { recursive: true });
  const gravado = join(resolve(destino), `${descricao.vista}${SUFIXO}`);
  writeFileSync(gravado, arquivoJson(descricao), 'utf8');
  io.out(`gravado: ${basename(gravado)} (a família ${JSON.stringify(familia.id)} ${familia.versao} para os valores acima, com as peças dentro)\n`);
  return principal([gravado, ...argv.filter((a) => a === '--so-relatorio' || a === '--json')], io);
}

const USO_DO_AJUSTE = 'uso: npm run desenho -- familia <f.familia-de-desenho.json> --ajustar=<referencia.contornos.json> [--abrir=<fração>] [--soltos=a,b] [--perfil=<nome>] [--valores=a=1] [--grava=<pasta>] [--json]\n';

/* `familia --ajustar`: os valores da família que dão a maior razão contra o contorno da referência, a partir de `inicio`. */
async function ajustarDaFamilia(familia, catalogo, arquivo, inicio, valor, argv, io) {
  const alvoArquivo = valor('ajustar');
  if (!alvoArquivo) { io.err(USO_DO_AJUSTE); return 2; }
  const alvo = lerJson(resolve(alvoArquivo), io, 'o contorno da referência');
  if (!alvo) return 2;
  const abrir = valor('abrir') === undefined ? 0 : Number(valor('abrir'));
  if (!(Number.isFinite(abrir) && abrir >= 0)) { io.err(`desenho: --abrir deve ser a fração do médio que a busca alarga cada faixa para cada lado, um número maior ou igual a zero (por exemplo --abrir=0.4), e veio ${JSON.stringify(valor('abrir'))}.\n`); return 2; }
  const soltos = valor('soltos') ? valor('soltos').split(',').filter(Boolean) : null;
  const f = (x) => x.toFixed(4).replace('.', ',');
  const numero = (v) => String(v).replace('.', ',');
  let r;
  try {
    r = await ajustarFamilia(familia, alvo.json, {
      pecas: catalogo.pecas, inicio, soltos, abrir,
      aoMelhorar: (m) => io.err(`  ${m.parametro} = ${numero(m.valor)} -> ${f(m.iou)} (passo ${numero(m.passo.toFixed(4))} da busca, avaliação ${m.avaliacoes})\n`),
    });
  } catch (e) {
    if (e instanceof ErroDeDesenho) { io.err(`desenho: ${e.message}\n`); return 3; }
    throw e;
  }
  const saida = {
    familia: familia.id, versao: familia.versao, referencia: relative(process.cwd(), resolve(alvoArquivo)), sha256DaReferencia: sha256(alvo.bytes),
    medida: r.medida, abrir: r.abrir, ...(soltos ? { soltos } : {}), inicio: r.inicio, iou: r.iou, deslocamento: r.deslocamento,
    avaliacoes: r.avaliacoes, recusados: r.recusados, valores: r.valores, noLimite: r.noLimite, foraDaFaixa: r.foraDaFaixa,
  };
  if (argv.includes('--json')) io.out(arquivoJson(saida));
  else {
    const P = familia.parametros;
    io.out(`ajuste da família ${JSON.stringify(familia.id)} ${familia.versao} a ${basename(alvoArquivo)}, ${abrir ? `com a busca ${numero(abrir)} vez o médio além de cada faixa` : 'dentro das faixas'}: razão ${f(r.iou)} pela melhor translação (era ${f(r.inicio)} no início; o desenho deslocado de [${r.deslocamento.map((n) => n.toFixed(2).replace('.', ',')).join('; ')}] mm), em ${r.avaliacoes} avaliações, ${r.recusados} conjuntos recusados\n`);
    for (const [n, v] of Object.entries(r.valores)) {
      const fora = v < P[n].minimo || v > P[n].maximo;
      const nota = fora ? `  fora da faixa (${numero(P[n].minimo)} a ${numero(P[n].maximo)})` : r.noLimite.includes(n) ? `  no ${v === P[n].minimo ? 'mínimo' : 'máximo'} da faixa` : '';
      io.out(`  ${n} = ${numero(v)} ${P[n].unidade}${nota}\n`);
    }
    if (r.foraDaFaixa.length) io.out(`${r.foraDaFaixa.length} parâmetro(s) fora da faixa: para a família cobrir esta referência, a faixa de cada um precisa chegar ao valor achado.\n`);
    else if (r.noLimite.length) io.out(`${r.noLimite.length} parâmetro(s) no limite da faixa: a referência pode pedir mais que a faixa; --abrir=0.4 mostra quanto.\n`);
    io.out(`--valores=${Object.entries(r.valores).map(([n, v]) => `${n}=${v}`).join(',')}\n`);
  }
  const destino = valor('grava');
  if (destino === undefined) return 0;
  if (!destino) { io.err('desenho: --grava=<pasta> precisa da pasta onde gravar o ajuste.\n'); return 2; }
  const descricao = especializarFamilia(familia, r.valores, { pecas: catalogo.pecas });
  mkdirSync(resolve(destino), { recursive: true });
  writeFileSync(join(resolve(destino), 'ajuste.json'), arquivoJson(saida), 'utf8');
  const gravado = join(resolve(destino), `${descricao.vista}${SUFIXO}`);
  writeFileSync(gravado, arquivoJson(descricao), 'utf8');
  io.out(`gravado: ajuste.json e ${basename(gravado)} (a família ${JSON.stringify(familia.id)} ${familia.versao} nos valores do ajuste${r.foraDaFaixa.length ? ', fora da faixa dela' : ''})\n`);
  /* O relatório do desenho já saiu na busca; aqui só os arquivos. O desenho que a busca aceitou resolve, e outro código de saída é
     o que o comando do desenho diria sobre ele. */
  const codigo = await principal([gravado], { out: () => {}, err: io.err });
  if (codigo === 0) io.out(`gravados também ${descricao.vista}.contornos.json e ${descricao.vista}.png\n`);
  return codigo;
}

/* Os arquivos `*.familia-de-desenho.json` sob a pasta, em ordem de caminho. */
function familiasSob(pasta) {
  const achados = [];
  const olhar = (dir) => {
    for (const nome of readdirSync(dir).sort()) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) { if (nome !== 'node_modules') olhar(caminho); } else if (nome.endsWith(SUFIXO_DA_FAMILIA)) achados.push(caminho);
    }
  };
  olhar(pasta);
  return achados;
}

/* A primeira linha em que dois textos diferem, com as duas, para quem regrava saber onde olhar. */
function primeiraDiferenca(esperado, gravado) {
  const a = esperado.split('\n'); const b = gravado.split('\n');
  const i = a.findIndex((linha, k) => linha !== b[k]);
  const n = i === -1 ? a.length : i;
  const corta = (t) => (t === undefined ? '(o arquivo acaba antes)' : t.trim().slice(0, 100));
  return `primeira diferença na linha ${n + 1}: a família gera ${JSON.stringify(corta(a[n]))} e o arquivo tem ${JSON.stringify(corta(b[n]))}`;
}

/* A pasta ao lado da família com o nome de um perfil tem de ser o que a família gera hoje para ele: o desenho especializado e os
   contornos, nos bytes. Devolve as frases do que está diferente; vazio é conferido. */
async function conferirPasta(familia, pecas, perfil, pasta, arquivoDaFamilia) {
  const falhas = [];
  const { erros, valores } = valoresDaFamilia(familia, { perfil });
  if (erros.length) return [`o perfil ${JSON.stringify(perfil)} não se desenha mais: ${erros.join('; ')}`];
  const descricao = especializarFamilia(familia, valores, { pecas });
  const texto = arquivoJson(descricao);
  const nomeDoDesenho = `${descricao.vista}${SUFIXO}`;
  const regravar = `regrave com npm run desenho -- familia ${relative(process.cwd(), arquivoDaFamilia)} --perfil=${perfil} --grava=${relative(process.cwd(), pasta)}`;
  const gravadoDoDesenho = join(pasta, nomeDoDesenho);
  if (!existsSync(gravadoDoDesenho)) falhas.push(`falta ${nomeDoDesenho}; ${regravar}`);
  else if (readFileSync(gravadoDoDesenho, 'utf8') !== texto) falhas.push(`${nomeDoDesenho} não é o que a família gera para o perfil ${JSON.stringify(perfil)} (${primeiraDiferenca(texto, readFileSync(gravadoDoDesenho, 'utf8'))}); ${regravar}`);
  let r;
  try { r = await desenhar(descricao, { origem: { desenho: nomeDoDesenho, sha256: sha256(texto) } }); } catch (e) {
    if (e instanceof ErroDeDesenho) return [...falhas, `o perfil ${JSON.stringify(perfil)} não se desenha mais: ${e.erros?.length ? e.erros.join('; ') : e.message}`];
    throw e;
  }
  if (!r.relatorio.resolvido) return [...falhas, `o perfil ${JSON.stringify(perfil)} não resolve mais (estado ${r.relatorio.estado}); rode npm run desenho -- familia ${relative(process.cwd(), arquivoDaFamilia)} --perfil=${perfil}`];
  const nomeDosContornos = `${descricao.vista}.contornos.json`;
  const gravadoDosContornos = join(pasta, nomeDosContornos);
  const esperado = arquivoJson(r.contornos);
  if (!existsSync(gravadoDosContornos)) falhas.push(`falta ${nomeDosContornos}; ${regravar}`);
  else if (readFileSync(gravadoDosContornos, 'utf8') !== esperado) falhas.push(`${nomeDosContornos} não é o que a família gera para o perfil ${JSON.stringify(perfil)} (${primeiraDiferenca(esperado, readFileSync(gravadoDosContornos, 'utf8'))}); ${regravar}`);
  if (!existsSync(join(pasta, `${descricao.vista}.png`))) falhas.push(`falta ${descricao.vista}.png, a vista em traço; ${regravar}`);
  return falhas;
}

const USO_DO_CONFERIR = `uso: npm run desenho -- conferir [<pasta das famílias>] [--json]   (padrão: ${PASTA_DAS_FAMILIAS})\n`;

/* O gate `familias-de-desenho:check`: a prova de toda família sob a pasta e a conferência das pastas de perfil gravadas ao lado dela. */
async function comandoConferir(args, argv, io) {
  const raiz = resolve(args[0] ?? PASTA_DAS_FAMILIAS);
  if (!existsSync(raiz) || !statSync(raiz).isDirectory()) { io.err(`desenho: ${raiz} não é uma pasta.\n${USO_DO_CONFERIR}`); return 2; }
  const arquivos = familiasSob(raiz);
  if (!arquivos.length) { io.err(`desenho: nenhuma família (*${SUFIXO_DA_FAMILIA}) sob ${raiz}; um gate que não confere nada não passa.\n`); return 2; }
  const resultados = [];
  for (const arquivo of arquivos) {
    const nome = relative(process.cwd(), arquivo);
    const lido = lerJson(arquivo, io);
    if (!lido) return 2;
    const declarados = catalogosDaFamiliaEmDisco(lido.json, arquivo);
    const catalogo = declarados.erros.length ? { codigo: 3 } : lerCatalogos(declarados.caminhos, io);
    const lida = declarados.erros.length || catalogo.codigo ? { erros: declarados.erros, familia: null } : lerFamiliaDeDesenho(lido.json, { pecas: catalogo.pecas });
    if (!lida.familia) {
      resultados.push({ arquivo: nome, invalida: true, erros: lida.erros.length ? lida.erros : [`o catálogo de peças não leu (código ${catalogo.codigo})`], falhas: [], pastas: [], prova: null });
      continue;
    }
    const { familia } = lida;
    const prova = await provarFamilia(familia, { pecas: catalogo.pecas });
    const falhas = prova.casos.filter((c) => !c.ok).map((c) => `${c.rotulo}: ${c.problemas.join(' / ')}`);
    const dir = dirname(arquivo);
    const pastas = [];
    const perfis = [...new Set([...Object.keys(familia.perfis), ...PERFIS_DA_FAIXA])];
    for (const perfil of perfis) {
      const pasta = join(dir, perfil);
      const existe = existsSync(pasta) && statSync(pasta).isDirectory();
      if (!existe && perfil !== 'referencia') continue;
      /* O perfil `referencia` é a convenção da família ajustada: o que ela gera tem de estar gravado ao lado dela. */
      if (!existe) { if (Object.hasOwn(familia.perfis, 'referencia')) pastas.push({ perfil, falhas: [`falta a pasta ${relative(process.cwd(), pasta)}; grave com npm run desenho -- familia ${nome} --perfil=referencia --grava=${relative(process.cwd(), pasta)}`] }); continue; }
      pastas.push({ perfil, falhas: await conferirPasta(familia, catalogo.pecas, perfil, pasta, arquivo) });
    }
    resultados.push({ arquivo: nome, invalida: false, erros: [], id: familia.id, versao: familia.versao, prova: { total: prova.casos.length, desenhados: prova.desenhados, recusados: prova.recusados }, falhas, pastas });
  }
  const ruim = (r) => r.invalida || r.falhas.length > 0 || r.pastas.some((p) => p.falhas.length > 0);
  const codigo = resultados.some((r) => r.invalida) ? 3 : resultados.some(ruim) ? 4 : 0;
  if (argv.includes('--json')) { io.out(arquivoJson({ ok: codigo === 0, familias: resultados })); return codigo; }
  for (const r of resultados) {
    if (r.invalida) { io.out(`${r.arquivo}: INVÁLIDA\n${r.erros.map((e) => `  - ${e}\n`).join('')}`); continue; }
    io.out(`${r.arquivo}: família ${JSON.stringify(r.id)} ${r.versao}\n`);
    io.out(`  prova: ${r.prova.desenhados} conjuntos desenhados${r.prova.recusados ? `, ${r.prova.recusados} fora das relações de ordem` : ''}${r.falhas.length ? `; ${r.falhas.length} FALHARAM` : ', todos resolvem'}\n`);
    for (const f of r.falhas) io.out(`    FALHOU ${f}\n`);
    for (const p of r.pastas) {
      io.out(`  ${p.perfil}/: ${p.falhas.length ? 'DIFERENTE do que a família gera' : 'igual ao que a família gera (desenho e contornos)'}\n`);
      for (const f of p.falhas) io.out(`    ${f}\n`);
    }
  }
  io.out(codigo === 0
    ? `${resultados.length} família(s) conferida(s): a prova passa e as pastas de perfil gravadas são as que elas geram.\n`
    : `${resultados.filter(ruim).length} de ${resultados.length} família(s) com problema: ${resultados.filter(ruim).map((r) => r.arquivo).join(', ')}.\n`);
  return codigo;
}

export async function principal(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }) {
  const args = argv.filter((a) => !a.startsWith('--'));
  const valor = (nome) => argv.find((a) => a === `--${nome}` || a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
  if (argv.includes('--ajuda')) { io.out(textoDaAjuda()); return 0; }
  if (!args.length) { io.err(`${textoDaAjuda()}\n`); return 2; }
  if (args[0] === 'razao') return comandoRazao(args.slice(1), valor, io);
  if (args[0] === 'familia') return comandoFamilia(args.slice(1), valor, argv, io);
  if (args[0] === 'conferir') return comandoConferir(args.slice(1), argv, io);

  const caminho = resolve(args[0]);
  if (!caminho.endsWith(SUFIXO)) { io.err(`desenho: o arquivo de descrição deve se chamar <vista>${SUFIXO} (por exemplo lateral${SUFIXO}), e veio ${basename(caminho)}.\n`); return 2; }
  const lido = lerJson(caminho, io);
  if (!lido) return 2;
  const base = caminho.slice(0, -SUFIXO.length);
  /* A prancha e o esboço leem a vista pelo nome do arquivo (`lateral.contornos.json`, `topo.contornos.json`): o nome e o campo concordam. */
  const nome = basename(base);
  if (VISTAS_DO_DESENHO.includes(nome) && lido.json?.vista !== undefined && lido.json.vista !== nome) {
    io.err(`desenho: o arquivo se chama ${nome}${SUFIXO}, mas a descrição declara "vista": ${JSON.stringify(lido.json.vista)}; a prancha e o esboço leem a vista pelo nome do arquivo, então use o mesmo nome nos dois (renomeie o arquivo ou corrija "vista").\n`);
    return 3;
  }
  const doComando = listaDePecas(valor('pecas'), io);
  if (doComando.codigo) return doComando.codigo;
  const catalogo = lerCatalogos([...new Set(doComando.caminhos)].map((c) => ({ caminho: c, declarado: false })), io);
  if (catalogo.codigo) return catalogo.codigo;
  let r;
  try {
    r = await desenhar(lido.json, {
      origem: { desenho: basename(caminho), sha256: sha256(lido.bytes), ...(Object.keys(catalogo.hashes).length ? { pecas: catalogo.hashes } : {}) },
      pecas: catalogo.pecas,
    });
  } catch (e) {
    if (e instanceof ErroDeDesenho) { io.err(`desenho: ${e.message}\n`); return 3; }
    throw e;
  }
  io.out(argv.includes('--json') ? arquivoJson(r.relatorio) : r.texto);
  if (!r.relatorio.resolvido) {
    const antigos = [`${base}.contornos.json`, `${base}.png`].filter((f) => existsSync(f));
    if (antigos.length) io.out(`nada foi gravado; ${antigos.map((f) => basename(f)).join(' e ')} de uma execução anterior ficou como estava e não corresponde a esta descrição.\n`);
    return 4;
  }
  if (argv.includes('--so-relatorio')) return 0;
  writeFileSync(`${base}.contornos.json`, arquivoJson(r.contornos), 'utf8');
  await svgParaPng(r.svg, `${base}.png`);
  io.out(`gravado: ${basename(base)}.contornos.json e ${basename(base)}.png (a vista em traço, com os nomes das partes fora do desenho)\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`desenho: ${e.stack ?? e.message}\n`); process.exitCode = 1; });
}
