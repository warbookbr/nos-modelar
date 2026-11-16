#!/usr/bin/env node
/* mapa-de-desvio.mjs — pinta uma peça pela distância, com sinal e em milímetro, a uma superfície lisa ajustada a ela.
 *
 * POR QUE ELE EXISTE. A zebra e a pintura mostram que a chapa ondula ou amassa, mas nem a pessoa nem o agente tiram delas "aqui está
 * 1,2 mm para dentro". O mapa dá o número e o lugar: cada vértice sai colorido pelo desvio, em mm, à superfície lisa que passaria por
 * aquela região se o defeito não existisse, com a barra de escala em mm na imagem, e o JSON diz o máximo para dentro e para fora e onde.
 *
 * COMO MEDE. A malha é a que a receita entrega (o mesmo `lerEntradaDeMedida` e a mesma execução das outras ferramentas de medida; nada é
 * escrito na receita). A superfície lisa é um ajuste LOCAL de baixa ordem: o espaço é dividido em células de um quarto do `--raio`
 * (padrão 300 mm) e, em cada célula, um polinômio de grau `--grau` (padrão 3) da altura sobre o plano tangente (a normal média dos
 * vértices da célula) é ajustado por mínimos quadrados aos vértices a até `--raio` do centro da célula, com peso gaussiano de meio raio
 * e reajuste robusto (biquadrado de Tukey sobre a mediana dos resíduos), de modo que o amassado e a ondulação, que são menores que a
 * janela, não puxam o ajuste. O desvio do vértice é a altura dele sobre o plano da célula menos o polinômio, pela normal: positivo é
 * para fora da pele, negativo é para dentro. Só entram na janela os vértices cuja normal concorda (cosseno maior que 0,5) com a da
 * célula, e por isso a janela não mistura a pele de fora com a quina nem com a de dentro.
 *
 * Por que o ajuste local e não uma superfície só sobre a parametrização da chapa: a lataria de um carro não é um campo de altura sobre
 * nenhum plano (o teto, a lateral e a tampa se dobram), e o ajuste local serve à chapa plana e à carroceria com a mesma regra. A escolha
 * (raio, grau) está declarada na saída; a chapa de prova (`tools/fixtures/acervo/chapa-de-reflexo-de-prova`, amassado de 1,2 mm e 80 mm
 * de raio) mede o amassado dentro de 10% com o padrão, e o teste confere. O ajuste não vê defeito de escala maior que a janela, e o
 * raio é o que decide qual escala conta como forma e qual como defeito.
 *
 * AS PELES. A lataria é casca de duas peles. Sem `--lado` a malha toda é medida, cada vértice pela própria normal, e a saída avisa
 * quando há duas peles; `--lado=+z` (ou -x, +y, ...) mede só os vértices cuja normal aponta para esse lado, e `--lado=centro`, só os
 * cuja normal aponta para longe do centro da peça (serve à peça que envolve um volume, como a carroceria).
 *
 * Uso: node tools/modelar/mapa-de-desvio.mjs <peça> [--opcao=<n>] [--parte=<nome>] [--lado=<+z|-z|+x|-x|+y|-y|centro>] [--raio=<mm>] [--grau=<1..4>]
 *        [--escala=<mm>] [--vista=<isometrica|isometrica-traseira|frontal|traseira|direita|esquerda|superior|inferior>] [--saida=<png>]
 *   (também `npm run desvio -- <peça> ...`). A imagem vai para `--saida` (padrão tmp/mapa-de-desvio/<peça>.png) e o JSON, para a saída padrão. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeEntrada, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';

export const PADROES = Object.freeze({ raioMm: 300, grau: 3, maximoDePontos: 500 });
export const VISTAS = Object.freeze({ ...Object.fromEntries(Object.entries(VISTAS_BANCADA).map(([k, v]) => [k, v.direcao])), 'isometrica-traseira': Object.freeze([-1, 0.72, -1]) });
export const FUNDO = Object.freeze([242, 244, 243]);
export const TINTA = Object.freeze([30, 34, 38]);

/* ---------- a malha ---------- */

/** A malha do neutro em mm: posições (Float64Array xyz), faces (listas de índices), parte de cada face e a normal de cada vértice (área ponderada). */
export function malhaDoNeutro(neutro, { parte = null } = {}) {
  const indice = new Map();
  const faces = []; const partes = [];
  for (const f of neutro.F.values()) {
    if (parte && f.parte !== parte) continue;
    faces.push(f.vs.map((id) => { if (!indice.has(id)) indice.set(id, indice.size); return indice.get(id); }));
    partes.push(f.parte ?? null);
  }
  if (!faces.length) throw new Error(parte ? `a peça não tem face na parte '${parte}'` : 'a peça não tem face');
  const P = new Float64Array(indice.size * 3);
  for (const [id, i] of indice) { const p = neutro.V.get(id); P[3 * i] = p[0] * 1000; P[3 * i + 1] = p[1] * 1000; P[3 * i + 2] = p[2] * 1000; }
  const N = new Float64Array(indice.size * 3);
  for (const f of faces) {
    let nx = 0; let ny = 0; let nz = 0; /* vetor de Newell: o módulo é o dobro da área */
    for (let k = 0; k < f.length; k++) {
      const a = f[k]; const b = f[(k + 1) % f.length];
      nx += (P[3 * a + 1] - P[3 * b + 1]) * (P[3 * a + 2] + P[3 * b + 2]);
      ny += (P[3 * a + 2] - P[3 * b + 2]) * (P[3 * a] + P[3 * b]);
      nz += (P[3 * a] - P[3 * b]) * (P[3 * a + 1] + P[3 * b + 1]);
    }
    for (const v of f) { N[3 * v] += nx; N[3 * v + 1] += ny; N[3 * v + 2] += nz; }
  }
  for (let i = 0; i < N.length; i += 3) { const m = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= m; N[i + 1] /= m; N[i + 2] /= m; }
  return { P, N, faces, partes, n: indice.size };
}

const LADOS = ['+x', '-x', '+y', '-y', '+z', '-z', 'centro'];

/** Os vértices que entram: sem `lado`, todos; com `+z`..., os de normal para esse lado; com `centro`, os de normal para longe do centro da caixa. */
export function selecionarLado(malha, lado = null) {
  const { P, N, n } = malha;
  const sel = new Uint8Array(n).fill(1);
  if (!lado) return sel;
  if (!LADOS.includes(lado)) throw new Error(`--lado: '${lado}' não vale; use ${LADOS.join(', ')}`);
  let c = [0, 0, 0];
  if (lado === 'centro') {
    const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[3 * i + k]); hi[k] = Math.max(hi[k], P[3 * i + k]); }
    c = lo.map((v, k) => (v + hi[k]) / 2);
  }
  const eixo = 'xyz'.indexOf(lado[1]); const sinal = lado[0] === '-' ? -1 : 1;
  for (let i = 0; i < n; i++) {
    sel[i] = lado === 'centro'
      ? ((P[3 * i] - c[0]) * N[3 * i] + (P[3 * i + 1] - c[1]) * N[3 * i + 1] + (P[3 * i + 2] - c[2]) * N[3 * i + 2] > 0 ? 1 : 0)
      : (sinal * N[3 * i + eixo] > 0 ? 1 : 0);
  }
  return sel;
}

/* ---------- o ajuste ---------- */

function termos(grau) { const t = []; for (let i = 0; i <= grau; i++) for (let j = 0; i + j <= grau; j++) t.push([i, j]); return t; }

function resolver(A, b, m) {
  for (let i = 0; i < m; i++) A[i * m + i] += 1e-9;
  for (let c = 0; c < m; c++) {
    let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(A[r * m + c]) > Math.abs(A[p * m + c])) p = r;
    if (p !== c) { for (let k = 0; k < m; k++) { const t = A[c * m + k]; A[c * m + k] = A[p * m + k]; A[p * m + k] = t; } const t = b[c]; b[c] = b[p]; b[p] = t; }
    const d = A[c * m + c]; if (Math.abs(d) < 1e-14) return null;
    for (let r = c + 1; r < m; r++) { const f = A[r * m + c] / d; if (f === 0) continue; for (let k = c; k < m; k++) A[r * m + k] -= f * A[c * m + k]; b[r] -= f * b[c]; }
  }
  const x = new Array(m);
  for (let r = m - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < m; k++) s -= A[r * m + k] * x[k]; x[r] = s / A[r * m + r]; }
  return x;
}

/** Ajuste robusto h = P(s, t) por mínimos quadrados pesados; `pts` é uma lista de [s, t, h, peso]. Devolve os coeficientes (ou null). */
function ajustarJanela(pts, grau) {
  const T = termos(grau); const m = T.length;
  if (pts.length < m * 3) return null;
  const w = pts.map((p) => p[3]);
  let coef = null;
  for (let it = 0; it < 5; it++) {
    const A = new Float64Array(m * m); const b = new Float64Array(m);
    for (let q = 0; q < pts.length; q++) {
      const [s, t, h] = pts[q]; const wq = w[q]; if (wq <= 0) continue;
      const f = T.map(([i, j]) => s ** i * t ** j);
      for (let r = 0; r < m; r++) { b[r] += wq * f[r] * h; for (let c = 0; c < m; c++) A[r * m + c] += wq * f[r] * f[c]; }
    }
    coef = resolver(A, b, m);
    if (!coef) return null;
    if (it === 4) break;
    const res = pts.map((p) => p[2] - T.reduce((a, [i, j], k) => a + coef[k] * p[0] ** i * p[1] ** j, 0));
    const ordenado = res.map(Math.abs).sort((x, y) => x - y);
    const escala = Math.max(1.4826 * ordenado[Math.floor(ordenado.length / 2)], 0.02) * 4.685;
    for (let q = 0; q < pts.length; q++) { const u = res[q] / escala; w[q] = Math.abs(u) < 1 ? pts[q][3] * (1 - u * u) ** 2 : 0; }
  }
  return { coef, T };
}

/**
 * desvioDaMalha(malha, sel, { raioMm, grau }) -> { desvio: Float64Array (mm, NaN onde não houve ajuste), celulas, semAjuste }
 * Positivo é para fora da pele (a normal média da célula, que concorda com a dos vértices selecionados), negativo é para dentro.
 */
export function desvioDaMalha(malha, sel, { raioMm = PADROES.raioMm, grau = PADROES.grau, maximoDePontos = PADROES.maximoDePontos } = {}) {
  const { P, N, n } = malha;
  const C = raioMm / 4; const alcance = Math.ceil(raioMm / C);
  const chave = (ix, iy, iz) => ((ix + 4096) * 8192 + (iy + 4096)) * 8192 + (iz + 4096);
  const grade = new Map();
  for (let i = 0; i < n; i++) {
    if (!sel[i]) continue;
    const k = chave(Math.floor(P[3 * i] / C), Math.floor(P[3 * i + 1] / C), Math.floor(P[3 * i + 2] / C));
    if (!grade.has(k)) grade.set(k, []);
    grade.get(k).push(i);
  }
  const desvio = new Float64Array(n).fill(Number.NaN);
  let celulas = 0; let semAjuste = 0;
  for (const [, dentro] of grade) {
    const o = [0, 0, 0]; const nr = [0, 0, 0];
    for (const i of dentro) for (let k = 0; k < 3; k++) { o[k] += P[3 * i + k] / dentro.length; nr[k] += N[3 * i + k]; }
    const mn = Math.hypot(...nr) || 1; for (let k = 0; k < 3; k++) nr[k] /= mn;
    const eixoAjuda = Math.abs(nr[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let u = [nr[1] * eixoAjuda[2] - nr[2] * eixoAjuda[1], nr[2] * eixoAjuda[0] - nr[0] * eixoAjuda[2], nr[0] * eixoAjuda[1] - nr[1] * eixoAjuda[0]];
    const mu = Math.hypot(...u); u = u.map((x) => x / mu);
    const v = [nr[1] * u[2] - nr[2] * u[1], nr[2] * u[0] - nr[0] * u[2], nr[0] * u[1] - nr[1] * u[0]];
    const coords = (i) => {
      const d = [P[3 * i] - o[0], P[3 * i + 1] - o[1], P[3 * i + 2] - o[2]];
      return [(d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / raioMm, (d[0] * v[0] + d[1] * v[1] + d[2] * v[2]) / raioMm, d[0] * nr[0] + d[1] * nr[1] + d[2] * nr[2]];
    };
    const [cx, cy, cz] = [Math.floor(dentro[0] === undefined ? 0 : P[3 * dentro[0]] / C), Math.floor(P[3 * dentro[0] + 1] / C), Math.floor(P[3 * dentro[0] + 2] / C)];
    const candidatos = [];
    for (let ix = cx - alcance; ix <= cx + alcance; ix++) for (let iy = cy - alcance; iy <= cy + alcance; iy++) for (let iz = cz - alcance; iz <= cz + alcance; iz++) {
      const lista = grade.get(chave(ix, iy, iz)); if (!lista) continue;
      for (const i of lista) {
        if (N[3 * i] * nr[0] + N[3 * i + 1] * nr[1] + N[3 * i + 2] * nr[2] < 0.5) continue;
        const [s, t, h] = coords(i); const r2 = s * s + t * t;
        if (r2 > 1) continue;
        candidatos.push([s, t, h, Math.exp(-0.5 * (r2 / 0.25))]);
      }
    }
    const passo = Math.max(1, Math.ceil(candidatos.length / maximoDePontos));
    const pts = candidatos.filter((_, q) => q % passo === 0);
    const aj = ajustarJanela(pts, grau);
    if (!aj) { semAjuste += dentro.length; continue; }
    celulas++;
    for (const i of dentro) {
      const [s, t, h] = coords(i);
      desvio[i] = h - aj.T.reduce((a, [p, q], k) => a + aj.coef[k] * s ** p * t ** q, 0);
    }
  }
  return { desvio, celulas, semAjuste };
}

/** O resumo do desvio: o máximo para fora e para dentro (mm e ponto em mm), o rms e a contagem. */
export function resumoDoDesvio(malha, desvio) {
  const { P, n } = malha;
  let fora = null; let dentro = null; let soma2 = 0; let medidos = 0;
  for (let i = 0; i < n; i++) {
    const d = desvio[i]; if (Number.isNaN(d)) continue;
    medidos++; soma2 += d * d;
    const ponto = [P[3 * i], P[3 * i + 1], P[3 * i + 2]].map((x) => Math.round(x * 10) / 10);
    if (!fora || d > fora.mm) fora = { mm: d, ponto };
    if (!dentro || d < dentro.mm) dentro = { mm: d, ponto };
  }
  const arredondar = (x) => (x ? { ...x, mm: Math.round(x.mm * 1000) / 1000 } : null);
  return { maximoParaFora: arredondar(fora), maximoParaDentro: arredondar(dentro), rmsMm: medidos ? Math.round(Math.sqrt(soma2 / medidos) * 1000) / 1000 : null, verticesMedidos: medidos };
}

/* ---------- a imagem ---------- */

const GLIFOS = {};
{
  const t = (s) => s.split('/');
  const lista = {
    0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', 1: '..#../.##../..#../..#../..#../..#../.###.', 2: '.###./#...#/....#/...#./..#../.#.../#####',
    3: '####./....#/....#/.###./....#/....#/####.', 4: '#...#/#...#/#...#/#####/....#/....#/....#', 5: '#####/#..../####./....#/....#/#...#/.###.',
    6: '.###./#..../#..../####./#...#/#...#/.###.', 7: '#####/....#/...#./..#../.#.../.#.../.#...', 8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
    9: '.###./#...#/#...#/.####/....#/....#/.###.', A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.',
    C: '.###./#...#/#..../#..../#..../#...#/.###.', D: '####./#...#/#...#/#...#/#...#/#...#/####.', E: '#####/#..../#..../####./#..../#..../#####',
    F: '#####/#..../#..../####./#..../#..../#....', G: '.###./#...#/#..../#.###/#...#/#...#/.###.', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
    I: '.###./..#../..#../..#../..#../..#../.###.', J: '..###/...#./...#./...#./...#./#..#./.##..', K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    L: '#..../#..../#..../#..../#..../#..../#####', M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
    O: '.###./#...#/#...#/#...#/#...#/#...#/.###.', P: '####./#...#/#...#/####./#..../#..../#....', Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    R: '####./#...#/#...#/####./#.#../#..#./#...#', S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..',
    U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.', V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
    X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#', Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
    '.': '...../...../...../...../...../.##../.##..', ',': '...../...../...../...../.##../..#../.#...', '-': '...../...../...../#####/...../...../.....',
    '+': '...../..#../..#../#####/..#../..#../.....', '/': '....#/....#/...#./..#../.#.../#..../#....', ':': '...../.##../.##../...../.##../.##../.....',
    '=': '...../...../#####/...../#####/...../.....', '(': '...#./..#../.#.../.#.../.#.../..#../...#.', ')': '.#.../..#../...#./...#./...#./..#../.#...',
    '%': '##..#/##..#/...#./..#../.#.../#..##/#..##', _: '...../...../...../...../...../...../#####', m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
    '<': '...#./..#../.#.../#..../.#.../..#../...#.', '>': '.#.../..#../...#./....#/...#./..#../.#...',
  };
  for (const [k, v] of Object.entries(lista)) GLIFOS[k] = t(v);
}

/** O quadro de pixels RGBA. */
export class Quadro {
  constructor(largura, altura, fundo = FUNDO) {
    this.W = largura; this.H = altura; this.d = new Uint8Array(largura * altura * 4);
    for (let i = 0; i < largura * altura; i++) { this.d[4 * i] = fundo[0]; this.d[4 * i + 1] = fundo[1]; this.d[4 * i + 2] = fundo[2]; this.d[4 * i + 3] = 255; }
  }

  ponto(x, y, cor) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const i = 4 * (y * this.W + x); this.d[i] = cor[0]; this.d[i + 1] = cor[1]; this.d[i + 2] = cor[2];
  }

  retangulo(x0, y0, x1, y1, cor) { for (let y = Math.round(y0); y < Math.round(y1); y++) for (let x = Math.round(x0); x < Math.round(x1); x++) this.ponto(x, y, cor); }

  linha(x0, y0, x1, y1, cor, espessura = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    const r = Math.floor((espessura - 1) / 2);
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n; const y = y0 + ((y1 - y0) * k) / n;
      for (let a = -r; a <= r + ((espessura - 1) % 2); a++) for (let b = -r; b <= r + ((espessura - 1) % 2); b++) this.ponto(x + a, y + b, cor);
    }
  }

  /** O texto em fonte de 5 por 7 (maiúsculas, dígitos e alguns sinais; sem acento), ancorado no canto superior esquerdo; devolve a largura em pixels. */
  texto(x, y, texto, { escala = 2, cor = TINTA } = {}) {
    let cx = x;
    for (const ch of String(texto)) {
      const g = GLIFOS[ch] ?? GLIFOS[ch.toUpperCase()];
      if (g) for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') this.retangulo(cx + c * escala, y + r * escala, cx + (c + 1) * escala, y + (r + 1) * escala, cor);
      cx += 6 * escala;
    }
    return cx - x;
  }

  larguraDoTexto(texto, escala = 2) { return String(texto).length * 6 * escala; }

  png() { const p = new PNG({ width: this.W, height: this.H }); Buffer.from(this.d.buffer).copy(p.data); return PNG.sync.write(p); }
}

/** A base da câmera ortográfica de uma direção (de onde ela olha): `{ direita, cima, perto }`, com y para cima (z quando olha de cima). */
export function baseDaVista(direcao) {
  const m = Math.hypot(...direcao); const d = direcao.map((x) => x / m);
  const ajuda = Math.abs(d[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0];
  let r = [ajuda[1] * d[2] - ajuda[2] * d[1], ajuda[2] * d[0] - ajuda[0] * d[2], ajuda[0] * d[1] - ajuda[1] * d[0]];
  const mr = Math.hypot(...r); r = r.map((x) => x / mr);
  const c = [d[1] * r[2] - d[2] * r[1], d[2] * r[0] - d[0] * r[2], d[0] * r[1] - d[1] * r[0]];
  return { direita: r, cima: c, perto: d };
}

/** Número "redondo" de escala (1, 2, 2,5, 5 vezes uma potência de dez) igual ou acima de `x`. */
export function numeroRedondo(x) {
  if (!(x > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(x)); const f = x / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}

const ESCALA_DA_COR = [[0.17, 0.33, 0.75], [0.97, 0.97, 0.97], [0.80, 0.16, 0.14]];
/** A cor divergente (azul para dentro, branco em zero, vermelho para fora) de um desvio na escala `±escala`. */
export function corDoDesvio(d, escala) {
  const u = Math.max(-1, Math.min(1, d / escala));
  const [a, b] = u < 0 ? [ESCALA_DA_COR[1], ESCALA_DA_COR[0]] : [ESCALA_DA_COR[1], ESCALA_DA_COR[2]];
  const k = Math.abs(u);
  return a.map((x, i) => (x + (b[i] - x) * k) * 255);
}

/** Rasteriza a malha em projeção ortográfica, com o desvio por vértice interpolado, em `largura` x `altura` com supersampling 2x. Devolve o quadro e o px/mm. */
export function pintarMalha(malha, sel, desvio, { vista = 'isometrica-traseira', escalaMm, largura = 1280, altura = 720, margemDireita = 150, margemSuperior = 70 } = {}) {
  const direcao = VISTAS[vista]; if (!direcao) throw new Error(`--vista: '${vista}' não existe; use ${Object.keys(VISTAS).join(', ')}`);
  const { direita, cima, perto } = baseDaVista(direcao);
  const { P, faces, n } = malha;
  const X = new Float64Array(n); const Y = new Float64Array(n); const Z = new Float64Array(n);
  let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
  const usados = new Uint8Array(n);
  for (const f of faces) if (f.every((i) => sel[i])) for (const i of f) usados[i] = 1;
  for (let i = 0; i < n; i++) {
    X[i] = P[3 * i] * direita[0] + P[3 * i + 1] * direita[1] + P[3 * i + 2] * direita[2];
    Y[i] = P[3 * i] * cima[0] + P[3 * i + 1] * cima[1] + P[3 * i + 2] * cima[2];
    Z[i] = P[3 * i] * perto[0] + P[3 * i + 1] * perto[1] + P[3 * i + 2] * perto[2];
    if (usados[i]) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]); }
  }
  const areaW = largura - margemDireita - 30; const areaH = altura - margemSuperior - 60;
  const pxMm = Math.min(areaW / (x1 - x0), areaH / (y1 - y0));
  const SS = 2; const W = largura * SS; const H = altura * SS;
  const ox = 30 + (areaW - (x1 - x0) * pxMm) / 2; const oy = margemSuperior + (areaH - (y1 - y0) * pxMm) / 2;
  const sx = (i) => (ox + (X[i] - x0) * pxMm) * SS; const sy = (i) => (oy + (y1 - Y[i]) * pxMm) * SS;
  const prof = new Float64Array(W * H).fill(-Infinity); const cor = new Uint8Array(W * H * 3);
  const cinza = [170, 170, 170];
  for (const f of faces) {
    if (!f.every((i) => sel[i])) continue;
    const a0 = f[0];
    /* a luz de cabeça: a face voltada para a câmera fica clara, a rasante escurece um pouco */
    const e1 = [P[3 * f[1]] - P[3 * a0], P[3 * f[1] + 1] - P[3 * a0 + 1], P[3 * f[1] + 2] - P[3 * a0 + 2]];
    const e2 = [P[3 * f[2]] - P[3 * a0], P[3 * f[2] + 1] - P[3 * a0 + 1], P[3 * f[2] + 2] - P[3 * a0 + 2]];
    const nf = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const mf = Math.hypot(...nf) || 1;
    const cosseno = Math.abs((nf[0] * perto[0] + nf[1] * perto[1] + nf[2] * perto[2]) / mf);
    const luz = 0.62 + 0.38 * cosseno;
    for (let k = 1; k + 1 < f.length; k++) {
      const tri = [a0, f[k], f[k + 1]];
      const px = tri.map(sx); const py = tri.map(sy);
      const den = (py[1] - py[2]) * (px[0] - px[2]) + (px[2] - px[1]) * (py[0] - py[2]);
      if (Math.abs(den) < 1e-9) continue;
      const ia = Math.max(0, Math.floor(Math.min(...px))); const ib = Math.min(W - 1, Math.ceil(Math.max(...px)));
      const ja = Math.max(0, Math.floor(Math.min(...py))); const jb = Math.min(H - 1, Math.ceil(Math.max(...py)));
      for (let j = ja; j <= jb; j++) for (let i = ia; i <= ib; i++) {
        const l0 = ((py[1] - py[2]) * (i + 0.5 - px[2]) + (px[2] - px[1]) * (j + 0.5 - py[2])) / den;
        const l1 = ((py[2] - py[0]) * (i + 0.5 - px[2]) + (px[0] - px[2]) * (j + 0.5 - py[2])) / den;
        const l2 = 1 - l0 - l1;
        if (l0 < -1e-9 || l1 < -1e-9 || l2 < -1e-9) continue;
        const z = l0 * Z[tri[0]] + l1 * Z[tri[1]] + l2 * Z[tri[2]];
        const q = j * W + i; if (z <= prof[q]) continue;
        prof[q] = z;
        const ds = [desvio[tri[0]], desvio[tri[1]], desvio[tri[2]]];
        const c = ds.some(Number.isNaN) ? cinza : corDoDesvio(l0 * ds[0] + l1 * ds[1] + l2 * ds[2], escalaMm);
        cor[3 * q] = c[0] * luz; cor[3 * q + 1] = c[1] * luz; cor[3 * q + 2] = c[2] * luz;
      }
    }
  }
  const quadro = new Quadro(largura, altura);
  for (let j = 0; j < altura; j++) for (let i = 0; i < largura; i++) {
    let r = 0; let g = 0; let b = 0; let m = 0;
    for (let dj = 0; dj < SS; dj++) for (let di = 0; di < SS; di++) {
      const q = (j * SS + dj) * W + i * SS + di; if (prof[q] === -Infinity) continue;
      r += cor[3 * q]; g += cor[3 * q + 1]; b += cor[3 * q + 2]; m++;
    }
    if (m) { const k = m / (SS * SS); const o = 4 * (j * largura + i); quadro.d[o] = (r / m) * k + FUNDO[0] * (1 - k); quadro.d[o + 1] = (g / m) * k + FUNDO[1] * (1 - k); quadro.d[o + 2] = (b / m) * k + FUNDO[2] * (1 - k); }
  }
  return { quadro, pxMm, origem: { x0, y1, ox, oy } };
}

/** A barra de cor vertical, com os valores em mm, e a régua de comprimento. */
function legendas(quadro, { escalaMm, pxMm, titulo, linhas }) {
  const { W, H } = quadro;
  quadro.texto(30, 16, titulo, { escala: 3 });
  linhas.forEach((l, k) => quadro.texto(30, 44 + k * 18, l, { escala: 2, cor: [90, 96, 102] }));
  const bx = W - 110; const by0 = 90; const by1 = H - 90;
  for (let y = by0; y <= by1; y++) {
    const d = escalaMm * (1 - (2 * (y - by0)) / (by1 - by0));
    const c = corDoDesvio(d, escalaMm); quadro.retangulo(bx, y, bx + 26, y + 1, c);
  }
  quadro.linha(bx, by0, bx + 26, by0, TINTA); quadro.linha(bx, by1, bx + 26, by1, TINTA); quadro.linha(bx, by0, bx, by1, TINTA); quadro.linha(bx + 26, by0, bx + 26, by1, TINTA);
  const fmt = (v) => `${v > 0 ? '+' : ''}${(Math.round(v * 100) / 100).toString()}`;
  for (let k = 0; k <= 4; k++) {
    const y = by0 + ((by1 - by0) * k) / 4; const v = escalaMm * (1 - k / 2);
    quadro.linha(bx + 26, y, bx + 32, y, TINTA); quadro.texto(bx + 36, y - 7, fmt(v), { escala: 2 });
  }
  quadro.texto(bx, by0 - 40, 'MM', { escala: 2 });
  quadro.texto(bx - 20, by0 - 18, 'PARA FORA', { escala: 1 });
  quadro.texto(bx - 20, by1 + 10, 'PARA DENTRO', { escala: 1 });
  /* a régua de comprimento, em mm da peça (na vista, o comprimento é o projetado) */
  const mm = numeroRedondo((W * 0.18) / pxMm / 1.0);
  const comp = Math.round(mm * pxMm);
  quadro.linha(30, H - 30, 30 + comp, H - 30, TINTA, 2); quadro.linha(30, H - 36, 30, H - 24, TINTA); quadro.linha(30 + comp, H - 36, 30 + comp, H - 24, TINTA);
  quadro.texto(30, H - 56, `${mm} MM NA VISTA`, { escala: 2 });
}

/* ---------- a ferramenta ---------- */

/**
 * mapaDeDesvio(neutro, opcoes) -> { json, png: Buffer }; opcoes: { nome, parte, lado, raioMm, grau, escalaMm, vista }.
 * `escalaMm` é o máximo da barra de cor (simétrica); sem ele, o número redondo acima do percentil 98 do desvio absoluto (o máximo, que numa peça com vinco é o vinco, esticaria a escala e apagaria a ondulação); o que passa da escala sai na cor cheia.
 */
export function mapaDeDesvio(neutro, { nome = 'peca', parte = null, lado = null, raioMm = PADROES.raioMm, grau = PADROES.grau, escalaMm = null, vista = 'isometrica-traseira' } = {}) {
  if (!Number.isInteger(grau) || grau < 1 || grau > 4) throw new Error(`--grau espera um inteiro de 1 a 4, e veio ${grau}`);
  if (!(raioMm > 0)) throw new Error(`--raio espera um número de mm maior que zero, e veio ${raioMm}`);
  const malha = malhaDoNeutro(neutro, { parte });
  const sel = selecionarLado(malha, lado);
  const avisos = [];
  if (!lado) {
    /* duas peles: a de fora e a de dentro têm normais opostas na mesma região (vértices a menos de 8 mm, em amostra de até 400) */
    const hash = new Map(); const cel = 8; const k3 = (x, y, z) => `${x}|${y}|${z}`;
    for (let i = 0; i < malha.n; i++) { const k = k3(Math.floor(malha.P[3 * i] / cel), Math.floor(malha.P[3 * i + 1] / cel), Math.floor(malha.P[3 * i + 2] / cel)); if (!hash.has(k)) hash.set(k, []); hash.get(k).push(i); }
    let oposto = 0;
    for (let i = 0; i < malha.n; i += Math.max(1, Math.floor(malha.n / 400))) {
      const [x, y, z] = [0, 1, 2].map((c) => Math.floor(malha.P[3 * i + c] / cel));
      let achou = false;
      for (let a = -1; a <= 1 && !achou; a++) for (let b = -1; b <= 1 && !achou; b++) for (let c = -1; c <= 1 && !achou; c++) {
        for (const j of hash.get(k3(x + a, y + b, z + c)) ?? []) {
          if (malha.N[3 * i] * malha.N[3 * j] + malha.N[3 * i + 1] * malha.N[3 * j + 1] + malha.N[3 * i + 2] * malha.N[3 * j + 2] < -0.8) { achou = true; break; }
        }
      }
      if (achou) oposto++;
    }
    if (oposto > 3) avisos.push('a peça tem duas peles (há vértices a menos de 8 mm com normais opostas): cada vértice é medido pela própria normal, e o sinal da pele de dentro é o contrário do da de fora; use --lado para medir uma pele só');
  }
  const { desvio, celulas, semAjuste } = desvioDaMalha(malha, sel, { raioMm, grau });
  const resumo = resumoDoDesvio(malha, desvio);
  if (!resumo.verticesMedidos) throw new Error('nenhum vértice foi medido: o raio é pequeno demais para a malha, ou o lado não tem vértice');
  const absolutos = Array.from(desvio).filter((d) => !Number.isNaN(d)).map(Math.abs).sort((a, b) => a - b);
  const p98 = absolutos[Math.min(absolutos.length - 1, Math.floor(absolutos.length * 0.98))];
  const escala = escalaMm ?? numeroRedondo(Math.max(p98, 0.01));
  const { quadro, pxMm } = pintarMalha(malha, sel, desvio, { vista, escalaMm: escala });
  legendas(quadro, {
    escalaMm: escala, pxMm,
    titulo: `DESVIO A SUPERFICIE LISA (MM) - ${nome}`,
    linhas: [`VISTA ${vista.toUpperCase()}   AJUSTE LOCAL GRAU ${grau} RAIO ${raioMm} MM${lado ? `   LADO ${lado}` : ''}${parte ? `   PARTE ${parte}` : ''}`,
      `PARA FORA ${resumo.maximoParaFora.mm} MM   PARA DENTRO ${resumo.maximoParaDentro.mm} MM   RMS ${resumo.rmsMm} MM`],
  });
  const json = {
    peca: nome, parte, lado, unidades: 'mm', convencao: 'positivo é para fora da pele (normal da célula), negativo é para dentro',
    ajuste: { tipo: 'polinomial local robusto sobre o plano tangente', raioMm, grau, celulas, verticesSemAjuste: semAjuste },
    vista, escalaDaCorMm: escala, p98AbsolutoMm: Math.round(p98 * 1000) / 1000, ...resumo, avisos,
  };
  return { json, png: quadro.png() };
}

export const OPCOES_DA_CLI = ['opcao', 'parte', 'lado', 'raio', 'grau', 'escala', 'vista', 'saida'];

async function principal(argv) {
  let lido;
  try { lido = lerArgumentos(argv.slice(2), { opcoes: OPCOES_DA_CLI, bandeiras: ['ajuda'], posicional: { nome: 'peça', obrigatorio: false } }); } catch (e) { process.stderr.write(`desvio: ${e.message}\n`); return 2; }
  const peca = lido.posicional;
  if (lido.bandeira('ajuda') || !peca) { process.stderr.write(`uso: node tools/modelar/mapa-de-desvio.mjs <peça> [--${OPCOES_DA_CLI.join('=...] [--')}=...]\n  ver o cabeçalho do arquivo\n`); return lido.bandeira('ajuda') ? 0 : 2; }
  const numero = (nome, padrao) => { const t = lido.opcao(nome); if (t === null || t === undefined) return padrao; const x = Number(t); if (!Number.isFinite(x)) throw new Error(`--${nome} espera um número, e veio '${t}'`); return x; };
  let entrada;
  try { entrada = await lerEntradaDeMedida(peca, { opcao: opcaoDaLinha(lido.opcao('opcao')), montagem: false }); } catch (e) {
    if (e instanceof ErroDeEntrada) { process.stderr.write(`desvio: ${e.message}\n`); return 2; }
    throw e;
  }
  const nome = basename(peca).replace(/\.(mjs|js|json)$/, '');
  const { json, png } = mapaDeDesvio(entrada.executar().neutro, {
    nome, parte: lido.opcao('parte') ?? null, lado: lido.opcao('lado') ?? null, raioMm: numero('raio', PADROES.raioMm), grau: numero('grau', PADROES.grau),
    escalaMm: numero('escala', null), vista: lido.opcao('vista') ?? 'isometrica-traseira',
  });
  const saida = resolve(lido.opcao('saida') ?? `tmp/mapa-de-desvio/${nome}.png`);
  mkdirSync(dirname(saida), { recursive: true }); writeFileSync(saida, png);
  process.stdout.write(`${JSON.stringify({ ...json, imagem: saida }, null, 2)}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
