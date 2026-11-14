/* conferir-retrato-do-acervo.test.mjs — prova que a conferência do retrato acha igual a receita mínima e a peça pequena, e que o hash distingue malhas. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { conferirReceita, hashDoNeutro } from './conferir-retrato-do-acervo.mjs';

const receita = (graus) => ({
  PASSOS: [
    ['cubo', { origemId: 1, lado: 1 }],
    ['rotaciona', { eixo: 'y', graus, sel: { origem: { op: 'cubo', id: 1 } } }],
    ['transladar', { d: [0, 1, 0], sel: { origem: { op: 'cubo', id: 1 } } }],
  ],
});

describe('conferência do retrato', () => {
  it('o atalho declarado e a conta completa dão a mesma saída', () => {
    const r = conferirReceita(receita(30));
    expect(r.igual).toBe(true);
    expect(r.hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it('o hash muda quando a malha muda', () => {
    expect(hashDoNeutro(executarReceita(receita(30)).neutro)).not.toBe(hashDoNeutro(executarReceita(receita(31)).neutro));
  });
});
