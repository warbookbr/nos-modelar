/* setas-de-parametro.js — as três setas por eixo, ligadas a um parâmetro.
 *
 * A bancada desenha as setas como objetos da própria cena, e não num canvas 2D
 * sobreposto. O editor do `brigsd/nos` precisou do sobreposto porque o motor
 * dele desenha só triângulos; aqui existe Three.js, e objeto real dispensa
 * reprojetar tudo a cada quadro e ainda ganha o raycast que a bancada já usa
 * para selecionar peça.
 *
 * O que vem de lá é a CONTA, que já está resolvida: seta de tamanho constante
 * na tela, avanço travado no eixo pela projeção do movimento do ponteiro sobre a
 * direção da seta na tela, e seta apagada e inerte quando ela aponta para a
 * câmera — nesse ângulo um pixel de arrasto viraria um salto enorme.
 *
 * O que NÃO vem é o destino: lá o gesto vira `moveV` com o número do vértice,
 * aqui vira um valor de parâmetro declarado, pela sensibilidade medida. */

import * as THREE from 'three';
import { passoDoParametro } from '../../autoria/setas-por-eixo.js';

const EIXOS = [
  { nome: 'x', direcao: new THREE.Vector3(1, 0, 0), cor: 0xff5a52 },
  { nome: 'y', direcao: new THREE.Vector3(0, 1, 0), cor: 0x46d67f },
  { nome: 'z', direcao: new THREE.Vector3(0, 0, 1), cor: 0x5a8bff },
];

/* Comprimento em mundo proporcional à distância da câmera: a seta ocupa sempre
   o mesmo tamanho na tela, perto ou longe. Oitavo da distância é a proporção
   que o editor do `nos` usa e que já se provou legível. */
const FRACAO_DA_DISTANCIA = 1 / 8;
/* Abaixo disto em pixels a seta aponta para a câmera: arrastar ali multiplica o
   erro, então ela apaga e não pega o clique. */
const MINIMO_EM_PIXELS = 14;

function criarHaste(cor) {
  const material = new THREE.MeshBasicMaterial({ color: cor, depthTest: false, transparent: true });
  const grupo = new THREE.Group();
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 8), material);
  haste.position.y = 0.4;
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 10), material);
  ponta.position.y = 0.9;
  grupo.add(haste, ponta);
  grupo.renderOrder = 999;
  return { grupo, material };
}

export function criarSetasDeParametro({
  cena, canvas, cameraAtual,
  valorAtual = () => 0,
  passoDe = () => 1,
  aoArrastar = () => {},
  aoSoltar = () => {},
}) {
  const raiz = new THREE.Group();
  raiz.name = '__setas_de_parametro__';
  raiz.visible = false;
  cena.add(raiz);

  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  const setas = new Map();

  for (const eixo of EIXOS) {
    const { grupo, material } = criarHaste(eixo.cor);
    grupo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eixo.direcao);
    grupo.userData.eixo = eixo.nome;
    grupo.visible = false;
    raiz.add(grupo);
    setas.set(eixo.nome, { ...eixo, grupo, material, ligacao: null });
  }

  let arrasto = null;

  function emPixels(evento) {
    const rect = canvas.getBoundingClientRect();
    return { x: evento.clientX - rect.left, y: evento.clientY - rect.top, rect };
  }

  /* A direção da seta na TELA, em pixels, e o seu comprimento. É o que traduz o
     movimento do ponteiro em avanço no eixo, e é o mesmo número que decide se a
     seta está apontando para a câmera. */
  function direcaoNaTela(seta, camera) {
    const rect = canvas.getBoundingClientRect();
    const base = raiz.position.clone().project(camera);
    const ponta = raiz.position.clone()
      .addScaledVector(seta.direcao, raiz.scale.x)
      .project(camera);
    const dx = (ponta.x - base.x) * rect.width * 0.5;
    const dy = -(ponta.y - base.y) * rect.height * 0.5;
    const comprimento = Math.hypot(dx, dy);
    return { dx, dy, comprimento };
  }

  function atualizarEscala() {
    if (!raiz.visible) return;
    const camera = cameraAtual();
    const distancia = camera.position.distanceTo(raiz.position);
    raiz.scale.setScalar(Math.max(distancia * FRACAO_DA_DISTANCIA, 1e-3));

    for (const seta of setas.values()) {
      if (!seta.ligacao) continue;
      const { comprimento } = direcaoNaTela(seta, camera);
      const deitada = comprimento < MINIMO_EM_PIXELS;
      seta.material.opacity = deitada ? 0.18 : 1;
      seta.grupo.userData.inerte = deitada;
    }
  }

  function mostrar({ centro, ligacoes }) {
    if (!centro || !ligacoes) return esconder();
    raiz.position.copy(centro);
    let alguma = false;
    for (const [nome, seta] of setas) {
      seta.ligacao = ligacoes[nome] ?? null;
      seta.grupo.visible = Boolean(seta.ligacao);
      if (seta.ligacao) alguma = true;
    }
    raiz.visible = alguma;
    atualizarEscala();
    return alguma;
  }

  function esconder() {
    raiz.visible = false;
    arrasto = null;
    return false;
  }

  function setaSobOPonteiro(evento) {
    if (!raiz.visible) return null;
    const { x, y, rect } = emPixels(evento);
    ponteiro.x = (x / rect.width) * 2 - 1;
    ponteiro.y = -(y / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, cameraAtual());
    for (const item of raycaster.intersectObject(raiz, true)) {
      let no = item.object;
      while (no && !no.userData.eixo) no = no.parent;
      if (no && !no.userData.inerte) return setas.get(no.userData.eixo);
    }
    return null;
  }

  function aoPressionar(evento) {
    const seta = setaSobOPonteiro(evento);
    if (!seta?.ligacao) return;
    /* Antes da órbita e antes da seleção: sem parar aqui, o mesmo gesto giraria
       a câmera e trocaria a peça selecionada enquanto arrasta. */
    evento.stopPropagation();
    evento.preventDefault();
    const { x, y } = emPixels(evento);
    arrasto = {
      seta,
      partida: { x, y },
      base: valorAtual(seta.ligacao.id),
      tela: direcaoNaTela(seta, cameraAtual()),
    };
    canvas.setPointerCapture?.(evento.pointerId);
  }

  function aoMover(evento) {
    if (!arrasto) return;
    evento.stopPropagation();
    const { x, y } = emPixels(evento);
    const { dx, dy, comprimento } = arrasto.tela;
    if (comprimento < MINIMO_EM_PIXELS) return;
    /* Projeção do movimento do ponteiro sobre a direção da seta na tela,
       dividida pelo comprimento dela: é a fórmula do editor do `nos`, e ela dá
       o avanço em unidades de mundo ao longo do eixo. */
    const avanco = ((x - arrasto.partida.x) * dx + (y - arrasto.partida.y) * dy)
      / (comprimento * comprimento) * raiz.scale.x;
    const passo = passoDoParametro(avanco, arrasto.seta.ligacao.sensibilidade);
    /* ENCAIXE. Arrasto produz decimal contínuo, e a tabela da peça é medida em
       milímetros: sem encaixar, o gesto grava `743.354569` onde a folha de
       referência diz 743, e a tabela medida vira uma lista de números mágicos
       na primeira vez que alguém usar a seta. */
    const grade = passoDe(arrasto.seta.ligacao.id) || 1;
    const bruto = arrasto.base + passo;
    aoArrastar(arrasto.seta.ligacao.id, Math.round(bruto / grade) * grade);
  }

  function aoSoltarPonteiro(evento) {
    if (!arrasto) return;
    evento.stopPropagation();
    const id = arrasto.seta.ligacao.id;
    arrasto = null;
    canvas.releasePointerCapture?.(evento.pointerId);
    aoSoltar(id);
  }

  canvas.addEventListener('pointerdown', aoPressionar, true);
  canvas.addEventListener('pointermove', aoMover, true);
  canvas.addEventListener('pointerup', aoSoltarPonteiro, true);

  return {
    raiz,
    mostrar,
    esconder,
    atualizarEscala,
    get arrastando() { return Boolean(arrasto); },
    destruir() {
      canvas.removeEventListener('pointerdown', aoPressionar, true);
      canvas.removeEventListener('pointermove', aoMover, true);
      canvas.removeEventListener('pointerup', aoSoltarPonteiro, true);
      raiz.removeFromParent();
      for (const seta of setas.values()) {
        seta.material.dispose();
        seta.grupo.traverse((no) => no.geometry?.dispose());
      }
    },
  };
}
