#!/usr/bin/env node
/* resumo-do-acervo.mjs — roda as três réguas de malha sobre o acervo inteiro (`procedural/pecas/` e `tools/fixtures/acervo/`) e imprime uma tabela e, com
   `--json <arquivo>`, grava os números. Uso: node tools/modelar/reguas-de-malha/resumo-do-acervo.mjs [--json saida.json] [peca ...]. Peça que não executa
   (montagem, composição sem registro, receita que recusa) sai com o motivo e sem números. Só mede; não muda peça nem gate. */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { pecasDoAcervo } from '../guardas/guarda-acervo.mjs';
import { resolverCaminhoReceita } from '../resolver-caminho-receita.mjs';
import { medirReguasDeMalha } from './reguas-de-malha.mjs';

const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));

export function pecasParaMedir() {
  const doAcervo = pecasDoAcervo();
  const pasta = join(REPO, 'tools/fixtures/acervo');
  const dosEnsaios = existsSync(pasta) ? readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(pasta, e.name, 'receita.js'))).map((e) => `tools/fixtures/acervo/${e.name}`) : [];
  return [...doAcervo, ...dosEnsaios];
}

export async function medirPecaDoAcervo(peca) {
  const inicio = Date.now();
  try {
    const caminho = resolverCaminhoReceita(peca);
    const modulo = await import(pathToFileURL(caminho).href);
    const receita = modulo.default ?? modulo.receita;
    if (!receita || !Array.isArray(receita.PASSOS)) return { peca, motivo: 'sem PASSOS (montagem ou composição)', ms: Date.now() - inicio };
    if (!receita.PASSOS.length) return { peca, motivo: 'receita sem passos', ms: Date.now() - inicio };
    const { neutro } = executarReceita(receita);
    return { peca, faces: neutro.F.size, ...medirReguasDeMalha(neutro), ms: Date.now() - inicio };
  } catch (erro) {
    return { peca, motivo: `não executou: ${String(erro.message).split('\n')[0].slice(0, 160)}`, ms: Date.now() - inicio };
  }
}

if (process.argv[1] && process.argv[1].endsWith('resumo-do-acervo.mjs')) {
  const args = process.argv.slice(2);
  const j = args.indexOf('--json');
  const saida = j >= 0 ? args.splice(j, 2)[1] : null;
  const pedidas = args.filter((a) => !a.startsWith('-'));
  const pecas = pedidas.length ? pedidas : pecasParaMedir();
  const linhas = [];
  for (const peca of pecas) {
    const r = await medirPecaDoAcervo(peca);
    linhas.push(r);
    console.log(r.motivo ? `${r.peca}\t${r.motivo}` : `${r.peca}\t${r.faces}\t${r.facesDegeneradas}\t${r.triangulosFinos}\t${r.regioesComFinos}\t${r.pontasDeSerra}\t${r.trechosDeSerrilhado}\t${r.ms}ms`);
  }
  if (saida) writeFileSync(saida, `${JSON.stringify(linhas, null, 1)}\n`);
  console.log(`\n${relative(REPO, process.argv[1])}: ${linhas.length} peças; colunas: peça, faces, degeneradas, triângulos finos, regiões com finos, pontas de serra, trechos de serrilhado`);
}
