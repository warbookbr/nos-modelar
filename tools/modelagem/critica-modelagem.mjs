#!/usr/bin/env node
/* CLI fino: valida crítica sem abrir navegador, peça ou Oficina. */
import { readFileSync } from 'node:fs';
import { jsonCanonico, validarCritica } from './revisao-modelagem.mjs';

function ler(caminho) {
  let texto;
  try { texto = readFileSync(caminho, 'utf8'); }
  catch (erro) { throw new Error(`critica-modelagem: não consegui ler '${caminho}': ${erro.message}`); }
  try { return { texto, valor: JSON.parse(texto) }; }
  catch (erro) { throw new Error(`critica-modelagem: não consegui ler '${caminho}': ${erro.message}`); }
}

function exigirBytesCanonicos({ texto, valor }, caminho) {
  if (texto !== `${jsonCanonico(valor)}\n`) {
    throw new Error(`critica-modelagem: '${caminho}' não está canonicalizado; use JSON canônico em uma linha e quebra final.`);
  }
}

if (process.argv.length !== 5) {
  console.error('uso: node tools/modelagem/critica-modelagem.mjs <critica.json> <revisao.json> <checklist.json>');
  process.exit(2);
}
try {
  const checklist = ler(process.argv[4]).valor;
  const itens = Array.isArray(checklist) ? checklist : (checklist.checklist ?? checklist.itens);
  const ids = Array.isArray(itens)
    ? itens.map((item) => (typeof item === 'string' ? item : item?.id))
    : null;
  const critica = ler(process.argv[2]);
  exigirBytesCanonicos(critica, process.argv[2]);
  process.stdout.write(`${jsonCanonico(validarCritica(critica.valor, ler(process.argv[3]).valor, ids))}\n`);
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}
