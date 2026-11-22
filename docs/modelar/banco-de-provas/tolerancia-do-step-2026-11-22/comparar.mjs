#!/usr/bin/env node
/* comparar.mjs — compara duas medidas de `medir.mjs` peça a peça e imprime a tabela em markdown.
 *
 *   node docs/modelar/banco-de-provas/tolerancia-do-step-2026-11-22/comparar.mjs antes.json depois.json
 *
 * Para cada peça: o resultado antes e depois (exporta, recusa na validação, não costura ou receita com órfão), o número de
 * corpos e se a impressão geométrica (volume e caixa por corpo) mudou. Sai com código 1 se alguma peça que exportava antes
 * deixa de exportar ou muda de número de corpos. */
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const estado = (r) => (!r ? 'ausente' : r.receita ? 'receita' : !r.valida ? 'recusa' : r.exporta ? 'exporta' : 'não costura');
const linhas = ['| Peça | Antes | Depois | Corpos | Impressão |', '|---|---|---|---|---|'];
let piorou = 0; let melhorou = 0; let impressoes = 0;
for (const peca of [...new Set([...Object.keys(a.pecas), ...Object.keys(b.pecas)])].sort()) {
  const ra = a.pecas[peca]; const rb = b.pecas[peca];
  const ea = estado(ra); const eb = estado(rb);
  const corpos = ea === 'exporta' || eb === 'exporta' ? `${ra?.corpos ?? '-'} → ${rb?.corpos ?? '-'}` : '-';
  const mudou = ea === 'exporta' && eb === 'exporta' ? (JSON.stringify(ra.impressao) === JSON.stringify(rb.impressao) ? 'igual' : 'mudou') : '-';
  if (ea === 'exporta' && (eb !== 'exporta' || ra.corpos !== rb.corpos)) piorou += 1;
  if (ea !== 'exporta' && eb === 'exporta') melhorou += 1;
  if (mudou === 'mudou') impressoes += 1;
  if (ea !== eb || mudou === 'mudou') linhas.push(`| ${peca} | ${ea} | ${eb} | ${corpos} | ${mudou} |`);
}
console.log(linhas.join('\n'));
console.log(`\n${Object.keys(b.pecas).length} peças; ${melhorou} passaram a exportar, ${piorou} deixaram de exportar ou mudaram de corpos, ${impressoes} com a impressão mudada.`);
process.exit(piorou ? 1 : 0);
