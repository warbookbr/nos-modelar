/* cenario-do-tema.js — o cenário que um tema pode pedir à cena 3D: a grade que some nas bordas e a sombra suave no chão.
 *
 * O ambiente (`criar-ambiente.js`) cria estes objetos uma vez e só os mostra quando o tema em vigor os pede e o cenário
 * pode aparecer (fora da auditoria, da vista de baixo e da explosão aberta), pelas mesmas regras da grade e do chão de
 * sempre. Sem tema que os peça, a cena fica como era. Não toca a página.
 *
 * A grade é a de sempre desenhada por outro material: a opacidade cai com a distância ao centro, de cheia até `raioCheio`
 * a nada em `raioFim`, para a grade não terminar numa borda reta no meio do fundo. A sombra é um plano que só recebe
 * sombra (`ShadowMaterial`), sem cor própria: o chão continua sendo o fundo, e a peça ganha a mancha que a assenta. */
import * as THREE from 'three';

export const TAMANHO_DA_GRADE = 12;
export const DIVISOES_DA_GRADE = 24;

/** A opacidade da grade a `distancia` do centro, a mesma conta do material, para o teste conferir sem placa de vídeo. */
export function opacidadeDaGrade(distancia, { raioCheio = 2.2, raioFim = 5.6, opacidade = 0.55 } = {}) {
  const t = Math.min(1, Math.max(0, (distancia - raioCheio) / (raioFim - raioCheio)));
  return opacidade * (1 - t * t * (3 - 2 * t));
}

function criarGradeEsmaecida() {
  const base = new THREE.GridHelper(TAMANHO_DA_GRADE, DIVISOES_DA_GRADE);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      cor: { value: new THREE.Color('#c3c9c6') },
      opacidade: { value: 0.55 },
      raioCheio: { value: 2.2 },
      raioFim: { value: 5.6 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vMundo;
      void main() {
        vec4 mundo = modelMatrix * vec4(position, 1.0);
        vMundo = mundo.xyz;
        gl_Position = projectionMatrix * viewMatrix * mundo;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 cor;
      uniform float opacidade;
      uniform float raioCheio;
      uniform float raioFim;
      varying vec3 vMundo;
      void main() {
        float d = length(vMundo.xz);
        gl_FragColor = vec4(cor, opacidade * (1.0 - smoothstep(raioCheio, raioFim, d)));
        #include <colorspace_fragment>
      }`,
  });
  const grade = new THREE.LineSegments(base.geometry, material);
  grade.name = '__grade_do_tema__';
  grade.position.y = 0.003;
  grade.visible = false;
  base.material.dispose();
  return grade;
}

function criarSombraNoChao() {
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.ShadowMaterial({ color: '#1c2220', opacity: 0.2 }),
  );
  sombra.name = '__sombra_do_tema__';
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.001;
  sombra.receiveShadow = true;
  sombra.visible = false;
  return sombra;
}

/** Cria a grade esmaecida e a sombra no chão, fora da cena; quem chama as põe na cena e decide quando aparecem. */
export function criarCenarioDoTema() {
  const grade = criarGradeEsmaecida();
  const sombra = criarSombraNoChao();
  return {
    grade,
    sombra,
    /** A cor da grade e a opacidade dela, que a explosão da montagem apaga junto com o cenário. */
    pintar({ corDaGrade, fatorExplosao = 1 }) {
      if (corDaGrade) grade.material.uniforms.cor.value.set(corDaGrade);
      grade.material.uniforms.opacidade.value = 0.55 * fatorExplosao;
      sombra.material.opacity = 0.2 * fatorExplosao;
    },
  };
}
