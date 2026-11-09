/* Fixa o defeito de hoje (fatia 1 do plano "costuras e furos limpos"); a fatia 3 inverte os números marcados. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { gerarPassos } from '../tubos-em-t.js';

describe('frente de um tubo rente à tampa de outro, no unir', () => {
  it('DEFEITO: com a frente rente (avanço 0) a união deixa 4 arestas soltas, sem órfão nem aviso', () => {
    const m = medirPeca(receita);
    expect(m.orfaos).toEqual([]);
    expect(m.avisos).toEqual([]);
    expect(m.arestasSoltas).toBe(4);
    expect(m.faces).toBe(1750);
  });

  it('com 0,05 mm de avanço, como o braço superior, a mesma união fecha sem aresta solta', () => {
    const m = medirPeca({ PASSOS: gerarPassos({ ...receita.PARAMS, avanco: 0.05 }), PARAMS: {} });
    expect(m.arestasSoltas).toBe(0);
    expect(m.faces).toBe(1750);
  });
});
