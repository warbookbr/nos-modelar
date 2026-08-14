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
  return ({ isometrica: [1, 0.8, 1], frontal: [0, 0, 1], direita: [1, 0, 0], superior: [0, 1, 0] })[vista] ?? [1, 0.8, 1];
}

window.__mecanificaVisorMontagem = (dados, vista = 'isometrica') => {
  while (scene.children.length > 2) scene.remove(scene.children.at(-1));
  const visual = adaptarMontagemThree(reconstituir(dados));
  scene.add(visual.raiz);
  const caixa = new THREE.Box3().setFromObject(visual.raiz);
  const centro = caixa.getCenter(new THREE.Vector3());
  const raio = Math.max(0.1, caixa.getBoundingSphere(new THREE.Sphere()).radius);
  const vetor = new THREE.Vector3(...direcao(vista)).normalize();
  camera.position.copy(centro).addScaledVector(vetor, raio / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.35);
  camera.up.set(0, 1, 0);
  if (vista === 'superior') camera.up.set(0, 0, -1);
  camera.lookAt(centro);
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return { id: dados.id, vista, instancias: [...visual.instancias.values()].map((item) => item.caminho) };
};
