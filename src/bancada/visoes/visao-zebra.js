/* visao-zebra.js — a visão Zebra da bancada: listras pelo vetor refletido, como a zebra das vistas do Blender (`_material` de
 * `tools/blender/comum.py`, tipo 'zebra'), e um controle da largura delas que aparece só com a zebra ligada.
 *
 * A listra é a de um ambiente de faixas horizontais visto por reflexo: em cada ponto, o olhar refletido pela normal, e o tom é
 * 0,93 onde sin(R.y · f) passa de zero e 0,08 onde não passa, como no Blender, com a borda da listra suavizada na largura de um
 * pixel. Como depende do olhar, as listras andam quando a câmera gira, e a superfície lisa as mostra contínuas: o amassado e a
 * quina que ondula as entortam. A face vista por trás sai multiplicada pela cor de avesso do Blender. O material não tem luz nem o
 * mapeamento de tons da cena (`toneMapped: false`), como a emissão do Blender.
 *
 * A largura de cada listra, no controle, é o ângulo que ela ocupa no horizonte do reflexo, 180/f graus; a de partida, 4,5 graus,
 * é a do Blender (f = 40). Todas as malhas da peça leem a mesma largura, e mudar o controle não recompila nada. O controle mora
 * na caixa da visão (`contexto.pagina`), e a visão não toca a página. */
import * as THREE from 'three';
import { restaurarMateriais, trocarMateriais } from './materiais-da-visao.js';

const ID = 'zebra';
export const FREQUENCIA_DO_BLENDER = 40;
export const LARGURA_PADRAO = 180 / FREQUENCIA_DO_BLENDER;
export const LARGURA_MINIMA = 1.5;
export const LARGURA_MAXIMA = 15;
export const COR_DO_AVESSO = Object.freeze([0.85, 0.30, 0.80]);

/** A frequência do seno de R.y para uma listra de `largura` graus no horizonte do reflexo. */
export const frequenciaDaLargura = (largura) => 180 / Math.min(LARGURA_MAXIMA, Math.max(LARGURA_MINIMA, largura));

/* A mesma largura vale em qualquer peça e sobrevive à troca de visão enquanto a página está aberta. */
const frequencia = { value: FREQUENCIA_DO_BLENDER };

const VARIAVEIS = `
varying vec3 vZebraPosicao;
varying vec3 vZebraNormal;
`;

/** O material da zebra: o básico do Three, com a cor da superfície trocada pelo tom da listra. */
export function materialDaZebra() {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uZebraFrequencia = frequencia;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VARIAVEIS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
  vZebraPosicao = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vZebraNormal = normalize(mat3(modelMatrix) * normal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${VARIAVEIS}uniform float uZebraFrequencia;`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
  vec3 zebraNormal = normalize(vZebraNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 zebraOlhar = isOrthographic
    ? -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
    : normalize(vZebraPosicao - cameraPosition);
  vec3 zebraReflexo = reflect(zebraOlhar, zebraNormal);
  float zebraOnda = sin(zebraReflexo.y * uZebraFrequencia);
  float zebraBorda = max(fwidth(zebraOnda), 1e-4);
  float zebraTom = smoothstep(-zebraBorda, zebraBorda, zebraOnda) * 0.85 + 0.08;
  vec3 zebraAvesso = gl_FrontFacing ? vec3(1.0) : vec3(${COR_DO_AVESSO.map((c) => c.toFixed(2)).join(', ')});
  vec4 diffuseColor = vec4(diffuse * zebraTom * zebraAvesso, opacity);`);
  };
  material.customProgramCacheKey = () => 'visao-zebra';
  return material;
}

function formatarGraus(largura) {
  return `${largura.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}°`;
}

/* A página da visão ligada, para o controle acompanhar a largura trocada fora dele. */
let paginaLigada = null;

function mostrarControle(pagina) {
  pagina?.mostrar(ID, {
    titulo: 'Zebra',
    controle: {
      rotulo: 'Largura das listras',
      nome: 'larguraDaZebra',
      min: LARGURA_MINIMA,
      max: LARGURA_MAXIMA,
      passo: 0.5,
      valor: larguraDaZebra(),
      formatar: formatarGraus,
      aoMudar: (largura) => { frequencia.value = frequenciaDaLargura(largura); },
    },
    linhas: [{ texto: 'Listras do reflexo: lisas e contínuas na chapa boa, tortas no amassado e na quina que ondula.' }],
    dados: { largura: larguraDaZebra() },
  });
}

export function aplicarZebra(contexto) {
  trocarMateriais(contexto.grupo, materialDaZebra, contexto.controlador);
  paginaLigada = contexto.pagina ?? null;
  mostrarControle(paginaLigada);
}

export function desfazerZebra(contexto) {
  restaurarMateriais(contexto.grupo, contexto.controlador);
  contexto.pagina?.fechar(ID);
  paginaLigada = null;
}

/** A largura das listras em vigor, em graus, e a troca dela sem o controle (para os testes e as provas). */
export const larguraDaZebra = () => 180 / frequencia.value;
export function definirLarguraDaZebra(largura) {
  frequencia.value = frequenciaDaLargura(largura);
  mostrarControle(paginaLigada);
  return larguraDaZebra();
}
