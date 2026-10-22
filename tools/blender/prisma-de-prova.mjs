/* prisma-de-prova.mjs — a forma desenhada por código com que se provam as leituras do pacote cego (ler-corte, ler-linhas e
   comparar-cortes): um prisma convexo extrudado em z, com seção de fundo reto, lados retos, chanfro e teto em arco raso de 12
   facetas, e a frente inclinada (z = FRENTE - INCLINACAO y), que dá vincos que não são paralelos a nenhum eixo. Em metro, y
   para cima e frente em +z, simétrico em x.

   Tudo o que a prova precisa saber sai daqui, de forma exata: a malha em OBJ, os vincos (arestas com dobra acima de 25 graus,
   a frente inteira e as longitudinais nos cantos da seção), a borda que a caixa corta em z = CAIXA_Z0, o contorno exato de
   cortes planos e quais vincos cada vista ortogonal vê (num sólido convexo, a aresta se vê quando uma das faces dela olha
   para a câmera). As facetas do arco dobram 3 graus entre si e não são vinco. */

export const FRENTE = 0.8;
export const INCLINACAO = 0.5;
export const CAIXA_Z0 = 0.1;
/** A caixa do pacote: metade x >= 0 com a simetria, e o corte de trás em z = CAIXA_Z0. */
export const CAIXA = [0, 0.45, -0.05, 0.4, CAIXA_Z0, 0.9];

const ARCO = { meia: 0.25, base: 0.3, topo: 0.34, facetas: 12 };

/** A seção (x, y), no sentido anti-horário, a partir do canto de baixo à esquerda. */
export function secao() {
  const { meia, base, topo, facetas } = ARCO;
  // círculo que passa por (±meia, base) e (0, topo)
  const c = (meia ** 2 + base ** 2 - topo ** 2) / (2 * (base - topo));
  const R = topo - c;
  const a0 = Math.asin(meia / R);
  const arco = Array.from({ length: facetas + 1 }, (_, i) => {
    const a = a0 - (2 * a0 * i) / facetas;
    return [R * Math.sin(a), c + R * Math.cos(a)];
  });
  return [[-0.35, 0], [0.35, 0], [0.35, 0.18], ...arco, [-0.35, 0.18]];
}

const zFrente = (y) => FRENTE - INCLINACAO * y;

/** A malha fechada em OBJ: as faces laterais de z = 0 até a frente, a tampa da frente e a de trás; desloca é a translação
    da forma inteira, em metro. */
export function obj(desloca = [0, 0, 0]) {
  const S = secao();
  const n = S.length;
  const L = [];
  const v = (x, y, z) => `v ${x + desloca[0]} ${y + desloca[1]} ${z + desloca[2]}`;
  for (const [x, y] of S) L.push(v(x, y, 0));
  for (const [x, y] of S) L.push(v(x, y, zFrente(y)));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    L.push(`f ${i + 1} ${j + 1} ${n + j + 1} ${n + i + 1}`);
  }
  L.push(`f ${S.map((_, i) => n + i + 1).join(' ')}`);
  L.push(`f ${S.map((_, i) => n - i).join(' ')}`);
  return L.join('\n') + '\n';
}

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };

/** A normal para fora da face lateral do lado i (de S[i] a S[i+1]). */
function normalLateral(S, i) {
  const [x0, y0] = S[i];
  const [x1, y1] = S[(i + 1) % S.length];
  return norm([y1 - y0, -(x1 - x0), 0]);
}
const NORMAL_FRENTE = norm([0, INCLINACAO, 1]);

/** Ângulo em graus entre as faces laterais de cada lado da quina k da seção. */
function dobraNaQuina(S, k) {
  const a = normalLateral(S, (k - 1 + S.length) % S.length);
  const b = normalLateral(S, k);
  return (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI;
}

/** Os vincos, cada um { pontos: [[x, y, z], ...], normais: [normais das duas faces] }, só dentro da caixa (z >= CAIXA_Z0):
    as arestas da frente e as longitudinais nas quinas com dobra acima do limiar. */
export function vincos(limiar = 25) {
  const S = secao();
  const out = [];
  S.forEach(([x, y], i) => {
    const [x1, y1] = S[(i + 1) % S.length];
    out.push({ pontos: [[x, y, zFrente(y)], [x1, y1, zFrente(y1)]], normais: [NORMAL_FRENTE, normalLateral(S, i)] });
  });
  S.forEach(([x, y], k) => {
    if (dobraNaQuina(S, k) > limiar) {
      out.push({ pontos: [[x, y, CAIXA_Z0], [x, y, zFrente(y)]], normais: [normalLateral(S, (k - 1 + S.length) % S.length), normalLateral(S, k)] });
    }
  });
  return out;
}

/** A borda do corte da caixa em z = CAIXA_Z0, com a normal da única face de cada lado. */
export function bordaDeCorte() {
  const S = secao();
  return S.map(([x, y], i) => {
    const [x1, y1] = S[(i + 1) % S.length];
    return { pontos: [[x, y, CAIXA_Z0], [x1, y1, CAIXA_Z0]], normais: [normalLateral(S, i)] };
  });
}

/** As dobras de cada quina da seção, em graus, para conferir que os vincos passam do limiar e as facetas do arco não. */
export function dobras() {
  const S = secao();
  return S.map((_, k) => dobraNaQuina(S, k));
}

/** Contorno exato do corte plano em mm, nos eixos do pacote (plano z: x e y; plano x: z e y), como polilinhas
    { fechada, pontos }; desloca é a translação da forma em metro. */
export function corte(eixo, valor, desloca = [0, 0, 0]) {
  const S = secao().map(([x, y]) => [x + desloca[0], y + desloca[1]]);
  const zf = (y) => FRENTE + desloca[2] - INCLINACAO * (y - desloca[1]);
  if (eixo === 'z') {
    return [{ fechada: true, pontos: S.map(([x, y]) => [x * 1000, y * 1000]) }];
  }
  if (eixo === 'x') {
    // o fundo e o teto no plano x = valor; a frente liga os dois; o fundo e o teto começam na caixa, em z = CAIXA_Z0
    const ys = [];
    S.forEach(([x0, y0], i) => {
      const [x1, y1] = S[(i + 1) % S.length];
      if ((x0 - valor) * (x1 - valor) < 0) ys.push(y0 + ((valor - x0) / (x1 - x0)) * (y1 - y0));
    });
    const [yb, yt] = ys.sort((a, b) => a - b);
    return [{ fechada: false, pontos: [[CAIXA_Z0, yb], [zf(yb), yb], [zf(yt), yt], [CAIXA_Z0, yt]].map(([z, y]) => [z * 1000, y * 1000]) }];
  }
  throw new Error(`corte em ${eixo} não previsto`);
}

/** Os eixos de uma câmera como comum.eixos_da_camera: z = -direção, x = cima × z, y = z × x. */
export function eixosDaCamera(direcao, cima) {
  const z = norm(direcao.map((v) => -v));
  const x = norm(cross(cima, z));
  return { x, y: cross(z, x), z };
}

/** Se a aresta se vê da direção da vista: num sólido convexo, quando uma das faces dela olha para a câmera. */
export function visivel(aresta, direcao) {
  const paraCamera = norm(direcao.map((v) => -v));
  return aresta.normais.some((n) => dot(n, paraCamera) > 1e-9);
}

/** A aresta projetada em mm nos dois eixos do mundo da vista alinhada (o que a grade mostra). */
export function projetar(pontos, eixos) {
  return pontos.map((p) => eixos.map((e) => p[e] * 1000));
}

export { sub, dot };
