/* gizmo-de-setas.js — as três setas por eixo, desenhadas e clicáveis.
 *
 * Só o punho mora aqui: a forma das setas, o tamanho constante na tela, o realce
 * sob o ponteiro e a pergunta "o ponteiro está em cima de qual eixo?". O que o
 * arrasto FAZ é de quem usa — mover vértices, mover a peça, mover a imagem de
 * referência —, porque cada um desses tem regra própria de trava, ímã, valor
 * digitado e desfazer.
 *
 * Existe porque o mesmo punho passou a ser preciso em dois lugares, e duas
 * cópias do mesmo desenho envelhecem em velocidades diferentes: a correção do
 * alvo de clique que a edição recebeu não chegaria à imagem.
 *
 * O ALVO DE CLIQUE NÃO COBRE O CENTRO. Ele ia da base à ponta, e a base fica em
 * cima do que está selecionado: clicar ali pegava a seta em vez de selecionar. E
 * ele é o dobro do que seria proporcional à haste desenhada, porque a haste é
 * fina e pegar a seta não pode exigir pontaria. Como é invisível, engrossar não
 * muda a imagem. */

import * as THREE from 'three';

export const EIXOS_DO_GIZMO = [
  { eixo: 0, direcao: new THREE.Vector3(1, 0, 0), cor: 0xff5a52 },
  { eixo: 1, direcao: new THREE.Vector3(0, 1, 0), cor: 0x46d67f },
  { eixo: 2, direcao: new THREE.Vector3(0, 0, 1), cor: 0x5a8bff },
];

const RAIO_DO_ALVO = 0.18;

/**
 * @param {object} opcoes
 * @param {THREE.Object3D} opcoes.pai  onde o punho é pendurado. Pendurar na raiz
 *   do modelo faz o punho herdar a colocação no estúdio; pendurar na cena deixa
 *   as coordenadas em mundo.
 * @param {number} opcoes.fracaoDaDistancia  tamanho na tela, como fração da
 *   distância até a câmera.
 */
export function criarGizmoDeSetas({ pai, canvas, cameraAtual, fracaoDaDistancia = 1 / 16, nome = '__gizmo_de_setas__' }) {
  const raiz = new THREE.Group();
  raiz.name = nome;
  raiz.visible = false;
  raiz.renderOrder = 1000;
  pai.add(raiz);

  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  const materiais = [];

  for (const { eixo, direcao, cor } of EIXOS_DO_GIZMO) {
    const material = new THREE.MeshBasicMaterial({ color: cor, depthTest: false, transparent: true });
    materiais.push({ material, cor });
    const braco = new THREE.Group();
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 8), material);
    haste.position.y = 0.4;
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 10), material);
    ponta.position.y = 0.9;
    const alvo = new THREE.Mesh(
      new THREE.CylinderGeometry(RAIO_DO_ALVO, RAIO_DO_ALVO, 0.75, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    alvo.position.y = 0.65;
    braco.add(haste, ponta, alvo);
    braco.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao);
    braco.userData.eixoDoGizmo = eixo;
    raiz.add(braco);
  }

  /** Põe o punho num ponto, nas coordenadas do pai. */
  function mostrar(posicao) {
    if (!posicao) return esconder();
    raiz.visible = true;
    raiz.position.fromArray(Array.isArray(posicao) ? posicao : posicao.toArray());
    acompanharCamera();
    return true;
  }

  function esconder() {
    raiz.visible = false;
    return false;
  }

  function acompanharCamera() {
    if (!raiz.visible) return;
    const camera = cameraAtual();
    pai.updateMatrixWorld(true);
    const naCena = raiz.position.clone().applyMatrix4(pai.matrixWorld);
    const distancia = camera.position.distanceTo(naCena);
    const escalaDoPai = pai.scale?.x || 1;
    raiz.scale.setScalar(Math.max((distancia * fracaoDaDistancia) / escalaDoPai, 1e-4));
  }

  function apontar(evento) {
    const rect = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, cameraAtual());
  }

  /** O eixo sob o ponteiro, ou null. */
  function eixoSobOPonteiro(evento) {
    if (!raiz.visible) return null;
    apontar(evento);
    for (const item of raycaster.intersectObject(raiz, true)) {
      let no = item.object;
      while (no && no.userData.eixoDoGizmo === undefined) no = no.parent;
      if (no) return no.userData.eixoDoGizmo;
    }
    return null;
  }

  /** Onde o ponteiro encosta num plano, em coordenadas de mundo. */
  function pontoNoPlano(evento, plano) {
    apontar(evento);
    const destino = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plano, destino) ? destino : null;
  }

  function realcar(eixo) {
    for (const [i, { material, cor }] of materiais.entries()) {
      material.color.setHex(i === eixo ? 0xffffff : cor);
    }
  }

  return {
    raiz,
    mostrar,
    esconder,
    acompanharCamera,
    eixoSobOPonteiro,
    pontoNoPlano,
    realcar,
    get visivel() { return raiz.visible; },
    destruir() {
      for (const { material } of materiais) material.dispose();
      raiz.traverse((no) => no.geometry?.dispose());
      raiz.removeFromParent();
    },
  };
}
