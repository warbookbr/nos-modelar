#!/usr/bin/env node
/* alteracao-local.mjs — Q5 da prova P2: `elevar a crista 25 mm`.
   Mede quantos loops a alteração toca, o que muda na malha compilada e se a
   reexecução dá o mesmo resultado. É o terceiro braço do critério de descarte. */

import { construirQuartoDianteiro } from './quarto-dianteiro.mjs';
import { validarCage, espelhar } from './cage.mjs';
import { subdividir, malhaCanonica } from './subdividir.mjs';

/* A alteração é declarada por NOME DE LOOP, não por lista de vértices. É esse o
   requisito: a unidade editável é o loop nomeado. */
export function elevarLoop(cage, nomeDoLoop, milimetros) {
  const loop = cage.loops[nomeDoLoop];
  if (!loop) throw new Error(`loop '${nomeDoLoop}' não existe; há ${Object.keys(cage.loops).join(', ')}`);
  const V = new Map(cage.V);
  for (const v of loop.v) {
    const p = V.get(v);
    V.set(v, [p[0], p[1] + milimetros, p[2]]);
  }
  return { ...cage, V };
}

/* Quais loops nomeados contêm algum vértice movido. */
export function loopsTocados(cage, movidos) {
  const set = new Set(movidos);
  return Object.entries(cage.loops)
    .filter(([, l]) => l.v.some((v) => set.has(v)))
    .map(([nome]) => nome)
    .sort();
}

if (process.argv[1] && process.argv[1].endsWith('alteracao-local.mjs')) {
  const antes = construirQuartoDianteiro();
  const alvo = 'cristaParalama';
  const depois = elevarLoop(antes, alvo, 25);

  const movidos = [...antes.V.keys()].filter((v) => antes.V.get(v)[1] !== depois.V.get(v)[1]);
  const tocados = loopsTocados(antes, movidos);

  console.log(`ALTERACAO: elevar '${alvo}' em 25 mm`);
  console.log(`  vértices movidos: ${movidos.length}`);
  console.log(`  loops nomeados tocados: ${tocados.length} — ${tocados.join(', ')}`);

  const v = validarCage(depois);
  console.log(`  cage continua válida: ${v.problemas.length === 0 ? 'sim' : `NAO (${v.problemas.length})`}`);

  const mA = subdividir(espelhar(antes), 2);
  const mB = subdividir(espelhar(depois), 2);
  console.log(`  faces antes e depois: ${mA.F.size} → ${mB.F.size} (topologia ${mA.F.size === mB.F.size ? 'intacta' : 'MUDOU'})`);

  let maior = 0; let mexidos = 0;
  for (const [id, p] of mA.V) {
    const q = mB.V.get(id);
    const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (d > 1e-9) mexidos += 1;
    if (d > maior) maior = d;
  }
  console.log(`  malha nível 2: ${mexidos} de ${mA.V.size} vértices moveram, deslocamento máximo ${maior.toFixed(1)} mm`);
  console.log(`  alcance da edição: ${(100 * mexidos / mA.V.size).toFixed(1)}% da malha — local, não global`);

  const r1 = JSON.stringify(malhaCanonica(subdividir(espelhar(elevarLoop(construirQuartoDianteiro(), alvo, 25)), 2)));
  const r2 = JSON.stringify(malhaCanonica(mB));
  console.log(`  reexecução idêntica: ${r1 === r2 ? 'sim' : 'NAO'}`);

  console.log('\nCRITERIO DE DESCARTE, terceiro braço');
  console.log(`  alteração local toca ${tocados.length} loop(s) — o limite é 1: ${tocados.length <= 1 ? 'OK' : 'ESTOUROU'}`);
}
