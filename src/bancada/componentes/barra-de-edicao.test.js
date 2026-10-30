/* barra-de-edicao.test.js — a barra do modo de edição aparece com o modo e com o ajuste por salvar, marca juntas ou malha, põe a moldura na página e chama as ações da edição. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarBarraDeEdicao } from './barra-de-edicao.js';

const MARCACAO = `
  <div id="barraEdicao" hidden>
    <button id="btnModoJuntas" aria-pressed="false"></button><button id="btnModoMalha" aria-pressed="false"></button>
    <button id="btnDesfazerEdicao"></button><button id="btnDescartarEdicao"></button>
  </div>
  <button id="btnInspecionar" aria-pressed="true"></button>`;

function montar() {
  const pagina = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const acoes = { alternarModoJuntas: vi.fn(), alternarEdicaoDeMalha: vi.fn(), desfazer: vi.fn(), descartar: vi.fn() };
  montarBarraDeEdicao({ elementos: lerElementosDaPagina(pagina.documento).barraDeEdicao, estado, corpo: pagina.documento.body, acoes });
  return { ...pagina, estado, acoes };
}

const JUNTAS = { modo: false, quantas: 0, mudou: false, rodapeVisivel: false };

describe('barra do modo de edição', () => {
  it('aparece com o modo de juntas ou de malha, marca o modo e põe a moldura na página', () => {
    const { $, estado, documento } = montar();
    estado.definir({ juntas: { ...JUNTAS, modo: true, rodapeVisivel: true } });
    expect($('barraEdicao').hidden).toBe(false);
    expect($('btnModoJuntas').getAttribute('aria-pressed')).toBe('true');
    expect(documento.body.classList.contains('editando')).toBe(true);
    estado.definir({ juntas: JUNTAS, malhaEmEdicao: true });
    expect($('btnModoJuntas').getAttribute('aria-pressed')).toBe('false');
    expect($('btnModoMalha').getAttribute('aria-pressed')).toBe('true');
    estado.definir({ malhaEmEdicao: false });
    expect($('barraEdicao').hidden).toBe(true);
    expect(documento.body.classList.contains('editando')).toBe(false);
  });

  it('fica à vista sem modo enquanto há ajuste por salvar, porque o salvar mora nela', () => {
    const { $, estado, documento } = montar();
    estado.definir({ juntas: { ...JUNTAS, mudou: true, rodapeVisivel: true } });
    expect($('barraEdicao').hidden).toBe(false);
    expect(documento.body.classList.contains('editando')).toBe(false);
    expect($('btnDescartarEdicao').disabled).toBe(false);
  });

  it('cada botão chama a ação dele', () => {
    const { $, acoes } = montar();
    for (const id of ['btnModoJuntas', 'btnModoMalha', 'btnDesfazerEdicao', 'btnDescartarEdicao']) $(id).click();
    expect(Object.values(acoes).map((acao) => acao.mock.calls.length)).toEqual([1, 1, 1, 1]);
  });

  it('Inspecionar fica marcado sem modo ligado e, clicado, desliga o modo que estiver ligado', () => {
    const { $, estado, acoes } = montar();
    $('btnInspecionar').click();
    expect(acoes.alternarModoJuntas).not.toHaveBeenCalled();
    estado.definir({ juntas: { ...JUNTAS, modo: true } });
    expect($('btnInspecionar').getAttribute('aria-pressed')).toBe('false');
    $('btnInspecionar').click();
    expect(acoes.alternarModoJuntas).toHaveBeenCalledTimes(1);
    estado.definir({ juntas: JUNTAS, malhaEmEdicao: true });
    $('btnInspecionar').click();
    expect(acoes.alternarEdicaoDeMalha).toHaveBeenCalledTimes(1);
    estado.definir({ malhaEmEdicao: false });
    expect($('btnInspecionar').getAttribute('aria-pressed')).toBe('true');
  });
});
