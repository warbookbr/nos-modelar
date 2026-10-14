#!/usr/bin/env node
/* desenho.mjs — a porta de linha de comando do módulo `modulos/desenho-por-restricoes`, que desenha a vista de um objeto sem
 * imagem de referência: a IA declara pontos, partes e relações em `<vista>.desenho.json` e um resolvedor de restrições dá a
 * geometria. O módulo não lê nem grava arquivo; aqui entram o arquivo de descrição, a gravação dos contornos e a vista em traço
 * em PNG, e a razão interseção/união entre dois contornos. O fluxo está na skill `.claude/skills/desenho-por-restricoes`.
 *
 * USO
 *   npm run desenho -- <vista>.desenho.json [--so-relatorio] [--json] [--pecas=<catalogo.json>[,<outro.json>]]
 *   npm run desenho -- razao <a.contornos.json> <b.contornos.json> [--parte-a=<nome>] [--parte-b=<nome>] [--partes] [--ponto-a=h,v --ponto-b=h,v] [--medida=regioes|silhueta] [--json]
 *   npm run desenho -- familia <f.familia-de-desenho.json> [--perfil=<nome>] [--valores=a=1,b=2] [--grava=<pasta>] [--pecas=...] [--so-relatorio] [--json]
 *   npm run desenho -- familia <f.familia-de-desenho.json> --provar [--pecas=...] [--json]
 *   npm run desenho -- --ajuda
 *
 * A família (`mecanifica.familia-de-desenho@1`) é um desenho parametrizado com a faixa de cada parâmetro. `familia` desenha para um
 * conjunto de valores (o padrão, o perfil, os `--valores`) e, com `--grava`, grava `<vista>.desenho.json` (com as peças dentro) e os
 * contornos e a vista ao lado; `--provar` desenha com cada parâmetro no mínimo, no médio e no máximo e exige que todos resolvam.
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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  desenhar, ErroDeDesenho, especializarFamilia, lerCatalogoDePecas, lerFamiliaDeDesenho, provarFamilia, razaoInterseccaoUniao, razaoPorParte,
  textoDaAjuda, valoresDaFamilia, VISTAS_DO_DESENHO,
} from '../../modulos/desenho-por-restricoes/src/index.js';

const SUFIXO = '.desenho.json';
const arquivoJson = (conteudo) => `${JSON.stringify(conteudo, null, 1)}\n`;

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

function lerJson(caminho, io) {
  if (!existsSync(caminho)) { io.err(`desenho: o arquivo ${caminho} não existe.\n`); return null; }
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

/* Os catálogos de peças de `--pecas=<a.json>[,<b.json>]`: `{ pecas, hashes }`, ou `{ codigo }` quando um arquivo não lê (2) ou não vale (3). */
function lerCatalogos(lista, io) {
  const pecas = {}; const hashes = {};
  if (lista === '') { io.err('desenho: --pecas precisa de um ou mais arquivos de catálogo, separados por vírgula (--pecas=<catalogo.json>[,<outro.json>]).\n'); return { codigo: 2 }; }
  for (const arquivo of (lista ?? '').split(',').filter(Boolean)) {
    const lido = lerJson(resolve(arquivo), io);
    if (!lido) return { codigo: 2 };
    const { erros, pecas: dele } = lerCatalogoDePecas(lido.json, basename(arquivo));
    if (erros.length) { io.err(`desenho: ${erros.length} erro(s) no catálogo ${basename(arquivo)}:\n${erros.map((e) => `- ${e}`).join('\n')}\n`); return { codigo: 3 }; }
    for (const nome of Object.keys(dele)) {
      if (Object.hasOwn(pecas, nome)) { io.err(`desenho: a peça ${JSON.stringify(nome)} está em mais de um catálogo; renomeie uma delas.\n`); return { codigo: 3 }; }
      pecas[nome] = dele[nome];
    }
    hashes[basename(arquivo)] = createHash('sha256').update(lido.bytes).digest('hex');
  }
  return { pecas, hashes };
}

const USO_DA_FAMILIA = 'uso: npm run desenho -- familia <f.familia-de-desenho.json> [--perfil=<nome>] [--valores=a=1,b=2] [--grava=<pasta>] [--pecas=<catalogo.json>] [--so-relatorio] [--json]\n     npm run desenho -- familia <f.familia-de-desenho.json> --provar [--pecas=<catalogo.json>] [--json]\n';
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
  const padroes = Object.fromEntries(Object.entries(familia.parametros).map(([n, p]) => [n, p.padrao]));
  const rotulo = prova.casos.reduce((m, c) => Math.max(m, c.rotulo.length), 0);
  io.out(`família ${JSON.stringify(prova.id)} ${prova.versao}: ${prova.casos.length} conjuntos de valores (todos no mínimo, no médio e no máximo; cada parâmetro no mínimo, no médio e no máximo com os outros no padrão; cada perfil)\n`);
  for (const c of prova.casos) {
    const vista = c.vista ? `vista ${numeroDoParametro(c.vista.larguraMm)} x ${numeroDoParametro(c.vista.alturaMm)} mm` : '';
    io.out(`  ${c.ok ? 'ok    ' : 'FALHOU'} ${c.rotulo.padEnd(rotulo)}  ${vista}${c.redundantes.length ? `  (redundante: ${c.redundantes.join(', ')})` : ''}\n`);
    if (!c.ok) {
      const mudados = Object.entries(c.valores).filter(([n, v]) => v !== padroes[n]).map(([n, v]) => `${n} = ${numeroDoParametro(v)} ${familia.parametros[n].unidade}`);
      io.out(`         valores: ${mudados.length ? mudados.join(', ') : 'os padrões'}\n${c.problemas.map((m) => `         ${m}\n`).join('')}`);
    }
  }
  const falharam = prova.casos.filter((c) => !c.ok);
  io.out(falharam.length ? `${falharam.length} de ${prova.casos.length} falharam: ${falharam.map((c) => c.rotulo).join('; ')}. Rode npm run desenho -- familia <arquivo> --valores=... com os valores de um que falhou para ler o relatório inteiro.\n` : `${prova.casos.length} de ${prova.casos.length} resolvem, com zero grau de liberdade, sem conflito, sem lado trocado, sem polígono cruzado e sem parte escondida.\n`);
  return prova.ok ? 0 : 4;
}

async function comandoFamilia(args, valor, argv, io) {
  const [arquivo] = args;
  if (!arquivo) { io.err(USO_DA_FAMILIA); return 2; }
  const lido = lerJson(resolve(arquivo), io);
  if (!lido) return 2;
  const catalogo = lerCatalogos(valor('pecas'), io);
  if (catalogo.codigo) return catalogo.codigo;
  const { erros, familia } = lerFamiliaDeDesenho(lido.json, { pecas: catalogo.pecas });
  if (erros.length) { io.err(`desenho: a família ${basename(arquivo)} tem ${erros.length} erro(s):\n${erros.map((e) => `- ${e}`).join('\n')}\n`); return 3; }
  if (argv.includes('--provar')) return provarDaFamilia(familia, catalogo.pecas, argv, io);

  const dados = lerValores(valor('valores'));
  if (dados.erro) { io.err(`desenho: ${dados.erro}\n`); return 2; }
  const { erros: errosDosValores, valores } = valoresDaFamilia(familia, { perfil: valor('perfil') ?? null, valores: dados.valores });
  if (errosDosValores.length) { io.err(`desenho: ${errosDosValores.map((e) => `${e}.`).join('\n')}\n`); return 3; }
  const descricao = especializarFamilia(familia, valores, { pecas: catalogo.pecas });
  const destino = valor('grava');
  if (destino === undefined) {
    try {
      const r = await desenhar(descricao, { origem: { desenho: null, sha256: createHash('sha256').update(arquivoJson(descricao)).digest('hex') } });
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

export async function principal(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }) {
  const args = argv.filter((a) => !a.startsWith('--'));
  const valor = (nome) => argv.find((a) => a === `--${nome}` || a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
  if (argv.includes('--ajuda')) { io.out(textoDaAjuda()); return 0; }
  if (!args.length) { io.err(`${textoDaAjuda()}\n`); return 2; }
  if (args[0] === 'razao') return comandoRazao(args.slice(1), valor, io);
  if (args[0] === 'familia') return comandoFamilia(args.slice(1), valor, argv, io);

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
  const catalogo = lerCatalogos(valor('pecas'), io);
  if (catalogo.codigo) return catalogo.codigo;
  let r;
  try {
    r = await desenhar(lido.json, {
      origem: { desenho: basename(caminho), sha256: createHash('sha256').update(lido.bytes).digest('hex'), ...(Object.keys(catalogo.hashes).length ? { pecas: catalogo.hashes } : {}) },
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
