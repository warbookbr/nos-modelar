/* operador-das-medidas.test.mjs — a gaiola ajustada pelas medidas vista como transformação linear da declarada.
 *
 * `operadorDasMedidas` dá o deslocamento da gaiola ajustada para um campo de deslocamentos da declarada, com a mesma
 * fatoração das duas funções de ajuste. A prova é refazer o ajuste a partir de uma gaiola mexida e conferir que a diferença
 * para o ajuste original é o que o operador devolve, nas três formas de medida: só exatas, só com peso e as duas juntas, numa
 * gaiola espelhada em x. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { ajustarGaiolaAsMedidas, ajustarGaiolaAsMedidasComPeso, espelharGaiolaEmX, operadorDasMedidas } from './subdivisao.js';
import { chavesExplicitas } from './fixtures/gaiola-interpolada-prova.js';

/* Um gerador determinístico de números em [−1, 1]. */
function sorteio(semente) {
  let s = semente >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s / 0xffffffff) * 2 - 1; };
}

function gaiolaDeProva() {
  const g = gaiolaPorEstacoes({ eixo: 'z', simetria: 'x', estacoes: chavesExplicitas() });
  const nomes = g.passo.vertices; const indice = new Map(nomes.map((n, k) => [n, k]));
  const gaiola = espelharGaiolaEmX({ vertices: nomes.map((n) => g.pontos[n]), faces: g.passo.faces.map((f) => f.map((n) => indice.get(n))), vincos: [], cantos: [] });
  return { ...gaiola, borda: 'cantos', nDeclarados: nomes.length };
}

const maior = (A, B) => Math.max(...A.map((p, k) => Math.max(Math.abs(p[0] - B[k][0]), Math.abs(p[1] - B[k][1]), Math.abs(p[2] - B[k][2]))));

describe('operador das medidas', () => {
  const gaiola = gaiolaDeProva();
  const declarados = [...Array(gaiola.nDeclarados).keys()];
  const com = (indices) => [...new Set(indices.flatMap((k) => [k, gaiola.imagem[k]]))];
  const exatas = com(declarados.filter((k) => k % 3 === 0));
  const pesos = com(declarados.filter((k) => k % 2 === 1)).map((indice) => ({ indice, peso: 2 }));
  const mistas = [...com(declarados.filter((k) => k % 5 === 0)).map((indice) => ({ indice, peso: Infinity })), ...com(declarados.filter((k) => k % 5 === 2)).map((indice) => ({ indice, peso: 3 }))];

  const casos = [
    ['só exatas', exatas.map((indice) => ({ indice, peso: Infinity })), (P, m) => ajustarGaiolaAsMedidas({ ...gaiola, vertices: P }, m.map((x) => x.indice)).vertices],
    ['só com peso', pesos, (P, m) => ajustarGaiolaAsMedidasComPeso({ ...gaiola, vertices: P }, m).vertices],
    ['exatas e com peso', mistas, (P, m) => ajustarGaiolaAsMedidasComPeso({ ...gaiola, vertices: P }, m).vertices],
  ];

  for (const [nome, medidas, ajustar] of casos) {
    it(`${nome}: aplicar à gaiola declarada dá a gaiola ajustada, e aplicar a um deslocamento dá a diferença de dois ajustes`, () => {
      const op = operadorDasMedidas(gaiola, medidas);
      const P = gaiola.vertices;
      const Q = ajustar(P, medidas);
      expect(maior(op.aplicar(P), Q)).toBeLessThan(1e-10);
      const rnd = sorteio(7);
      const D = P.map((p, k) => (k % 4 === 1 ? [0, 0, 0] : [rnd() * 1e-3, rnd() * 1e-3, rnd() * 1e-3]));
      const Pm = P.map((p, k) => [p[0] + D[k][0], p[1] + D[k][1], p[2] + D[k][2]]);
      const diferenca = ajustar(Pm, medidas).map((p, k) => [p[0] - Q[k][0], p[1] - Q[k][1], p[2] - Q[k][2]]);
      expect(maior(op.aplicar(D), diferenca)).toBeLessThan(1e-10);
      /* a medida exata anda com o deslocamento: o ponto medido acompanha o declarado, e o não medido fica como a gaiola declarada */
      const nao = P.map((_, k) => k).filter((k) => !medidas.some((m) => m.indice === k));
      const dQ = op.aplicar(D);
      if (nome === 'só exatas') for (const k of nao) expect(dQ[k]).toEqual(D[k]);
    });
  }

  it('é determinístico: duas construções dão o mesmo operador', () => {
    const D = gaiola.vertices.map((p, k) => [Math.sin(k) * 1e-3, 0, Math.cos(k) * 1e-3]);
    const a = operadorDasMedidas(gaiola, mistas).aplicar(D);
    const b = operadorDasMedidas(gaiola, mistas).aplicar(D);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
