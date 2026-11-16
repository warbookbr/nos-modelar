/* visao-pintura.js — a visão Pintura da bancada: a peça vista como verniz brilhante sobre base escura, que reflete um ambiente de
 * faixas de luz paralelas ao comprimento dela. É a imagem que se compara com a foto de um carro de estúdio, e a segunda leitura da
 * superfície depois da zebra: a faixa lisa e contínua é a chapa boa, a faixa que serpenteia, se amontoa ou quebra é a chapa que
 * ondula.
 *
 * É VISÃO DE INSPEÇÃO: troca o material da peça enquanto está ligada, como a zebra, e não é material da peça, não entra na receita
 * nem na paleta e não muda o que a bancada salva. O ambiente é calculado aqui, de números, sem arquivo de imagem nem relógio.
 *
 * A CONTA, por pixel: o olhar refletido pela normal (`reflect`, como na zebra) cai no ambiente, que são faixas ao redor do EIXO DO
 * COMPRIMENTO da peça (o eixo mais longo da caixa dela no mundo, medido ao ligar): a faixa é uma luz comprida paralela a esse eixo,
 * como as caixas de luz de um estúdio, vista em reflexo. O ângulo do reflexo ao redor do eixo escolhe a faixa (`cos(N·φ)` acima de
 * um limiar, com N inteiro para não haver emenda), e a borda é suavizada na largura de um pixel. O verniz soma ao escuro da base a
 * reflexão de Fresnel (0,05 de frente, subindo para o rasante) vezes a luz da faixa, e o resultado passa por uma curva de tons
 * própria; o material não tem luz nem o mapeamento de tons da cena (`toneMapped: false`).
 *
 * A LARGURA, no controle, é o ângulo que cada faixa de luz ocupa ao redor do eixo, de 1,5 a 15 graus, e o vão escuro entre elas
 * mede quase o dobro. Todas as malhas leem a mesma largura, e mudar o controle não recompila nada. O controle mora na caixa
 * da visão (`contexto.pagina`), e a visão não toca a página. */
import * as THREE from 'three';
import { restaurarMateriais, trocarMateriais } from './materiais-da-visao.js';

const ID = 'pintura';
export const LARGURA_PADRAO_DA_FAIXA = 10;
export const LARGURA_MINIMA_DA_FAIXA = 1.5;
export const LARGURA_MAXIMA_DA_FAIXA = 15;
/** A fração do período ocupada pela luz: a faixa mede 0,35 do período, e o vão escuro, 0,65. */
export const FRACAO_DA_LUZ = 0.35;
export const COR_DA_BASE = Object.freeze([0.012, 0.016, 0.03]);
export const LUZ_DA_FAIXA = 14;

/** O número inteiro de faixas ao redor do eixo para uma faixa de `largura` graus. */
export const faixasDaLargura = (largura) => Math.max(3, Math.round(360 * FRACAO_DA_LUZ / Math.min(LARGURA_MAXIMA_DA_FAIXA, Math.max(LARGURA_MINIMA_DA_FAIXA, largura))));
/** A largura, em graus, que o número inteiro de faixas dá. */
export const larguraDasFaixas = (faixas) => (360 * FRACAO_DA_LUZ) / faixas;

/* Valem para qualquer peça e sobrevivem à troca de visão enquanto a página está aberta. */
const faixas = { value: faixasDaLargura(LARGURA_PADRAO_DA_FAIXA) };
const eixo = { value: new THREE.Vector3(0, 0, 1) };

const VARIAVEIS = `
varying vec3 vPinturaPosicao;
varying vec3 vPinturaNormal;
`;

/** O material da pintura: o básico do Three, com a cor da superfície trocada pela do verniz que reflete as faixas. */
export function materialDaPintura() {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPinturaFaixas = faixas;
    shader.uniforms.uPinturaEixo = eixo;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VARIAVEIS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
  vPinturaPosicao = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vPinturaNormal = normalize(mat3(modelMatrix) * normal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${VARIAVEIS}uniform float uPinturaFaixas;\nuniform vec3 uPinturaEixo;`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
  vec3 pinturaNormal = normalize(vPinturaNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 pinturaOlhar = isOrthographic
    ? -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
    : normalize(vPinturaPosicao - cameraPosition);
  vec3 pinturaReflexo = reflect(pinturaOlhar, pinturaNormal);
  vec3 pinturaA = normalize(uPinturaEixo);
  vec3 pinturaCima = abs(pinturaA.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 pinturaB = normalize(cross(pinturaA, pinturaCima));
  vec3 pinturaC = cross(pinturaB, pinturaA);
  float pinturaAngulo = atan(dot(pinturaReflexo, pinturaB), dot(pinturaReflexo, pinturaC));
  float pinturaOnda = cos(pinturaAngulo * uPinturaFaixas);
  float pinturaLimiar = cos(3.14159265 * ${FRACAO_DA_LUZ.toFixed(2)});
  float pinturaBorda = max(2.0 * fwidth(pinturaOnda), 0.03);
  float pinturaFaixa = smoothstep(pinturaLimiar - pinturaBorda, pinturaLimiar + pinturaBorda, pinturaOnda);
  /* perto do eixo as faixas convergem num ponto; a luz some ali, como a caixa de luz que acaba, e não deixa o leque no quadro */
  pinturaFaixa *= 1.0 - smoothstep(0.7, 0.9, abs(dot(pinturaReflexo, pinturaA)));
  float pinturaCos = clamp(dot(-pinturaOlhar, pinturaNormal), 0.0, 1.0);
  float pinturaFresnel = 0.05 + 0.95 * pow(1.0 - pinturaCos, 5.0);
  vec3 pinturaBase = vec3(${COR_DA_BASE.map((c) => c.toFixed(3)).join(', ')}) * (0.6 + 0.4 * pinturaNormal.y);
  vec3 pinturaLuz = vec3(${LUZ_DA_FAIXA.toFixed(1)}) * pinturaFaixa + vec3(0.02);
  vec3 pinturaLinear = pinturaBase + pinturaFresnel * pinturaLuz;
  vec3 pinturaTom = vec3(1.0) - exp(-1.5 * pinturaLinear);
  vec4 diffuseColor = vec4(diffuse * pinturaTom, opacity);`);
  };
  material.customProgramCacheKey = () => 'visao-pintura';
  return material;
}

/** O eixo do comprimento da peça no mundo: o eixo de coordenadas da maior dimensão da caixa do grupo (o do carro, z). */
export function eixoDoComprimento(grupo) {
  const caixa = new THREE.Box3().setFromObject(grupo);
  if (caixa.isEmpty()) return new THREE.Vector3(0, 0, 1);
  const t = caixa.getSize(new THREE.Vector3());
  if (t.x >= t.y && t.x >= t.z) return new THREE.Vector3(1, 0, 0);
  if (t.y >= t.x && t.y >= t.z) return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function formatarGraus(largura) {
  return `${largura.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}°`;
}

/* A página da visão ligada, para o controle acompanhar a largura trocada fora dele. */
let paginaLigada = null;

function mostrarControle(pagina) {
  pagina?.mostrar(ID, {
    titulo: 'Pintura',
    controle: {
      rotulo: 'Largura das faixas',
      nome: 'larguraDaPintura',
      min: LARGURA_MINIMA_DA_FAIXA,
      max: LARGURA_MAXIMA_DA_FAIXA,
      passo: 0.5,
      valor: larguraDaPintura(),
      formatar: formatarGraus,
      aoMudar: (largura) => { faixas.value = faixasDaLargura(largura); },
    },
    linhas: [{ texto: 'Verniz sobre base escura refletindo faixas de luz ao longo da peça: faixas retas e contínuas na chapa boa, tortas onde ela ondula.' }],
    dados: { largura: larguraDaPintura() },
  });
}

export function aplicarPintura(contexto) {
  eixo.value.copy(eixoDoComprimento(contexto.grupo));
  trocarMateriais(contexto.grupo, materialDaPintura, contexto.controlador);
  paginaLigada = contexto.pagina ?? null;
  mostrarControle(paginaLigada);
}

export function desfazerPintura(contexto) {
  restaurarMateriais(contexto.grupo, contexto.controlador);
  contexto.pagina?.fechar(ID);
  paginaLigada = null;
}

/** A largura das faixas em vigor, em graus (a do número inteiro de faixas mais perto), e a troca dela sem o controle. */
export const larguraDaPintura = () => larguraDasFaixas(faixas.value);
export function definirLarguraDaPintura(largura) {
  faixas.value = faixasDaLargura(largura);
  mostrarControle(paginaLigada);
  return Math.round(larguraDaPintura() * 100) / 100;
}
