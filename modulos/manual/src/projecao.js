/* projecao.js — projeção ortográfica de uma malha neutra em vistas, com linha visível e escondida. Função pura, sem navegador.

   A malha neutra tem V (id -> [x, y, z] em metro) e F (id -> { vs: [ids dos vértices] }). Tudo aqui sai em milímetro.
   As arestas desenhadas são as das faces (nunca as diagonais da triangulação): as de contorno da silhueta (uma face de frente e
   outra de costas para a vista, ou aresta de uma face só) e as vivas (ângulo entre as normais das duas faces acima do limiar).
   A visibilidade sai de um z-buffer em grade: os triângulos são rasterizados guardando a profundidade mais próxima do observador,
   e cada aresta, amostrada a cada pixel da grade, é visível onde a profundidade dela alcança a do buffer (com uma folga de
   1,5 pixel). Os trechos consecutivos de mesma visibilidade são juntados num segmento só. */

/** As vistas: `para` é a direção do observador (de onde ele olha) e `uv` leva um ponto 3D (mm) ao plano da vista, com v para cima.
 *  Terceiro diedro: a vista de cima fica sobre a de frente e a lateral à direita dela. A de cima tem o fundo da página
 *  voltado para o observador da frente (v = -z) e a lateral direita, vista de +x, tem a frente da peça à esquerda (u = -z). */
export const VISTAS_DO_DESENHO = Object.freeze({
  frente: { para: [0, 0, 1], uv: ([x, y]) => [x, y], rotulo: 'Frente (vista de +z)' },
  cima: { para: [0, 1, 0], uv: ([x, , z]) => [x, -z], rotulo: 'Cima (vista de +y)' },
  lado: { para: [1, 0, 0], uv: ([, y, z]) => [-z, y], rotulo: 'Lado direito (vista de +x)' },
});
export const LIMIAR_PADRAO_GRAUS = 30;
const FOLGA_EM_PIXELS = 1.5;
const LADO_MAXIMO_DA_GRADE = 4096;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);

/** Normal da face pelo método de Newell (serve a polígono não plano). Devolve o vetor unitário, ou null se a face é degenerada. */
function normalDaFace(pontos) {
  let nx = 0; let ny = 0; let nz = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    const a = pontos[i]; const b = pontos[(i + 1) % pontos.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const n = Math.hypot(nx, ny, nz);
  return n < 1e-12 ? null : [nx / n, ny / n, nz / n];
}

/** Triangula um polígono por orelhas no plano da normal; polígono convexo de 3 ou 4 lados sai em leque. */
function triangular(pontos, normal) {
  const n = pontos.length;
  if (n === 3) return [[0, 1, 2]];
  const eixo = [Math.abs(normal[0]), Math.abs(normal[1]), Math.abs(normal[2])];
  const solto = eixo[0] >= eixo[1] && eixo[0] >= eixo[2] ? 0 : (eixo[1] >= eixo[2] ? 1 : 2);
  const [i, j] = [0, 1, 2].filter((k) => k !== solto);
  const sinal = normal[solto] >= 0 ? 1 : -1;
  const p2 = pontos.map((p) => [p[i] * sinal, p[j]]);
  const area = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const dentro = (p, a, b, c) => area(a, b, p) >= -1e-12 && area(b, c, p) >= -1e-12 && area(c, a, p) >= -1e-12;
  const restantes = [...Array(n).keys()];
  const triangulos = [];
  let guarda = n * n;
  while (restantes.length > 3 && guarda > 0) {
    guarda -= 1;
    let cortou = false;
    for (let k = 0; k < restantes.length; k += 1) {
      const a = restantes[(k + restantes.length - 1) % restantes.length];
      const b = restantes[k];
      const c = restantes[(k + 1) % restantes.length];
      if (area(p2[a], p2[b], p2[c]) <= 1e-12) continue;
      const livre = restantes.every((q) => q === a || q === b || q === c || !dentro(p2[q], p2[a], p2[b], p2[c]));
      if (!livre) continue;
      triangulos.push([a, b, c]);
      restantes.splice(k, 1);
      cortou = true;
      break;
    }
    if (!cortou) break;
  }
  if (restantes.length >= 3) {
    for (let k = 1; k + 1 < restantes.length; k += 1) triangulos.push([restantes[0], restantes[k], restantes[k + 1]]);
  }
  return triangulos;
}

/** A malha em milímetro: triângulos, e as arestas das faces com as normais das faces vizinhas e o ângulo entre elas. */
export function prepararMalha(neutro) {
  const posicao = new Map();
  for (const [id, p] of neutro.V) posicao.set(id, [p[0] * 1000, p[1] * 1000, p[2] * 1000]);
  const triangulos = [];
  const arestas = new Map();
  for (const face of neutro.F.values()) {
    const ids = face.vs;
    if (!ids || ids.length < 3) continue;
    const pontos = ids.map((id) => posicao.get(id));
    if (pontos.some((p) => !p)) continue;
    const normal = normalDaFace(pontos);
    if (!normal) continue;
    for (const [a, b, c] of triangular(pontos, normal)) triangulos.push([pontos[a], pontos[b], pontos[c]]);
    for (let i = 0; i < ids.length; i += 1) {
      const a = ids[i]; const b = ids[(i + 1) % ids.length];
      if (a === b) continue;
      const chave = a < b ? `${a}|${b}` : `${b}|${a}`;
      const registro = arestas.get(chave) ?? { chave, va: a < b ? a : b, vb: a < b ? b : a, pa: posicao.get(a < b ? a : b), pb: posicao.get(a < b ? b : a), normais: [] };
      registro.normais.push(normal);
      arestas.set(chave, registro);
    }
  }
  const lista = [...arestas.values()];
  for (const e of lista) {
    if (e.normais.length !== 2) continue;
    const [nA, nB] = e.normais;
    e.graus = (Math.acos(Math.max(-1, Math.min(1, dot(nA, nB)))) * 180) / Math.PI;
  }
  const caixa = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const p of posicao.values()) for (let k = 0; k < 3; k += 1) { caixa.min[k] = Math.min(caixa.min[k], p[k]); caixa.max[k] = Math.max(caixa.max[k], p[k]); }
  return { triangulos, arestas: lista, caixa };
}

const GRAUS_DE_QUINA_FRANCA = 60;

/**
 * As arestas vivas da malha acima do limiar, menos as pontas soltas: uma quina de ângulo franco (abaixo de 60 graus) que termina no
 * meio da superfície, sem encontrar outra aresta viva, é o desvanecer de uma curva facetada (junta de remendo de canto, onde o
 * ângulo entre facetas passa de 30 graus só num trecho curto) e não uma aresta de desenho. Ela some, e a aresta que ficou com a
 * ponta solta some em seguida, até não restar ponta solta. Quina de 90 graus ou aresta de contorno aberto nunca é podada.
 */
export function arestasVivas(malha, limiarGraus) {
  if (malha.vivas?.limiar === limiarGraus) return malha.vivas.lista;
  let vivas = malha.arestas.filter((e) => e.normais.length !== 2 || e.graus >= limiarGraus);
  for (;;) {
    const grau = new Map();
    for (const e of vivas) for (const v of [e.va, e.vb]) grau.set(v, (grau.get(v) ?? 0) + 1);
    const restantes = vivas.filter((e) => e.normais.length !== 2 || e.graus >= GRAUS_DE_QUINA_FRANCA || (grau.get(e.va) > 1 && grau.get(e.vb) > 1));
    if (restantes.length === vivas.length) break;
    vivas = restantes;
  }
  malha.vivas = { limiar: limiarGraus, lista: vivas };
  return vivas;
}

/** As arestas a desenhar numa vista: as vivas e o contorno da silhueta (uma face de frente e outra de costas, ou aresta de uma face só). */
function arestasDaVista(malha, para, limiarGraus) {
  const eps = 1e-6;
  const escolhidas = new Set(arestasVivas(malha, limiarGraus));
  for (const e of malha.arestas) {
    if (e.normais.length !== 2 || escolhidas.has(e)) continue;
    const d1 = dot(e.normais[0], para); const d2 = dot(e.normais[1], para);
    if ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) escolhidas.add(e);
  }
  return [...escolhidas].map((e) => [e.pa, e.pb]);
}

/**
 * Projeta a malha numa vista. Devolve os segmentos visíveis e escondidos em milímetro no plano da vista (u para a direita, v para cima),
 * a caixa da vista e o tamanho da grade usada.
 * `escala` é o pixel por milímetro da página; a grade do z-buffer usa o dobro, limitado a 4096 pixels no maior lado.
 */
export function projetarVista(malha, vista, { limiarGraus = LIMIAR_PADRAO_GRAUS, escala = 4 } = {}) {
  const definicao = VISTAS_DO_DESENHO[vista];
  if (!definicao) throw new Error(`vista '${vista}' desconhecida. Esperado: ${Object.keys(VISTAS_DO_DESENHO).join(', ')}.`);
  const { para, uv } = definicao;
  const profundidade = (p) => dot(p, para);
  let umin = Infinity; let vmin = Infinity; let umax = -Infinity; let vmax = -Infinity;
  const plano = new Map();
  const projetar = (p) => {
    let q = plano.get(p);
    if (!q) { const [u, v] = uv(p); q = [u, v, profundidade(p)]; plano.set(p, q); }
    return q;
  };
  for (const t of malha.triangulos) {
    for (const p of t) {
      const [u, v] = projetar(p);
      if (u < umin) umin = u; if (u > umax) umax = u; if (v < vmin) vmin = v; if (v > vmax) vmax = v;
    }
  }
  const caixa = { umin, umax, vmin, vmax };
  const larguraMm = umax - umin; const alturaMm = vmax - vmin;
  const s = Math.max(0.01, Math.min((escala * 2), LADO_MAXIMO_DA_GRADE / Math.max(larguraMm, alturaMm, 1e-9)));
  const L = Math.ceil(larguraMm * s) + 3; const A = Math.ceil(alturaMm * s) + 3;
  const buffer = new Float32Array(L * A).fill(-Infinity);
  const emPixel = (u, v) => [(u - umin) * s + 1, (vmax - v) * s + 1];
  for (const t of malha.triangulos) {
    const [a, b, c] = t.map((p) => { const [u, v, d] = projetar(p); const [x, y] = emPixel(u, v); return [x, y, d]; });
    const det = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(det) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))); const x1 = Math.min(L - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))); const y1 = Math.min(A - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const px = x + 0.5; const py = y + 0.5;
        const w1 = ((px - a[0]) * (c[1] - a[1]) - (py - a[1]) * (c[0] - a[0])) / det;
        const w2 = ((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])) / det;
        const w0 = 1 - w1 - w2;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const d = w0 * a[2] + w1 * b[2] + w2 * c[2];
        const i = y * L + x;
        if (d > buffer[i]) buffer[i] = d;
      }
    }
  }
  const folga = Math.max(0.02, FOLGA_EM_PIXELS / s);
  /* visível se a profundidade da aresta alcança a do buffer em algum pixel da vizinhança 3x3 (o mais fundo vence: no contorno de
     uma face a aresta dela não some por erro de um pixel) */
  const visivelEm = (x, y, d) => {
    const cx = Math.round(x - 0.5); const cy = Math.round(y - 0.5);
    for (let j = -1; j <= 1; j += 1) {
      for (let i = -1; i <= 1; i += 1) {
        const xx = cx + i; const yy = cy + j;
        if (xx < 0 || yy < 0 || xx >= L || yy >= A) return true;
        if (buffer[yy * L + xx] <= d + folga) return true;
      }
    }
    return false;
  };
  const visiveis = []; const escondidos = [];
  for (const [pa, pb] of arestasDaVista(malha, para, limiarGraus)) {
    const [ua, va, da] = projetar(pa); const [ub, vb, db] = projetar(pb);
    const compPx = Math.hypot(ub - ua, vb - va) * s;
    const n = Math.max(1, Math.ceil(compPx));
    const flags = [];
    for (let k = 0; k <= n; k += 1) {
      const f = k / n;
      const [x, y] = emPixel(ua + (ub - ua) * f, va + (vb - va) * f);
      flags.push(visivelEm(x, y, da + (db - da) * f));
    }
    /* lacunas de até 2 amostras entre trechos de mesmo estado são fechadas: o serrilhado da grade não vira tracejado */
    for (let k = 1; k < n; k += 1) {
      if (flags[k] === flags[k - 1]) continue;
      let m = k; while (m < n && flags[m] !== flags[k - 1]) m += 1;
      if (m < n && m - k <= 2) for (let q = k; q < m; q += 1) flags[q] = flags[k - 1];
    }
    let inicio = 0;
    for (let k = 1; k <= n + 1; k += 1) {
      if (k <= n && flags[k] === flags[inicio]) continue;
      const fim = k - 1;
      const seg = [ua + (ub - ua) * (inicio / n), va + (vb - va) * (inicio / n), ua + (ub - ua) * (fim / n), va + (vb - va) * (fim / n)];
      if (Math.hypot(seg[2] - seg[0], seg[3] - seg[1]) > 0 || n === 1) (flags[inicio] ? visiveis : escondidos).push(seg);
      inicio = k;
    }
  }
  return { vista, caixa, visiveis, escondidos, grade: [L, A], escalaDaGrade: s };
}

export const comprimentoDosSegmentos = (segmentos) => segmentos.reduce((soma, [a, b, c, d]) => soma + Math.hypot(c - a, d - b), 0);
export { norma, sub, cruz };
