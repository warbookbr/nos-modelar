/* carregar-peca.js — resolve somente uma entrada explícita do catálogo. */
import { adaptarThree } from '../autoria/adaptar-three.js';
import { caixasPorParte, portasPublicadas } from '../autoria/descrever-partes.js';
import { executarReceita } from '../autoria/executar-receita.js';
import { CATALOGO_HOMOLOGADO, entradaDoCatalogo } from './catalogo-pecas.js';

/**
 * Constrói uma peça da Oficina e a converte para Three.js.
 * Nome ausente, desconhecido ou sem `PASSOS` falha com diagnóstico — nunca cai
 * silenciosamente na peça padrão.
 */
export async function carregarPeca(nome, { catalogo = CATALOGO_HOMOLOGADO } = {}) {
  if (!nome) throw new Error('bancada: informe uma peça publicada; não existe peça padrão.');
  const entrada = entradaDoCatalogo(catalogo, nome);
  const peca = await entrada.carregar();
  if (!peca) {
    throw new Error(
      `bancada: carregador da peça '${nome}' devolveu vazio.`,
    );
  }
  if (!Array.isArray(peca.PASSOS)) {
    throw new Error(
      `bancada: peça '${nome}' não expõe PASSOS. `
      + 'A bancada só abre peças escritas como passos da Oficina.',
    );
  }

  const materiais = peca.MATERIAIS ?? {};
  const { neutro } = executarReceita(peca);

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
