/* cordao-de-prova.mjs — a forma desenhada por código com que se prova o perfil lido do corte (ler-perfil.py): uma chapa reta ao
   longo de uma direção horizontal de 35 graus com o eixo z, com a seção inclinada e abaulada (y = 0,3 w - 0,25 w², com w a
   distância horizontal perpendicular à linha, em metro), e sobre ela um detalhe de borda: um cordão de 25 mm de largura ou uma
   calha de canal duplo de 62 mm. O detalhe é dado como polilinha (w, h) em mm, com h medido para cima a partir da chapa.

   Os cortes do pacote cego saem desta chapa por planos z = const e x = const, que a linha corta a 35 e a 55 graus da normal; o
   pacote é desenhado pelo imagens.py como o do prisma (pacote-de-prova.mjs), com as cotas e os anéis por cima do traço. O
   perfil esperado vem da própria forma, no quadro do friso: n é a normal da chapa na âncora (para cima), t a direção da linha
   e u = n x t. Tudo em metro, y para cima, exceto onde o nome diz mm. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { py } from './pacote-de-prova.mjs';

export const FI = (35 * Math.PI) / 180;
/** A direção da linha de feição, horizontal. */
export const T0 = [Math.sin(FI), 0, Math.cos(FI)];
/** A direção horizontal perpendicular à linha, na qual w cresce. */
export const W0 = [Math.cos(FI), 0, -Math.sin(FI)];
export const INCLINACAO = 0.3;
export const CURVATURA = 0.25;
export const W_MAX = 0.16;

/** O cordão: 25 mm de largura, 6 mm de altura, com degrau de 1,5 mm na borda de um lado e de 2 mm no outro, e os ombros em um ou
    dois segmentos, de modo que o perfil não é simétrico (um espelho em u se acusa). */
export const CORDAO = [[-12.5, 0], [-12.5, 1.5], [-10.5, 4.5], [-6, 6], [4, 6], [9, 5], [12.5, 2], [12.5, 0]];
/** O cordão fino de 10 mm de largura e 3 mm de altura, também assimétrico: o detalhe que o corte do trecho inteiro, com menos de meio
    pixel por milímetro, não resolve, e o corte ampliado lê. */
export const CORDAO_10 = [[-5, 0], [-5, 1], [-3, 3], [3, 3], [5, 1.5], [5, 0]];
/** A calha de canal duplo, 62 mm: três nervuras (as bordas de 9 e 7 mm e a do meio de 6 mm) e dois canais cujo fundo toca a chapa. */
export const CALHA = [[-31, 0], [-31, 2], [-28, 9], [-23, 9], [-19, 3], [-15, 0.5], [-10, 0.5], [-6, 4], [-3, 6], [3, 6], [6, 4], [10, 0.5], [15, 0.5],
  [19, 3], [23, 7], [28, 7], [31, 2], [31, 0]];
/** Um sulco de 3 mm abaixo da chapa, para provar o aviso do que o friso não refaz. */
export const SULCO = [[-10, 0], [-7, -3], [7, -3], [10, 0]];
/** O lábio enrolado de uma calha: a chapa sobe pelo lado direito de um círculo de 6,5 mm de raio com o centro 6,5 mm acima da
    chapa, dá a volta com o raio encolhendo 1 mm, cruza o começo da volta e volta à chapa. A pele cruza a si mesma, e o contorno
    do corte tem um laço. O centro do círculo e o raio médio do laço são o que a leitura tem de achar. */
export const ROLO_CENTRO = [0, 6.5];
export const ROLO_RAIO = 6.5;
export const ROLO = [[-30, 0], [-12, 0], ...Array.from({ length: 49 }, (_, k) => {
  const a = -Math.PI / 2 + (2 * Math.PI * k) / 48;
  const r = ROLO_RAIO - (1 * k) / 48;
  return [ROLO_CENTRO[0] + r * Math.cos(a), ROLO_CENTRO[1] + r * Math.sin(a)];
}), [8, 1], [14, 0], [30, 0]];

export const base = (w) => INCLINACAO * w - CURVATURA * w * w;
export const inclinacaoDaBase = (w) => INCLINACAO - 2 * CURVATURA * w;

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };

/** A seção (w, h) em mm do detalhe, com a chapa lisa em volta de -W_MAX a +W_MAX, e `largura` o fator que estica o detalhe em w
    (1 = como declarado), tudo reamostrado a cada `passo` mm de comprimento de arco. */
export function secaoDoDetalhe(detalhe, { largura = 1, passo = 0.25, semi = W_MAX * 1000 } = {}) {
  const d = detalhe.map(([w, h]) => [w * largura, h]);
  const L = semi;
  const cru = [[-L, 0], ...d, [L, 0]];
  const out = [cru[0]];
  for (let i = 0; i + 1 < cru.length; i++) {
    const [a, b] = [cru[i], cru[i + 1]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / passo));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/** O contorno do corte c ({eixo, valor}) da chapa com a seção dada, como cadeia [[u, v]] em metro: z = valor dá (x, y) e x = valor dá (z, y). */
export function contornoDoCorte(c, secao) {
  return secao.map(([w, h]) => {
    const W = w / 1000;
    const y = base(W) + h / 1000;
    // o ponto da chapa com a coordenada w no plano do corte
    if (c.eixo === 'z') return [(W + c.valor * Math.sin(FI)) / Math.cos(FI), y];
    return [(c.valor * Math.cos(FI) - W) / Math.sin(FI), y];
  });
}

/** O quadro do friso na âncora w = wa (em mm) sobre a chapa: o ponto, t, n (para cima) e u = n x t. */
export function quadroEsperado(wa) {
  const W = wa / 1000;
  const pontoDaBase = (w) => [w * W0[0], base(w), w * W0[2]];
  const b = unit([W0[0], inclinacaoDaBase(W), W0[2]]);
  let n = unit(cruz(T0, b));
  if (n[1] < 0) n = n.map((v) => -v);
  return { p: pontoDaBase(W), t: T0, n, u: cruz(n, T0), pontoDaBase };
}

/** O ponto (w, h) em mm da seção no quadro do friso na âncora wa, em mm (u, v). */
export function pontoEsperado(wa, w, h) {
  const q = quadroEsperado(wa);
  const W = w / 1000;
  const rel = sub([W * W0[0], base(W) + h / 1000, W * W0[2]], q.p);
  return [dot(rel, q.u) * 1000, dot(rel, q.n) * 1000];
}

/** O perfil esperado do detalhe em mm no quadro do friso na âncora wa, de base a base: o contorno do detalhe sem a chapa em volta. */
export function perfilEsperado(detalhe, wa, { largura = 1, passo = 0.25 } = {}) {
  const q = quadroEsperado(wa);
  const s = secaoDoDetalhe(detalhe, { largura, passo }).filter(([w]) => w >= detalhe[0][0] * largura - 1e-9 && w <= detalhe[detalhe.length - 1][0] * largura + 1e-9);
  return s.map(([w, h]) => {
    const W = w / 1000;
    const P = [W * W0[0], base(W) + h / 1000, W * W0[2]];
    const rel = sub(P, q.p);
    return [dot(rel, q.u) * 1000, dot(rel, q.n) * 1000];
  });
}

/** A linha de feição lida: a reta ao longo de T0 sobre a chapa em w = wa (mm), do comprimento dado, com um ruído determinístico de
    até `ruido` mm em cada coordenada, em mm, como uma polilinha_3d de ler-linhas. */
export function linhaDeFeicao(wa, { comprimento = 600, ruido = 0, passo = 5 } = {}) {
  const q = quadroEsperado(wa);
  const pontos = [];
  for (let k = 0; k * passo <= comprimento; k++) {
    const tau = (k * passo - comprimento / 2) / 1000;
    const r = (j) => ruido * Math.sin(1.7 * k + 2.3 * j);
    pontos.push(q.p.map((v, j) => Math.round((v + tau * T0[j]) * 1e5) / 100 + r(j)));
  }
  return { tolerancia_mm: 3, polilinhas_3d: [{ confianca: 'alta', comprimento_mm: comprimento, pontos_mm: pontos }] };
}

/** Grava <dir>/pacote/cortes com os cortes dados ({nome, eixo, valor, secao}), desenhados pelo imagens.py com cotas e anéis. */
export function montarPacoteDaChapa(dir, cortes) {
  const p = (...n) => join(dir, ...n);
  mkdirSync(p('pacote', 'cortes'), { recursive: true });
  const lista = cortes.map((c) => ({ nome: c.nome, eixo: c.eixo, valor: c.valor, eixos_uv: c.eixo === 'z' ? ['x', 'y'] : ['z', 'y'], cadeias: [contornoDoCorte(c, c.secao)] }));
  writeFileSync(p('cortes.json'), JSON.stringify({ simetria_x: false, cortes: lista }));
  py('imagens.py', ['cortes', p('cortes.json'), p('pacote', 'cortes')]);
  return lista;
}

/** Grava em <dir>/pacote/cortes os cortes de detalhe ampliados de `detalhes` ({regiao, corte (o nome do corte do trecho inteiro),
    janela [u0, u1, v0, v1] em metro, px_por_mm}), desenhados pelo imagens.py com "detalhe": true, a partir dos cortes dados, como
    pacote-cego.py faz: cortes/<corte>-<regiao>.png e cortes/quadro-detalhe.json. */
export function montarDetalhesDaChapa(dir, cortes, detalhes) {
  const p = (...n) => join(dir, ...n);
  const lista = detalhes.map((d) => {
    const c = cortes.find((x) => x.nome === d.corte);
    return { nome: `${d.corte}-${d.regiao}`, eixo: c.eixo, valor: c.valor, eixos_uv: c.eixo === 'z' ? ['x', 'y'] : ['z', 'y'], janela: d.janela,
      px_por_mm: d.px_por_mm, corte_base: d.corte, regiao: d.regiao, cadeias: [contornoDoCorte(c, c.secao)] };
  });
  writeFileSync(p('detalhes.json'), JSON.stringify({ detalhe: true, simetria_x: false, cortes: lista }));
  py('imagens.py', ['cortes', p('detalhes.json'), p('pacote', 'cortes')]);
  return lista;
}

/** A seção de um plano de corte do pacote (x ou z em metro) como o contorno da chapa na faixa dada. */
export const corteDe = (eixo, valor, secao) => ({ nome: `${eixo}${Math.round(valor * 1000)}`, eixo, valor, secao });
