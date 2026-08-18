#!/usr/bin/env node
/**
 * criar.mjs — P7 do playground (D-120): A CAMADA IA, laço único.
 *
 * Recebe uma peça e devolve NUM COMANDO: estado como dado (vértices/faces/
 * caixa/colisão, direto do núcleo — sem browser), o catálogo de capacidades
 * (derivado do registro explícito, sem tabela ou regex paralela), os renders
 * (3 ângulos texturizados + 3 geo=normais —
 * a evidência forçada) e os GATES (porteiro + gabarito, se houver
 * referência) resumidos num VEREDITO AGREGADO. Fecha o "83%": nenhum destes
 * passos fica de fora por esquecimento — um comando só cobre todos.
 *
 *   node tools/bancadas/criar.mjs _viga
 *   node tools/bancadas/criar.mjs _viga --res=1200
 *
 * Exit 0 = APROVADO, exit 1 = REPROVADO (algum gate obrigatório falhou).
 */
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { readFileSync, mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, pngStats } from './bench/pngstats.mjs';
import { mascaraParaPng, sobreposicaoParaPng } from './bench/pngwrite.mjs';
import { extrairSilhueta, rasterizarContorno, validarContorno, iou, areaMascara, LIMIAR_IOU } from './bench/gabarito-nucleo.mjs';
import { executarNucleoDaPeca } from './estado-peca.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(HERE, 'out');
const PECAS = join(REPO, 'prototipos/procedural/v3/pecas');
const GABARITOS = join(REPO, 'prototipos/procedural/v3/gabaritos');

const args = process.argv.slice(2);
const nome = (args.find((a) => !a.startsWith('--')) || '').replace(/[^a-z0-9_-]/gi, '');
const res = /^--res=(\d+)$/.exec(args.find((a) => a.startsWith('--res=')) || '')?.[1] || '900';
if (!nome) { console.error('uso: node tools/bancadas/criar.mjs <peça> [--res=N]'); process.exit(2); }
if (!existsSync(join(PECAS, `${nome}.js`))) {
  const haReceitas = readdirSync(PECAS).some((arquivo) => arquivo.endsWith('.js'));
  console.error(haReceitas
    ? `peça desconhecida: ${nome} (veja prototipos/procedural/v3/pecas/)`
    : 'catálogo de peças está vazio; informe uma receita autorizada antes de executar criar');
  process.exit(2);
}

const linhas = [];
const log = (s = '') => { linhas.push(s); console.log(s); };
let reprovado = false;
const falha = (motivo) => { reprovado = true; log(`  ✗ ${motivo}`); };
const ok = (motivo) => log(`  ✓ ${motivo}`);

log(`═══ criar — ${nome} ═══`);

/* 1 · ESTADO COMO DADO (headless, direto do núcleo — sem browser) */
log('\n── estado (núcleo) ──');
const { nucleo, neutroCanonico, colisaoDe, REGISTRO_OPERACOES, catalogoDeCapacidades } = await import(pathToFileURL(join(REPO, 'prototipos/procedural/v3/motor/oficina.js')).href);
const mod = await import(pathToFileURL(join(PECAS, `${nome}.js`)).href);
const temPassos = Array.isArray(mod.PASSOS);
if (temPassos) {
  try {
    const n = neutroCanonico(executarNucleoDaPeca(nucleo, mod));
    // linha de V é [id, x, y, z, ...] (achatada — ver o comentário de neutroCanonico), não [id,[x,y,z]]
    const xs = n.V.map((v) => v[1]), ys = n.V.map((v) => v[2]), zs = n.V.map((v) => v[3]);
    const caixa = n.V.length ? { min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)], max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)] } : null;
    log(`  vértices=${n.V.length}  faces=${n.F.length}  passos=${mod.PASSOS.length}`);
    if (caixa) log(`  caixa: [${caixa.min.map((v) => v.toFixed(3))}] .. [${caixa.max.map((v) => v.toFixed(3))}]`);
    const col = colisaoDe(mod.PASSOS, mod.PARAMS ?? {}, mod.TOPO ?? {}, mod.MATERIAIS ?? {});
    log(`  colisão: forma=${col.forma} raio=${col.raio.toFixed(4)} altura=${col.altura.toFixed(4)} base=${col.base.toFixed(4)}`);
    if (n.orfaos.length === 0) ok('sem órfãos (grita 0)'); else falha(`${n.orfaos.length} órfão(s): ${JSON.stringify(n.orfaos).slice(0, 200)}`);
  } catch (e) { falha(`núcleo lançou: ${e.message}`); }
} else {
  log('  peça JS-pura (sem PASSOS/PARAMS/TOPO exportado) — sem estado de núcleo pra inspecionar, só os gates abaixo');
}

/* 2 · CATÁLOGO DE CAPACIDADES — projeção do registro, sem reconciliação por regex. */
log("\n── catálogo de capacidades ──");
const catalogo = catalogoDeCapacidades(REGISTRO_OPERACOES);
log(`  ${catalogo.operacoes.length} operações registradas; assinatura=${catalogo.assinatura}`);
ok("catálogo deriva diretamente do registro do núcleo; npm run catalogo:check confere os artefatos publicados");

/* 3 · BROWSER (uma vez só) — porteiro, renders (evidência), gabarito */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = createServer((req, res2) => {
  const p = join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(REPO) || !existsSync(p)) { res2.writeHead(404); res2.end(); return; }
  res2.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res2.end(readFileSync(p));
});
await new Promise((ok2) => server.listen(0, '127.0.0.1', ok2));
const base = `http://127.0.0.1:${server.address().port}/prototipos/procedural/v3/visor.html`;
const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) { console.error('Playwright não encontrado. Rode: npm ci (na raiz)'); process.exit(2); }
const pw = (await import(pathToFileURL(PW).href)).default;
const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const RES = parseInt(res, 10), VW = Math.max(900, RES), VH = Math.round(VW * 9 / 16);
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const errosPagina = [];
page.on('pageerror', (e) => errosPagina.push(e.message));
mkdirSync(OUT, { recursive: true });
const gabaritoPath = join(GABARITOS, `${nome}.js`);   // declarado fora do try abaixo: o veredito final (depois do finally) também lê

async function screenshot(peca, angulo, extra = '') {
  await page.goto(`${base}?peca=${peca}&res=${res}&ts=4&a=${angulo}${extra}`, { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  const ready = await page.evaluate(() => window.__ready === true);
  const buf = await page.screenshot();
  return { ready, buf };
}

try {

/* 4a · porteiro (a checagem de render — reusa a 1ª navegação) */
log('\n── porteiro (render) ──');
const primeira = await screenshot(nome, '38');
if (!primeira.ready) falha('window.__ready ≠ true (peça não abriu)');
try {
  const s = pngStats(primeira.buf);
  if (s.cores < 4 || s.fracDominante > 0.985 || s.lumaRange < 6) falha(`frame degenerado (cores=${s.cores}, dominante=${(s.fracDominante * 100) | 0}%, luma=${s.lumaRange})`);
  else ok(`frame são (cores=${s.cores}, dominante=${(s.fracDominante * 100) | 0}%, luma=${s.lumaRange})`);
} catch (e) { falha('frame ilegível: ' + e.message); }
if (errosPagina.length) falha(`${errosPagina.length} erro(s) de página: ${errosPagina.slice(0, 2).join(' ; ')}`);

/* 4b · renders — a EVIDÊNCIA forçada (3 ângulos texturizados + 3 geo=normais) */
log('\n── renders (evidência — LEIA os PNGs) ──');
const ANGULOS = ['38', '0', '90'];
writeFileSync(join(OUT, `criar-${nome}-38.png`), primeira.buf);   // já screenshotada pro porteiro, reusa
log(`  ${join(OUT, `criar-${nome}-38.png`)}`);
for (const a of ANGULOS.slice(1)) {
  const r = await screenshot(nome, a);
  writeFileSync(join(OUT, `criar-${nome}-${a}.png`), r.buf);
  log(`  ${join(OUT, `criar-${nome}-${a}.png`)}`);
}
for (const a of ANGULOS) {
  const r = await screenshot(nome, a, '&debug=normais');
  writeFileSync(join(OUT, `criar-${nome}-normais-${a}.png`), r.buf);
  log(`  ${join(OUT, `criar-${nome}-normais-${a}.png`)}`);
}

/* 4c · gabarito (SÓ se existir referência — opcional, mas se existir é obrigatório passar) */
log('\n── gabarito (IoU) ──');
if (!existsSync(gabaritoPath)) {
  log('  sem gabarito (prototipos/procedural/v3/gabaritos/) — forma NÃO verificada numericamente; não é reprovação, mas também não é "aprovado" nesse eixo');
} else {
  try {
    const { CONTORNOS } = await import(pathToFileURL(gabaritoPath).href);
    const angulos = Object.keys(CONTORNOS ?? {});
    if (!angulos.length) throw new Error('CONTORNOS vazio');
    let piorIou = Infinity;
    for (const angulo of angulos) {
      const contorno = validarContorno(CONTORNOS[angulo], `CONTORNOS['${angulo}']`);
      const fundoR = await screenshot('_vazio', angulo);
      const objR = await screenshot(nome, angulo);
      if (!fundoR.ready || !objR.ready) { falha(`gabarito @${angulo}°: peça ou fundo não abriram`); piorIou = 0; continue; }
      const sil = extrairSilhueta(decodePng(fundoR.buf), decodePng(objR.buf));
      if (areaMascara(sil) === 0) { falha(`gabarito @${angulo}°: silhueta vazia`); piorIou = 0; continue; }
      const ref = rasterizarContorno(contorno, sil.W, sil.H);
      const pontuacao = iou(sil, ref);
      piorIou = Math.min(piorIou, pontuacao);
      const passouAngulo = pontuacao >= LIMIAR_IOU;
      const evidPath = join(OUT, `criar-${nome}-gabarito-${angulo}`);
      writeFileSync(`${evidPath}-sobreposicao.png`, sobreposicaoParaPng(sil, ref));
      log(`  ${passouAngulo ? '✓' : '✗'} @${angulo}°: IoU=${pontuacao.toFixed(3)} (limiar ${LIMIAR_IOU}) — ${evidPath}-sobreposicao.png`);
      if (!passouAngulo) reprovado = true;
    }
    if (Number.isFinite(piorIou) && piorIou >= LIMIAR_IOU) ok(`forma verificada — pior IoU ${piorIou.toFixed(3)}`);
  } catch (e) { falha(`gabarito malformado ou falhou: ${e.message}`); }
}

} catch (e) {
  falha(`bancada de render quebrou no meio: ${e.message}`);
} finally {
  await browser.close(); server.close();
}

/* 5 · VEREDITO AGREGADO */
log(`\n═══ ${reprovado ? 'REPROVADO ✗' : 'APROVADO ✓'} — ${nome} ═══`);
if (!existsSync(gabaritoPath)) log('  (sem gabarito: a forma não tem número — "aprovado" aqui é núcleo+porteiro, não silhueta)');
process.exit(reprovado ? 1 : 0);
