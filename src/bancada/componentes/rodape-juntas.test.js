/* rodape-juntas.test.js — o rodapé aparece quando há o que salvar ou o modo está ligado, conta as juntas, e salvar passa o baixar à edição. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarRodapeJuntas, resumoDasJuntas } from './rodape-juntas.js';

const MARCACAO = `
  <footer id="rodapeJuntas" hidden>
    <span id="resumoJuntas">nenhuma junta movida</span>
    <button id="btnSalvarAjusteDeJunta" disabled>Salvar ajuste</button>
  </footer>`;

describe('rodapé das juntas', () => {
  it('o resumo conta juntas, ou diz que a malha foi editada, ou que nada se moveu', () => {
    expect(resumoDasJuntas({ quantas: 1, mudou: true })).toBe('1 junta movida');
    expect(resumoDasJuntas({ quantas: 3, mudou: true })).toBe('3 juntas movidas');
    expect(resumoDasJuntas({ quantas: 0, mudou: true })).toBe('malha editada');
    expect(resumoDasJuntas({ quantas: 0, mudou: false })).toBe('nenhuma junta movida');
  });

  it('segue o estado das juntas e salvar entrega o baixar deste componente', () => {
    const { documento, $ } = criarPagina(MARCACAO);
    const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
    const salvar = vi.fn();
    const baixar = vi.fn();
    montarRodapeJuntas({ elementos: lerElementosDaPagina(documento).rodapeJuntas, estado, salvar, baixar });

    estado.definir({ juntas: { modo: true, quantas: 2, mudou: true, rodapeVisivel: true } });
    expect($('rodapeJuntas').hidden).toBe(false);
    expect($('rodapeJuntas').classList.contains('tem-pendencia')).toBe(true);
    expect($('resumoJuntas').textContent).toBe('2 juntas movidas');
    expect($('btnSalvarAjusteDeJunta').disabled).toBe(false);
    $('btnSalvarAjusteDeJunta').click();
    expect(salvar).toHaveBeenCalledWith(baixar);

    estado.definir({ juntas: { modo: false, quantas: 2, mudou: true, rodapeVisivel: false } });
    expect($('rodapeJuntas').hidden).toBe(true);
  });
});
