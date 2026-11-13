/* furgao-realista, receita/luzes.js — por dentro das luzes da frente (etapa 8, `referencias/luzes.md`): o interior do farol (duas conchas de revolução e o copinho, opção B de 2026-11-12, em `farol`) e o refletor de cada outra luz, uma capa única cuja borda segue o
 * contorno da lente por dentro do aro e que se curva para trás até um furo no fundo (o soquete da lâmpada), e a lâmpada, uma revolução com o soquete atrás.
 *
 * A capa é uma malha polar: a borda é o contorno do vão encolhido (as quinas concordadas com o raio menos o encolhimento), cada anel é a borda reduzida em direção
 * ao centro (a lâmpada principal), e o último anel é o círculo do furo. A profundidade de cada ponto é uma função do quanto ele já andou até o centro, e as facetas
 * são vincos vivos ao longo de raios. Os pontos têm nome e entram no TOPO; o lado direito é o espelho do esquerdo, com as faces na ordem invertida. */
import { superficieDaFrente, superficieDeTras, derivarFarois, derivarLanternas, derivarLuzesDeCanto, derivarPiscasLaterais } from './farol.js';

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
function capaPolar({ prefixo, borda, centro, raioFuro, profundidade, posicao, fora, facetas, aneis = ANEIS }) {
  const J = borda.length; const K = aneis.length;
  const nome = (k, j) => `${prefixo}_${k}_${j % J}`;
  const posicoes = new Map();
  for (let j = 0; j < J; j += 1) {
    const v = sub(borda[j], centro); const L = norma(v);
    for (let k = 0; k <= K; k += 1) {
      const rho = k < K ? aneis[k] : raioFuro / L;
      if (k === K && rho > aneis[K - 1] - 0.03) throw new Error(`furgao-realista: o furo do soquete (${raioFuro} mm) fica a ${(raioFuro / L).toFixed(2)} do contorno em ${prefixo}, e não cabe depois do último anel`);
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
    ...(capa.furos ? { furos: capa.furos.map((fu) => fu.map(renome).reverse()) } : {}),
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

  /* ---- os faróis: duas conchas e o copinho, paraboloides de revolução em torno de z, cada um com a borda no plano `encosto` atrás da superfície da chapa no centro dele ---- */
  const farol = []; let carcacaDoFarol = null;
  {
    const yMeio = (T.farol_y_base + T.farol_y_topo) / 2;
    const e = T.farol_concha_espessura;
    const N = 16;
    /* o perfil [raio, ao longo de z] da casca, com o vértice em 0 e a borda em `fundura`: o fundo (atrás) de 0 a `raio` e a frente de volta, fechados no eixo */
    const casca = (raio, fundura) => {
      const ks = Array.from({ length: N + 1 }, (_, k) => k);
      return [...ks.map((k) => [raio * (k / N), fundura * (k / N) ** 2 - e]), ...[...ks].reverse().map((k) => [raio * (k / N), fundura * (k / N) ** 2])];
    };
    /** O bulbo de revolução de raio `r` e comprimento `c` (a base em 0), como o do esboço: base estreita, ventre e cúpula. */
    const bulbo = (r, c) => [[0, 0], [r * 0.55, 0], [r * 0.55, c * 0.16], [r, c * 0.34], [r, c * 0.78], [r * 0.7, c * 0.94], [0, c]];
    /** A tampinha, com a base 6 mm dentro da cúpula do bulbo e a ponta `h` mm além da ponta dele. */
    const tampinha = (r, h) => [[0, -6], [r * 0.62, -6], [r * 0.62, -1], [r * 0.36, h * 0.6], [0, h]];
    const cilindro = (r, de, ate) => [[0, de], [r, de], [r, ate], [0, ate]];
    const conchas = [
      { id: 'Baixo', x: T.farol_baixo_x, y: yMeio, raio: T.farol_baixo_raio, fundura: T.farol_concha_fundura, soquete: T.farol_soquete_raio, atras: T.farol_soquete_atras, frente: T.farol_soquete_frente, lampada: [T.farol_lampada_raio, T.farol_lampada_comprimento] },
      { id: 'Alto', x: T.farol_alto_x, y: yMeio, raio: T.farol_alto_raio, fundura: T.farol_concha_fundura, soquete: T.farol_soquete_raio, atras: T.farol_soquete_atras, frente: T.farol_soquete_frente, lampada: [T.farol_lampada_raio, T.farol_lampada_comprimento] },
      { id: 'Posicao', x: T.farol_copo_x, y: T.farol_copo_y, raio: T.farol_copo_raio, fundura: T.farol_copo_fundura, soquete: T.farol_soquete_posicao_raio, atras: T.farol_soquete_atras, frente: 2, lampada: [T.farol_lampada_posicao_raio, T.farol_lampada_posicao_comprimento] },
    ];
    /* a frente da lente: o plano da frente do farol em y (a coroa inclina a frente 6,7 graus) menos a queda da curva da quina em x (a tabela `farol_lente_queda_x`), que a malha da chapa começa em
       x 700 e que a superfície analítica só começa em x 740 (medido na malha da lente em 2026-11-12: 1,1 mm de diferença em x 720, 5 em 760, 12 em 800), e a malha da lente cai também junto da boca do capô, acima de y `farol_lente_y_curva` (0,34 mm em y 1040, 1,3 em 1065 e 1,9 em 1075) */
    const quedaX = (x) => { const t = T.farol_lente_queda_x; if (x <= t[0][0]) return 0; for (let k = 1; k < t.length; k += 1) if (x <= t[k][0]) return t[k - 1][1] + ((t[k][1] - t[k - 1][1]) * (x - t[k - 1][0])) / (t[k][0] - t[k - 1][0]); return t.at(-1)[1]; };
    const zLente = (x, y) => S.zS(T.farol_x_dentro, y) - quedaX(x) - (y > T.farol_lente_y_curva ? T.farol_lente_y_queda * (y - T.farol_lente_y_curva) : 0);
    for (const c of conchas) {
      /* o plano da borda é o que melhor se ajusta à frente da lente no círculo da borda (mínimos quadrados em 72 pontos), e a concha inteira gira para ele, para a borda ficar
         junto da lente em toda a volta e não só no centro. Depois o plano desce o quanto a borda passaria da lente menos o encosto no ponto mais à frente, para nenhum
         ponto da borda furar a lente. */
      const dados = Array.from({ length: 72 }, (_, k) => {
        const t = (2 * Math.PI * k) / 72; const dx = c.raio * Math.cos(t); const dy = c.raio * Math.sin(t);
        return { dx, dy, z: zLente(c.x + dx, c.y + dy) };
      });
      const a = dados.reduce((q, d) => q + d.z, 0) / dados.length;
      const bx = dados.reduce((q, d) => q + d.z * d.dx, 0) / dados.reduce((q, d) => q + d.dx * d.dx, 0);
      const by = dados.reduce((q, d) => q + d.z * d.dy, 0) / dados.reduce((q, d) => q + d.dy * d.dy, 0);
      const sobra = Math.max(0, ...dados.map((d) => a + bx * d.dx + by * d.dy - d.z));
      const zBorda = a - T.farol_concha_encosto - sobra; const zV = zBorda - c.fundura;
      const giroY = Math.atan(-bx); const giroX = Math.atan(by * Math.cos(giroY));
      const graus = [(giroX * 180) / Math.PI, (giroY * 180) / Math.PI];
      const lamp = { soquete: cilindro(c.soquete, -c.atras, c.frente), bulbo: bulbo(...c.lampada).map(([r, h]) => [r, h + c.frente - 1]), base: [c.x, c.y, zV], pivo: [c.x, c.y, zBorda], graus };
      if (c.id !== 'Posicao') lamp.tampinha = tampinha(c.lampada[0], T.farol_tampinha_altura).map(([r, h]) => [r, h + c.frente + c.lampada[1] - 1]);
      farol.push({ id: c.id, x: c.x, y: c.y, raio: c.raio, fundura: c.fundura, zBorda, zV, perfil: casca(c.raio, c.fundura), ...lamp });
    }
    /* o fundo escuro atrás das conchas (a carcaça do esboço, sem a parede): uma placa do contorno do farol encolhido `farol_carcaca_recuo`, com a mesma inclinação em y das conchas,
       cujo topo toca em 1 mm a ponta de trás do soquete que mais fundo vai, e que fecha o oco do furgão que se veria por entre as conchas */
    const gira = (p, pv, ax, g) => { const c = Math.cos((g * Math.PI) / 180); const sn = Math.sin((g * Math.PI) / 180); const d = p.map((v, i) => v - pv[i]); return ax === 0 ? [pv[0] + d[0], pv[1] + d[1] * c - d[2] * sn, pv[2] + d[1] * sn + d[2] * c] : [pv[0] + d[0] * c + d[2] * sn, pv[1] + d[1], pv[2] - d[0] * sn + d[2] * c]; };
    const giroX = farol[0].graus[0]; const tg = Math.tan((giroX * Math.PI) / 180);
    const yc = farol[0].y; const xc = (T.farol_x_dentro + T.farol_x_fora_base) / 2;
    const traseiras = farol.map((c) => { let q = gira([c.x, c.y, c.zV - T.farol_soquete_atras], c.pivo, 0, c.graus[0]); q = gira(q, c.pivo, 1, c.graus[1]); return q[2] - (q[1] - yc) * tg; });
    const zTopo = Math.min(...traseiras) + 1;
    const [esq, dir] = derivarFarois(T);
    const recuo = T.farol_carcaca_recuo;
    /* as paredes: uma faixa de quadriláteros em volta do contorno encolhido, com o topo na face de trás da lente (a frente da lente menos os 2 mm dela, mais `farol_carcaca_entra`)
       e a base 2 mm dentro da placa, para a caixa fechar o farol por trás da lente em toda a volta; a malha leva a espessura da parede para dentro */
    const planoDaPlaca = (y) => zTopo + (y - yc) * tg;
    const paredes = [esq, dir].map((fa, k) => {
      const nomeDoLado = k === 0 ? 'Esquerdo' : 'Direito';
      const volta = concordar(encolher(fa.farol, recuo), fa.raios.map((r) => Math.max(0, r - recuo)), T.farol_carcaca_passo);
      const posicoes = new Map(); const J = volta.length;
      volta.forEach(([x, y], j) => {
        posicoes.set(`paredeFarol${nomeDoLado}_t${j}`, [x, y, zLente(Math.abs(x), y) - 2 + T.farol_carcaca_entra]);
        posicoes.set(`paredeFarol${nomeDoLado}_b${j}`, [x, y, planoDaPlaca(y) - 2]);
      });
      const nome = (a, j) => `paredeFarol${nomeDoLado}_${a}${j % J}`;
      const faces = volta.map((_, j) => [nome('t', j), nome('b', j), nome('b', j + 1), nome('t', j + 1)]);
      /* a aba da caixa: uma faixa de `farol_carcaca_aba_largura` mm para fora da parede, `farol_carcaca_aba_fundura` mm atrás da lente (abaixo do fim da perna da aba de 20 mm do vão),
         que fecha por baixo a fresta entre a parede e a perna da aba, por onde se via o fundo da bancada; a espessura vai para baixo */
      const abaPos = new Map();
      volta.forEach((_, j) => {
        const a = volta[(j - 1 + J) % J]; const b = volta[(j + 1) % J]; const t = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(...t); const nx = t[1] / l; const ny = -t[0] / l;
        const [x, y] = volta[j]; const xf = x + nx * T.farol_carcaca_aba_largura; const yf = y + ny * T.farol_carcaca_aba_largura;
        abaPos.set(`abaParedeFarol${nomeDoLado}_i${j}`, [x, y, zLente(Math.abs(x), y) - T.farol_carcaca_aba_fundura]);
        abaPos.set(`abaParedeFarol${nomeDoLado}_f${j}`, [xf, yf, zLente(Math.abs(xf), yf) - T.farol_carcaca_aba_fundura]);
      });
      const nomeA = (a, j) => `abaParedeFarol${nomeDoLado}_${a}${j % J}`;
      const abaFaces = volta.map((_, j) => [nomeA('i', j), nomeA('f', j), nomeA('f', j + 1), nomeA('i', j + 1)]);
      return { vertices: [...posicoes.keys()].sort(), faces, posicoes, aba: { vertices: [...abaPos.keys()].sort(), faces: abaFaces, posicoes: abaPos } };
    });
    carcacaDoFarol = {
      zTopo, altura: T.farol_carcaca_espessura, pivo: [xc, yc, zTopo], grausX: giroX, paredes,
      lados: [esq, dir].map((fa) => ({ contorno: encolher(fa.farol, recuo), raio: Math.max(0, T.farol_raio - recuo) })),
    };
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

  /* ---- as lanternas de trás: um refletor por lanterna, quatro conchas lado a lado com a parede entre elas, e uma lâmpada no fundo de cada concha. Cada concha é uma
     capa polar no contorno da faixa da lente por dentro (a borda recuada `lanterna_refletor_inset`), de fundo plano no meio, levada à superfície da quina de trás e
     recuada ao longo da diagonal. A parede entre duas conchas é a faixa que liga a borda de baixo de uma à de cima da seguinte, rente à lente, atrás da linha de
     chapa que separa as faixas. O resto é como na luz de canto. ---- */
  const [lanE] = derivarLanternas(T, f);
  {
    const Sb = superficieDeTras(T, f);
    const d = [Math.SQRT1_2, 0, -Math.SQRT1_2];
    const ins = T.lanterna_refletor_inset;
    const prof = (rho) => T.lanterna_refletor_profundidade * (1 - Math.max(rho, T.lanterna_refletor_fundo_plano) ** 2);
    const posicao = (p, pr) => { const s = Sb.ponto(p[0], p[1]); const t = encosto + pr; return [s[0] - d[0] * t, s[1], s[2] - d[2] * t]; };
    const faixas = lanE.faixas.map((fx) => {
      /* os cantos que dão na linha de chapa ficam vivos na concha: as bordas que se defrontam têm de ter os mesmos pontos para a parede ligá-las */
      const borda = concordar(encolher(fx.contorno, ins), fx.raios.map((r) => (r <= T.lanterna_raio_linha ? 0 : Math.max(0, r - ins))), T.lanterna_refletor_passo);
      const centro = [fx.contorno.reduce((s, p) => s + p[0], 0) / 4, fx.contorno.reduce((s, p) => s + p[1], 0) / 4];
      const prefixo = `refletorLanternaEsquerda${fx.base}`;
      const capa = capaPolar({ prefixo, borda, centro, raioFuro: T.lanterna_furo, profundidade: (rho) => prof(rho), posicao, fora: d, facetas: 0, aneis: T.lanterna_aneis });
      return { fx, borda, centro, prefixo, capa };
    });
    /* a parede: os pontos da borda de baixo de uma concha e da borda de cima da seguinte, na mesma ordem em u */
    const ponta = (fa, cima) => {
      const ys = fa.borda.map((p) => p[1]); const alvo = cima ? Math.max(...ys) : Math.min(...ys);
      return fa.borda.map((p, j) => ({ u: p[0], nome: `${fa.prefixo}_0_${j}` })).filter((_, j) => Math.abs(ys[j] - alvo) < 1e-6).sort((a, b) => a.u - b.u);
    };
    const posicoes = new Map(); const faces = []; const furos = [];
    faixas.forEach((fa) => { fa.capa.posicoes.forEach((v, n) => posicoes.set(n, v)); faces.push(...fa.capa.faces); furos.push(fa.capa.furo); });
    for (let i = 0; i + 1 < faixas.length; i += 1) {
      const a = ponta(faixas[i], false); const b = ponta(faixas[i + 1], true);
      if (a.length !== b.length || a.some((p, k) => Math.abs(p.u - b[k].u) > 1e-6)) throw new Error(`furgao-realista: a borda de baixo da concha ${i} e a de cima da ${i + 1} da lanterna não têm os mesmos pontos`);
      for (let k = 0; k + 1 < a.length; k += 1) {
        const q = [a[k].nome, a[k + 1].nome, b[k + 1].nome, b[k].nome];
        const [p0, p1, p2] = q.map((n) => posicoes.get(n));
        const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]; const v = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
        const nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        faces.push(nrm[0] * d[0] + nrm[1] * d[1] + nrm[2] * d[2] < 0 ? [q[0], q[3], q[2], q[1]] : q);
      }
    }
    const capa = { vertices: [...posicoes.keys()].sort(), faces, vincos: [], posicoes, furo: furos[0], furos };
    refletores.push({ nome: 'refletorLanternaEsquerda', capa, espessura: T.refletor_espessura });
    refletores.push({ nome: 'refletorLanternaDireita', capa: espelhar(capa, 'Esquerda', 'Direita'), espessura: T.refletor_espessura });
    const perfil = perfilDaLampada(T.lanterna_lampada_raio, T.lanterna_lampada_comprimento, T.lanterna_lampada_flange);
    for (const fa of faixas) {
      const b = posicao(fa.centro, prof(0));
      lampadas.push({ nome: `lampadaLanterna${fa.fx.base}Esquerda`, base: b, eixo: 'z', graus: 135, ...perfil });
      lampadas.push({ nome: `lampadaLanterna${fa.fx.base}Direita`, base: [-b[0], b[1], b[2]], eixo: 'z', graus: -135, ...perfil });
    }
  }
  return { refletores, lampadas, farol, carcacaDoFarol };
}
