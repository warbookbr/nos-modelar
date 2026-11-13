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

  it('recusa estação perto demais, sulco que come a seção e sulco fora do corpo, com o valor', () => {
    expect(() => haste({ estacoes: [{ em: 0, centro: [0, 0], semieixos: [5, 5] }, { em: 1, centro: [0, 0], semieixos: [5, 5] }] })).toThrow(/mínimo entre planos/);
    expect(() => haste({ sulcos: [{ em: 30, largura: 8, profundidade: 20 }] })).toThrow(/não sobra/);
    expect(() => haste({ sulcos: [{ em: 300, largura: 8, profundidade: 1 }] })).toThrow(/fora do corpo/);
    expect(() => haste({ passo: 1 })).toThrow(/passo é número em mm/);
    expect(() => haste({ estacoes: [{ em: 0, centro: [0, 0], semieixos: [5, 5] }] })).toThrow(/ao menos duas/);
  });
});
