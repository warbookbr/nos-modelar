/* parte-com-material.test.mjs — `parte` aceita `material` no mesmo passo, e a peça sai bit a bit igual à dos dois passos. */
import { describe, expect, it } from 'vitest';
import { neutroCanonico, nucleo } from '../entrada.js';

const MATERIAIS = { aco: { cor: '#888888' }, borracha: { cor: '#111111' } };
const texto = (passos) => {
  const neutro = nucleo(passos, {}, {}, MATERIAIS);
  return JSON.stringify({ canonico: neutroCanonico(neutro), V: [...neutro.V], F: [...neutro.F], partes: neutro.partes, orfaos: neutro.orfaos });
};

const base = [
  ['cubo', { origemId: 1, larg: 2, alt: 1, prof: 1 }],
  ['cilindro', { origemId: 2, raio: 0.3, altura: 1, lados: 8, em: [3, 0, 0] }],
];
const sel1 = { origem: { op: 'cubo', id: 1 } };
const sel2 = { origem: { op: 'cilindro', id: 2 } };

describe('parte com material no mesmo passo', () => {
  it('dá o mesmo neutro, bit a bit, que parte e material em dois passos', () => {
    const junto = texto([...base, ['parte', { sel: sel1, nome: 'caixa', material: 'aco' }], ['parte', { sel: sel2, nome: 'resto' }]]);
    const separado = texto([...base, ['parte', { sel: sel1, nome: 'caixa' }], ['material', { sel: sel1, usa: 'aco' }], ['parte', { sel: sel2, nome: 'resto' }]]);
    expect(junto).toBe(separado);
    expect(JSON.parse(junto).orfaos).toEqual([]);
    expect(JSON.parse(junto).V.length).toBeGreaterThan(8);
  });

  it('vale com pai e pivô, e com duas partes de materiais diferentes', () => {
    const passos = (junto) => [
      ...base,
      ...(junto
        ? [['parte', { sel: sel1, nome: 'caixa', material: 'aco', pivo: [0, 0, 0] }], ['parte', { faces: [1], nome: 'tampa', pai: 'caixa', material: 'borracha', substituir: true }]]
        : [['parte', { sel: sel1, nome: 'caixa', pivo: [0, 0, 0] }], ['material', { sel: sel1, usa: 'aco' }], ['parte', { faces: [1], nome: 'tampa', pai: 'caixa', substituir: true }], ['material', { faces: [1], usa: 'borracha' }]]),
    ];
    expect(texto(passos(true))).toBe(texto(passos(false)));
  });

  it('as faces recebem o material', () => {
    const neutro = nucleo([...base, ['parte', { sel: sel1, nome: 'caixa', material: 'aco' }]], {}, {}, MATERIAIS);
    const faces = [...neutro.F.values()];
    expect(faces.filter((f) => f.material === 'aco').length).toBe(6);
    expect(faces.filter((f) => f.parte === 'caixa').length).toBe(6);
  });

  it('material que não existe é recusado no passo, sem nomear parte nem pintar face', () => {
    const neutro = nucleo([...base, ['parte', { sel: sel1, nome: 'caixa', material: 'ouro' }]], {}, {}, MATERIAIS);
    expect(neutro.orfaos).toHaveLength(1);
    expect(neutro.orfaos[0]).toMatchObject({ passo: 2, op: 'parte', ref: 'material' });
    expect(neutro.orfaos[0].motivo).toContain("material 'ouro' não existe em MATERIAIS");
    expect([...neutro.F.values()].some((f) => f.parte || f.material)).toBe(false);
  });

  it('sem material, o passo é o de sempre', () => {
    const neutro = nucleo([...base, ['parte', { sel: sel1, nome: 'caixa' }]], {}, {}, MATERIAIS);
    expect([...neutro.F.values()].some((f) => f.material)).toBe(false);
  });
});
