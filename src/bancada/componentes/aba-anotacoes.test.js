/* aba-anotacoes.test.js — a lista das anotações se redesenha a cada entrega, edita e exclui pelo sincronizador, e os dois jeitos de anotar chegam à sessão e à cena. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarPagina } from './dom-de-teste.js';
import { lerElementosDaPagina } from './elementos-da-pagina.js';
import { montarAbaAnotacoes } from './aba-anotacoes.js';

const MARCACAO = `
  <canvas id="cenaBancada"></canvas>
  <button id="btnAdicionarAnotacaoGeral"></button>
  <button id="btnAdicionarAnotacao"></button>
  <div id="listaAnotacoes"></div>`;

function montar({ resposta = 'Conferir o raio do furo' } = {}) {
  const { documento, $ } = criarPagina(MARCACAO);
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  const sincronizador = { enviarAnotacao: vi.fn(), editarAnotacao: vi.fn(), excluirAnotacao: vi.fn() };
  let modoAdicionar = false;
  const anotacoes3D = {
    ativarModoAdicionar: vi.fn((ligado) => { modoAdicionar = ligado; }),
    isModoAdicionar: () => modoAdicionar,
    tratarCliqueCanvas: vi.fn(),
  };
  const avisar = vi.fn();
  const modelo = { raiz: { nome: 'raiz' } };
  const elementos = lerElementosDaPagina(documento);
  montarAbaAnotacoes({
    elementos: elementos.painelInspecao.anotacoes, estado, canvas: elementos.canvas, anotacoes3D,
    sincronizador: () => sincronizador, modeloEmCena: () => modelo, avisar, perguntar: () => resposta,
  });
  return { $, estado, sincronizador, anotacoes3D, avisar, modelo };
}

describe('aba de anotações', () => {
  it('sem anotação diz que não há nenhuma; com anotações mostra a marca, o autor e o texto', () => {
    const { $, estado } = montar();
    estado.definir({ anotacoes: { lista: [] } });
    expect($('listaAnotacoes').querySelector('p').textContent).toBe('Nenhuma anotação registrada nesta sessão.');
    estado.definir({ anotacoes: { lista: [{ id: 'a1', texto: 'Folga no eixo', posicao: [0, 1, 2], componente: 'cubo' }] } });
    const item = $('listaAnotacoes').querySelector('.item-anotacao');
    expect(item.dataset.id).toBe('a1');
    expect(item.querySelector('.tag-3d').textContent).toBe('3D');
    expect(item.querySelector('.item-anotacao-info').querySelectorAll('span')[1].textContent).toBe('Operador · cubo');
    expect(item.querySelector('.item-anotacao-texto').textContent).toBe('Folga no eixo');
  });

  it('editar troca o texto pelo sincronizador e excluir também passa por ele', () => {
    const { $, estado, sincronizador, avisar } = montar();
    estado.definir({ anotacoes: { lista: [{ id: 'a1', texto: 'Folga no eixo', posicao: null }] } });
    const item = $('listaAnotacoes').querySelector('.item-anotacao');
    item.querySelector('.btn-editar-anotacao').click();
    expect(item.querySelector('.item-anotacao-editor').hidden).toBe(false);
    item.querySelector('textarea').value = '  Folga maior no eixo ';
    item.querySelector('.btn-salvar-edicao').click();
    expect(sincronizador.editarAnotacao).toHaveBeenCalledWith('a1', 'Folga maior no eixo');
    item.querySelector('.btn-excluir-anotacao').click();
    expect(sincronizador.excluirAnotacao).toHaveBeenCalledWith('a1');
    expect(avisar.mock.calls.map(([texto]) => texto)).toEqual(['Anotação atualizada.', 'Anotação excluída.']);
  });

  it('a anotação geral vai para a sessão e o ponto na malha espera o clique na cena', () => {
    const { $, sincronizador, anotacoes3D, modelo } = montar();
    $('btnAdicionarAnotacaoGeral').click();
    expect(sincronizador.enviarAnotacao).toHaveBeenCalledWith({ texto: 'Conferir o raio do furo', componente: 'Geral', posicao: null });
    $('cenaBancada').click();
    expect(anotacoes3D.tratarCliqueCanvas).not.toHaveBeenCalled();
    $('btnAdicionarAnotacao').click();
    $('cenaBancada').click();
    expect(anotacoes3D.tratarCliqueCanvas).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }), [modelo.raiz]);
  });
});
