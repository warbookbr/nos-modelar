#!/usr/bin/env node
/* perguntas-da-peca.mjs — as perguntas de forma que o brief do crítico de uma peça traz depois do pacote de imagens.
 *
 * O `critico-visual` da peça responde ao alvo, ao que falta e ao que sobra. As perguntas específicas acrescentam o que é próprio
 * do objeto: as `perguntas` do `familia.json` da família procedural que gerou a peça (`PLANO.familiaProcedural`) e as do arquivo
 * de `procedural/criterios/` escolhido por `PLANO.familia`, cada uma com a condição de existir a parte a que se refere. Peça sem
 * nenhum dos dois campos não tem pergunta específica, e o comando diz isso sem imprimir bloco.
 *
 * Uso: node tools/mecanifica/rodada-de-modelagem.mjs <peça> --perguntas   (ou diretamente este arquivo) */
import { pathToFileURL } from 'node:url';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { PERGUNTA_ABERTA, perguntasDaPeca } from '../../src/autoria/perguntas-do-critico.js';
import { criteriosDe } from '../../procedural/criterios/index.js';
import { FAMILIAS } from '../../procedural/familias/index.js';
import { importarReceita } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

/* O bloco de texto que vai no brief do crítico, ou '' sem pergunta específica. */
export function blocoDasPerguntas(perguntas) {
  if (perguntas.length === 0) return '';
  return [
    'Perguntas de forma deste objeto (responda uma a uma, olhando só as imagens, depois do item 5; cite a vista em cada resposta; a que as vistas não mostram recebe "não aparece nas vistas"):',
    ...[...perguntas, PERGUNTA_ABERTA].map((p, i) => `  ${i + 1}. ${p}`),
  ].join('\n');
}

/* As perguntas de uma peça (nome ou caminho da receita), lidas do `PLANO` dela. */
export async function perguntasDaPecaArquivo(peca, { raiz } = {}) {
  const caminho = resolverCaminhoReceita(peca, raiz ? { raiz } : undefined);
  const modulo = await importarReceita(caminho);
  const plano = normalizarPlanoDeModelagem(modulo.PLANO ?? modulo.default?.PLANO);
  if (plano === null) return { plano, componente: [], familia: [], todas: [] };
  const criterios = plano.familia === undefined ? null : criteriosDe(plano.familia);
  let perguntasDaFamilia = null;
  if (plano.familiaProcedural !== undefined) {
    const achada = FAMILIAS.find((f) => f.contrato.id === plano.familiaProcedural);
    if (!achada) throw new Error(`PLANO.familiaProcedural '${plano.familiaProcedural}' não é uma família registrada (${FAMILIAS.map((f) => f.contrato.id).join(', ')}).`);
    perguntasDaFamilia = achada.contrato.perguntas;
  }
  return { plano, ...perguntasDaPeca(plano, { criterios, perguntasDaFamilia }) };
}

export async function comoCLI(argv) {
  const peca = argv.find((a) => !a.startsWith('--'));
  if (!peca) return { codigo: 1, texto: 'diga a peça: perguntas-da-peca.mjs <peça>' };
  const r = await perguntasDaPecaArquivo(peca);
  if (r.todas.length === 0) return { codigo: 0, texto: `sem perguntas específicas para '${peca}': o PLANO não declara 'familia' nem 'familiaProcedural', ou nenhuma condição achou a parte a que se refere.` };
  return { codigo: 0, texto: blocoDasPerguntas(r.todas) };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { codigo, texto } = await comoCLI(process.argv.slice(2));
    (codigo === 0 ? console.log : console.error)(texto);
    process.exit(codigo);
  } catch (erro) {
    console.error(`perguntas-da-peca: ${erro.message}`);
    process.exit(1);
  }
}
