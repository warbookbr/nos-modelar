/* controle-de-corte.test.js — o controle da vista de corte chama a ação com eixo, posição e lado, desliga com "Sem corte" e mostra a recusa. */
import { describe, expect, it, vi } from 'vitest';
import { criarPagina } from './dom-de-teste.js';
import { montarControleDeCorte } from './controle-de-corte.js';

function montar(definirCorte = vi.fn()) {
  const pagina = criarPagina('<div id="caixa"><label id="opacidade"></label><p id="depois"></p></div>');
  const ancora = pagina.documento.querySelector('#opacidade');
  const controle = montarControleDeCorte({ ancora, acoes: { definirCorte } });
  return { ...pagina, ancora, controle, definirCorte };
}

describe('controle de corte', () => {
  it('nasce depois do controle de opacidade, com posição e lado desligados', () => {
    const { controle, ancora } = montar();
    const irmaos = [...ancora.parentNode.childNodes];
    expect(irmaos[irmaos.indexOf(ancora) + 1]).toBe(controle.elemento);
    expect([controle.posicao.disabled, controle.lado.disabled]).toEqual([true, true]);
  });

  it('um eixo e uma posição ligam o corte; "Sem corte" o desliga', () => {
    const { controle, definirCorte } = montar();
    controle.eixo.value = 'z';
    controle.eixo.dispatchEvent({ type: 'change' });
    expect(definirCorte).toHaveBeenLastCalledWith({ eixo: 'z', posicao: '0', lado: controle.lado.value });
    expect(controle.posicao.disabled).toBe(false);
    controle.posicao.value = '-120.5';
    controle.lado.value = 'menos';
    controle.posicao.dispatchEvent({ type: 'input' });
    expect(definirCorte).toHaveBeenLastCalledWith({ eixo: 'z', posicao: '-120.5', lado: 'menos' });
    controle.eixo.value = '';
    controle.eixo.dispatchEvent({ type: 'change' });
    expect(definirCorte).toHaveBeenLastCalledWith(null);
    expect(controle.posicao.disabled).toBe(true);
  });

  it('a recusa da ação aparece no aviso e marca a posição', () => {
    const { controle } = montar(vi.fn(() => { throw new Error('--corte: a posição "x" não é um número em milímetros.'); }));
    controle.eixo.value = 'x';
    controle.eixo.dispatchEvent({ type: 'change' });
    expect(controle.aviso.textContent).toMatch(/não é um número/);
    expect(controle.posicao.getAttribute('aria-invalid')).toBe('true');
  });

  it('sem a ação o controle não aparece', () => {
    const pagina = criarPagina('<div><label id="opacidade"></label></div>');
    expect(montarControleDeCorte({ ancora: pagina.documento.querySelector('#opacidade'), acoes: {} })).toBeNull();
  });
});
