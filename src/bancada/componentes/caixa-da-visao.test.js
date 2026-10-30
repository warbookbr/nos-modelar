/* caixa-da-visao.test.js — a caixa das visões de superfície: aparece com a visão, mostra o controle que ela pede e some ao voltar
 * para a sólida; o deslizante muda a visão; a soltura do ponteiro e o relógio de quadros chegam às visões por ela. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { adaptarThree } from '../../autoria/adaptar-three.js';
import { executarReceita } from '../../autoria/executar-receita.js';
import receitaComVinco from '../../../tools/fixtures/lataria-com-vinco/receita.js';
import { criarControladorPartes } from '../controlar-partes.js';
import { criarSeletorDeVisao } from '../visoes/registro-de-visoes.js';
import { larguraDaZebra } from '../visoes/visao-zebra.js';
import { azimuteDaLuzRasante } from '../visoes/visao-luz-rasante.js';
import { corCss, montarCaixaDaVisao } from './caixa-da-visao.js';
import { criarEvento, criarPagina } from './dom-de-teste.js';

function montar() {
  const { documento, janela } = criarPagina('<div id="bancadaApp"><canvas id="cenaBancada"></canvas></div>');
  const canvas = documento.getElementById('cenaBancada');
  canvas.parentElement = canvas.parentNode;
  const pagina = montarCaixaDaVisao({ canvas, documento, janela });
  const { neutro } = executarReceita(receitaComVinco);
  const adaptado = adaptarThree(neutro, { nome: 'lataria-com-vinco' });
  const controlador = criarControladorPartes({ raiz: adaptado.raiz, partes: adaptado.partes });
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight());
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  camera.position.set(0.4, 5, 0.3);
  camera.lookAt(0.4, 0, 0.3);
  const ambiente = { scene, camera };
  const seletor = criarSeletorDeVisao({ pagina });
  seletor.prender({ grupo: adaptado.raiz, controlador, ambiente, modelo: { nome: 'lataria-com-vinco', neutro, receita: receitaComVinco, ...adaptado } });
  return { documento, janela, pagina, seletor, ambiente, caixa: () => documento.getElementById('painelVisao') };
}

describe('caixa da visão', () => {
  it('a cor da amostra é a da cena levada à tela pela curva do sRGB', () => {
    expect(corCss([1, 1, 1])).toBe('rgb(255 255 255)');
    expect(corCss([0.2, 0.2, 0.2])).toBe('rgb(124 124 124)');
  });

  it('aparece só com a visão de superfície, com o controle dela, e some ao voltar para a sólida', () => {
    const { seletor, caixa, documento } = montar();
    expect(caixa()).toBeNull();
    seletor.escolher('zebra');
    expect(caixa().dataset.visao).toBe('zebra');
    expect(caixa().parentNode.id).toBe('bancadaApp');
    const entrada = caixa().querySelector('input');
    entrada.value = '9';
    entrada.dispatchEvent(criarEvento('input'));
    expect(larguraDaZebra()).toBe(9);
    expect(caixa().querySelector('output').textContent).toBe('9°');

    seletor.escolher('arame');
    expect(caixa()).toBeNull();
    expect(documento.querySelectorAll('section')).toHaveLength(0);
  });

  it('a luz rasante anda com o relógio de quadros enquanto dura, e o deslizante muda a direção', () => {
    const { seletor, caixa, janela, ambiente } = montar();
    seletor.escolher('luz-rasante');
    expect(janela.quadrosPendentes()).toBe(1);
    const sol = ambiente.scene.getObjectByName('__luz_rasante__');
    const antes = sol.position.clone();
    ambiente.camera.position.set(3, 3, 3);
    ambiente.camera.lookAt(0.4, 0, 0.3);
    janela.avancarQuadro();
    expect(sol.position.distanceTo(antes)).toBeGreaterThan(0.01);

    const entrada = caixa().querySelector('input');
    entrada.value = '125';
    entrada.dispatchEvent(criarEvento('input'));
    expect(azimuteDaLuzRasante(ambiente)).toBe(125);
    expect(caixa().dataset.azimute).toBe(String(azimuteDaLuzRasante(ambiente)));

    seletor.escolher('solida');
    expect(janela.quadrosPendentes()).toBe(0);
    expect(caixa()).toBeNull();
  });

  it('a curvatura ouve a soltura do ponteiro só enquanto dura', () => {
    const { seletor, janela } = montar();
    const ouvintes = () => janela.lista.filter((o) => ['pointerdown', 'pointerup', 'pointercancel', 'keyup'].includes(o.tipo)).length;
    seletor.escolher('curvatura');
    expect(ouvintes()).toBe(4);
    seletor.escolher('solida');
    expect(ouvintes()).toBe(0);
  });
});
