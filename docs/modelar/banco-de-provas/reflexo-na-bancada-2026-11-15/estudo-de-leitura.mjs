#!/usr/bin/env node
/* estudo-de-leitura.mjs — o estudo de leitura da zebra e da pintura nas chapas de calibração (plano do reflexo na bancada, fatia 7).
 *
 * Captura, para cada chapa de `tools/fixtures/reflexo-calibracao/chapas.mjs`, a zebra (duas larguras de listra), a pintura e a imagem
 * de uma cor por parte (que dá onde fica a emenda na imagem), nas vistas frontal, isometrica e tresquartos, enquadradas, com a chapa
 * como está (a emenda vertical) e girada 45 graus no próprio plano (`giroGraus`). As receitas de cada caso são geradas em
 * tmp/estudo-leitura/receitas/ e as imagens ficam em tmp/estudo-leitura/capturas/.
 *
 * Mede em cada imagem, perto da emenda e em toda a chapa:
 *  - a fração de pixels que muda contra a chapa lisa na mesma vista (|luminância| acima de 40/255);
 *  - a direção das listras de cada lado da emenda (o tensor de estrutura do gradiente numa faixa de 8 a 40 px da emenda) e a dobra, a
 *    diferença entre os dois lados, em graus;
 *  - o deslocamento das listras na emenda: cada borda de listra de um lado é levada pela direção das listras até a linha da emenda, e
 *    a distância ao longo da emenda até a borda de mesma polaridade do outro lado, em px e em fração do período;
 *  - o espaçamento das listras de cada lado (o período, pelo número de bordas ao longo de uma linha paralela à emenda a 12 px dela) e a
 *    razão entre os dois lados;
 *  - o serpentear: cada borda de listra seguida coluna a coluna, ajustada por um polinômio de grau 2, e o resíduo entre os percentis 5 e
 *    95, em px, mediano entre as bordas.
 *
 * Com `--ferramentas`, roda nas mesmas chapas, sem giro, o pente, o mapa de desvio, a continuidade nas emendas (raio de 50, 25 e 15 mm) e
 * o índice de suavidade, e grava estudo-de-leitura-ferramentas.json e estudo-ferramentas.jpg.
 *
 * Uso: node docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/estudo-de-leitura.mjs [--capturar] [--medir] [--figuras] [--ferramentas]
 *   (sem opção, faz os três primeiros). O JSON vai para estudo-de-leitura.json desta pasta e as figuras, para estudo-*.jpg. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import sharp from 'sharp';
import { comoCLI } from '../../../../tools/modelar/olhar-bancada.mjs';
import { CHAPAS } from '../../../../tools/fixtures/reflexo-calibracao/chapas.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const AQUI = resolve(fileURLToPath(new URL('.', import.meta.url)));
const BASE = join(REPO, 'tmp/estudo-leitura');
const VISTAS = ['frontal', 'isometrica', 'tresquartos'];
const GIROS = [0, 45];
const LARGURAS = [3, 9];
const FUNDO = [242, 244, 243];
const NOMES = Object.keys(CHAPAS);

const caso = (nome, giro) => `g${giro}-${nome}`;

function receita(nome, giro) {
  const pasta = join(BASE, 'receitas', caso(nome, giro));
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'receita.js'), `import { chapaDeCalibracao } from '../../../../tools/fixtures/reflexo-calibracao/chapas.mjs';\nexport default chapaDeCalibracao('${nome}', { giroGraus: ${giro} });\n`);
  return relative(REPO, pasta);
}

/* as capturas de um caso: a zebra nas duas larguras, a pintura e as cores por parte */
const CAPTURAS = [
  ...LARGURAS.map((l) => ({ id: `zebra-${l}`, args: ['--visao=zebra', `--largura-da-zebra=${l}`] })),
  { id: 'pintura', args: ['--visao=pintura'] },
  { id: 'cores', args: ['--cores'] },
];

async function capturar() {
  for (const giro of GIROS) for (const nome of NOMES) {
    const peca = receita(nome, giro);
    for (const c of CAPTURAS) {
      const saida = relative(REPO, join(BASE, 'capturas', caso(nome, giro), c.id));
      if (existsSync(join(REPO, saida)) && readdirSync(join(REPO, saida)).filter((a) => a.endsWith('.png')).length === VISTAS.length) continue;
      const r = await comoCLI([peca, `--vistas=${VISTAS.join(',')}`, '--enquadrar', '--sem-contatos', '--res=900x900', `--saida=${saida}`, ...c.args]);
      if (r.codigo !== 0) throw new Error(`${peca} ${c.id}: ${r.stderr}`);
      process.stderr.write(`capturado ${caso(nome, giro)} ${c.id}\n`);
    }
  }
}

const arquivoDe = (nome, giro, id, vista) => {
  const pasta = join(BASE, 'capturas', caso(nome, giro), id);
  const a = readdirSync(pasta).find((f) => f.includes(`-${vista}-`) && f.endsWith('.png'));
  return join(pasta, a);
};
const lerPng = (arquivo) => { const p = PNG.sync.read(readFileSync(arquivo)); return { W: p.width, H: p.height, d: p.data }; };
const lumDe = (img, k) => (0.2126 * img.d[4 * k] + 0.7152 * img.d[4 * k + 1] + 0.0722 * img.d[4 * k + 2]);
const ehFundo = (img, k) => Math.abs(img.d[4 * k] - FUNDO[0]) + Math.abs(img.d[4 * k + 1] - FUNDO[1]) + Math.abs(img.d[4 * k + 2] - FUNDO[2]) <= 3;
const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);

/* a emenda na imagem das cores por parte: os pixels de parte em que o vizinho é da outra parte, e a reta por eles (ponto e direção) */
function emendaDaImagem(cores) {
  const { W, H } = cores;
  const lado = new Int8Array(W * H);
  for (let k = 0; k < W * H; k++) if (!ehFundo(cores, k)) lado[k] = cores.d[4 * k] > cores.d[4 * k + 2] ? 1 : -1;
  const pts = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const k = y * W + x;
    if (lado[k] !== -1) continue;
    if (lado[k + 1] === 1 || lado[k + W] === 1 || lado[k - 1] === 1 || lado[k - W] === 1) pts.push([x, y]);
  }
  const n = pts.length; const mx = pts.reduce((s, p) => s + p[0], 0) / n; const my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0; let syy = 0; let sxy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const t = [Math.cos(ang), Math.sin(ang)];
  /* a normal aponta para o lado da folha direita */
  let nrm = [-t[1], t[0]];
  let s = 0; for (let k = 0; k < W * H; k++) if (lado[k] === 1) { const x = k % W; const y = (k - x) / W; s += (x - mx) * nrm[0] + (y - my) * nrm[1]; }
  if (s < 0) nrm = [-nrm[0], -nrm[1]];
  return { ponto: [mx, my], t, n: nrm, pixels: n, lado };
}

/* o tom binário da listra: a luminância acima do limiar de Otsu dentro da peça */
function limiarDeOtsu(img, mascara) {
  const h = new Array(256).fill(0); let n = 0;
  for (let k = 0; k < img.W * img.H; k++) if (mascara[k]) { h[Math.min(255, Math.round(lumDe(img, k)))]++; n++; }
  let soma = 0; for (let i = 0; i < 256; i++) soma += i * h[i];
  let sB = 0; let wB = 0; let melhor = 0; let limiar = 128;
  for (let i = 0; i < 256; i++) {
    wB += h[i]; if (!wB) continue; const wF = n - wB; if (!wF) break;
    sB += i * h[i]; const mB = sB / wB; const mF = (soma - sB) / wF; const v = wB * wF * (mB - mF) ** 2;
    if (v > melhor) { melhor = v; limiar = i; }
  }
  return limiar + 0.5;
}

function medirImagem(img, emenda, lisa) {
  const { W, H } = img;
  const mascara = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) mascara[k] = ehFundo(img, k) ? 0 : 1;
  /* a máscara de dentro: a 6 px ou mais da borda da peça */
  const dentro = new Uint8Array(W * H);
  const R = 6;
  for (let y = R; y < H - R; y++) for (let x = R; x < W - R; x++) {
    let ok = true;
    for (let dy = -R; dy <= R && ok; dy += R) for (let dx = -R; dx <= R; dx += R) if (!mascara[(y + dy) * W + x + dx]) { ok = false; break; }
    dentro[y * W + x] = ok ? 1 : 0;
  }
  const limiar = limiarDeOtsu(img, dentro);
  const claro = (x, y) => lumDe(img, y * W + x) > limiar;
  const dist = (x, y) => (x - emenda.ponto[0]) * emenda.n[0] + (y - emenda.ponto[1]) * emenda.n[1];
  const aolongo = (x, y) => (x - emenda.ponto[0]) * emenda.t[0] + (y - emenda.ponto[1]) * emenda.t[1];

  /* a mudança contra a lisa */
  let mudou = 0; let n = 0;
  for (let k = 0; k < W * H; k++) if (mascara[k] || !ehFundo(lisa, k)) { n++; if (Math.abs(lumDe(img, k) - lumDe(lisa, k)) > 40) mudou++; }

  /* a direção das listras de cada lado, pelo tensor de estrutura (Sobel) na faixa de 8 a 40 px da emenda */
  const tensor = { '-1': [0, 0, 0], 1: [0, 0, 0] };
  const L = (x, y) => lumDe(img, y * W + x);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!dentro[y * W + x]) continue;
    const d = dist(x, y); const s = Math.sign(d);
    if (Math.abs(d) < 8 || Math.abs(d) > 40) continue;
    const gx = -L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1) + L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1);
    const gy = -L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1) + L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1);
    const T = tensor[s]; T[0] += gx * gx; T[1] += gy * gy; T[2] += gx * gy;
  }
  /* a direção da listra é perpendicular ao gradiente dominante; em graus da horizontal da imagem, de -90 a 90 */
  const direcao = (T) => { const a = 0.5 * Math.atan2(2 * T[2], T[0] - T[1]) + Math.PI / 2; let g = (a * 180) / Math.PI; while (g > 90) g -= 180; while (g <= -90) g += 180; return g; };
  const dirE = direcao(tensor[-1]); const dirD = direcao(tensor[1]);
  let dobra = dirD - dirE; while (dobra > 90) dobra -= 180; while (dobra <= -90) dobra += 180;

  /* O DESLOCAMENTO DA FAIXA CONTRA A CHAPA LISA. Com a câmera parada, a listra só anda porque a normal mudou. A direção das listras da
     lisa na mesma vista dá a normal delas (nL); cada pixel de borda da chapa medida (Sobel acima de 200) procura, ao longo de nL na
     imagem binária da lisa, a borda de mesma polaridade mais perto, até meio período; a distância com sinal é o quanto a faixa andou ali. */
  const Lb = (x, y) => lumDe(lisa, y * W + x);
  const dentroL = new Uint8Array(W * H);
  for (let y = R; y < H - R; y++) for (let x = R; x < W - R; x++) {
    let ok = true;
    for (let dy = -R; dy <= R && ok; dy += R) for (let dx = -R; dx <= R; dx += R) if (ehFundo(lisa, (y + dy) * W + x + dx)) { ok = false; break; }
    dentroL[y * W + x] = ok ? 1 : 0;
  }
  const limiarL = limiarDeOtsu(lisa, dentroL);
  const claroL = (x, y) => Lb(x, y) > limiarL;
  const TL = [0, 0, 0];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!dentroL[y * W + x]) continue;
    const gx = -Lb(x - 1, y - 1) - 2 * Lb(x - 1, y) - Lb(x - 1, y + 1) + Lb(x + 1, y - 1) + 2 * Lb(x + 1, y) + Lb(x + 1, y + 1);
    const gy = -Lb(x - 1, y - 1) - 2 * Lb(x, y - 1) - Lb(x + 1, y - 1) + Lb(x - 1, y + 1) + 2 * Lb(x, y + 1) + Lb(x + 1, y + 1);
    TL[0] += gx * gx; TL[1] += gy * gy; TL[2] += gx * gy;
  }
  const aL = 0.5 * Math.atan2(2 * TL[2], TL[0] - TL[1]); const nL = [Math.cos(aL), Math.sin(aL)];
  /* o período da lisa ao longo de nL, pela mediana do espaço entre bordas em linhas por pontos da peça, vezes 2 */
  const passosDaLisa = [];
  for (let y = 40; y < H - 40; y += 60) for (let x = 40; x < W - 40; x += 60) {
    if (!dentroL[y * W + x]) continue;
    const pos = []; let antes = null;
    for (let s = -600; s <= 600; s++) {
      const xx = Math.round(x + s * nL[0]); const yy = Math.round(y + s * nL[1]);
      if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1 || !dentroL[yy * W + xx]) { antes = null; continue; }
      const c = claroL(xx, yy); if (antes !== null && c !== antes) pos.push(s); antes = c;
    }
    for (let i = 1; i < pos.length; i++) passosDaLisa.push(pos[i] - pos[i - 1]);
  }
  passosDaLisa.sort((p, q) => p - q);
  const periodoDaLisa = passosDaLisa.length ? 2 * passosDaLisa[Math.floor(passosDaLisa.length / 2)] : NaN;
  const meio = Number.isFinite(periodoDaLisa) ? periodoDaLisa / 2 : 200;
  const pontos = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!dentro[y * W + x] || !dentroL[y * W + x]) continue;
    const gx = -L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1) + L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1);
    const gy = -L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1) + L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1);
    if (Math.hypot(gx, gy) < 200) continue;
    /* a polaridade: claro para o lado +nL ou para o lado -nL */
    const polo = Math.sign(gx * nL[0] + gy * nL[1]) || 1;
    let achado = null;
    for (let s = 0; s <= meio && achado === null; s++) for (const sg of s ? [1, -1] : [1]) {
      const d = sg * s;
      const xa = Math.round(x + (d - 1) * polo * nL[0]); const ya = Math.round(y + (d - 1) * polo * nL[1]);
      const xb = Math.round(x + (d + 1) * polo * nL[0]); const yb = Math.round(y + (d + 1) * polo * nL[1]);
      if (xa < 0 || ya < 0 || xb < 0 || yb < 0 || xa >= W || xb >= W || ya >= H || yb >= H) continue;
      if (!dentroL[ya * W + xa] || !dentroL[yb * W + xb]) continue;
      if (!claroL(xa, ya) && claroL(xb, yb)) { achado = d * polo; break; }
    }
    pontos.push({ d: dist(x, y), desl: achado });
  }
  const ok = pontos.filter((p) => p.desl !== null);
  const pct = (v, f) => (v.length ? v[Math.min(v.length - 1, Math.floor(f * v.length))] : NaN);
  const longe = ok.filter((p) => Math.abs(p.d) >= 12).map((p) => Math.abs(p.desl)).sort((p, q) => p - q);
  const semPar = pontos.filter((p) => p.desl === null && Math.abs(p.d) >= 12).length / Math.max(1, pontos.filter((p) => Math.abs(p.d) >= 12).length);
  /* na emenda: a mediana do deslocamento com sinal na faixa de 12 a 50 px de cada lado, e o salto entre os dois */
  const mediana = (v) => { const s = [...v].sort((p, q) => p - q); return pct(s, 0.5); };
  const ladoE = mediana(ok.filter((p) => p.d <= -12 && p.d >= -50).map((p) => p.desl));
  const ladoD = mediana(ok.filter((p) => p.d >= 12 && p.d <= 50).map((p) => p.desl));
  /* a inclinação do deslocamento: quanto ele cresce por 100 px de afastamento da emenda, de cada lado (a quebra de curvatura muda o
     espaçamento de um lado só, e o deslocamento cresce para longe da emenda) */
  const inclinacao = (sinal) => {
    const v = ok.filter((p) => sinal * p.d >= 12 && sinal * p.d <= 250);
    if (v.length < 50) return NaN;
    const mx = v.reduce((s, p) => s + p.d, 0) / v.length; const my = v.reduce((s, p) => s + p.desl, 0) / v.length;
    let sxy = 0; let sxx = 0; for (const p of v) { sxy += (p.d - mx) * (p.desl - my); sxx += (p.d - mx) ** 2; }
    return (100 * sxy) / sxx;
  };
  /* o período de cada lado na própria imagem, ao longo da normal das listras daquele lado, na faixa de 20 a 250 px da emenda */
  const periodoDoLado = (sinal, dirGraus) => {
    const a = ((dirGraus + 90) * Math.PI) / 180; const nn = [Math.cos(a), Math.sin(a)];
    const passos = [];
    for (let y = 30; y < H - 30; y += 40) for (let x = 30; x < W - 30; x += 40) {
      const d0 = dist(x, y); if (sinal * d0 < 20 || sinal * d0 > 250 || !dentro[y * W + x]) continue;
      const pos = []; let antes = null;
      for (let s = -150; s <= 150; s++) {
        const xx = Math.round(x + s * nn[0]); const yy = Math.round(y + s * nn[1]);
        if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1 || !dentro[yy * W + xx] || sinal * dist(xx, yy) < 15) { antes = null; continue; }
        const c = claro(xx, yy); if (antes !== null && c !== antes) pos.push(s); antes = c;
      }
      for (let i = 1; i < pos.length; i++) if (pos[i] - pos[i - 1] >= 4) passos.push(pos[i] - pos[i - 1]);
    }
    passos.sort((p, q) => p - q);
    return passos.length >= 3 ? 2 * pct(passos, 0.5) : NaN;
  };
  const pE = periodoDoLado(-1, dirE); const pD = periodoDoLado(1, dirD);
  return {
    limiar: r2(limiar), mudouContraALisa: Math.round((mudou / Math.max(1, n)) * 10000) / 10000,
    periodoDaLisaPx: r2(periodoDaLisa),
    direcaoEsquerda: r2(dirE), direcaoDireita: r2(dirD), dobraGraus: r2(dobra),
    periodoEsquerdaPx: r2(pE), periodoDireitaPx: r2(pD), razaoDoPeriodo: r2(Math.max(pE, pD) / Math.min(pE, pD)),
    deslocamentoP95Px: r2(pct(longe, 0.95)), deslocamentoP95EmPeriodos: r2(pct(longe, 0.95) / periodoDaLisa), bordasSemPar: r2(semPar),
    saltoNaEmendaPx: r2(ladoD - ladoE), saltoNaEmendaEmPeriodos: r2((ladoD - ladoE) / periodoDaLisa),
    inclinacaoEsquerdaPor100Px: r2(inclinacao(-1)), inclinacaoDireitaPor100Px: r2(inclinacao(1)),
  };
}

/* o resíduo de y contra o polinômio de grau 2 em x, por mínimos quadrados */
function residuoDeGrau2(xs, ys) {
  const n = xs.length; const m = xs.reduce((s, v) => s + v, 0) / n;
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; const b = [0, 0, 0];
  for (let i = 0; i < n; i++) { const t = xs[i] - m; const f = [1, t, t * t]; for (let a = 0; a < 3; a++) { b[a] += f[a] * ys[i]; for (let c = 0; c < 3; c++) S[a][c] += f[a] * f[c]; } }
  const c = resolver(S, b);
  return xs.map((x, i) => { const t = x - m; return ys[i] - (c[0] + c[1] * t + c[2] * t * t); });
}
function resolver(A, b) {
  const M = A.map((l, i) => [...l, b[i]]); const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
  return x;
}

function medir() {
  const saida = { vistas: VISTAS, giros: GIROS, largurasDaZebra: LARGURAS, defeitos: Object.fromEntries(NOMES.map((n) => [n, CHAPAS[n].defeito])), casos: {} };
  for (const giro of GIROS) for (const nome of NOMES) {
    const r = {};
    for (const vista of VISTAS) {
      const emenda = emendaDaImagem(lerPng(arquivoDe(nome, giro, 'cores', vista)));
      r[vista] = { emenda: { angulo: r2((Math.atan2(emenda.t[1], emenda.t[0]) * 180) / Math.PI), pixels: emenda.pixels } };
      for (const id of [...LARGURAS.map((l) => `zebra-${l}`), 'pintura']) {
        const lisa = lerPng(arquivoDe('lisa', giro, id, vista));
        r[vista][id] = medirImagem(lerPng(arquivoDe(nome, giro, id, vista)), emenda, lisa);
      }
    }
    saida.casos[caso(nome, giro)] = r;
    process.stderr.write(`medido ${caso(nome, giro)}\n`);
  }
  writeFileSync(join(AQUI, 'estudo-de-leitura.json'), `${JSON.stringify(saida, null, 1)}\n`);
  return saida;
}

/* as figuras: uma linha por chapa, com a zebra de 3 e de 9 graus e a pintura, numa vista e num giro, reduzidas */
async function figuras() {
  const LADO = 220;
  for (const [giro, vista] of [[0, 'isometrica'], [45, 'frontal'], [45, 'isometrica']]) {
    const blocos = [];
    NOMES.forEach((nome, i) => ['zebra-3', 'zebra-9', 'pintura'].forEach((id, j) => blocos.push({ input: arquivoDe(nome, giro, id, vista), left: j * LADO, top: i * LADO })));
    const entradas = await Promise.all(blocos.map(async (b) => ({ ...b, input: await sharp(b.input).resize(LADO, LADO).toBuffer() })));
    await sharp({ create: { width: 3 * LADO, height: NOMES.length * LADO, channels: 3, background: { r: 242, g: 244, b: 243 } } })
      .composite(entradas).jpeg({ quality: 78 }).toFile(join(AQUI, `estudo-g${giro}-${vista}.jpg`));
  }
}

/* as leituras por número das mesmas chapas, sem giro (elas não dependem da direção da chapa): o pente na seção y = 200 mm, o mapa de
   desvio, a continuidade nas emendas com o raio padrão de 50 mm e com 25 e 15 mm, e o índice de suavidade, todos na pele de fora */
function ferramentas() {
  const pasta = join(BASE, 'medidas'); mkdirSync(pasta, { recursive: true });
  const rodar = (ferramenta, args) => JSON.parse(execFileSync(process.execPath, [join(REPO, 'tools/modelar', ferramenta), ...args], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }));
  const res = {};
  for (const nome of NOMES) {
    const peca = `tools/fixtures/reflexo-calibracao/${nome}`;
    const p = rodar('pente-de-curvatura.mjs', [peca, '--corte=y:200', '--lado=+z', `--saida=${join(pasta, `pente-${nome}.png`)}`]);
    const d = rodar('mapa-de-desvio.mjs', [peca, '--lado=+z', '--vista=frontal', `--saida=${join(pasta, `desvio-${nome}.png`)}`]);
    const emendas = {};
    for (const raio of [50, 25, 15]) {
      const e = rodar('continuidade-nas-emendas.mjs', [peca, '--lado=+z', '--vista=frontal', `--raio=${raio}`, '--amostras=nao', `--saida=${join(pasta, `emendas-${nome}-${raio}.png`)}`]);
      const em = e.emendas[0];
      emendas[raio] = { ...e.resumo, acusa: em?.acusa, medianas: em?.medianas, semAjuste: em?.semAjuste };
    }
    const s = rodar('suavidade-por-regiao.mjs', [peca, '--lado=+z']);
    res[nome] = {
      pente: { curvas: p.curvas.map((c) => ({ comprimentoMm: c.comprimentoMm, ...c.resumo, saltos: c.saltos.length, mudancasDeSinal: c.mudancasDeSinal.length })) },
      desvio: { paraForaMm: d.maximoParaFora.mm, pontoParaFora: d.maximoParaFora.ponto, paraDentroMm: d.maximoParaDentro.mm, pontoParaDentro: d.maximoParaDentro.ponto, rmsMm: d.rmsMm, p98Mm: d.p98AbsolutoMm, escalaDaCorMm: d.escalaDaCorMm },
      emendas,
      suavidade: Object.fromEntries(s.regioes.map((r) => [r.regiao, r.indice])),
    };
    process.stderr.write(`ferramentas ${nome}\n`);
  }
  writeFileSync(join(AQUI, 'estudo-de-leitura-ferramentas.json'), `${JSON.stringify(res, null, 1)}\n`);
  return res;
}

async function figuraDasFerramentas() {
  const W = 300; const H = 169; const pasta = join(BASE, 'medidas');
  const blocos = [];
  NOMES.forEach((nome, i) => [`desvio-${nome}`, `pente-${nome}`, `emendas-${nome}-50`].forEach((f, j) => blocos.push({ input: join(pasta, `${f}.png`), left: j * W, top: i * H })));
  const entradas = await Promise.all(blocos.map(async (b) => ({ ...b, input: await sharp(b.input).resize(W, H).toBuffer() })));
  await sharp({ create: { width: 3 * W, height: NOMES.length * H, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite(entradas).jpeg({ quality: 80 }).toFile(join(AQUI, 'estudo-ferramentas.jpg'));
}

const args = new Set(process.argv.slice(2));
if (args.has('--ferramentas')) { ferramentas(); await figuraDasFerramentas(); }
const todos = !args.has('--capturar') && !args.has('--medir') && !args.has('--figuras') && !args.has('--ferramentas');
if (todos || args.has('--capturar')) await capturar();
if (todos || args.has('--medir')) medir();
if (todos || args.has('--figuras')) await figuras();
