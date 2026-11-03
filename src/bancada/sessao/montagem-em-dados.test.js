/* montagem-em-dados.test.js — uma montagem pequena, de fixture, abre pela montagem em dados com as peças nas posições dela.
 *
 * Duas instâncias da peça de prova (uma deslocada 2 m em x) e, num caso, uma que a cena não consegue desenhar. A prova com o
 * avião e o braço robótico reais, que resolve o acervo inteiro e leva uns 20 s, é `montagem-em-dados-acervo.test.js`, que
 * roda entre os testes lentos. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import receitaDeProva from '../../../tools/fixtures/acervo/peca-de-prova/receita.js';
import { abrirMontagemDoAcervo, modeloDaMontagem, resolverMontagemDoAcervo } from './montagem-em-dados.js';

const acervo = [{ id: 'prova', emDados: false, ensaio: false, carregar: async () => receitaDeProva }];
const dado = {
  formato: 'mecanifica.montagem',
  versao: 1,
  id: 'duas-de-prova',
  instancias: [
    { id: 'esquerda', alvo: { tipo: 'peca', ref: 'prova' } },
    { id: 'direita', alvo: { tipo: 'peca', ref: 'prova' }, pose: { deslocamento: [2, 0, 0] } },
  ],
};
const caixaDe = (objeto) => new THREE.Box3().setFromObject(objeto);

describe('montagem em dados na bancada (fixture)', () => {
  it('cada instância vira uma parte da árvore, e a pose da montagem desloca a segunda', async () => {
    const modelo = await abrirMontagemDoAcervo(dado, acervo);
    expect(modelo.tipo).toBe('montagem');
    expect([...modelo.partes.keys()].sort()).toEqual(['direita', 'esquerda']);
    expect(modelo.raiz.userData.hierarquia.map((item) => item.nome).sort()).toEqual(['direita', 'esquerda']);
    expect(modelo.semGeometria).toEqual([]);
    const a = caixaDe(modelo.partes.get('esquerda'));
    const b = caixaDe(modelo.partes.get('direita'));
    expect(b.min.x - a.min.x).toBeCloseTo(2, 4);
    expect(b.max.x - a.max.x).toBeCloseTo(2, 4);
    expect(b.min.y - a.min.y).toBeCloseTo(0, 6);
  });

  it('o toque numa malha cai na instância dona dela, mesmo com o nome de dentro repetido', async () => {
    const modelo = await abrirMontagemDoAcervo(dado, acervo);
    const nomes = new Set(modelo.partes.keys());
    modelo.raiz.traverse((no) => {
      if (no.isMesh) expect(nomes.has(no.userData.identidadeParte)).toBe(false);
    });
  });

  it('instância cuja malha não vira cena fica de fora com o motivo, e a outra abre', async () => {
    const resolvida = await resolverMontagemDoAcervo(dado, acervo);
    const alvo = resolvida.instancias.find((instancia) => instancia.id === 'direita');
    const face = { id: 1, vs: [1, 2, 3, 4], cor: null, material: null, parte: 'x', liso: 0, solido: false, tinta: [] };
    /* quadrilátero em gravata: o contorno cruza a si mesmo e não fecha em orelhas */
    alvo.definicao = {
      ...alvo.definicao,
      neutro: {
        ...alvo.definicao.neutro,
        V: new Map([[1, [0, 0, 0]], [2, [1, 1, 0]], [3, [1, 0, 0]], [4, [0, 1, 0]]]),
        F: new Map([[1, face]]),
      },
    };
    const modelo = modeloDaMontagem(resolvida);
    expect(modelo.semGeometria.map((item) => item.caminho)).toEqual(['direita']);
    expect(modelo.partes.has('direita')).toBe(false);
    expect(modelo.partes.has('esquerda')).toBe(true);
  });

  it('peça que a montagem cita e o acervo não tem é recusada com o nome dela', async () => {
    const ruim = { ...dado, instancias: [{ id: 'x', alvo: { tipo: 'peca', ref: 'nao-existe' } }] };
    await expect(abrirMontagemDoAcervo(ruim, acervo)).rejects.toThrow("'nao-existe'");
  });
});
