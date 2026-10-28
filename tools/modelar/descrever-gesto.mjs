#!/usr/bin/env node
/* descrever-gesto.mjs — ler a edição da bancada em palavras, antes de reescrever.
 *
 * O `absorver` responde uma pergunta só, e é a que fecha a rodada: a receita
 * como está chega onde a pessoa deixou a peça? Este comando responde a de
 * antes: o que ela fez? Ele compara a malha que a receita produz hoje com o
 * alvo salvo e diz, por parte, se o movimento é translação, rotação, escala,
 * esticão com uma ponta presa, dobra, ou nenhum desses. Junto vai o mapa de
 * qual passo da receita constrói qual parte, que é onde a reescrita vai mexer.
 *
 *   npm run descrever:gesto -- <ajuste.json> [--receita <nome>]
 *
 * Ele não reescreve nada e não aprova nada, então sai com código 0 mesmo quando
 * o gesto não tem padrão: não achar padrão é uma resposta, não uma falha.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { descreverGestoDoAlvo } from '../../src/autoria/descricao-do-gesto.js';
import { mapearParteParaPasso } from '../../src/autoria/mapa-parte-passo.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const args = process.argv.slice(2);
const caminhoDoAlvo = args.find((a) => !a.startsWith('--'));
const indiceReceita = args.indexOf('--receita');
if (!caminhoDoAlvo) {
  console.error('uso: npm run descrever:gesto -- <ajuste.json> [--receita <nome>]');
  process.exit(2);
}

const alvo = JSON.parse(readFileSync(caminhoDoAlvo, 'utf8'));
const nomeDaReceita = indiceReceita >= 0 ? args[indiceReceita + 1] : (alvo.receitaDeOrigem ?? alvo.peca);
if (!nomeDaReceita) {
  console.error('descrever:gesto: o ajuste não diz de que peça veio; passe --receita <nome>.');
  process.exit(2);
}

const modulo = await import(pathToFileURL(resolverCaminhoReceita(nomeDaReceita)).href);
const receita = modulo.default ?? modulo;
const { neutro } = executarReceita(receita);

/* A descrição salva pela bancada vale mais que qualquer reconstrução feita
   aqui: lá as duas malhas tinham os mesmos vértices, e aqui só existem duas
   nuvens de pontos. A reconstrução continua existindo para alvo salvo antes
   desta descrição, e o comando diz de onde veio o que está mostrando. */
const salva = alvo.descricaoDoGesto;
const gesto = salva ?? descreverGestoDoAlvo(neutro, alvo);
const mapa = mapearParteParaPasso(receita);
const passoDaParte = new Map(mapa.partes.map((p) => [p.parte, p]));

console.log(`peça: ${nomeDaReceita}`);
console.log(`alvo: ${caminhoDoAlvo}`);
console.log(salva
  ? 'leitura: a descrição que a bancada salvou, com a correspondência de vértices conhecida'
  : 'leitura: reconstruída aqui, emparelhando as duas nuvens por posição — movimento do tamanho '
    + 'do espaçamento entre pontos pode sair como "sem padrão"');

console.log('\no que mudou de forma:');
for (const parte of gesto.partes) {
  if (parte.tipo === 'parada') continue;
  console.log(`\n  ${parte.parte} — ${parte.tipo}`);
  console.log(`    ${parte.frase}.`);
  if (parte.quantosAndaram) {
    console.log(`    ${parte.quantosAndaram} de ${parte.verticesComparados} pontos andaram, `
      + `o maior ${parte.maiorMm} mm`);
  }
  const onde = passoDaParte.get(parte.parte);
  if (!onde) console.log('    a receita não nomeia esta parte');
  else if (onde.construtores.length === 0) console.log(`    passo ${onde.posicaoDoPasso}, sem passo que construa a origem`);
  else {
    const lista = onde.construtores.map((c) => `${c.posicao} (${c.op})`).join(', ');
    console.log(`    nomeada no passo ${onde.posicaoDoPasso}, construída em ${lista}`);
  }
}

const paradas = gesto.partes.filter((p) => p.tipo === 'parada').map((p) => p.parte);
if (paradas.length) console.log(`\npartes que não mudaram: ${paradas.join(', ')}`);
for (const nome of gesto.nascidas) console.log(`\n-> ${nome}: o alvo declara esta parte e a receita não a produz`);
for (const nome of gesto.sumidas) console.log(`\n-> ${nome}: a receita produz esta parte e o alvo não a declara`);
if (!gesto.mexidas.length && !gesto.nascidas.length && !gesto.sumidas.length) {
  console.log('\nnada mudou: o alvo descreve a mesma forma que a receita produz hoje.');
}
