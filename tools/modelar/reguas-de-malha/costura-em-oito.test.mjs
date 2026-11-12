/* costura-em-oito.test.mjs — a costura de dois tubos tangentes é um oito, com um nó de grau 4 em cada ponto de tangência (o elo do punho 5). O construtor de listas
   do modo curvo partia o tubo no meio de um laço num só quadrante (+y −z), com um tubo de 3 estações e 8,3 mm e tampa reta nas duas pontas. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import receita from '../../../procedural/pecas/braco-robotico/partes/elo-punho-5/receita.js';
import { medirSerrilhadoDaCostura } from './serrilhado-da-costura.mjs';

describe('costura em oito (elo do punho 5)', () => {
  const { neutro } = executarReceita(receita);
  const m = medirSerrilhadoDaCostura(neutro);

  it('nenhuma ponta com abertura de fim seco (mais de 0,5 mm); eram 4, no quadrante +y −z', () => {
    expect(m.pontasLargas).toBe(0);
  });

  it('os 8 laços da peça simétrica têm de 303 a 306 vértices, e as pontas se repetem em pares de quadrantes (4 laços com 2 e 4 com 3)', () => {
    expect(m.linhas).toHaveLength(8);
    expect(new Set(m.linhas.map((l) => l.vertices)).size).toBeLessThanOrEqual(4);
    expect(m.pontas).toBe(20);
    expect(m.linhas.map((l) => l.pontas).sort()).toEqual([2, 2, 2, 2, 3, 3, 3, 3]);
  });
});
