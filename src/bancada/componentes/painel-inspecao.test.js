/* painel-inspecao.test.js — as abas trocam de conteúdo, a seleção habilita os controles, o raio X desliga o Wireframe e o diagnóstico, as portas e as juntas seguem o estado. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { TITULO_DO_WIREFRAME, montarPainelInspecao } from './painel-inspecao.js';

const MARCACAO = `
  <aside class="painel painel-inspecao" data-painel="inspecao">
    <button class="recolher" type="button" data-recolher="inspecao" aria-expanded="true"><span aria-hidden="true">›</span></button>
    <button class="aba-btn ativa" data-aba="inspecao" aria-selected="true">Inspeção</button>
    <button class="aba-btn" data-aba="anotacoes" aria-selected="false">Anotações</button>
    <div id="abaConteudoInspecao" class="aba-conteudo ativa">
      <input id="prefGrade" type="checkbox" /><input id="prefChao" type="checkbox" />
      <p id="selecaoResumo">Selecione componentes para inspecionar.</p>
      <button id="btnTodas" class="botao ativa"></button><button id="btnContexto" class="botao" disabled></button>
      <button id="btnIsolar" class="botao" disabled></button><button id="btnWireframeSelecao" class="botao" disabled></button>
      <output id="valorOpacidadeSelecao"></output><input id="opacidadeSelecao" type="range" disabled />
      <output id="valorExplosao"></output><input id="explosao" type="range" />
      <button id="btnSelecionarConjunto" disabled></button><button id="btnFocarSelecao" disabled></button>
      <button id="btnCopiarEstado"></button><button id="btnJuntas" aria-pressed="false"></button>
      <div id="diagnostico" class="diagnostico"><p>Preparando relatório da peça…</p></div>
      <details id="portasPublicadas" hidden><span id="resumoPortas"></span><ul id="listaPortas"></ul></details>
    </div>
    <div id="abaConteudoAnotacoes" class="aba-conteudo" hidden></div>
  </aside>`;

function montar() {
  const pagina = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const acoes = {
    focarSelecao: vi.fn(), selecionarConjunto: vi.fn(), definirModo: vi.fn(), definirExplosao: vi.fn(),
    alternarWireframeSelecao: vi.fn(), definirOpacidadeSelecao: vi.fn(), copiarVista: vi.fn(),
    alternarModoJuntas: vi.fn(), aplicarPreferenciasCena: vi.fn(),
  };
  const painel = montarPainelInspecao({
    elementos: lerElementosDaPagina(pagina.documento).painelInspecao, estado, acoes, aoRecolher: vi.fn(),
  });
  return { ...pagina, estado, acoes, painel };
}

const SELECAO = {
  selecionadas: ['caixaRodaFrente', 'aroFrenteDir'], modo: 'isolar', explosao: 0.25,
  opacidadeSelecao: 0.4, wireframeSelecao: true, temDescendentes: false,
};

describe('painel de inspeção', () => {
  it('a aba clicada mostra o conteúdo dela e esconde o das outras', () => {
    const { documento, $ } = montar();
    documento.querySelector('[data-aba="anotacoes"]').click();
    expect($('abaConteudoInspecao').hidden).toBe(true);
    expect($('abaConteudoAnotacoes').hidden).toBe(false);
    expect(documento.querySelector('[data-aba="anotacoes"]').getAttribute('aria-selected')).toBe('true');
    expect(documento.querySelector('[data-aba="inspecao"]').classList.contains('ativa')).toBe(false);
  });

  it('a seleção do estado escreve o resumo, os modos, os sliders e o que fica habilitado', () => {
    const { $, estado } = montar();
    estado.definir({ selecao: SELECAO });
    expect($('selecaoResumo').textContent).toBe('2 componentes: Caixa Roda Frente, Aro Frente Dir');
    expect($('btnContexto').disabled).toBe(false);
    expect($('btnIsolar').classList.contains('ativa')).toBe(true);
    expect($('btnTodas').classList.contains('ativa')).toBe(false);
    expect($('btnWireframeSelecao').classList.contains('ativa')).toBe(true);
    expect($('btnSelecionarConjunto').disabled).toBe(true);
    expect([$('explosao').value, $('valorExplosao').value]).toEqual(['25', '25%']);
    expect([$('opacidadeSelecao').value, $('valorOpacidadeSelecao').value]).toEqual(['40', '40%']);
  });

  it('com a peça inteira em raio X o Wireframe fica desabilitado e o título diz por quê', () => {
    const { $, estado, painel } = montar();
    estado.definir({ selecao: SELECAO });
    painel.refletirVisao('raio-x');
    expect($('btnWireframeSelecao').disabled).toBe(true);
    expect($('btnWireframeSelecao').title).toBe(TITULO_DO_WIREFRAME['raio-x']);
    painel.refletirVisao('arame');
    expect($('btnWireframeSelecao').disabled).toBe(false);
    expect($('btnWireframeSelecao').title).toBe(TITULO_DO_WIREFRAME.outras);
  });

  it('diagnóstico, portas, hierarquia, juntas e preferências seguem o estado', () => {
    const { $, estado } = montar();
    estado.definir({ diagnostico: { semParte: 3, componentes: 5 } });
    expect($('diagnostico').classList.contains('alerta')).toBe(true);
    expect($('diagnostico').querySelector('p').textContent).toBe('3 faces não pertencem a uma parte semântica.');
    estado.definir({ diagnostico: { semParte: 0, componentes: 5 } });
    expect($('diagnostico').querySelector('p').textContent).toBe('5 componentes: nenhuma superfície sem identidade.');

    estado.definir({ portas: [{ rotulo: 'Eixo', id: 'eixo', origem: 'cilindro#20' }] });
    expect($('portasPublicadas').hidden).toBe(false);
    expect($('resumoPortas').textContent).toBe('1 publicada');
    expect($('listaPortas').querySelector('small').textContent).toBe('eixo · cilindro#20');

    estado.definir({ temHierarquia: false });
    expect($('btnSelecionarConjunto').hidden).toBe(true);
    estado.definir({ juntas: { ...estado.obter('juntas'), modo: true } });
    expect($('btnJuntas').getAttribute('aria-pressed')).toBe('true');
    expect($('btnJuntas').classList.contains('ativo')).toBe(true);
    estado.definir({ preferenciasCena: { grade: false, chao: true } });
    expect([$('prefGrade').checked, $('prefChao').checked]).toEqual([false, true]);
  });

  it('os botões e controles chamam as ações com os valores do controle', () => {
    const { $, acoes } = montar();
    $('btnIsolar').click();
    expect(acoes.definirModo).toHaveBeenCalledWith('isolar');
    $('explosao').value = '60';
    $('explosao').dispatchEvent({ type: 'input' });
    expect(acoes.definirExplosao).toHaveBeenCalledWith(0.6);
    $('prefChao').checked = true;
    $('prefChao').dispatchEvent({ type: 'change' });
    expect(acoes.aplicarPreferenciasCena).toHaveBeenCalledWith({ chao: true });
    $('btnJuntas').click();
    $('btnCopiarEstado').click();
    $('btnFocarSelecao').click();
    expect([acoes.alternarModoJuntas, acoes.copiarVista, acoes.focarSelecao].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });
});
