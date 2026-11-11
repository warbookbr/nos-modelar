/* apoio-do-vinco.js — o raio de uma aresta de caráter, em milímetro, convertido na distância das colunas de apoio.
 *
 * FICHA apoioDoVinco
 * serve: o raio em mm de uma aresta de caráter (quina, filete, vinco de chapa dura) vira a distância das colunas de apoio da gaiola, e o raio
 *   de um perfil medido na malha sai pela mesma definição (o filete).
 * quando: a aresta pede raio em milímetro e não nitidez: a nitidez depende do tamanho da face e dos níveis, o apoio não. Em gaiolaPorEstacoes o vinco
 *   aceita `raio` direto e este ajudante roda sozinho; aqui está a conta, para a gaiola escrita à mão e para a ferramenta de medida.
 * unidades: mm; o ângulo da dobra em graus (0 é plano, 90 é canto reto); de 20 a 150 graus a relação foi medida.
 * campos:
 *   angulo: a dobra entre as duas faces no vinco, em graus (anguloDaDobra a lê de três pontos).
 *   raio: o raio pedido, em mm.
 *   vizinho: a distância da quina à coluna seguinte da gaiola, em mm (um número ou um por lado).
 *   niveis: níveis da subdivisão, para o aviso de arco com poucos segmentos.
 *   colunas: colunas de apoio por lado (colunasDeApoio dá o número que mantém a razão entre colunas em 4).
 * devolve: { cabe, apoio, nitidez: 0, raio, colunas, razao, distancias, avisos }; raioDoFilete(perfil) mede um corte da malha.
 *   inserirApoiosNosVincos(...) põe as colunas na gaiola: a distância é perpendicular ao vinco, sobre a face (a quina que corta as estações na diagonal realiza o
 *   raio pedido), e dois vincos com raio podem se encontrar num ponto (o canto de uma caixa, o canto do teto), com a grade do canto entre as colunas deles.
 * exemplo:
 *   apoioDoVinco({ angulo: 90, raio: 6, vizinho: 100 })
 * peça: procedural/pecas/sedan-chassi-e-lataria/alta-definicao/caminho-a-gaiola-da-casca.esboco.mjs
 * FIM DA FICHA
 *
 * Função pura. Duas coisas moram aqui: a definição de raio que o projeto adota (`raioDoFilete`, que a ferramenta de medida usa
 * sobre um corte da malha) e a conta que leva um raio pedido à distância do apoio (`apoioDoVinco`).
 *
 * DEFINIÇÃO DE RAIO (a única, para a receita e para a medida). O raio de uma aresta é o do FILETE: o arco de círculo tangente às duas
 * faces que melhor cobre o perfil. O perfil é a seção da superfície por um plano perpendicular ao vinco, como pontos 2D em mm, de
 * uma face à outra. As duas faces são as retas ajustadas (mínimos quadrados) aos trechos das pontas do perfil; a quina viva é o
 * cruzamento delas; o filete de raio r é a reta, o arco tangente às duas e a reta; e o raio é o r que minimiza a soma dos quadrados
 * da distância entre os pontos do perfil e esse caminho, nos pontos entre onde o perfil sai da primeira reta e onde chega à segunda
 * (saída: afastamento maior que `TOLERANCIA_DE_SAIDA_MM`, 0,01 mm). Escolhi o filete, e não o menor raio de curvatura, porque numa
 * superfície dura o que o olho lê é a faixa de reflexo entre as duas faces, que é a largura do arco tangente; o menor raio de
 * curvatura de um perfil de subdivisão é o do núcleo mais apertado dele e mede até 40% menos que o filete, e o filete de mesma folga
 * (a distância da quina ao perfil, convertida em raio) depende de onde se ajustam as retas e dá 41 mm para 0,3 mm de folga em
 * 166 graus por dentro. O ajuste por mínimos quadrados usa todo o trecho que se afasta da face, e por isso vale para qualquer
 * ângulo. A medida devolve também o erro do ajuste (a raiz do erro quadrático médio, em mm) e a razão dele pelo raio: um perfil que não é
 * parecido com um arco (apoio muito mais curto que a coluna vizinha) sai com a razão alta, e quem pede raio deve desconfiar.
 *
 * RELAÇÃO. Num trecho liso a superfície limite de Catmull-Clark, cortada perpendicularmente ao vinco, é uma B-spline cúbica uniforme
 * nos pontos da seção. Com a quina na coluna do vinco (nitidez 0), uma coluna de apoio a `a` mm de cada lado dela, sobre as faces, e
 * a coluna seguinte a `v` mm da de apoio, só os dois segmentos que tocam a quina deixam de ser reta, e o perfil tem forma fechada:
 * a quina sai a a/6·(u1+u2) dela e o resto é a cúbica por (−a−v, −a, 0, a, a+v) sobre as duas retas. O perfil depende só de a, de v e
 * do ângulo, é linear em a para v/a fixo, e o limite não depende dos níveis: os níveis só dizem com quantos segmentos a malha o
 * mostra. O raio sai da própria definição acima aplicada a esse perfil, e `apoioDoVinco` resolve a distância por bisseção sobre ela.
 * Não há fórmula fechada do raio do filete (a definição é um ajuste), e o erro dessa relação contra a malha de `subdivisao` está
 * no teste: dentro de 10% do pedido a partir do nível 2.
 */

export const TOLERANCIA_DE_SAIDA_MM = 0.002;
export const FRACAO_DE_SAIDA = 0.03;
const FRACAO_DAS_PONTAS = 0.2;
const PONTOS_DA_JANELA = 400;

const rad = (g) => (g * Math.PI) / 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const norma = (a) => Math.hypot(a[0], a[1]);

function reta(pontos) {
  let cx = 0, cy = 0;
  for (const p of pontos) { cx += p[0]; cy += p[1]; }
  cx /= pontos.length; cy /= pontos.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pontos) { const x = p[0] - cx, y = p[1] - cy; sxx += x * x; sxy += x * y; syy += y * y; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { c: [cx, cy], u: [Math.cos(ang), Math.sin(ang)] };
}
const distanciaAoSegmento = (p, a, b) => {
  const ab = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab)));
  return norma(sub(p, [a[0] + t * ab[0], a[1] + t * ab[1]]));
};
const distanciaAReta = (p, r) => { const v = sub(p, r.c); return Math.abs(v[0] * r.u[1] - v[1] * r.u[0]); };

/* a polilinha reamostrada a passo igual de comprimento de arco, em n+1 pontos */
function reamostrar(perfil, n) {
  const acc = [0];
  for (let i = 1; i < perfil.length; i++) acc.push(acc[i - 1] + norma(sub(perfil[i], perfil[i - 1])));
  const total = acc[acc.length - 1]; const saida = []; let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = (total * k) / n;
    while (j + 2 < perfil.length && acc[j + 1] < s) j++;
    const seg = acc[j + 1] - acc[j]; const t = seg > 0 ? Math.min(1, Math.max(0, (s - acc[j]) / seg)) : 0;
    saida.push([perfil[j][0] + t * (perfil[j + 1][0] - perfil[j][0]), perfil[j][1] + t * (perfil[j + 1][1] - perfil[j][1])]);
  }
  return saida;
}
const comprimento = (p) => p.reduce((s, q, i) => (i ? s + norma(sub(q, p[i - 1])) : 0), 0);

/** raioDoFilete(perfil, { tolerancia?, fracaoDasPontas?, retasPor? }) mede o raio de uma aresta no perfil `[[x, y], ...]` (mm, de uma face à outra) pela
 *  definição do cabeçalho. Devolve `{ raio, erro, razaoDoErro, angulo, quina, tangentes }`: `angulo` é a dobra entre as duas
 *  faces em graus (0 é plano), `quina` o cruzamento das retas das faces e `tangentes` a distância da quina a cada ponto de
 *  tangência. As retas das faces saem por padrão de `fracaoDasPontas` (0,2) do comprimento de cada ponta do perfil, o que vale para faces
 *  planas; em faces abauladas passe `retasPor: { de, ate }`, as distâncias da quina, em mm, entre as quais os pontos de cada lado ajustam a
 *  reta (fora do arredondamento e perto o bastante para a flecha não pesar). Sem dobra (menos de 0,05 grau) ou com o perfil curto demais, o raio é `null`. */
export function raioDoFilete(perfil, { tolerancia = TOLERANCIA_DE_SAIDA_MM, fracaoDasPontas = FRACAO_DAS_PONTAS, retasPor = null } = {}) {
  if (!Array.isArray(perfil) || perfil.length < 4) return { raio: null, motivo: 'perfil com menos de 4 pontos' };
  if (!perfil.every((p) => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite))) return { raio: null, motivo: 'o perfil tem valor inválido (NaN, infinito ou ponto que não é lista de números)' };
  /* as retas das faces vêm dos trechos das pontas (por comprimento de arco, sobre os pontos dados) */
  const total0 = comprimento(perfil);
  let acc = 0; const pontaA = [perfil[0]]; const pontaB = [perfil[perfil.length - 1]];
  for (let i = 1; i < perfil.length && acc < total0 * fracaoDasPontas; i++) { acc += norma(sub(perfil[i], perfil[i - 1])); pontaA.push(perfil[i]); }
  acc = 0;
  for (let i = perfil.length - 2; i >= 0 && acc < total0 * fracaoDasPontas; i--) { acc += norma(sub(perfil[i], perfil[i + 1])); pontaB.push(perfil[i]); }
  if (pontaA.length < 2 || pontaB.length < 2) return { raio: null, motivo: 'perfil curto demais para as pontas' };
  const pontos = perfil;
  /* as retas das faces e a quina viva: cruzamento delas */
  const ajustar = (A, B) => {
    const r1 = reta(A); const r2 = reta(B);
    if (dot(r1.u, sub(A[A.length - 1], A[0])) < 0) r1.u = [-r1.u[0], -r1.u[1]];
    if (dot(r2.u, sub(B[0], B[B.length - 1])) < 0) r2.u = [-r2.u[0], -r2.u[1]];
    const sinT = r1.u[0] * r2.u[1] - r1.u[1] * r2.u[0]; const cosT = dot(r1.u, r2.u);
    const w = sub(r2.c, r1.c); const s = (w[0] * r2.u[1] - w[1] * r2.u[0]) / sinT;
    return { r1, r2, theta: Math.atan2(Math.abs(sinT), cosT), quina: [r1.c[0] + s * r1.u[0], r1.c[1] + s * r1.u[1]] };
  };
  let { r1, r2, theta, quina } = ajustar(pontaA, pontaB);
  if (theta < rad(0.05)) return { raio: null, angulo: 0, motivo: 'perfil sem dobra' };
  /* faces abauladas: as retas passam a ser ajustadas só aos pontos entre `de` e `ate` mm da quina, de cada lado dela */
  if (retasPor) {
    for (let volta = 0; volta < 3; volta++) {
      let iq = 0; for (let i = 1; i < pontos.length; i++) if (norma(sub(pontos[i], quina)) < norma(sub(pontos[iq], quina))) iq = i;
      const A = pontos.filter((q, i) => i < iq && norma(sub(q, quina)) >= retasPor.de && norma(sub(q, quina)) <= retasPor.ate);
      const B = pontos.filter((q, i) => i > iq && norma(sub(q, quina)) >= retasPor.de && norma(sub(q, quina)) <= retasPor.ate);
      if (A.length < 2 || B.length < 2) return { raio: null, motivo: `há menos de 2 pontos de cada lado da quina entre ${retasPor.de} e ${retasPor.ate} mm` };
      ({ r1, r2, theta, quina } = ajustar(A, B.reverse()));
    }
    if (theta < rad(0.05)) return { raio: null, angulo: 0, motivo: 'perfil sem dobra' };
  }
  /* janela: entre a saída da primeira reta e a chegada à segunda */
  const afast = pontos.map((p) => Math.min(distanciaAReta(p, r1), distanciaAReta(p, r2)));
  const limiar = Math.max(tolerancia, FRACAO_DE_SAIDA * Math.max(...afast));
  let i0 = 0; while (i0 < pontos.length && afast[i0] <= limiar) i0++;
  let i1 = pontos.length - 1; while (i1 > 0 && afast[i1] <= limiar) i1--;
  if (i1 - i0 < 3) return { raio: null, angulo: (theta * 180) / Math.PI, motivo: 'o perfil não sai das retas das faces' };
  const trecho = pontos.slice(Math.max(0, i0 - 1), i1 + 2);
  const janela = reamostrar(trecho, PONTOS_DA_JANELA);
  const a = [-r1.u[0], -r1.u[1]]; const b = r2.u;           /* da quina para trás pela face 1 e para a frente pela face 2 */
  const meio = Math.tan(theta / 2); const L = total0 * 2;
  const bis = (() => { const v = [a[0] + b[0], a[1] + b[1]]; const n = norma(v); return [v[0] / n, v[1] / n]; })();
  const custo = (r) => {
    const T = r * meio; const TA = [quina[0] + a[0] * T, quina[1] + a[1] * T]; const TB = [quina[0] + b[0] * T, quina[1] + b[1] * T];
    const c = [quina[0] + (bis[0] * r) / Math.cos(theta / 2), quina[1] + (bis[1] * r) / Math.cos(theta / 2)];
    const cq = sub(quina, c); const ang0 = Math.atan2(cq[1], cq[0]);
    const FA = [quina[0] + a[0] * L, quina[1] + a[1] * L]; const FB = [quina[0] + b[0] * L, quina[1] + b[1] * L];
    let soma = 0;
    for (const p of janela) {
      const pc = sub(p, c); let da = Math.atan2(pc[1], pc[0]) - ang0; da = Math.atan2(Math.sin(da), Math.cos(da));
      let d = Math.min(distanciaAoSegmento(p, TA, FA), distanciaAoSegmento(p, TB, FB));
      if (Math.abs(da) <= theta / 2) d = Math.min(d, Math.abs(norma(pc) - r));
      soma += d * d;
    }
    return soma;
  };
  /* varredura grossa em escala logarítmica e refino por seção áurea */
  const rMax = Math.min(norma(sub(pontos[0], quina)), norma(sub(pontos[pontos.length - 1], quina))) / meio;
  let melhor = 0, vmelhor = Infinity; const N = 120; const rMin = rMax * 1e-4;
  for (let k = 0; k <= N; k++) { const r = rMin * (rMax / rMin) ** (k / N); const v = custo(r); if (v < vmelhor) { vmelhor = v; melhor = k; } }
  let lo = rMin * (rMax / rMin) ** (Math.max(0, melhor - 1) / N), hi = rMin * (rMax / rMin) ** (Math.min(N, melhor + 1) / N);
  const g = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = custo(x1), f2 = custo(x2);
  for (let it = 0; it < 60; it++) {
    if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = custo(x1); } else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = custo(x2); }
  }
  const raio = (lo + hi) / 2; const erro = Math.sqrt(custo(raio) / janela.length);
  return { raio, erro, razaoDoErro: erro / raio, angulo: (theta * 180) / Math.PI, quina, tangentes: [raio * meio, raio * meio] };
}

/* B-spline cúbica uniforme por quatro pontos de controle, em u de 0 a 1 */
function cubica(P0, P1, P2, P3, u) {
  const u2 = u * u, u3 = u2 * u;
  const b0 = (1 - u) ** 3 / 6, b1 = (3 * u3 - 6 * u2 + 4) / 6, b2 = (-3 * u3 + 3 * u2 + 3 * u + 1) / 6, b3 = u3 / 6;
  return [b0 * P0[0] + b1 * P1[0] + b2 * P2[0] + b3 * P3[0], b0 * P0[1] + b1 * P1[1] + b2 * P2[1] + b3 * P3[1]];
}

/** perfilDoApoio({ angulo, apoio, vizinho, passos? }) é o perfil limite (seção perpendicular ao vinco) da dobra de `angulo` graus
 *  com colunas de apoio a `apoio` mm da quina de cada lado e a coluna seguinte a `vizinho` mm do apoio, nitidez 0 na quina:
 *  pontos 2D em mm, com a face de trás ao longo de −x e a da frente a `angulo` graus dela. */
export function perfilDoApoio({ angulo, apoio, vizinho, passos = 60 }) {
  const t = rad(angulo); const c = Math.cos(t), s = Math.sin(t);
  const a = apoio, v = vizinho;
  const Pm2 = [-(a + v), 0], Pm1 = [-a, 0], P0 = [0, 0], P1 = [a * c, a * s], P2 = [(a + v) * c, (a + v) * s];
  const saida = [[-(a + v) - 2 * a, 0], Pm2];
  for (let i = 0; i <= passos; i++) saida.push(cubica(Pm2, Pm1, P0, P1, i / passos));
  for (let i = 1; i <= passos; i++) saida.push(cubica(Pm1, P0, P1, P2, i / passos));
  saida.push(P2, [(a + v + 2 * a) * c, (a + v + 2 * a) * s]);
  return saida;
}

/* ---- a relação ---- */

export const ANGULO_MINIMO_CALIBRADO = 20;
export const ANGULO_MAXIMO_CALIBRADO = 150;
/** A fração da distância da quina à coluna vizinha que o apoio pode ocupar: acima dela o apoio passa da coluna vizinha. */
export const FRACAO_MAXIMA_DO_APOIO = 0.9;
const FRACAO_DO_APOIO_SEM_AVISO = 0.5;
export const SEGMENTOS_MINIMOS_NO_FILETE = 3;
export const NIVEIS_RECOMENDADOS = 2;

/* O raio do filete que a definição do cabeçalho mede no perfil limite é, com boa aproximação, o do filete de mesma folga da
 * B-spline: a quina sai da quina viva a (a/3) sen(φ/2) (φ a dobra), e um filete cuja folga é essa tem
 *   r0 = a (sen(φ/2) / 3) / (1 / cos(φ/2) − 1).
 * O ajuste difere disso por um fator K(φ, ρ), com ρ = v / a, que vai de 1,03 a 1,28 e é liso nos dois eixos; a tabela abaixo é o
 * fator medido por `raioDoFilete` sobre `perfilDoApoio` (a mesma conta que `tabelaDeCalibragem()` refaz, e o teste confere que as duas
 * coincidem) e a relação interpola nela em φ e em ln ρ. Fora de 0,05 a 100 em ρ e de 20 a 150 graus ela segura a borda da tabela. */
const ANGULOS_DA_TABELA = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const RAZOES_DA_TABELA = [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 10, 30, 100];
const FATOR_DO_FILETE = [
  [1.0314, 1.0318, 1.0332, 1.0353, 1.0394, 1.0468, 1.0599, 1.0913, 1.159, 1.2769],
  [1.0327, 1.0331, 1.0344, 1.0365, 1.0404, 1.0478, 1.0607, 1.0916, 1.1583, 1.2744],
  [1.0344, 1.0348, 1.036, 1.0381, 1.0419, 1.0491, 1.0618, 1.092, 1.1573, 1.2704],
  [1.0365, 1.0369, 1.0381, 1.04, 1.0438, 1.0508, 1.0631, 1.0925, 1.1559, 1.2653],
  [1.0389, 1.0393, 1.0405, 1.0424, 1.046, 1.0527, 1.0647, 1.093, 1.154, 1.2592],
  [1.0418, 1.0422, 1.0433, 1.0451, 1.0485, 1.055, 1.0664, 1.0935, 1.1517, 1.2517],
  [1.0449, 1.0453, 1.0463, 1.048, 1.0513, 1.0574, 1.0682, 1.0938, 1.1488, 1.243],
  [1.0483, 1.0487, 1.0496, 1.0512, 1.0543, 1.0599, 1.07, 1.094, 1.1452, 1.2323],
  [1.0518, 1.0521, 1.053, 1.0544, 1.0572, 1.0624, 1.0717, 1.0937, 1.1407, 1.2198],
  [1.0552, 1.0555, 1.0563, 1.0576, 1.0601, 1.0647, 1.073, 1.0929, 1.1351, 1.2058],
  [1.0582, 1.0585, 1.0592, 1.0603, 1.0625, 1.0665, 1.0738, 1.0912, 1.1282, 1.1897],
  [1.0605, 1.0607, 1.0613, 1.0623, 1.0641, 1.0675, 1.0736, 1.0882, 1.1195, 1.1711],
  [1.0615, 1.0616, 1.0621, 1.0628, 1.0642, 1.0669, 1.0718, 1.0834, 1.1084, 1.1499],
  [1.06, 1.0601, 1.0604, 1.0609, 1.0619, 1.0638, 1.0673, 1.0758, 1.0942, 1.1246],
];

const folgaDoFilete = (angulo) => { const m = rad(angulo) / 2; return (Math.sin(m) / 3) / (1 / Math.cos(m) - 1); };

/** tabelaDeCalibragem() refaz a tabela do fator pela definição, executando `raioDoFilete` sobre `perfilDoApoio`. */
export function tabelaDeCalibragem() {
  return ANGULOS_DA_TABELA.map((g) => RAZOES_DA_TABELA.map((rho) => raioDoFilete(perfilDoApoio({ angulo: g, apoio: 1, vizinho: rho })).raio / folgaDoFilete(g)));
}

function posicaoNaTabela(valores, x) {
  if (x <= valores[0]) return [0, 0];
  if (x >= valores[valores.length - 1]) return [valores.length - 2, 1];
  let i = 0; while (x > valores[i + 1]) i++;
  return [i, (x - valores[i]) / (valores[i + 1] - valores[i])];
}
function fatorDoFilete(angulo, rho) {
  const [i, u] = posicaoNaTabela(ANGULOS_DA_TABELA, angulo);
  const [j, w] = posicaoNaTabela(RAZOES_DA_TABELA.map(Math.log), Math.log(Math.max(rho, 1e-9)));
  const f = FATOR_DO_FILETE;
  return (1 - u) * ((1 - w) * f[i][j] + w * f[i][j + 1]) + u * ((1 - w) * f[i + 1][j] + w * f[i + 1][j + 1]);
}

/** raioPeloApoio({ angulo, apoio, vizinho }) é o raio do filete, em mm, da dobra de `angulo` graus (0 é plano) com colunas de apoio a
 *  `apoio` mm da quina de cada lado e a coluna seguinte a `vizinho` mm do apoio. É a relação direta; `apoioDoVinco` é a inversa. */
export function raioPeloApoio({ angulo, apoio, vizinho }) {
  return apoio * folgaDoFilete(angulo) * fatorDoFilete(angulo, vizinho / apoio);
}

/** anguloDaDobra: o ângulo da dobra, em graus (0 é plano, 90 é um canto reto), no ponto `quina`, entre as direções para `antes` e para
 *  `depois`, três pontos [x, y, z] ou [x, y]. */
export function anguloDaDobra(antes, quina, depois) {
  const u = antes.map((c, k) => c - quina[k]); const v = depois.map((c, k) => c - quina[k]);
  const nu = Math.hypot(...u), nv = Math.hypot(...v);
  if (!(nu > 0) || !(nv > 0)) return 0;
  const c = Math.max(-1, Math.min(1, u.reduce((s, x, k) => s + x * v[k], 0) / (nu * nv)));
  return 180 - (Math.acos(c) * 180) / Math.PI;
}

/** Com `colunas` m maior que 1 o apoio é uma gradação: as m colunas de cada lado ficam a a·qʲ da quina (j de 0 a m−1), com q = (L / a)^(1/m),
 *  de modo que a última dista L / q e a coluna seguinte da gaiola, a L, vem na razão q; a razão entre colunas vizinhas fica baixa, o que
 *  dá à malha segmentos finos junto do arco mesmo que as faces da gaiola sejam grandes (a 20 graus um raio de 3 mm pede um apoio de 1 mm
 *  ao lado de faces de 100 mm, e uma só coluna deixaria o arco com menos de um segmento nos níveis que um carro comporta). */
export const RAZAO_ENTRE_COLUNAS = 4;
export function colunasDeApoio(apoio, vizinho, razaoMaxima = RAZAO_ENTRE_COLUNAS) {
  return Math.max(1, Math.min(8, Math.ceil(Math.log(Math.max(vizinho / apoio, 1)) / Math.log(razaoMaxima) - 1e-9)));
}

/** apoioDoVinco({ angulo, raio, vizinho, niveis?, colunas? }) converte o raio pedido (mm) de uma dobra de `angulo` graus na distância das
 *  colunas de apoio, que ficam sobre as duas faces a essa distância da coluna da quina, e na nitidez da quina (0: a quina é lisa e o raio sai
 *  das colunas, com o limite independente dos níveis). `vizinho` é a distância da quina à coluna seguinte de cada lado (um número, ou
 *  `[de um lado, do outro]`, e vale o menor). `colunas` é o número de colunas de apoio de cada lado (1 por padrão; ver `colunasDeApoio` e
 *  a gradação acima). Com `niveis`, confere também se a malha tem segmentos para o arco.
 *  Devolve `{ cabe, apoio, nitidez, raio, colunas, razao, distancias, avisos }`: `apoio` é a primeira coluna e `distancias` todas. Sem caber
 *  (`cabe: false`), `apoio` é o máximo (0,9 da distância à vizinha), `raio` é o máximo que ele dá e há um aviso `raioNaoCabe`. Os avisos têm
 *  `nome`: `raioNaoCabe`, `anguloForaDaCalibragem`, `apoioMaiorQueMetadeDaFace`, `filetePoucoSegmentado`, `niveisAbaixoDoRecomendado`. */
export function apoioDoVinco({ angulo, raio, vizinho, niveis, colunas = 1 } = {}) {
  if (!(angulo > 0 && angulo < 180)) throw new TypeError(`apoio do vinco: angulo precisa estar entre 0 e 180 graus (veio ${angulo})`);
  if (!(raio > 0)) throw new TypeError(`apoio do vinco: raio precisa ser positivo (veio ${raio})`);
  if (!Number.isInteger(colunas) || colunas < 1) throw new TypeError('apoio do vinco: colunas precisa ser inteiro a partir de 1');
  const L = Array.isArray(vizinho) ? Math.min(...vizinho) : vizinho;
  if (!(L > 0)) throw new TypeError('apoio do vinco: vizinho precisa ser a distância positiva da quina à coluna seguinte');
  const avisos = [];
  if (angulo < ANGULO_MINIMO_CALIBRADO || angulo > ANGULO_MAXIMO_CALIBRADO) {
    avisos.push({ nome: 'anguloForaDaCalibragem', angulo, motivo: `a dobra de ${angulo.toFixed(1)} graus está fora de ${ANGULO_MINIMO_CALIBRADO} a ${ANGULO_MAXIMO_CALIBRADO}, que a relação mediu; o fator da tabela é o da borda e o erro não está medido` });
  }
  const razaoDe = (a) => (L / a) ** (1 / colunas);
  const distanciasDe = (a) => { const q = razaoDe(a); return Array.from({ length: colunas }, (_, j) => a * q ** j); };
  /* a coluna seguinte à primeira de apoio: a segunda do apoio, ou a da gaiola quando só há uma */
  const dobra = (a) => raioPeloApoio({ angulo, apoio: a, vizinho: a * (razaoDe(a) - 1) });
  const aMax = FRACAO_MAXIMA_DO_APOIO * L;
  const raioMaximo = dobra(aMax);
  if (raio > raioMaximo) {
    avisos.push({ nome: 'raioNaoCabe', raioPedido: raio, raioMaximo, distanciaDaVizinha: L,
      motivo: `o raio ${raio} mm numa dobra de ${angulo.toFixed(1)} graus pede um apoio além de ${(FRACAO_MAXIMA_DO_APOIO * 100).toFixed(0)}% da distância à coluna vizinha (${L.toFixed(2)} mm); o maior que cabe é ${raioMaximo.toFixed(2)} mm` });
    return { cabe: false, apoio: aMax, nitidez: 0, raio: raioMaximo, colunas, razao: razaoDe(aMax), distancias: distanciasDe(aMax), avisos };
  }
  let lo = 0, hi = aMax;
  for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (dobra(m) < raio) lo = m; else hi = m; }
  const apoio = (lo + hi) / 2;
  const distancias = distanciasDe(apoio);
  const ultima = distancias[distancias.length - 1];
  if (ultima > FRACAO_DO_APOIO_SEM_AVISO * L) {
    avisos.push({ nome: 'apoioMaiorQueMetadeDaFace', apoio: ultima, distanciaDaVizinha: L, motivo: `o apoio (${ultima.toFixed(2)} mm) passa da metade da distância à coluna vizinha (${L.toFixed(2)} mm); a face entre eles fica mais fina que o apoio` });
  }
  if (niveis != null) {
    if (niveis < NIVEIS_RECOMENDADOS) {
      avisos.push({ nome: 'niveisAbaixoDoRecomendado', niveis, recomendados: NIVEIS_RECOMENDADOS, motivo: `com ${niveis} nível(is) a malha mostra o raio bem abaixo da superfície limite (o polígono de controle ainda está longe da curva); o nível 2 mostra 3% abaixo, o 3 menos de 1% e o 4 menos de 0,3%` });
    }
    const segmento = apoio / 2 ** niveis; const arco = 2 * raio * Math.tan(rad(angulo) / 2);
    if (arco / segmento < SEGMENTOS_MINIMOS_NO_FILETE) {
      avisos.push({ nome: 'filetePoucoSegmentado', niveis, segmentos: arco / segmento, motivo: `com ${niveis} níveis o arco do filete (${arco.toFixed(2)} mm) tem ${(arco / segmento).toFixed(1)} segmentos de malha, menos que ${SEGMENTOS_MINIMOS_NO_FILETE}: o raio existe na superfície limite e aparece facetado na malha` });
    }
  }
  return { cabe: true, apoio, nitidez: 0, raio, colunas, razao: razaoDe(apoio), distancias, avisos };
}

/* ---- as colunas de apoio numa gaiola ---- */

const chaveDaAresta = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
const dist3 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/* O raio pedido de cada ponto do vinco: um número, `{ de, ate }` (linear no comprimento da linha) ou uma lista com um número por ponto. */
function raiosDoVinco(raio, nomes, pontos, fechada, nomeDoVinco) {
  const n = nomes.length;
  if (typeof raio === 'number') { if (!(raio > 0)) throw new TypeError(`vinco ${nomeDoVinco}: raio precisa ser positivo em mm`); return nomes.map(() => raio); }
  if (Array.isArray(raio)) {
    if (raio.length !== n || raio.some((r) => !(r > 0))) throw new TypeError(`vinco ${nomeDoVinco}: a lista de raios precisa ter um raio positivo por ponto da linha (${n} pontos)`);
    return [...raio];
  }
  if (raio && typeof raio === 'object' && raio.de > 0 && raio.ate > 0) {
    const acc = [0];
    for (let k = 1; k < n; k++) acc.push(acc[k - 1] + dist3(pontos[nomes[k]], pontos[nomes[k - 1]]));
    const total = fechada ? acc[n - 1] + dist3(pontos[nomes[n - 1]], pontos[nomes[0]]) : acc[n - 1];
    return acc.map((s) => raio.de + (raio.ate - raio.de) * (total > 0 ? s / total : 0));
  }
  throw new TypeError(`vinco ${nomeDoVinco}: raio é um número em mm, { de, ate } ou uma lista com um raio por ponto`);
}

/** A distância perpendicular ao vinco, sobre a face, é a distância ao longo da aresta vezes o seno do ângulo entre a aresta e a tangente do
 *  vinco. Abaixo de `SENO_MINIMO` (aresta quase paralela ao vinco, que não pode ser a de uma face de apoio) o seno fica nele. */
export const SENO_MINIMO = 0.05;
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit3 = (v) => { const n = Math.hypot(v[0], v[1], v[2]); return n > 0 ? [v[0] / n, v[1] / n, v[2] / n] : [0, 0, 0]; };
function senoDaAresta(origem, vizinho, tangente) {
  const u = unit3(sub3(vizinho, origem)); const t = tangente;
  const c = [u[1] * t[2] - u[2] * t[1], u[2] * t[0] - u[0] * t[2], u[0] * t[1] - u[1] * t[0]];
  return Math.max(Math.hypot(c[0], c[1], c[2]), SENO_MINIMO);
}
const TOLERANCIA_DE_FUSAO = 1e-5;

/**
 * inserirApoiosNosVincos({ pontos, faces, vincos, unidade?, niveis? }) -> { pontos, faces, raios, avisos, origens, aplicados, linhas }
 *
 * A gaiola tem `pontos` (nome -> [x, y, z], em `unidade` mm por unidade: 1000 se estão em metro), `faces` (listas de nomes, em ordem de
 * volta) e `vincos` `[{ nome, pontos: [nomes em sequência, fechada repetindo o primeiro], raio }]`, com `raio` em mm (número,
 * `{ de, ate }` ou um por ponto). Para cada ponto da linha, a dobra é o ângulo entre as duas arestas que saem dele, uma para cada
 * lado do vinco, e o apoio é posto sobre essas duas arestas (a posição na face vizinha da gaiola, por interpolação linear até a coluna
 * seguinte). Cada face que tem uma aresta da linha se divide em faixas estreitas, entre a linha e as colunas de apoio, e o resto; a
 * aresta de que o apoio sai, em outra face que não segue o vinco, ganha o ponto de apoio (a face vira um lado maior).
 *
 * A DISTÂNCIA É MEDIDA PERPENDICULAR AO VINCO, sobre a face. A aresta de saída de um ponto da linha corta o vinco na diagonal quando as
 * estações o cortam na diagonal (a coluna de uma cabine inclinada), e a distância ao longo dela é a perpendicular dividida pelo seno do
 * ângulo entre a aresta e o vinco: o apoio vai a essa distância ao longo da aresta, e o raio realizado bate com o pedido (com a distância
 * medida no plano da estação, a quina a 65 graus saía com 50% do raio). A largura da face que limita o apoio é medida do mesmo modo.
 *
 * VINCOS QUE SE ENCONTRAM. Dois vincos com raio podem dividir um ponto da gaiola (o canto de uma caixa, onde as três quinas se encontram,
 * ou o canto do teto, onde a quina do teto termina na quina da cabine): cada um põe os apoios dele sobre as arestas de saída, mesmo que
 * sejam a linha do outro. Numa face que tem as duas linhas no mesmo vértice, o canto é uma grade de células entre as colunas de um vinco
 * e as do outro (uma célula quando cada vinco tem uma coluna), com o ponto de dentro no cruzamento delas, e a superfície de subdivisão
 * faz dela o canto arredondado das duas ou três quinas, como num cubo de quinas arredondadas. Dois apoios do mesmo ponto sobre a mesma
 * aresta, à mesma distância (dois raios iguais), são um ponto só. Os vincos não podem dividir uma aresta: o segundo fica sem apoio
 * (`vincoCruzaOutroComRaio`).
 *
 * A saída traz só os pontos novos em `pontos` (`${vinco}_apoio${coluna}_${ponto}_${vizinho}`, e `canto${face}_${vértice}_${i}_${j}`
 * para a grade do canto), a lista nova de faces, o raio esperado por vinco em `raios` (com `gravado`, o raio que o passo guarda: o pedido
 * onde o apoio coube, o realizado onde não) e os `avisos`, cada um com `nome`: `raioNaoCabe`, `vincosDisputamApoio`,
 * `anguloForaDaCalibragem`, `filetePoucoSegmentado`, `niveisAbaixoDoRecomendado`, `apoioMaiorQueMetadeDaFace`, `vincoSemDuasFaces`,
 * `apoioAmbiguo`, `vincoCruzaOutroComRaio`, `vincoSemDobra`.
 * `linhas` dá, por vinco aplicado, a linha com os pontos que outro vinco pôs sobre as arestas dela (o canto do teto divide a quina da cabine num
 * ponto novo, e a linha da quina passa por ele): a linha que o passo guarda é essa, para ser sequência de arestas da gaiola nova.
 * O vinco que não dá para apoiar fica sem apoio e sai em `avisos`; os demais seguem. O vinco aplicado leva nitidez 0 (ver `apoioDoVinco`).
 */
export function inserirApoiosNosVincos({ pontos, faces, vincos, unidade = 1, niveis }) {
  const avisos = []; const aplicados = []; const donoDaAresta = new Map();
  const arestaFaces = new Map();
  faces.forEach((f, fi) => f.forEach((a, k) => { const c = chaveDaAresta(a, f[(k + 1) % f.length]); (arestaFaces.get(c) ?? arestaFaces.set(c, []).get(c)).push({ fi, k }); }));
  const lidos = [];
  for (const v of vincos) {
    const fechada = v.pontos.length > 2 && v.pontos[0] === v.pontos[v.pontos.length - 1];
    const nomes = fechada ? v.pontos.slice(0, -1) : [...v.pontos];
    const raios = raiosDoVinco(v.raio, nomes, pontos, fechada, v.nome);
    const arestas = nomes.slice(0, -1).map((u, k) => [u, nomes[k + 1]]); if (fechada) arestas.push([nomes[nomes.length - 1], nomes[0]]);
    const repetida = arestas.find(([a, b]) => donoDaAresta.has(chaveDaAresta(a, b)));
    if (repetida) { const outro = donoDaAresta.get(chaveDaAresta(repetida[0], repetida[1])); avisos.push({ nome: 'vincoCruzaOutroComRaio', vinco: v.nome, outro, ponto: repetida[0], motivo: `o vinco ${v.nome} corre sobre a aresta ${repetida[0]}-${repetida[1]}, que o vinco ${outro} já apoia: dois vincos com raio se encontram num ponto, mas não dividem uma aresta, e o ${v.nome} ficou sem apoio` }); continue; }
    /* as arestas que saem de cada ponto, uma por lado, e a face de cada lado */
    const lados = new Map(nomes.map((n) => [n, { e: new Set(), d: new Set() }]));
    let semFaces = null;
    for (const [u, w] of arestas) {
      const ef = arestaFaces.get(chaveDaAresta(u, w));
      if (!ef || ef.length !== 2) { semFaces = [u, w, ef?.length ?? 0]; break; }
      for (const { fi, k } of ef) {
        const P = faces[fi]; const n = P.length;
        const direta = P[k] === u && P[(k + 1) % n] === w;
        const lado = direta ? 'e' : 'd';
        const [antesDeU, depoisDeW] = direta ? [P[(k + n - 1) % n], P[(k + 2) % n]] : [P[(k + 2) % n], P[(k + n - 1) % n]];
        lados.get(u)[lado].add(antesDeU); lados.get(w)[lado].add(depoisDeW);
      }
    }
    if (semFaces) { avisos.push({ nome: 'vincoSemDuasFaces', vinco: v.nome, aresta: [semFaces[0], semFaces[1]], faces: semFaces[2], motivo: `a aresta ${semFaces[0]}-${semFaces[1]} do vinco ${v.nome} tem ${semFaces[2]} face(s), e o apoio precisa de uma de cada lado; o vinco ficou sem apoio` }); continue; }
    const noVinco = new Set(nomes);
    const ruim = nomes.find((n) => lados.get(n).e.size !== 1 || lados.get(n).d.size !== 1 || noVinco.has([...lados.get(n).e][0]) || noVinco.has([...lados.get(n).d][0]));
    if (ruim) { avisos.push({ nome: 'apoioAmbiguo', vinco: v.nome, ponto: ruim, motivo: `no ponto ${ruim} do vinco ${v.nome} a linha tem mais de uma aresta de saída de um lado, ou volta sobre si numa face; o apoio não tem onde ficar e o vinco ficou sem apoio` }); continue; }
    for (const [a, b] of arestas) donoDaAresta.set(chaveDaAresta(a, b), v.nome);
    const pts = nomes.map((n, k) => {
      const e = [...lados.get(n).e][0], d = [...lados.get(n).d][0];
      const antes = k > 0 ? nomes[k - 1] : fechada ? nomes[nomes.length - 1] : null;
      const depois = k < nomes.length - 1 ? nomes[k + 1] : fechada ? nomes[0] : null;
      const dirs = [];
      if (antes) dirs.push(unit3(sub3(pontos[n], pontos[antes])));
      if (depois) dirs.push(unit3(sub3(pontos[depois], pontos[n])));
      const tangente = unit3(dirs.reduce((s, x) => [s[0] + x[0], s[1] + x[1], s[2] + x[2]], [0, 0, 0]));
      /* a dobra é a do corte perpendicular ao vinco: as arestas de saída, sem a componente na tangente, são as direções das duas faces */
      const noCorte = (viz) => { const w = sub3(pontos[viz], pontos[n]); const c = w[0] * tangente[0] + w[1] * tangente[1] + w[2] * tangente[2]; return [pontos[n][0] + w[0] - c * tangente[0], pontos[n][1] + w[1] - c * tangente[1], pontos[n][2] + w[2] - c * tangente[2]]; };
      const angulo = anguloDaDobra(noCorte(e), pontos[n], noCorte(d));
      return { vinco: v.nome, ponto: n, e, d, angulo, tangente, senoE: senoDaAresta(pontos[n], pontos[e], tangente), senoD: senoDaAresta(pontos[n], pontos[d], tangente),
        comprimentoE: dist3(pontos[e], pontos[n]) * unidade, comprimentoD: dist3(pontos[d], pontos[n]) * unidade, raioPedido: raios[k], apoio: 0, raio: 0 };
    });
    lidos.push({ vinco: v.nome, fechada, nomes, arestas, pts, pedido: v.raio });
  }
  /* a distância do apoio por ponto, com o número de colunas por vinco (a maior razão entre a face e o apoio decide) e três passadas, porque
     o apoio do outro lado de uma mesma aresta encurta a face da vizinha. Tudo em distância PERPENDICULAR ao vinco, sobre a face. */
  const porPonto = new Map();
  for (const L of lidos) for (const p of L.pts) (porPonto.get(p.ponto) ?? porPonto.set(p.ponto, []).get(p.ponto)).push(p);
  const lado = (p, viz) => (p.e === viz ? { comp: p.comprimentoE, seno: p.senoE } : p.d === viz ? { comp: p.comprimentoD, seno: p.senoD } : null);
  /* a extensão (ao longo da aresta, em mm) que o apoio mais longo de `o` ocupa sobre a aresta o -> destino */
  const extensaoNaAresta = (o, destino) => { const l = lado(o, destino); return l && o.distancias ? o.distancias[o.distancias.length - 1] / l.seno : 0; };
  const faceDoPonto = (p, passada) => {
    const folga = (viz, comprimento, seno) => {
      let ext = 0;
      if (passada > 0) for (const o of porPonto.get(viz) ?? []) ext = Math.max(ext, extensaoNaAresta(o, p.ponto));
      return (comprimento - ext) * seno;
    };
    return Math.max(Math.min(folga(p.e, p.comprimentoE, p.senoE), folga(p.d, p.comprimentoD, p.senoD)), 1e-6);
  };
  for (const L of lidos) {
    L.colunas = 1;
    for (const p of L.pts) { const r = apoioDoVinco({ angulo: Math.max(p.angulo, 1), raio: p.raioPedido, vizinho: faceDoPonto(p, 0) }); L.colunas = Math.max(L.colunas, colunasDeApoio(r.apoio, faceDoPonto(p, 0))); }
  }
  for (let passada = 0; passada < 3; passada++) {
    for (const L of lidos) for (const p of L.pts) {
      const r = apoioDoVinco({ angulo: Math.max(p.angulo, 1), raio: p.raioPedido, vizinho: faceDoPonto(p, passada), niveis, colunas: L.colunas });
      p.apoio = r.apoio; p.cabe = r.cabe; p.raio = r.raio; p.avisosDoPonto = r.avisos; p.distancias = r.distancias; p.razao = r.razao;
    }
  }
  /* a disputa: apoios de pontos vizinhos que, sobre a mesma aresta, passariam um do outro */
  const arestasComApoio = new Map();
  for (const L of lidos) for (const p of L.pts) for (const viz of [p.e, p.d]) {
    const c = chaveDaAresta(p.ponto, viz);
    const g = arestasComApoio.get(c) ?? arestasComApoio.set(c, { de: new Map(), comp: lado(p, viz).comp }).get(c);
    (g.de.get(p.ponto) ?? g.de.set(p.ponto, []).get(p.ponto)).push(p);
  }
  for (const [, g] of arestasComApoio) {
    if (g.de.size < 2) continue;
    const pontasDaAresta = [...g.de.keys()].sort();
    const extremo = (nome, outro) => Math.max(...g.de.get(nome).map((r) => extensaoNaAresta(r, outro)));
    const [x, y] = pontasDaAresta;
    const soma = extremo(x, y) + extremo(y, x);
    if (soma > FRACAO_MAXIMA_DO_APOIO * g.comp) {
      const f = (FRACAO_MAXIMA_DO_APOIO * g.comp) / soma; const antesX = extremo(x, y), antesY = extremo(y, x);
      const vizX = g.de.get(x)[0], vizY = g.de.get(y)[0];
      for (const r of [...g.de.get(x), ...g.de.get(y)]) { r.distancias = r.distancias.map((d) => d * f); r.apoio *= f; r.cabe = false; }
      avisos.push({ nome: 'vincosDisputamApoio', vincos: [vizX.vinco, vizY.vinco], aresta: [x, y], distancia: g.comp, soma,
        motivo: `os vincos ${vizX.vinco} e ${vizY.vinco} pedem apoios que chegam a ${antesX.toFixed(2)} e ${antesY.toFixed(2)} mm sobre a mesma aresta ${x}-${y}, de ${g.comp.toFixed(2)} mm: eles passariam um do outro; os dois apoios foram encurtados na proporção e os raios saem menores que o pedido` });
    }
  }
  /* o raio que sobra depois da disputa, e os avisos agregados por vinco */
  const raios = [];
  for (const L of lidos) {
    for (const p of L.pts) {
      const segunda = p.distancias.length > 1 ? p.distancias[1] : faceDoPonto(p, 2);
      p.raio = raioPeloApoio({ angulo: Math.max(p.angulo, 1), apoio: p.apoio, vizinho: Math.max(segunda - p.apoio, 1e-6) });
    }
    const agregado = new Map();
    for (const p of L.pts) for (const a of p.avisosDoPonto ?? []) {
      const m = agregado.get(a.nome) ?? { ...a, vinco: L.vinco, pontos: [] }; m.pontos.push(p.ponto);
      if (a.nome === 'raioNaoCabe' && a.raioMaximo < m.raioMaximo) { m.raioMaximo = a.raioMaximo; m.raioPedido = a.raioPedido; m.distanciaDaVizinha = a.distanciaDaVizinha; }
      agregado.set(a.nome, m);
    }
    for (const m of agregado.values()) avisos.push({ ...m, motivo: `vinco ${L.vinco}, em ${m.pontos.length} ponto(s) (${m.pontos.slice(0, 3).join(', ')}${m.pontos.length > 3 ? ', ...' : ''}): ${m.motivo}` });
    const baixos = L.pts.filter((p) => p.angulo < 1);
    if (baixos.length) avisos.push({ nome: 'vincoSemDobra', vinco: L.vinco, pontos: baixos.map((p) => p.ponto), motivo: `o vinco ${L.vinco} tem ${baixos.length} ponto(s) sem dobra (menos de 1 grau entre as faces); o apoio dele foi calculado para 1 grau e o raio ali não aparece na malha` });
    const rs = L.pts.map((p) => p.raio);
    /* o raio que o passo guarda no vinco: o pedido, quando o apoio coube em todos os pontos (a malha o realiza, dentro do erro da relação), e senão um por ponto, o pedido onde coube e o realizado onde não */
    const porPontoDoVinco = L.pts.map((p) => (p.cabe ? p.raioPedido : Math.round(p.raio * 1e6) / 1e6));
    const gravado = L.pts.every((p) => p.cabe) ? L.pedido : porPontoDoVinco.every((x) => x === porPontoDoVinco[0]) ? porPontoDoVinco[0] : porPontoDoVinco;
    raios.push({ vinco: L.vinco, colunas: L.colunas, gravado, raioPedido: { minimo: Math.min(...L.pts.map((p) => p.raioPedido)), maximo: Math.max(...L.pts.map((p) => p.raioPedido)) },
      raioEsperado: { minimo: Math.min(...rs), maximo: Math.max(...rs) },
      pontos: L.pts.map((p) => ({ ponto: p.ponto, angulo: p.angulo, apoio: p.apoio, distancias: p.distancias, raioPedido: p.raioPedido, raio: p.raio, seno: [p.senoE, p.senoD] })) });
    aplicados.push(L.vinco);
  }
  /* os pontos de apoio: cada aresta de saída de um ponto da linha ganha as colunas, da mais perto à mais longe, à distância ao longo da
     aresta que dá a perpendicular pedida; dois apoios do mesmo ponto sobre a mesma aresta, à mesma distância, são um ponto só */
  const novos = {}; const origens = {};
  const uniao = new Map();                 /* `${ponto}\0${vizinho}` -> [{ nome, t }] da aresta, em fração do comprimento a partir do ponto */
  const colunasDoRegistro = new Map();     /* `${vinco}\0${ponto}\0${vizinho}` -> [nomes das colunas], da mais perto à mais longe */
  for (const L of lidos) for (const p of L.pts) for (const [viz, seno] of [[p.e, p.senoE], [p.d, p.senoD]]) {
    const Q = pontos[p.ponto], A = pontos[viz]; const compMm = dist3(A, Q) * unidade;
    const chave = `${p.ponto}\u0000${viz}`; const lista = uniao.get(chave) ?? uniao.set(chave, []).get(chave);
    const nomesDaColuna = [];
    p.distancias.forEach((d, j) => {
      const t = d / seno / compMm;
      const igual = lista.find((x) => Math.abs(x.t - t) <= TOLERANCIA_DE_FUSAO * Math.max(t, 1e-9));
      if (igual) { nomesDaColuna.push(igual.nome); return; }
      const nome = `${L.vinco}_apoio${j + 1}_${p.ponto}_${viz}`;
      novos[nome] = [Q[0] + t * (A[0] - Q[0]), Q[1] + t * (A[1] - Q[1]), Q[2] + t * (A[2] - Q[2])];
      origens[nome] = { tipo: 'apoio', vinco: L.vinco, ponto: p.ponto, vizinho: viz, coluna: j + 1, distancia: d, distanciaNaAresta: d / seno };
      lista.push({ nome, t }); nomesDaColuna.push(nome);
    });
    colunasDoRegistro.set(`${L.vinco}\u0000${chave}`, nomesDaColuna);
  }
  for (const l of uniao.values()) l.sort((a, b) => a.t - b.t);
  const colunasDe = (vinco, ponto, viz) => colunasDoRegistro.get(`${vinco}\u0000${ponto}\u0000${viz}`) ?? [];
  /* a aresta com todos os pontos que ela ganhou, de um extremo ao outro */
  const cadeia = (u, w) => [u, ...(uniao.get(`${u}\u0000${w}`) ?? []).map((x) => x.nome), ...[...(uniao.get(`${w}\u0000${u}`) ?? [])].reverse().map((x) => x.nome), w];
  const entre = (C, a, b) => { const i = C.indexOf(a), j = C.indexOf(b); return i >= 0 && j > i + 1 ? C.slice(i + 1, j) : []; };
  const posicao = (nome) => novos[nome] ?? pontos[nome];
  const colunasDoVinco = new Map(lidos.map((L) => [L.vinco, L.colunas]));
  /* as faces: a de dentro (o que sobra), uma faixa por coluna ao longo de cada aresta da linha e, no vértice em que duas linhas se
     encontram na mesma face, a grade de células do canto */
  const saida = [];
  faces.forEach((P, fi) => {
    const n = P.length; const ant = (k) => (k + n - 1) % n; const seg = (k) => (k + 1) % n;
    const linha = P.map((a, k) => donoDaAresta.get(chaveDaAresta(a, P[seg(k)])) ?? null);
    const info = P.map((a, k) => {
      const Lp = linha[ant(k)], Ln = linha[k];
      if (Lp && Ln) {
        /* o canto: G[i][j] com i ao longo da aresta seguinte (colunas do vinco anterior) e j ao longo da anterior (colunas do vinco seguinte) */
        const colP = colunasDe(Lp, a, P[seg(k)]), colN = colunasDe(Ln, a, P[ant(k)]);
        const G = [[a, ...colN]];
        for (let i = 1; i <= colP.length; i++) {
          const linhaI = [colP[i - 1]];
          for (let j = 1; j <= colN.length; j++) {
            const nome = `canto${fi}_${k}_${i}_${j}`; const A = posicao(colP[i - 1]), B = posicao(colN[j - 1]), Q = posicao(a);
            novos[nome] = [A[0] + B[0] - Q[0], A[1] + B[1] - Q[1], A[2] + B[2] - Q[2]];
            origens[nome] = { tipo: 'canto', face: fi, ponto: a, vincos: [Lp, Ln] };
            linhaI.push(nome);
          }
          G.push(linhaI);
        }
        return { tipo: 'canto', Lp, Ln, G, mp: colP.length, mn: colN.length, rep: G[colP.length][colN.length] };
      }
      if (Ln) { const col = colunasDe(Ln, a, P[ant(k)]); return { tipo: 'um', rep: col.length ? col[col.length - 1] : a }; }
      if (Lp) { const col = colunasDe(Lp, a, P[seg(k)]); return { tipo: 'um', rep: col.length ? col[col.length - 1] : a }; }
      return { tipo: 'nenhum', rep: a };
    });
    /* as faixas: uma por coluna ao longo de cada aresta da linha. Os pontos que outro vinco pôs sobre a aresta (os apoios dele) ganham um ponto
       par em cada coluna, e a faixa se divide em quadriláteros entre eles, em vez de um polígono de muitos lados com os pontos num lado só:
       o polígono comprido de seis lados que isso dava ao lado da quina se cisalhava quando a espessura era dada à chapa. Os pontos pares
       da última coluna entram na face de dentro. */
    const topoDaUltima = new Map();
    for (let k = 0; k < n; k++) {
      const L = linha[k]; if (!L) continue;
      const m = colunasDoVinco.get(L);
      const u = P[k], v = P[seg(k)];
      /* a coluna j (de 0 a m) numa ponta da aresta: o próprio ponto e os apoios dele, ou a grade do canto quando a outra aresta da ponta também é linha */
      const ponta = (q) => {
        const outra = q === k ? ant(k) : q; const viz = q === k ? P[ant(k)] : P[seg(q)];
        if (linha[outra]) {
          const I = info[q];
          return { canto: true, col: (j) => (q === k ? I.G[I.mp][j] : I.G[j][I.mn]), viz };
        }
        return { canto: false, col: (j) => (j === 0 ? P[q] : colunasDe(L, P[q], viz)[j - 1]), viz };
      };
      const pu = ponta(k), pv = ponta(seg(k));
      const C = cadeia(u, v);
      const lateral = (pt, ponto, j0, j1) => (pt.canto ? [] : entre(cadeia(ponto, pt.viz), pt.col(j0), pt.col(j1)));
      const i0 = Math.max(C.indexOf(pu.col(0)), 0), i1 = C.indexOf(pv.col(0)) >= 0 ? C.indexOf(pv.col(0)) : C.length - 1;
      let baixo = C.slice(i0, i1 + 1);
      const A0 = posicao(baixo[0]), A1 = posicao(baixo[baixo.length - 1]); const tot = dist3(A0, A1);
      const frac = baixo.map((c) => (tot > 0 ? dist3(A0, posicao(c)) / tot : 0));
      for (let j = 1; j <= m; j++) {
        const cu = pu.col(j), cv = pv.col(j); const Pu = posicao(cu), Pv = posicao(cv);
        const cima = baixo.map((c, i) => {
          if (i === 0) return cu;
          if (i === baixo.length - 1) return cv;
          const nome = `${L}_f${fi}_${k}_${j}_${i}`;
          novos[nome] = [0, 1, 2].map((d) => Pu[d] + frac[i] * (Pv[d] - Pu[d]));
          origens[nome] = { tipo: 'ponte', face: fi, vinco: L, coluna: j, aresta: [u, v] };
          return nome;
        });
        const latV = lateral(pv, v, j - 1, j), latU = lateral(pu, u, j - 1, j).reverse();
        for (let i = 0; i + 1 < baixo.length; i++) {
          saida.push([baixo[i], baixo[i + 1], ...(i + 2 === baixo.length ? latV : []), cima[i + 1], cima[i], ...(i === 0 ? latU : [])]);
        }
        baixo = cima;
      }
      topoDaUltima.set(k, baixo.slice(1, -1));
    }
    const dentro = [];
    for (let k = 0; k < n; k++) {
      dentro.push(info[k].rep);
      if (linha[k]) { dentro.push(...(topoDaUltima.get(k) ?? [])); continue; }
      const C = cadeia(P[k], P[seg(k)]);
      const s = info[k].tipo === 'um' ? Math.max(C.indexOf(info[k].rep), 0) : 0;
      const e = info[seg(k)].tipo === 'um' ? (C.indexOf(info[seg(k)].rep) >= 0 ? C.indexOf(info[seg(k)].rep) : C.length - 1) : C.length - 1;
      if (e > s + 1) dentro.push(...C.slice(s + 1, e));
    }
    if (new Set(dentro).size >= 3) saida.push(dentro);
    /* as células do canto */
    for (let k = 0; k < n; k++) {
      const I = info[k]; if (I.tipo !== 'canto') continue;
      const a = P[k]; const Cn = cadeia(a, P[seg(k)]), Ca = cadeia(a, P[ant(k)]);
      for (let i = 0; i < I.mp; i++) for (let j = 0; j < I.mn; j++) {
        const ladoDeI = j === 0 ? entre(Cn, I.G[i][0], I.G[i + 1][0]) : [];
        const ladoDeJ = i === 0 ? entre(Ca, I.G[0][j], I.G[0][j + 1]).reverse() : [];
        saida.push([I.G[i][j + 1], ...ladoDeJ, I.G[i][j], ...ladoDeI, I.G[i + 1][j], I.G[i + 1][j + 1]]);
      }
    }
  });
  /* a linha de cada vinco aplicado segue as arestas novas: o ponto que outro vinco pôs sobre uma aresta dela entra na sequência */
  const linhas = {};
  for (const L of lidos) {
    const seq = [L.nomes[0]];
    for (const [u, w] of L.arestas) seq.push(...cadeia(u, w).slice(1));
    linhas[L.vinco] = seq;
  }
  return { pontos: novos, faces: saida, raios, avisos, origens, aplicados, linhas };
}
