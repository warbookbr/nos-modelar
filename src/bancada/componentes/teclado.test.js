/* teclado.test.js — Ctrl+Z desfaz o desenho, G move a parte, Tab entra na edição, as teclas da malha vão para a camada, Esc cancela antes de limpar e o resto passa pela tabela remapeável. */
import { describe, expect, it, vi } from 'vitest';
import { criarRegistroAtalhos } from '../controles/atalhos.js';
import { criarPagina } from './dom-de-teste.js';
import { montarTeclado } from './teclado.js';

function memoria() {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
}

function camadaFalsa({ ativo = true, desenhaMalha = true, movendo = false } = {}) {
  return {
    desenhaMalha,
    movendo,
    estado: () => ({ ativo }),
    definirModo: vi.fn(), selecionarTudo: vi.fn(), limpar: vi.fn(), selecionarIlha: vi.fn(), travarEixo: vi.fn(),
    digitarValor: vi.fn(), confirmarMovimento: vi.fn(), iniciarMovimento: vi.fn(() => true), cancelarMovimento: vi.fn(() => false),
  };
}

function montar({ camada = null, pecaEditavel = true } = {}) {
  const { janela, documento } = criarPagina('<input id="campo" />');
  const edicao = {
    camada,
    desfazerDesenho: vi.fn(() => false),
    moverParteInteira: vi.fn(),
    alternarEdicaoDeMalha: vi.fn(),
    aplicarNaMalha: vi.fn(),
  };
  const comandos = [{ id: 'enquadrar', padrao: 'f', executar: vi.fn() }];
  const registroAtalhos = criarRegistroAtalhos({ padrao: { enquadrar: 'f' }, armazenamento: memoria() });
  const acoes = { limparSelecao: vi.fn(), avisar: vi.fn() };
  const teclado = montarTeclado({
    edicao, temPecaEditavel: () => pecaEditavel, registroAtalhos, comandos, janela, ...acoes,
  });
  return { janela, documento, edicao, comandos, acoes, teclado };
}

describe('teclado da bancada', () => {
  it('Ctrl+Z pede o desfazer e avisa quando não há o que desfazer', () => {
    const { janela, edicao, acoes } = montar();
    const evento = janela.teclar({ key: 'z', ctrlKey: true });
    expect(evento.defaultPrevented).toBe(true);
    expect(edicao.desfazerDesenho).toHaveBeenCalledTimes(1);
    expect(acoes.avisar).toHaveBeenCalledWith('Nada para desfazer nesta sessão.');
  });

  it('G move a parte inteira e Tab alterna a edição, só com peça editável e fora de campo de texto', () => {
    const { janela, documento, edicao } = montar();
    janela.teclar({ key: 'g' });
    janela.teclar({ key: 'Tab' });
    janela.teclar({ key: 'g', target: documento.getElementById('campo') });
    expect(edicao.moverParteInteira).toHaveBeenCalledTimes(1);
    expect(edicao.alternarEdicaoDeMalha).toHaveBeenCalledTimes(1);
    const semPeca = montar({ pecaEditavel: false });
    semPeca.janela.teclar({ key: 'Tab' });
    expect(semPeca.edicao.alternarEdicaoDeMalha).not.toHaveBeenCalled();
  });

  it('com a malha desenhada, os níveis e as operações vão para a camada e para a edição', () => {
    const camada = camadaFalsa();
    const { janela, edicao, comandos } = montar({ camada });
    janela.teclar({ key: '2' });
    janela.teclar({ key: 'a', altKey: true });
    janela.teclar({ key: 'e' });
    janela.teclar({ key: 'D', shiftKey: true });
    janela.teclar({ key: 's', shiftKey: true });
    janela.teclar({ key: 'f' });
    expect(camada.definirModo).toHaveBeenCalledWith('aresta');
    expect(camada.limpar).toHaveBeenCalled();
    expect(edicao.aplicarNaMalha.mock.calls).toEqual([
      ['extrudar'], ['duplicar'], ['escalar', { fator: 1 / 1.1 }], ['criarFace'],
    ]);
    expect(comandos[0].executar).not.toHaveBeenCalled();
  });

  it('em movimento, o número digitado vai para o valor e não troca o nível', () => {
    const camada = camadaFalsa({ movendo: true });
    const { janela } = montar({ camada });
    janela.teclar({ key: '2' });
    janela.teclar({ key: 'x' });
    janela.teclar({ key: 'Enter' });
    expect(camada.digitarValor).toHaveBeenCalledWith('2');
    expect(camada.definirModo).not.toHaveBeenCalled();
    expect(camada.travarEixo).toHaveBeenCalledWith('x');
    expect(camada.confirmarMovimento).toHaveBeenCalled();
  });

  it('Esc cancela o movimento antes de limpar a seleção, e a tecla da tabela executa o comando', () => {
    const camada = camadaFalsa({ ativo: false, desenhaMalha: false });
    camada.cancelarMovimento.mockReturnValueOnce(true);
    const { janela, acoes, comandos, teclado } = montar({ camada });
    janela.teclar({ key: 'Escape' });
    expect(acoes.avisar).toHaveBeenCalledWith('Movimento de malha cancelado.');
    expect(acoes.limparSelecao).not.toHaveBeenCalled();
    janela.teclar({ key: 'Escape' });
    expect(acoes.limparSelecao).toHaveBeenCalledTimes(1);
    janela.teclar({ key: 'f' });
    expect(comandos[0].executar).toHaveBeenCalledTimes(1);
    teclado.destruir();
    janela.teclar({ key: 'f' });
    expect(comandos[0].executar).toHaveBeenCalledTimes(1);
  });
});
