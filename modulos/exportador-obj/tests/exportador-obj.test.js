/* exportador-obj.test.js — suíte de testes do exportador Wavefront OBJ. */
import { describe, expect, it } from 'vitest';
import {
  ErroExportacaoObj,
  FORMATO,
  exportarObj,
  validarOpcoes,
} from '../src/index.js';

const pontosCubo = [
  [0, 0, 0],
  [20, 0, 0],
  [20, 30, 0],
  [0, 30, 0],
  [0, 0, 40],
  [20, 0, 40],
  [20, 30, 40],
  [0, 30, 40],
];

const triangulosCubo = [
  [0, 2, 1],
  [0, 3, 2],
  [4, 5, 6],
  [4, 6, 7],
  [0, 1, 5],
  [0, 5, 4],
  [3, 7, 6],
  [3, 6, 2],
  [0, 4, 7],
  [0, 7, 3],
  [1, 2, 6],
  [1, 6, 5],
];

function neutroCubo(parte = 'cubo', offset = [0, 0, 0], idOffset = 0) {
  const V = new Map();
  for (let i = 0; i < pontosCubo.length; i++) {
    const p = pontosCubo[i];
    V.set(i + idOffset, [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]]);
  }
  const F = new Map();
  for (let i = 0; i < triangulosCubo.length; i++) {
    const vs = triangulosCubo[i].map((v) => v + idOffset);
    F.set(i + idOffset, { id: i + idOffset, vs, parte });
  }
  return { V, F };
}

describe('exportador Wavefront OBJ', () => {
  it('valida opções rejeitando dados inválidos', () => {
    expect(() => validarOpcoes(null)).toThrowError(ErroExportacaoObj);
    expect(() => validarOpcoes({ nome: '' })).toThrowError(/Nome da peça/);
    expect(() => validarOpcoes({ nome: 'teste', unidade: 'polegadas' })).toThrowError(/Unidade/);
    expect(() => validarOpcoes({ nome: 'teste', escala: -5 })).toThrowError(/Escala/);
  });

  it('adota por padrão unidade metros e escala 1 para OBJ', async () => {
    const out = await exportarObj({
      nome: 'cubo_padrao',
      neutro: neutroCubo('cubo'),
    });

    expect(out.diagnostico.unidade).toBe('m');
    expect(out.diagnostico.escala).toBe(1);
    expect(out.texto).toContain('# Unidade: m (fator de escala: 1)');
    expect(out.texto).toContain('v 20 30 40');
  });

  it('exporta cubo simples com 8 vértices e 12 faces', async () => {
    const out = await exportarObj({
      nome: 'cubo',
      neutro: neutroCubo('cubo'),
      unidade: 'm',
      escala: 1,
    });

    expect(out.formato).toBe(FORMATO);
    expect(out.extensao).toBe('.obj');
    expect(out.mime).toBe('model/obj');
    expect(out.texto).toContain('o cubo');
    expect(out.texto).toContain('g cubo');
    expect(out.diagnostico.totalVertices).toBe(8);
    expect(out.diagnostico.totalTriangulos).toBe(12);

    // Vértice 20, 30, 40 presente
    expect(out.texto).toContain('v 20 30 40');
    // Faces contendo o formato v//vn
    expect(out.texto).toMatch(/f \d+\/\/\d+ \d+\/\/\d+ \d+\/\/\d+/);
  });

  it('exporta multipartes mantendo tags o e grupos separados', async () => {
    const base = neutroCubo('base', [0, 0, 0], 0);
    const cabecote = neutroCubo('cabecote', [0, 0, 100], 100);
    const neutro = {
      V: new Map([...base.V, ...cabecote.V]),
      F: new Map([...base.F, ...cabecote.F]),
    };

    const out = await exportarObj({
      nome: 'prensa',
      neutro,
      unidade: 'cm',
      escala: 100,
    });

    expect(out.texto).toContain('o base');
    expect(out.texto).toContain('o cabecote');
    expect(out.diagnostico.totalCorpos).toBe(2);
    expect(out.diagnostico.totalVertices).toBe(16);
    expect(out.diagnostico.totalTriangulos).toBe(24);
  });

  it('aplica escalas e conversões de unidade corretamente', async () => {
    const neutro = neutroCubo('bloco');

    const outM = await exportarObj({ nome: 'b', neutro, unidade: 'm', escala: 1 });
    expect(outM.texto).toContain('v 20 30 40');

    const outCm = await exportarObj({ nome: 'b', neutro, unidade: 'cm', escala: 100 });
    expect(outCm.texto).toContain('v 2000 3000 4000');

    const outMm = await exportarObj({ nome: 'b', neutro, unidade: 'mm', escala: 1000 });
    expect(outMm.texto).toContain('v 20000 30000 40000');
  });

  it('é estritamente determinístico', async () => {
    const neutro = neutroCubo('cubo');
    const run1 = await exportarObj({ nome: 'c', neutro, unidade: 'mm' });
    const run2 = await exportarObj({ nome: 'c', neutro, unidade: 'mm' });

    expect(run1.texto).toBe(run2.texto);
    expect(run1.bytes).toEqual(run2.bytes);
  });

  it('permite superfícies abertas por padrão sem falhar com borda-aberta', async () => {
    const V = new Map([
      [0, [0, 0, 0]],
      [1, [1, 0, 0]],
      [2, [1, 1, 0]],
    ]);
    const F = new Map([
      [0, { id: 0, vs: [0, 1, 2], parte: 'chapa' }],
    ]);

    const out = await exportarObj({
      nome: 'chapa',
      neutro: { V, F },
      unidade: 'm',
      escala: 1,
    });

    expect(out.texto).toContain('o chapa');
    expect(out.diagnostico.totalTriangulos).toBe(1);
  });
});
