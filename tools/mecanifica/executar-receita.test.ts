/* executar-receita.test.ts — prova a fronteira pura sem carregar catálogo. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript puro da fronteira de autoria.
import { entradaDaReceita, executarReceita, validarReceita } from '../../src/autoria/executar-receita.js';

const receita = {
  PARAMS: { lado: 1 },
  PASSOS: [
    ['cubo', { origemId: 10, lado: 'lado' }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 10 } } }],
  ],
};

describe('fronteira pura de receita', () => {
  it('executa uma receita entregue diretamente, sem nome ou caminho', () => {
    const { entrada, neutro } = executarReceita(receita);
    expect(entrada.PARAMS).toEqual({ lado: 1 });
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.F.size).toBe(6);
  });

  it('aplica parâmetros extras sem mutar a receita recebida', () => {
    const entrada = entradaDaReceita(receita, { paramsExtra: { lado: 2 } });
    expect(entrada.PARAMS).toEqual({ lado: 2 });
    expect(receita.PARAMS).toEqual({ lado: 1 });
  });

  it('recusa entrada sem envelope procedural', () => {
    expect(() => validarReceita({})).toThrow(/PASSOS/);
    expect(() => executarReceita(null as any)).toThrow(/objeto/);
  });
});
