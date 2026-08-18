/* visor-montagem.js — renderizador privado, derivado de montagem já resolvida. */
import * as THREE from 'three';
import { adaptarMontagemThree } from '/src/autoria/adaptar-montagem-three.js';

const canvas = document.getElementById('cena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dce2df');
scene.add(new THREE.HemisphereLight('#ffffff', '#718078', 2.2));
const luz = new THREE.DirectionalLight('#fff8ec', 4);
luz.position.set(4, 7, 5);
scene.add(luz);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.01, 1000);

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

function eixosDaVista(vetor, vista) {
  const olhar = vetor.clone().negate();
  const acima = vista === 'superior'
    ? new THREE.Vector3(0, 0, -1)
    : (vista === 'inferior' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0));
  return {
    direita: new THREE.Vector3().crossVectors(olhar, acima).normalize(),
    acima,
  };
}

function envelopeProjetado(caixa, vetor, vista) {
  const { direita, acima } = eixosDaVista(vetor, vista);
  const centro = caixa.getCenter(new THREE.Vector3());
  const valoresX = [];
  const valoresY = [];
  const profundidades = [];
  for (const x of [caixa.min.x, caixa.max.x]) {
    for (const y of [caixa.min.y, caixa.max.y]) {
      for (const z of [caixa.min.z, caixa.max.z]) {
        const ponto = new THREE.Vector3(x, y, z);
        valoresX.push(ponto.dot(direita));
        valoresY.push(ponto.dot(acima));
        profundidades.push(ponto.sub(centro).dot(vetor));
      }
    }
  }
  return {
    largura: Math.max(...valoresX) - Math.min(...valoresX),
    altura: Math.max(...valoresY) - Math.min(...valoresY),
    profundidadeDianteira: Math.max(...profundidades),
  };
}

function distanciaParaEnquadrar(envelope) {
  const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const horizontal = vertical * camera.aspect;
  /* Em perspectiva, largura e altura são vistas a partir do canto mais perto
     da câmera, não do centro da caixa. Somar essa profundidade mantém também
     montagens longas inteiras no frustum sem trocar para uma margem arbitrária. */
  return envelope.profundidadeDianteira
    + Math.max(0.01, envelope.largura / (2 * horizontal * 0.58), envelope.altura / (2 * vertical * 0.62));
}

function enquadramento(caixa) {
  const xs = [caixa.min.x, caixa.max.x];
  const ys = [caixa.min.y, caixa.max.y];
  const zs = [caixa.min.z, caixa.max.z];
  const pontos = xs.flatMap((x) => ys.flatMap((y) => zs.map((z) => new THREE.Vector3(x, y, z).project(camera))));
  const minX = Math.min(...pontos.map((ponto) => ponto.x));
  const maxX = Math.max(...pontos.map((ponto) => ponto.x));
  const minY = Math.min(...pontos.map((ponto) => ponto.y));
  const maxY = Math.max(...pontos.map((ponto) => ponto.y));
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

window.__mecanificaVisorMontagem = (dados, vista = 'isometrica') => {
  while (scene.children.length > 2) scene.remove(scene.children.at(-1));
  const visual = adaptarMontagemThree(reconstituir(dados));
  scene.add(visual.raiz);
  const caixa = new THREE.Box3().setFromObject(visual.raiz);
  const centro = caixa.getCenter(new THREE.Vector3());
  const vetor = new THREE.Vector3(...direcao(vista)).normalize();
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  const envelope = envelopeProjetado(caixa, vetor, vista);
  camera.position.copy(centro).addScaledVector(vetor, distanciaParaEnquadrar(envelope));
  camera.up.set(0, 1, 0);
  if (vista === 'superior') camera.up.set(0, 0, -1);
  if (vista === 'inferior') camera.up.set(0, 0, 1);
  camera.lookAt(centro);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return {
    id: dados.id,
    vista,
    instancias: [...visual.instancias.values()].map((item) => item.caminho).sort(),
    enquadramento: enquadramento(caixa),
  };
};
