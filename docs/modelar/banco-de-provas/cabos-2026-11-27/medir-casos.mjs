#!/usr/bin/env node
/* medir-casos.mjs — mede os casos de prova do cabo (`tools/fixtures/cabo/casos.mjs`): o comprimento obtido, o menor raio de curva, as faces e o tempo de cada um.
   Uso: node docs/modelar/banco-de-provas/cabos-2026-11-27/medir-casos.mjs [--json] */
import { CASOS_DO_CABO } from '../../../../tools/fixtures/cabo/casos.mjs';
import { medidasDoCabo } from '../../../../procedural/familias/cabo/index.js';
import { esquecerPlanos } from '../../../../procedural/familias/cabo/plano.js';

if (process.argv.includes('--ajuda')) { console.log('uso: node docs/modelar/banco-de-provas/cabos-2026-11-27/medir-casos.mjs [--json]\nMede cada caso de prova do cabo: comprimento de corte, raio mínimo, faces e tempo.'); process.exit(0); }
const linhas = [];
for (const [nome, caso] of Object.entries(CASOS_DO_CABO)) {
  esquecerPlanos();
  const t = performance.now();
  const m = medidasDoCabo(caso.parametros);
  const ms = Math.round(performance.now() - t);
  const L = caso.parametros.comprimento;
  linhas.push({ nome, comprimentoPedido: L, comprimentoDeCorte: Number(m.comprimentoDeCorte.toFixed(3)), erroDoComprimentoPorCento: Number((((m.comprimentoDeCorte - L) / L) * 100).toFixed(3)), comprimentoDaMalha: Number(m.comprimentoDaMalha.toFixed(3)), raioMinimo: Number(m.raioMinimo.toFixed(2)), raioPedido: (caso.parametros.diametro ?? 6) * 5, faces: m.faces, trechos: m.trechos, desvioDaCorda: Number(m.desvioDaCorda.toFixed(3)), autocontato: Number(m.distanciaDeAutocontato.toFixed(2)), ms });
}
if (process.argv.includes('--json')) console.log(JSON.stringify(linhas, null, 2));
else {
  console.log('caso | pedido mm | corte mm | erro % | malha mm | raio mín mm | faces | trechos | flecha mm | ms');
  for (const l of linhas) console.log(`${l.nome} | ${l.comprimentoPedido} | ${l.comprimentoDeCorte} | ${l.erroDoComprimentoPorCento} | ${l.comprimentoDaMalha} | ${l.raioMinimo} | ${l.faces} | ${l.trechos} | ${l.desvioDaCorda} | ${l.ms}`);
}
