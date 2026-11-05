/* subdivisao-grupos.test.ts — os grupos de faces da gaiola do passo `subdivisao` (campo `grupos`): cada grupo é uma lista de nomes de ponto,
   as faces dele são as da gaiola com todos os pontos na lista, e a superfície refinada cita o grupo na origem (`parte`), de modo que
   `parte` recorta a peça pela gaiola e não por caixa. Confere a descendência das faces em dois níveis, a seleção de `parte` e as recusas. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { gruposPorNome } from './operacoes/subdivisao.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';

const nomes = ['g00', 'g01', 'g02', 'g10', 'g11', 'g12', 'g20', 'g21', 'g22'];
const pontos = Object.fromEntries(nomes.map((n) => [n, [Number(n[1]) * 0.1, 0, Number(n[2]) * 0.1]]));
const faces = [['g00', 'g01', 'g11', 'g10'], ['g01', 'g02', 'g12', 'g11'], ['g10', 'g11', 'g21', 'g20'], ['g11', 'g12', 'g22', 'g21']];
const passo = (extra: Record<string, unknown> = {}) => ({ origemId: 1, vertices: nomes, faces, niveis: 2, ...extra });
const gruposDe = [{ nome: 'canto', pontos: ['g00', 'g01', 'g10', 'g11'] }, { nome: 'lado', pontos: ['g01', 'g02', 'g11', 'g12', 'g21', 'g22', 'g11'] }];
const orfaos = (st: any) => st.orfaos.map((o: any) => o.motivo);

describe('subdivisao: grupos de faces da gaiola', () => {
  it('as faces de um grupo são as da gaiola com todos os pontos nele, e descendem delas em dois níveis', () => {
    const lidos = gruposPorNome(gruposDe, nomes, faces.map((f) => f.map((n) => nomes.indexOf(n))));
    expect(lidos.grupos).toEqual([['canto', [0]], ['lado', [1, 3]]]);
    const st = nucleo([['subdivisao', passo({ grupos: gruposDe })], ['parte', { nome: 'canto', sel: { origem: { op: 'subdivisao', id: 1, parte: 'canto' } } }]], {}, pontos);
    expect(orfaos(st)).toEqual([]);
    const doCanto = [...st.F.values()].filter((f: any) => f.parte === 'canto');
    /* 4 faces da gaiola, 16 por face em dois níveis; o grupo é a primeira, no canto de x e z menores */
    expect(st.F.size).toBe(64);
    expect(doCanto).toHaveLength(16);
    for (const f of doCanto) {
      const c = f.vs.map((v: any) => st.V.get(v)).reduce((s: number[], p: number[]) => s.map((x, i) => x + p[i] / f.vs.length), [0, 0, 0]);
      expect(c[0]).toBeLessThan(0.1 + 1e-9); expect(c[2]).toBeLessThan(0.1 + 1e-9);
    }
  });

  it('o grupo se cita pelo nome mesmo com os vértices da gaiola em outra ordem, e as partes cobrem a superfície', () => {
    const invertida = { ...passo({ grupos: gruposDe }), vertices: [...nomes].reverse(), faces: [...faces].reverse() };
    const st = nucleo([
      ['subdivisao', invertida],
      ['parte', { nome: 'canto', sel: { origem: { op: 'subdivisao', id: 1, parte: 'canto' } } }],
      ['parte', { nome: 'lado', sel: { origem: { op: 'subdivisao', id: 1, parte: 'lado' } } }],
    ], {}, pontos);
    expect(orfaos(st)).toEqual([]);
    const por = (p: string) => [...st.F.values()].filter((f: any) => f.parte === p).length;
    expect([por('canto'), por('lado')]).toEqual([16, 32]);
  });

  it('recusa grupo com ponto que não é da gaiola, sem face, repetido, com nome de parte de chapa ou com espessura, e parte desconhecida', () => {
    const recusa = (extra: Record<string, unknown>) => orfaos(nucleo([['subdivisao', passo(extra)]], {}, pontos)).join(' | ');
    expect(recusa({ grupos: [{ nome: 'a', pontos: ['g00', 'zz'] }] })).toMatch(/o grupo 'a' cita o ponto 'zz', que não é ponto nomeado da gaiola/);
    expect(recusa({ grupos: [{ nome: 'a', pontos: ['g00', 'g22'] }] })).toMatch(/o grupo 'a' não tem nenhuma face da gaiola com todos os pontos dentro dele/);
    expect(recusa({ grupos: [{ nome: 'a', pontos: ['g00', 'g01', 'g10', 'g11'] }, { nome: 'a', pontos: ['g00', 'g01', 'g10', 'g11'] }] })).toMatch(/o nome de grupo 'a' aparece mais de uma vez/);
    expect(recusa({ grupos: [{ nome: 'borda', pontos: ['g00', 'g01', 'g10', 'g11'] }] })).toMatch(/o grupo 'borda' tem o nome de uma parte da chapa com espessura/);
    expect(recusa({ grupos: gruposDe, espessura: 0.002 })).toMatch(/grupos só vale sem espessura/);
    expect(recusa({ grupos: gruposDe, simetria: 'x' })).toMatch(/grupos não vale com simetria/);
    expect(recusa({ grupos: [{ nome: 'a', pontos: ['g00', 'g01', 'g10', 'g11'], faces: [0] }] })).toMatch(/campo desconhecido 'faces'/);
    const st = nucleo([['subdivisao', passo({ grupos: gruposDe })], ['parte', { nome: 'x', sel: { origem: { op: 'subdivisao', id: 1, parte: 'outro' } } }]], {}, pontos);
    expect(orfaos(st).join(' | ')).toMatch(/parte opcional \('externa', 'interna' ou 'borda', só com espessura\) ou o nome de um grupo declarado em grupos do passo \('canto', 'lado'\)/);
  });
});
