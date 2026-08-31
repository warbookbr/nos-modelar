/* pinos-anotacoes.js — marcadores 3D interativos sobre a malha e lista de notas para feedback com a IA. */
import * as THREE from 'three';

export function criarGerenciadorAnotacoes3D({
  canvas,
  cena,
  cameraAtual,
  aoCriarAnotacao = () => {},
}) {
  const grupoPinos = new THREE.Group();
  grupoPinos.name = '__grupo_pinos_anotacoes__';
  cena.add(grupoPinos);

  const pinos = new Map();
  let modoAdicionarAtivo = false;
  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();

  function criarMarcadorPino(posicao, indice) {
    const grupo = new THREE.Group();
    grupo.position.set(...posicao);

    // Esfera central do pino
    const geoEsfera = new THREE.SphereGeometry(0.04, 16, 16);
    const matEsfera = new THREE.MeshBasicMaterial({ color: '#ff7043', depthTest: false });
    const esfera = new THREE.Mesh(geoEsfera, matEsfera);
    esfera.renderOrder = 10;
    grupo.add(esfera);

    // Anel externo pulsante
    const geoAnel = new THREE.RingGeometry(0.05, 0.07, 24);
    const matAnel = new THREE.MeshBasicMaterial({
      color: '#ffb74d',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    const anel = new THREE.Mesh(geoAnel, matAnel);
    anel.renderOrder = 9;
    anel.lookAt(0, 1, 0);
    grupo.add(anel);

    return grupo;
  }

  function limpar() {
    for (const [, pino] of pinos.entries()) {
      pino.objeto.removeFromParent();
    }
    pinos.clear();
  }

  function sincronizarAnotacoes(listaAnotacoes) {
    limpar();
    if (!Array.isArray(listaAnotacoes)) return;

    let contadorPino = 1;
    listaAnotacoes.forEach((anotacao) => {
      if (
        Array.isArray(anotacao.posicao) &&
        anotacao.posicao.length === 3 &&
        anotacao.posicao.every((v) => typeof v === 'number' && Number.isFinite(v))
      ) {
        const objeto = criarMarcadorPino(anotacao.posicao, contadorPino++);
        grupoPinos.add(objeto);
        pinos.set(anotacao.id, { objeto, dados: anotacao });
      }
    });
  }

  function ativarModoAdicionar(ativo) {
    modoAdicionarAtivo = ativo;
    canvas.style.cursor = ativo ? 'crosshair' : 'default';
  }

  function tratarCliqueCanvas(evento, malhasAlvo) {
    if (!modoAdicionarAtivo) return false;

    const retangulo = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - retangulo.left) / retangulo.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - retangulo.top) / retangulo.height) * 2 + 1;

    raycaster.setFromCamera(ponteiro, cameraAtual());
    const intersecoes = raycaster.intersectObjects(malhasAlvo, true);

    if (intersecoes.length > 0) {
      const ponto = intersecoes[0].point;
      const texto = prompt('Comentário / instrução para a IA neste ponto:');
      if (texto && texto.trim()) {
        aoCriarAnotacao({
          posicao: [ponto.x, ponto.y, ponto.z],
          texto: texto.trim(),
          componente: intersecoes[0].object.name || 'Geral',
        });
      }
      ativarModoAdicionar(false);
      return true;
    }
    return false;
  }

  return {
    grupo: grupoPinos,
    ativarModoAdicionar,
    tratarCliqueCanvas,
    sincronizarAnotacoes,
    limpar,
    isModoAdicionar: () => modoAdicionarAtivo,
    destruir: () => {
      limpar();
      grupoPinos.removeFromParent();
    },
  };
}
