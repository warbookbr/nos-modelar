/*
 * caminho-confinado.mjs — guarda de escrita para artefatos que um CLI aceita
 * por caminho. A checagem lexical sozinha não basta: um diretório relativo
 * pode conter um link simbólico, junction ou outro reparse point e acabar fora
 * do repositório. Inspecionamos cada ancestral com lstat (nunca seguindo o
 * vínculo) e só criamos diretórios normais, um por vez.
 */
import { lstatSync, mkdirSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export class ErroDeConfinamento extends Error {}

function erroAusente(erro) {
  return erro && typeof erro === 'object' && erro.code === 'ENOENT';
}

function lerSemSeguir(caminho, lstat) {
  try {
    return lstat(caminho);
  } catch (erro) {
    if (erroAusente(erro)) return null;
    throw new ErroDeConfinamento(`não consegui inspecionar '${caminho}' sem seguir vínculos: ${erro.message}`);
  }
}

/* Node representa links simbólicos e junctions do Windows como symlink no
   lstat. A segunda consulta deixa o contrato explícito para runtimes que
   exponham reparse point como predicado próprio, sem usar API de sistema. */
function eVinculoOuReparse(estatistica) {
  return estatistica.isSymbolicLink?.() === true || estatistica.isReparsePoint?.() === true;
}

function segmentosDentroDaRaiz(destino, raiz) {
  const absolutoRaiz = resolve(raiz);
  const absolutoDestino = resolve(destino);
  const interno = relative(absolutoRaiz, absolutoDestino);
  if (!interno || isAbsolute(interno) || interno === '..' || interno.startsWith(`..${sep}`)) {
    throw new ErroDeConfinamento(`destino '${absolutoDestino}' não fica estritamente dentro da raiz '${absolutoRaiz}'.`);
  }
  return { raiz: absolutoRaiz, segmentos: interno.split(sep).filter(Boolean) };
}

/**
 * Recusa qualquer vínculo/reparse point já existente entre a raiz e o destino.
 * Não usa realpath: portanto um arquivo final ainda inexistente é válido e
 * diretórios novos continuam possíveis. Recebe lstat injetável para prova sem
 * precisar de privilégio de criar symlink/junction no sistema operacional.
 */
export function verificarCaminhoConfinado(destino, {
  raiz,
  lstat = lstatSync,
} = {}) {
  if (!raiz) throw new ErroDeConfinamento('raiz obrigatória para conferir confinamento.');
  const { raiz: raizAbsoluta, segmentos } = segmentosDentroDaRaiz(destino, raiz);
  let atual = raizAbsoluta;
  const todos = [raizAbsoluta, ...segmentos.map((segmento, indice) => {
    atual = indice === 0 ? resolve(raizAbsoluta, segmento) : resolve(atual, segmento);
    return atual;
  })];

  for (const [indice, caminho] of todos.entries()) {
    const estatistica = lerSemSeguir(caminho, lstat);
    if (!estatistica) break;
    if (eVinculoOuReparse(estatistica)) {
      throw new ErroDeConfinamento(`'${caminho}' é vínculo simbólico, junction ou reparse point; recusei escrever por ele.`);
    }
    if (indice < todos.length - 1 && estatistica.isDirectory?.() !== true) {
      throw new ErroDeConfinamento(`'${caminho}' existe, mas não é diretório para alcançar o destino.`);
    }
  }
}

/** Cria apenas os ancestrais ausentes, depois de cada criação conferir que
    nasceu como diretório comum. Não faz mkdir recursivo atravessar vínculo. */
export function criarDiretorioConfinado(destino, {
  raiz,
  lstat = lstatSync,
  mkdir = mkdirSync,
} = {}) {
  const { raiz: raizAbsoluta, segmentos } = segmentosDentroDaRaiz(destino, raiz);
  verificarCaminhoConfinado(destino, { raiz: raizAbsoluta, lstat });
  let atual = raizAbsoluta;
  for (const segmento of segmentos) {
    atual = resolve(atual, segmento);
    const antes = lerSemSeguir(atual, lstat);
    if (!antes) {
      try {
        mkdir(atual);
      } catch (erro) {
        /* Outro processo pode ter criado o diretório; a inspeção abaixo ainda
           decide se ele é seguro. Qualquer outro erro segue fail-closed. */
        if (!erro || erro.code !== 'EEXIST') {
          throw new ErroDeConfinamento(`não consegui criar diretório seguro '${atual}': ${erro.message}`);
        }
      }
    }
    const depois = lerSemSeguir(atual, lstat);
    if (!depois || eVinculoOuReparse(depois) || depois.isDirectory?.() !== true) {
      throw new ErroDeConfinamento(`'${atual}' não é um diretório normal seguro para artefatos.`);
    }
  }
}
