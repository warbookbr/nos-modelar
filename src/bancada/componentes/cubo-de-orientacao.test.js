/* cubo-de-orientacao.test.js — o giro do cubo é o da câmera com o y da página trocado, a face que a câmera olha fica de frente para quem vê, e o cubo gira a cada quadro. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { VISTAS_BANCADA } from '../estado-bancada.js';
import { criarPagina } from './dom-de-teste.js';
import { matrizDoCubo, montarCuboDeOrientacao } from './cubo-de-orientacao.js';

/** A matriz de vista de uma câmera em `direcao` olhando para a origem, como a bancada põe as vistas canônicas. */
function vistaDe(direcao) {
  const camera = new THREE.PerspectiveCamera();
  const vertical = Math.abs(direcao[1]) > 0.99;
  camera.up.set(0, vertical ? 0 : 1, vertical ? (direcao[1] > 0 ? -1 : 1) : 0);
  camera.position.set(...direcao).normalize().multiplyScalar(5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return camera.matrixWorldInverse.elements;
}

/** Para onde a transformação do cubo leva o centro de uma face (em coordenadas da página, z para quem vê). */
function centroNaTela(transformacao, ponto) {
  const valores = transformacao.match(/matrix3d\((.*)\)/)[1].split(',').map(Number);
  const m = new THREE.Matrix4().fromArray(valores);
  return new THREE.Vector3(...ponto).applyMatrix4(m);
}

/* O centro de cada face no cubo da página, com y para baixo: a face de cima fica em -y. */
const FACES = { frontal: [0, 0, 1], traseira: [0, 0, -1], direita: [1, 0, 0], esquerda: [-1, 0, 0], superior: [0, -1, 0], inferior: [0, 1, 0] };

describe('cubo de orientação', () => {
  it.each(Object.keys(FACES))('na vista %s a face dela fica de frente para quem vê', (vista) => {
    const transformacao = matrizDoCubo(vistaDe(VISTAS_BANCADA[vista].direcao));
    const centro = centroNaTela(transformacao, FACES[vista]);
    expect(centro.z).toBeCloseTo(1, 5);
    expect(Math.hypot(centro.x, centro.y)).toBeCloseTo(0, 5);
  });

  it('na isométrica a face de cima fica em cima na tela e a da frente embaixo à esquerda', () => {
    const transformacao = matrizDoCubo(vistaDe(VISTAS_BANCADA.isometrica.direcao));
    expect(centroNaTela(transformacao, FACES.superior).y).toBeLessThan(0);
    const frente = centroNaTela(transformacao, FACES.frontal);
    expect(frente.x).toBeLessThan(0);
    expect(frente.y).toBeGreaterThan(0);
    expect(centroNaTela(transformacao, FACES.traseira).z).toBeLessThan(0);
  });

  it('gira a cada quadro e não reescreve a transformação parada', () => {
    const pagina = criarPagina('<div id="corpoCubo"></div>');
    let vista = vistaDe([0, 0, 1]);
    const cubo = montarCuboDeOrientacao({ elementos: { corpo: pagina.$('corpoCubo') }, orientacao: () => vista, janela: pagina.janela });
    const primeira = pagina.$('corpoCubo').style.transform;
    expect(primeira).toMatch(/^matrix3d\(/);
    vista = vistaDe([1, 0, 0]);
    pagina.janela.avancarQuadro();
    expect(pagina.$('corpoCubo').style.transform).not.toBe(primeira);
    cubo.parar();
    expect(pagina.janela.quadrosPendentes()).toBe(0);
  });
});
