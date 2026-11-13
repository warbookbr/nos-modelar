/* Fixa o defeito de hoje (fatia 3 do plano "costuras e furos limpos"): origem das faces sem área que a exportação do braço pulou. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { normalDeNewell } from '../../../modelar/reguas-de-malha/face-degenerada.mjs';

const agulhas = (neutro) => [...neutro.F.values()].filter((f) => {
  const p = f.vs.map((v) => neutro.V.get(v));
  if (normalDeNewell(p) / 2 >= 1e-9) return false;
  return Math.max(...p.map((q, i) => Math.hypot(...q.map((x, k) => x - p[(i + 1) % p.length][k])))) > 0.05;
});

describe('agulha na faceta do tubo', () => {
  it('DEFEITO: o arredondarCostura deixa uma face de três cantos com 430 mm por 0,015 mm (área de 1e-10 m²), e 40 faces de menos de 1e-9 m²', () => {
    const m = medirPeca(receita);
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(agulhas(m.neutro).length).toBe(1);
    const pequenas = [...m.neutro.F.values()].filter((f) => normalDeNewell(f.vs.map((v) => m.neutro.V.get(v))) / 2 < 1e-9);
    expect(pequenas.length).toBe(40);
  });
});
