/* ondulacao-prova.js — a chapa desenhada por código para o teste da ferramenta de ondulação endereçada.
 *
 * A chapa é uma gaiola de 15 × 11 pontos nomeados `p<i>_<j>` a cada 100 mm em x e z, amostrando uma superfície lisa
 * de duas curvaturas (raio perto de 800 mm em x e 1200 mm em z, com uma onda longa de 2,2 m por cima), todos os pontos
 * medidos, borda com cantos e nível 2. Com `vincos`, a forma ganha uma lombada de 15 mm de altura e 300 mm de cada lado
 * em z = 700 mm, de perfil (1 − d/w)³, que nasce e morre dentro da chapa, com o vinco vivo na crista, e uma quebra de
 * inclinação de 0,1 em x = 1100 mm, com o vinco de nitidez 0,6, que também começa e termina dentro dela; fora da crista e
 * da quebra a forma é lisa. `plantar` desloca pontos nomeados da gaiola pela normal da forma, em milímetro: com
 * `{ p5_3: 1, p6_3: -1 }`, a superfície passa 1 mm para fora num ponto e 1 mm para dentro no vizinho, que é uma ondulação
 * de 1 mm entre os dois. O módulo exporta como padrão essa chapa com os vincos e a ondulação, para a linha de comando da
 * ferramenta. Nenhum dado vem de referência externa. */

export const PASSO = 0.1;
export const NI = 15;
export const NJ = 11;
export const nome = (i, j) => `p${i}_${j}`;

const VINCO_VIVO = { j: 7, de: 2, ate: 8, altura: 0.015, meiaLargura: 0.3, rampa: 0.3 };
const VINCO_FRACO = { i: 11, de: 2, ate: 8, inclinacao: 0.1, nitidez: 0.6, rampa: 0.3 };

const suave = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** altura(x, z, vincos) -> a altura y da forma em metro. */
export function altura(x, z, vincos = false) {
  let y = 0.3 - ((x - 0.7) ** 2) / (2 * 0.8) - ((z - 0.5) ** 2) / (2 * 1.2) + 0.02 * Math.sin(x / 0.35);
  if (!vincos) return y;
  /* lombada ao longo de z = 0,7 m, com quina só na crista: o perfil (1 − d/w)³ chega ao pé com inclinação e curvatura
     nulas, e a altura vai a zero nas pontas do vinco */
  const zv = VINCO_VIVO.j * PASSO;
  const ramp = suave((x - VINCO_VIVO.de * PASSO) / VINCO_VIVO.rampa) * suave((VINCO_VIVO.ate * PASSO - x) / VINCO_VIVO.rampa);
  y += VINCO_VIVO.altura * ramp * Math.max(0, 1 - Math.abs(z - zv) / VINCO_VIVO.meiaLargura) ** 3;
  /* quebra de inclinação ao longo de x = 1,1 m, que some nas pontas do vinco */
  const xv = VINCO_FRACO.i * PASSO;
  const rampZ = suave((z - VINCO_FRACO.de * PASSO) / VINCO_FRACO.rampa) * suave((VINCO_FRACO.ate * PASSO - z) / VINCO_FRACO.rampa);
  y -= VINCO_FRACO.inclinacao * rampZ * Math.max(0, x - xv);
  return y;
}

function normal(x, z, vincos) {
  const d = 1e-5;
  const fx = (altura(x + d, z, vincos) - altura(x - d, z, vincos)) / (2 * d);
  const fz = (altura(x, z + d, vincos) - altura(x, z - d, vincos)) / (2 * d);
  const l = Math.hypot(fx, 1, fz);
  return [-fx / l, 1 / l, -fz / l];
}

/** receitaDeProva({ vincos, declarar, plantar }) -> a receita { PARAMS, TOPO, PASSOS } da chapa. Com `declarar: false`,
 *  a forma tem a lombada e a quebra, mas o passo não declara os vincos. */
export function receitaDeProva({ vincos = false, declarar = true, plantar = {} } = {}) {
  const TOPO = {}; const vertices = []; const faces = []; const medidas = [];
  for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
    const x = PASSO * i, z = PASSO * j; const n = nome(i, j);
    const p = [x, altura(x, z, vincos), z];
    const mm = plantar[n] ?? 0;
    if (mm) { const nv = normal(x, z, vincos); for (let k = 0; k < 3; k++) p[k] += nv[k] * mm / 1000; }
    TOPO[n] = p; vertices.push(n); medidas.push(n);
  }
  for (const n of Object.keys(plantar)) if (!(n in TOPO)) throw new TypeError(`ondulacao-prova: o ponto ${n} não é da gaiola`);
  /* a normal das faces para +y: colunas em x, linhas em z, anti-horário visto de cima */
  for (let j = 0; j + 1 < NJ; j++) for (let i = 0; i + 1 < NI; i++) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  const passo = { origemId: 1, vertices, faces, medidas, borda: 'cantos', niveis: 2 };
  if (vincos && declarar) {
    passo.vincos = [
      { nome: 'crista', pontos: Array.from({ length: VINCO_VIVO.ate - VINCO_VIVO.de + 1 }, (_, k) => nome(VINCO_VIVO.de + k, VINCO_VIVO.j)), nitidez: 'viva' },
      { nome: 'quebra', pontos: Array.from({ length: VINCO_FRACO.ate - VINCO_FRACO.de + 1 }, (_, k) => nome(VINCO_FRACO.i, VINCO_FRACO.de + k)), nitidez: VINCO_FRACO.nitidez },
    ];
  }
  return {
    PARAMS: {},
    TOPO,
    PASSOS: [
      ['subdivisao', passo],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
  };
}

export const PLANTADA = { p5_3: 1, p6_3: -1 };
export default receitaDeProva({ vincos: true, plantar: PLANTADA });
