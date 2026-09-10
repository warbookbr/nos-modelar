/* historico-parametros.test.js — desfazer da sessão.
 *
 * O caso guardado aqui é o desfazer que passa do começo: se Ctrl+Z continuar
 * devolvendo valor depois que a sessão acabou de voltar ao que veio do
 * arquivo, a bancada grava um número que ninguém escolheu. O segundo caso é o
 * arrasto: a prévia é chamada por quadro, e um desfazer por quadro tornaria o
 * comando inútil. */
import { describe, expect, it } from 'vitest';
import { criarHistoricoParametros } from './historico-parametros.js';

const ORIGEM = { 'pontoSelimTopo.1': 716, 'tuboSelimComprimento': 500 };
const criar = () => criarHistoricoParametros({ valorDeOrigem: (c) => ORIGEM[c] });

describe('histórico de parâmetros da sessão', () => {
  it('devolve o valor anterior de cada passo, na ordem inversa', () => {
    const h = criar();
    h.registrar('pontoSelimTopo.1', 730);
    h.separar();
    h.registrar('tuboSelimComprimento', 520);
    h.separar();
    h.registrar('pontoSelimTopo.1', 743);

    expect(h.desfazer()).toEqual({ chave: 'pontoSelimTopo.1', valor: 730, naOrigem: false });
    expect(h.desfazer()).toEqual({ chave: 'tuboSelimComprimento', valor: 500, naOrigem: true });
    expect(h.desfazer()).toEqual({ chave: 'pontoSelimTopo.1', valor: 716, naOrigem: true });
  });

  it('PARA no estado que veio do arquivo: desfazer além do início não devolve nada', () => {
    const h = criar();
    h.registrar('pontoSelimTopo.1', 743);
    expect(h.desfazer().valor).toBe(716);
    expect(h.vazio).toBe(true);
    expect(h.desfazer()).toBe(null);
    expect(h.desfazer()).toBe(null);
  });

  it('funde os quadros de um arrasto num passo só, e separa gestos distintos', () => {
    const h = criar();
    for (const v of [717, 720, 725, 743]) h.registrar('pontoSelimTopo.1', v);
    expect(h.tamanho).toBe(1);

    h.separar();
    h.registrar('pontoSelimTopo.1', 750);
    expect(h.tamanho).toBe(2);
    expect(h.desfazer()).toEqual({ chave: 'pontoSelimTopo.1', valor: 743, naOrigem: false });
    expect(h.desfazer()).toEqual({ chave: 'pontoSelimTopo.1', valor: 716, naOrigem: true });
  });

  it('não funde parâmetros diferentes mesmo sem separar', () => {
    const h = criar();
    h.registrar('pontoSelimTopo.1', 730);
    h.registrar('tuboSelimComprimento', 520);
    h.registrar('pontoSelimTopo.1', 743);
    expect(h.tamanho).toBe(3);
  });

  it('desfazer depois de refazer o caminho volta pelo valor intermediário', () => {
    const h = criar();
    h.registrar('pontoSelimTopo.1', 730);
    h.separar();
    h.registrar('pontoSelimTopo.1', 743);
    h.separar();
    h.registrar('pontoSelimTopo.1', 730);
    expect(h.desfazer().valor).toBe(743);
    expect(h.desfazer().valor).toBe(730);
    expect(h.desfazer()).toEqual({ chave: 'pontoSelimTopo.1', valor: 716, naOrigem: true });
  });

  it('limpar zera a pilha, e exige valorDeOrigem para existir', () => {
    const h = criar();
    h.registrar('pontoSelimTopo.1', 730);
    h.limpar();
    expect(h.vazio).toBe(true);
    expect(h.desfazer()).toBe(null);
    expect(() => criarHistoricoParametros({})).toThrow(TypeError);
  });
});
