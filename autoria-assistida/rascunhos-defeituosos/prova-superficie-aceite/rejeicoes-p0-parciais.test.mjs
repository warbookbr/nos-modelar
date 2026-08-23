/* rejeicoes-p0-parciais.test.mjs — fixa o veredito dimensional parcial do arco e dos recortes. */
import { expect, it } from 'vitest';
import { rejeicoesParciais } from './rejeicoes-p0-parciais.mjs';

it('aceita o recorte quando o loop real coincide com os landmarks P0', () => {
  const resultado = rejeicoesParciais();
  expect(resultado.decisao).toBe('passou-parcial');
  expect(resultado.itens.find((i) => i.id === 'nariz').passou).toBe(true);
  expect(resultado.itens.find((i) => i.id === 'ombro').passou).toBe(true);
  expect(resultado.itens.find((i) => i.id === 'arco').passou).toBe(true);
  expect(resultado.itens.find((i) => i.id === 'abertura-roda').passou).toBe(true);
  expect(resultado.itens.find((i) => i.id === 'recorte-farol').passou).toBe(true);
});
