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

/* A haste desenhada tem treze milímetros de espessura na cena, o que é fino
   demais para o ponteiro acertar: o autor relatou não saber se estava clicando
   na seta ou na peça atrás dela. O alvo de clique é um cilindro invisível bem
   mais grosso em volta da seta inteira, então pegar a seta deixa de exigir
   pontaria — e como ele é invisível, a seta continua fina na tela. */
const RAIO_DO_ALVO = 0.09;

function criarHaste(cor) {
  const material = new THREE.MeshBasicMaterial({ color: cor, depthTest: false, transparent: true });
  const grupo = new THREE.Group();
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 8), material);
  haste.position.y = 0.4;
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 10), material);
  ponta.position.y = 0.9;
  const alvo = new THREE.Mesh(
    new THREE.CylinderGeometry(RAIO_DO_ALVO, RAIO_DO_ALVO, 1.05, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  alvo.position.y = 0.5;
  alvo.name = '__alvo_da_seta__';
  grupo.add(haste, ponta, alvo);
  grupo.renderOrder = 999;
  return { grupo, material };
}

export function criarSetasDeParametro({
  cena, canvas, cameraAtual,
  valorAtual = () => 0,
  passoDe = () => 1,
  /* A peça é redimensionada para caber no estúdio, e a sensibilidade foi medida
     nas unidades da receita. Sem dividir por essa escala o gesto anda tantas
     vezes mais quanto a peça foi ampliada — na bicicleta, três vezes e meia: o
     ponteiro andava um palmo e o tubo atravessava a tela. */
  escalaDoModelo = () => 1,
  /* A tabela declara mínimo e máximo, e o arrasto não pode escrever fora deles:
     o painel recusa, e a seta escreveria o mesmo número por outra porta. */
  limitesDe = () => ({}),
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
    /* Durante o arrasto as setas ficam onde estão. A prévia reconstrói o modelo
       a cada movimento, e a bancada devolve a seleção logo depois: isso chamava
       `mostrar` e `esconder` no meio do gesto, e `esconder` jogava fora o
       arrasto. O resultado era o gesto morrer no primeiro movimento — a peça
       andava um passo de ponteiro e parava, parecendo que a seta não tinha sido
       pega. Mover a base no meio do arrasto também mudaria a conta do avanço,
       que é medida contra o ponto onde o gesto começou. */
    if (arrasto) return raiz.visible;
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
    if (arrasto) return raiz.visible;
    raiz.visible = false;
    return false;
  }

  /* Realce sob o ponteiro: sem ele, a única maneira de descobrir se a seta foi
     pega era arrastar e ver o que acontece. A seta sob o ponteiro clareia e o
     cursor vira mão, antes de qualquer clique. */
  function realcar(seta) {
    for (const outra of setas.values()) {
      const ativa = outra === seta;
      outra.material.color.setHex(ativa ? 0xffffff : outra.cor);
      if (!outra.grupo.userData.inerte) outra.material.opacity = ativa ? 1 : 0.92;
    }
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

  function aoPassar(evento) {
    if (arrasto || !raiz.visible) return;
    const seta = setaSobOPonteiro(evento);
    realcar(seta?.ligacao ? seta : null);
    if (seta?.ligacao) canvas.style.cursor = 'grab';
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
    const escala = escalaDoModelo() || 1;
    const avanco = ((x - arrasto.partida.x) * dx + (y - arrasto.partida.y) * dy)
      / (comprimento * comprimento) * raiz.scale.x / escala;
    const passo = passoDoParametro(avanco, arrasto.seta.ligacao.sensibilidade);
    /* ENCAIXE. Arrasto produz decimal contínuo, e a tabela da peça é medida em
       milímetros: sem encaixar, o gesto grava `743.354569` onde a folha de
       referência diz 743, e a tabela medida vira uma lista de números mágicos
       na primeira vez que alguém usar a seta. */
    const grade = passoDe(arrasto.seta.ligacao.id) || 1;
    const bruto = arrasto.base + passo;
    const { min, max } = limitesDe(arrasto.seta.ligacao.id) ?? {};
    let valor = Math.round(bruto / grade) * grade;
    if (Number.isFinite(min)) valor = Math.max(min, valor);
    if (Number.isFinite(max)) valor = Math.min(max, valor);
    aoArrastar(arrasto.seta.ligacao.id, valor);
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
  canvas.addEventListener('pointermove', aoPassar);
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
      canvas.removeEventListener('pointermove', aoPassar);
      canvas.removeEventListener('pointerup', aoSoltarPonteiro, true);
      raiz.removeFromParent();
      for (const seta of setas.values()) {
        seta.material.dispose();
        seta.grupo.traverse((no) => no.geometry?.dispose());
      }
    },
  };
}
