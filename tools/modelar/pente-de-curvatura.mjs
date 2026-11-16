#!/usr/bin/env node
/* pente-de-curvatura.mjs — o pente de curvatura de uma seção da peça: a curva do corte e, em cada ponto, uma haste de comprimento
 * proporcional à curvatura, em imagem e em números.
 *
 * POR QUE ELE EXISTE. A zebra é legível para o agente como medida, mas não para a pessoa julgar a olho. O pente é a leitura padrão da
 * superfície de carroceria: uma seção lisa dá hastes que variam sem degrau e sem troca de sinal sem motivo, e o amassado, a ondulação e a
 * emenda aparecem como degrau ou oscilação nas hastes, em milímetro de lugar e em 1/m de valor.
 *
 * COMO CORTA. O plano é o do `--corte` da bancada (`src/autoria/corte-de-plano.js`): `<x|y|z>:<mm>`, perpendicular ao eixo, em mm do referencial
 * da peça. A seção é a interseção das faces da malha entregue pela receita com o plano, encadeada em curvas (abertas ou fechadas) pelas arestas
 * da malha que o plano atravessa. A carcaça de duas peles entra com `--lado=<+x|-x|+y|-y|+z|-z|centro>` (a mesma regra de
 * `mapa-de-desvio.mjs`: só as faces cujos vértices têm normal para esse lado); sem ele as duas peles dão duas curvas.
 *
 * COMO MEDE. Cada curva é reamostrada por comprimento de arco a cada `--passo` mm (padrão 5) e suavizada por um núcleo gaussiano de desvio
 * `--suavizar` mm (padrão 8; a malha é poligonal, e sem suavizar a curvatura da corda seria só ruído de vértice). A curvatura é a derivada
 * da tangente em relação ao arco, em 1/m, com o sinal pela normal de fora da pele: positiva é convexa (o centro de curvatura fica
 * dentro), negativa é côncava. A haste sai para o lado do centro de curvatura quando a curvatura é positiva e para o outro quando é negativa,
 * de modo que a troca de sinal atravessa a curva.
 *
 * O QUE ELE DIZ. Por curva: `amostras` ([s em mm, curvatura em 1/m, x, y, z em mm]), `mudancasDeSinal` (onde a curvatura passa de um sinal a
 * outro entre dois valores acima de `--zero`, padrão 0,05 1/m), e `saltos`: onde a curvatura muda mais que `--limiar` 1/m (padrão 0,4)
 * numa janela de `--janela` mm (padrão 20), a variação em 1/m, de que valor para que valor e o ponto em mm. As pontas abertas (duas vezes a
 * suavização) ficam de fora da análise, porque o núcleo ali é cortado. Um salto é a curvatura que degrau: numa seção lisa não há nenhum.
 * A chapa de prova (`tools/fixtures/acervo/chapa-de-reflexo-de-prova`) tem o amassado de borda em C1 (a curvatura salta de -1,5 para 0 1/m na
 * borda dele), a seção `x:400` que passa por ele mostra os saltos, e a da chapa lisa não mostra nenhum; o teste confere nos números.
 *
 * A IMAGEM. A seção no plano com a escala de comprimento (régua com marcas em mm), a escala da haste (quantos px por 1/m, e a haste de
 * referência de 1 1/m), as hastes azuis (convexas) e laranjas (côncavas), o contorno que une as pontas, os saltos com triângulo e o valor, e
 * as trocas de sinal com um ponto. A haste é no padrão 60 px por 1/m (menos se a maior ficaria além de 200 px); `--haste=<px por 1/m>` fixa, e a haste que passa de 120 px (um vinco agudo) é cortada nesse tamanho (e só os seis maiores saltos levam o valor escrito).
 *
 * Uso: node tools/modelar/pente-de-curvatura.mjs <peça> --corte=<x|y|z>:<mm> [--opcao=<n>] [--parte=<nome>] [--lado=<...>] [--passo=<mm>]
 *        [--suavizar=<mm>] [--limiar=<1/m>] [--janela=<mm>] [--zero=<1/m>] [--haste=<px por 1/m>] [--saida=<png>]
 *   (também `npm run pente -- <peça> ...`). A imagem vai para `--saida` (padrão tmp/pente-de-curvatura/<peça>-<corte>.png); o JSON, para a saída padrão. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerCorte } from '../../src/autoria/corte-de-plano.js';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeEntrada, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';
import { Quadro, VISTAS, baseDaVista, malhaDoNeutro, numeroRedondo, selecionarLado } from './mapa-de-desvio.mjs';

export const PADROES = Object.freeze({ passoMm: 5, suavizarMm: 8, limiar: 0.4, janelaMm: 20, zero: 0.05 });
const LIMITE_DA_HASTE_PX = 120; /* a haste de um vinco agudo (dezenas de 1/m) é cortada aqui, e a curvatura inteira fica no JSON */
const AZUL = [30, 100, 200]; const LARANJA = [222, 98, 20]; const CINZA = [120, 126, 132]; const TINTA = [30, 34, 38];

/* ---------- a seção ---------- */

/** As curvas da interseção da malha com o plano `eixo = posicao` (mm): `[{ fechada, pontos: [[x,y,z]], normais: [[x,y,z]] }]`. */
export function secaoDaMalha(malha, sel, eixo, posicaoMm) {
  const { P, N, faces } = malha; const e = 'xyz'.indexOf(eixo);
  const lado = (i) => (P[3 * i + e] - posicaoMm >= 0 ? 1 : 0);
  const pontos = new Map(); /* aresta (a,b) -> ponto e normal */
  const ponto = (a, b) => {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!pontos.has(k)) {
      const sa = P[3 * a + e] - posicaoMm; const sb = P[3 * b + e] - posicaoMm; const t = sa / (sa - sb);
      const mistura = (V) => [0, 1, 2].map((c) => V[3 * a + c] + (V[3 * b + c] - V[3 * a + c]) * t);
      pontos.set(k, { k, p: mistura(P), n: mistura(N) });
    }
    return pontos.get(k);
  };
  const segmentos = [];
  for (const f of faces) {
    if (!f.every((i) => sel[i])) continue;
    const cruzam = [];
    for (let k = 0; k < f.length; k++) { const a = f[k]; const b = f[(k + 1) % f.length]; if (lado(a) !== lado(b)) cruzam.push(ponto(a, b)); }
    for (let k = 0; k + 1 < cruzam.length; k += 2) segmentos.push([cruzam[k], cruzam[k + 1]]);
  }
  const vizinhos = new Map();
  segmentos.forEach(([a, b], i) => { for (const p of [a, b]) { if (!vizinhos.has(p.k)) vizinhos.set(p.k, []); vizinhos.get(p.k).push(i); } });
  const usado = new Uint8Array(segmentos.length);
  const curvas = [];
  const andar = (inicio, segInicial) => {
    const cadeia = [inicio]; let atual = inicio; let s = segInicial;
    while (s !== undefined && !usado[s]) {
      usado[s] = 1;
      const [a, b] = segmentos[s]; const prox = a.k === atual.k ? b : a;
      cadeia.push(prox); atual = prox;
      s = vizinhos.get(prox.k).find((j) => !usado[j]);
    }
    return cadeia;
  };
  /* primeiro as abertas (partem de um ponto de uma aresta só), depois as fechadas */
  for (const [k, lista] of vizinhos) {
    if (lista.length !== 1 || usado[lista[0]]) continue;
    const ini = segmentos[lista[0]].find((p) => p.k === k);
    curvas.push({ fechada: false, cadeia: andar(ini, lista[0]) });
  }
  segmentos.forEach((seg, i) => { if (!usado[i]) { const c = andar(seg[0], i); curvas.push({ fechada: true, cadeia: c.slice(0, -1) }); } });
  return curvas.filter((c) => c.cadeia.length >= 4).map((c) => ({ fechada: c.fechada, pontos: c.cadeia.map((p) => p.p), normais: c.cadeia.map((p) => p.n) }));
}

/* ---------- a curvatura ---------- */

function reamostrar(pontos, normais, fechada, passo) {
  const q = fechada ? [...pontos, pontos[0]] : pontos; const qn = fechada ? [...normais, normais[0]] : normais;
  const acc = [0]; for (let i = 1; i < q.length; i++) acc.push(acc[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1], q[i][2] - q[i - 1][2]));
  const total = acc[acc.length - 1]; const n = Math.max(4, Math.round(total / passo)); const ds = total / n;
  const P = []; const Nn = []; let j = 0;
  for (let k = 0; k <= (fechada ? n - 1 : n); k++) {
    const s = k * ds; while (j < acc.length - 2 && acc[j + 1] < s) j++;
    const t = acc[j + 1] > acc[j] ? (s - acc[j]) / (acc[j + 1] - acc[j]) : 0;
    P.push([0, 1, 2].map((c) => q[j][c] + (q[j + 1][c] - q[j][c]) * t)); Nn.push([0, 1, 2].map((c) => qn[j][c] + (qn[j + 1][c] - qn[j][c]) * t));
  }
  return { P, N: Nn, ds, total };
}

function suavizar(P, fechada, ds, sigma) {
  const meia = Math.ceil((3 * sigma) / ds); const n = P.length;
  const nucleo = Array.from({ length: 2 * meia + 1 }, (_, k) => Math.exp(-0.5 * (((k - meia) * ds) / sigma) ** 2));
  return P.map((_, i) => {
    const acc = [0, 0, 0]; let w = 0;
    for (let k = -meia; k <= meia; k++) {
      let j = i + k;
      if (fechada) j = ((j % n) + n) % n; else if (j < 0 || j >= n) continue;
      const p = nucleo[k + meia]; w += p; for (let c = 0; c < 3; c++) acc[c] += p * P[j][c];
    }
    return acc.map((x) => x / w);
  });
}

/**
 * curvaturaDaCurva(curva, eixo, opcoes) -> { amostras: [[s, k1m, x, y, z]], ds, comprimentoMm, margemMm, fechada }
 * A curvatura é a variação da tangente no plano da seção (os dois eixos que não são `eixo`), em 1/m, convexa positiva pela normal de fora.
 */
export function curvaturaDaCurva(curva, eixo, { passoMm = PADROES.passoMm, suavizarMm = PADROES.suavizarMm } = {}) {
  const e = 'xyz'.indexOf(eixo); const [a, b] = [0, 1, 2].filter((c) => c !== e);
  const { P, N, ds, total } = reamostrar(curva.pontos, curva.normais, curva.fechada, passoMm);
  const S = suavizar(P, curva.fechada, ds, suavizarMm);
  const n = S.length; const idx = (i) => (curva.fechada ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i)));
  const T = S.map((_, i) => {
    const p = S[idx(i + 1)]; const q = S[idx(i - 1)]; const dx = p[a] - q[a]; const dy = p[b] - q[b]; const m = Math.hypot(dx, dy) || 1; return [dx / m, dy / m];
  });
  const amostras = S.map((p, i) => {
    const i1 = idx(i + 1); const i0 = idx(i - 1); const passos = (curva.fechada ? 2 : i1 - i0) * ds || 2 * ds;
    const dT = [(T[i1][0] - T[i0][0]) / passos, (T[i1][1] - T[i0][1]) / passos];
    let nx = N[i][a]; let ny = N[i][b]; const mn = Math.hypot(nx, ny) || 1; nx /= mn; ny /= mn;
    const k = -(dT[0] * nx + dT[1] * ny) * 1000;
    return [Math.round(i * ds * 100) / 100, Math.round(k * 10000) / 10000, ...p.map((x) => Math.round(x * 100) / 100)];
  });
  return { amostras, ds, comprimentoMm: Math.round(total * 10) / 10, margemMm: curva.fechada ? 0 : 2 * suavizarMm, fechada: curva.fechada };
}

/** Onde a curvatura troca de sinal e onde ela salta; as pontas abertas (a margem) ficam fora. */
export function analisarCurvatura({ amostras, ds, comprimentoMm, margemMm, fechada }, { limiar = PADROES.limiar, janelaMm = PADROES.janelaMm, zero = PADROES.zero } = {}) {
  const n = amostras.length; const valido = (i) => fechada || (amostras[i][0] >= margemMm && amostras[i][0] <= comprimentoMm - margemMm);
  const mudancasDeSinal = [];
  let ultimo = null;
  for (let i = 0; i < n; i++) {
    if (!valido(i)) continue;
    const k = amostras[i][1]; if (Math.abs(k) < zero) continue;
    if (ultimo && Math.sign(k) !== Math.sign(ultimo.k)) {
      const t = ultimo.k / (ultimo.k - k); const s = ultimo.s + (amostras[i][0] - ultimo.s) * t;
      const ponto = [2, 3, 4].map((c) => Math.round((amostras[ultimo.i][c] + (amostras[i][c] - amostras[ultimo.i][c]) * t) * 10) / 10);
      mudancasDeSinal.push({ sMm: Math.round(s * 10) / 10, de: Math.sign(ultimo.k) > 0 ? 'convexa' : 'côncava', ponto });
    }
    ultimo = { i, k, s: amostras[i][0] };
  }
  const meia = Math.max(1, Math.round(janelaMm / 2 / ds));
  const get = (i) => (fechada ? amostras[((i % n) + n) % n][1] : amostras[i][1]);
  const delta = [];
  for (let i = 0; i < n; i++) {
    const i0 = i - meia; const i1 = i + meia;
    if (!valido(i) || (!fechada && (i0 < 0 || i1 >= n || !valido(i0) || !valido(i1)))) { delta.push(0); continue; }
    delta.push(get(i1) - get(i0));
  }
  const saltos = [];
  for (let i = 0; i < n; i++) {
    const d = Math.abs(delta[i]); if (d < limiar) continue;
    let pico = true;
    for (let k = -meia; k <= meia; k++) { const j = fechada ? ((i + k) % n + n) % n : i + k; if (j >= 0 && j < n && j !== i && (Math.abs(delta[j]) > d || (Math.abs(delta[j]) === d && j < i))) { pico = false; break; } }
    if (!pico) continue;
    saltos.push({ sMm: amostras[i][0], variacao: Math.round(delta[i] * 1000) / 1000, de: get(i - meia), para: get(i + meia), ponto: [2, 3, 4].map((c) => amostras[i][c]) });
  }
  const ks = amostras.filter((_, i) => valido(i)).map((a) => a[1]);
  const ordenado = [...ks].sort((x, y) => x - y);
  const resumo = {
    minimo: Math.round(Math.min(...ks) * 1000) / 1000, maximo: Math.round(Math.max(...ks) * 1000) / 1000,
    mediana: Math.round(ordenado[Math.floor(ordenado.length / 2)] * 1000) / 1000,
    maiorSalto: saltos.length ? Math.max(...saltos.map((s) => Math.abs(s.variacao))) : 0,
  };
  return { mudancasDeSinal, saltos, resumo };
}

/* ---------- a imagem ---------- */

function desenhar(curvas, { nome, corte, lado, hastePx, vista, parametros }) {
  const W = 1280; const H = 720; const q = new Quadro(W, H);
  const eixoCorte = 'xyz'.indexOf(corte.eixo);
  const direcao = [0, 0, 0]; direcao[eixoCorte] = 1;
  const { direita, cima } = baseDaVista(direcao);
  const proj = (p) => [p[0] * direita[0] + p[1] * direita[1] + p[2] * direita[2], p[0] * cima[0] + p[1] * cima[1] + p[2] * cima[2]];
  const todos = curvas.flatMap((c) => c.amostras.map((a) => proj(a.slice(2, 5))));
  const kMax = Math.max(0.01, ...curvas.flatMap((c) => c.amostras.filter((a) => !c.margem || (a[0] >= c.margem && a[0] <= c.comprimentoMm - c.margem)).map((a) => Math.abs(a[1]))));
  const haste = hastePx ?? Math.min(60, LIMITE_DA_HASTE_PX / kMax);
  const folga = LIMITE_DA_HASTE_PX + 20;
  const x0 = Math.min(...todos.map((p) => p[0])); const x1 = Math.max(...todos.map((p) => p[0]));
  const y0 = Math.min(...todos.map((p) => p[1])); const y1 = Math.max(...todos.map((p) => p[1]));
  const areaW = W - 80; const areaH = H - 150 - 2 * Math.min(folga, haste * kMax);
  const pxMm = Math.min(areaW / Math.max(x1 - x0, 1), areaH / Math.max(y1 - y0, 1));
  const cx = W / 2 - ((x0 + x1) / 2) * pxMm; const cy = 80 + (H - 150) / 2 + ((y0 + y1) / 2) * pxMm;
  const tela = (p) => { const [u, v] = proj(p); return [cx + u * pxMm, cy - v * pxMm]; };
  q.texto(30, 16, `PENTE DE CURVATURA - ${nome} - CORTE ${corte.eixo.toUpperCase()}=${corte.posicao}`, { escala: 3 });
  q.texto(30, 44, `VISTA SOBRE O PLANO DE CORTE${lado ? `   LADO ${lado}` : ''}   PASSO ${parametros.passoMm} MM   SUAVIZAR ${parametros.suavizarMm} MM`, { escala: 2, cor: [90, 96, 102] });
  q.texto(30, 62, `CURVATURA EXTREMA ${Math.min(...curvas.map((c) => c.resumo.minimo))} A ${Math.max(...curvas.map((c) => c.resumo.maximo))} 1/M   AZUL CONVEXA, LARANJA CONCAVA`, { escala: 2, cor: [90, 96, 102] });
  for (const c of curvas) {
    const pts = c.amostras.map((a) => tela(a.slice(2, 5)));
    for (let i = 1; i < pts.length; i++) q.linha(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], TINTA, 2);
    if (c.fechada) q.linha(pts.at(-1)[0], pts.at(-1)[1], pts[0][0], pts[0][1], TINTA, 2);
    const pontas = c.amostras.map((a, i) => {
      const [u, v] = proj(a.slice(2, 5)); const prev = proj(c.amostras[Math.max(0, i - 1)].slice(2, 5)); const next = proj(c.amostras[Math.min(c.amostras.length - 1, i + 1)].slice(2, 5));
      let tx = next[0] - prev[0]; let ty = next[1] - prev[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
      /* normal de fora no plano da tela: a que tem o sinal que a curvatura convexa pede: a haste vai para dentro (centro) quando k > 0 */
      let nx = -ty; let ny = tx;
      const nOut = c.normaisDaTela[i]; if (nx * nOut[0] + ny * nOut[1] < 0) { nx = -nx; ny = -ny; }
      const k = a[1]; const L = Math.max(-LIMITE_DA_HASTE_PX, Math.min(LIMITE_DA_HASTE_PX, k * haste));
      const [px, py] = tela(a.slice(2, 5));
      return { x: px, y: py, hx: px - nx * L, hy: py + ny * L, k, s: a[0] };
    });
    const fim = pontas.length;
    pontas.forEach((p, i) => { if (i % 2 === 0) q.linha(p.x, p.y, p.hx, p.hy, p.k >= 0 ? AZUL : LARANJA, 1); });
    for (let i = 1; i < fim; i++) q.linha(pontas[i - 1].hx, pontas[i - 1].hy, pontas[i].hx, pontas[i].hy, CINZA, 1);
    const maiores = new Set([...c.saltos].sort((p, r) => Math.abs(r.variacao) - Math.abs(p.variacao)).slice(0, 6));
    for (const s of c.saltos) {
      const [px, py] = tela(s.ponto);
      q.linha(px, py + 8, px - 6, py + 18, [180, 20, 20], 2); q.linha(px, py + 8, px + 6, py + 18, [180, 20, 20], 2); q.linha(px - 6, py + 18, px + 6, py + 18, [180, 20, 20], 2);
      if (maiores.has(s)) q.texto(px - 20, py + 22, `SALTO ${Math.abs(s.variacao).toFixed(2)}`, { escala: 1, cor: [180, 20, 20] });
    }
    for (const m of c.mudancasDeSinal) { const [px, py] = tela(m.ponto); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) q.ponto(px + a, py + b, [20, 20, 20]); }
  }
  /* a régua de comprimento e a haste de referência */
  const mm = numeroRedondo((W * 0.25) / pxMm); const comp = Math.round(mm * pxMm);
  q.linha(30, H - 30, 30 + comp, H - 30, TINTA, 2); q.linha(30, H - 36, 30, H - 24, TINTA); q.linha(30 + comp, H - 36, 30 + comp, H - 24, TINTA);
  q.texto(30, H - 56, `${mm} MM`, { escala: 2 });
  const bx = W - 130; q.linha(bx, H - 30, bx, H - 30 - haste, AZUL, 3); q.texto(bx + 12, H - 30 - haste / 2 - 7, '1 1/M', { escala: 2 });
  q.texto(bx - 150, H - 30 - haste - 26, `ESCALA ${Math.round(haste * 10) / 10} PX POR 1/M`, { escala: 1 });
  return q.png();
}

/* ---------- a ferramenta ---------- */

/** penteDeCurvatura(neutro, { corte: {eixo, posicao}, parte, lado, passoMm, suavizarMm, limiar, janelaMm, zero, hastePx, nome }) -> { json, png } */
export function penteDeCurvatura(neutro, {
  corte, nome = 'peca', parte = null, lado = null, passoMm = PADROES.passoMm, suavizarMm = PADROES.suavizarMm, limiar = PADROES.limiar,
  janelaMm = PADROES.janelaMm, zero = PADROES.zero, hastePx = null,
} = {}) {
  if (!corte) throw new Error('o pente pede o plano de corte: --corte=<x|y|z>:<mm>, por exemplo x:400');
  const malha = malhaDoNeutro(neutro, { parte });
  const sel = selecionarLado(malha, lado);
  const bruto = secaoDaMalha(malha, sel, corte.eixo, corte.posicao);
  if (!bruto.length) throw new Error(`o plano ${corte.eixo}:${corte.posicao} não corta a peça${lado ? ` (lado ${lado})` : ''}; confira a posição em mm do referencial da peça`);
  const curvas = bruto.map((c) => {
    const k = curvaturaDaCurva(c, corte.eixo, { passoMm, suavizarMm });
    const e = 'xyz'.indexOf(corte.eixo);
    const direcao = [0, 0, 0]; direcao[e] = 1; const { direita, cima } = baseDaVista(direcao);
    const reamostrada = reamostrar(c.pontos, c.normais, c.fechada, passoMm);
    const normaisDaTela = reamostrada.N.map((v) => [v[0] * direita[0] + v[1] * direita[1] + v[2] * direita[2], v[0] * cima[0] + v[1] * cima[1] + v[2] * cima[2]]);
    return { ...k, ...analisarCurvatura(k, { limiar, janelaMm, zero }), margem: k.margemMm, normaisDaTela };
  });
  const parametros = { passoMm, suavizarMm, limiar, janelaMm, zero };
  const png = desenhar(curvas, { nome, corte, lado, hastePx, parametros });
  const json = {
    peca: nome, corte: { eixo: corte.eixo, posicaoMm: corte.posicao }, parte, lado, unidades: { curvatura: '1/m', comprimento: 'mm' },
    convencao: 'curvatura positiva é convexa pela normal de fora (centro de curvatura dentro da pele), negativa é côncava; amostras: [s mm, curvatura 1/m, x, y, z em mm]',
    parametros,
    curvas: curvas.map((c) => ({
      fechada: c.fechada, comprimentoMm: c.comprimentoMm, margemMm: c.margemMm, resumo: c.resumo, mudancasDeSinal: c.mudancasDeSinal, saltos: c.saltos, amostras: c.amostras,
    })),
    saltos: curvas.reduce((n, c) => n + c.saltos.length, 0),
    mudancasDeSinal: curvas.reduce((n, c) => n + c.mudancasDeSinal.length, 0),
  };
  return { json, png };
}

export const OPCOES_DA_CLI = ['opcao', 'corte', 'parte', 'lado', 'passo', 'suavizar', 'limiar', 'janela', 'zero', 'haste', 'saida'];

async function principal(argv) {
  let lido;
  try { lido = lerArgumentos(argv.slice(2), { opcoes: OPCOES_DA_CLI, bandeiras: ['ajuda'], posicional: { nome: 'peça', obrigatorio: false } }); } catch (e) { process.stderr.write(`pente: ${e.message}\n`); return 2; }
  const peca = lido.posicional;
  if (lido.bandeira('ajuda') || !peca || !lido.opcao('corte')) {
    process.stderr.write(`uso: node tools/modelar/pente-de-curvatura.mjs <peça> --corte=<x|y|z>:<mm> [--${OPCOES_DA_CLI.filter((o) => o !== 'corte').join('=...] [--')}=...]\n  ver o cabeçalho do arquivo\n`);
    return lido.bandeira('ajuda') ? 0 : 2;
  }
  const numero = (nome, padrao) => { const t = lido.opcao(nome); if (t === null || t === undefined) return padrao; const x = Number(t); if (!Number.isFinite(x) || x <= 0) throw new Error(`--${nome} espera um número maior que zero, e veio '${t}'`); return x; };
  let corte;
  try { corte = lerCorte(lido.opcao('corte')); } catch (e) { process.stderr.write(`pente: ${e.message}\n`); return 2; }
  let entrada;
  try { entrada = await lerEntradaDeMedida(peca, { opcao: opcaoDaLinha(lido.opcao('opcao')), montagem: false }); } catch (e) {
    if (e instanceof ErroDeEntrada) { process.stderr.write(`pente: ${e.message}\n`); return 2; }
    throw e;
  }
  const nome = basename(peca).replace(/\.(mjs|js|json)$/, '');
  const { json, png } = penteDeCurvatura(entrada.executar().neutro, {
    corte, nome, parte: lido.opcao('parte') ?? null, lado: lido.opcao('lado') ?? null, passoMm: numero('passo', PADROES.passoMm), suavizarMm: numero('suavizar', PADROES.suavizarMm),
    limiar: numero('limiar', PADROES.limiar), janelaMm: numero('janela', PADROES.janelaMm), zero: numero('zero', PADROES.zero), hastePx: numero('haste', null),
  });
  const saida = resolve(lido.opcao('saida') ?? `tmp/pente-de-curvatura/${nome}-${corte.eixo}${corte.posicao}.png`);
  mkdirSync(dirname(saida), { recursive: true }); writeFileSync(saida, png);
  process.stdout.write(`${JSON.stringify({ ...json, imagem: saida }, null, 1)}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
