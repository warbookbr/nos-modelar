/* O exemplo de peça de família que o ramo `modelar/peca/familia` entrega: ele executa, cada parte da família sai com
   material, o PLANO é válido e o referencial é o do acervo, com as mesmas regras das guardas, porque o exemplo não está no
   acervo e elas não o veem. Exemplo que não passa nelas ensina a receita errada. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { descreverPeca } from '../../../src/autoria/descrever-partes.js';
import { normalizarPlanoDeModelagem } from '../../../src/autoria/plano-de-modelagem.js';
import { EIXO_VERTICAL, FOLGA_DO_CHAO, fundoDaPeca, verticalDeclarada } from '../../../tools/modelar/guardas/guarda-referencial.mjs';
import receita, { MATERIAL_DA_PARTE } from './receita.js';

describe('exemplo de peça de família', () => {
  it('executa, publica as partes que dá material, tem PLANO válido e o referencial do acervo', () => {
    const { neutro } = executarReceita(receita);
    expect(verticalDeclarada(receita.TOPO)).toBe(EIXO_VERTICAL);
    expect(fundoDaPeca(neutro)).toBeGreaterThanOrEqual(-FOLGA_DO_CHAO);
    const nomes = descreverPeca(neutro).partes.map((p) => p.nome).sort();
    expect(nomes).toEqual(Object.keys(MATERIAL_DA_PARTE).sort());
    expect(receita.PASSOS.filter(([op]) => op === 'material')).toHaveLength(receita.PASSOS.filter(([op]) => op === 'parte').length);
    expect(normalizarPlanoDeModelagem(receita.PLANO)).not.toBeNull();
  });
});
