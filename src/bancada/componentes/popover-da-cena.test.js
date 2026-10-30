/* popover-da-cena.test.js — o botão da cena abre e fecha a caixa, que também fecha por clique fora e por Esc sem o Esc chegar à cena. */
import { describe, expect, it, vi } from 'vitest';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarPopoverDaCena } from './popover-da-cena.js';

const MARCACAO = `
  <div class="popover-ancora">
    <button id="btnCena" aria-expanded="false"></button>
    <div id="popoverCena" hidden><input id="dentro" /></div>
  </div>
  <canvas id="cenaBancada"></canvas>`;

describe('caixa da cena', () => {
  it('abre pelo botão e fecha pelo botão, por clique fora e por Esc', () => {
    const pagina = criarPagina(MARCACAO);
    const daCena = vi.fn();
    pagina.janela.addEventListener('keydown', daCena);
    montarPopoverDaCena({ elementos: lerElementosDaPagina(pagina.documento).popoverDaCena, janela: pagina.janela });
    const caixa = pagina.$('popoverCena');
    pagina.$('btnCena').click();
    expect(caixa.hidden).toBe(false);
    expect(pagina.$('btnCena').getAttribute('aria-expanded')).toBe('true');
    pagina.janela.apontar(pagina.$('dentro'));
    expect(caixa.hidden).toBe(false);
    pagina.janela.apontar(pagina.$('cenaBancada'));
    expect(caixa.hidden).toBe(true);
    pagina.$('btnCena').click();
    pagina.janela.teclar({ key: 'Escape' });
    expect(caixa.hidden).toBe(true);
    expect(daCena).not.toHaveBeenCalled();
    pagina.$('btnCena').click();
    pagina.$('btnCena').click();
    expect(caixa.hidden).toBe(true);
  });
});
