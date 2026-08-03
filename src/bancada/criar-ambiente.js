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

/** Regra pura do gate visual. Uma vista canônica pode ser naturalmente fina
 * (a espessura de uma chapa), mas não pode ser vazia/quase unidimensional: a
 * dimensão longa sustenta a leitura da silhueta e a curta prova que há área
 * projetável de fato. */
export function enquadramentoUtil({ largura, altura, cortado = false }) {
  if (cortado || !Number.isFinite(largura) || !Number.isFinite(altura)) return false;
  return Math.max(largura, altura) >= 0.32 && Math.min(largura, altura) >= 0.04;
}

/** Converte o envelope projetado da vista em frustum ortográfico. Os alvos são
 * menores na horizontal porque os painéis da bancada ocupam as laterais. Uma
 * vista fina deixa de herdar o raio 3D das outras vistas, sem esticar a peça. */
export function meiaAlturaParaVista({
  larguraProjetada,
  alturaProjetada,
  aspecto,
  ocupacaoHorizontal = 0.48,
  ocupacaoVertical = 0.62,
}) {
  const larguraSegura = Math.max(0, larguraProjetada);
  const alturaSegura = Math.max(0, alturaProjetada);
  const aspectoSeguro = Math.max(0.001, aspecto);
  return Math.max(
    0.2,
    alturaSegura / (2 * ocupacaoVertical),
    larguraSegura / (2 * aspectoSeguro * ocupacaoHorizontal),
  );
}

function envelopeProjetado(caixa, vista) {
  if (!caixa || caixa.isEmpty()) return null;
  const definicao = VISTAS_BANCADA[vista] ?? VISTAS_BANCADA.isometrica;
  const direcaoCamera = new THREE.Vector3(...definicao.direcao).normalize();
  const vertical = Math.abs(direcaoCamera.y) > 0.99;
  const acima = vertical
    ? new THREE.Vector3(0, 0, direcaoCamera.y > 0 ? -1 : 1)
    : new THREE.Vector3(0, 1, 0);
  const direcaoOlhar = direcaoCamera.clone().negate();
  const direita = new THREE.Vector3().crossVectors(direcaoOlhar, acima).normalize();
  const acimaDaTela = new THREE.Vector3().crossVectors(direita, direcaoOlhar).normalize();
  const minimo = new THREE.Vector2(Infinity, Infinity);
  const maximo = new THREE.Vector2(-Infinity, -Infinity);
  for (const x of [caixa.min.x, caixa.max.x]) {
    for (const y of [caixa.min.y, caixa.max.y]) {
      for (const z of [caixa.min.z, caixa.max.z]) {
        const ponto = new THREE.Vector3(x, y, z);
        const projetado = new THREE.Vector2(ponto.dot(direita), ponto.dot(acimaDaTela));
        minimo.min(projetado);
        maximo.max(projetado);
      }
    }
  }
  return { largura: maximo.x - minimo.x, altura: maximo.y - minimo.y };
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

export function criarAmbienteBancada(canvas, { aoMudarVista, aoMudarCameraLivre } = {}) {
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
  let publicarCameraLivreAoEstabilizar = false;

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
    publicarCameraLivreAoEstabilizar = false;
    vistaAtual = 'livre';
    aoMudarVista?.(vistaAtual);
  });
  controls.addEventListener('change', () => {
    if (vistaAtual === 'livre') aoMudarCameraLivre?.();
  });

  function ajustarOrtografica() {
    const largura = Math.max(1, canvas.clientWidth);
    const altura = Math.max(1, canvas.clientHeight);
    const aspecto = largura / altura;
    const envelope = envelopeProjetado(caixaValida(alvosAtuais), vistaAtual);
    const meiaAltura = envelope
      ? meiaAlturaParaVista({
        larguraProjetada: envelope.largura,
        alturaProjetada: envelope.altura,
        aspecto,
      })
      : Math.max(0.2, raioAtual * 1.32);
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
    publicarCameraLivreAoEstabilizar = false;
    vistaAtual = vista;
    ajustarOrtografica();
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

  /* Focar muda o alvo e a distância, portanto deixa de ser a vista canônica
     que o iniciou. Só depois da transição a promovemos a `livre`: assim a URL
     recebe a câmera que de fato apareceu na tela, não a posição intermediária. */
  function promoverCameraAtualParaLivre() {
    vistaAtual = 'livre';
    aoMudarVista?.(vistaAtual);
  }

  function enquadrar(objetos = alvosAtuais, { instantaneo = false, reproduzivel = false } = {}) {
    const caixa = caixaValida(objetos);
    if (caixa) {
      centroAtual = caixa.getCenter(new THREE.Vector3());
      raioAtual = Math.max(0.12, caixa.getBoundingSphere(new THREE.Sphere()).radius);
      alvosAtuais = objetos.slice();
    }
    definirVista(vistaAtual === 'livre' ? 'isometrica' : vistaAtual, { instantaneo });
    if (reproduzivel) {
      if (transicao) publicarCameraLivreAoEstabilizar = true;
      else promoverCameraAtualParaLivre();
    }
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
    camera.zoom = segura === 'ortografica' ? camera.zoom : 1;
    camera.updateProjectionMatrix();
    controls.object = camera;
    if (vistaAtual === 'livre') {
      ajustarOrtografica();
      controls.update();
      return;
    }
    definirVista(vistaAtual === 'livre' ? 'isometrica' : vistaAtual, { instantaneo: true });
  }

  function cameraLivre() {
    if (vistaAtual !== 'livre') return null;
    return {
      posicao: camera.position.toArray(),
      alvo: controls.target.toArray(),
      acima: camera.up.toArray(),
      zoom: camera.zoom,
    };
  }

  function restaurarCameraLivre(estado) {
    transicao = null;
    controls.enabled = true;
    camera.position.fromArray(estado.posicao);
    camera.up.fromArray(estado.acima).normalize();
    camera.zoom = estado.zoom;
    camera.updateProjectionMatrix();
    controls.target.fromArray(estado.alvo);
    camera.lookAt(controls.target);
    controls.update();
    vistaAtual = 'livre';
    piso.visible = true;
    grade.visible = true;
    aoMudarVista?.(vistaAtual);
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

  /* Mede o enquadramento pela geometria projetada, não pelo PNG (que também
     contém painéis da interface, grade e sombras). É uma observação neutra da
     bancada: serve tanto para uma roda quanto para uma peça de mobiliário.
     `cortado` é propositalmente estrito — revisão automática não deve aceitar
     uma vista que esconde uma parte da silhueta. */
  function medirEnquadramento(objetos = alvosAtuais) {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    const minimo = new THREE.Vector2(Infinity, Infinity);
    const maximo = new THREE.Vector2(-Infinity, -Infinity);
    let pontos = 0;
    for (const objeto of objetos.filter(Boolean)) {
      objeto.traverse((filho) => {
        const posicao = filho.geometry?.getAttribute?.('position');
        if (!posicao) return;
        const p = new THREE.Vector3();
        for (let i = 0; i < posicao.count; i++) {
          p.fromBufferAttribute(posicao, i).applyMatrix4(filho.matrixWorld).project(camera);
          minimo.min(p);
          maximo.max(p);
          pontos++;
        }
      });
    }
    if (!pontos) return { valida: false, motivo: 'sem geometria projetável' };
    const larguraBruta = maximo.x - minimo.x;
    const alturaBruta = maximo.y - minimo.y;
    const largura = Math.max(0, Math.min(2, maximo.x) - Math.max(-2, minimo.x)) / 2;
    const altura = Math.max(0, Math.min(2, maximo.y) - Math.max(-2, minimo.y)) / 2;
    const cortado = minimo.x < -1.001 || minimo.y < -1.001 || maximo.x > 1.001 || maximo.y > 1.001;
    return {
      /* Uma chapa pode projetar pouca área e ainda ser legível. A régua exige
         32% no eixo longo e 4% no curto, para não confundir espessura real com
         uma projeção vazia ou quase unidimensional. */
      valida: enquadramentoUtil({ largura, altura, cortado }),
      pontos,
      largura,
      altura,
      area: largura * altura,
      larguraBruta: larguraBruta / 2,
      alturaBruta: alturaBruta / 2,
      cortado,
    };
  }

  /* Não inferimos oclusão por caixa ou por nome. A prova de par usa um render
     temporário de ID por parte, com depth buffer normal, e conta os pixels que
     realmente chegaram à tela. Materiais, piso e cena voltam exatamente ao
     estado anterior antes do próximo quadro visível. */
  function medirPixelsVisiveisPorParte(objetos) {
    const grupos = objetos.filter(Boolean);
    const tamanho = renderer.getDrawingBufferSize(new THREE.Vector2());
    const largura = Math.max(1, Math.min(1024, tamanho.x));
    const altura = Math.max(1, Math.min(1024, tamanho.y));
    const alvo = new THREE.WebGLRenderTarget(largura, altura, { depthBuffer: true });
    const leitura = new Uint8Array(largura * altura * 4);
    const anterior = renderer.getRenderTarget();
    const fundoAnterior = scene.background;
    const pisoVisivel = piso.visible;
    const gradeVisivel = grade.visible;
    const trocas = [];
    const materiais = [];
    const cores = grupos.map((_, indice) => new THREE.Color(indice === 0 ? '#ff0000' : '#00ff00'));
    const contagens = grupos.map(() => 0);

    try {
      piso.visible = false;
      grade.visible = false;
      scene.background = new THREE.Color('#000000');
      grupos.forEach((grupo, indice) => {
        grupo.traverse((filho) => {
          if (!filho.isMesh) return;
          const material = new THREE.MeshBasicMaterial({ color: cores[indice], toneMapped: false });
          trocas.push([filho, filho.material]);
          materiais.push(material);
          filho.material = material;
        });
      });
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      renderer.setRenderTarget(alvo);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(alvo, 0, 0, largura, altura, leitura);
      for (let indice = 0; indice < leitura.length; indice += 4) {
        const vermelho = leitura[indice];
        const verde = leitura[indice + 1];
        const azul = leitura[indice + 2];
        if (vermelho > 96 && vermelho > verde * 2 && vermelho > azul * 2) contagens[0]++;
        if (contagens.length > 1 && verde > 96 && verde > vermelho * 2 && verde > azul * 2) contagens[1]++;
      }
    } finally {
      for (const [malha, material] of trocas) malha.material = material;
      for (const material of materiais) material.dispose();
      piso.visible = pisoVisivel;
      grade.visible = gradeVisivel;
      scene.background = fundoAnterior;
      renderer.setRenderTarget(anterior);
      alvo.dispose();
    }
    return grupos.map((grupo, indice) => ({
      nome: grupo.userData.identidadeParte ?? grupo.name ?? String(indice),
      pixels: contagens[indice],
    }));
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
        if (publicarCameraLivreAoEstabilizar) {
          publicarCameraLivreAoEstabilizar = false;
          promoverCameraAtualParaLivre();
        }
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
    cameraLivre,
    restaurarCameraLivre,
    enquadrar,
    referenciaMetrica,
    medirEnquadramento,
    medirPixelsVisiveisPorParte,
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
