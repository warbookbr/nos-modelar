/* rebaixo-por-contorno.test.mjs — provas do ajudante rebaixoPorContorno (rebaixo fechado, faixa em volta, sulco, raio e recusas). */
import { describe, expect, it } from 'vitest';
import { nucleo } from './nucleo.js';
import { analisarTopologia } from './topologia.js';
import { rebaixoPorContorno } from './rebaixo-por-contorno.js';
import { retangulo } from '../../tools/fixtures/aberturas-em-teste/chapas.js';
import { alturaNaVista, blocoCurvoDeProva } from '../../tools/fixtures/rebaixo-por-contorno/corpo-de-prova.js';

const ORIG = { op: 'subdivisao', id: 1 };
const CORPO = { origem: ORIG };
const IDS = { copia: 2, prisma: 3, ferramenta: 4, subtrair: 5 };

describe('rebaixoPorContorno: os três modos no corpo de prova curvo', () => {
  const G = blocoCurvoDeProva();
  const base = [['subdivisao', { origemId: 1, ...G.passo }]];
  const antes = nucleo(base, {}, G.TOPO);

  it('rebaixo fechado acompanha a superfície curva em 9 pontos a menos de 0,5 mm da profundidade pedida', () => {
    const reb = rebaixoPorContorno({
      corpo: CORPO,
      vista: 'y',
      profundidade: 10,
      contorno: [[120, 120], [280, 120], [280, 280], [120, 280]],
      ids: IDS,
    });
    const r = nucleo([...base, ...reb.passos], {}, G.TOPO);
    expect(r.orfaos).toEqual([]);
    expect(analisarTopologia(r).resumo.reprovas).toBe(0);
    expect(reb.geometria).toEqual({ vista: 'y', sentido: '+', profundidadeMm: 10, modo: 'rebaixo' });

    /* 9 pontos no fundo do rebaixo: profundidade medida a menos de 0,5 mm de 10 mm */
    for (const u of [0.15, 0.20, 0.25]) {
      for (const v of [0.15, 0.20, 0.25]) {
        const y0 = alturaNaVista(antes, 'y', '+', u, v);
        const y1 = alturaNaVista(r, 'y', '+', u, v);
        const profMm = (y0 - y1) * 1000;
        expect(Math.abs(profMm - 10)).toBeLessThan(0.5);
      }
    }
    /* fora do rebaixo a superfície não mudou */
    expect(Math.abs((alturaNaVista(antes, 'y', '+', 0.05, 0.05) - alturaNaVista(r, 'y', '+', 0.05, 0.05)) * 1000)).toBeLessThan(0.01);
  });

  it('faixa em volta de um contorno rebaixa só o anel e preserva o miolo intacto', () => {
    const reb = rebaixoPorContorno({
      corpo: CORPO,
      vista: 'y',
      profundidade: 8,
      contorno: retangulo(160, 160, 240, 240),
      largura: 25,
      ids: IDS,
    });
    const r = nucleo([...base, ...reb.passos], {}, G.TOPO);
    expect(r.orfaos).toEqual([]);
    expect(analisarTopologia(r).resumo.reprovas).toBe(0);
    expect(reb.geometria.modo).toBe('faixa');
    /* miolo em (200, 200) permanece na altura original */
    expect(Math.abs((alturaNaVista(antes, 'y', '+', 0.20, 0.20) - alturaNaVista(r, 'y', '+', 0.20, 0.20)) * 1000)).toBeLessThan(0.01);
    /* anel em (148, 200) rebaixado 8 mm */
    expect(Math.abs(((alturaNaVista(antes, 'y', '+', 0.148, 0.20) - alturaNaVista(r, 'y', '+', 0.148, 0.20)) * 1000) - 8)).toBeLessThan(0.5);
  });

  it('sulco ao longo de uma linha aberta rebaixa a faixa de largura dada', () => {
    const reb = rebaixoPorContorno({
      corpo: CORPO,
      vista: 'y',
      profundidade: 6,
      linha: [[100, 200], [200, 220], [300, 200]],
      largura: 20,
      ids: IDS,
    });
    const r = nucleo([...base, ...reb.passos], {}, G.TOPO);
    expect(r.orfaos).toEqual([]);
    expect(analisarTopologia(r).resumo.reprovas).toBe(0);
    expect(reb.geometria.modo).toBe('sulco');
    expect(Math.abs(((alturaNaVista(antes, 'y', '+', 0.20, 0.22) - alturaNaVista(r, 'y', '+', 0.20, 0.22)) * 1000) - 6)).toBeLessThan(0.5);
  });

  it('é determinístico: a mesma receita gera exatamente a mesma malha', () => {
    const reb = rebaixoPorContorno({ corpo: CORPO, vista: 'y', profundidade: 10, contorno: [[140, 140], [260, 140], [260, 260], [140, 260]], ids: IDS });
    const a = nucleo([...base, ...reb.passos], {}, G.TOPO);
    const b = nucleo([...base, ...reb.passos], {}, G.TOPO);
    expect(a.F.size).toBe(b.F.size);
    expect(a.V.size).toBe(b.V.size);
  });
});

describe('rebaixoPorContorno: vistas x, z, sentido negativo e raio via arredondarCostura', () => {
  it('funciona nas vistas x e z e nos dois sentidos (+ e -)', () => {
    const cuboBase = [['cubo', { origemId: 1, larg: 0.4, alt: 0.4, prof: 0.4, em: [0, 0, 0] }]];
    const origCubo = { op: 'cubo', id: 1 };
    for (const [vista, sentido] of [['x', '+'], ['x', '-'], ['z', '+'], ['z', '-']]) {
      const reb = rebaixoPorContorno({
        corpo: { origem: origCubo },
        vista,
        sentido,
        profundidade: 12,
        contorno: [[-80, -80], [80, -80], [80, 80], [-80, 80]],
        ids: IDS,
      });
      const r = nucleo([...cuboBase, ...reb.passos], {});
      expect(r.orfaos, `${vista}${sentido}`).toEqual([]);
      expect(analisarTopologia(r).resumo.reprovas, `${vista}${sentido}`).toBe(0);
      const h = alturaNaVista(r, vista, sentido, 0, 0);
      const esperado = sentido === '+' ? 0.2 - 0.012 : -0.2 + 0.012;
      expect(Math.abs(h - esperado)).toBeLessThan(0.0005);
    }
  });

  it('com raio em corpo plano, arredondarCostura arredonda a costura sem órfãos', () => {
    const cuboBase = [['cubo', { origemId: 1, larg: 0.4, alt: 0.06, prof: 0.4, em: [0.2, -0.03, 0.2] }]];
    const reb = rebaixoPorContorno({
      corpo: { origem: { op: 'cubo', id: 1 } },
      vista: 'y',
      profundidade: 12,
      contorno: [[140, 140], [260, 140], [260, 260], [140, 260]],
      raio: 2,
      arestas: 'internas',
      paineis: 4,
      tolerancia: 0,
      ids: { ...IDS, arredondar: 6 },
    });
    const r = nucleo([...cuboBase, ...reb.passos], {});
    expect(r.orfaos).toEqual([]);
    expect(analisarTopologia(r).resumo.reprovas).toBe(0);
    expect(r.F.size).toBeGreaterThan(20);
  });
});

describe('rebaixoPorContorno: recusas de entrada', () => {
  const base = { corpo: CORPO, vista: 'y', profundidade: 10, contorno: [[0, 0], [100, 0], [100, 100]], ids: IDS };
  const tenta = (sobre) => () => rebaixoPorContorno({ ...base, ...sobre });

  it('recusa argumentos inválidos antes de emitir passos', () => {
    expect(tenta({ corpo: null })).toThrow(/corpo precisa ser uma seleção por origem/);
    expect(tenta({ vista: 'w' })).toThrow(/vista precisa ser/);
    expect(tenta({ sentido: '0' })).toThrow(/sentido precisa ser/);
    expect(tenta({ profundidade: -5 })).toThrow(/profundidade precisa ser/);
    expect(tenta({ contorno: undefined })).toThrow(/declare contorno/);
    expect(tenta({ linha: [[0, 0], [100, 0]], largura: 10 })).toThrow(/declare contorno OU linha/);
    expect(tenta({ contorno: undefined, linha: [[0, 0], [100, 0]] })).toThrow(/sulco por linha exige largura/);
    expect(tenta({ largura: 0 })).toThrow(/largura precisa ser/);
    expect(tenta({ comprimento: 0 })).toThrow(/comprimento precisa ser/);
    expect(tenta({ raio: -1, ids: { ...IDS, arredondar: 6 } })).toThrow(/raio precisa ser/);
    expect(tenta({ raio: 2 })).toThrow(/ids precisa trazer inteiros para.*arredondar/);
    expect(tenta({ ids: { copia: 2, prisma: 2, ferramenta: 4, subtrair: 5 } })).toThrow(/ids não podem se repetir/);
    /* regressões da revisão adversarial: pontos duplicados, colinear, auto-intersecção e dobra aguda de sulco */
    expect(tenta({ contorno: [[0, 0], [100, 0], [100, 0], [100, 100]] })).toThrow(/coincidentes/);
    expect(tenta({ contorno: [[0, 0], [100, 0], [100, 100], [0, 0]] })).toThrow(/coincidentes/);
    expect(tenta({ contorno: [[0, 0], [50, 0], [100, 0]] })).toThrow(/degenerado/);
    expect(tenta({ contorno: [[0, 0], [100, 100], [100, 0], [0, 100]] })).toThrow(/auto-intersecção/);
    expect(tenta({ contorno: undefined, linha: [[-100, 0], [0, 0], [-98.5, 17.4]], largura: 20 })).toThrow(/sulco se cruza/);
  });
});
