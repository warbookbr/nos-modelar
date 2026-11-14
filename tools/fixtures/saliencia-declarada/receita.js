/* saliencia-declarada — chapa neutra com uma saliência (ou um rebaixo) de dupla curvatura desenhada de propósito, para provar a declaração `PLANO.saliencias` da
 * régua de ondulação. Nenhum dado vem de referência externa e nada aqui conhece objeto.
 *
 * A chapa é uma gaiola de 19 × 11 pontos nomeados `p<i>_<j>` a cada 100 mm em x e z, plana em y = 0, todos os pontos medidos, borda com cantos e nível 2. A feição
 * é uma lombada de perfil cos² e 300 mm de meia largura, centrada em x = 700 mm e z = 500 mm, com `amplitudeMm` de altura (negativa, um rebaixo). `ondular`
 * soma por cima dela uma ondulação de milímetros entre dois pontos vizinhos, como `plantar` da prova de ondulação. `declarar` põe `PLANO.saliencias`, com a
 * região da feição e a mesma amplitude. */

export const PASSO = 0.1;
export const NI = 19;
export const NJ = 11;
export const CENTRO_MM = [700, 500];
export const MEIA_LARGURA_MM = 300;
export const nome = (i, j) => `p${i}_${j}`;

/** alturaMm(x, z, amplitudeMm) -> a altura y da forma em milímetro, em x e z em milímetro. */
export function alturaMm(x, z, amplitudeMm) {
  const r = Math.hypot(x - CENTRO_MM[0], z - CENTRO_MM[1]) / MEIA_LARGURA_MM;
  return r >= 1 ? 0 : amplitudeMm * Math.cos((Math.PI / 2) * r) ** 2;
}

/** regiaoDaFeicao(amplitudeMm) -> a caixa que cobre a lombada, com a altura dela e uma folga de 5 mm. */
export function regiaoDaFeicao(amplitudeMm) {
  const [cx, cz] = CENTRO_MM; const w = MEIA_LARGURA_MM + 1;
  return { min: [cx - w, Math.min(0, amplitudeMm) - 5, cz - w], max: [cx + w, Math.max(0, amplitudeMm) + 5, cz + w] };
}

/** receitaDeProva({ amplitudeMm, ondular, declarar }) -> a receita { PARAMS, TOPO, PASSOS, PLANO } da chapa. `ondular` é { ponto: mm } e desloca o ponto
 *  nomeado em y; com `declarar`, o PLANO declara a feição que a chapa tem. */
export function receitaDeProva({ amplitudeMm = 60, ondular = {}, declarar = false } = {}) {
  const TOPO = {}; const vertices = []; const faces = []; const medidas = [];
  for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
    const n = nome(i, j); const x = PASSO * i, z = PASSO * j;
    TOPO[n] = [x, (alturaMm(x * 1000, z * 1000, amplitudeMm) + (ondular[n] ?? 0)) / 1000, z];
    vertices.push(n); medidas.push(n);
  }
  for (const n of Object.keys(ondular)) if (!(n in TOPO)) throw new TypeError(`saliencia-declarada: o ponto ${n} não é da gaiola`);
  for (let j = 0; j + 1 < NJ; j++) for (let i = 0; i + 1 < NI; i++) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  return {
    meta: { nome: 'saliencia-declarada' },
    PARAMS: {},
    TOPO,
    PASSOS: [
      ['subdivisao', { origemId: 1, vertices, faces, medidas, borda: 'cantos', niveis: 2 }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
    PLANO: {
      objeto: 'chapa neutra com uma lombada suave de prova da declaração de saliência',
      referencias: ['desenho por código, sem referência externa'],
      escala: { medida: 'mm', milimetros: 1 },
      partes: [{ nome: 'chapa', forma: 'chapa plana com uma lombada cos² de 300 mm de meia largura', tecnica: 'subdivisao' }],
      criteriosDeReprovacao: ['a lombada some ou vira calombo fora da região declarada'],
      ...(declarar ? {
        saliencias: [{
          regiao: regiaoDaFeicao(amplitudeMm), sentido: amplitudeMm >= 0 ? 'fora' : 'dentro', amplitudeMm: Math.abs(amplitudeMm),
          motivo: 'lombada desenhada de dupla curvatura, aprovada como forma da chapa de prova',
        }],
      } : {}),
    },
  };
}

export default receitaDeProva({ declarar: true });
