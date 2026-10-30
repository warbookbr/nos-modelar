/* materiais-da-visao.js — a troca dos materiais da peça pelos de uma visão de conferência, e a volta deles.
 *
 * A curvatura, a zebra e a luz rasante desenham a superfície com um material próprio: as cores da curvatura por vértice, as
 * listras do vetor refletido, o fosco que só responde à luz rasante. A troca vale só para as malhas de superfície da peça
 * (`userData.tipo === 'superficie'`, as que `adaptarThree` cria), e não para as camadas da edição de malha, do arame ou dos
 * marcadores que moram no mesmo grupo. Cada material do autor ganha um da visão, e as malhas que dividiam um material continuam
 * dividindo o da visão, para a seleção e o fantasma do controlador das partes valerem por parte como antes
 * (`prepararMaterialDeVisao`).
 *
 * Desfazer devolve os materiais do autor, descarta os da visão e pede ao controlador que reaplique neles a seleção em vigor; a
 * peça volta à sólida sem resto. Uma peça que sai da cena com a visão ligada leva os materiais dela junto, e eles se descartam
 * com ela. */
import { prepararMaterialDeVisao } from '../controlar-partes.js';

const ANTES = 'materialAntesDaVisao';

/** As malhas de superfície da peça, na ordem do grafo. */
export function superficiesDe(grupo) {
  const malhas = [];
  grupo?.traverse((objeto) => {
    if (objeto.isMesh && objeto.userData?.tipo === 'superficie') malhas.push(objeto);
  });
  return malhas;
}

/**
 * Põe em cada malha de superfície do grupo o material que `fabrica(materialDoAutor, malha)` devolve, um por material do autor.
 * Se a malha já está numa visão, a visão anterior sai antes. Devolve a lista dos materiais criados.
 */
export function trocarMateriais(grupo, fabrica, controlador = null) {
  const criados = new Map();
  const anteriores = new Set();
  for (const malha of superficiesDe(grupo)) {
    const doAutor = malha.userData[ANTES] ?? malha.material;
    /* a malha estava em outra visão: o material dela sai e é descartado */
    if (malha.userData[ANTES]) anteriores.add(malha.material);
    if (!criados.has(doAutor)) criados.set(doAutor, prepararMaterialDeVisao(fabrica(doAutor, malha)));
    malha.userData[ANTES] = doAutor;
    malha.material = criados.get(doAutor);
  }
  for (const material of anteriores) material.dispose?.();
  controlador?.reaplicar?.();
  return [...criados.values()];
}

/** Devolve os materiais do autor às malhas do grupo, descarta os da visão e reaplica a seleção em vigor. */
export function restaurarMateriais(grupo, controlador = null) {
  const descartados = new Set();
  for (const malha of superficiesDe(grupo)) {
    const doAutor = malha.userData[ANTES];
    if (!doAutor) continue;
    if (malha.material !== doAutor) descartados.add(malha.material);
    malha.material = doAutor;
    delete malha.userData[ANTES];
  }
  for (const material of descartados) material.dispose?.();
  controlador?.reaplicar?.();
  return descartados.size;
}

/** Se alguma malha do grupo está com o material de uma visão. */
export function temMaterialDeVisao(grupo) {
  return superficiesDe(grupo).some((malha) => Boolean(malha.userData[ANTES]));
}
