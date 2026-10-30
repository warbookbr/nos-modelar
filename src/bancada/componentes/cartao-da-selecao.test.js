/* cartao-da-selecao.test.js — o cartão aparece com a seleção e some na edição e com os detalhes abertos, mostra nome e medidas, marca os modos, chama as ações do painel e fica ao lado da parte. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarCartaoDaSelecao, posicaoDoCartao, textoDasMedidas } from './cartao-da-selecao.js';

const MARCACAO = `
  <section id="cartaoSelecao" hidden>
    <h2 id="tituloCartao"></h2><p id="medidasCartao"></p>
    <button data-cartao="fechar"></button><button data-cartao="focar"></button><button data-cartao="isolar"></button>
    <button data-cartao="fantasma"></button><button data-cartao="arame"></button><button data-cartao="ocultar"></button>
    <input id="opacidadeCartao" /><output id="valorOpacidadeCartao"></output>
    <button data-cartao="conjunto"></button><button data-cartao="detalhes"></button>
  </section>`;

const SELECAO = { selecionadas: ['rodaFrenteEsq'], modo: 'todas', wireframeSelecao: false, opacidadeSelecao: 1, temDescendentes: false };

function montar() {
  const pagina = criarPagina(MARCACAO);
  pagina.janela.innerWidth = 1400;
  pagina.janela.innerHeight = 900;
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const acoes = {
    limpar: vi.fn(), focarSelecao: vi.fn(), definirModo: vi.fn(), alternarWireframeSelecao: vi.fn(), ocultarSelecao: vi.fn(),
    selecionarConjunto: vi.fn(), abrirDetalhes: vi.fn(), definirOpacidadeSelecao: vi.fn(),
  };
  montarCartaoDaSelecao({
    elementos: lerElementosDaPagina(pagina.documento).cartaoDaSelecao,
    estado,
    acoes,
    caixaNaTela: () => ({ esquerda: -0.2, direita: 0, base: -0.4, topo: -0.2 }),
    medidas: () => ({ tamanho: [0.62, 1.06, 1.06], faces: 288 }),
    janela: pagina.janela,
  });
  return { ...pagina, estado, acoes, botao: (nome) => pagina.documento.querySelector(`[data-cartao="${nome}"]`) };
}

describe('contas do cartão', () => {
  it('escreve as medidas como a pessoa lê', () => {
    expect(textoDasMedidas({ tamanho: [0.62, 1.06, 1.06], faces: 2996 })).toBe('0,62 × 1,06 × 1,06 m · 2.996 faces');
  });

  it('fica à direita da parte, ou à esquerda quando não cabe, e dentro das margens', () => {
    const tela = { largura: 1400, altura: 900 };
    const cartao = { largura: 304, altura: 200 };
    expect(posicaoDoCartao({ caixa: { esquerda: -0.2, direita: 0, base: -0.4, topo: -0.2 }, tela, cartao })).toEqual({ x: 724, y: 485 });
    expect(posicaoDoCartao({ caixa: { esquerda: 0.6, direita: 0.9, base: 0.8, topo: 1.2 }, tela, cartao })).toEqual({ x: 792, y: 72 });
    expect(posicaoDoCartao({ caixa: { esquerda: -1, direita: 0.95, base: -1.5, topo: -1.2 }, tela, cartao })).toEqual({ x: 16, y: 652 });
  });

  it('com a cena numa parte da tela, segue a parte dentro dela e não sobe acima do alto dela', () => {
    const tela = { largura: 1400, altura: 900 };
    const cartao = { largura: 304, altura: 200 };
    /* O lado da peça no Revisão: 580 por 788 pixels, a partir de (240, 84). */
    const cena = { x: 240, y: 84, largura: 580, altura: 788 };
    expect(posicaoDoCartao({ caixa: { esquerda: -0.2, direita: 0, base: -0.4, topo: -0.2 }, tela, cartao, cena })).toEqual({ x: 554, y: 496 });
    expect(posicaoDoCartao({ caixa: { esquerda: 0.6, direita: 0.9, base: 0.8, topo: 1.2 }, tela, cartao, cena })).toEqual({ x: 815, y: 92 });
  });
});

describe('cartão da seleção', () => {
  it('aparece com a seleção, com o nome, as medidas e a posição, e some sem ela', () => {
    const { $, estado, janela } = montar();
    expect($('cartaoSelecao').hidden).toBe(true);
    estado.definir({ selecao: SELECAO });
    expect($('cartaoSelecao').hidden).toBe(false);
    expect($('tituloCartao').textContent).toBe('Roda Frente Esq');
    expect($('medidasCartao').textContent).toBe('0,62 × 1,06 × 1,06 m · 288 faces');
    expect($('cartaoSelecao').style.transform).toBe('translate(724px, 485px)');
    expect(janela.quadrosPendentes()).toBe(1);
    estado.definir({ selecao: { ...SELECAO, selecionadas: ['a', 'b'] } });
    expect($('tituloCartao').textContent).toBe('2 partes');
    estado.definir({ selecao: { ...SELECAO, selecionadas: [] } });
    expect($('cartaoSelecao').hidden).toBe(true);
    expect(janela.quadrosPendentes()).toBe(0);
  });

  it('some no modo de edição e com o painel da direita aberto', () => {
    const { $, estado } = montar();
    estado.definir({ selecao: SELECAO, juntas: { modo: true, quantas: 0, mudou: false, rodapeVisivel: true } });
    expect($('cartaoSelecao').hidden).toBe(true);
    estado.definir({ juntas: { modo: false, quantas: 0, mudou: false, rodapeVisivel: false }, malhaEmEdicao: true });
    expect($('cartaoSelecao').hidden).toBe(true);
    estado.definir({ malhaEmEdicao: false, paineis: { inspecao: true } });
    expect($('cartaoSelecao').hidden).toBe(true);
    estado.definir({ paineis: { inspecao: false } });
    expect($('cartaoSelecao').hidden).toBe(false);
  });

  it('marca os modos e chama as mesmas ações do painel, alternando isolar e fantasma', () => {
    const { estado, acoes, botao, $ } = montar();
    estado.definir({ selecao: { ...SELECAO, modo: 'isolar', wireframeSelecao: true }, visao: 'raio-x', temHierarquia: false });
    expect(botao('isolar').getAttribute('aria-pressed')).toBe('true');
    expect(botao('fantasma').getAttribute('aria-pressed')).toBe('false');
    expect(botao('arame').getAttribute('aria-pressed')).toBe('true');
    expect(botao('arame').disabled).toBe(true);
    expect(botao('conjunto').hidden).toBe(true);
    botao('isolar').click();
    botao('fantasma').click();
    expect(acoes.definirModo.mock.calls).toEqual([['todas'], ['contexto']]);
    for (const nome of ['fechar', 'focar', 'arame', 'ocultar', 'conjunto', 'detalhes']) botao(nome).click();
    expect(acoes.limpar).toHaveBeenCalled();
    expect(acoes.focarSelecao).toHaveBeenCalled();
    expect(acoes.ocultarSelecao).toHaveBeenCalled();
    expect(acoes.abrirDetalhes).toHaveBeenCalled();
    $('opacidadeCartao').value = '40';
    $('opacidadeCartao').dispatchEvent({ type: 'input' });
    expect(acoes.definirOpacidadeSelecao).toHaveBeenCalledWith(0.4);
  });
});
