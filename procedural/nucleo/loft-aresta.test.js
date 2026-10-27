/* loft-aresta.test.js — a ponta do loft fecha numa linha, com malha fechada e
   sem leque nem triângulo dobrado. */
import { describe, expect, it } from 'vitest';
import { nucleo } from './nucleo.js';
import { analisarTopologia } from './topologia.js';


function executar(passos) {
  return nucleo(passos, {}, {}, {}, null, []);
}

describe('loft com seção-aresta na ponta', () => {
  const contorno = [[0, -0.05], [0.1, -0.05], [0.1, 0], [0.1, 0.05], [0, 0.05], [-0.1, 0.05], [-0.1, 0], [-0.1, -0.05]];
  const passos = (ponta) => [['loft', { origemId: 1, lados: 8, secoes: [
    { pos: [0, 0, 0], aresta: ponta },
    { pos: [0, 0, 0.2], contorno },
    { pos: [0, 0, 0.4], raio: 0 },
  ] }]];

  it('fecha numa aresta: malha fechada, sem casca aberta, sem face fina, sem vértice solto', () => {
    const neutro = executar(passos([[0, -0.05], [0, 0.05]]));
    expect(neutro.orfaos).toEqual([]);
    const topo = analisarTopologia({ vertices: neutro.V, faces: neutro.F });
    const codigos = topo.achados.map((a) => a.codigo);
    for (const ruim of ['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente', 'face-fina', 'vertice-em-aresta', 'area-nula']) {
      expect(codigos).not.toContain(ruim);
    }
    expect(codigos).not.toContain('dobra');
    /* só viram vértice as posições da fila que recebem a projeção de algum
       ponto do anel: aqui a base, o meio e o topo do retângulo */
    const naLinha = [...neutro.V.values()].filter((p) => Math.abs(p[2]) < 1e-12);
    expect(naLinha.map((p) => p[1]).sort((x, y) => x - y)).toEqual([-0.05, 0, 0.05]);
    expect(naLinha.every((p) => Math.abs(p[0]) < 1e-12)).toBe(true);
  });

  it('fecha numa aresta um anel em D mais fino sem dobra', () => {
    const L = 24;
    const d = Array.from({ length: L }, (_, j) => {
      const t = (j / L) * Math.PI * 2;
      return [Math.max(-0.02, Math.cos(t) * 0.1), Math.sin(t) * 0.06];
    });
    const neutro = executar([['loft', { origemId: 1, lados: L, secoes: [
      { pos: [0, 0, 0], aresta: [[-0.02, -0.06], [-0.02, 0.06]] },
      { pos: [0, 0, 0.1], contorno: d },
      { pos: [0, 0, 0.3], contorno: d },
      { pos: [0, 0, 0.4], raio: 0 },
    ] }]]);
    expect(neutro.orfaos).toEqual([]);
    const codigos = analisarTopologia({ vertices: neutro.V, faces: neutro.F }).achados.map((a) => a.codigo);
    for (const ruim of ['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente', 'dobra', 'vertice-em-aresta', 'area-nula']) {
      expect(codigos).not.toContain(ruim);
    }
  });

  it('recusa aresta fora da ponta, com lados ímpar ou com pontas iguais', () => {
    const meio = nucleo([['loft', { lados: 8, secoes: [{ pos: [0, 0, 0], contorno }, { pos: [0, 0, 0.2], aresta: [[0, 0], [0, 1]] }, { pos: [0, 0, 0.4], contorno }] }]], {}, {}, {}, null, []);
    expect(meio.orfaos.some((o) => /só fecha uma PONTA/.test(o.motivo))).toBe(true);
    const impar = nucleo([['loft', { lados: 7, secoes: [{ pos: [0, 0, 0], aresta: [[0, 0], [0, 1]] }, { pos: [0, 0, 0.2], raio: 0.1 }] }]], {}, {}, {}, null, []);
    expect(impar.orfaos.some((o) => /lados' par/.test(o.motivo))).toBe(true);
    const iguais = nucleo([['loft', { lados: 8, secoes: [{ pos: [0, 0, 0], aresta: [[0, 0], [0, 0]] }, { pos: [0, 0, 0.2], raio: 0.1 }] }]], {}, {}, {}, null, []);
    expect(iguais.orfaos.some((o) => /coincidem/.test(o.motivo))).toBe(true);
  });
});
