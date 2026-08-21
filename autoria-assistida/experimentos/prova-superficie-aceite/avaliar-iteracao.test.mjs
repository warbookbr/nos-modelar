import { expect, it } from 'vitest';
import { avaliarIteracao } from './avaliar-iteracao.mjs';
import { construirPeleDianteira } from './secoes-de-carater.mjs';

it('libera a terceira hipótese para leitura visual quando o arco entra na mesma malha', () => {
  expect(avaliarIteracao(construirPeleDianteira())).toEqual({
    decisao: 'pronta-para-leitura-visual',
    achados: [],
  });
});
