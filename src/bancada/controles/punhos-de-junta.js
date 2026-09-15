/* punhos-de-junta.js — o punho no canto onde as partes se encontram.
 *
 * A seta de parâmetro puxa uma parte pelo número que a receita declara, e num
 * quadro em treliça isso não existe: nenhum número empurra um tubo inteiro sem
 * descolar as juntas. O punho aqui é outra coisa. Ele não aponta para
 * parâmetro nenhum, aponta para o canto, e arrastá-lo deforma as partes que
 * passam por ali. O que sai do gesto é malha; virar receita é trabalho da
 * rodada de absorção, depois.
 *
 * PLANO DO ARRASTO. O ponteiro tem duas liberdades e o canto tem três, então
 * algo precisa decidir a terceira. O punho anda no plano que passa pelo canto e
 * encara a câmera: é o único plano em que cada pixel do ponteiro vale a mesma
 * distância em qualquer direção, e é o que a pessoa vê. Para mexer na dimensão
 * que ficou de fora, ela gira a câmera e arrasta de novo.
 *
 * A bola tem tamanho constante na tela, pela mesma conta das setas: fração da
 * distância até a câmera. Sem isso o punho some quando a peça está longe e
 * engole a peça quando está perto. */

import * as THREE from 'three';

const FRACAO_DA_DISTANCIA = 1 / 90;
const COR = 0xffb347;
const COR_REALCE = 0xffffff;

export function criarPunhosDeJunta({
  cena, canvas, cameraAtual,
  /* A peça é redimensionada para caber no estúdio. O arrasto é medido em mundo
     e o ajuste é gravado nas unidades da peça, então a escala precisa sair. */
  escalaDoModelo = () => 1,
  aoArrastar = () => {},
  aoSoltar = () => {},
}) {
  const raiz = new THREE.Group();
  raiz.name = '__punhos_de_junta__';
  raiz.visible = false;
  cena.add(raiz);

  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  const geometria = new THREE.SphereGeometry(1, 16, 12);
  const punhos = new Map();
  let arrasto = null;

  function emPixels(evento) {
    const rect = canvas.getBoundingClientRect();
    return { x: evento.clientX - rect.left, y: evento.clientY - rect.top, rect };
  }

  function limpar() {
    for (const punho of punhos.values()) {
      punho.malha.removeFromParent();
      punho.material.dispose();
    }
    punhos.clear();
  }

  /**
   * Desenha um punho por junta.
   *
   * `juntas` traz nome e posição em unidades da peça; `paraMundo` é a matriz do
   * modelo na cena, porque a peça foi movida e redimensionada para caber no
   * estúdio e o punho precisa aparecer em cima do canto, não onde ele estaria
   * se a peça estivesse na origem.
   */
  function mostrar(juntas, paraMundo) {
    /* No meio de um arrasto a malha é reconstruída a cada movimento, e
       reconstruir chama isto de novo. Redesenhar aqui apagaria o punho que a
       pessoa está segurando e o gesto morreria no primeiro movimento. */
    if (arrasto) return raiz.visible;
    limpar();
    if (!Array.isArray(juntas) || juntas.length === 0) {
      raiz.visible = false;
      return false;
    }
    for (const junta of juntas) {
      const material = new THREE.MeshBasicMaterial({ color: COR, depthTest: false, transparent: true, opacity: 0.9 });
      const malha = new THREE.Mesh(geometria, material);
      malha.position.fromArray(junta.posicao);
      if (paraMundo) malha.position.applyMatrix4(paraMundo);
      malha.renderOrder = 998;
      malha.userData.junta = junta.nome;
      raiz.add(malha);
      punhos.set(junta.nome, { malha, material, nome: junta.nome });
    }
    raiz.visible = true;
    atualizarEscala();
    return true;
  }

  function esconder() {
    if (arrasto) return raiz.visible;
    limpar();
    raiz.visible = false;
    return false;
  }

  function atualizarEscala() {
    if (!raiz.visible) return;
    const camera = cameraAtual();
    for (const punho of punhos.values()) {
      const distancia = camera.position.distanceTo(punho.malha.position);
      punho.malha.scale.setScalar(Math.max(distancia * FRACAO_DA_DISTANCIA, 1e-4));
    }
  }

  function realcar(alvo) {
    for (const punho of punhos.values()) {
      punho.material.color.setHex(punho === alvo ? COR_REALCE : COR);
      punho.material.opacity = punho === alvo ? 1 : 0.9;
    }
  }

  function punhoSobOPonteiro(evento) {
    if (!raiz.visible) return null;
    const { x, y, rect } = emPixels(evento);
    ponteiro.x = (x / rect.width) * 2 - 1;
    ponteiro.y = -(y / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, cameraAtual());
    for (const item of raycaster.intersectObject(raiz, true)) {
      const nome = item.object.userData.junta;
      if (nome) return punhos.get(nome);
    }
    return null;
  }

  /* Onde o ponteiro encosta no plano que passa pelo canto e encara a câmera. */
  function pontoNoPlano(evento, plano) {
    const { x, y, rect } = emPixels(evento);
    ponteiro.x = (x / rect.width) * 2 - 1;
    ponteiro.y = -(y / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, cameraAtual());
    const destino = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plano, destino) ? destino : null;
  }

  function aoPassar(evento) {
    if (arrasto || !raiz.visible) return;
    const punho = punhoSobOPonteiro(evento);
    realcar(punho);
    if (punho) canvas.style.cursor = 'grab';
  }

  function aoPressionar(evento) {
    const punho = punhoSobOPonteiro(evento);
    if (!punho) return;
    /* Antes da órbita e da seleção: sem parar aqui, o mesmo gesto giraria a
       câmera e trocaria a peça selecionada enquanto arrasta. */
    evento.stopPropagation();
    evento.preventDefault();
    const normal = cameraAtual().getWorldDirection(new THREE.Vector3()).negate();
    const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, punho.malha.position.clone());
    const partida = pontoNoPlano(evento, plano);
    if (!partida) return;
    arrasto = { punho, plano, partida, origem: punho.malha.position.clone() };
    canvas.setPointerCapture?.(evento.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function aoMover(evento) {
    if (!arrasto) return;
    evento.stopPropagation();
    const agora = pontoNoPlano(evento, arrasto.plano);
    if (!agora) return;
    const escala = escalaDoModelo() || 1;
    const emMundo = agora.clone().sub(arrasto.partida);
    arrasto.punho.malha.position.copy(arrasto.origem).add(emMundo);
    aoArrastar(arrasto.punho.nome, [emMundo.x / escala, emMundo.y / escala, emMundo.z / escala]);
  }

  function encerrar(evento) {
    if (!arrasto) return;
    evento.stopPropagation();
    const nome = arrasto.punho.nome;
    arrasto = null;
    canvas.releasePointerCapture?.(evento.pointerId);
    canvas.style.cursor = '';
    aoSoltar(nome);
  }

  canvas.addEventListener('pointerdown', aoPressionar, true);
  canvas.addEventListener('pointermove', aoMover, true);
  canvas.addEventListener('pointermove', aoPassar);
  canvas.addEventListener('pointerup', encerrar, true);
  canvas.addEventListener('pointercancel', encerrar, true);

  return {
    raiz,
    mostrar,
    esconder,
    atualizarEscala,
    get arrastando() { return Boolean(arrasto); },
    get visivel() { return raiz.visible; },
    destruir() {
      canvas.removeEventListener('pointerdown', aoPressionar, true);
      canvas.removeEventListener('pointermove', aoMover, true);
      canvas.removeEventListener('pointermove', aoPassar);
      canvas.removeEventListener('pointerup', encerrar, true);
      canvas.removeEventListener('pointercancel', encerrar, true);
      limpar();
      geometria.dispose();
      raiz.removeFromParent();
    },
  };
}
