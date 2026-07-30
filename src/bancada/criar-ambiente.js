/* criar-ambiente.js — estúdio neutro, câmeras previsíveis e enquadramento da bancada. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VISTAS_BANCADA } from './estado-bancada.js';

const COR_FUNDO = '#dce2df';
const DURACAO_TRANSICAO = 280;

function suavizar(t) {
  return 1 - (1 - t) ** 3;
}

function caixaValida(objetos) {
  const caixa = new THREE.Box3();
  for (const objeto of objetos.filter(Boolean)) {
    objeto.updateWorldMatrix(true, true);
    caixa.expandByObject(objeto);
  }
  return caixa.isEmpty() ? null : caixa;
}

export function posicionarNoEstudio(objeto, { tamanhoMaximo = 3.4, piso = 0.08 } = {}) {
  objeto.position.set(0, 0, 0);
  objeto.scale.setScalar(1);
  objeto.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(objeto);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const maior = Math.max(tamanho.x, tamanho.y, tamanho.z, 0.001);
  objeto.scale.setScalar(tamanhoMaximo / maior);
  objeto.updateMatrixWorld(true);
  caixa.setFromObject(objeto);
  const centro = caixa.getCenter(new THREE.Vector3());
  objeto.position.set(-centro.x, piso - caixa.min.y, -centro.z);
  objeto.updateMatrixWorld(true);
}

export function criarAmbienteBancada(canvas, { aoMudarVista } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COR_FUNDO);

  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({
      color: '#cbd2ce',
      roughness: 0.94,
      metalness: 0,
    }),
  );
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  scene.add(piso);

  const grade = new THREE.GridHelper(12, 24, '#91a19a', '#bdc7c2');
  grade.position.y = 0.003;
  grade.material.transparent = true;
  grade.material.opacity = 0.34;
  scene.add(grade);

  scene.add(new THREE.HemisphereLight('#ffffff', '#829088', 2.15));

  const principal = new THREE.DirectionalLight('#fff8ec', 4.4);
  principal.position.set(4.8, 7.2, 5.4);
  principal.castShadow = true;
  principal.shadow.mapSize.set(2048, 2048);
  principal.shadow.camera.left = -5;
  principal.shadow.camera.right = 5;
  principal.shadow.camera.top = 5;
  principal.shadow.camera.bottom = -5;
  principal.shadow.bias = -0.00035;
  scene.add(principal);

  const preenchimento = new THREE.DirectionalLight('#c9e2ff', 2.2);
  preenchimento.position.set(-5, 3.4, 4);
  scene.add(preenchimento);

  const recorte = new THREE.DirectionalLight('#d8fff0', 2.7);
  recorte.position.set(-2.5, 5.8, -5);
  scene.add(recorte);

  const perspectiva = new THREE.PerspectiveCamera(38, 1, 0.025, 100);
  const ortografica = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.025, 100);
  let camera = perspectiva;
  let projecaoAtual = 'perspectiva';
  let vistaAtual = 'isometrica';
  let alvosAtuais = [];
  let centroAtual = new THREE.Vector3(0, 0.9, 0);
  let raioAtual = 2;
  let transicao = null;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.25;
  controls.maxDistance = 30;
  controls.minPolarAngle = 0.001;
  controls.maxPolarAngle = Math.PI - 0.001;
  controls.target.copy(centroAtual);
  controls.addEventListener('start', () => {
    transicao = null;
    vistaAtual = 'livre';
    aoMudarVista?.(vistaAtual);
  });

  function ajustarOrtografica() {
    const largura = Math.max(1, canvas.clientWidth);
    const altura = Math.max(1, canvas.clientHeight);
    const aspecto = largura / altura;
    const meiaAltura = Math.max(0.2, raioAtual * 1.32);
    ortografica.left = -meiaAltura * aspecto;
    ortografica.right = meiaAltura * aspecto;
    ortografica.top = meiaAltura;
    ortografica.bottom = -meiaAltura;
    ortografica.updateProjectionMatrix();
  }

  function distanciaPerspectiva() {
    return Math.max(0.6, raioAtual / Math.tan(THREE.MathUtils.degToRad(perspectiva.fov / 2)) * 1.32);
  }

  function posicaoDaVista(vista) {
    const definicao = VISTAS_BANCADA[vista] ?? VISTAS_BANCADA.isometrica;
    const direcao = new THREE.Vector3(...definicao.direcao).normalize();
    return centroAtual.clone().addScaledVector(direcao, distanciaPerspectiva());
  }

  function iniciarTransicao(destino, up, instantaneo = false) {
    const inicio = camera.position.clone();
    const upInicio = camera.up.clone();
    const alvoInicio = controls.target.clone();
    if (instantaneo || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(destino);
      camera.up.copy(up);
      controls.target.copy(centroAtual);
      camera.lookAt(centroAtual);
      controls.update();
      return;
    }
    controls.enabled = false;
    transicao = {
      inicio: performance.now(),
      de: inicio,
      para: destino,
      upDe: upInicio,
      upPara: up,
      alvoDe: alvoInicio,
      alvoPara: centroAtual.clone(),
    };
  }

  function definirVista(vista, { instantaneo = false } = {}) {
    if (!VISTAS_BANCADA[vista]) return;
    vistaAtual = vista;
    const direcao = VISTAS_BANCADA[vista].direcao;
    const vertical = Math.abs(direcao[1]) > 0.99;
    const up = vertical
      ? new THREE.Vector3(0, 0, direcao[1] > 0 ? -1 : 1)
      : new THREE.Vector3(0, 1, 0);
    piso.visible = vista !== 'inferior';
    grade.visible = vista !== 'inferior';
    iniciarTransicao(posicaoDaVista(vista), up, instantaneo);
    aoMudarVista?.(vistaAtual);
  }

  function enquadrar(objetos = alvosAtuais, { instantaneo = false } = {}) {
    const caixa = caixaValida(objetos);
    if (caixa) {
      centroAtual = caixa.getCenter(new THREE.Vector3());
      raioAtual = Math.max(0.12, caixa.getBoundingSphere(new THREE.Sphere()).radius);
      alvosAtuais = objetos.slice();
    }
    ajustarOrtografica();
    definirVista(vistaAtual === 'livre' ? 'isometrica' : vistaAtual, { instantaneo });
  }

  function definirProjecao(projecao) {
    const segura = projecao === 'ortografica' ? 'ortografica' : 'perspectiva';
    if (segura === projecaoAtual) return;
    const posicao = camera.position.clone();
    const up = camera.up.clone();
    projecaoAtual = segura;
    camera = segura === 'ortografica' ? ortografica : perspectiva;
    camera.position.copy(posicao);
    camera.up.copy(up);
    controls.object = camera;
    ajustarOrtografica();
    definirVista(vistaAtual === 'livre' ? 'isometrica' : vistaAtual, { instantaneo: true });
  }

  function redimensionar() {
    const largura = Math.max(1, canvas.clientWidth);
    const altura = Math.max(1, canvas.clientHeight);
    renderer.setSize(largura, altura, false);
    perspectiva.aspect = largura / altura;
    perspectiva.updateProjectionMatrix();
    ajustarOrtografica();
  }

  /* A régua da interface não tenta medir a perspectiva por pixel com precisão
     metrológica; ela declara a escala local no plano do alvo. Em ortográfica ela
     é exata, e em perspectiva é uma aproximação explícita e útil para revisão. */
  function referenciaMetrica() {
    const altura = Math.max(1, canvas.clientHeight);
    const metrosPorPixel = projecaoAtual === 'ortografica'
      ? (ortografica.top - ortografica.bottom) / altura
      : (2 * camera.position.distanceTo(controls.target)
        * Math.tan(THREE.MathUtils.degToRad(perspectiva.fov / 2))) / altura;
    const eixos = {
      frontal: 'X horizontal · Y vertical · Z profundidade',
      traseira: 'X horizontal · Y vertical · Z profundidade',
      direita: 'Z horizontal · Y vertical · X profundidade',
      esquerda: 'Z horizontal · Y vertical · X profundidade',
      superior: 'X horizontal · Z vertical · Y profundidade',
      inferior: 'X horizontal · Z vertical · Y profundidade',
      isometrica: 'X / Y / Z em perspectiva',
      livre: 'X / Y / Z em perspectiva',
    };
    return {
      metrosPorPixel,
      pixelsPorMetro: 1 / Math.max(metrosPorPixel, 1e-9),
      aproximada: projecaoAtual === 'perspectiva',
      eixos: eixos[vistaAtual] ?? eixos.isometrica,
    };
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(canvas);
  redimensionar();

  let ativo = true;
  function quadro(agora) {
    if (!ativo) return;
    if (transicao) {
      const t = Math.min(1, (agora - transicao.inicio) / DURACAO_TRANSICAO);
      const k = suavizar(t);
      camera.position.lerpVectors(transicao.de, transicao.para, k);
      camera.up.lerpVectors(transicao.upDe, transicao.upPara, k).normalize();
      controls.target.lerpVectors(transicao.alvoDe, transicao.alvoPara, k);
      camera.lookAt(controls.target);
      if (t >= 1) {
        transicao = null;
        controls.enabled = true;
      }
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  return {
    renderer,
    scene,
    controls,
    get camera() { return camera; },
    get vista() { return vistaAtual; },
    get projecao() { return projecaoAtual; },
    definirVista,
    definirProjecao,
    enquadrar,
    referenciaMetrica,
    definirObjeto(objeto) {
      alvosAtuais = [objeto];
      enquadrar(alvosAtuais, { instantaneo: true });
    },
    destruir() {
      ativo = false;
      observador.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}
