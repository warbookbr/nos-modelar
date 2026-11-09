/* A fatia 4 do plano "costuras e furos limpos" inverteu o defeito: o `furo` aceita a tampa em leque do `lathe` como região plana de entrada. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { medirTrianguloFino } from '../../../modelar/reguas-de-malha/triangulo-fino.mjs';

describe('furo numa tampa de lathe', () => {
  const m = medirPeca(receita);

  it('o furo abre na tampa em leque (144 faces) lida como uma região, sem órfão, sem aresta solta e sem face degenerada', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.facesDegeneradas).toBe(0);
    expect(m.faces).toBe(613);
  });

  it('o polo do leque some com a face: nenhum vértice fica sem face, e a tampa da frente não deixa triângulo fino', () => {
    const { neutro } = m;
    const usados = new Set();
    for (const f of neutro.F.values()) for (const v of f.vs) usados.add(v);
    expect([...neutro.V.keys()].filter((v) => !usados.has(v))).toEqual([]);
    const { porRegiao } = medirTrianguloFino(neutro);
    // sobra só a tampa de trás do lathe, o leque de 144 triângulos que o furo não toca
    expect(porRegiao).toHaveLength(1);
    expect(porRegiao[0]).toMatchObject({ faces: 144, finos: 144 });
  });
});
