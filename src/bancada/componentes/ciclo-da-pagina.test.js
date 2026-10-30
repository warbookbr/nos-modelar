/* ciclo-da-pagina.test.js — o relógio roda a função já na montagem e de novo a cada quadro até parar, e a saída da página roda uma vez só. */
import { describe, expect, it, vi } from 'vitest';
import { criarPagina } from './dom-de-teste.js';
import { aCadaQuadro, aoSairDaPagina } from './ciclo-da-pagina.js';

describe('ciclo da página', () => {
  it('a função roda agora e a cada quadro, até parar', () => {
    const { janela } = criarPagina('');
    const funcao = vi.fn();
    const parar = aCadaQuadro(funcao, janela);
    expect(funcao).toHaveBeenCalledTimes(1);
    janela.avancarQuadro();
    janela.avancarQuadro();
    expect(funcao).toHaveBeenCalledTimes(3);
    parar();
    janela.avancarQuadro();
    expect(funcao).toHaveBeenCalledTimes(3);
  });

  it('a saída da página roda uma vez', () => {
    const { janela } = criarPagina('');
    const sair = vi.fn();
    aoSairDaPagina(sair, janela);
    janela.disparar({ type: 'pagehide' }, { captura: false });
    janela.disparar({ type: 'pagehide' }, { captura: false });
    expect(sair).toHaveBeenCalledTimes(1);
  });
});
