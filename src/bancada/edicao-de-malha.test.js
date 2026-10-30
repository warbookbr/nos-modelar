/* edicao-de-malha.test.js — topologia, conversão de seleção entre vértice,
   aresta e face, e o movimento aplicado à malha neutra. */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { criarEstadoEdicaoDeMalha, faceDoAcerto, moverSelecaoDaMalha, TAMANHO_PONTO_EM_EDICAO, topologiaDaMalhaNeutra } from './edicao-de-malha.js';
import { adaptarThree } from '../autoria/adaptar-three.js';
import { executarReceita } from '../autoria/executar-receita.js';
import { BASE_ESTENDIDA } from '../../procedural/nucleo/entrada.js';
import carenagem from '../../procedural/pecas/carenagem-de-prova/receita.js';

const TOPOLOGIA = {
  vertices: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  faces: [
    { id: 'f1', vertices: ['a', 'b', 'c'] },
    { id: 'f2', vertices: ['a', 'c', 'd'] },
    { id: 'f3', vertices: ['e', 'f', 'g'] },
  ],
};

describe('estado de edição de malha', () => {
  /* O limite anterior era três pixels, e o autor não conseguia ver nem acertar o
     vértice: o ponto fino demais deixa de ser punho. A faixa útil vai de cinco,
     abaixo do qual ele some, a doze, acima do qual ele cobre a forma que a
     pessoa está tentando enxergar. */
  it('mantém o ponto de seleção grande o bastante para ser punho e pequeno o bastante para não cobrir a malha', () => {
    expect(TAMANHO_PONTO_EM_EDICAO).toBeGreaterThanOrEqual(5);
    expect(TAMANHO_PONTO_EM_EDICAO).toBeLessThanOrEqual(12);
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

/* A face que o raio acerta numa peça real, depois da milésima face de um passo.
   Ali o núcleo numera na faixa estendida (`idDoPasso`, acima de 2^40), e o id
   precisa chegar inteiro ao modo de edição: a carenagem de prova tem quase
   trinta mil faces num passo só, e é nela que um atributo sem a precisão do id
   juntava faces diferentes no mesmo valor. */
describe('face sob o raio na carenagem de prova', () => {
  const { neutro } = executarReceita(carenagem);
  const { raiz } = adaptarThree(neutro);
  raiz.updateMatrixWorld(true);
  const malhas = [];
  raiz.traverse((objeto) => { if (objeto.isMesh) malhas.push(objeto); });

  function acertar(face) {
    const [a, b, c] = face.vs.slice(0, 3).map((id) => new THREE.Vector3(...neutro.V.get(id)));
    const centro = a.clone().add(b).add(c).divideScalar(3);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const lado = Math.min(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
    const raio = new THREE.Raycaster(centro.clone().addScaledVector(normal, lado * 0.05), normal.clone().negate());
    return faceDoAcerto(raio.intersectObjects(malhas, false)[0]);
  }

  it('devolve o id exato de faces além da milésima do passo', () => {
    const altas = [...neutro.F.keys()].filter((id) => id >= BASE_ESTENDIDA).sort((x, y) => x - y);
    expect(altas.length).toBeGreaterThan(20000);
    for (const id of [altas[0], altas[1], altas[777], altas.at(-2), altas.at(-1)]) {
      expect(acertar(neutro.F.get(id))).toBe(String(id));
    }
  });

  it('cada face da peça tem um id próprio na malha da cena', () => {
    const distintas = new Set();
    for (const malha of malhas) {
      const atributo = malha.geometry.getAttribute('origemFace');
      for (let i = 0; i < atributo.count; i += 3) distintas.add(faceDoAcerto({ object: malha, faceIndex: i / 3 }));
    }
    expect(distintas.size).toBe(neutro.F.size);
  });
});
