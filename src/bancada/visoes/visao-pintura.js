/* visao-pintura.js — a visão Pintura da bancada: a peça vista como lataria pintada de vermelho sob verniz, refletindo um estúdio de
 * fotografia de carro: um gradiente do céu claro em cima para o chão escuro embaixo e janelas de luz grandes, de borda suave. É a
 * imagem que se compara com a foto de um carro de estúdio, e a segunda leitura da superfície depois da zebra: a borda do reflexo da
 * janela reta e o gradiente contínuo são a chapa boa, a borda torta ou o gradiente quebrado são a chapa que ondula.
 *
 * É VISÃO DE INSPEÇÃO: troca o material da peça enquanto está ligada, como a zebra, e não é material da peça, não entra na receita
 * nem na paleta e não muda o que a bancada salva. O vermelho é uma cor fixa de inspeção, escolhida para contrastar com o branco
 * das janelas, e o estúdio é calculado aqui, de números, sem arquivo de imagem nem relógio.
 *
 * A CONTA, por pixel: o olhar refletido pela normal (`reflect`) cai no estúdio, descrito no sistema da peça: A é o eixo do
 * COMPRIMENTO dela (o eixo mais longo da caixa no mundo, medido ao ligar), U é o cima do mundo e S é o lado. O estúdio tem (1) o
 * gradiente de céu e chão pela altura da direção refletida, (2) as caixas de luz do teto, retângulos alongados no sentido de A num
 * plano acima da peça, lado a lado no sentido de S, e (3) uma janela de luz de cada lado, no horizonte, que é o que a lateral
 * reflete. A borda de cada caixa é suavizada por uma largura fixa mais a de um pixel. A pintura é a cor vermelha vezes o estúdio
 * (o pigmento reflete o ambiente), somada ao reflexo do verniz, que é de Fresnel (0,04 de frente, subindo para o rasante) vezes o
 * estúdio. O material não tem luz nem o mapeamento de tons da cena (`toneMapped: false`).
 *
 * O CONTROLE é o número de caixas de luz do teto, de 1 a 4. Todas as malhas leem o mesmo número, e mudar o controle não recompila
 * nada. O controle mora na caixa da visão (`contexto.pagina`), e a visão não toca a página. */
import * as THREE from 'three';
import { restaurarMateriais, superficiesDe, trocarMateriais } from './materiais-da-visao.js';

const ID = 'pintura';
export const CAIXAS_PADRAO = 2;
export const CAIXAS_MINIMAS = 1;
export const CAIXAS_MAXIMAS = 4;
/** A cor da tinta de inspeção, linear: um vermelho médio. */
export const COR_DA_TINTA = Object.freeze([0.55, 0.035, 0.04]);

/** O número inteiro de caixas de luz do teto mais perto de `n`, dentro dos limites. */
export const caixasValidas = (n) => Math.min(CAIXAS_MAXIMAS, Math.max(CAIXAS_MINIMAS, Math.round(Number(n))));

/* Valem para qualquer peça e sobrevivem à troca de visão enquanto a página está aberta. */
const caixas = { value: CAIXAS_PADRAO };
const eixo = { value: new THREE.Vector3(0, 0, 1) };

const VARIAVEIS = `
varying vec3 vPinturaPosicao;
varying vec3 vPinturaNormal;
`;

/** O trecho do fragmento que dá o estúdio (o brilho, de 0 a cerca de 6, na direção `d` do sistema A, U, S) e a pintura. */
const ESTUDIO = `
float pinturaCaixa(vec2 p, vec2 meio, float suave) {
  vec2 q = abs(p) - meio;
  float f = max(fwidth(p.x), fwidth(p.y));
  float s = suave + 1.5 * f;
  return (1.0 - smoothstep(-s, s, q.x)) * (1.0 - smoothstep(-s, s, q.y));
}
float pinturaEstudio(vec3 d, float n) {
  float a = d.x; float u = d.y; float s = d.z;
  /* céu e chão: do branco-azulado em cima a um cinza no horizonte e quase preto no chão */
  float ceu = mix(0.5, 0.9, smoothstep(0.0, 0.9, u));
  float chao = mix(0.5, 0.06, smoothstep(0.0, -0.6, u));
  float fundo = u >= 0.0 ? ceu : chao;
  float luz = 0.0;
  /* caixas do teto, a altura 1: alongadas em A, lado a lado em S */
  if (u > 0.08) {
    vec2 p = vec2(a, s) / u;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      if (fi < n) {
        float centro = (fi - 0.5 * (n - 1.0)) * 1.1;
        luz = max(luz, pinturaCaixa(p - vec2(0.0, centro), vec2(2.6, 0.17), 0.12) * smoothstep(0.08, 0.2, u));
      }
    }
  }
  /* uma janela de luz de cada lado, no horizonte, a distância 1 */
  float lado = abs(s);
  if (lado > 0.25) {
    vec2 q = vec2(a, u) / lado;
    luz = max(luz, pinturaCaixa(q - vec2(0.0, 0.4), vec2(1.7, 0.4), 0.04) * smoothstep(0.25, 0.4, lado));
  }
  return fundo + 3.0 * luz;
}
`;

/** O material da pintura: o básico do Three, com a cor da superfície trocada pela da tinta com verniz que reflete o estúdio. */
export function materialDaPintura() {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPinturaCaixas = caixas;
    shader.uniforms.uPinturaEixo = eixo;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VARIAVEIS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
  vPinturaPosicao = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vPinturaNormal = normalize(mat3(modelMatrix) * normal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${VARIAVEIS}uniform float uPinturaCaixas;\nuniform vec3 uPinturaEixo;\n${ESTUDIO}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
  vec3 pinturaNormal = normalize(vPinturaNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 pinturaOlhar = isOrthographic
    ? -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])
    : normalize(vPinturaPosicao - cameraPosition);
  vec3 pinturaReflexo = reflect(pinturaOlhar, pinturaNormal);
  vec3 pinturaA = normalize(uPinturaEixo);
  vec3 pinturaCima = abs(pinturaA.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 pinturaS = normalize(cross(pinturaA, pinturaCima));
  vec3 pinturaU = cross(pinturaS, pinturaA);
  vec3 pinturaD = vec3(dot(pinturaReflexo, pinturaA), dot(pinturaReflexo, pinturaU), dot(pinturaReflexo, pinturaS));
  float pinturaAmbiente = pinturaEstudio(pinturaD, uPinturaCaixas);
  float pinturaCos = clamp(dot(-pinturaOlhar, pinturaNormal), 0.0, 1.0);
  float pinturaFresnel = 0.04 + 0.96 * pow(1.0 - pinturaCos, 5.0);
  vec3 pinturaTinta = vec3(${COR_DA_TINTA.map((c) => c.toFixed(3)).join(', ')});
  /* a tinta só recebe o fundo do estúdio (até 1,2): as janelas de luz entram pelo verniz, brancas, e não tingem o reflexo de rosa */
  vec3 pinturaLinear = pinturaTinta * min(pinturaAmbiente, 1.2) * 0.6 + vec3(0.6 * pinturaFresnel + 0.4) * max(pinturaAmbiente - 0.9, 0.0) * 0.7 + vec3(pinturaFresnel) * pinturaAmbiente * 0.3;
  vec3 pinturaTom = vec3(1.0) - exp(-1.3 * pinturaLinear);
  vec4 diffuseColor = vec4(diffuse * pinturaTom, opacity);`);
  };
  material.customProgramCacheKey = () => 'visao-pintura-estudio';
  return material;
}

/** O eixo do comprimento da peça no mundo: o eixo de coordenadas da maior dimensão da caixa do grupo (o do carro, z). */
export function eixoDoComprimento(grupo) {
  const caixa = new THREE.Box3();
  for (const malha of superficiesDe(grupo)) caixa.expandByObject(malha);
  if (caixa.isEmpty()) return new THREE.Vector3(0, 0, 1);
  const t = caixa.getSize(new THREE.Vector3());
  if (t.x >= t.y && t.x >= t.z) return new THREE.Vector3(1, 0, 0);
  if (t.y >= t.x && t.y >= t.z) return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

/* A página da visão ligada, para o controle acompanhar o número trocado fora dele. */
let paginaLigada = null;

function mostrarControle(pagina) {
  pagina?.mostrar(ID, {
    titulo: 'Pintura',
    controle: {
      rotulo: 'Caixas de luz',
      nome: 'caixasDaPintura',
      min: CAIXAS_MINIMAS,
      max: CAIXAS_MAXIMAS,
      passo: 1,
      valor: caixasDaPintura(),
      formatar: (n) => String(n),
      aoMudar: (n) => { caixas.value = caixasValidas(n); },
    },
    linhas: [{ texto: 'Tinta vermelha com verniz refletindo um estúdio: a borda das caixas de luz sai reta na chapa boa e torta onde ela ondula; o gradiente do céu ao chão quebra onde a curvatura salta.' }],
    dados: { caixas: caixasDaPintura() },
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

/** O número de caixas de luz em vigor, e a troca dele sem o controle. */
export const caixasDaPintura = () => caixas.value;
export function definirCaixasDaPintura(n) {
  caixas.value = caixasValidas(n);
  mostrarControle(paginaLigada);
  return caixas.value;
}
