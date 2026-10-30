/* contorno-da-selecao.js — o contorno da seleção na borda da peça: uma linha da cor de destaque em volta da silhueta das partes escolhidas, desenhada por cima do quadro, no lugar do tingimento verde.
 *
 * Duas passadas depois do quadro normal. A primeira desenha só as partes escolhidas, em branco chapado, numa imagem fora
 * da tela (a máscara): as malhas entram numa camada própria da câmera só durante essa passada, e o resto da cena fica de
 * fora. A segunda cobre a tela com um retângulo cujo material acende o pixel que está fora da máscara e tem um vizinho
 * dentro dela, a até `espessura` pixels: isso é a borda da silhueta, do lado de fora. Nada muda nos materiais da peça,
 * então a cor que as visões medem continua a mesma, e a silhueta aparece mesmo onde outra parte a cobre.
 *
 * O ambiente chama `desenhar` a cada quadro, e só quando o tema pede o contorno, fora da auditoria e com seleção à vista.
 * Não toca a página. */
import * as THREE from 'three';

/** A camada da câmera que a máscara usa; nenhuma outra parte da bancada usa camada. */
export const CAMADA_DO_CONTORNO = 31;

/** As direções em que o material procura a máscara, em volta do pixel, a cada `espessura`. */
export function direcoesDaBorda(passos = 12) {
  return Array.from({ length: passos }, (_, indice) => {
    const angulo = (indice / passos) * Math.PI * 2;
    return [Number(Math.cos(angulo).toFixed(6)), Number(Math.sin(angulo).toFixed(6))];
  });
}

export function criarContornoDaSelecao(renderer) {
  const mascara = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  const branco = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const direcoes = direcoesDaBorda();
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      mapa: { value: mascara.texture },
      texel: { value: new THREE.Vector2(1, 1) },
      cor: { value: new THREE.Color('#c2531b') },
      espessura: { value: 2 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D mapa;
      uniform vec2 texel;
      uniform vec3 cor;
      uniform float espessura;
      varying vec2 vUv;
      void main() {
        if (texture2D(mapa, vUv).a > 0.5) discard;
        float perto = 0.0;
        ${direcoes.map(([x, y]) => `
        perto = max(perto, texture2D(mapa, vUv + vec2(${x.toFixed(6)}, ${y.toFixed(6)}) * texel * espessura).a);
        perto = max(perto, texture2D(mapa, vUv + vec2(${x.toFixed(6)}, ${y.toFixed(6)}) * texel * espessura * 0.5).a);`).join('')}
        if (perto < 0.5) discard;
        gl_FragColor = vec4(cor, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const quadro = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quadro.frustumCulled = false;
  const cenaDoQuadro = new THREE.Scene();
  cenaDoQuadro.add(quadro);
  const cameraDoQuadro = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const tamanho = new THREE.Vector2();
  const corDeLimpeza = new THREE.Color();

  function marcar(grupos, ligar) {
    for (const grupo of grupos) {
      grupo.traverse((objeto) => {
        if (!objeto.isMesh) return;
        if (ligar) objeto.layers.enable(CAMADA_DO_CONTORNO);
        else objeto.layers.disable(CAMADA_DO_CONTORNO);
      });
    }
  }

  /** Desenha o contorno de `grupos` por cima do que já está na tela, com a cor `cor` e a câmera `camera`. */
  function desenhar({ scene, camera, grupos, cor }) {
    if (!grupos.length) return;
    renderer.getDrawingBufferSize(tamanho);
    if (mascara.width !== tamanho.x || mascara.height !== tamanho.y) mascara.setSize(tamanho.x, tamanho.y);
    const pixelRatio = renderer.getPixelRatio();

    const guardado = {
      fundo: scene.background,
      material: scene.overrideMaterial,
      camadas: camera.layers.mask,
      alvo: renderer.getRenderTarget(),
      alfa: renderer.getClearAlpha(),
      limpar: renderer.autoClear,
      sombras: renderer.shadowMap.autoUpdate,
    };
    renderer.getClearColor(corDeLimpeza);

    marcar(grupos, true);
    scene.background = null;
    scene.overrideMaterial = branco;
    camera.layers.set(CAMADA_DO_CONTORNO);
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(mascara);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    scene.background = guardado.fundo;
    scene.overrideMaterial = guardado.material;
    camera.layers.mask = guardado.camadas;
    renderer.shadowMap.autoUpdate = guardado.sombras;
    marcar(grupos, false);

    renderer.setRenderTarget(guardado.alvo);
    renderer.setClearColor(corDeLimpeza, guardado.alfa);
    if (cor) material.uniforms.cor.value.set(cor);
    material.uniforms.texel.value.set(1 / tamanho.x, 1 / tamanho.y);
    material.uniforms.espessura.value = 2 * pixelRatio;
    renderer.autoClear = false;
    renderer.render(cenaDoQuadro, cameraDoQuadro);
    renderer.autoClear = guardado.limpar;
  }

  return {
    desenhar,
    destruir() {
      mascara.dispose();
      branco.dispose();
      material.dispose();
      quadro.geometry.dispose();
    },
  };
}
