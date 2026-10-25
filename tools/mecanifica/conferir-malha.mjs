#!/usr/bin/env node
/* conferir-malha.mjs — a topologia da malha de uma receita, com os gritos do motor: casca aberta, não-manifold, orientação,
 * face de área nula, face fina, face torta e triângulo de área nula na triangulação do leque, vértice no meio de aresta e o
 * resto que `modulos/topologia` confere. A face torta e o triângulo da triangulação vinham do preparo de micropolígono, e a
 * redução sem perda do otimizador de malha; os dois módulos saíram em 2026-10-25 e as duas verificações úteis passaram à
 * topologia.
 *
 * Ele NÃO conserta nada e não escreve arquivo. Diz o que há, e quem conserta é quem autora.
 *
 *   node tools/mecanifica/conferir-malha.mjs <receita.js> [--json]
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function uso(mensagem) {
  console.error(`conferir-malha: ${mensagem}`);
  console.error('uso: node tools/mecanifica/conferir-malha.mjs <receita.js> [--json]');
  process.exit(2);
}

const args = process.argv.slice(2);
const alvo = args.find((a) => !a.startsWith('--'));
const json = args.includes('--json');
if (!alvo) uso('falta o caminho da receita.');

/* Nome curto OU caminho. A skill `criar-peca` manda escrever
   `npm run malha:conferir -- <peca>`, e ate aqui isso respondia "receita nao
   encontrada": este comando resolvia so caminho, enquanto `descrever` e
   `bancada` resolviam nome. Comando documentado que nao funciona como
   documentado gasta a rodada de quem seguiu a instrucao. */
let absoluto;
try {
  absoluto = resolverCaminhoReceita(alvo, { raiz: REPO });
} catch (erro) {
  uso(erro.message);
}
if (!existsSync(absoluto)) uso(`receita não encontrada: ${alvo}`);

const { executarReceita } = await import(pathToFileURL(path.join(REPO, 'src/autoria/executar-receita.js')).href);
const { analisarTopologia } = await import(pathToFileURL(path.join(REPO, 'modulos/topologia/src/analisar.js')).href);

const modulo = await import(pathToFileURL(absoluto).href);
const receita = modulo.default ?? Object.values(modulo).find((v) => v && typeof v === 'object' && v.PASSOS);
if (!receita) uso('o arquivo não exporta uma receita com PASSOS.');

const { neutro } = executarReceita(receita);
const malha = { vertices: neutro.V, faces: neutro.F };

/* GRITOS DO MOTOR primeiro. `executarReceita` não lança: acumula em
   `neutro.orfaos` e devolve a peça que conseguiu montar. Quem não lê esse campo
   recebe uma malha plausível e nenhuma notícia de que um passo inteiro não fez
   efeito — foi exatamente assim que um `sel` com a chave errada passou
   despercebido aqui, com a mensagem certa já escrita e ninguém para mostrá-la. */
const gritos = neutro.orfaos ?? [];

const topologia = analisarTopologia(malha, { triangulacao: true });

if (json) {
  console.log(JSON.stringify({ receita: alvo, gritos, topologia }, null, 2));
  process.exit(gritos.length || topologia.veredito === 'reprova' ? 1 : 0);
}

const simbolo = { aprova: '✓', alerta: '!', reprova: '✗' };
console.log(`\n${receita.meta?.nome ?? alvo}`);
console.log(`  ${topologia.resumo.vertices} vértices · ${topologia.resumo.faces} faces · ${topologia.resumo.componentes} corpo(s)`);

if (gritos.length) {
  console.log(`\n✗ a receita reclamou de ${gritos.length} coisa(s) ao executar:`);
  for (const g of gritos.slice(0, 8)) console.log(`    passo ${g.passo} (${g.op}) ${g.ref}: ${g.motivo}`);
  if (gritos.length > 8) console.log(`    …e mais ${gritos.length - 8}`);
  console.log('    a malha abaixo é o que o motor conseguiu montar apesar disso.');
}

console.log(`\n${simbolo[topologia.veredito]} topologia: ${topologia.veredito}`);
const porCodigo = new Map();
for (const a of topologia.achados) {
  if (!porCodigo.has(a.codigo)) porCodigo.set(a.codigo, { n: 0, sev: a.severidade, ex: a.mensagem });
  porCodigo.get(a.codigo).n++;
}
for (const [codigo, d] of porCodigo) console.log(`    ${d.sev === 'reprova' ? '✗' : '!'} ${codigo} ×${d.n} — ${d.ex}`);
if (!porCodigo.size) console.log('    sem achados');

console.log('');

process.exit(gritos.length || topologia.veredito === 'reprova' ? 1 : 0);
