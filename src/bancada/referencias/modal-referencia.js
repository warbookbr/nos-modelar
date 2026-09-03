/* modal-referencia.js — lightbox modal interativo para imagens de referência com zoom e pan. */

export function criarModalReferencia() {
  let modalEl = document.getElementById('modalReferenciaVisual');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'modalReferenciaVisual';
    modalEl.className = 'modal-referencia';
    modalEl.hidden = true;
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'modalRefTitulo');

    modalEl.innerHTML = `
      <div class="modal-backdrop" data-acao="fechar"></div>
      <div class="modal-conteudo">
        <header class="modal-topo">
          <div class="modal-titulos">
            <span class="rotulo">REFERÊNCIA VISUAL</span>
            <h3 id="modalRefTitulo" class="modal-titulo">Imagem de Referência</h3>
            <p id="modalRefDescricao" class="modal-descricao"></p>
          </div>
          <div class="modal-controles">
            <div class="grupo-zoom" role="toolbar" aria-label="Controles de zoom">
              <button type="button" class="btn-zoom" id="btnZoomMenos" title="Diminuir zoom (ou tecla -)" aria-label="Diminuir zoom">−</button>
              <span class="nivel-zoom" id="lblNivelZoom" aria-live="polite">100%</span>
              <button type="button" class="btn-zoom" id="btnZoomMais" title="Aumentar zoom (ou tecla +)" aria-label="Aumentar zoom">+</button>
              <button type="button" class="btn-zoom btn-zoom-reset" id="btnZoomReset" title="Restaurar tamanho original (100%)">1:1</button>
            </div>
            <button type="button" class="btn-fechar-modal" id="btnFecharModalRef" data-acao="fechar" title="Fechar (Esc)" aria-label="Fechar modal">✕</button>
          </div>
        </header>
        <div class="modal-viewport" id="modalViewportRef">
          <div class="modal-palco" id="modalPalcoRef">
            <img id="modalImgRef" class="modal-img" src="" alt="Referência visual" draggable="false" />
          </div>
          <div class="modal-instrucao-rodape">
            <span>Roda do mouse: zoom</span> • <span>Arraste: mover</span> • <kbd>Esc</kbd> fechar
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  const tituloEl = modalEl.querySelector('#modalRefTitulo');
  const descricaoEl = modalEl.querySelector('#modalRefDescricao');
  const imgEl = modalEl.querySelector('#modalImgRef');
  const palcoEl = modalEl.querySelector('#modalPalcoRef');
  const viewportEl = modalEl.querySelector('#modalViewportRef');
  const lblZoomEl = modalEl.querySelector('#lblNivelZoom');
  const btnMais = modalEl.querySelector('#btnZoomMais');
  const btnMenos = modalEl.querySelector('#btnZoomMenos');
  const btnReset = modalEl.querySelector('#btnZoomReset');
  const btnFechar = modalEl.querySelector('#btnFecharModalRef');
  const backdropEl = modalEl.querySelector('.modal-backdrop');

  let zoom = 1.0;
  let panX = 0;
  let panY = 0;
  let arrastando = false;
  let inicioX = 0;
  let inicioY = 0;

  function atualizarTransformacao() {
    if (!palcoEl) return;
    palcoEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    if (lblZoomEl) {
      lblZoomEl.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  function alterarZoom(delta, centroX = null, centroY = null) {
    const zoomAnterior = zoom;
    if (delta > 0) {
      zoom = Math.min(6.0, zoom * 1.25);
    } else {
      zoom = Math.max(0.4, zoom / 1.25);
    }

    if (centroX !== null && centroY !== null && viewportEl) {
      const rect = viewportEl.getBoundingClientRect();
      const vx = centroX - rect.left - rect.width / 2;
      const vy = centroY - rect.top - rect.height / 2;
      const proporcao = zoom / zoomAnterior;
      panX = vx - (vx - panX) * proporcao;
      panY = vy - (vy - panY) * proporcao;
    }
    atualizarTransformacao();
  }

  function resetarZoom() {
    zoom = 1.0;
    panX = 0;
    panY = 0;
    atualizarTransformacao();
  }

  function onWheel(e) {
    e.preventDefault();
    alterarZoom(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    arrastando = true;
    inicioX = e.clientX - panX;
    inicioY = e.clientY - panY;
    palcoEl?.classList.add('arrastando');
  }

  function onMouseMove(e) {
    if (!arrastando) return;
    panX = e.clientX - inicioX;
    panY = e.clientY - inicioY;
    atualizarTransformacao();
  }

  function onMouseUp() {
    if (arrastando) {
      arrastando = false;
      palcoEl?.classList.remove('arrastando');
    }
  }

  function onKeyDown(e) {
    if (modalEl.hidden) return;
    if (e.key === 'Escape') {
      fechar();
    } else if (e.key === '+' || e.key === '=') {
      alterarZoom(1);
    } else if (e.key === '-' || e.key === '_') {
      alterarZoom(-1);
    } else if (e.key === '0') {
      resetarZoom();
    }
  }

  viewportEl?.addEventListener('wheel', onWheel, { passive: false });
  viewportEl?.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  btnMais?.addEventListener('click', () => alterarZoom(1));
  btnMenos?.addEventListener('click', () => alterarZoom(-1));
  btnReset?.addEventListener('click', resetarZoom);
  btnFechar?.addEventListener('click', fechar);
  backdropEl?.addEventListener('click', fechar);

  function abrir({ url, rotulo = 'Imagem de Referência', descricao = '' }) {
    if (!url) return;
    imgEl.src = url;
    tituloEl.textContent = rotulo;
    descricaoEl.textContent = descricao;
    descricaoEl.hidden = !descricao;
    resetarZoom();

    modalEl.hidden = false;
    document.body.classList.add('modal-aberto');
    window.addEventListener('keydown', onKeyDown);
    btnFechar?.focus();
  }

  function fechar() {
    modalEl.hidden = true;
    document.body.classList.remove('modal-aberto');
    window.removeEventListener('keydown', onKeyDown);
  }

  return {
    abrir,
    fechar,
  };
}
