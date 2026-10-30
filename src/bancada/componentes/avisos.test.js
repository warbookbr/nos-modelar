/* avisos.test.js — o aviso aparece, some sozinho e reinicia a contagem com aviso novo; o erro mostra a pilha quando há. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarPagina } from './dom-de-teste.js';
import { DURACAO_DO_AVISO_MS, montarAvisos } from './avisos.js';

describe('avisos da bancada', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('o aviso some depois da duração, contada do último aviso', () => {
    const { $ } = criarPagina('<div id="aviso" hidden></div><div id="erro" hidden></div>');
    const avisos = montarAvisos({ aviso: $('aviso'), erro: $('erro') });
    avisos.avisar('Abrindo furgao…');
    vi.advanceTimersByTime(DURACAO_DO_AVISO_MS - 100);
    avisos.avisar('Ajuste salvo.');
    vi.advanceTimersByTime(DURACAO_DO_AVISO_MS - 100);
    expect([$('aviso').hidden, $('aviso').textContent]).toEqual([false, 'Ajuste salvo.']);
    vi.advanceTimersByTime(100);
    expect($('aviso').hidden).toBe(true);
  });

  it('o erro mostra a pilha, ou a mensagem, ou o próprio valor', () => {
    const { $ } = criarPagina('<div id="erro" hidden></div>');
    const avisos = montarAvisos({ aviso: null, erro: $('erro') });
    avisos.avisar('sem onde mostrar');
    avisos.mostrarErro({ message: 'receita sem PASSOS' });
    expect([$('erro').hidden, $('erro').textContent]).toEqual([false, 'receita sem PASSOS']);
    avisos.mostrarErro('texto puro');
    expect($('erro').textContent).toBe('texto puro');
  });
});
