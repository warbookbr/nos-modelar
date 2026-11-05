#!/usr/bin/env node
/* hash-da-malha.mjs — o hash da malha canônica de uma receita, para provar que a divisão em arquivos não muda nada.
 *
 * Executa a receita pelo mesmo caminho da descrição (`executarReceita`), passa o neutro por `neutroCanonico` do núcleo e dá o
 * sha256 do JSON dele, junto com o sha256 do JSON dos PASSOS e as contagens de vértices e faces.
 * Uso: node docs/modelar/banco-de-provas/navegacao-de-receitas-2026-11-05/hash-da-malha.mjs <peça ou caminho da receita> */
import { createHash } from 'node:crypto';
import { neutroCanonico } from '../../../../procedural/nucleo/entrada.js';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from '../../../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../../../tools/modelar/resolver-caminho-receita.mjs';

const alvo = process.argv[2];
if (!alvo) {
  process.stderr.write('uso: node hash-da-malha.mjs <peça>\n');
  process.exit(2);
}
const caminho = resolverCaminhoReceita(alvo);
const receita = receitaDoModulo(await importarReceita(caminho));
const sha = (valor) => createHash('sha256').update(JSON.stringify(valor)).digest('hex');
const { neutro } = executarReceita(receita);
const canonico = neutroCanonico(neutro);
process.stdout.write(`${JSON.stringify({
  receita: alvo,
  malha: sha(canonico),
  passos: sha(receita.PASSOS),
  vertices: canonico.V.length,
  faces: canonico.F.length,
})}\n`);
