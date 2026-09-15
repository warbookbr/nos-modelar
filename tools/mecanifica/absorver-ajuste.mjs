#!/usr/bin/env node
/* absorver-ajuste.mjs — a régua da rodada de absorção.
 *
 * A bancada deixa a pessoa arrastar os cantos da peça e salvar o que ela
 * desenhou. O que sai de lá é medida, não receita: nomes de parte com os dois
 * cantos da caixa, mais a lista de juntas que ela puxou. Quem transforma isso em
 * receita organizada é a IA, e este comando é o instrumento que diz se ela
 * conseguiu — reexecuta a receita e compara com o alvo, parte por parte, em
 * milímetro.
 *
 * Ele não reescreve nada e não opina sobre a forma. Responde uma pergunta só:
 * a receita como está hoje chega onde a pessoa deixou a peça?
 *
 *   npm run absorver -- <ajuste.json> [--receita <nome>]
 *
 * Sai com código 1 quando não chega, que é o estado normal no começo da rodada:
 * é justamente o que a IA vai trabalhar para zerar.
 */
import { readFileSync } from 'node:fs';
import { compararComAlvo } from '../../src/autoria/alvo-do-ajuste.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { conferirAbsorcao, conferirOrigens } from '../../src/autoria/origem-de-parametro.js';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const args = process.argv.slice(2);
const caminhoDoAlvo = args.find((a) => !a.startsWith('--'));
const indiceReceita = args.indexOf('--receita');
if (!caminhoDoAlvo) {
  console.error('uso: npm run absorver -- <ajuste.json> [--receita <nome>]');
  process.exit(2);
}

const alvo = JSON.parse(readFileSync(caminhoDoAlvo, 'utf8'));
const nomeDaReceita = indiceReceita >= 0 ? args[indiceReceita + 1] : alvo.peca;
if (!nomeDaReceita) {
  console.error('absorver: o ajuste não diz de que peça veio; passe --receita <nome>.');
  process.exit(2);
}

const modulo = await import(resolverCaminhoReceita(nomeDaReceita));
const receita = modulo.default ?? modulo;
const { neutro } = executarReceita(receita);
const veredito = compararComAlvo(neutro, alvo);

console.log(`peça: ${nomeDaReceita}`);
console.log(`tolerância: ${veredito.toleranciaMm} mm`);
if (Array.isArray(alvo.gestos) && alvo.gestos.length) {
  console.log('\ngestos que a pessoa fez:');
  for (const gesto of alvo.gestos) {
    const mm = gesto.deslocamento.map((c) => (c * 1000).toFixed(1)).join(', ');
    console.log(`  ${gesto.junta} → [${mm}] mm`);
  }
}

console.log('\nparte                       pior   centro (mm)            dimensão (mm)');
for (const parte of veredito.partes) {
  const centro = parte.centroMm.map((n) => n.toFixed(2).padStart(7)).join(' ');
  const dimensao = parte.dimensaoMm.map((n) => n.toFixed(2).padStart(7)).join(' ');
  const marca = parte.dentro ? '  ' : '->';
  console.log(`${marca} ${parte.parte.padEnd(24)} ${parte.piorMm.toFixed(2).padStart(6)}  ${centro}  ${dimensao}`);
}
for (const nome of veredito.ausentes) console.log(`-> ${nome}: o alvo declara esta parte e a receita não a produz`);
for (const nome of veredito.sobrando) console.log(`-> ${nome}: a receita produz esta parte e o alvo não a declara`);

/* A segunda pergunta, e a que protege a receita a longo prazo: a reescrita
   inventou número? Só dá para responder quando existe com o que comparar, então
   ela só aparece se o ajuste disser de que receita partiu. */
if (alvo.receitaDeOrigem) {
  const anterior = await import(resolverCaminhoReceita(alvo.receitaDeOrigem));
  const absorcao = conferirAbsorcao(anterior.default ?? anterior, receita);
  console.log(`\nparâmetros novos: ${absorcao.novos.length ? absorcao.novos.join(', ') : 'nenhum'}`);
  for (const id of absorcao.semOrigem) console.log(`-> '${id}' é novo e não diz de onde veio`);
  if (!absorcao.ok) process.exitCode = 1;
}

const origens = conferirOrigens(receita);
if (origens.declara && !origens.ok) {
  for (const id of origens.semOrigem) console.log(`-> '${id}' não diz de onde veio`);
  for (const chave of origens.sobrando) console.log(`-> ORIGENS explica '${chave}', que não existe mais`);
  process.exitCode = 1;
}

console.log(`\n${veredito.dentro ? 'CHEGOU' : 'NÃO CHEGOU'} — pior diferença ${veredito.piorMm.toFixed(3)} mm de ${veredito.toleranciaMm} mm.`);
if (!veredito.dentro) process.exitCode = 1;
