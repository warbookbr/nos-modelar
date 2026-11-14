/* subdivisao-limite.test.ts — a recusa do passo `subdivisao` que gera mais vértices ou faces que o limite do passo. Precisa de uma
   gaiola de 576 quadros no nível 5 com espessura (1,18 milhão de vértices), 11 s sozinho, e por isso está em TESTES_LENTOS. */
import { expect, it } from 'vitest';
import { nucleo } from '../entrada.js';

it('subdivisao: acima do limite do passo recusa citando niveis', () => {
  const N = 24; const vertices: string[] = []; const pontos: Record<string, number[]> = {}; const faces: string[][] = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { const n = `p${i}_${j}`; vertices.push(n); pontos[n] = [i, j, 0]; }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) faces.push([`p${i}_${j}`, `p${i + 1}_${j}`, `p${i + 1}_${j + 1}`, `p${i}_${j + 1}`]);
  const st = nucleo([['subdivisao', { origemId: 1, vertices, faces, niveis: 5, espessura: 0.01 }]] as never, {}, pontos);
  expect(st.orfaos).toHaveLength(1);
  expect(st.orfaos[0]).toMatchObject({ passo: 0, op: 'subdivisao', ref: 'niveis' });
  expect(st.orfaos[0].motivo).toMatch(/acima do limite do passo \(1049576\)/);
});
