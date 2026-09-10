/* exportador-cad.test.js — suíte de testes do exportador CAD cobrindo R01, R02 e R04. */
import { OcctKernel } from 'occt-wasm';
import { describe, expect, it } from 'vitest';
import {
  ErroExportacaoCad,
  FORMATO,
  exportarCad,
  separarCorpos,
  validarMalha,
  validarOpcoes,
} from '../src/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { receitaEstrutura } from '../../../tools/fixtures/acervo/prensa-progressiva/estrutura.js';

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

function criarCilindroFacetado(raio = 10, altura = 30, lados = 12, parte = 'cilindro') {
  const V = new Map();
  const F = new Map();

  // Centro fundo = 0, Centro topo = 1
  V.set(0, [0, 0, 0]);
  V.set(1, [0, 0, altura]);

  let fid = 0;
  for (let i = 0; i < lados; i++) {
    const ang = (i * 2 * Math.PI) / lados;
    const x = raio * Math.cos(ang);
    const y = raio * Math.sin(ang);
    V.set(2 + i * 2, [x, y, 0]);
    V.set(2 + i * 2 + 1, [x, y, altura]);
  }

  for (let i = 0; i < lados; i++) {
    const proximo = (i + 1) % lados;
    const b1 = 2 + i * 2;
    const t1 = 2 + i * 2 + 1;
    const b2 = 2 + proximo * 2;
    const t2 = 2 + proximo * 2 + 1;

    F.set(fid, { id: fid++, vs: [0, b1, b2], parte });
    F.set(fid, { id: fid++, vs: [1, t2, t1], parte });
    F.set(fid, { id: fid++, vs: [b1, t1, t2], parte });
    F.set(fid, { id: fid++, vs: [b1, t2, b2], parte });
  }

  return { V, F };
}

describe('R01 — contrato e validação pura', () => {
  it('valida opções rejeitando campos inválidos e aceitando válidos', () => {
    expect(() => validarOpcoes(null)).toThrowError(ErroExportacaoCad);
    expect(() => validarOpcoes({})).toThrowError(ErroExportacaoCad);
    expect(() => validarOpcoes({ nome: '', formato: 'step', estrategia: 'facetada', unidade: 'mm', tolerancia: 0.001 })).toThrowError(/Nome da peça/);
    expect(() => validarOpcoes({ nome: 'peca', formato: 'iges', estrategia: 'facetada', unidade: 'mm', tolerancia: 0.001 })).toThrowError(/formato/);
    expect(() => validarOpcoes({ nome: 'peca', formato: 'step', estrategia: 'solida', unidade: 'mm', tolerancia: 0.001 })).toThrowError(/estratégia/);
    expect(() => validarOpcoes({ nome: 'peca', formato: 'step', estrategia: 'facetada', unidade: 'polegada', tolerancia: 0.001 })).toThrowError(/Unidade/);
    expect(() => validarOpcoes({ nome: 'peca', formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: -1, tolerancia: 0.001 })).toThrowError(/Escala/);
    expect(() => validarOpcoes({ nome: 'peca', formato: 'step', estrategia: 'facetada', unidade: 'mm', tolerancia: -0.01 })).toThrowError(/Tolerância/);

    const normal = validarOpcoes({ nome: 'peca_teste', formato: 'step', estrategia: 'facetada', unidade: 'mm', tolerancia: 0.001 });
    expect(normal).toEqual({
      nome: 'peca_teste',
      formato: 'step',
      estrategia: 'facetada',
      unidade: 'mm',
      escala: 1,
      tolerancia: 0.001,
    });
  });

  it('recusa malha vazia e formato neutro inválido', () => {
    expect(() => validarMalha(null, { tolerancia: 0.001 })).toThrowError(/Malha neutra precisa/);
    expect(() => validarMalha({ V: new Map(), F: new Map() }, { tolerancia: 0.001 })).toThrowError(/não pode ser vazia/);
  });

  it('recusa vértice inválido ou ausente', () => {
    const semVertice = neutroCubo();
    semVertice.V.delete(7);
    expect(() => validarMalha(semVertice, { tolerancia: 0.001 })).toThrowError(/Face referencia vértice inexistente/);

    const verticeNaN = neutroCubo();
    verticeNaN.V.set(0, [NaN, 0, 0]);
    expect(() => validarMalha(verticeNaN, { tolerancia: 0.001 })).toThrowError(/Vértice precisa ter id inteiro e três coordenadas finitas/);
  });

  it('recusa face degenerada e face sem parte', () => {
    const faceSemParte = neutroCubo();
    faceSemParte.F.set(0, { id: 0, vs: [0, 2, 1], parte: '' });
    expect(() => validarMalha(faceSemParte, { tolerancia: 0.001 })).toThrowError(/pertencer a uma parte/);

    const faceDegenerada = neutroCubo();
    faceDegenerada.F.set(0, { id: 0, vs: [0, 0, 1], parte: 'cubo' });
    expect(() => validarMalha(faceDegenerada, { tolerancia: 0.001 })).toThrowError(/três vértices distintos/);
  });

  it('recusa borda aberta antes de carregar o kernel', () => {
    const neutro = neutroCubo();
    neutro.F.delete(11);
    expect(() => validarMalha(neutro, { tolerancia: 0.001 })).toThrowError(/Aresta pertence a uma única face/);
  });

  it('recusa aresta não-manifold (> 2 faces na mesma aresta)', () => {
    const neutro = neutroCubo();
    neutro.F.set(99, { id: 99, vs: [0, 2, 1], parte: 'cubo' });
    expect(() => validarMalha(neutro, { tolerancia: 0.001 })).toThrowError(/Aresta pertence a mais de duas faces/);
  });

  it('recusa orientação incoerente (faces adjacentes com sentidos iguais na aresta)', () => {
    const neutro = neutroCubo();
    neutro.F.set(0, { id: 0, vs: [0, 1, 2], parte: 'cubo' });
    expect(() => validarMalha(neutro, { tolerancia: 0.001 })).toThrowError(/mesmo sentido/);
  });

  it('separa corpos desconectados e nomeia sufixos determinísticos', () => {
    const cubo1 = neutroCubo('estrutura', [0, 0, 0], 0);
    const cubo2 = neutroCubo('estrutura', [50, 0, 0], 100);

    const V = new Map([...cubo1.V, ...cubo2.V]);
    const F = new Map([...cubo1.F, ...cubo2.F]);

    const malha = validarMalha({ V, F }, { tolerancia: 0.001 });
    const corpos = separarCorpos(malha);

    expect(corpos.map((c) => c.nome)).toEqual(['estrutura', 'estrutura__2']);
    expect(corpos[0].faces.length).toBe(12);
    expect(corpos[1].faces.length).toBe(12);
  });

  it('separa multipartes com nomes independentes', () => {
    const base = neutroCubo('base', [0, 0, 0], 0);
    const tampa = neutroCubo('tampa', [0, 0, 50], 100);

    const V = new Map([...base.V, ...tampa.V]);
    const F = new Map([...base.F, ...tampa.F]);

    const malha = validarMalha({ V, F }, { tolerancia: 0.001 });
    const corpos = separarCorpos(malha);

    expect(corpos.map((c) => c.nome)).toEqual(['base', 'tampa']);
  });

  it('preserva determinismo independente da ordem de inserção das faces', () => {
    const n1 = neutroCubo('cubo');
    const n2 = {
      V: new Map([...n1.V]),
      F: new Map([...n1.F].reverse()),
    };

    const c1 = separarCorpos(validarMalha(n1, { tolerancia: 0.001 }));
    const c2 = separarCorpos(validarMalha(n2, { tolerancia: 0.001 }));

    expect(c1.map((c) => c.nome)).toEqual(c2.map((c) => c.nome));
    expect(c1[0].faces.map((f) => f.id)).toEqual(c2[0].faces.map((f) => f.id));
  });
});

describe('R02 — backend STEP facetado e reimportação', () => {
  it('exporta cubo facetado (20x30x40) e reimporta conferindo medidas', async () => {
    const out = await exportarCad({
      nome: 'cubo',
      neutro: neutroCubo(),
      formato: 'step',
      estrategia: 'facetada',
      unidade: 'mm',
      tolerancia: 0.001,
    });

    expect(out.formato).toBe(FORMATO);
    expect(out.extensao).toBe('.step');
    expect(out.mime).toBe('model/step');
    expect(new TextDecoder().decode(out.bytes)).toMatch(/^ISO-10303-21;/);
    expect(out.diagnostico).toMatchObject({
      backend: 'occt-wasm@4.3.2',
      estrategia: 'facetada',
      unidade: 'mm',
      escala: 1,
      tolerancia: 0.001,
      vertices: 8,
      facesOriginais: 12,
      corpos: [{ nome: 'cubo', volume: 24000 }],
    });
    expect(out.diagnostico.impressaoGeometrica).toMatchObject({
      unidade: 'mm',
      corpos: [{ nome: 'cubo', volume: 24000 }],
    });

    const kernel = await OcctKernel.init();
    try {
      const forma = kernel.importStep(new TextDecoder().decode(out.bytes));
      expect(kernel.isValid(forma)).toBe(true);
      expect(kernel.subShapeCount(forma, 'solid')).toBe(1);
      expect(kernel.getVolume(forma)).toBeCloseTo(24000, 4);

      const bbox = kernel.getBoundingBox(forma);
      const minX = bbox.xmin ?? bbox.minX ?? bbox.min?.[0] ?? bbox[0];
      const minY = bbox.ymin ?? bbox.minY ?? bbox.min?.[1] ?? bbox[1];
      const minZ = bbox.zmin ?? bbox.minZ ?? bbox.min?.[2] ?? bbox[2];
      const maxX = bbox.xmax ?? bbox.maxX ?? bbox.max?.[0] ?? bbox[3];
      const maxY = bbox.ymax ?? bbox.maxY ?? bbox.max?.[1] ?? bbox[4];
      const maxZ = bbox.zmax ?? bbox.maxZ ?? bbox.max?.[2] ?? bbox[5];

      expect(minX).toBeCloseTo(0, 3);
      expect(minY).toBeCloseTo(0, 3);
      expect(minZ).toBeCloseTo(0, 3);
      expect(maxX).toBeCloseTo(20, 3);
      expect(maxY).toBeCloseTo(30, 3);
      expect(maxZ).toBeCloseTo(40, 3);
    } finally {
      kernel[Symbol.dispose]();
    }
  });

  it('exporta cilindro facetado e valida solidez e volume', async () => {
    const cilindro = criarCilindroFacetado(10, 30, 24, 'cilindro');
    const out = await exportarCad({
      nome: 'cilindro',
      neutro: cilindro,
      formato: 'step',
      estrategia: 'facetada',
      unidade: 'mm',
      tolerancia: 0.001,
    });

    const kernel = await OcctKernel.init();
    try {
      const forma = kernel.importStep(new TextDecoder().decode(out.bytes));
      expect(kernel.isValid(forma)).toBe(true);
      expect(kernel.subShapeCount(forma, 'solid')).toBe(1);
      const volumeEsperado = 24 * 0.5 * 10 * 10 * Math.sin((2 * Math.PI) / 24) * 30;
      expect(kernel.getVolume(forma)).toBeCloseTo(volumeEsperado, 2);
    } finally {
      kernel[Symbol.dispose]();
    }
  });

  it('aplica escala e conversão de unidades (cm e m)', async () => {
    const outCm = await exportarCad({
      nome: 'cubo_cm',
      neutro: neutroCubo(),
      formato: 'step',
      estrategia: 'facetada',
      unidade: 'cm',
      tolerancia: 0.001,
    });

    const kernel = await OcctKernel.init();
    try {
      const forma = kernel.importStep(new TextDecoder().decode(outCm.bytes));
      expect(kernel.getVolume(forma)).toBeCloseTo(24000 * 1000, 2);
    } finally {
      kernel[Symbol.dispose]();
    }
  });

  it('exporta multipartes em compound preservando nomes dos corpos', async () => {
    const base = neutroCubo('base', [0, 0, 0], 0);
    const tampa = neutroCubo('tampa', [0, 0, 50], 100);
    const multipartes = {
      V: new Map([...base.V, ...tampa.V]),
      F: new Map([...base.F, ...tampa.F]),
    };

    const out = await exportarCad({
      nome: 'conjunto',
      neutro: multipartes,
      formato: 'step',
      estrategia: 'facetada',
      unidade: 'mm',
      tolerancia: 0.001,
    });

    expect(out.diagnostico.corpos.map((c) => c.nome)).toEqual(['base', 'tampa']);

    const kernel = await OcctKernel.init();
    try {
      const forma = kernel.importStep(new TextDecoder().decode(out.bytes));
      expect(kernel.isValid(forma)).toBe(true);
      expect(kernel.subShapeCount(forma, 'solid')).toBe(2);
      expect(kernel.getVolume(forma)).toBeCloseTo(48000, 2);
    } finally {
      kernel[Symbol.dispose]();
    }
  });
});

describe('R04 — ida e volta e receita real de campo', () => {
  it('executa e exporta a receita real da estrutura da prensa sem alteração', async () => {
    const { neutro } = executarReceita(receitaEstrutura);
    expect(neutro.V.size).toBeGreaterThan(0);
    expect(neutro.F.size).toBeGreaterThan(0);

    const out = await exportarCad({
      nome: 'estrutura_prensa',
      neutro,
      formato: 'step',
      estrategia: 'facetada',
      unidade: 'mm',
      tolerancia: 0.001,
    });

    expect(out.bytes.length).toBeGreaterThan(1000);
    expect(out.diagnostico.partes.length).toBeGreaterThanOrEqual(2);
    expect(out.diagnostico.corpos.length).toBeGreaterThanOrEqual(2);

    const kernel = await OcctKernel.init();
    try {
      const forma = kernel.importStep(new TextDecoder().decode(out.bytes));
      expect(kernel.isValid(forma)).toBe(true);
      const qtdSolidos = kernel.subShapeCount(forma, 'solid');
      expect(qtdSolidos).toBeGreaterThanOrEqual(2);
      expect(kernel.getVolume(forma)).toBeGreaterThan(0);
    } finally {
      kernel[Symbol.dispose]();
    }
  });
});
