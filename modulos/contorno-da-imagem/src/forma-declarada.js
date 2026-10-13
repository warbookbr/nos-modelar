/* forma-declarada.js — a forma que o desenhador de contorno declara para um
 * trecho da borda de uma parte.
 *
 * O desenhador entende a referência e sabe que o bordo de ataque de uma asa é
 * reto, que a capota é um arco e que o volume escuro na frente da asa é um
 * detalhe. Ele declara em `<imagem>.regioes.json`, por parte:
 *
 *   "formas": { "asaEsq": [ { "de": [30, 156], "ate": [205, 148], "forma": "reta" } ] }
 *
 * `de` e `ate` são dois pontos da borda da parte, em pixel da imagem, como as
 * sementes; o trecho é o arco mais curto do contorno entre eles. A forma é
 * `reta`, `curva` (spline cúbica de Bézier, que cobre o arco e a curva suave) ou
 * `detalhe` (manter como a imagem dá, que é o que acontece sem declaração).
 *
 * A reta ou a curva é ajustada por mínimos quadrados nos pontos densos da borda
 * subpixel do trecho. Se a imagem se afasta do declarado mais que a tolerância
 * (`TOLERANCIA_DA_FORMA_PX`, 1,5 px por padrão), nada é ajustado e o aviso diz o
 * trecho, a parte e o desvio, para o desenhador conferir se aquilo é detalhe.
 * Como as cadeias da borda são compartilhadas entre as partes vizinhas, o
 * ajuste de um trecho numa divisa vale para as duas, e nenhuma delas perde o
 * encaixe. A junção com uma terceira região no meio do trecho vai ao ponto da
 * reta ou da curva mais perto dela, e todas as cadeias que chegam nela a
 * seguem; a junção na ponta do trecho fica onde está. */
import { areaComSinal } from './borda-subpixel.js';

export const TOLERANCIA_DA_FORMA_PX = 1.5;
export const FORMAS_DECLARAVEIS = ['reta', 'curva', 'detalhe'];
const ALCANCE_DO_PONTO_PX = 3;
const DISTANCIA_MINIMA_DO_TRECHO_PX = 1;
const FLECHA_DA_CURVA_PX = 0.08;
const DESVIO_DA_CUBICA_PX = 0.15;
const PONTOS_MINIMOS_DA_CUBICA = 24;
const arred = (v) => Math.round(v * 1e6) / 1e6;
const virgula = (n) => n.toFixed(2).replace('.', ',');

const ponto = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

export function validarFormas(formas, rotuloPorNome) {
  if (formas === undefined) return;
  if (!formas || typeof formas !== 'object' || Array.isArray(formas)) throw new Error('formas: o campo é um objeto { "<parte>": [ { "de": [x, y], "ate": [x, y], "forma": "reta" } ] }.');
  for (const [parte, lista] of Object.entries(formas)) {
    if (!Object.hasOwn(rotuloPorNome, parte)) throw new Error(`formas: '${parte}' não é uma parte do arquivo de regiões.`);
    if (!Array.isArray(lista)) throw new Error(`formas: '${parte}' é uma lista de trechos { "de", "ate", "forma" }.`);
    for (const t of lista) {
      if (!ponto(t?.de) || !ponto(t?.ate)) throw new Error(`formas: o trecho de '${parte}' precisa de "de" e "ate" como [x, y] em pixel da imagem.`);
      if (!FORMAS_DECLARAVEIS.includes(t.forma)) throw new Error(`formas: o trecho de '${parte}' declara forma '${t.forma}'; use ${FORMAS_DECLARAVEIS.join(', ')}.`);
    }
  }
}

/* Os pontos densos de um anel, na ordem do anel, com o uso e a posição de cada
   um no uso. O último ponto de cada uso é o primeiro do próximo e não repete. */
function densoDoAnel(cadeias, usos, anel) {
  const pts = []; const uso = []; const loc = [];
  anel.forEach((k, pos) => {
    const u = usos[k]; const b = cadeias[u.cadeia].bruto;
    const lista = u.inv ? [...b].reverse() : b;
    for (let i = 0; i < lista.length - 1; i += 1) { pts.push(lista[i]); uso.push(pos); loc.push(i); }
  });
  return { pts, uso, loc };
}

function maisPerto(pts, [x, y]) {
  let m = 0; let dm = Infinity;
  for (let i = 0; i < pts.length; i += 1) { const d = Math.hypot(pts[i][0] - x, pts[i][1] - y); if (d < dm) { dm = d; m = i; } }
  return { i: m, d: dm };
}

function ajustarReta(T) {
  const n = T.length;
  const cx = T.reduce((s, p) => s + p[0], 0) / n; const cy = T.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0; let sxy = 0; let syy = 0;
  for (const [x, y] of T) { sxx += (x - cx) ** 2; sxy += (x - cx) * (y - cy); syy += (y - cy) ** 2; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u = [Math.cos(ang), Math.sin(ang)];
  const projetar = ([x, y]) => { const t = (x - cx) * u[0] + (y - cy) * u[1]; return [cx + t * u[0], cy + t * u[1]]; };
  let desvio = 0;
  for (const p of T) { const q = projetar(p); desvio = Math.max(desvio, Math.hypot(p[0] - q[0], p[1] - q[1])); }
  return { desvio, projetar };
}

const bez = (P, t) => {
  const a = (1 - t) ** 3; const b = 3 * t * (1 - t) ** 2; const c = 3 * t * t * (1 - t); const d = t ** 3;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};

/* Bézier cúbica pelos mínimos quadrados, com os dois extremos nos extremos do
   trecho; devolve os quatro pontos de controle, o parâmetro de cada ponto e o
   desvio máximo. */
function ajustarBezier(T) {
  const n = T.length;
  const P0 = T[0]; const P3 = T[n - 1];
  const acum = [0];
  for (let i = 1; i < n; i += 1) acum.push(acum[i - 1] + Math.hypot(T[i][0] - T[i - 1][0], T[i][1] - T[i - 1][1]));
  let t = acum.map((a) => a / (acum[n - 1] || 1));
  let P = [P0, [P0[0] + (P3[0] - P0[0]) / 3, P0[1] + (P3[1] - P0[1]) / 3], [P0[0] + (2 * (P3[0] - P0[0])) / 3, P0[1] + (2 * (P3[1] - P0[1])) / 3], P3];
  for (let volta = 0; volta < 6; volta += 1) {
    let a11 = 0; let a12 = 0; let a22 = 0; const r1 = [0, 0]; const r2 = [0, 0];
    for (let i = 0; i < n; i += 1) {
      const u = t[i]; const b0 = (1 - u) ** 3; const b1 = 3 * u * (1 - u) ** 2; const b2 = 3 * u * u * (1 - u); const b3 = u ** 3;
      a11 += b1 * b1; a12 += b1 * b2; a22 += b2 * b2;
      for (let c = 0; c < 2; c += 1) { const r = T[i][c] - b0 * P0[c] - b3 * P3[c]; r1[c] += b1 * r; r2[c] += b2 * r; }
    }
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-9) break;
    P = [P0, [0, 1].map((c) => (a22 * r1[c] - a12 * r2[c]) / det), [0, 1].map((c) => (a11 * r2[c] - a12 * r1[c]) / det), P3];
    /* Um passo de Newton em cada parâmetro, para o ponto cair no pé da perpendicular. */
    t = t.map((u, i) => {
      const [x, y] = bez(P, u);
      const d1x = 3 * ((1 - u) ** 2 * (P[1][0] - P[0][0]) + 2 * u * (1 - u) * (P[2][0] - P[1][0]) + u * u * (P[3][0] - P[2][0]));
      const d1y = 3 * ((1 - u) ** 2 * (P[1][1] - P[0][1]) + 2 * u * (1 - u) * (P[2][1] - P[1][1]) + u * u * (P[3][1] - P[2][1]));
      const d2x = 6 * ((1 - u) * (P[2][0] - 2 * P[1][0] + P[0][0]) + u * (P[3][0] - 2 * P[2][0] + P[1][0]));
      const d2y = 6 * ((1 - u) * (P[2][1] - 2 * P[1][1] + P[0][1]) + u * (P[3][1] - 2 * P[2][1] + P[1][1]));
      const num = (x - T[i][0]) * d1x + (y - T[i][1]) * d1y;
      const den = d1x * d1x + d1y * d1y + (x - T[i][0]) * d2x + (y - T[i][1]) * d2y;
      return den ? Math.min(1, Math.max(0, u - num / den)) : u;
    });
    t[0] = 0; t[n - 1] = 1;
  }
  const passos = Math.max(64, n * 2);
  const amostra = Array.from({ length: passos + 1 }, (_, k) => bez(P, k / passos));
  let desvio = 0;
  for (const p of T) {
    let dm = Infinity;
    for (let k = 0; k < passos; k += 1) {
      const [ax, ay] = amostra[k]; const [bx, by] = amostra[k + 1]; const dx = bx - ax; const dy = by - ay; const q = dx * dx + dy * dy;
      const s = q ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / q)) : 0;
      dm = Math.min(dm, Math.hypot(p[0] - (ax + s * dx), p[1] - (ay + s * dy)));
    }
    desvio = Math.max(desvio, dm);
  }
  return { P, t, desvio };
}

/* Os pontos de uma Bézier entre dois parâmetros, sem os extremos, com a corda
   a no máximo `FLECHA_DA_CURVA_PX` da curva. */
function amostrarCurva(P, t0, t1) {
  const saida = [];
  const dist = (p, a, b) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const q = dx * dx + dy * dy;
    const s = q ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / q)) : 0;
    return Math.hypot(p[0] - (a[0] + s * dx), p[1] - (a[1] + s * dy));
  };
  const rec = (a, b, pa, pb, prof) => {
    const m = (a + b) / 2; const pm = bez(P, m);
    const plano = [0.25, 0.75].every((f) => dist(bez(P, a + (b - a) * f), pa, pb) <= FLECHA_DA_CURVA_PX) && dist(pm, pa, pb) <= FLECHA_DA_CURVA_PX;
    if (plano || prof >= 12) return;
    rec(a, m, pa, pm, prof + 1); saida.push(pm); rec(m, b, pm, pb, prof + 1);
  };
  rec(t0, t1, bez(P, t0), bez(P, t1), 0);
  return saida;
}

/* A curva do trecho: uma Bézier cúbica que o desvio de 0,15 px aceita, ou, quando
   um arco longo não cabe numa só (uma cúbica passa a 0,35 px de um arco de 140
   graus de um círculo de 35 px de raio), duas ou mais emendadas pelo ponto da
   borda, cada uma ajustada nos pontos do seu pedaço. `amostrar(k0, k1)` devolve
   os pontos da curva entre os pontos densos k0 e k1 do trecho, sem os extremos. */
function ajustarCurva(T) {
  const pedacos = [];
  const ajusta = (i0, i1) => {
    const b = ajustarBezier(T.slice(i0, i1 + 1));
    if (b.desvio > DESVIO_DA_CUBICA_PX && i1 - i0 > PONTOS_MINIMOS_DA_CUBICA) {
      const m = Math.floor((i0 + i1) / 2);
      ajusta(i0, m); ajusta(m, i1);
    } else pedacos.push({ i0, i1, ...b });
  };
  ajusta(0, T.length - 1);
  const amostrar = (k0, k1) => {
    const saida = [];
    for (const p of pedacos) {
      const lo = Math.max(k0, p.i0); const hi = Math.min(k1, p.i1);
      if (lo >= hi) continue;
      if (lo === p.i0 && lo > k0) saida.push(T[lo]);
      saida.push(...amostrarCurva(p.P, p.t[lo - p.i0], p.t[hi - p.i0]));
    }
    return saida;
  };
  /* O ponto da curva mais perto de `p`, para levar uma junção do trecho à curva. */
  const projetar = (p) => {
    let melhor = null;
    for (const pc of pedacos) for (let k = 0; k <= 200; k += 1) {
      const q = bez(pc.P, k / 200); const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (!melhor || d < melhor.d) melhor = { d, q };
    }
    return melhor.q;
  };
  return { desvio: Math.max(...pedacos.map((p) => p.desvio)), amostrar, projetar };
}

/* Troca, na cadeia, o trecho de índices densos [c0, c1] por `novos` (que já
   inclui os dois extremos). Os pontos novos levam um índice denso entre c0 e c1. */
function trocarNaCadeia(cadeia, c0, c1, novos) {
  const antes = []; const depois = [];
  cadeia.idx.forEach((idx, k) => { if (idx < c0) antes.push([idx, cadeia.simpl[k]]); else if (idx > c1) depois.push([idx, cadeia.simpl[k]]); });
  const meio = novos.map((p, k) => [c0 + ((c1 - c0) * k) / Math.max(1, novos.length - 1), p.map(arred)]);
  const todos = [...antes, ...meio, ...depois].filter(([, p], k, l) => k === 0 || p[0] !== l[k - 1][1][0] || p[1] !== l[k - 1][1][1]);
  cadeia.idx = todos.map(([i]) => i); cadeia.simpl = todos.map(([, p]) => p);
}

function aplicarUm(tracado, parte, rotulo, trecho, tolerancia, relatorio) {
  const { cadeias } = tracado;
  const usos = tracado.usosPorRotulo.get(rotulo) ?? [];
  const aneis = (tracado.aneisPorRotulo.get(rotulo) ?? []).filter((anel) => {
    const pts = []; anel.forEach((k) => pts.push(...(usos[k].inv ? [...cadeias[usos[k].cadeia].simpl].reverse() : cadeias[usos[k].cadeia].simpl)));
    return areaComSinal(pts) < 0;
  });
  let melhor = null;
  for (const anel of aneis) {
    const D = densoDoAnel(cadeias, usos, anel);
    const a = maisPerto(D.pts, trecho.de); const b = maisPerto(D.pts, trecho.ate);
    if (!melhor || a.d + b.d < melhor.a.d + melhor.b.d) melhor = { anel, D, a, b };
  }
  const rotuloTrecho = `[${trecho.de}] a [${trecho.ate}]`;
  if (!melhor) throw new Error(`formas: '${parte}' não tem contorno; o trecho ${rotuloTrecho} não tem onde ser aplicado.`);
  for (const [nome, p] of [['de', melhor.a], ['ate', melhor.b]]) {
    if (p.d > ALCANCE_DO_PONTO_PX) throw new Error(`formas: o ponto "${nome}" do trecho ${rotuloTrecho} de '${parte}' está a ${virgula(p.d)} px da borda da parte; dê dois pontos da borda dela.`);
  }
  const { anel, D } = melhor; const M = D.pts.length;
  let iA = melhor.a.i; let iB = melhor.b.i;
  const [pa, pb] = [D.pts[iA], D.pts[iB]];
  if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < DISTANCIA_MINIMA_DO_TRECHO_PX) throw new Error(`formas: os dois pontos do trecho ${rotuloTrecho} de '${parte}' caem no mesmo lugar da borda (a menos de ${DISTANCIA_MINIMA_DO_TRECHO_PX} px um do outro); dê dois pontos mais afastados.`);
  const frente = (iB - iA + M) % M + 1; const tras = (iA - iB + M) % M + 1;
  if (tras < frente) [iA, iB] = [iB, iA];
  const contagem = (iB - iA + M) % M + 1;
  const arco = Array.from({ length: contagem }, (_, k) => (iA + k) % M);
  const T = arco.map((i) => D.pts[i]);
  if (T.length < 3) throw new Error(`formas: o trecho ${rotuloTrecho} de '${parte}' é curto demais para ajustar.`);
  const base = { parte, ...(trecho.nome ? { nome: trecho.nome } : {}), forma: trecho.forma, de: trecho.de, ate: trecho.ate };
  if (trecho.forma === 'detalhe') { relatorio.detalhes.push(base); return; }
  const reta = trecho.forma === 'reta';
  const ajuste = reta ? ajustarReta(T) : ajustarCurva(T);
  const desvio = arred(ajuste.desvio);
  if (ajuste.desvio > tolerancia) {
    relatorio.avisos.push({
      ...base, desvioPx: desvio, toleranciaPx: tolerancia,
      mensagem: `'${parte}', trecho ${rotuloTrecho} declarado ${trecho.forma}: a imagem se afasta ${virgula(ajuste.desvio)} px do declarado (tolerância ${virgula(tolerancia)} px); não ajustei. Confira se aquilo é detalhe.`,
    });
    return;
  }
  /* Os grupos do arco por uso, cada um com a faixa de índices densos dele. */
  const grupos = [];
  arco.forEach((i, k) => {
    const g = grupos[grupos.length - 1];
    if (g && g.pos === D.uso[i] && D.loc[i] === g.l1 + 1) { g.l1 = D.loc[i]; g.k1 = k; } else grupos.push({ pos: D.uso[i], l0: D.loc[i], l1: D.loc[i], k0: k, k1: k });
  });
  /* Um último grupo de um ponto só, no começo de um uso, é a junção onde o
     trecho termina: o grupo anterior vai até ela. */
  let terminaNaJuncao = false;
  if (grupos.length > 1 && grupos[grupos.length - 1].l0 === 0 && grupos[grupos.length - 1].l1 === 0) { grupos.pop(); terminaNaJuncao = true; }
  let antes = 0; let depois = 0;
  const posDoNo = (id) => tracado.nos.get(id);
  /* Uma junção no meio do trecho é de três regiões; ela vai ao ponto da reta ou
     da curva mais perto dela, e todas as cadeias que chegam nela a seguem. Na
     ponta do trecho ela fica onde está. */
  const moverNo = (id, ponto) => {
    tracado.nos.set(id, ponto);
    for (const c of cadeias) {
      if (c.a === id) c.simpl[0] = ponto;
      if (c.b === id) c.simpl[c.simpl.length - 1] = ponto;
    }
  };
  grupos.forEach((g, gi) => {
    const uso = usos[anel[g.pos]]; const ultimo = gi === grupos.length - 1;
    if (gi > 0 && uso.ini >= 0) moverNo(uso.ini, ajuste.projetar(posDoNo(uso.ini)).map(arred));
    if ((!ultimo || terminaNaJuncao) && uso.fim >= 0 && !(ultimo && terminaNaJuncao)) moverNo(uso.fim, ajuste.projetar(posDoNo(uso.fim)).map(arred));
  });
  grupos.forEach((g, gi) => {
    const uso = usos[anel[g.pos]]; const cadeia = cadeias[uso.cadeia]; const n = cadeia.bruto.length;
    const ultimo = gi === grupos.length - 1;
    const iniciaNoTrecho = gi === 0 && g.l0 !== 0;
    const fimNaJuncao = !ultimo || terminaNaJuncao;
    const l0 = g.l0; const l1 = fimNaJuncao ? n - 1 : g.l1;
    const k0 = g.k0; const k1 = fimNaJuncao ? g.k1 + 1 : g.k1;
    const dense = (l) => (uso.inv ? cadeia.bruto[n - 1 - l] : cadeia.bruto[l]);
    const noIni = l0 === 0 && uso.ini >= 0 ? posDoNo(uso.ini) : null;
    const noFim = l1 === n - 1 && uso.fim >= 0 ? posDoNo(uso.fim) : null;
    const S = noIni ?? (reta && iniciaNoTrecho ? ajuste.projetar(dense(l0)) : dense(l0));
    const E = noFim ?? (reta && !fimNaJuncao ? ajuste.projetar(dense(l1)) : dense(l1));
    let Q = [];
    if (!reta) Q = ajuste.amostrar(k0, Math.min(k1, T.length - 1));
    const novos = [S, ...Q, E];
    const [c0, c1] = uso.inv ? [n - 1 - l1, n - 1 - l0] : [l0, l1];
    const lista = uso.inv ? [...novos].reverse() : novos;
    antes += cadeia.idx.filter((idx) => idx >= c0 && idx <= c1).length;
    trocarNaCadeia(cadeia, c0, c1, lista);
    depois += lista.length;
  });
  relatorio.ajustadas.push({ ...base, desvioPx: desvio, verticesAntes: antes, verticesDepois: depois });
}

/* Aplica as formas declaradas nas cadeias do traço. Devolve `ajustadas` (a
   forma entrou), `avisos` (a imagem se afasta mais que a tolerância e nada
   mudou) e `detalhes` (mantidos como a imagem dá). */
export function aplicarFormas(tracado, { formas, rotuloPorNome, tolerancia = TOLERANCIA_DA_FORMA_PX }) {
  const relatorio = { ajustadas: [], avisos: [], detalhes: [] };
  validarFormas(formas, rotuloPorNome);
  for (const [parte, lista] of Object.entries(formas ?? {})) {
    for (const trecho of lista) aplicarUm(tracado, parte, rotuloPorNome[parte], trecho, tolerancia, relatorio);
  }
  return relatorio;
}
