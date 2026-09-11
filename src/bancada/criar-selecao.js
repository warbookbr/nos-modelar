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
  let arrastando = false;

  function hit(evento) {
    const rect = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, cameraAtual());
    return raycaster.intersectObject(raiz, true)
      .map((item) => ({ ...item, nome: nomeDoObjeto(item.object) }))
      .find((item) => item.nome);
  }

  /* Enquanto o botão está apertado o ponteiro não muda de forma. Antes o
     raycast rodava a cada movimento também durante o arrasto, e como a câmera
     gira junto o raio entrava e saía da peça muitas vezes por segundo: o cursor
     piscava entre a seta e a mão no meio da órbita. Durante o arrasto a única
     forma correta é a mão fechada, e o raycast nem precisa rodar. */
  function aoMover(evento) {
    if (arrastando) return;
    canvas.style.cursor = hit(evento) ? 'pointer' : 'grab';
  }

  function aoPressionar(evento) {
    inicio = [evento.clientX, evento.clientY];
    arrastando = true;
    canvas.style.cursor = 'grabbing';
    /* Capturar o ponteiro faz o soltar chegar aqui mesmo que aconteça fora da
       tela do desenho. Sem isso, soltar sobre um painel deixava o cursor preso
       na mão fechada. */
    canvas.setPointerCapture?.(evento.pointerId);
  }

  function encerrarArrasto(evento) {
    arrastando = false;
    canvas.releasePointerCapture?.(evento.pointerId);
    canvas.style.cursor = hit(evento) ? 'pointer' : 'grab';
  }

  function aoCancelar(evento) {
    inicio = null;
    encerrarArrasto(evento);
  }

  function aoSoltar(evento) {
    encerrarArrasto(evento);
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
  canvas.addEventListener('pointercancel', aoCancelar);
  canvas.addEventListener('dblclick', aoDuploClique);

  return {
    destruir() {
      canvas.removeEventListener('pointermove', aoMover);
      canvas.removeEventListener('pointerdown', aoPressionar);
      canvas.removeEventListener('pointerup', aoSoltar);
      canvas.removeEventListener('pointercancel', aoCancelar);
      canvas.removeEventListener('dblclick', aoDuploClique);
    },
  };
}
