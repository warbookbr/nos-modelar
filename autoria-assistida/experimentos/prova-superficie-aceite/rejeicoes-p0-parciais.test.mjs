import { expect, it } from 'vitest';
import { rejeicoesParciais } from './rejeicoes-p0-parciais.mjs';

it('não confunde abertura correta com aderência dimensional ao P0', () => {
  const resultado = rejeicoesParciais();
  expect(resultado.decisao).toBe('reprovado-parcial');
  expect(resultado.itens.find((i) => i.id === 'nariz').passou).toBe(true);
  expect(resultado.itens.find((i) => i.id === 'ombro').passou).toBe(true);
  expect(resultado.itens.find((i) => i.id === 'arco').passou).toBe(false);
  expect(resultado.itens.find((i) => i.id === 'abertura-roda').passou).toBe(true);
  expect(resultado.itens.find((i) => i.id === 'recorte-farol').passou).toBe(true);
});
