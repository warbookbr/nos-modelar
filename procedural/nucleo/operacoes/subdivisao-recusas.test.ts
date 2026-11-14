/* subdivisao-recusas.test.ts — cada recusa de entrada do passo `subdivisao` com a entrada ruim e o campo que a recusa cita.
   A revisão das verificações (2026-11-13) tirou 7 dessas recusas, uma a uma, sem que nenhum teste reprovasse. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../entrada.js';

const CAIXA = {
  vertices: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].map((f) => f.map((k) => 'abcdefgh'[k])),
};
const PONTOS = Object.fromEntries([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]].map((q, k) => ['abcdefgh'[k], q]));
const passo = (extra: Record<string, unknown> = {}) => ['subdivisao', { origemId: 1, ...CAIXA, niveis: 0, ...extra }];
const roda = (extra: Record<string, unknown> = {}) => nucleo([passo(extra)] as never, {}, PONTOS);
const recusa = (extra: Record<string, unknown>) => {
  const st = roda(extra);
  expect(st.orfaos).toHaveLength(1);
  expect(st.orfaos[0]).toMatchObject({ passo: 0, op: 'subdivisao' });
  return st.orfaos[0];
};

describe('subdivisao: a entrada válida de base não recusa', () => {
  it('a caixa de partida monta sem órfão e publica a origem sem espessura', () => {
    const st = roda();
    expect(st.orfaos).toEqual([]);
    expect(st.origens.get(1)).toHaveLength(1);
    expect(st.origens.get(1)[0]).toMatchObject({ op: 'subdivisao', espessura: false });
    expect(st.origens.get(1)[0].faces).toHaveLength(6);
  });
});

describe('subdivisao: recusas de entrada', () => {
  it('origemId: inteiro não-negativo, e 0 vale', () => {
    for (const ruim of [-1, 1.5, '1', NaN]) expect(recusa({ origemId: ruim }).ref).toBe('origemId');
    expect(roda({ origemId: 0 }).orfaos).toEqual([]);
  });

  it('compartilha: lista de nomes, e cada nome precisa ser vértice do passo', () => {
    expect(recusa({ compartilha: 'a' }).ref).toBe('compartilha');
    expect(recusa({ compartilha: [1] }).ref).toBe('compartilha');
    const r = recusa({ compartilha: ['zz'] });
    expect(r.ref).toBe('compartilha');
    expect(r.motivo).toMatch(/'zz'/);
    expect(roda({ compartilha: ['a'] }).orfaos).toEqual([]);
  });

  it('espessura: maior que zero e finita', () => {
    /* o texto exato é o do passo; sem a recusa dele, a validação da espessura em espessura.js recusa o mesmo valor com outro texto */
    for (const ruim of [0, -0.1]) {
      const r = recusa({ espessura: ruim });
      expect(r.ref).toBe('espessura');
      expect(r.motivo).toBe(`a espessura precisa ser maior que zero, e veio ${ruim}`);
    }
    expect(roda({ espessura: 0.01 }).orfaos).toEqual([]);
  });

  it('lado: só contraNormal ou normal, e só com espessura', () => {
    const r = recusa({ espessura: 0.01, lado: 'fora' });
    expect(r.ref).toBe('lado');
    expect(r.motivo).toMatch(/contraNormal/);
    expect(roda({ espessura: 0.01, lado: 'normal' }).orfaos).toEqual([]);
    expect(roda({ espessura: 0.01, lado: 'contraNormal' }).orfaos).toEqual([]);
    expect(recusa({ lado: 'normal' }).motivo).toMatch(/só vale com espessura/);
  });

  it('a espessura que passa da gaiola vira recusa citando espessura, e o contrato diz que há espessura quando ela cabe', () => {
    expect(recusa({ espessura: 5 }).ref).toBe('espessura');
    const st = roda({ espessura: 0.01 });
    expect(st.origens.get(1)[0].espessura).toBe(true);
    expect(st.origens.get(1)[0]).toHaveProperty('externa');
  });

  it('grupos: não vale com espessura nem com simetria, e o nome de grupo vem da gaiola', () => {
    expect(recusa({ grupos: { g: ['a'] }, espessura: 0.01 }).motivo).toMatch(/só vale sem espessura/);
    expect(recusa({ grupos: { g: ['a'] }, simetria: 'x' }).ref).toBe('grupos');
    expect(recusa({ grupos: { g: 3 } }).ref).toBe('grupos');
  });

  it('liso: ângulo de 0 a 180 ou false', () => {
    for (const ruim of [-1, 181]) expect(recusa({ liso: ruim }).ref).toBe('liso');
    expect(roda({ liso: false }).orfaos).toEqual([]);
    expect(roda({ liso: 30 }).orfaos).toEqual([]);
  });

  it('quebraNosVincos: vivos, todos ou nenhum, e só com as faces lisas', () => {
    expect(recusa({ quebraNosVincos: 'alguns' }).ref).toBe('quebraNosVincos');
    expect(recusa({ liso: false, quebraNosVincos: 'todos' }).motivo).toMatch(/só vale com as faces lisas/);
    for (const q of ['vivos', 'todos', 'nenhum']) expect(roda({ quebraNosVincos: q }).orfaos).toEqual([]);
  });

  it('gaiola: a subdivisão que lança vira recusa citando gaiola', () => {
    const r = recusa({ niveis: 7 });
    expect(r.ref).toBe('gaiola');
    expect(r.motivo).toMatch(/niveis precisa ser inteiro de 0 a 6/);
  });
});
