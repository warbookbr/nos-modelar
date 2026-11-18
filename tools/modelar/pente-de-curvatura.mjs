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
 * VÁRIOS CORTES NUMA EXECUÇÃO (plano das ferramentas das rodadas, fatia 3). A receita executa uma vez só, pelo cache por passo
 * (`executarComCachePorPasso`, de `entrada-de-medida.mjs`; `--sem-cache` executa inteira), e a malha é cortada em todos os planos pedidos:
 *   - `--cortes=x:400,y:600,...`: a lista escrita;
 *   - `--grade=<eixo>:<de>:<até>:<passo>` (em mm, repetível, ou várias separadas por vírgula): cortes regulares, as duas pontas incluídas;
 *   - `--guiado-pela-zebra=<json>`: a saída de `zebra-numerica.mjs --saida=<json>`. Cada ilha de cada região dá dois cortes, pelos dois
 *     eixos perpendiculares ao olhar da região, que passam pelo ponto da ilha, com o `--lado` igual ao olhar da região (a pele que a zebra
 *     mediu) quando `--lado` não vem. As ilhas entram da maior persistência para a menor; o corte que cairia a menos de `--separacao` mm
 *     (padrão: o passo efetivo da zebra) de outro do mesmo eixo e lado não é repetido, e a ilha fica anotada no corte vizinho.
 *     `--maximo-de-cortes` (padrão 24) limita o total: os da lista e da grade entram sempre (e passar do máximo com eles é recusa), os
 *     guiados entram até o máximo, e os que ficaram de fora são contados em `cortesDeixadosDeFora`.
 * A saída é um JSON com `cortes` (por corte: as curvas com os saltos e as trocas de sinal como no corte único, o maior salto e, no corte
 * guiado, `ilhas`, cada uma com quantos saltos e trocas caem a meia onda do ponto dela, no mínimo a separação, e `nasIlhas`, a conta sem repetir) e `tabela`, uma linha por corte:
 * corte, lado, origem, curvas, saltos, maior salto em 1/m e onde, trocas de sinal. A tabela sai também em texto na saída de erro. O corte
 * que não toca a peça fica na tabela com zero curvas, e só é recusa quando nenhum corta. As amostras só entram com `--amostras`, e a
 * imagem de cada corte só com `--imagens` (em `--pasta`, padrão tmp/pente-de-curvatura/).
 * `--caixa=<eixo>:<min>:<max>,...` (em mm, um a três eixos, como `x:600:2000,z:-690:-20`) limita a conta a uma região: o plano corta a peça
 * inteira, e só entram as curvas que passam pela caixa, com os saltos, as trocas de sinal e o resumo do trecho de dentro dela (a seção de
 * uma carroceria atravessa vãos, vincos e a outra banda, que dominariam a tabela). A imagem segue mostrando a seção inteira.
 * O pente não aprova forma: o salto na borda de
 * um vão ou num vinco pedido é da forma, e quem decide é a pessoa.
 *
 * Uso: node tools/modelar/pente-de-curvatura.mjs <peça> --corte=<x|y|z>:<mm> [--saida=<png>]
 *      node tools/modelar/pente-de-curvatura.mjs <peça> [--cortes=<lista>] [--grade=<eixo>:<de>:<até>:<passo>]... [--guiado-pela-zebra=<json>]
 *        [--maximo-de-cortes=<n>] [--separacao=<mm>] [--caixa=<eixo>:<min>:<max>,...] [--imagens] [--pasta=<pasta>] [--amostras] [--saida=<json>]
 *   comuns: [--opcao=<n>] [--parte=<nome>] [--lado=<...>] [--passo=<mm>] [--suavizar=<mm>] [--limiar=<1/m>] [--janela=<mm>] [--zero=<1/m>]
 *        [--haste=<px por 1/m>] [--sem-cache]
 *   (também `npm run pente -- <peça> ...`). Com `--corte` a imagem vai para `--saida` (padrão tmp/pente-de-curvatura/<peça>-<corte>.png) e o
 *   JSON para a saída padrão, como sempre; com vários cortes o JSON vai para a saída padrão e, com `--saida`, também para o arquivo. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerCorte } from '../../src/autoria/corte-de-plano.js';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeEntrada, avisoDoCachePorPasso, executarComCachePorPasso, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';
import { Quadro, baseDaVista, numeroRedondo } from './imagem-de-medida.mjs';
import { malhaDoNeutro, selecionarLado } from './mapa-de-desvio.mjs';

export const PADROES = Object.freeze({ passoMm: 5, suavizarMm: 8, limiar: 0.4, janelaMm: 20, zero: 0.05, maximoDeCortes: 24 });
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

const CONVENCAO = 'curvatura positiva é convexa pela normal de fora (centro de curvatura dentro da pele), negativa é côncava; amostras: [s mm, curvatura 1/m, x, y, z em mm]';

/* as curvas de um corte já medidas (com o que a imagem pede), ou null quando o plano não corta a seleção */
function curvasDoCorte(malha, sel, corte, { passoMm, suavizarMm, limiar, janelaMm, zero }) {
  const bruto = secaoDaMalha(malha, sel, corte.eixo, corte.posicao);
  if (!bruto.length) return null;
  const e = 'xyz'.indexOf(corte.eixo);
  const direcao = [0, 0, 0]; direcao[e] = 1; const { direita, cima } = baseDaVista(direcao);
  return bruto.map((c) => {
    const k = curvaturaDaCurva(c, corte.eixo, { passoMm, suavizarMm });
    const reamostrada = reamostrar(c.pontos, c.normais, c.fechada, passoMm);
    const normaisDaTela = reamostrada.N.map((v) => [v[0] * direita[0] + v[1] * direita[1] + v[2] * direita[2], v[0] * cima[0] + v[1] * cima[1] + v[2] * cima[2]]);
    return { ...k, ...analisarCurvatura(k, { limiar, janelaMm, zero }), margem: k.margemMm, normaisDaTela };
  });
}

const curvasEmJson = (curvas, comAmostras = true) => curvas.map((c) => ({
  fechada: c.fechada, comprimentoMm: c.comprimentoMm, margemMm: c.margemMm, resumo: c.resumo, mudancasDeSinal: c.mudancasDeSinal, saltos: c.saltos, ...(comAmostras ? { amostras: c.amostras } : {}),
}));

/** penteDeCurvatura(neutro, { corte: {eixo, posicao}, parte, lado, passoMm, suavizarMm, limiar, janelaMm, zero, hastePx, nome }) -> { json, png } */
export function penteDeCurvatura(neutro, {
  corte, nome = 'peca', parte = null, lado = null, passoMm = PADROES.passoMm, suavizarMm = PADROES.suavizarMm, limiar = PADROES.limiar,
  janelaMm = PADROES.janelaMm, zero = PADROES.zero, hastePx = null,
} = {}) {
  if (!corte) throw new Error('o pente pede o plano de corte: --corte=<x|y|z>:<mm>, por exemplo x:400');
  const malha = malhaDoNeutro(neutro, { parte });
  const sel = selecionarLado(malha, lado);
  const parametros = { passoMm, suavizarMm, limiar, janelaMm, zero };
  const curvas = curvasDoCorte(malha, sel, corte, parametros);
  if (!curvas) throw new Error(`o plano ${corte.eixo}:${corte.posicao} não corta a peça${lado ? ` (lado ${lado})` : ''}; confira a posição em mm do referencial da peça`);
  const png = desenhar(curvas, { nome, corte, lado, hastePx, parametros });
  const json = {
    peca: nome, corte: { eixo: corte.eixo, posicaoMm: corte.posicao }, parte, lado, unidades: { curvatura: '1/m', comprimento: 'mm' },
    convencao: CONVENCAO,
    parametros,
    curvas: curvasEmJson(curvas),
    saltos: curvas.reduce((n, c) => n + c.saltos.length, 0),
    mudancasDeSinal: curvas.reduce((n, c) => n + c.mudancasDeSinal.length, 0),
  };
  return { json, png };
}

/* ---------- os vários cortes ---------- */

/** `--cortes=x:400,y:600` -> [{ eixo, posicao }] */
export function lerCortes(texto) {
  const itens = String(texto ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!itens.length) throw new Error(`--cortes pede uma lista de <eixo>:<mm> separados por vírgula, por exemplo x:400,y:600; veio '${texto ?? ''}'`);
  return itens.map((item) => {
    try { return lerCorte(item); } catch (e) { throw new Error(`--cortes: o item '${item}' não é um corte (${e.message}) O esperado é <x|y|z>:<mm>, como em --cortes=x:400,y:600`); }
  });
}

/** `--grade=y:400:650:50` (várias separadas por vírgula) -> [{ eixo, posicao }], com as duas pontas incluídas */
export function lerGrades(texto) {
  const itens = String(texto ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!itens.length) throw new Error(`--grade pede <eixo>:<de>:<até>:<passo> em mm, por exemplo y:400:650:50; veio '${texto ?? ''}'`);
  const cortes = [];
  for (const item of itens) {
    const p = item.split(':').map((s) => s.trim());
    const eixo = (p[0] ?? '').toLowerCase(); const [de, ate, passo] = p.slice(1).map((s) => (s === '' ? Number.NaN : Number(s)));
    if (p.length !== 4 || !['x', 'y', 'z'].includes(eixo) || ![de, ate, passo].every(Number.isFinite)) {
      throw new Error(`--grade: '${item}' não é uma grade; o esperado é <x|y|z>:<de>:<até>:<passo> em mm, como em --grade=y:400:650:50`);
    }
    if (!(passo > 0) || ate < de) throw new Error(`--grade: '${item}' não dá corte nenhum (de ${de} até ${ate}, passo ${passo}); o esperado é o até maior ou igual ao de e o passo maior que zero, como em --grade=y:400:650:50`);
    const n = Math.floor((ate - de) / passo + 1e-9) + 1;
    for (let k = 0; k < n; k++) cortes.push({ eixo, posicao: Math.round((de + k * passo) * 1000) / 1000 });
  }
  return cortes;
}

/** `--caixa=x:600:2000,z:-690:-20` -> { x: [600, 2000], z: [-690, -20] }, em mm; o eixo ausente não limita */
export function lerCaixa(texto) {
  const itens = String(texto ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!itens.length) throw new Error(`--caixa pede <eixo>:<min>:<max> em mm, um a três eixos separados por vírgula, por exemplo x:600:2000,z:-690:-20; veio '${texto ?? ''}'`);
  const caixa = {};
  for (const item of itens) {
    const p = item.split(':').map((s) => s.trim());
    const eixo = (p[0] ?? '').toLowerCase(); const [min, max] = p.slice(1).map((s) => (s === '' ? Number.NaN : Number(s)));
    if (p.length !== 3 || !['x', 'y', 'z'].includes(eixo) || !Number.isFinite(min) || !Number.isFinite(max)) throw new Error(`--caixa: '${item}' não é um intervalo; o esperado é <x|y|z>:<min>:<max> em mm, como em --caixa=x:600:2000,z:-690:-20`);
    if (min > max) throw new Error(`--caixa: em '${item}' o mínimo ${min} é maior que o máximo ${max}; escreva ${eixo}:${max}:${min}`);
    if (caixa[eixo]) throw new Error(`--caixa: o eixo ${eixo} veio duas vezes (${caixa[eixo].join(':')} e ${min}:${max}); cada eixo tem um intervalo só`);
    caixa[eixo] = [min, max];
  }
  return caixa;
}

const COMO_GERAR_A_ZEBRA = 'gere-a com `node tools/modelar/zebra-numerica.mjs <receita> --saida=<arquivo.json>`';

/** O arquivo de `--guiado-pela-zebra` lido. */
export function lerZebra(caminho) {
  let texto;
  try { texto = readFileSync(resolve(caminho), 'utf8'); } catch (e) { throw new Error(`--guiado-pela-zebra: não foi possível ler '${caminho}' (${e.code ?? e.message}); o esperado é o arquivo de saída da zebra numérica, ${COMO_GERAR_A_ZEBRA}`); }
  try { return JSON.parse(texto); } catch (e) { throw new Error(`--guiado-pela-zebra: '${caminho}' não é JSON válido (${e.message}); o esperado é o arquivo de saída da zebra numérica, ${COMO_GERAR_A_ZEBRA}`); }
}

/**
 * As ilhas da saída da zebra numérica, da maior persistência para a menor (no empate, na ordem das regiões e das direções):
 * [{ regiao, olhar, direcao, tipo, persistencia, lacos, ondaMm, ponto }].
 */
export function ilhasDaZebra(zebra) {
  if (!zebra || !Array.isArray(zebra.regioes)) throw new Error(`--guiado-pela-zebra espera a saída em JSON da zebra numérica, com regioes[].direcoes[].ilhas, e veio ${zebra === null || typeof zebra !== 'object' ? JSON.stringify(zebra) : `um objeto com ${Object.keys(zebra).join(', ') || 'nenhum campo'}`}; ${COMO_GERAR_A_ZEBRA}`);
  const ilhas = [];
  for (const r of zebra.regioes) {
    if (!/^[+-][xyz]$/.test(r?.olhar ?? '')) throw new Error(`--guiado-pela-zebra: a região '${r?.nome}' veio com o olhar '${r?.olhar}', e o esperado é +x, -x, +y, -y, +z ou -z, como a zebra numérica escreve; ${COMO_GERAR_A_ZEBRA}`);
    for (const d of r.direcoes ?? []) {
      for (const i of d.ilhas ?? []) {
        if (!Array.isArray(i.ponto) || i.ponto.length !== 3 || !i.ponto.every(Number.isFinite)) throw new Error(`--guiado-pela-zebra: uma ilha da região '${r.nome}' veio sem o ponto [x, y, z] em mm (veio ${JSON.stringify(i.ponto)}); ${COMO_GERAR_A_ZEBRA}`);
        ilhas.push({ regiao: r.nome, olhar: r.olhar, direcao: d.eixo, tipo: i.tipo, persistencia: i.persistencia, lacos: i.lacos, ondaMm: i.ondaMm, ponto: i.ponto });
      }
    }
  }
  return ilhas.map((i, k) => [i, k]).sort((a, b) => (b[0].persistencia - a[0].persistencia) || (a[1] - b[1])).map(([i]) => i);
}

/**
 * planoDeCortes({ cortes, grades, zebra, lado, maximo, separacaoMm }) -> { cortes: [{ eixo, posicao, lado, origem, ilhas? }], cortesDeixadosDeFora, separacaoMm }
 * `cortes` e `grades` são listas de `{ eixo, posicao }` (as de `lerCortes` e `lerGrades`) e entram sempre, com o `lado` dado; o corte igual a
 * outro (mesmo eixo, lado e posição) não repete. `zebra` é a saída da zebra numérica: cada ilha pede dois cortes pelo ponto dela, pelos eixos
 * perpendiculares ao olhar da região, do lado do olhar (ou de `lado`), e o que cai a menos de `separacaoMm` de um corte que já está na
 * lista, do mesmo eixo e lado, só anota a ilha nele.
 */
export function planoDeCortes({ cortes = [], grades = [], zebra = null, lado = null, maximo = PADROES.maximoDeCortes, separacaoMm = null } = {}) {
  if (!Number.isInteger(maximo) || maximo < 1) throw new Error(`--maximo-de-cortes espera um inteiro a partir de 1, e veio '${maximo}'`);
  const plano = [];
  const vizinho = (c, dist) => plano.find((p) => p.eixo === c.eixo && p.lado === c.lado && Math.abs(p.posicao - c.posicao) < dist);
  for (const [origem, lista] of [['lista', cortes], ['grade', grades]]) {
    for (const c of lista) { const novo = { eixo: c.eixo, posicao: c.posicao, lado, origem }; if (!vizinho(novo, 1e-6)) plano.push(novo); }
  }
  if (plano.length > maximo) throw new Error(`--cortes e --grade pedem ${plano.length} cortes e o máximo é ${maximo}; aumente com --maximo-de-cortes=${plano.length} ou abra o passo da grade`);
  let cortesDeixadosDeFora = 0;
  let separacao = separacaoMm;
  if (zebra) {
    const ilhas = ilhasDaZebra(zebra);
    separacao ??= Number.isFinite(zebra.parametros?.passoEfetivoMm) ? zebra.parametros.passoEfetivoMm : (zebra.parametros?.passoMm ?? 25);
    for (const ilha of ilhas) {
      const doOlhar = 'xyz'.indexOf(ilha.olhar[1]);
      for (const e of [0, 1, 2].filter((k) => k !== doOlhar)) {
        const novo = { eixo: 'xyz'[e], posicao: ilha.ponto[e], lado: lado ?? ilha.olhar, origem: 'zebra', ilhas: [ilha] };
        const perto = vizinho(novo, separacao);
        if (perto) { (perto.ilhas ??= []).push(ilha); continue; }
        if (plano.length >= maximo) { cortesDeixadosDeFora++; continue; }
        plano.push(novo);
      }
    }
  }
  if (!plano.length) throw new Error(`nenhum corte a fazer: ${zebra ? 'a zebra não trouxe nenhuma ilha (regioes[].direcoes[].ilhas está vazio) e ' : ''}não veio --cortes nem --grade; diga os planos, por exemplo --cortes=x:400,y:600 ou --grade=y:400:650:50`);
  return { cortes: plano, cortesDeixadosDeFora, separacaoMm: separacao };
}

const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * penteDeVariosCortes(neutro, { cortes, nome, parte, lado, caixa, imagens, amostras, separacaoMm, ...parâmetros do pente }) -> { json, imagens: [{ eixo, posicao, lado, png }] }
 * `cortes` é a lista de `planoDeCortes` (cada um `{ eixo, posicao, lado?, origem?, ilhas? }`; sem `lado` próprio vale o `lado` geral). A malha é
 * lida uma vez e cada corte dá o mesmo que `penteDeCurvatura` daria sozinho. O corte que não toca a peça entra com zero curvas e
 * `naoCorta`; quando nenhum toca, é recusa. `caixa` (`{ x: [min, max], ... }` em mm, a de `lerCaixa`) limita a conta: só as curvas com
 * amostra dentro dela, e delas só os saltos, as trocas de sinal e o resumo do trecho de dentro; o corte que toca a peça fora da caixa sai
 * com zero curvas e `foraDaCaixa`.
 */
export function penteDeVariosCortes(neutro, {
  cortes, nome = 'peca', parte = null, lado = null, caixa = null, imagens = false, amostras = false, separacaoMm = 0, passoMm = PADROES.passoMm, suavizarMm = PADROES.suavizarMm,
  limiar = PADROES.limiar, janelaMm = PADROES.janelaMm, zero = PADROES.zero, hastePx = null,
} = {}) {
  if (!Array.isArray(cortes) || !cortes.length) throw new Error('o pente de vários cortes pede a lista de planos: --cortes=x:400,y:600, --grade=<eixo>:<de>:<até>:<passo> ou --guiado-pela-zebra=<json>');
  const malha = malhaDoNeutro(neutro, { parte });
  const selecoes = new Map();
  const selDe = (l) => { if (!selecoes.has(l)) selecoes.set(l, selecionarLado(malha, l)); return selecoes.get(l); };
  const parametros = { passoMm, suavizarMm, limiar, janelaMm, zero };
  const pngs = [];
  const raioDaIlha = (i) => Math.max((i.ondaMm ?? 0) / 2, separacaoMm);
  const dentro = (p) => !caixa || ['x', 'y', 'z'].every((e, k) => !caixa[e] || (p[k] >= caixa[e][0] && p[k] <= caixa[e][1]));
  const r3 = (x) => Math.round(x * 1000) / 1000;
  /* a curva reduzida ao trecho de dentro da caixa: os saltos e as trocas de lá, e o resumo das amostras de lá (fora da margem das pontas abertas) */
  const naCaixa = (c) => {
    const ks = c.amostras.filter((a) => dentro(a.slice(2, 5)) && (c.fechada || (a[0] >= c.margemMm && a[0] <= c.comprimentoMm - c.margemMm))).map((a) => a[1]).sort((x, y) => x - y);
    if (!ks.length) return null;
    const saltos = c.saltos.filter((s) => dentro(s.ponto));
    return { ...c, saltos, mudancasDeSinal: c.mudancasDeSinal.filter((m) => dentro(m.ponto)), resumo: { minimo: r3(ks[0]), maximo: r3(ks[ks.length - 1]), mediana: r3(ks[Math.floor(ks.length / 2)]), maiorSalto: saltos.length ? Math.max(...saltos.map((s) => Math.abs(s.variacao))) : 0 } };
  };
  const saida = cortes.map((pedido) => {
    const ladoDoCorte = pedido.lado ?? lado ?? null;
    const corte = { eixo: pedido.eixo, posicao: pedido.posicao };
    const base = { corte: { eixo: corte.eixo, posicaoMm: corte.posicao }, lado: ladoDoCorte, origem: pedido.origem ?? 'lista' };
    const inteiras = curvasDoCorte(malha, selDe(ladoDoCorte), corte, parametros);
    const curvas = inteiras && caixa ? inteiras.map(naCaixa).filter(Boolean) : inteiras;
    if (!inteiras || !curvas.length) return { ...base, ...(inteiras ? { foraDaCaixa: true } : { naoCorta: true }), curvas: [], saltos: 0, mudancasDeSinal: 0, maiorSalto: null, ...(pedido.ilhas ? { ilhas: pedido.ilhas.map((i) => ({ ...i, naIlha: null })), nasIlhas: { saltos: 0, maiorSalto: 0, mudancasDeSinal: 0 } } : {}) };
    const todosOsSaltos = curvas.flatMap((c) => c.saltos); const todasAsTrocas = curvas.flatMap((c) => c.mudancasDeSinal);
    const pertoDeIlha = (s) => (pedido.ilhas ?? []).some((i) => d3(s.ponto, i.ponto) <= raioDaIlha(i));
    const maior = todosOsSaltos.reduce((m, s) => (m === null || Math.abs(s.variacao) > Math.abs(m.variacao) ? s : m), null);
    if (imagens) pngs.push({ eixo: corte.eixo, posicao: corte.posicao, lado: ladoDoCorte, png: desenhar(inteiras, { nome, corte, lado: ladoDoCorte, hastePx, parametros }) });
    return {
      ...base, curvas: curvasEmJson(curvas, amostras), saltos: todosOsSaltos.length, mudancasDeSinal: todasAsTrocas.length,
      maiorSalto: maior ? { variacao: maior.variacao, de: maior.de, para: maior.para, ponto: maior.ponto } : null,
      ...(pedido.ilhas ? {
        ilhas: pedido.ilhas.map((i) => ({ ...i, naIlha: { raioMm: Math.round(raioDaIlha(i) * 10) / 10, saltos: todosOsSaltos.filter((s) => d3(s.ponto, i.ponto) <= raioDaIlha(i)).length, mudancasDeSinal: todasAsTrocas.filter((m) => d3(m.ponto, i.ponto) <= raioDaIlha(i)).length } })),
        /* cada salto e cada troca conta uma vez, mesmo perto de duas ilhas */
        nasIlhas: { saltos: todosOsSaltos.filter(pertoDeIlha).length, maiorSalto: Math.max(0, ...todosOsSaltos.filter(pertoDeIlha).map((s) => Math.abs(s.variacao))), mudancasDeSinal: todasAsTrocas.filter((m) => pedido.ilhas.some((i) => d3(m.ponto, i.ponto) <= raioDaIlha(i))).length },
      } : {}),
    };
  });
  if (saida.every((c) => c.naoCorta || c.foraDaCaixa)) throw new Error(`nenhum dos ${saida.length} planos corta a peça${caixa ? ` dentro da caixa ${JSON.stringify(caixa)}` : ''} (${saida.slice(0, 6).map((c) => `${c.corte.eixo}:${c.corte.posicaoMm}${c.lado ? ` lado ${c.lado}` : ''}`).join(', ')}${saida.length > 6 ? ', ...' : ''}); confira as posições em mm do referencial da peça${caixa ? ', a --caixa' : ''} e o --lado`);
  const tabela = saida.map((c) => ({
    corte: `${c.corte.eixo}:${c.corte.posicaoMm}`, lado: c.lado, origem: c.origem, curvas: c.curvas.length, saltos: c.saltos,
    maiorSalto: c.maiorSalto ? Math.abs(c.maiorSalto.variacao) : 0, onde: c.maiorSalto ? c.maiorSalto.ponto : null, mudancasDeSinal: c.mudancasDeSinal,
    ...(c.ilhas ? { ilhas: c.ilhas.length, saltosNasIlhas: c.nasIlhas.saltos, maiorSaltoNasIlhas: c.nasIlhas.maiorSalto, mudancasDeSinalNasIlhas: c.nasIlhas.mudancasDeSinal } : {}),
  }));
  const json = {
    peca: nome, parte, ...(caixa ? { caixa } : {}), unidades: { curvatura: '1/m', comprimento: 'mm' }, convencao: CONVENCAO, parametros,
    cortes: saida, tabela,
    saltos: saida.reduce((n, c) => n + c.saltos, 0), mudancasDeSinal: saida.reduce((n, c) => n + c.mudancasDeSinal, 0),
  };
  return { json, imagens: pngs };
}

/** tabelaDoPente(json) -> o texto da tabela de cortes (em colunas de Markdown, para colar no registro) */
export function tabelaDoPente(json) {
  const temIlha = json.tabela.some((l) => l.ilhas !== undefined);
  const origem = (c) => (c.origem !== 'zebra' && !c.ilhas ? c.origem : `${c.origem === 'zebra' ? 'zebra' : `${c.origem} e zebra`}: ${[...new Set(c.ilhas.map((i) => i.regiao))].join(', ')}`);
  const cab = ['corte', 'lado', 'origem', 'curvas', 'saltos', 'maior salto (1/m)', 'onde (x, y, z em mm)', 'trocas de sinal', ...(temIlha ? ['ilhas', 'saltos nas ilhas', 'maior salto nas ilhas (1/m)', 'trocas nas ilhas'] : [])];
  const linhas = json.tabela.map((l, k) => [
    l.corte, l.lado ?? 'todos', origem(json.cortes[k]), json.cortes[k].naoCorta ? '0 (não corta)' : json.cortes[k].foraDaCaixa ? '0 (fora da caixa)' : l.curvas, l.saltos, l.maiorSalto ? l.maiorSalto.toFixed(3) : '-',
    l.onde ? l.onde.map((x) => Math.round(x)).join(', ') : '-', l.mudancasDeSinal, ...(temIlha ? [l.ilhas ?? '-', l.saltosNasIlhas ?? '-', l.maiorSaltoNasIlhas ? l.maiorSaltoNasIlhas.toFixed(3) : '-', l.mudancasDeSinalNasIlhas ?? '-'] : []),
  ]);
  return [`| ${cab.join(' | ')} |`, `| ${cab.map(() => '---').join(' | ')} |`, ...linhas.map((l) => `| ${l.join(' | ')} |`)].join('\n');
}

/* ---------- a linha de comando ---------- */

export const OPCOES_DA_CLI = ['opcao', 'corte', 'cortes', 'grade', 'guiado-pela-zebra', 'maximo-de-cortes', 'separacao', 'caixa', 'pasta', 'parte', 'lado', 'passo', 'suavizar', 'limiar', 'janela', 'zero', 'haste', 'saida'];
const BANDEIRAS_DA_CLI = ['ajuda', 'imagens', 'amostras', 'sem-cache'];

/** O número maior que zero de uma opção, ou o padrão quando ela não veio. */
export function numeroPositivo(nome, texto, padrao) {
  if (texto === null || texto === undefined) return padrao;
  const x = Number(texto);
  if (!Number.isFinite(x) || x <= 0) throw new Error(`--${nome} espera um número maior que zero, e veio '${texto}'`);
  return x;
}

/** `--grade` é repetível: as repetições viram uma opção só, separada por vírgula, antes da leitura que recusa opção repetida. */
export function juntarGrades(args) {
  const grades = args.filter((a) => a.startsWith('--grade='));
  if (grades.length < 2) return args;
  return [...args.filter((a) => !a.startsWith('--grade=')), `--grade=${grades.map((a) => a.slice('--grade='.length)).join(',')}`];
}

/** 'um' com `--corte`, 'varios' com `--cortes`, `--grade` ou `--guiado-pela-zebra`; recusa a mistura (a `--caixa` é dos vários cortes) e a falta de plano. */
export function modoDaLinha({ corte = null, cortes = null, grade = null, zebra = null, caixa = null } = {}) {
  const varios = [['--cortes', cortes], ['--grade', grade], ['--guiado-pela-zebra', zebra], ['--caixa', caixa]].filter(([, v]) => v !== null && v !== undefined).map(([n]) => n);
  if (corte !== null && corte !== undefined && varios.length) throw new Error(`--corte mede um plano só e veio junto de ${varios.join(' e ')}; ponha o plano na lista (--cortes=${corte},...) e tire o --corte`);
  if (corte !== null && corte !== undefined) return 'um';
  if (varios.some((n) => n !== '--caixa')) return 'varios';
  throw new Error('o pente pede ao menos um plano: --corte=<x|y|z>:<mm>, --cortes=x:400,y:600, --grade=<eixo>:<de>:<até>:<passo> ou --guiado-pela-zebra=<json da zebra numérica>');
}

async function principal(argv) {
  const uso = `uso: node tools/modelar/pente-de-curvatura.mjs <peça> --corte=<x|y|z>:<mm> | [--cortes=x:400,y:600] [--grade=<eixo>:<de>:<até>:<passo>]... [--guiado-pela-zebra=<json>]\n  outras: --${OPCOES_DA_CLI.filter((o) => !['corte', 'cortes', 'grade', 'guiado-pela-zebra'].includes(o)).join('=..., --')}=..., --${BANDEIRAS_DA_CLI.join(', --')}\n  padrões: passo ${PADROES.passoMm} mm, suavizar ${PADROES.suavizarMm} mm, limiar ${PADROES.limiar} 1/m, janela ${PADROES.janelaMm} mm, máximo de ${PADROES.maximoDeCortes} cortes; ver o cabeçalho do arquivo\n`;
  let lido; let modo = null; let plano = null; let p; let caixa = null;
  try {
    lido = lerArgumentos(juntarGrades(argv.slice(2)), { opcoes: OPCOES_DA_CLI, bandeiras: BANDEIRAS_DA_CLI, posicional: { nome: 'peça', obrigatorio: false } });
    if (lido.bandeira('ajuda')) { process.stderr.write(uso); return 0; }
    if (!lido.posicional) { process.stderr.write(uso); return 2; }
    modo = modoDaLinha({ corte: lido.opcao('corte'), cortes: lido.opcao('cortes'), grade: lido.opcao('grade'), zebra: lido.opcao('guiado-pela-zebra'), caixa: lido.opcao('caixa') });
    p = {
      parte: lido.opcao('parte') ?? null, lado: lido.opcao('lado') ?? null, passoMm: numeroPositivo('passo', lido.opcao('passo'), PADROES.passoMm), suavizarMm: numeroPositivo('suavizar', lido.opcao('suavizar'), PADROES.suavizarMm),
      limiar: numeroPositivo('limiar', lido.opcao('limiar'), PADROES.limiar), janelaMm: numeroPositivo('janela', lido.opcao('janela'), PADROES.janelaMm), zero: numeroPositivo('zero', lido.opcao('zero'), PADROES.zero), hastePx: numeroPositivo('haste', lido.opcao('haste'), null),
    };
    if (modo === 'um') { plano = { cortes: [lerCorte(lido.opcao('corte'))] }; } else {
      caixa = lido.opcao('caixa') === null ? null : lerCaixa(lido.opcao('caixa'));
      plano = planoDeCortes({
        cortes: lido.opcao('cortes') === null ? [] : lerCortes(lido.opcao('cortes')), grades: lido.opcao('grade') === null ? [] : lerGrades(lido.opcao('grade')),
        zebra: lido.opcao('guiado-pela-zebra') === null ? null : lerZebra(lido.opcao('guiado-pela-zebra')), lado: p.lado,
        maximo: numeroPositivo('maximo-de-cortes', lido.opcao('maximo-de-cortes'), PADROES.maximoDeCortes), separacaoMm: numeroPositivo('separacao', lido.opcao('separacao'), null),
      });
    }
  } catch (e) { process.stderr.write(`pente: ${e.message}\n`); return 2; }
  const peca = lido.posicional;
  const cache = !lido.bandeira('sem-cache');
  let neutro;
  try {
    const entrada = await lerEntradaDeMedida(peca, { opcao: opcaoDaLinha(lido.opcao('opcao')), montagem: false, cache });
    if (entrada.tipo === 'receita') {
      /* a receita em arquivo executa uma vez, pelo cache por passo, o mesmo ponto que a zebra, o `conferir-pontos` e a rodada guardam */
      const executada = await executarComCachePorPasso(entrada.abs, entrada.receita, { cache });
      process.stderr.write(avisoDoCachePorPasso(executada, 'pente'));
      neutro = executada.executada.neutro;
    } else neutro = entrada.executar().neutro;
  } catch (e) {
    if (e instanceof ErroDeEntrada) { process.stderr.write(`pente: ${e.message}\n`); return 2; }
    throw e;
  }
  /* a receita de uma parte se chama receita.js: o nome que identifica a peça é o da pasta dela */
  const nome = /^receita\.(mjs|js)$/.test(basename(peca)) ? basename(dirname(resolve(peca))) : basename(peca).replace(/\.(mjs|js|json)$/, '');
  if (modo === 'um') {
    const [corte] = plano.cortes;
    let um;
    try { um = penteDeCurvatura(neutro, { corte, nome, ...p }); } catch (e) { process.stderr.write(`pente: ${e.message}\n`); return 2; }
    const saida = resolve(lido.opcao('saida') ?? `tmp/pente-de-curvatura/${nome}-${corte.eixo}${corte.posicao}.png`);
    mkdirSync(dirname(saida), { recursive: true }); writeFileSync(saida, um.png);
    process.stdout.write(`${JSON.stringify({ ...um.json, imagem: saida }, null, 1)}\n`);
    return 0;
  }
  let varios;
  const t0 = performance.now();
  try { varios = penteDeVariosCortes(neutro, { cortes: plano.cortes, nome, caixa, imagens: lido.bandeira('imagens'), amostras: lido.bandeira('amostras'), separacaoMm: plano.separacaoMm ?? 0, ...p }); } catch (e) { process.stderr.write(`pente: ${e.message}\n`); return 2; }
  const json = { ...varios.json, cortesDeixadosDeFora: plano.cortesDeixadosDeFora, separacaoMm: plano.separacaoMm ?? null };
  if (varios.imagens.length) {
    const pasta = resolve(lido.opcao('pasta') ?? 'tmp/pente-de-curvatura');
    mkdirSync(pasta, { recursive: true });
    for (const i of varios.imagens) {
      const arquivo = join(pasta, `${nome}-${i.eixo}${i.posicao}${i.lado ? `-lado${i.lado}` : ''}.png`);
      writeFileSync(arquivo, i.png);
      json.cortes.find((c) => c.corte.eixo === i.eixo && c.corte.posicaoMm === i.posicao && c.lado === i.lado).imagem = arquivo;
    }
  }
  const texto = `${JSON.stringify(json, null, 1)}\n`;
  if (lido.opcao('saida')) { const s = resolve(lido.opcao('saida')); mkdirSync(dirname(s), { recursive: true }); writeFileSync(s, texto); }
  process.stderr.write(`pente de curvatura — ${nome}, ${json.cortes.length} corte(s) em ${((performance.now() - t0) / 1000).toFixed(1)} s, ${json.saltos} salto(s) e ${json.mudancasDeSinal} troca(s) de sinal\n${tabelaDoPente(json)}\n`);
  if (plano.cortesDeixadosDeFora) process.stderr.write(`pente: ${plano.cortesDeixadosDeFora} corte(s) guiado(s) pela zebra ficaram de fora pelo máximo de ${json.cortes.length}; --maximo-de-cortes=<n> aumenta\n`);
  process.stdout.write(texto);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
