/* visao-luz-rasante.js — a visão Luz rasante da bancada: uma luz de sol a 10 graus do plano da imagem, com sombra, sobre a peça
 * em material fosco, com o resto da iluminação do estúdio apagado, como `tools/blender/luz-rasante.py`.
 *
 * A LUZ ACOMPANHA A CÂMERA. A elevação de 10 graus é medida do plano da imagem, como no Blender (`direcaoDaLuz`, de
 * `azimute-da-luz.js`), por isso a cada quadro a luz é reposta pelo quadro da câmera: girar a peça deixa a luz rasante para o que
 * se vê, e o lado visto não escurece. O azimute, a direção dentro do plano da imagem, começa pela conta de `escolher_azimutes` para
 * a vista em que a peça abre, feita para uma luz só (`escolherAzimutes` com `unico`, sobre as normais dos triângulos voltados para a
 * câmera), e muda no controle que aparece só com a visão ligada, que também o escolhe de novo para a vista do momento.
 *
 * O BRILHO é o do Blender: o fosco tem albedo 0,8 e nenhuma luz de ambiente, e a luz tem a força que leva a superfície voltada
 * para a câmera a 0,2 de radiância linear (`ALVO_LINEAR` e `sol.energy` de `luz-rasante.py`), sem o mapeamento de tons da cena.
 *
 * DESFAZER NÃO DEIXA RESTO: a luz e o mapa de sombra dela saem da cena e são descartados, as luzes do estúdio voltam a como
 * estavam, e os materiais do autor voltam à peça. Uma peça nova que chega com a visão ligada (`aplicar` sem `desfazer`) reaproveita
 * a mesma luz.
 *
 * A visão não toca a página: o relógio de quadros e o controle da direção vêm da caixa da visão (`contexto.pagina`,
 * `componentes/caixa-da-visao.js`). */
import * as THREE from 'three';
import { AZIMUTE_PREFERIDO, RASANTE_GRAUS, amostrasDaVista, direcaoDaLuz, escolherAzimutes } from './azimute-da-luz.js';
import { restaurarMateriais, superficiesDe, trocarMateriais } from './materiais-da-visao.js';

const ID = 'luz-rasante';
export const ALBEDO_FOSCO = 0.8;
export const ALVO_LINEAR = 0.2;
/** A força da luz (lux, no Three; a irradiância do sol, no Blender) que leva a face voltada para a câmera a `ALVO_LINEAR`. */
export const INTENSIDADE_DA_LUZ = (Math.PI * ALVO_LINEAR) / (ALBEDO_FOSCO * Math.sin((RASANTE_GRAUS * Math.PI) / 180));
const NOME_DA_LUZ = '__luz_rasante__';

const estados = new WeakMap();
const SEM_AMBIENTE = {};
function estadoDe(ambiente) {
  const chave = ambiente ?? SEM_AMBIENTE;
  if (!estados.has(chave)) estados.set(chave, { ativa: false, luz: null, apagadas: [], pararQuadro: null, contexto: null, azimute: null, peca: undefined });
  return estados.get(chave);
}

export function materialFosco() {
  return new THREE.MeshLambertMaterial({
    color: new THREE.Color().setRGB(ALBEDO_FOSCO, ALBEDO_FOSCO, ALBEDO_FOSCO, THREE.LinearSRGBColorSpace),
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/* Os eixos da câmera no mundo: x para a direita, y para cima, z para trás (a câmera olha ao longo de -z). */
function eixosDaCamera(camera) {
  camera.updateMatrixWorld();
  const e = camera.matrixWorld.elements;
  const unit = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  return { xCam: unit(e[0], e[1], e[2]), yCam: unit(e[4], e[5], e[6]), zCam: unit(e[8], e[9], e[10]) };
}

/** O azimute de partida para a vista da `camera`: o que `escolherAzimutes` dá a uma luz só, sobre as normais da peça que ela vê. */
export function azimuteDaVista(grupo, camera) {
  const vista = eixosDaCamera(camera);
  const triangulos = [];
  const p = new THREE.Vector3();
  grupo.updateMatrixWorld(true);
  for (const malha of superficiesDe(grupo)) {
    if (!malha.visible) continue;
    const posicao = malha.geometry.getAttribute('position');
    const indice = malha.geometry.index;
    const n = indice ? indice.count : posicao.count;
    for (let i = 0; i + 2 < n; i += 3) {
      for (let k = 0; k < 3; k++) {
        p.fromBufferAttribute(posicao, indice ? indice.getX(i + k) : i + k).applyMatrix4(malha.matrixWorld);
        triangulos.push(p.x, p.y, p.z);
      }
    }
  }
  const { normais, pesos } = amostrasDaVista(triangulos, vista.zCam);
  return escolherAzimutes(normais, vista, RASANTE_GRAUS, { pesos, unico: true }).azimutes[0];
}

const caixa = new THREE.Box3();
const esfera = new THREE.Sphere();

/* Põe a luz pelo quadro da câmera e a sombra em volta da peça. Roda a cada quadro enquanto a visão dura. */
function reporLuz(e) {
  const { luz, contexto } = e;
  const camera = contexto?.ambiente?.camera;
  if (!luz || !camera || !contexto.grupo) return;
  caixa.setFromObject(contexto.grupo);
  if (caixa.isEmpty()) return;
  caixa.getBoundingSphere(esfera);
  const r = Math.max(esfera.radius, 1e-3);
  const d = direcaoDaLuz(eixosDaCamera(camera), RASANTE_GRAUS, e.azimute ?? AZIMUTE_PREFERIDO);
  luz.target.position.copy(esfera.center);
  luz.position.set(esfera.center.x - d[0] * 2 * r, esfera.center.y - d[1] * 2 * r, esfera.center.z - d[2] * 2 * r);
  luz.target.updateMatrixWorld();
  const sombra = luz.shadow.camera;
  const folga = 1.05 * r;
  if (sombra.right !== folga || sombra.far !== 4 * r) {
    sombra.left = -folga; sombra.right = folga; sombra.top = folga; sombra.bottom = -folga;
    sombra.near = 0.01 * r; sombra.far = 4 * r;
    sombra.updateProjectionMatrix();
    /* três texels do mapa ao longo da normal: a luz quase tangente fazia a chapa sombrear a si mesma num pontilhado fino. Medido
       em 2026-10-30 na peça de prova com vinco vista de cima, com a luz a 0 grau: com 0,75 texel o pontilhado dava 2,7 % de
       contraste na chapa lisa, e com 3 texels, 0 */
    luz.shadow.normalBias = ((2 * folga) / luz.shadow.mapSize.x) * 3;
  }
}

function acompanhar(e) {
  e.pararQuadro = e.contexto?.pagina?.aCadaQuadro(() => { if (e.ativa) reporLuz(e); }) ?? null;
}

function acenderLuz(e, cena) {
  /* as luzes do estúdio (e qualquer outra da cena) se apagam e guardam como estavam */
  e.apagadas = [];
  cena.traverse((objeto) => {
    if (objeto.isLight && objeto.name !== NOME_DA_LUZ) e.apagadas.push({ luz: objeto, visivel: objeto.visible });
  });
  for (const { luz } of e.apagadas) luz.visible = false;
  const luz = new THREE.DirectionalLight(0xffffff, INTENSIDADE_DA_LUZ);
  luz.name = NOME_DA_LUZ;
  luz.castShadow = true;
  luz.shadow.mapSize.set(2048, 2048);
  luz.shadow.bias = -0.0002;
  luz.target.name = `${NOME_DA_LUZ}alvo`;
  cena.add(luz, luz.target);
  e.luz = luz;
}

function apagarLuz(e) {
  if (e.luz) {
    e.luz.removeFromParent();
    e.luz.target.removeFromParent();
    e.luz.shadow.map?.dispose();
    e.luz.dispose();
    e.luz = null;
  }
  for (const { luz, visivel } of e.apagadas) luz.visible = visivel;
  e.apagadas = [];
}

function desenharControle(e) {
  const azimute = e.azimute ?? AZIMUTE_PREFERIDO;
  e.contexto?.pagina?.mostrar(ID, {
    titulo: 'Luz rasante',
    controle: {
      rotulo: 'Direção da luz',
      nome: 'azimuteDaLuzRasante',
      min: 0,
      max: 355,
      passo: 5,
      valor: azimute,
      formatar: (a) => `${a}°`,
      aoMudar: (a) => { e.azimute = a; reporLuz(e); desenharControle(e); },
    },
    botao: {
      rotulo: 'Escolher pela vista',
      titulo: 'O azimute em que a luz alcança mais do lado que a câmera vê, ainda rasante para ele.',
      aoClicar: () => escolherPelaVista(e),
    },
    linhas: [{ texto: `Sol a ${RASANTE_GRAUS}° do plano da imagem, com sombra; o resto da luz apagado. A direção conta a partir da direita da tela, no sentido de quem sobe.` }],
    dados: { azimute },
  });
}

function escolherPelaVista(e) {
  const camera = e.contexto?.ambiente?.camera;
  if (!camera || !e.contexto?.grupo) return e.azimute;
  e.azimute = azimuteDaVista(e.contexto.grupo, camera);
  desenharControle(e);
  reporLuz(e);
  return e.azimute;
}

export function aplicarLuzRasante(contexto) {
  const e = estadoDe(contexto.ambiente);
  e.contexto = contexto;
  trocarMateriais(contexto.grupo, materialFosco, contexto.controlador);
  const cena = contexto.ambiente?.scene;
  if (!e.ativa) {
    e.ativa = true;
    if (cena) acenderLuz(e, cena);
    acompanhar(e);
  }
  /* a peça refeita por uma junta ou por uma operação de malha guarda a direção; outra peça a escolhe pela vista */
  const peca = contexto.modelo?.nome ?? null;
  if (e.peca !== peca || e.azimute === null) {
    e.peca = peca;
    escolherPelaVista(e);
  }
  desenharControle(e);
  reporLuz(e);
}

export function desfazerLuzRasante(contexto) {
  const e = estadoDe(contexto.ambiente);
  e.ativa = false;
  e.pararQuadro?.();
  e.pararQuadro = null;
  apagarLuz(e);
  restaurarMateriais(contexto.grupo, contexto.controlador);
  contexto.pagina?.fechar(ID);
  e.contexto = null;
}

/** A direção em vigor na cena do `ambiente` (graus), e a troca dela sem o controle, para os testes e as provas. */
export const azimuteDaLuzRasante = (ambiente) => estadoDe(ambiente).azimute;
export function definirAzimuteDaLuzRasante(ambiente, azimute) {
  const e = estadoDe(ambiente);
  e.azimute = ((Number(azimute) % 360) + 360) % 360;
  if (e.ativa) { desenharControle(e); reporLuz(e); }
  return e.azimute;
}
