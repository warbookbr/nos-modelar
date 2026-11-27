// comparar duas malhas (.json do protótipo) por parte: desvio de posição nos dois sentidos e o facetamento (diedros abaixo da quina). Uso: node comparar-malhas.mjs <a.json> <b.json> <partes separadas por vírgula>
import { readFileSync } from 'node:fs'; import { criarGrade, desvio, diedros } from './geo.mjs';
const [a, b, filtroTxt] = process.argv.slice(2); const filtro = filtroTxt.split(',');
const carrega = (arq) => { const d = JSON.parse(readFileSync(arq)); const P = d.pos.map((x) => x * 1000); const T = []; for (const f of d.faces) { if (!filtro.includes(d.partes[f[0]])) continue; const vs = f.slice(1); for (let k = 1; k + 1 < vs.length; k++) T.push(vs[0], vs[k], vs[k+1]); } return { P, T }; };
const A = carrega(a), B = carrega(b); const gA = criarGrade(A.P, A.T, 15), gB = criarGrade(B.P, B.T, 15);
const ab = desvio(A.P, A.T, gB), ba = desvio(B.P, B.T, gA);
console.log(`triangulos ${A.T.length/3} e ${B.T.length/3}; A->B max ${ab.max.toFixed(2)} mm p99 ${ab.p99.toFixed(2)} media ${ab.media.toFixed(3)}; B->A max ${ba.max.toFixed(2)} p99 ${ba.p99.toFixed(2)} media ${ba.media.toFixed(3)}`);
for (const [n, m] of [['A', A], ['B', B]]) { const d = diedros(m.P, m.T, 30); console.log(`  ${n}: diedro entre triangulos vizinhos abaixo de 30 graus: p90 ${d.p90.toFixed(2)} p99 ${d.p99.toFixed(2)} max ${d.max.toFixed(2)}`); }
