/* O exemplo de peça de família que o ramo `modelar/peca/familia` entrega: ele executa, cada parte da família sai com
   material, e o PLANO é válido. Exemplo que não roda ensina a receita errada. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { descreverPeca } from '../../../src/autoria/descrever-partes.js';
import { normalizarPlanoDeModelagem } from '../../../src/autoria/plano-de-modelagem.js';
import receita, { MATERIAL_DA_PARTE } from './receita.js';

describe('exemplo de peça de família', () => {
  it('executa, publica as partes que dá material e tem PLANO válido', () => {
    const { neutro } = executarReceita(receita);
    const nomes = descreverPeca(neutro).partes.map((p) => p.nome).sort();
    expect(nomes).toEqual(Object.keys(MATERIAL_DA_PARTE).sort());
    expect(receita.PASSOS.filter(([op]) => op === 'material')).toHaveLength(receita.PASSOS.filter(([op]) => op === 'parte').length);
    expect(normalizarPlanoDeModelagem(receita.PLANO)).not.toBeNull();
  });
});
