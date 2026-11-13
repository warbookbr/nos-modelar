/* chapa-de-contorno.test.mjs — a chapa de contorno em cunha, medida pelas réguas de malha (face degenerada e face fina), com a ponta fechada, o chanfro, a quina e o raio de canto. */
import { describe, expect, it } from 'vitest';
import { chapaDeContorno } from './chapa-de-contorno.js';
import { medirPeca } from '../../tools/fixtures/costuras-e-furos/medir.mjs';
import { lascasDoNeutro } from '../../tools/modelar/lasca.mjs';

/* uma chapa em cunha: base reta, gume chanfrado até o fio e dorso de quina quebrada, que se encontram numa ponta */
const cunha = (extra = {}) => chapaDeContorno({
  nome: 'c', eixo: 'y', em: 10, espessura: 6, passo: 10, tampa: { de: 'base', ate: 'ponta' },
  trechos: [
    { nome: 'base', pontos: [[0, 40], [0, 0]], pontosNoTrecho: 3 },
    { nome: 'gume', pontos: [[0, 0], [100, 0]], grupo: 'fio', chanfro: { largura: 12, limite: { fracao: 0.4, contra: ['dorso'] } } },
    { nome: 'ponta', pontos: [[100, 0]] },
    { nome: 'dorso', pontos: [[100, 0], [60, 24], [0, 40]], quinaQuebrada: { largura: 1, altura: 1, limite: { fracao: 0.1, contra: ['gume'] } } },
  ],
  raioDoCanto: [{ em: [60, 24], raio: 30 }],
  ...extra,
});
const receitaDe = (g, niveis = 0) => ({
  PASSOS: [['subdivisao', { origemId: 1, ...g.passo, niveis }], ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]],
  PARAMS: {}, TOPO: { ...g.pontos }, MATERIAIS: {}, ALIASES: [],
});

describe('chapaDeContorno', () => {
  const g = cunha();
  const m = medirPeca(receitaDe(g));

  it('os laços ficam nas alturas das bordas: faces, quina quebrada e o fio no meio', () => {
    expect(g.chapa.niveis).toEqual([-3, -2, 0, 2, 3]);
  });

  it('a malha fecha, sem órfão, sem aresta solta, sem face degenerada e sem face fina', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.facesDegeneradas).toBe(0);
    expect(lascasDoNeutro(m.neutro)).toEqual([]);
  });

  it('a ponta em que o gume chanfrado e o dorso se encontram fecha num ponto, no fio', () => {
    const ponta = Object.entries(g.pontosMm).filter(([, p]) => Math.hypot(p[0] - 100, p[2]) < 1e-6);
    /* em cada laço a ponta é um ponto só (os trechos gume e dorso acabam e começam nele) */
    expect(ponta.length).toBeGreaterThanOrEqual(5);
    const ys = ponta.map(([, p]) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(7, 6);
    expect(Math.max(...ys)).toBeCloseTo(13, 6);
  });

  it('o chanfro recua o gume nas faces e o deixa afiado: a face de cima no recuo e o fio no meio', () => {
    const z = (laco, k) => g.pontosMm[`c_l${laco}_gume${k}`][2];
    expect(z(2, 3)).toBeCloseTo(0, 6);
    expect(z(4, 3)).toBeGreaterThan(5);
    expect(z(4, 3)).toBeCloseTo(z(0, 3), 6);
  });

  it('o canto de raio troca o vértice do dorso por um arco e é determinístico', () => {
    const sem = cunha({ raioDoCanto: [] });
    expect(Object.keys(g.pontos).length).toBe(Object.keys(sem.pontos).length);
    expect(JSON.stringify(cunha().pontos)).toBe(JSON.stringify(g.pontos));
    const z = (r, k) => r.pontosMm[`c_l2_dorso${k}`];
    const desvio = Math.max(...[1, 2, 3, 4, 5, 6].map((k) => Math.hypot(z(g, k)[0] - z(sem, k)[0], z(g, k)[2] - z(sem, k)[2])));
    expect(desvio).toBeGreaterThan(0.05);
  });

  it('o grupo do trecho vira grupo de faces do passo', () => {
    expect(g.passo.grupos.map((x) => x.nome)).toEqual(['fio']);
  });

  it('a espessura afina ao longo de u: na ponta fica com a espessura final', () => {
    const f = cunha({ afinar: { coordenada: 'u', de: 50, ate: 100, espessuraFinal: 1 } });
    const ys = Object.entries(f.pontosMm).filter(([, p]) => Math.abs(p[0] - 100) < 1e-6).map(([, p]) => p[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1, 6);
    const r = medirPeca(receitaDe(f));
    expect(r.facesDegeneradas).toBe(0);
    expect(lascasDoNeutro(r.neutro)).toEqual([]);
  });

  it('com subdivisão a chapa continua fechada', () => {
    const r = medirPeca(receitaDe(g, 1));
    expect(r.arestasSoltas).toBe(0);
    expect(r.facesDegeneradas).toBe(0);
  });

  it('recusa o que não fecha ou não cabe, dizendo o valor e o limite', () => {
    expect(() => cunha({ espessura: 0 })).toThrow(/espessura é número positivo/);
    expect(() => cunha({ raioDoCanto: [{ em: [60, 24], raio: 500 }] })).toThrow(/o raio que cabe é/);
    expect(() => cunha({ raioDoCanto: [{ em: [1, 1], raio: 5 }] })).toThrow(/não é vértice de trecho nenhum/);
    expect(() => cunha({ raioDoCanto: [{ em: [100, 0], raio: 5 }] })).toThrow(/dentro de um trecho/);
    expect(() => cunha({ tampa: { de: 'base', ate: 'nao' } })).toThrow(/tampa/);
    expect(() => chapaDeContorno({ nome: 'a', espessura: 4, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 10]] }, { nome: 'b', pontos: [[5, 10], [10, 10]] }, { nome: 'c', pontos: [[10, 10], [0, 0]] }] })).toThrow(/contorno tem de ser fechado/);
  });

  it('recusa o chanfro mais largo que a chapa, com o laço', () => {
    const largo = () => chapaDeContorno({
      nome: 'f', espessura: 4, passo: 5, tampa: { de: 'a', ate: 'c' },
      trechos: [{ nome: 'a', pontos: [[0, 0], [0, 6]] }, { nome: 'b', pontos: [[0, 6], [30, 6]], chanfro: { largura: 20 } }, { nome: 'c', pontos: [[30, 6], [30, 0]] }, { nome: 'd', pontos: [[30, 0], [0, 0]] }],
    });
    expect(largo).toThrow(/laço a/);
  });
});
