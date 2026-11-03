#!/usr/bin/env node
/* perguntas-do-alinhamento.mjs — as perguntas do alinhamento da família declarada, filtradas pelas partes.
 *
 * Uso:
 *   node tools/modelar/perguntas-do-alinhamento.mjs <peça>                       a família e as partes vêm do PLANO da receita
 *   node tools/modelar/perguntas-do-alinhamento.mjs --familia veiculo            todas as regras da família (ainda sem partes)
 *   node tools/modelar/perguntas-do-alinhamento.mjs --familia veiculo --partes a,b   só as regras cuja parte existe
 *   node tools/modelar/perguntas-do-alinhamento.mjs --familia veiculo --alinhamento <arquivo.md>   as partes são as palavras do texto
 *   node tools/modelar/perguntas-do-alinhamento.mjs                              sem família: o conjunto geral
 *   --json imprime a lista em JSON.
 *
 * A skill `alinhar-modelagem` chama este comando no passo das regras da família. */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { palavrasDoTexto, perguntasDoAlinhamento, textoDoAlinhamento } from '../../src/autoria/alinhamento-por-familia.js';
import { criteriosDe, FAMILIAS_DE_OBJETO } from '../../procedural/criterios/index.js';
import { importarReceita } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const COM_VALOR = ['--familia', '--partes', '--alinhamento'];

export function lerArgumentos(argv) {
  const opcoes = {};
  let peca;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) { peca ??= a; continue; }
    if (!COM_VALOR.includes(a)) { opcoes[a.slice(2)] = true; continue; }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`${a} pede um valor.`);
    opcoes[a.slice(2)] = v;
    i += 1;
  }
  return { peca, opcoes };
}

export async function perguntasDoAlinhamentoDe({ peca, familia, partes, alinhamento, raiz } = {}) {
  let id = familia ?? null;
  let nomes = partes ?? null;
  let fonte = null;
  if (peca) {
    const modulo = await importarReceita(resolverCaminhoReceita(peca, raiz ? { raiz } : undefined));
    const plano = normalizarPlanoDeModelagem(modulo.PLANO ?? modulo.default?.PLANO);
    if (plano === null) throw new Error(`'${peca}' não declara PLANO; sem ele não há família nem partes. Use --familia.`);
    id ??= plano.familia ?? null;
    nomes ??= plano.partes.map((p) => p.nome);
    fonte = `a peça '${peca}'`;
  }
  if (alinhamento !== undefined) {
    nomes = [...(nomes ?? []), ...palavrasDoTexto(readFileSync(alinhamento, 'utf8'))];
    fonte ??= 'o alinhamento escrito';
  }
  let criterios = null;
  if (id !== null) {
    criterios = criteriosDe(id);
    if (!criterios) throw new Error(`a família '${id}' não tem critérios; as que existem são ${FAMILIAS_DE_OBJETO.join(', ')}.`);
  }
  const resultado = perguntasDoAlinhamento(criterios, nomes === null ? null : { componentes: nomes, formas: nomes });
  return { ...resultado, fonte };
}

export async function comoCLI(argv) {
  const { peca, opcoes } = lerArgumentos(argv);
  const r = await perguntasDoAlinhamentoDe({
    peca,
    familia: typeof opcoes.familia === 'string' ? opcoes.familia : undefined,
    partes: typeof opcoes.partes === 'string' ? opcoes.partes.split(',').map((p) => p.trim()).filter(Boolean) : undefined,
    alinhamento: typeof opcoes.alinhamento === 'string' ? opcoes.alinhamento : undefined,
  });
  return { codigo: 0, texto: opcoes.json ? JSON.stringify(r, null, 2) : textoDoAlinhamento(r, { fonte: r.fonte }) };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { codigo, texto } = await comoCLI(process.argv.slice(2));
    console.log(texto);
    process.exit(codigo);
  } catch (erro) {
    console.error(`perguntas-do-alinhamento: ${erro.message}`);
    process.exit(1);
  }
}
