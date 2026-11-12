/* dobra-da-superficie.test.mjs — a régua de dobra sobre superfícies pequenas feitas aqui: duas faces que se dobram num ângulo conhecido.
 * O diedro é 180 graus menos o ângulo entre as normais; abaixo do mínimo a aresta fora de vinco é dobra, com a parte, o lugar e o ângulo;
 * o vinco declarado e a borda livre não entram; as arestas que se tocam são uma dobra só; e a mesma superfície dá a mesma saída. A régua
 * contra a peça de prova com a aba torta está em `tools/fixtures/solido-por-lacos/tubos.test.ts`. */
import { describe, expect, it } from 'vitest';
import { PADROES, dobraDaSuperficie, textoDaDobra } from './dobra-da-superficie.mjs';

/* duas faces de 1 m por 1 m: a primeira plana, em z = 0, e a segunda dobrada para cima `a` graus em torno da aresta x = 1 */
function folha(a, { vincos = [], parte = 'chapa' } = {}) {
  const r = (a * Math.PI) / 180;
  const vertices = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [1 + Math.cos(r), 0, Math.sin(r)], [1 + Math.cos(r), 1, Math.sin(r)]];
  return {
    vertices, faces: [[0, 1, 2, 3], [2, 1, 4, 5]], vincos, partes: vertices.map(() => new Set([parte])),
    gaiola: { vertices: [[0, 0, 0], [1, 0, 0]] }, nomeDe: (j) => ['ponta', 'aresta'][j],
  };
}

describe('dobra da superfície: o diedro agudo entre faces vizinhas fora de vinco', () => {
  it('a folha dobrada 100 graus tem diedro de 80 e é dobra, com a parte, o lugar, o ponto da gaiola e o ângulo', () => {
    const { arestas, dobras } = dobraDaSuperficie(folha(100));
    expect(arestas).toBe(7);
    expect(dobras).toHaveLength(1);
    expect(dobras[0]).toMatchObject({ parte: 'chapa', posicaoMm: [1000, 500, 0], diedroGraus: 80, arestas: 1, extensaoMm: 1000, pertoDe: 'aresta' });
    expect(textoDaDobra(dobras[0])).toBe('dobra na parte chapa, em [1000; 500; 0] mm, perto do ponto aresta da gaiola: diedro de 80 graus em 1 aresta(s), 1000 mm, de [1000; 0; 0] a [1000; 1000; 0] mm');
    expect(dobras[0].caixaMm).toEqual({ min: [1000, 0, 0], max: [1000, 1000, 0] });
  });

  it('a folha lisa, ou dobrada pouco, não é dobra, e o limiar é do diedro (120 graus por padrão)', () => {
    expect(PADROES.diedroMinimoGraus).toBe(120);
    expect(dobraDaSuperficie(folha(0)).dobras).toEqual([]);
    expect(dobraDaSuperficie(folha(59)).dobras).toEqual([]);
    expect(dobraDaSuperficie(folha(61)).dobras).toHaveLength(1);
    expect(dobraDaSuperficie(folha(100), { diedroMinimoGraus: 80 }).dobras).toEqual([]);
    expect(dobraDaSuperficie(folha(100), { diedroMinimoGraus: 81 }).dobras).toHaveLength(1);
  });

  it('o vinco declarado, de qualquer nitidez, tira a aresta da medida, e a borda livre nunca entra', () => {
    expect(dobraDaSuperficie(folha(100, { vincos: [[1, 2, 0.3]] })).dobras).toEqual([]);
    expect(dobraDaSuperficie(folha(100, { vincos: [[2, 1, true]] })).dobras).toEqual([]);
    /* as outras seis arestas só têm uma face */
    expect(dobraDaSuperficie(folha(179)).dobras).toHaveLength(1);
  });

  it('a parte vem das faces da aresta, a mais dobrada vem primeiro, e a mesma superfície dá a mesma saída', () => {
    const a = dobraDaSuperficie(folha(100, { parte: 'tubo' }));
    expect(a.dobras[0].parte).toBe('tubo');
    expect(JSON.stringify(dobraDaSuperficie(folha(100, { parte: 'tubo' })))).toBe(JSON.stringify(a));
    /* duas dobras que não se tocam: uma terceira face dobra para baixo a 150 graus, e a de menor diedro vem primeiro */
    const f = folha(100);
    f.vertices.push([0 - Math.cos(0.5), 0, -Math.sin(0.5)], [0 - Math.cos(0.5), 1, -Math.sin(0.5)]);
    f.faces.push([0, 3, 7, 6]);
    f.partes.push(new Set(['chapa']), new Set(['chapa']));
    const duas = dobraDaSuperficie(f, { diedroMinimoGraus: 170 }).dobras;
    expect(duas).toHaveLength(2);
    expect(duas[0].diedroGraus).toBeLessThan(duas[1].diedroGraus);
  });
});
