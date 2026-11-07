/* furgao-realista, receita/luzes.js — por dentro das luzes da frente (etapa 8, `referencias/luzes.md`): o refletor de cada luz, uma capa única cuja borda segue o
 * contorno da lente por dentro do aro e que se curva para trás até um furo no fundo (o soquete da lâmpada), e a lâmpada, uma revolução com o soquete atrás.
 *
 * A capa é uma malha polar: a borda é o contorno do vão encolhido (as quinas concordadas com o raio menos o encolhimento), cada anel é a borda reduzida em direção
 * ao centro (a lâmpada principal), e o último anel é o círculo do furo. A profundidade de cada ponto é uma função do quanto ele já andou até o centro, e as facetas
 * são vincos vivos ao longo de raios. Os pontos têm nome e entram no TOPO; o lado direito é o espelho do esquerdo, com as faces na ordem invertida. */
import { superficieDaFrente, derivarFarois, derivarLuzesDeCanto, derivarPiscasLaterais } from './farol.js';

/* ---------- contas em 2D ---------- */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1]];
const esc = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cruz2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const norma = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => esc(a, 1 / norma(a));

/** A área com sinal de um polígono: positiva no sentido anti-horário. */
const area2 = (poly) => poly.reduce((s, p, k) => s + cruz2(p, poly[(k + 1) % poly.length]), 0) / 2;

/** O polígono convexo anti-horário encolhido `d` para dentro: cada lado anda `d` pela normal e os vizinhos se encontram. */
function encolher(poly, d) {
  const n = poly.length;
  const retas = poly.map((p, k) => { const q = poly[(k + 1) % n]; const t = unit(sub(q, p)); return { p: soma(p, esc([-t[1], t[0]], d)), t }; });
  return poly.map((_, k) => {
    const a = retas[(k - 1 + n) % n]; const b = retas[k];
    const s = cruz2(sub(b.p, a.p), b.t) / cruz2(a.t, b.t);
    return soma(a.p, esc(a.t, s));
  });
}

/** Os cantos de `poly` (anti-horário e convexo) concordados com `raios` (0 deixa o canto vivo) e os lados longos divididos em trechos de até `passo`:
 *  a volta fechada, sem repetir o primeiro ponto. */
function concordar(poly, raios, passo, grau = 18) {
  const n = poly.length; const pts = [];
  poly.forEach((p, k) => {
    const a = poly[(k - 1 + n) % n]; const b = poly[(k + 1) % n];
    const r = raios[k];
    if (!(r > 0.01)) { pts.push(p); return; }
    const u1 = unit(sub(a, p)); const u2 = unit(sub(b, p));
    const alfa = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2))));
    if (alfa > Math.PI - 0.02) { pts.push(p); return; }
    let t = r / Math.tan(alfa / 2);
    t = Math.min(t, 0.48 * Math.min(norma(sub(a, p)), norma(sub(b, p))));
    const re = t * Math.tan(alfa / 2);
    const T1 = soma(p, esc(u1, t)); const T2 = soma(p, esc(u2, t));
    const C = soma(p, esc(unit(soma(u1, u2)), re / Math.sin(alfa / 2)));
    const th1 = Math.atan2(T1[1] - C[1], T1[0] - C[0]); const th2 = Math.atan2(T2[1] - C[1], T2[0] - C[0]);
    let varre = th2 - th1; while (varre <= 0) varre += 2 * Math.PI;
    const m = Math.max(2, Math.ceil((varre * 180) / Math.PI / grau));
    for (let i = 0; i <= m; i += 1) { const th = th1 + (varre * i) / m; pts.push([C[0] + re * Math.cos(th), C[1] + re * Math.sin(th)]); }
  });
  const fina = [];
  pts.forEach((p, k) => {
    const q = pts[(k + 1) % pts.length]; const L = norma(sub(q, p)); const m = Math.max(1, Math.ceil(L / passo));
    for (let i = 0; i < m; i += 1) fina.push(soma(p, esc(sub(q, p), i / m)));
  });
  return fina;
}

/** A distância de `c` ao contorno `poly` ao longo da direção `dir`. */
function alcance(c, dir, poly) {
  let melhor = Infinity;
  poly.forEach((p, k) => {
    const q = poly[(k + 1) % poly.length]; const e = sub(q, p);
    const den = cruz2(dir, e);
    if (Math.abs(den) < 1e-12) return;
    const s = cruz2(sub(p, c), e) / den; const r = cruz2(sub(p, c), dir) / den;
    if (s > 1e-9 && r >= -1e-9 && r <= 1 + 1e-9 && s < melhor) melhor = s;
  });
  return melhor;
}

/* ---------- a capa polar ---------- */

const ANEIS = [1, 0.88, 0.76, 0.64, 0.52, 0.42, 0.33, 0.25];

/** A capa de uma luz: pontos nomeados `${prefixo}_${anel}_${raio}`, faces entre os anéis (do contorno ao furo) e os vincos dos raios de faceta. `borda` é o
 *  contorno 2D anti-horário, `centro` o ponto de onde os raios partem, `profundidade(rho, p)` quanto o ponto fica atrás da borda (mm), `posicao(p, prof)` o ponto 3D
 *  (mm) e `fora` a direção 3D para onde a face de frente da capa olha (as faces são viradas se a ordem estiver ao contrário). */
function capaPolar({ prefixo, borda, centro, raioFuro, profundidade, posicao, fora, facetas }) {
  const J = borda.length; const K = ANEIS.length;
  const nome = (k, j) => `${prefixo}_${k}_${j % J}`;
  const posicoes = new Map();
  for (let j = 0; j < J; j += 1) {
    const v = sub(borda[j], centro); const L = norma(v);
    for (let k = 0; k <= K; k += 1) {
      const rho = k < K ? ANEIS[k] : raioFuro / L;
      if (k === K && rho > ANEIS[K - 1] - 0.03) throw new Error(`furgao-realista: o furo do soquete (${raioFuro} mm) fica a ${(raioFuro / L).toFixed(2)} do contorno em ${prefixo}, e não cabe depois do último anel`);
      const p = soma(centro, esc(v, rho));
      posicoes.set(nome(k, j), posicao(p, profundidade(rho, p)));
    }
  }
  let faces = [];
  for (let k = 0; k < K; k += 1) for (let j = 0; j < J; j += 1) faces.push([nome(k, j), nome(k, j + 1), nome(k + 1, j + 1), nome(k + 1, j)]);
  /* a face olha para `fora` quando a normal dela, em 3D, aponta para lá */
  const P = (n) => posicoes.get(n);
  const [a, b, c] = faces[0].map(P);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if (nrm[0] * fora[0] + nrm[1] * fora[1] + nrm[2] * fora[2] < 0) faces = faces.map(([p, q, r, s]) => [p, s, r, q]);
  /* as facetas: raios equidistantes em ângulo, cada um o mais perto de um raio da malha */
  const ang = borda.map((p) => Math.atan2(p[1] - centro[1], p[0] - centro[0]));
  const vincos = []; const usados = new Set();
  for (let i = 0; i < facetas; i += 1) {
    const alvo = -Math.PI + (2 * Math.PI * i) / facetas;
    let melhor = 0; let dist = Infinity;
    ang.forEach((t, j) => { const d = Math.abs(Math.atan2(Math.sin(t - alvo), Math.cos(t - alvo))); if (d < dist) { dist = d; melhor = j; } });
    if (usados.has(melhor)) continue;
    usados.add(melhor);
    vincos.push({ nome: `${prefixo}_faceta${melhor}`, pontos: Array.from({ length: K + 1 }, (_, k) => nome(k, melhor)), nitidez: 'viva' });
  }
  return { vertices: [...posicoes.keys()].sort(), faces, vincos, posicoes, furo: Array.from({ length: J }, (_, j) => nome(K, j)), J, K };
}

/** O espelho em x de uma capa: os pontos ganham o nome do outro lado e as faces saem na ordem inversa. */
function espelhar(capa, de, para) {
  const renome = (n) => n.replace(de, para);
  const posicoes = new Map([...capa.posicoes].map(([n, [x, y, z]]) => [renome(n), [-x, y, z]]));
  return {
    ...capa, posicoes, vertices: [...posicoes.keys()].sort(),
    faces: capa.faces.map(([p, q, r, s]) => [renome(p), renome(s), renome(r), renome(q)]),
    vincos: capa.vincos.map((v) => ({ ...v, nome: renome(v.nome), pontos: v.pontos.map(renome) })),
    furo: capa.furo.map(renome).reverse(),
  };
}

/* ---------- as lâmpadas ---------- */

/** O perfil [raio, ao longo do eixo] em mm de uma lâmpada com soquete: a flange atrás do furo, o bulbo e, na ponta, a tampinha (a máscara que corta a luz alta). */
const perfilDaLampada = (r, comprimento, flange) => ({
  bulbo: [[0, -6], [flange, -6], [flange, -1], [r, -1], [r, comprimento * 0.62], [r * 0.82, comprimento * 0.78], [r * 0.45, comprimento * 0.93], [0, comprimento]],
  tampinha: [[0, comprimento * 0.8], [r * 0.62, comprimento * 0.8], [r * 0.62, comprimento * 0.88], [r * 0.36, comprimento * 1.04], [0, comprimento * 1.08]],
});

/* ---------- o conjunto ---------- */

/** Os refletores e as lâmpadas da frente, em mm: `refletores` (um por luz, com os pontos, as faces e os vincos da capa, para `subdivisao`) e `lampadas` (uma por luz,
 *  com a base em mm, o eixo e os perfis do bulbo e da tampinha, para `lathe`). As posições são as do lado esquerdo (+x) espelhadas no direito. */
export function derivarLuzesPorDentro(T, f) {
  const S = superficieDaFrente(T, f);
  const refletores = []; const lampadas = [];
  const encosto = T.refletor_encosto;

  /* ---- os faróis ---- */
  const [esq] = derivarFarois(T);
  {
    const [p0, p1, p2, p3] = esq.farol;
    const raiosDentro = esq.raios.map((r) => Math.max(0, r - T.farol_aro_meia_largura - 2));
    const inset = T.farol_aro_meia_largura + 2;
    const borda = concordar(encolher(esq.farol, inset), raiosDentro, 36);
    const yMeio = (T.farol_y_base + T.farol_y_topo) / 2; const altura = T.farol_y_topo - T.farol_y_base;
    const larguraMeio = (p1[0] - p0[0]) - ((p1[0] - p2[0]) * (yMeio - T.farol_y_base)) / altura;
    const centro = [p0[0] + T.farol_lampada_x * larguraMeio, yMeio];
    const q = [p0[0] + T.farol_posicao_x * larguraMeio, T.farol_y_base + T.farol_posicao_y * altura];
    const rhoDoPonto = (p) => { const v = sub(p, centro); return norma(v) / alcance(centro, unit(v), borda); };
    const profundidade = (rho, p) => {
      const dq = norma(sub(p, q));
      const poco = T.farol_posicao_profundidade * Math.exp(-((dq / T.farol_posicao_raio) ** 2)) * (1 - rho ** 3);
      return T.farol_refletor_profundidade * (1 - rho ** 2) + poco;
    };
    const posicao = (p, prof) => [p[0], p[1], S.zS(p[0], p[1]) - encosto - prof];
    const capa = capaPolar({ prefixo: 'refletorFarolEsquerdo', borda, centro, raioFuro: T.refletor_furo, profundidade, posicao, fora: [0, 0, 1], facetas: T.refletor_facetas });
    refletores.push({ nome: 'refletorFarolEsquerdo', capa, espessura: T.refletor_espessura });
    refletores.push({ nome: 'refletorFarolDireito', capa: espelhar(capa, 'Esquerdo', 'Direito'), espessura: T.refletor_espessura });
    /* a lâmpada principal assenta no furo; a de posição, no fundo da segunda concavidade (a capa passa por ela) */
    const zFuro = S.zS(centro[0], centro[1]) - encosto - profundidade(T.refletor_furo / alcance(centro, [1, 0], borda), centro);
    const zQ = S.zS(q[0], q[1]) - encosto - profundidade(rhoDoPonto(q), q);
    const gran = perfilDaLampada(11, 52, 19); const peq = perfilDaLampada(5.5, 24, 9);
    for (const [lado, s] of [['Esquerdo', 1], ['Direito', -1]]) {
      lampadas.push({ nome: `lampadaFarol${lado}`, base: [s * centro[0], centro[1], zFuro], eixo: 'z', graus: 0, ...gran });
      lampadas.push({ nome: `lampadaPosicaoFarol${lado}`, base: [s * q[0], q[1], zQ + 1], eixo: 'z', graus: 0, ...peq });
    }
  }

  /* ---- as luzes de canto: a capa é o vão visto pela diagonal, com a profundidade ao longo dela ---- */
  const [luzE] = derivarLuzesDeCanto(T, f);
  {
    const d = [Math.SQRT1_2, 0, Math.SQRT1_2];
    const vao = luzE.contorno;
    const borda = concordar(encolher(vao, T.refletor_inset_luz), luzE.raios.map((r) => Math.max(0, r - T.refletor_inset_luz)), 24);
    const ys = vao.map((p) => p[1]); const yc = T.farol_y_base + T.luz_canto_lampada_y * (Math.max(...ys) - Math.min(...ys));
    const us = borda.filter((p) => Math.abs(p[1] - yc) < 25).map((p) => p[0]);
    const centro = [(Math.min(...us) + Math.max(...us)) / 2 + 8, yc];
    const prof = (rho) => T.luz_canto_profundidade * (1 - rho ** 2);
    const posicao = (p, pr) => { const s = S.ponto(p[0], p[1]); const t = encosto + pr; return [s[0] - d[0] * t, s[1], s[2] - d[2] * t]; };
    const capa = capaPolar({ prefixo: 'refletorLuzDeCantoEsquerda', borda, centro, raioFuro: 9, profundidade: prof, posicao, fora: d, facetas: 0 });
    refletores.push({ nome: 'refletorLuzDeCantoEsquerda', capa, espessura: T.refletor_espessura });
    refletores.push({ nome: 'refletorLuzDeCantoDireita', capa: espelhar(capa, 'Esquerda', 'Direita'), espessura: T.refletor_espessura });
    const b = posicao(centro, prof(9 / alcance(centro, [1, 0], borda)));
    const perfil = perfilDaLampada(7, 26, 12);
    lampadas.push({ nome: 'lampadaLuzDeCantoEsquerda', base: b, eixo: 'z', graus: 45, ...perfil });
    lampadas.push({ nome: 'lampadaLuzDeCantoDireita', base: [-b[0], b[1], b[2]], eixo: 'z', graus: -45, ...perfil });
  }

  /* ---- os piscas laterais: a capa é o vão visto pelo eixo x (u = -z), com a profundidade para dentro em x ---- */
  const [piscaE] = derivarPiscasLaterais(T);
  {
    const vao = piscaE.contorno;
    const xL = f.xs((T.pisca_lateral_y[0] + T.pisca_lateral_y[1]) / 2);
    const borda = concordar(encolher(vao, 4), piscaE.raios.map((r) => Math.max(0, r - 4)), 14);
    const centro = [(vao[0][0] + vao[1][0]) / 2 + 6, (T.pisca_lateral_y[0] + T.pisca_lateral_y[1]) / 2];
    const prof = (rho) => T.pisca_lateral_profundidade * (1 - rho ** 2);
    const posicao = (p, pr) => [xL - encosto - pr, p[1], -p[0]];
    const capa = capaPolar({ prefixo: 'refletorPiscaLateralEsquerdo', borda, centro, raioFuro: 4.5, profundidade: prof, posicao, fora: [1, 0, 0], facetas: 0 });
    refletores.push({ nome: 'refletorPiscaLateralEsquerdo', capa, espessura: T.refletor_espessura });
    refletores.push({ nome: 'refletorPiscaLateralDireito', capa: espelhar(capa, 'Esquerdo', 'Direito'), espessura: T.refletor_espessura });
    const base = posicao(centro, prof(4.5 / alcance(centro, [1, 0], borda)));
    const perfil = perfilDaLampada(5, 20, 9);
    lampadas.push({ nome: 'lampadaPiscaLateralEsquerdo', base, eixo: 'x', graus: 0, ...perfil });
    lampadas.push({ nome: 'lampadaPiscaLateralDireito', base: [-base[0], base[1], base[2]], eixo: 'x', graus: 180, ...perfil });
  }
  return { refletores, lampadas };
}
