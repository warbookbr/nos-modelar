/* Peça de prova das faces sem área que a exportação do braço pulou (fatia 3 do plano "costuras e furos limpos"): mede 0 agulhas e 0 faces abaixo do piso da auditoria de interseções (1e-9 vezes o quadrado da meia diagonal da peça, 1,2e-10 m² aqui); o defeito media 1 e 40 faces de menos de 1e-9 m². Restam 30 triângulos de 8,6e-10 a 9,7e-10 m², sem a forma de agulha, acima do piso de lasca do núcleo e da auditoria; o corte absoluto de 1e-9 m² cai no meio deles e não é um critério da peça. */
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
  it('o arredondarCostura não deixa agulha (430 mm por 0,015 mm) nem face abaixo do piso da auditoria na faceta do tubo', () => {
    const m = medirPeca(receita);
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(agulhas(m.neutro).length).toBe(0);
    const pontos = [...m.neutro.V.values()];
    const diagonal = Math.hypot(...[0, 1, 2].map((k) => Math.max(...pontos.map((p) => p[k])) - Math.min(...pontos.map((p) => p[k]))));
    const piso = 1e-9 * (diagonal / 2) ** 2;
    const areas = [...m.neutro.F.values()].map((f) => normalDeNewell(f.vs.map((v) => m.neutro.V.get(v))) / 2);
    expect(areas.filter((a) => a < piso).length).toBe(0);
    expect(areas.filter((a) => a < 1e-9).length).toBe(30);
  });
});
