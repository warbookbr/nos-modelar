/* punho-da-imagem.js — arrastar a imagem de referência na cena.
 *
 * Os controles de posição existem como três barras no painel, e mexer numa
 * barra para achar onde a foto deve ficar é procurar às cegas: a pessoa olha o
 * modelo e arrasta o número num canto da tela. O punho põe o gesto onde ela está
 * olhando.
 *
 * Ele não toca no modelo. A imagem é plano de fundo, e a fronteira entre
 * referência visual e modelo procedural continua a mesma: o que sai daqui é o
 * alinhamento da foto, que não entra na receita e não entra no enquadramento. */

import * as THREE from 'three';
import { criarGizmoDeSetas } from '../controles/gizmo-de-setas.js';

export function criarPunhoDaImagem({
  cena, canvas, cameraAtual,
  alinhamentoAtual = () => null,
  aoArrastar = () => {},
}) {
  const gizmo = criarGizmoDeSetas({
    pai: cena, canvas, cameraAtual, nome: '__gizmo_da_imagem__', fracaoDaDistancia: 1 / 10,
  });

  let arrasto = null;

  function refletir() {
    if (arrasto) return;
    const alinhamento = alinhamentoAtual();
    if (!alinhamento) return gizmo.esconder();
    return gizmo.mostrar([alinhamento.x, alinhamento.y, alinhamento.z]);
  }

  function aoPressionar(evento) {
    if (evento.button !== 0) return;
    const eixo = gizmo.eixoSobOPonteiro(evento);
    if (eixo === null) return;
    const alinhamento = alinhamentoAtual();
    if (!alinhamento) return;
    /* Antes da órbita e da seleção da peça: sem parar aqui, o mesmo gesto giraria
       a câmera e escolheria uma parte enquanto arrasta a foto. */
    evento.stopPropagation();
    evento.preventDefault();
    const origem = new THREE.Vector3(alinhamento.x, alinhamento.y, alinhamento.z);
    const normal = cameraAtual().getWorldDirection(new THREE.Vector3()).negate();
    const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origem.clone());
    const partida = gizmo.pontoNoPlano(evento, plano);
    if (!partida) return;
    arrasto = { eixo, plano, partida, origem };
    canvas.setPointerCapture?.(evento.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function aoMover(evento) {
    if (!arrasto) {
      const eixo = gizmo.eixoSobOPonteiro(evento);
      gizmo.realcar(eixo);
      if (eixo !== null) canvas.style.cursor = 'grab';
      return;
    }
    evento.stopPropagation();
    const agora = gizmo.pontoNoPlano(evento, arrasto.plano);
    if (!agora) return;
    /* Só a casa do eixo pego. A seta diz qual direção o gesto tem, e deixar as
       outras duas andarem junto faria a foto sair do lugar em eixos que a pessoa
       não apontou. */
    const eixos = ['x', 'y', 'z'];
    const delta = agora.clone().sub(arrasto.partida).toArray()[arrasto.eixo];
    const destino = { [eixos[arrasto.eixo]]: arrasto.origem.toArray()[arrasto.eixo] + delta };
    gizmo.mostrar([
      destino.x ?? arrasto.origem.x,
      destino.y ?? arrasto.origem.y,
      destino.z ?? arrasto.origem.z,
    ]);
    aoArrastar(destino);
  }

  function encerrar(evento) {
    if (!arrasto) return;
    evento.stopPropagation();
    arrasto = null;
    canvas.releasePointerCapture?.(evento.pointerId);
    canvas.style.cursor = '';
    refletir();
  }

  canvas.addEventListener('pointerdown', aoPressionar, true);
  canvas.addEventListener('pointermove', aoMover, true);
  canvas.addEventListener('pointerup', encerrar, true);
  canvas.addEventListener('pointercancel', encerrar, true);

  return {
    refletir,
    acompanharCamera: () => { refletir(); gizmo.acompanharCamera(); },
    get arrastando() { return Boolean(arrasto); },
    destruir() {
      canvas.removeEventListener('pointerdown', aoPressionar, true);
      canvas.removeEventListener('pointermove', aoMover, true);
      canvas.removeEventListener('pointerup', encerrar, true);
      canvas.removeEventListener('pointercancel', encerrar, true);
      gizmo.destruir();
    },
  };
}
