#!/usr/bin/env node
/* conferir-malha.mjs — um comando que responde as três perguntas de malha sobre
 * uma receita: o traçado está bom, sobra alguma coisa, e ela sai para um motor
 * de micropolígono.
 *
 * Existe porque as três respostas vivem em módulos separados, e separado está
 * certo — cada um tem contrato e teste próprios. O que estava faltando era a
 * porta: uma IA no meio de uma modelagem não deve precisar escrever três
 * importações para saber se acabou de produzir uma malha furada.
 *
 * Ele NÃO conserta nada e não escreve arquivo. Diz o que há, e quem conserta é
 * quem autora — a mesma fronteira que os módulos respeitam.
 *
 *   node tools/mecanifica/conferir-malha.mjs <receita.js> [--unidade=m] [--json]
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function uso(mensagem) {
  console.error(`conferir-malha: ${mensagem}`);
  console.error('uso: node tools/mecanifica/conferir-malha.mjs <receita.js> [--unidade=m] [--json]');
  process.exit(2);
}

const args = process.argv.slice(2);
const alvo = args.find((a) => !a.startsWith('--'));
const json = args.includes('--json');
const unidade = args.find((a) => a.startsWith('--unidade='))?.slice('--unidade='.length) ?? 'm';
if (!alvo) uso('falta o caminho da receita.');

const absoluto = path.resolve(REPO, alvo);
if (!absoluto.startsWith(REPO + path.sep)) uso('a receita precisa estar dentro do repositório.');
if (!existsSync(absoluto)) uso(`receita não encontrada: ${alvo}`);

const { executarReceita } = await import(pathToFileURL(path.join(REPO, 'src/autoria/executar-receita.js')).href);
const { analisarTopologia } = await import(pathToFileURL(path.join(REPO, 'modulos/topologia/src/analisar.js')).href);
const { otimizarMalha } = await import(pathToFileURL(path.join(REPO, 'modulos/otimizador-malha/src/otimizar.js')).href);
const { prepararParaMicropoligono } = await import(pathToFileURL(path.join(REPO, 'modulos/preparo-micropoligono/src/preparar.js')).href);

const modulo = await import(pathToFileURL(absoluto).href);
const receita = modulo.default ?? Object.values(modulo).find((v) => v && typeof v === 'object' && v.PASSOS);
if (!receita) uso('o arquivo não exporta uma receita com PASSOS.');

const { neutro } = executarReceita(receita);
const malha = { vertices: neutro.V, faces: neutro.F };

const topologia = analisarTopologia(malha);
const otimizacao = otimizarMalha(malha);
const micro = prepararParaMicropoligono(malha, { unidadeEntrada: unidade, unidadeSaida: 'cm' });

if (json) {
  console.log(JSON.stringify({ receita: alvo, topologia, otimizacao: { ganho: otimizacao.ganho, operacoes: otimizacao.operacoes }, micropoligono: micro }, null, 2));
  process.exit(topologia.veredito === 'reprova' || micro.veredito === 'reprova' ? 1 : 0);
}

const simbolo = { aprova: '✓', alerta: '!', reprova: '✗' };
console.log(`\n${receita.meta?.nome ?? alvo}`);
console.log(`  ${otimizacao.antes.vertices} vértices · ${otimizacao.antes.faces} faces · ${otimizacao.antes.triangulos} triângulos · ${topologia.resumo.componentes} corpo(s)`);

console.log(`\n${simbolo[topologia.veredito]} topologia: ${topologia.veredito}`);
const porCodigo = new Map();
for (const a of topologia.achados) {
  if (!porCodigo.has(a.codigo)) porCodigo.set(a.codigo, { n: 0, sev: a.severidade, ex: a.mensagem });
  porCodigo.get(a.codigo).n++;
}
for (const [codigo, d] of porCodigo) console.log(`    ${d.sev === 'reprova' ? '✗' : '!'} ${codigo} ×${d.n} — ${d.ex}`);
if (!porCodigo.size) console.log('    sem achados');

console.log(`\n  redução sem perda: ${otimizacao.ganho.faces} face(s), ${otimizacao.ganho.triangulos} triângulo(s)`);
console.log(`    soldou ${otimizacao.operacoes.soldados}, fundiu ${otimizacao.operacoes.fundidas}, descartou ${otimizacao.operacoes.descartados}`);
if (otimizacao.ganho.triangulos === 0) {
  /* Dito sempre que o ganho é zero, porque ganho zero aqui não é falha da
     ferramenta: é a geometria já estar mínima, e a próxima redução ser decisão
     de receita. Sem esta linha, alguém lê zero e procura defeito no otimizador. */
  console.log('    contagem de triângulo intacta — reduzir mais é decisão de receita, não de saída');
}

console.log(`\n${simbolo[micro.veredito]} micropolígono: ${micro.veredito} (${micro.resumo.triangulos} triângulos, ${unidade}→cm)`);
for (const a of micro.achados.slice(0, 5)) console.log(`    ${a.severidade === 'reprova' ? '✗' : '!'} ${a.mensagem}`);
console.log(`    não cobre: ${micro.naoCoberto.join('; ')}`);
console.log('');

process.exit(topologia.veredito === 'reprova' || micro.veredito === 'reprova' ? 1 : 0);
