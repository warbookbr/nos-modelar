/* carregar-peca.js — resolve a fixture da bancada por nome semântico e falha alto em nome inválido. */
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
import { adaptarThree } from '../autoria/adaptar-three.js';
import { caixasPorParte, portasPublicadas } from '../autoria/descrever-partes.js';

const MODULOS = import.meta.glob('../../prototipos/procedural/v3/pecas/*.js');

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
      `bancada: peça '${nome}' não existe em prototipos/procedural/v3/pecas/. `
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

  /* a MEDIDA da peça vem do módulo neutro, não do grafo de cena: é a mesma
     medição que `npm run descrever` imprime, para que a bancada e o CLI não
     digam números diferentes sobre a mesma peça. */
  const { caixas, facesSemParte } = caixasPorParte(neutro);
  /* A-20: as portas vêm do MESMO módulo neutro que `npm run descrever` lê — a
     bancada não reimplementa a leitura de `neutro.portas`. */
  const portas = portasPublicadas(neutro);

  return {
    nome,
    rotulo: peca.meta?.nome ?? nome,
    medida: { partes: caixas, facesSemParte, portas },
    ...adaptarThree(neutro, { nome: peca.meta?.nome ?? nome, materiais }),
  };
}
