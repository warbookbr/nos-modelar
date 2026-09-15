/* edicao-de-malha.test.js — topologia, conversão de seleção entre vértice,
   aresta e face, e o movimento aplicado à malha neutra. */
import { describe, expect, it } from 'vitest';
import { criarEstadoEdicaoDeMalha, moverSelecaoDaMalha, TAMANHO_PONTO_EM_EDICAO, topologiaDaMalhaNeutra } from './edicao-de-malha.js';

const TOPOLOGIA = {
  vertices: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  faces: [
    { id: 'f1', vertices: ['a', 'b', 'c'] },
    { id: 'f2', vertices: ['a', 'c', 'd'] },
    { id: 'f3', vertices: ['e', 'f', 'g'] },
  ],
};

describe('estado de edição de malha', () => {
  it('mantém o ponto de seleção fino o suficiente para não cobrir malhas densas', () => {
    expect(TAMANHO_PONTO_EM_EDICAO).toBeLessThanOrEqual(3);
  });

  it('deriva a topologia temporária da malha neutra sem levar seus ids ao alvo', () => {
    const topologia = topologiaDaMalhaNeutra({
      V: new Map([[10, [0, 0, 0]], [11, [1, 0, 0]], [12, [0, 1, 0]]]),
      F: new Map([[42, { id: 42, vs: [10, 11, 12] }]]),
    });

    expect(topologia).toEqual({
      vertices: ['10', '11', '12'],
      faces: [{ id: '42', vertices: ['10', '11', '12'] }],
    });
  });

  it('entra por vértice e converte a seleção entre vértice, aresta e face', () => {
    const edicao = criarEstadoEdicaoDeMalha(TOPOLOGIA);
    expect(edicao.estado()).toMatchObject({ ativo: false, modo: 'vertice', selecionados: [] });
    edicao.alternar();

    edicao.selecionar('a');
    edicao.selecionar('b', { aditiva: true });
    edicao.selecionar('c', { aditiva: true });
    expect(edicao.estado()).toMatchObject({ ativo: true, modo: 'vertice', selecionados: ['a', 'b', 'c'] });

    edicao.definirModo('aresta');
    expect(edicao.estado().selecionados).toEqual(['a:b', 'a:c', 'b:c']);

    edicao.definirModo('face');
    expect(edicao.estado().selecionados).toEqual(['f1']);

    edicao.definirModo('vertice');
    expect(edicao.estado().selecionados).toEqual(['a', 'b', 'c']);
  });

  it('soma, retira, limpa e seleciona tudo no modo atual', () => {
    const edicao = criarEstadoEdicaoDeMalha(TOPOLOGIA);
    edicao.alternar();
    edicao.selecionar('a');
    edicao.selecionar('b', { aditiva: true });
    edicao.selecionar('a', { remover: true });
    expect(edicao.estado().selecionados).toEqual(['b']);

    edicao.selecionarTudo();
    expect(edicao.estado().selecionados).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    edicao.limpar();
    expect(edicao.estado().selecionados).toEqual([]);
  });

  it('seleciona um conjunto de elementos para a caixa de seleção', () => {
    const edicao = criarEstadoEdicaoDeMalha(TOPOLOGIA);
    edicao.alternar();

    edicao.selecionarMuitos(['a', 'c']);
    expect(edicao.estado().selecionados).toEqual(['a', 'c']);

    edicao.selecionarMuitos(['d'], { aditiva: true });
    edicao.selecionarMuitos(['a'], { remover: true });
    expect(edicao.estado().selecionados).toEqual(['c', 'd']);
  });

  it('seleciona a ilha conexa no nível atual, sem levar geometria desconexa', () => {
    const edicao = criarEstadoEdicaoDeMalha(TOPOLOGIA);
    edicao.alternar();
    edicao.selecionar('a');
    edicao.selecionarIlha();
    expect(edicao.estado().selecionados).toEqual(['a', 'b', 'c', 'd']);
  });

  it('move a face selecionada sem mudar a topologia ou a malha de origem', () => {
    const neutro = {
      V: new Map([['a', [0, 0, 0]], ['b', [1, 0, 0]], ['c', [0, 1, 0]], ['d', [3, 0, 0]]]),
      F: new Map([['f1', { id: 'f1', vs: ['a', 'b', 'c'] }]]),
    };
    const edicao = criarEstadoEdicaoDeMalha({
      vertices: ['a', 'b', 'c', 'd'],
      faces: [{ id: 'f1', vertices: ['a', 'b', 'c'] }],
    });
    edicao.alternar();
    edicao.definirModo('face');
    edicao.selecionar('f1');

    const movido = moverSelecaoDaMalha(neutro, topologiaDaMalhaNeutra(neutro), edicao.estado(), [0, 0, 0.25]);

    expect(movido.V.get('a')).toEqual([0, 0, 0.25]);
    expect(movido.V.get('c')).toEqual([0, 1, 0.25]);
    expect(movido.V.get('d')).toEqual([3, 0, 0]);
    expect(neutro.V.get('a')).toEqual([0, 0, 0]);
    expect(movido.F).toBe(neutro.F);
  });
});
