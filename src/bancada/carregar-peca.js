/* carregar-peca.js — resolve a fixture da bancada por nome semântico e falha alto em nome inválido. */
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
import { adaptarThree } from '../autoria/adaptar-three.js';

const MODULOS = import.meta.glob('../../prototipos/fps/v3/pecas/*.js');

export const PECA_PADRAO = 'drone-inspecao';

function nomeDoCaminho(caminho) {
  return caminho.slice(caminho.lastIndexOf('/') + 1, -'.js'.length);
}

/** Nomes de peça que a bancada aceita em `?peca=`, em ordem estável. */
export const PECAS_DISPONIVEIS = Object.keys(MODULOS)
  .map(nomeDoCaminho)
  .sort((a, b) => a.localeCompare(b, 'pt-BR'));

/**
 * Constrói uma peça da Oficina e a converte para Three.js.
 * Nome ausente, desconhecido ou sem `PASSOS` falha com diagnóstico — nunca cai
 * silenciosamente na peça padrão.
 */
export async function carregarPeca(nome = PECA_PADRAO) {
  const caminho = Object.keys(MODULOS).find((chave) => nomeDoCaminho(chave) === nome);
  if (!caminho) {
    throw new Error(
      `bancada: peça '${nome}' não existe em prototipos/fps/v3/pecas/. `
      + `Disponíveis: ${PECAS_DISPONIVEIS.join(', ')}`,
    );
  }

  const peca = await MODULOS[caminho]();
  if (!Array.isArray(peca.PASSOS)) {
    throw new Error(
      `bancada: peça '${nome}' não expõe PASSOS. `
      + 'A bancada só abre peças escritas como passos da Oficina.',
    );
  }

  const materiais = peca.MATERIAIS ?? {};
  const neutro = nucleo(
    peca.PASSOS,
    peca.PARAMS ?? {},
    peca.TOPO ?? {},
    materiais,
    peca.ESQUELETO ?? null,
    peca.ALIASES ?? [],
  );

  return {
    nome,
    rotulo: peca.meta?.nome ?? nome,
    ...adaptarThree(neutro, { nome: peca.meta?.nome ?? nome, materiais }),
  };
}
