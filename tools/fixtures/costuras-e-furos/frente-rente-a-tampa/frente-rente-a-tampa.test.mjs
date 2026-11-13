/* A fatia 3 do plano "costuras e furos limpos" inverteu o defeito: o canto do aro de um tubo e o polo da tampa do outro coincidem, a face mantida passa ao canto representante e a união fecha. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { gerarPassos } from '../tubos-em-t.js';

describe('frente de um tubo rente à tampa de outro, no unir', () => {
  it('com a frente rente (avanço 0) a união fecha, sem aresta solta, órfão nem aviso', () => {
    const m = medirPeca(receita);
    expect(m.orfaos).toEqual([]);
    expect(m.avisos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.faces).toBe(1750);
  });

  it('com 0,05 mm de avanço, como o braço superior, a mesma união fecha sem aresta solta', () => {
    const m = medirPeca({ PASSOS: gerarPassos({ ...receita.PARAMS, avanco: 0.05 }), PARAMS: {} });
    expect(m.arestasSoltas).toBe(0);
    expect(m.faces).toBe(1750);
  });
});
