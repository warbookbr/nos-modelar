/* visor-montagem.js — renderizador privado, derivado de montagem já resolvida. */
import * as THREE from 'three';
import { adaptarMontagemThree } from '/src/autoria/adaptar-montagem-three.js';

const canvas = document.getElementById('cena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
/* O buffer segue a escala da página: a captura abre com `deviceScaleFactor` 2 e reduz o PNG, que é o que suaviza a borda (ver
   `FATOR_DE_AMOSTRAGEM` em capturar-montagem.mjs). Tudo o que esta página mede (enquadramento, aspecto, tamanho do quadro) está em
   pixel CSS ou em coordenada normalizada, e por isso não muda com a escala. */
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dce2df');
scene.add(new THREE.HemisphereLight('#ffffff', '#718078', 2.2));
const luz = new THREE.DirectionalLight('#fff8ec', 4);
luz.position.set(4, 7, 5);
scene.add(luz);
const perspectiva = new THREE.PerspectiveCamera(38, 16 / 9, 0.01, 1000);
/* Ortográfica para comparar com referência de lado, que é vista técnica: em
   perspectiva a câmera vê o topo e o fundo das peças e o tamanho muda com a
   distância. */
const ortografica = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 1000);
let camera = perspectiva;

function reconstituir(montagem) {
  return {
    id: montagem.id,
    instancias: montagem.instancias.map((instancia) => instancia.alvo.tipo === 'montagem'
      ? { ...instancia, montagem: reconstituir(instancia.montagem) }
      : { ...instancia, definicao: { ...instancia.definicao, neutro: {
        ...instancia.definicao.neutro,
        V: new Map(instancia.definicao.neutro.V), F: new Map(instancia.definicao.neutro.F),
        portas: new Map(instancia.definicao.neutro.portas),
      } } }),
  };
}

function direcao(vista) {
  return ({
    isometrica: [1, 0.8, 1],
    frontal: [0, 0, 1],
    traseira: [0, 0, -1],
    direita: [1, 0, 0],
    esquerda: [-1, 0, 0],
    superior: [0, 1, 0],
    inferior: [0, -1, 0],
  })[vista] ?? [1, 0.8, 1];
}

/* O eixo de cima da imagem é o `up` da câmera tirado da componente ao longo do olhar, que é o que o `lookAt` do Three.js usa. Nas vistas
   alinhadas aos eixos o `up` já é perpendicular ao olhar, e na isométrica não é: a caixa medida sobre (0, 1, 0) saía menor que a da imagem,
   e o quadro apertado de uma peça enquadrada de perto a cortava (116% da altura, medidos na deriva). */
function eixosDaVista(vetor, vista) {
  const olhar = vetor.clone().negate();
  const up = vista === 'superior'
    ? new THREE.Vector3(0, 0, -1)
    : (vista === 'inferior' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0));
  const acima = up.clone().addScaledVector(vetor, -up.dot(vetor)).normalize();
  return {
    direita: new THREE.Vector3().crossVectors(olhar, acima).normalize(),
    acima,
  };
}

/* `centro` (padrão: o da própria caixa) é o ponto que as profundidades medem: com foco, a caixa do conjunto é medida a partir do
   centro da caixa do foco, e a câmera fica adiante de tudo que o conjunto tem nessa direção. Sem `vertices` a largura e a altura são as
   dos oito cantos da caixa. Com `vertices` (uma função que recebe um visitante e o chama com cada vértice, no mundo) são as da silhueta
   da peça, que numa peça fina e alta vista na isométrica é bem menor que a da caixa dela, e `deslocamento` leva o centro da câmera ao
   centro da silhueta, no plano da imagem. */
function envelopeProjetado(caixa, vetor, vista, centro = caixa.getCenter(new THREE.Vector3()), vertices = null) {
  const { direita, acima } = eixosDaVista(vetor, vista);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const projetar = (ponto) => {
    const x = ponto.dot(direita);
    const y = ponto.dot(acima);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  let profundidadeDianteira = -Infinity;
  for (const x of [caixa.min.x, caixa.max.x]) {
    for (const y of [caixa.min.y, caixa.max.y]) {
      for (const z of [caixa.min.z, caixa.max.z]) {
        const ponto = new THREE.Vector3(x, y, z);
        if (!vertices) projetar(ponto);
        profundidadeDianteira = Math.max(profundidadeDianteira, ponto.sub(centro).dot(vetor));
      }
    }
  }
  if (vertices) vertices(projetar);
  return {
    largura: maxX - minX,
    altura: maxY - minY,
    profundidadeDianteira,
    deslocamento: new THREE.Vector3()
      .addScaledVector(direita, (minX + maxX) / 2 - centro.dot(direita))
      .addScaledVector(acima, (minY + maxY) / 2 - centro.dot(acima)),
  };
}

/* A fração do quadro que a caixa enquadrada ocupa: a do conjunto inteiro, 0,58 da largura e 0,62 da altura, e, com foco, o que a
   folga deixa (a peça de uma etapa enche o quadro, com a folga de cada lado). */
function ocupacaoDoQuadro(folga) {
  if (folga === null) return { horizontal: 0.58, vertical: 0.62 };
  const cheio = 1 / (1 + 2 * folga);
  return { horizontal: cheio, vertical: cheio };
}

function distanciaParaEnquadrar(envelope, ocupacao) {
  const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const horizontal = vertical * camera.aspect;
  /* Em perspectiva, largura e altura são vistas a partir do canto mais perto
     da câmera, não do centro da caixa. Somar essa profundidade mantém também
     montagens longas inteiras no frustum sem trocar para uma margem arbitrária. */
  return envelope.profundidadeDianteira
    + Math.max(0.01, envelope.largura / (2 * horizontal * ocupacao.horizontal), envelope.altura / (2 * vertical * ocupacao.vertical));
}

/* A caixa das peças que o foco (caminho semântico) alcança, ou null se nenhuma. */
function caixaDoFoco(visual, foco) {
  const caixa = new THREE.Box3();
  for (const item of visual.instancias.values()) {
    if (foco.every((segmento, indice) => item.caminho[indice] === segmento)) caixa.expandByObject(item.visual.raiz);
  }
  return caixa.isEmpty() ? null : caixa;
}

/* Chama `aoVertice` com cada vértice, no mundo, das peças que o foco alcança. O vetor é o mesmo em todas as chamadas: quem o recebe
   o usa na hora e não o guarda. */
function paraCadaVerticeDoFoco(visual, foco, aoVertice) {
  const vertice = new THREE.Vector3();
  for (const item of visual.instancias.values()) {
    if (!foco.every((segmento, indice) => item.caminho[indice] === segmento)) continue;
    item.visual.raiz.traverse((no) => {
      const posicao = no.isMesh ? no.geometry?.attributes?.position : null;
      if (!posicao) return;
      for (let i = 0; i < posicao.count; i++) aoVertice(vertice.fromBufferAttribute(posicao, i).applyMatrix4(no.matrixWorld));
    });
  }
}

/* O quadro que a caixa (ou, com `vertices`, a silhueta da peça) ocupa na imagem, em fração da largura e da altura. */
function enquadramento(caixa, vertices = null) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const projetar = (ponto) => {
    const p = ponto.clone().project(camera);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  };
  if (vertices) {
    vertices(projetar);
  } else {
    for (const x of [caixa.min.x, caixa.max.x]) {
      for (const y of [caixa.min.y, caixa.max.y]) {
        for (const z of [caixa.min.z, caixa.max.z]) projetar(new THREE.Vector3(x, y, z));
      }
    }
  }
  const largura = Math.max(0, maxX - minX) / 2;
  const altura = Math.max(0, maxY - minY) / 2;
  const cortado = minX < -1 || maxX > 1 || minY < -1 || maxY > 1;
  return {
    valida: !cortado && Math.max(largura, altura) >= 0.32 && Math.min(largura, altura) >= 0.04,
    area: largura * altura,
    largura,
    altura,
    cortado,
  };
}

/* `dados` é a montagem serializada, ou o texto JSON dela. Sem `foco`, o quadro é o do conjunto. Com `foco` (a lista de ids do
   caminho de uma instância), o quadro é a caixa dela com `folga` (fração do tamanho, de cada lado), centrado nela, e as outras peças
   aparecem ao redor, de modo que a câmera fica adiante de tudo o que o conjunto tem na direção da vista. */
window.__mecanificaVisorMontagem = (dados, vista = 'isometrica', projecao = 'perspectiva', foco = null, folga = 0.1) => {
  const montagem = typeof dados === 'string' ? JSON.parse(dados) : dados;
  while (scene.children.length > 2) scene.remove(scene.children.at(-1));
  const visual = adaptarMontagemThree(reconstituir(montagem));
  scene.add(visual.raiz);
  const caixa = new THREE.Box3().setFromObject(visual.raiz);
  if (caixa.isEmpty()) {
    caixa.min.set(-0.05, -0.05, -0.05);
    caixa.max.set(0.05, 0.05, 0.05);
  }
  const caixaFoco = foco ? caixaDoFoco(visual, foco) : null;
  if (foco && !caixaFoco) throw new Error(`o foco '${foco.join('/')}' não encontrou peça na cena.`);
  const enquadrada = caixaFoco ?? caixa;
  const centro = enquadrada.getCenter(new THREE.Vector3());
  const vetor = new THREE.Vector3(...direcao(vista)).normalize();
  renderer.setSize(innerWidth, innerHeight);
  /* Em ortográfica o quadro de uma peça enquadrada de perto segue a silhueta dela, e não a caixa: na isométrica a caixa de uma peça
     fina e alta é bem maior que ela, e a peça ocupava menos da metade do quadro que a folga prometia. */
  const vertices = caixaFoco && projecao === 'ortografica' ? (visitante) => paraCadaVerticeDoFoco(visual, foco, visitante) : null;
  const envelope = envelopeProjetado(enquadrada, vetor, vista, centro, vertices);
  const ocupacao = ocupacaoDoQuadro(caixaFoco ? folga : null);
  let alvoDaCamera = centro;
  if (projecao === 'ortografica') {
    camera = ortografica;
    const aspecto = innerWidth / innerHeight;
    const meiaAltura = Math.max(envelope.altura / 2 / ocupacao.vertical, envelope.largura / 2 / ocupacao.horizontal / aspecto, 0.01);
    Object.assign(camera, { top: meiaAltura, bottom: -meiaAltura, left: -meiaAltura * aspecto, right: meiaAltura * aspecto });
    /* a profundidade é a do conjunto inteiro: com foco, a câmera não pode ficar dentro da caixa do foco e cortar as peças à frente */
    const profundidade = caixaFoco ? envelopeProjetado(caixa, vetor, vista, centro).profundidadeDianteira : envelope.profundidadeDianteira;
    alvoDaCamera = centro.clone().add(envelope.deslocamento);
    camera.position.copy(alvoDaCamera).addScaledVector(vetor, profundidade + 1);
  } else {
    camera = perspectiva;
    camera.aspect = innerWidth / innerHeight;
    camera.position.copy(centro).addScaledVector(vetor, distanciaParaEnquadrar(envelope, ocupacao));
  }
  camera.up.set(0, 1, 0);
  if (vista === 'superior') camera.up.set(0, 0, -1);
  if (vista === 'inferior') camera.up.set(0, 0, 1);
  camera.lookAt(alvoDaCamera);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return {
    id: montagem.id,
    vista,
    projecao,
    instancias: [...visual.instancias.values()].map((item) => item.caminho).sort(),
    enquadramento: enquadramento(enquadrada, vertices),
    ...(caixaFoco ? { foco, folga } : {}),
  };
};
