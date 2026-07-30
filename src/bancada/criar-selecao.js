/* criar-selecao.js — raycast da bancada com seleção múltipla e foco por duplo clique. */
import * as THREE from 'three';

export function criarSelecaoBancada({
  canvas,
  cameraAtual,
  raiz,
  nomeDoObjeto,
  aoSelecionar,
  aoFocar,
}) {
  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  let inicio = null;

  function hit(evento) {
    const rect = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, cameraAtual());
    return raycaster.intersectObject(raiz, true)
      .map((item) => ({ ...item, nome: nomeDoObjeto(item.object) }))
      .find((item) => item.nome);
  }

  function aoMover(evento) {
    canvas.style.cursor = hit(evento) ? 'pointer' : 'grab';
  }

  function aoPressionar(evento) {
    inicio = [evento.clientX, evento.clientY];
  }

  function aoSoltar(evento) {
    if (!inicio) return;
    const deslocamento = Math.hypot(evento.clientX - inicio[0], evento.clientY - inicio[1]);
    inicio = null;
    if (deslocamento > 5) return;
    const alvo = hit(evento);
    aoSelecionar?.(alvo?.nome ?? null, {
      aditiva: evento.shiftKey || evento.ctrlKey || evento.metaKey,
    });
  }

  function aoDuploClique(evento) {
    const alvo = hit(evento);
    if (alvo?.nome) aoFocar?.(alvo.nome);
  }

  canvas.addEventListener('pointermove', aoMover);
  canvas.addEventListener('pointerdown', aoPressionar);
  canvas.addEventListener('pointerup', aoSoltar);
  canvas.addEventListener('dblclick', aoDuploClique);

  return {
    destruir() {
      canvas.removeEventListener('pointermove', aoMover);
      canvas.removeEventListener('pointerdown', aoPressionar);
      canvas.removeEventListener('pointerup', aoSoltar);
      canvas.removeEventListener('dblclick', aoDuploClique);
    },
  };
}
