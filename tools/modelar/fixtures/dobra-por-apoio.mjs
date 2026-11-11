/* dobra-por-apoio.mjs — as fixtures sem domínio das ferramentas de raio, de ondulação e de entrada: uma chapa dobrada por colunas de apoio
 * e a malha de um cilindro de raio conhecido entre dois planos.
 *
 * `receitaDaDobra` é a receita (em metro) de uma chapa de 400 mm ao longo de z, de seção em V (a dobra de `angulo` graus no meio), com
 * uma coluna de apoio a `apoio` mm de cada lado da quina e a coluna seguinte a `vizinho` mm do apoio: o desenho que o ajudante de gaiola
 * monta quando o vinco pede raio. O vinco da quina é declarado com nitidez 0 (`declarar: 'nitidez0'`), com nitidez 'viva' (`'viva'`)
 * ou não é declarado (`'nenhum'`). Com `lamina`, o corte leva também uma lâmina de gaiola sem subdivisão. Com `corte`, um cubo é subtraído de uma ponta da chapa de espessura 1 mm (a chapa depois do corte, que
 * já não tem os vértices da gaiola). `esbocoDaDobra` é a mesma peça como esboço 2.0 (em milímetro), com passos crus.
 *
 * `malhaDoCilindro` é a malha neutra de um perfil de dois planos concordados por um arco de raio `raio` (a dobra de `angulo` graus),
 * extrudado em z: o raio verdadeiro é conhecido. Com `raio: 0`, a quina é viva. */

export const COMPRIMENTO_MM = 800;
const ESTACOES = 9;

/** As colunas da seção, em mm no plano xy: a face de trás ao longo de −x, a da frente a `angulo` graus dela, com colunas de `passoDaFace` mm
 *  além das de apoio até `meiaLargura` mm da quina (a quina fica longe da borda da chapa, e a leitura de ondulação não a toma por borda). */
export function colunasDaSecao({ angulo = 90, apoio = 6, vizinho = 40, meiaLargura = 250, passoDaFace = 50 } = {}) {
  const t = (angulo * Math.PI) / 180; const c = Math.cos(t); const s = Math.sin(t);
  const ate = []; for (let d = apoio + vizinho + passoDaFace; d < meiaLargura; d += passoDaFace) ate.push(d);
  ate.push(meiaLargura);
  const distancias = [apoio, apoio + vizinho, ...ate];
  const costas = [...distancias].reverse().map((d) => [-d, 0]);
  const frente = distancias.map((d) => [d * c, d * s]);
  return [...costas, [0, 0], ...frente];
}

function gaiolaDaDobra(opcoes) {
  const colunas = colunasDaSecao(opcoes);
  const pontos = {}; const faces = [];
  for (let i = 0; i < ESTACOES; i++) colunas.forEach(([x, y], j) => { pontos[`e${i}_c${j}`] = [x, y, (i * COMPRIMENTO_MM) / (ESTACOES - 1)]; });
  for (let i = 0; i + 1 < ESTACOES; i++) for (let j = 0; j + 1 < colunas.length; j++) faces.push([`e${i}_c${j}`, `e${i + 1}_c${j}`, `e${i + 1}_c${j + 1}`, `e${i}_c${j + 1}`]);
  return { pontos, faces };
}

/** A receita da dobra, em metro. `declarar`: 'nitidez0' | 'viva' | 'nenhum'. `espessura` em mm (0 é chapa de uma pele). */
export function receitaDaDobra({ angulo = 90, apoio = 6, vizinho = 40, declarar = 'nitidez0', espessura = 1, niveis = 3, corte = false, lamina = false } = {}) {
  const { pontos, faces } = gaiolaDaDobra({ angulo, apoio, vizinho });
  const TOPO = Object.fromEntries(Object.entries(pontos).map(([n, p]) => [n, p.map((x) => x / 1000)]));
  const quina = colunasDaSecao({ angulo, apoio, vizinho }).findIndex(([x, y]) => x === 0 && y === 0);
  const vinco = { nome: 'quina', pontos: Array.from({ length: ESTACOES }, (_, i) => `e${i}_c${quina}`), nitidez: declarar === 'viva' ? 'viva' : 0 };
  const passo = { origemId: 1, vertices: Object.keys(pontos), faces, ...(declarar === 'nenhum' ? {} : { vincos: [vinco] }), niveis, borda: 'cantos', ...(espessura ? { espessura: espessura / 1000 } : {}) };
  const PASSOS = [['subdivisao', passo]];
  if (corte && lamina) {
    /* a lâmina do corte, como `paineisPorVaos` a faz: uma gaiola sem subdivisão (`niveis: 0`) com espessura, consumida pela subtração */
    Object.assign(TOPO, { l0: [-0.05, -0.05, 0.37], l1: [0.05, -0.05, 0.37], l2: [0.05, 0.05, 0.37], l3: [-0.05, 0.05, 0.37] });
    PASSOS.push(['subdivisao', { origemId: 4, vertices: ['l0', 'l1', 'l2', 'l3'], faces: [['l0', 'l1', 'l2', 'l3']], niveis: 0, espessura: 0.004 }]);
  }
  if (corte) {
    PASSOS.push(['cubo', { origemId: 2, larg: 0.1, alt: 0.1, prof: 0.1 }]);
    PASSOS.push(['transladar', { sel: { origem: { op: 'cubo', id: 2 } }, d: [0, 0, 0.4] }]);
    PASSOS.push(['subtrair', { origemId: 3, solidos: [{ origem: { op: 'subdivisao', id: 1 } }, { origem: { op: 'cubo', id: 2 } }, ...(lamina ? [{ origem: { op: 'subdivisao', id: 4 } }] : [])] }]);
  }
  PASSOS.push(['parte', { nome: 'chapa', sel: { origem: { op: corte ? 'subtrair' : 'subdivisao', id: corte ? 3 : 1 } } }]);
  return { PARAMS: {}, TOPO, PASSOS };
}

/** A mesma peça (sem o corte) como esboço 2.0, em mm, com passos crus. */
export function esbocoDaDobra(opcoes = {}) {
  const { pontos } = gaiolaDaDobra(opcoes);
  const { PASSOS } = receitaDaDobra({ ...opcoes, corte: false });
  const passo = { ...PASSOS[0][1], ...(PASSOS[0][1].espessura ? { espessura: PASSOS[0][1].espessura * 1000 } : {}) };
  return { opcoes: [{ titulo: 'dobra por apoio', nota: 'chapa em V com colunas de apoio junto da quina', topo: pontos, passos: [['subdivisao', passo], PASSOS[1]] }] };
}

/** A malha neutra (metro) do perfil de dois planos com um arco de `raio` mm entre eles, a dobra de `angulo` graus, extrudado 300 mm em z. */
export function malhaDoCilindro({ raio = 8, angulo = 90, arcoEmSegmentos = 48, comprimentoDoPlano = 70 } = {}) {
  const t = (angulo * Math.PI) / 180;
  const u1 = [1, 0]; const u2 = [Math.cos(t), Math.sin(t)];
  const T = raio > 0 ? raio * Math.tan(t / 2) : 0;                 /* a distância da quina viva (a origem) aos pontos de tangência */
  /* cada trecho reto sai em segmentos de uns 5 mm, como a malha de uma subdivisão: a medida lê o perfil, e um perfil de três pontos não tem como ser lido */
  const reta = (de, ate) => { const n = Math.max(1, Math.round(Math.hypot(ate[0] - de[0], ate[1] - de[1]) / 5)); return Array.from({ length: n }, (_, k) => [de[0] + ((ate[0] - de[0]) * (k + 1)) / n, de[1] + ((ate[1] - de[1]) * (k + 1)) / n]); };
  const inicio = [-comprimentoDoPlano * u1[0], 0];
  const perfil = [inicio];
  const A = [-T * u1[0], -T * u1[1]]; const B = [T * u2[0], T * u2[1]];
  perfil.push(...reta(inicio, A));
  if (T > 0) {
    /* o centro fica do lado de dentro da dobra, a `raio` das duas faces: o arco vai da tangente A à tangente B */
    const n1 = [-u1[1], u1[0]];                                   /* normal de u1, para o lado da dobra (y positivo) */
    const c = [A[0] + n1[0] * raio, A[1] + n1[1] * raio];
    const a0 = Math.atan2(A[1] - c[1], A[0] - c[0]); const a1 = Math.atan2(B[1] - c[1], B[0] - c[0]);
    let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    for (let k = 1; k < arcoEmSegmentos; k++) perfil.push([c[0] + raio * Math.cos(a0 + (d * k) / arcoEmSegmentos), c[1] + raio * Math.sin(a0 + (d * k) / arcoEmSegmentos)]);
    perfil.push(B);
  }
  perfil.push(...reta(B, [comprimentoDoPlano * u2[0], comprimentoDoPlano * u2[1]]));
  const V = new Map(); const F = new Map(); const L = 300; const nz = 3;
  const id = (i, k) => i * 100 + k;
  perfil.forEach(([x, y], i) => { for (let k = 0; k <= nz; k++) V.set(id(i, k), [x / 1000, y / 1000, (L * k) / nz / 1000]); });
  let f = 0;
  for (let i = 0; i + 1 < perfil.length; i++) for (let k = 0; k < nz; k++) { f++; F.set(f, { id: f, vs: [id(i, k), id(i + 1, k), id(i + 1, k + 1), id(i, k + 1)], parte: 'chapa' }); }
  return { V, F, quinaMm: [0, 0], comprimentoMm: L };
}
