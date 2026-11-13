/* corpo-de-secao-variavel.test.mjs — o corpo de seção variável com sulcos, medido pelas réguas de malha (face degenerada e face fina) e pelas seções dos planos. */
import { describe, expect, it } from 'vitest';
import { corpoDeSecaoVariavel } from './corpo-de-secao-variavel.js';
import { medirPeca } from '../../tools/fixtures/costuras-e-furos/medir.mjs';
import { lascasDoNeutro } from '../../tools/modelar/lasca.mjs';

const haste = (extra = {}) => corpoDeSecaoVariavel({
  nome: 'h', eixo: 'x', passo: 5, expoente: 2.4,
  estacoes: [{ em: 0, centro: [0, 0], semieixos: [10, 14] }, { em: 60, centro: [0, 4], semieixos: [12, 16] }, { em: 100, centro: [0, 6], semieixos: [8, 10] }],
  sulcos: [{ em: 30, largura: 8, profundidade: 3 }, { em: 75, largura: 10, profundidade: 2, perfil: 'fundoPlano' }],
  ...extra,
});
const receitaDe = (g, niveis = 1) => ({
  PASSOS: [['subdivisao', { origemId: 1, ...g.passo, niveis }], ['parte', { nome: 'corpo', sel: { origem: { op: 'subdivisao', id: 1 } } }]],
  PARAMS: {}, TOPO: { ...g.pontos }, MATERIAIS: {}, ALIASES: [],
});
/* a seção de um plano: pontos do laço de índice dado, em mm, no eixo x */
const secaoEm = (g, x) => {
  const r = g.lacos.findIndex((l) => Math.abs(l.em - x) < 1e-6);
  const nomes = Object.keys(g.pontosMm).filter((n) => n.startsWith(`h_l${r}_`));
  return nomes.map((n) => g.pontosMm[n]);
};
const largura = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));

describe('corpoDeSecaoVariavel', () => {
  const g = haste();
  const m = medirPeca(receitaDe(g));

  it('a malha fecha, sem órfão, aresta solta, face degenerada nem face fina, e o corpo vai de uma tampa à outra', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.facesDegeneradas).toBe(0);
    expect(lascasDoNeutro(m.neutro)).toEqual([]);
    expect(g.corpo.planos[0]).toBe(0);
    expect(g.corpo.planos.at(-1)).toBe(100);
  });

  it('a seção na estação tem os semieixos e o centro declarados', () => {
    const s = secaoEm(g, 60);
    expect(largura(s, 1)).toBeCloseTo(24, 4);
    expect(largura(s, 2)).toBeCloseTo(32, 4);
    expect((Math.max(...s.map((p) => p[2])) + Math.min(...s.map((p) => p[2]))) / 2).toBeCloseTo(4, 4);
  });

  it('o sulco arredondado recua os dois semieixos de sua profundidade no centro, e o de fundo plano recua em toda a metade central', () => {
    const livre = haste({ sulcos: [] });
    const semSulco = secaoEm(livre, 30);
    expect(largura(semSulco, 1) - largura(secaoEm(g, 30), 1)).toBeCloseTo(6, 4);
    expect(largura(semSulco, 2) - largura(secaoEm(g, 30), 2)).toBeCloseTo(6, 4);
    const planos = g.corpo.planos.filter((x) => Math.abs(x - 75) < 2.5);
    expect(planos).toContain(75);
    const dentro = planos.filter((x) => Math.abs(x - 75) < 2.5 - 1e-9);
    for (const x of dentro) expect(largura(secaoEm(livre, x), 1) - largura(secaoEm(g, x), 1)).toBeCloseTo(4, 3);
  });

  it('o perfil de fundo plano recua a profundidade inteira a meia largura do centro e o arredondado só a metade', () => {
    const doisPerfis = (perfil) => corpoDeSecaoVariavel({ nome: 'h', eixo: 'x', passo: 2.5, estacoes: [{ em: 0, centro: [0, 0], semieixos: [10, 10] }, { em: 100, centro: [0, 0], semieixos: [10, 10] }], sulcos: [{ em: 50, largura: 10, profundidade: 4, perfil }] });
    const plano = doisPerfis('fundoPlano'); const redondo = doisPerfis('arredondado');
    expect(plano.corpo.planos).toContain(52.5);
    expect(largura(secaoEm(plano, 52.5), 1)).toBeCloseTo(2 * (10 - 4), 3);
    expect(largura(secaoEm(redondo, 52.5), 1)).toBeCloseTo(2 * (10 - 2), 3);
  });

  it('o centro do sulco e os planos de cada lado dele entram mesmo fora da grade das estações', () => {
    const r = corpoDeSecaoVariavel({ nome: 'h', eixo: 'x', passo: 2.5, estacoes: [{ em: 0, centro: [0, 0], semieixos: [10, 10] }, { em: 100, centro: [0, 0], semieixos: [10, 10] }], sulcos: [{ em: 51.3, largura: 10, profundidade: 4 }] });
    expect(r.corpo.planos).toContain(51.3);
    expect(r.corpo.planos).toContain(48.8);
    expect(r.corpo.planos).toContain(53.8);
    expect(r.corpo.planos).not.toContain(50);
  });

  it('a interpolação suave não passa dos valores das estações e difere da linear no meio do vão', () => {
    const livre = haste({ sulcos: [], passo: 2.5 });
    for (const x of livre.corpo.planos.filter((q) => q > 0 && q < 60)) {
      const b = largura(secaoEm(livre, x), 2) / 2;
      expect(b).toBeGreaterThanOrEqual(14 - 1e-9);
      expect(b).toBeLessThanOrEqual(16 + 1e-9);
    }
    const suave = largura(secaoEm(haste({ sulcos: [] }), 30), 2) / 2;
    expect(Math.abs(suave - 15)).toBeGreaterThan(0.05);
  });

  it('a seção tem o expoente da superelipse: o ponto a 45 graus fica em a vezes 0,5 elevado a 1/expoente', () => {
    const r = corpoDeSecaoVariavel({ nome: 'h', eixo: 'x', expoente: 4, estacoes: [{ em: 0, centro: [0, 0], semieixos: [10, 10] }, { em: 20, centro: [0, 0], semieixos: [10, 10] }] });
    const p = r.pontosMm.h_l0_a2;
    expect(p[1]).toBeCloseTo(10 * Math.SQRT1_2 ** (2 / 4), 6);
    expect(p[2]).toBeCloseTo(10 * Math.SQRT1_2 ** (2 / 4), 6);
  });

  it('os planos entram no centro do sulco e a mais de 2,5 mm um do outro', () => {
    expect(g.corpo.planos).toContain(30);
    for (let i = 1; i < g.corpo.planos.length; i++) expect(g.corpo.planos[i] - g.corpo.planos[i - 1]).toBeGreaterThanOrEqual(2.5 - 1e-6);
  });

  it('é determinístico e a interpolação linear passa reto entre as estações', () => {
    expect(JSON.stringify(haste().pontos)).toBe(JSON.stringify(g.pontos));
    const l = haste({ sulcos: [], interpolacao: 'linear' });
    expect(largura(secaoEm(l, 30), 2)).toBeCloseTo(2 * (14 + (16 - 14) * 0.5), 4);
  });

  it('o corpo com os eixos y e z também fecha', () => {
    for (const eixo of ['y', 'z']) {
      const r = medirPeca(receitaDe(corpoDeSecaoVariavel({ nome: 'h', eixo, estacoes: [{ em: 0, centro: [0, 0], semieixos: [5, 5] }, { em: 20, centro: [0, 1], semieixos: [6, 4] }] }), 0));
      expect(r.arestasSoltas, eixo).toBe(0);
      expect(r.facesDegeneradas, eixo).toBe(0);
    }
  });

  it('recusa o sulco cujo centro cai a menos de 2,5 mm de uma estação ou de outro sulco, com a distância', () => {
    expect(() => haste({ sulcos: [{ em: 61, largura: 8, profundidade: 3 }] })).toThrow(/cai a 1 mm da estação estacoes\[1\] \(em 60\)/);
    expect(() => haste({ sulcos: [{ em: 30, largura: 8, profundidade: 3 }, { em: 32, largura: 8, profundidade: 3 }] })).toThrow(/cai a 2 mm do sulco sulcos\[0\]/);
    const preso = haste({ sulcos: [{ em: 60, largura: 8, profundidade: 3 }] });
    expect(largura(secaoEm(haste({ sulcos: [] }), 60), 1) - largura(secaoEm(preso, 60), 1)).toBeCloseTo(6, 4);
  });

  it('recusa estação perto demais, sulco que come a seção e sulco fora do corpo, com o valor', () => {
    expect(() => haste({ estacoes: [{ em: 0, centro: [0, 0], semieixos: [5, 5] }, { em: 1, centro: [0, 0], semieixos: [5, 5] }] })).toThrow(/mínimo entre planos/);
    expect(() => haste({ sulcos: [{ em: 30, largura: 8, profundidade: 20 }] })).toThrow(/não sobra/);
    expect(() => haste({ sulcos: [{ em: 300, largura: 8, profundidade: 1 }] })).toThrow(/fora do corpo/);
    expect(() => haste({ passo: 1 })).toThrow(/passo é número em mm/);
    expect(() => haste({ estacoes: [{ em: 0, centro: [0, 0], semieixos: [5, 5] }] })).toThrow(/ao menos duas/);
    expect(() => haste({ expoente: 0.5 })).toThrow(/de 1 para cima/);
    expect(() => haste({ estacoes: [{ em: 0, centro: [0, 0], semieixos: [5, 5], expoente: 0.2 }, { em: 20, centro: [0, 0], semieixos: [5, 5] }] })).toThrow(/expoente é número de 1/);
  });
});
