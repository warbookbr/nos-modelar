/* registro-de-visoes.test.js — o seletor de visão sobre o controlador das partes.
 *
 * Os casos guardados são os que a pessoa veria como defeito sem saber nomear: a visão escolhida sumir quando a peça é refeita
 * (peça nova, junta arrastada, operação de malha), a captura automática sair em arame porque a pessoa deixou o arame
 * escolhido, e uma visão que ainda não existe ficar presa como escolhida. */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { criarControladorPartes } from '../controlar-partes.js';
import { VISOES, VISAO_PADRAO, criarSeletorDeVisao, visaoDisponivel } from './registro-de-visoes.js';

function pecaDeUmaParte() {
  const raiz = new THREE.Group();
  const grupo = new THREE.Group();
  grupo.userData.identidadeParte = 'a';
  const malha = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  malha.userData.tipo = 'superficie';
  grupo.add(malha);
  raiz.add(grupo);
  const controlador = criarControladorPartes({ raiz, partes: new Map([['a', grupo]]) });
  return { raiz, malha, controlador, contexto: { grupo: raiz, controlador } };
}

const camadaDeLinhas = (malha) => malha.children.filter((filho) => filho.isLineSegments);

describe('registro de visões', () => {
  it('tem as seis visões na ordem do seletor, com tecla própria cada uma', () => {
    expect(VISOES.map((v) => v.id)).toEqual(['solida', 'arame', 'raio-x', 'curvatura', 'zebra', 'luz-rasante']);
    const teclas = VISOES.map((v) => v.atalho);
    expect(new Set(teclas).size).toBe(teclas.length);
  });

  it('as seis funcionam, cada uma com o que aplica e o que desfaz', () => {
    expect(VISOES.filter(visaoDisponivel).map((v) => v.id)).toEqual(VISOES.map((v) => v.id));
  });
});

describe('seletor de visão', () => {
  it('aplica o arame e o raio X pelo controlador das partes e volta à sólida', () => {
    const { malha, contexto } = pecaDeUmaParte();
    const seletor = criarSeletorDeVisao();
    seletor.prender(contexto);

    expect(seletor.escolher('arame')).toEqual({ ok: true, visao: 'arame' });
    expect(malha.material.polygonOffset).toBe(true);
    expect(camadaDeLinhas(malha)).toHaveLength(1);

    seletor.escolher('raio-x');
    expect(malha.material.wireframe).toBe(true);
    expect(camadaDeLinhas(malha)).toHaveLength(0);

    seletor.escolher('solida');
    expect(malha.material.wireframe).toBe(false);
    expect(malha.material.polygonOffset).toBe(false);
    expect(camadaDeLinhas(malha)).toHaveLength(0);
  });

  /* Uma visão sem as duas funções, como as de superfície eram antes da etapa delas. */
  const comUmaEmBreve = [...VISOES.slice(0, 3), { id: 'curvatura', rotulo: 'Curvatura', atalho: 'k', dica: 'A curvatura chega numa próxima etapa da bancada.' }];

  it('recusa a visão que ainda não existe, devolve a dica e não muda a escolhida', () => {
    const { contexto } = pecaDeUmaParte();
    const mudancas = [];
    const seletor = criarSeletorDeVisao({ visoes: comUmaEmBreve, aoMudar: (v) => mudancas.push(v) });
    seletor.prender(contexto);
    seletor.escolher('arame');
    const r = seletor.escolher('curvatura');
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('indisponivel');
    expect(r.dica).toMatch(/curvatura/i);
    expect(seletor.atual).toBe('arame');
    expect(mudancas).toEqual(['arame']);
    expect(seletor.escolher('nao-existe').motivo).toBe('desconhecida');
  });

  it('a visão escolhida vale na peça refeita, como depois de uma junta ou de uma operação de malha', () => {
    const primeira = pecaDeUmaParte();
    const seletor = criarSeletorDeVisao();
    seletor.prender(primeira.contexto);
    seletor.escolher('arame');

    const refeita = pecaDeUmaParte();
    seletor.prender(refeita.contexto);
    expect(camadaDeLinhas(refeita.malha)).toHaveLength(1);
    expect(refeita.malha.material.polygonOffset).toBe(true);
  });

  /* A explosão só move os grupos (`aplicarExplosao`) e não toca material, e por isso não entra aqui. */
  it('a visão continua valendo com seleção e isolamento', () => {
    const { malha, controlador, contexto } = pecaDeUmaParte();
    const seletor = criarSeletorDeVisao();
    seletor.prender(contexto);
    seletor.escolher('raio-x');
    controlador.selecionar('a');
    controlador.definirModo('isolar');
    expect(malha.material.wireframe).toBe(true);
  });

  it('começa na visão guardada e cai na sólida quando a guardada não funciona', () => {
    expect(criarSeletorDeVisao({ inicial: 'raio-x' }).atual).toBe('raio-x');
    expect(criarSeletorDeVisao({ inicial: 'zebra' }).atual).toBe('zebra');
    expect(criarSeletorDeVisao({ visoes: comUmaEmBreve, inicial: 'curvatura' }).atual).toBe(VISAO_PADRAO);
    expect(criarSeletorDeVisao({ inicial: 'qualquer' }).atual).toBe(VISAO_PADRAO);
  });

  it('a captura não herda a visão da pessoa: suspenso, o seletor desfaz a visão e não a aplica em peça nova', () => {
    const { malha, contexto } = pecaDeUmaParte();
    const seletor = criarSeletorDeVisao({ inicial: 'arame' });
    seletor.prender(contexto);
    expect(camadaDeLinhas(malha)).toHaveLength(1);

    seletor.suspender();
    expect(camadaDeLinhas(malha)).toHaveLength(0);
    expect(malha.material.polygonOffset).toBe(false);

    const nova = pecaDeUmaParte();
    seletor.prender(nova.contexto);
    expect(camadaDeLinhas(nova.malha)).toHaveLength(0);

    seletor.retomar();
    expect(camadaDeLinhas(nova.malha)).toHaveLength(1);
    expect(seletor.atual).toBe('arame');
  });
});
