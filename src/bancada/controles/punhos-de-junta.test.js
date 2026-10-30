/* punhos-de-junta.test.js — o punho de junta tem diâmetro constante em pixels na tela, em qualquer altura de janela, distância e projeção, e o alvo do clique é um círculo de 24 pixels em volta do centro, onde vence o punho mais perto do ponteiro. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { criarPunhosDeJunta } from './punhos-de-junta.js';

/* Um canvas falso do tamanho pedido, que guarda os ouvintes para o teste disparar o ponteiro. */
function canvasDe(largura, altura) {
  const ouvintes = [];
  return {
    style: {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: largura, height: altura }),
    addEventListener: (tipo, funcao) => ouvintes.push({ tipo, funcao }),
    removeEventListener() {},
    disparar(tipo, x, y) {
      const evento = { button: 0, clientX: x, clientY: y, pointerId: 1, stopPropagation() {}, preventDefault() {} };
      for (const ouvinte of ouvintes) if (ouvinte.tipo === tipo) ouvinte.funcao(evento);
    },
  };
}

function perspectiva(largura, altura, distancia) {
  const camera = new THREE.PerspectiveCamera(45, largura / altura, 0.01, 100);
  camera.position.set(0, 0, distancia);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

function ortografica(largura, altura, zoom) {
  const camera = new THREE.OrthographicCamera(-2 * largura / altura, 2 * largura / altura, 2, -2, 0.01, 100);
  camera.position.set(0, 0, 10);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

function montar({ camera, largura, altura, juntas }) {
  const cena = new THREE.Scene();
  const canvas = canvasDe(largura, altura);
  const arrastadas = [];
  const punhos = criarPunhosDeJunta({ cena, canvas, cameraAtual: () => camera, aoArrastar: (nome) => arrastadas.push(nome) });
  punhos.mostrar(juntas);
  punhos.atualizarEscala();
  /* o quadro desenhado atualiza as matrizes; aqui não há quadro */
  cena.updateMatrixWorld(true);
  return { punhos, canvas, camera, arrastadas };
}

/* O raio do punho desenhado, em pixels: o centro e a borda da esfera, projetados na tela. */
function raioEmPixels(punhos, camera, largura, altura) {
  const malha = punhos.raiz.children[0];
  const emTela = (v) => {
    const p = v.clone().project(camera);
    return [((p.x + 1) / 2) * largura, ((1 - p.y) / 2) * altura];
  };
  const direita = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const [cx, cy] = emTela(malha.position);
  const [bx, by] = emTela(malha.position.clone().addScaledVector(direita, malha.scale.x));
  return Math.hypot(bx - cx, by - cy);
}

/* O ponto da tela onde cai um ponto do mundo. */
function naTela(ponto, camera, largura, altura) {
  const p = new THREE.Vector3(...ponto).project(camera);
  return [((p.x + 1) / 2) * largura, ((1 - p.y) / 2) * altura];
}

describe('punhos de junta', () => {
  it('têm 12 pixels de diâmetro na tela, em qualquer altura de janela e distância da câmera', () => {
    for (const [largura, altura] of [[1400, 900], [700, 450]]) {
      for (const distancia of [2, 8]) {
        const camera = perspectiva(largura, altura, distancia);
        const { punhos } = montar({ camera, largura, altura, juntas: [{ nome: 'canto', posicao: [0.1, 0.05, 0] }] });
        expect(raioEmPixels(punhos, camera, largura, altura)).toBeCloseTo(6, 1);
      }
    }
  });

  it('têm 12 pixels de diâmetro também na projeção ortográfica, acompanhando o zoom', () => {
    for (const zoom of [1, 3]) {
      const camera = ortografica(1400, 900, zoom);
      const { punhos } = montar({ camera, largura: 1400, altura: 900, juntas: [{ nome: 'canto', posicao: [0, 0, 0] }] });
      expect(raioEmPixels(punhos, camera, 1400, 900)).toBeCloseTo(6, 1);
    }
  });

  it('o alvo do clique tem 12 pixels de raio em volta do centro, maior que o desenho', () => {
    const camera = perspectiva(1400, 900, 4);
    const { canvas, arrastadas } = montar({ camera, largura: 1400, altura: 900, juntas: [{ nome: 'canto', posicao: [0, 0, 0] }] });
    const [x, y] = naTela([0, 0, 0], camera, 1400, 900);
    canvas.disparar('pointerdown', x + 13, y);
    canvas.disparar('pointermove', x + 20, y);
    canvas.disparar('pointerup', x + 20, y);
    expect(arrastadas).toEqual([]);
    canvas.disparar('pointerdown', x + 11, y);
    canvas.disparar('pointermove', x + 20, y);
    canvas.disparar('pointerup', x + 20, y);
    expect(arrastadas).toEqual(['canto']);
  });

  it('com dois alvos sobrepostos, pega o punho de centro mais perto do ponteiro, e não o mais perto da câmera', () => {
    const camera = perspectiva(1400, 900, 4);
    /* `frente` fica mais perto da câmera e a 3 pixels do ponteiro; `fundo` fica atrás, com o centro embaixo dele */
    const juntas = [{ nome: 'fundo', posicao: [0, 0, -1] }, { nome: 'frente', posicao: [0.012, 0, 0] }];
    const { canvas, arrastadas } = montar({ camera, largura: 1400, altura: 900, juntas });
    const [x, y] = naTela([0, 0, -1], camera, 1400, 900);
    canvas.disparar('pointerdown', x, y);
    canvas.disparar('pointermove', x + 20, y);
    canvas.disparar('pointerup', x + 20, y);
    expect(arrastadas).toEqual(['fundo']);
  });
});
