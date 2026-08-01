#!/usr/bin/env node
/* CLI fino: lê dois JSONs, usa somente o núcleo puro e escreve JSON canônico. */
import { readFileSync } from 'node:fs';
import { compararRevisoes, jsonCanonico } from './revisao-modelagem.mjs';

function ler(caminho) {
  try { return JSON.parse(readFileSync(caminho, 'utf8')); }
  catch (erro) { throw new Error(`comparar-revisao: não consegui ler '${caminho}': ${erro.message}`); }
}

if (process.argv.length < 4 || process.argv.length > 5) {
  console.error('uso: node tools/modelagem/comparar-revisao.mjs <revisao-anterior.json> <revisao-atual.json> [critica-anterior.json]');
  process.exit(2);
}
try {
  const resultado = compararRevisoes(ler(process.argv[2]), ler(process.argv[3]), process.argv[4] ? ler(process.argv[4]) : null);
  process.stdout.write(`${jsonCanonico(resultado)}\n`);
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}
