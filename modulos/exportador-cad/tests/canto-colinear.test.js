/* canto-colinear.test.js — perfil de extrusão com um vértice no meio de uma aresta (caso 2 do plano dos veículos), no STEP. */
import { OcctKernel } from 'occt-wasm';
import { describe, expect, it } from 'vitest';
import { exportarCad, validarMalha } from '../src/index.js';
import { triangularFaces } from '../src/triangular-faces.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';

const receita = {
  PASSOS: [
    ['extrusao', { origemId: 1, altura: 0.3, perfil: [[0, 0], [0.5, 0], [1, 0], [1, 0.4], [0, 0.4]] }],
    ['parte', { nome: 'bloco', sel: { origem: { op: 'extrusao', id: 1 } } }],
  ],
};

describe('exportador CAD e o canto colinear', () => {
  it('a validação guarda a triangulação de cada face, e a das faces sem canto colinear é o leque de sempre', () => {
    const { neutro } = executarReceita(receita);
    const malha = validarMalha(neutro, { tolerancia: 0.001 });
    for (const face of malha.faces) {
      expect(triangularFaces(face)).toHaveLength(face.vs.length - 2);
      if (face.vs.length === 4) expect(triangularFaces(face)).toEqual([[face.vs[0], face.vs[1], face.vs[2]], [face.vs[0], face.vs[2], face.vs[3]]]);
    }
  });

  it('exporta em STEP um sólido válido com o volume do prisma', async () => {
    const { neutro } = executarReceita(receita);
    const saida = await exportarCad({ nome: 'bloco', neutro, formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: 1000, tolerancia: 0.001 });
    expect(saida.diagnostico.facesOriginais).toBe(7);
    const kernel = await OcctKernel.init();
    try {
      const forma = kernel.importStep(new TextDecoder().decode(saida.bytes));
      expect(kernel.isValid(forma)).toBe(true);
      expect(kernel.subShapeCount(forma, 'solid')).toBe(1);
      /* 1 m × 0,4 m × 0,3 m = 0,12 m³ = 1,2e8 mm³ */
      expect(kernel.getVolume(forma) / 1.2e8).toBeCloseTo(1, 6);
    } finally {
      kernel[Symbol.dispose]();
    }
  });
});
