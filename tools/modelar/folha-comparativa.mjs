#!/usr/bin/env node
/* folha-comparativa.mjs — a fonte e a receita lado a lado, nas MESMAS câmeras e na MESMA escala, e a vista de diferença que marca onde a receita sobra ou falta.

   Uso: node tools/modelar/folha-comparativa.mjs <receita.js> <fonte-partes.json> --saida <pasta> [--imagem <fonte-vistas.png>] [--folga-px <n>]

   A fonte vem de `modelo-de-referencia.mjs`: o `partes.json` (caixa total, frente) e a imagem `fonte-vistas.png` com as quatro vistas ortográficas (isométrica, lateral com a frente
   à esquerda, frontal e de cima), por padrão a que está na pasta do `partes.json`. A receita é rasterizada com as câmeras DESSA imagem: o mesmo centro, a mesma direção e a
   mesma escala (a meia altura visível é 1,1 vez o raio da caixa da fonte), então cada pixel da receita cai onde cai o da fonte. Escreve em `<saida>/`: `folha.png` (uma linha por vista,
   com a fonte, a receita e a diferença) e `diferenca.json` (por vista, a área de cada máscara, a sobra e a falta em porcentagem da área da fonte, a razão de interseção e as regiões maiores, em
   milímetro). Na diferença, azul é onde só a receita tem corpo (sobra), vermelho é onde só a fonte tem (falta) e cinza claro é onde as duas têm, ou ficam a até `--folga-px` pixel
   uma da outra (padrão 1), que é a borda serrilhada. A máscara é a silhueta: vê a roda escondida ou ausente, a cabine que não afunila (na frontal) e o nariz em rampa (na lateral), mas
   não vê relevo dentro da silhueta; para isso olhe a coluna da receita, colorida por parte. A ferramenta mede e mostra, e quem aprova forma é a pessoa. Recusa fonte sem `frente`. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { QUADRO_DA_FONTE, VISTAS_DA_FONTE, enquadramentoDaFonte } from './modelo-de-referencia.mjs';
import { rasterDaVista } from './vistas-de-passos.mjs';
import { exigirFrente } from './frente-da-fonte.mjs';
import { corCssDaParte, poligonosDaReceita } from './vistas-da-receita.mjs';
import { importarReceita } from './triangulos-da-receita.mjs';

const FUNDO = [244, 242, 238];
const { W, H, folga: FOLGA_DA_CAMERA } = QUADRO_DA_FONTE;
/* O rótulo que `modelo-de-referencia` escreve no canto de cada quadro, em pixel dentro do quadro: fica fora da máscara. */
const ROTULO = { x: 330, y: 32 };

/** O enquadre de uma vista da fonte em pixel por milímetro: o mesmo da câmera ortográfica de `modelo-de-referencia`. `direita` e `cima` são os vetores da tela. */
export function enquadreDaVista(total, [, posicao, up]) {
  const { centro, raio } = enquadramentoDaFonte(total);
  const e = (H / 2) / (raio * FOLGA_DA_CAMERA * 1000);
  const dir = posicao.map((x) => -x); const n = Math.hypot(...dir); const d = dir.map((x) => x / n);
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const un = (v) => { const m = Math.hypot(...v); return v.map((x) => x / m); };
  const direita = un(cruz(d, up)); const cima = un(cruz(direita, d));
  const c = centro.map((x) => x * 1000); const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return { dir: d, up, direita, cima, enquadre: { e, dx: W / 2 - dot(c, direita) * e, dy: H / 2 + dot(c, cima) * e } };
}

/** Máscara (W por H, 1 = corpo) do quadro `indice` (0 a 3) de `fonte-vistas.png`: o pixel que difere do fundo, fora do rótulo. */
export function mascaraDaFonte(png, indice) {
  const x0 = (indice % 2) * W; const y0 = Math.floor(indice / 2) * H;
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (x < ROTULO.x && y < ROTULO.y) continue;
    const i = ((y0 + y) * png.width + x0 + x) * 4;
    if (Math.max(Math.abs(png.data[i] - FUNDO[0]), Math.abs(png.data[i + 1] - FUNDO[1]), Math.abs(png.data[i + 2] - FUNDO[2])) > 10) m[y * W + x] = 1;
  }
  return m;
}

/** Máscara da receita no mesmo quadro: a rasterização em 2x2 desce para 1x1 com o pixel contado se metade das amostras cobre. */
function mascaraDoRaster(r) {
  const { w, S } = r; const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    let n = 0; for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) if (r.quem[(y * S + j) * w + x * S + i] !== -1) n += 1;
    if (n * 2 >= S * S) m[y * W + x] = 1;
  }
  return m;
}

function dilatar(m, raio) {
  if (raio <= 0) return m;
  const o = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (!m[y * W + x]) continue;
    for (let j = Math.max(0, y - raio); j <= Math.min(H - 1, y + raio); j += 1) for (let i = Math.max(0, x - raio); i <= Math.min(W - 1, x + raio); i += 1) o[j * W + i] = 1;
  }
  return o;
}

/** As regiões conexas (4 vizinhos) de uma máscara, as `n` maiores com mais de `minimo` pixels: `{ pixels, caixa: [xmin, ymin, xmax, ymax] }` em pixel. */
function regioes(m, n, minimo) {
  const visto = new Uint8Array(W * H); const todas = [];
  for (let s = 0; s < W * H; s += 1) {
    if (!m[s] || visto[s]) continue;
    const pilha = [s]; visto[s] = 1; let pixels = 0; const caixa = [W, H, 0, 0];
    while (pilha.length) {
      const p = pilha.pop(); const x = p % W; const y = (p - x) / W; pixels += 1;
      if (x < caixa[0]) caixa[0] = x; if (y < caixa[1]) caixa[1] = y; if (x > caixa[2]) caixa[2] = x; if (y > caixa[3]) caixa[3] = y;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) if (q >= 0 && m[q] && !visto[q]) { visto[q] = 1; pilha.push(q); }
    }
    if (pixels >= minimo) todas.push({ pixels, caixa });
  }
  return todas.sort((a, b) => b.pixels - a.pixels).slice(0, n);
}

/** Em que eixos do modelo estão a horizontal e a vertical da tela de uma vista ortográfica alinhada aos eixos (null na isométrica), com o sinal de cada um. */
function eixosDaTela({ direita, cima }) {
  const eixo = (v) => { const i = v.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-6); return i >= 0 && v.every((x, k) => k === i || Math.abs(x) < 1e-6) ? { i, s: Math.sign(v[i]) } : null; };
  const h = eixo(direita); const v = eixo(cima);
  return h && v ? { h, v } : null;
}

const NOME_DA_VISTA = ['isométrica frente-direita', 'lateral direita (frente à esquerda)', 'frontal', 'de cima (frente embaixo)'];

/** Compara a receita com a fonte nas quatro câmeras. `png` é a imagem `fonte-vistas.png` já decodificada. Devolve, por vista, as máscaras, os rasters e os números. */
export function compararVistas(receita, fonte, png, { folgaPx = 1 } = {}) {
  exigirFrente(fonte, 'fonte-partes.json');
  if (png.width !== 2 * W || png.height !== 2 * H) throw new Error(`a imagem da fonte tem ${png.width}x${png.height} px e a folha espera ${2 * W}x${2 * H} (quatro quadros de ${W}x${H}); regere com modelo-de-referencia.mjs`);
  const dados = poligonosDaReceita(receita);
  const vistas = VISTAS_DA_FONTE.map((v, indice) => {
    const cam = enquadreDaVista(fonte.total, v);
    const raster = rasterDaVista(dados.polis, dados.indice, [v[0], cam.dir, cam.up], W, H, { enquadre: cam.enquadre, S: 2 });
    const mf = mascaraDaFonte(png, indice); const mr = mascaraDoRaster(raster);
    const df = dilatar(mf, folgaPx); const dr = dilatar(mr, folgaPx);
    const sobra = new Uint8Array(W * H); const falta = new Uint8Array(W * H);
    let aF = 0; let aR = 0; let nSobra = 0; let nFalta = 0; let inter = 0;
    for (let i = 0; i < W * H; i += 1) {
      aF += mf[i]; aR += mr[i]; inter += mf[i] & mr[i];
      if (mr[i] && !df[i]) { sobra[i] = 1; nSobra += 1; }
      if (mf[i] && !dr[i]) { falta[i] = 1; nFalta += 1; }
    }
    const mm2 = (1 / cam.enquadre.e) ** 2;
    const eixos = eixosDaTela(cam);
    const paraMm = (px, py) => ({ s: (px - cam.enquadre.dx) / cam.enquadre.e, t: -(py - cam.enquadre.dy) / cam.enquadre.e });
    const descrever = (lista) => lista.map(({ pixels, caixa }) => {
      const a = paraMm(caixa[0], caixa[1]); const b = paraMm(caixa[2] + 1, caixa[3] + 1);
      const r = { areaMm2: Math.round(pixels * mm2), pctDaFonte: aF ? +(100 * pixels / aF).toFixed(2) : 0 };
      if (eixos) {
        const ranges = (valor, eixo) => { const x = [valor[0], valor[1]].map((q) => q * eixo.s).sort((p, q) => p - q); return x.map((q) => Math.round(q)); };
        const hh = ranges([a.s, b.s], eixos.h); const vv = ranges([a.t, b.t], eixos.v);
        r[`${'xyz'[eixos.h.i]}Mm`] = hh; r[`${'xyz'[eixos.v.i]}Mm`] = vv;
      } else r.caixaPx = caixa;
      return r;
    });
    return {
      rotulo: NOME_DA_VISTA[indice], indice, raster, mascaraFonte: mf, mascaraReceita: mr, sobra, falta, mm2,
      numeros: {
        vista: NOME_DA_VISTA[indice], areaFonteMm2: Math.round(aF * mm2), areaReceitaMm2: Math.round(aR * mm2),
        sobraPct: aF ? +(100 * nSobra / aF).toFixed(2) : 0, faltaPct: aF ? +(100 * nFalta / aF).toFixed(2) : 0, interseccaoSobreUniao: +(inter / (aF + aR - inter || 1)).toFixed(4),
        regioesQueSobram: descrever(regioes(sobra, 5, 12)), regioesQueFaltam: descrever(regioes(falta, 5, 12)),
      },
    };
  });
  return { vistas, partes: dados.partes, nome: dados.nome, folgaPx };
}

const png = (largura, altura, rgba) => { const p = new PNG({ width: largura, height: altura }); p.data = Buffer.from(rgba); return `data:image/png;base64,${PNG.sync.write(p).toString('base64')}`; };

/** O quadro da diferença como imagem: cinza claro onde as duas têm corpo, azul onde só a receita, vermelho onde só a fonte. */
function imagemDaDiferenca(v) {
  const o = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    let c = FUNDO;
    if (v.mascaraFonte[i] || v.mascaraReceita[i]) c = [205, 205, 205];
    if (v.sobra[i]) c = [30, 90, 230];
    if (v.falta[i]) c = [225, 30, 30];
    o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = 255;
  }
  return png(W, H, o);
}

function imagemDoRaster(r) {
  const o = new Uint8Array(r.w * r.h * 4);
  for (let i = 0; i < r.w * r.h; i += 1) { o[i * 4] = r.rgb[i * 3]; o[i * 4 + 1] = r.rgb[i * 3 + 1]; o[i * 4 + 2] = r.rgb[i * 3 + 2]; o[i * 4 + 3] = 255; }
  return png(r.w, r.h, o);
}

function imagemDoQuadroDaFonte(pngFonte, indice) {
  const x0 = (indice % 2) * W; const y0 = Math.floor(indice / 2) * H; const o = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) { const s = ((y0 + y) * pngFonte.width + x0 + x) * 4; const d = (y * W + x) * 4; o[d] = pngFonte.data[s]; o[d + 1] = pngFonte.data[s + 1]; o[d + 2] = pngFonte.data[s + 2]; o[d + 3] = 255; }
  return png(W, H, o);
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** O HTML da folha: uma linha por vista (fonte, receita, diferença) e o resumo em números. */
export function htmlDaFolha(res, pngFonte, titulo) {
  const linhas = res.vistas.map((v) => {
    const n = v.numeros;
    const onde = (lista, quem) => lista.slice(0, 2).map((r) => `${quem}: ${Object.entries(r).filter(([k]) => /Mm$/.test(k) && k !== 'areaMm2').map(([k, x]) => `${k.replace('Mm', '')} ${x[0]}..${x[1]}`).join(', ')} (${r.pctDaFonte}%)`).join(' · ');
    const legenda = `${esc(n.vista)} — sobra ${n.sobraPct}% e falta ${n.faltaPct}% da área da fonte, interseção sobre união ${n.interseccaoSobreUniao}`;
    return `<div class="l"><div class="q"><img src="${imagemDoQuadroDaFonte(pngFonte, v.indice)}" width="${W}" height="${H}"><div class="t" style="top:auto;bottom:6px">fonte</div></div>`
      + `<div class="q"><img src="${imagemDoRaster(v.raster)}" width="${W}" height="${H}"><div class="t" style="top:auto;bottom:6px">receita (cada parte uma cor)</div></div>`
      + `<div class="q"><img src="${imagemDaDiferenca(v)}" width="${W}" height="${H}"><div class="t">${legenda}</div></div></div>`
      + `<div class="o">${esc(onde(n.regioesQueSobram, 'sobra'))}${n.regioesQueSobram.length && n.regioesQueFaltam.length ? ' · ' : ''}${esc(onde(n.regioesQueFaltam, 'falta'))}</div>`;
  }).join('');
  return `<html><body style="margin:0;background:#f4f2ee;font-family:sans-serif"><div style="padding:8px 12px;font-size:18px"><b>${esc(titulo)}</b> — fonte e receita na mesma câmera e escala; diferença: <span style="color:#1e5ae6">azul = a receita sobra</span>, <span style="color:#e11e1e">vermelho = a receita falta</span>, cinza = coincide</div>${linhas}`
    + '<style>.l{display:grid;grid-template-columns:repeat(3,640px)}.q{position:relative;border:1px solid #ddd}.t{position:absolute;left:8px;top:6px;font-size:14px;background:#fffd;padding:2px 6px}.o{font-size:13px;padding:2px 12px 8px}</style></body></html>';
}

/** Gera `folha.png` e `diferenca.json` em `saida`. Devolve os números por vista. */
export async function folhaComparativa(receita, fonte, pngFonte, saida, { folgaPx = 1, nome = null } = {}) {
  const res = compararVistas(receita, fonte, pngFonte, { folgaPx });
  mkdirSync(saida, { recursive: true });
  const { chromium } = await import('playwright');
  const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  try {
    const pg = await navegador.newPage({ viewport: { width: 3 * W, height: 4 * (H + 30) + 60 } });
    await pg.setContent(htmlDaFolha(res, pngFonte, nome ?? res.nome));
    await pg.screenshot({ path: join(saida, 'folha.png'), fullPage: true });
  } finally { await navegador.close(); }
  const numeros = res.vistas.map((v) => v.numeros);
  writeFileSync(join(saida, 'diferenca.json'), `${JSON.stringify({ peca: nome ?? res.nome, folgaPx, frente: fonte.frente, vistas: numeros }, null, 1)}\n`);
  return numeros;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const COM_VALOR = ['--saida', '--imagem', '--folga-px'];
  const valor = (flag) => { const i = a.indexOf(flag); return i >= 0 ? a[i + 1] : null; };
  const [receitaArq, fonteArq] = a.filter((x, i) => !x.startsWith('--') && !COM_VALOR.includes(a[i - 1]));
  if (!receitaArq || !fonteArq || !valor('--saida')) { console.error('uso: node tools/modelar/folha-comparativa.mjs <receita.js> <fonte-partes.json> --saida <pasta> [--imagem <fonte-vistas.png>] [--folga-px <n>]'); process.exit(2); }
  try {
    const fonte = JSON.parse(readFileSync(resolve(fonteArq), 'utf8'));
    const imagem = resolve(valor('--imagem') ?? join(dirname(resolve(fonteArq)), 'fonte-vistas.png'));
    const numeros = await folhaComparativa(await importarReceita(receitaArq), fonte, PNG.sync.read(readFileSync(imagem)), resolve(valor('--saida')), { folgaPx: valor('--folga-px') !== null ? parseInt(valor('--folga-px'), 10) : 1 });
    for (const n of numeros) console.log(`${n.vista}: sobra ${n.sobraPct}% e falta ${n.faltaPct}% da área da fonte (interseção sobre união ${n.interseccaoSobreUniao})`);
    console.log(`folha: ${join(resolve(valor('--saida')), 'folha.png')}`);
  } catch (e) { console.error(`folha-comparativa: ${e.message}`); process.exit(2); }
}
