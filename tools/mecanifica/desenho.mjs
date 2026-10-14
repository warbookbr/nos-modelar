#!/usr/bin/env node
/* desenho.mjs — a porta de linha de comando do módulo `modulos/desenho-por-restricoes`, que desenha a vista de um objeto sem
 * imagem de referência: a IA declara pontos, partes e relações em `<vista>.desenho.json` e um resolvedor de restrições dá a
 * geometria. O módulo não lê nem grava arquivo; aqui entram o arquivo de descrição, a gravação dos contornos e a vista em traço
 * em PNG, e a razão interseção/união entre dois contornos. O fluxo está na skill `.claude/skills/desenho-por-restricoes`.
 *
 * USO
 *   npm run desenho -- <vista>.desenho.json [--so-relatorio] [--json]
 *   npm run desenho -- razao <a.contornos.json> <b.contornos.json> [--parte-a=<nome>] [--parte-b=<nome>] [--ponto-a=h,v --ponto-b=h,v] [--json]
 *   npm run desenho -- --ajuda
 *
 * Resolvido o desenho, grava `<vista>.contornos.json` (o formato `mecanifica.contornos@1`, com `origem` no lugar de `imagem`,
 * que o esboço e a prancha dos contornos leem sem mudança) e `<vista>.png` (a vista em traço, com os nomes das partes fora do
 * desenho, que é o alvo que o roteiro da prancha procura), ao lado da descrição. Nos outros estados (conflito, solto, lado
 * trocado) nada é gravado e os arquivos de uma execução anterior ficam como estavam: o `origem.sha256` do contorno diz de qual
 * descrição ele veio. Código de saída: 0 resolvido; 2 uso errado ou arquivo ilegível; 3 descrição inválida; 4 não resolvido; 1 erro
 * inesperado. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { desenhar, ErroDeDesenho, razaoInterseccaoUniao, textoDaAjuda, VISTAS_DO_DESENHO } from '../../modulos/desenho-por-restricoes/src/index.js';

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

async function comandoRazao(args, valor, io) {
  const [a, b] = args;
  if (!a || !b) { io.err('uso: npm run desenho -- razao <a.contornos.json> <b.contornos.json> [--parte-a=<nome>] [--parte-b=<nome>] [--ponto-a=h,v --ponto-b=h,v]\n'); return 2; }
  const A = lerJson(resolve(a), io); const B = lerJson(resolve(b), io);
  if (!A || !B) return 2;
  const pa = valor('ponto-a'); const pb = valor('ponto-b');
  if ((pa === undefined) !== (pb === undefined)) { io.err('desenho: --ponto-a e --ponto-b vêm juntos: o ponto de cada contorno que deve coincidir, "h,v" em milímetro.\n'); return 2; }
  if (pa !== undefined && (!ponto(pa) || !ponto(pb))) { io.err('desenho: --ponto-a e --ponto-b devem ser "h,v", dois números em milímetro.\n'); return 2; }
  let r;
  try {
    r = await razaoInterseccaoUniao(A.json, B.json, { parteA: valor('parte-a') ?? null, parteB: valor('parte-b') ?? null, alinharPor: pa !== undefined ? { a: ponto(pa), b: ponto(pb) } : null });
  } catch (e) {
    if (e instanceof ErroDeDesenho) { io.err(`desenho: ${e.message}\n`); return 2; }
    throw e;
  }
  if (valor('json') !== undefined) { io.out(arquivoJson(r)); return 0; }
  const f = (x) => x.toFixed(4).replace('.', ',');
  const d = (v) => `[${v.deslocamento.map((n) => n.toFixed(2).replace('.', ',')).join('; ')}] mm`;
  const alvo = `${valor('parte-a') ? `parte ${valor('parte-a')}` : 'silhueta'} de ${basename(a)} contra ${valor('parte-b') ? `parte ${valor('parte-b')}` : 'silhueta'} de ${basename(b)}`;
  io.out(`razão interseção/união, ${alvo}\n`);
  io.out(`  sem alinhar (origens como estão): ${f(r.semAlinhar.iou)}\n`);
  if (r.porPonto) io.out(`  alinhada pelo ponto declarado: ${f(r.porPonto.iou)} (o segundo contorno deslocado de ${d(r.porPonto)})\n`);
  io.out(`  alinhada pela melhor translação: ${f(r.melhorTranslacao.iou)} (o segundo contorno deslocado de ${d(r.melhorTranslacao)}; separa erro de posição de erro de forma)\n`);
  io.out(`  áreas: ${Math.round(r.areaA)} mm² e ${Math.round(r.areaB)} mm²\n`);
  return 0;
}

export async function principal(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }) {
  const args = argv.filter((a) => !a.startsWith('--'));
  const valor = (nome) => argv.find((a) => a === `--${nome}` || a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
  if (argv.includes('--ajuda')) { io.out(textoDaAjuda()); return 0; }
  if (!args.length) { io.err(`${textoDaAjuda()}\n`); return 2; }
  if (args[0] === 'razao') return comandoRazao(args.slice(1), valor, io);

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
  let r;
  try {
    r = await desenhar(lido.json, { origem: { desenho: basename(caminho), sha256: createHash('sha256').update(lido.bytes).digest('hex') } });
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
