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
 * na caixa da visão (`contexto.pagina`), e a visão não toca a página.
 *
 * A DIREÇÃO DA LISTRA. A listra de 0 grau, a de partida, é a do Blender: o tom sai do componente vertical (y do mundo) do olhar
 * refletido, e por isso a zebra só vê a normal inclinar para cima e para baixo; o defeito que só a inclina para os lados (a linha em pé,
 * a onda de cristas em pé) quase não muda a faixa (estudo de leitura do plano do reflexo, fatia 7). O ângulo da listra gira a direção
 * lida em torno do eixo do olhar: o tom sai do componente do reflexo ao longo de cos(a)·y + sen(a)·d, com d a direita da câmera deitada
 * no plano horizontal, de modo que a 90 graus a listra fica em pé na imagem e lê a inclinação para os lados. O botão da caixa troca entre
 * 0 e 90 graus, e a captura aceita qualquer ângulo (`--angulo-da-zebra`). Com 0 grau o tom é o de antes, bit a bit. */
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

export const ANGULO_PADRAO = 0;
export const ANGULO_MINIMO = -180;
export const ANGULO_MAXIMO = 180;

/* A mesma largura e o mesmo ângulo valem em qualquer peça e sobrevivem à troca de visão enquanto a página está aberta. */
const frequencia = { value: FREQUENCIA_DO_BLENDER };
const angulo = { value: 0 };
/** O ângulo da listra em graus, limitado a -180 a 180, e o mesmo em radiano para o shader. */
const anguloLimitado = (graus) => Math.min(ANGULO_MAXIMO, Math.max(ANGULO_MINIMO, Number(graus) || 0));

const VARIAVEIS = `
varying vec3 vZebraPosicao;
varying vec3 vZebraNormal;
`;

/** O material da zebra: o básico do Three, com a cor da superfície trocada pelo tom da listra. */
export function materialDaZebra() {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uZebraFrequencia = frequencia;
    shader.uniforms.uZebraAngulo = angulo;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VARIAVEIS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
  vZebraPosicao = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vZebraNormal = normalize(mat3(modelMatrix) * normal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${VARIAVEIS}uniform float uZebraFrequencia;\nuniform float uZebraAngulo;`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
  vec3 zebraNormal = normalize(vZebraNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 zebraOlhar = isOrthographic
    ? -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
    : normalize(vZebraPosicao - cameraPosition);
  vec3 zebraReflexo = reflect(zebraOlhar, zebraNormal);
  vec3 zebraDireita = vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]);
  zebraDireita = dot(zebraDireita, zebraDireita) > 1e-8 ? normalize(zebraDireita) : vec3(1.0, 0.0, 0.0);
  float zebraLido = uZebraAngulo == 0.0 ? zebraReflexo.y : cos(uZebraAngulo) * zebraReflexo.y + sin(uZebraAngulo) * dot(zebraReflexo, zebraDireita);
  float zebraOnda = sin(zebraLido * uZebraFrequencia);
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

/* o texto da direção, na caixa: deitada a 0 grau, em pé a 90, e o ângulo nos outros */
function textoDaDirecao(graus) {
  if (graus === 0) return 'Listras deitadas (0°): leem a superfície inclinar para cima e para baixo; a linha ou a onda em pé quase não muda a faixa.';
  if (Math.abs(graus) === 90) return `Listras em pé (${graus}°): leem a superfície inclinar para os lados; a linha ou a onda deitada quase não muda a faixa.`;
  return `Listras a ${formatarGraus(graus)} da horizontal: leem a inclinação nessa direção.`;
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
    botao: {
      rotulo: anguloDaZebra() === 0 ? 'Listras em pé' : 'Listras deitadas',
      titulo: 'Gira a direção das listras entre 0 e 90 graus: uma direção vê o que a outra não vê.',
      aoClicar: () => { definirAnguloDaZebra(anguloDaZebra() === 0 ? 90 : 0); },
    },
    linhas: [
      { texto: 'Listras do reflexo: lisas e contínuas na chapa boa, tortas no amassado e na quina que ondula.' },
      { texto: textoDaDirecao(anguloDaZebra()) },
    ],
    dados: { largura: larguraDaZebra(), angulo: anguloDaZebra() },
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

/** O ângulo da listra em vigor, em graus (0 deitada, a do Blender; 90 em pé), e a troca dele sem o botão. */
export const anguloDaZebra = () => Math.round((angulo.value * 180) / Math.PI * 1e6) / 1e6;
export function definirAnguloDaZebra(graus) {
  angulo.value = (anguloLimitado(graus) * Math.PI) / 180;
  mostrarControle(paginaLigada);
  return anguloDaZebra();
}
