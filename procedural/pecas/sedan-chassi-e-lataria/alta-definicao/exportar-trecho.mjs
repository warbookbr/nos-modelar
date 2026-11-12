#!/usr/bin/env node
/* exportar-trecho.mjs: grava em OBJ, em metro, as partes pedidas de um esboço ou de uma receita, para a vista de três quartos lado a
 * lado deste ciclo. `npm run exportar:obj` recusa a receita do caminho A com painéis ("Face tem triângulo sem área"), pelas três faces
 * finas que o corte do arco de roda deixa, e não lê esboço; aqui a face é gravada como veio e a face sem área é pulada.
 *
 * Uso: node exportar-trecho.mjs <esboço|receita> <saida.obj> [--partes=a,b,c] */
import { writeFileSync } from 'node:fs';
import { lerEntrada } from '../../../../tools/modelar/vao-entre-partes.mjs';

const [arquivo, saida] = process.argv.slice(2);
const partes = (process.argv.find((a) => a.startsWith('--partes=')) ?? '=').split('=')[1].split(',').filter(Boolean);
const { faces } = await lerEntrada(arquivo);
const linhas = []; let n = 0; let puladas = 0; let gravadas = 0;
const porParte = new Map();
for (const f of faces) { if (partes.length && !partes.includes(f.parte)) continue; if (!porParte.has(f.parte)) porParte.set(f.parte, []); porParte.get(f.parte).push(f.pts); }
for (const [parte, lista] of porParte) {
  linhas.push(`o ${parte}`);
  for (const pts of lista) {
    /* a área do polígono pelo vetor de Newell; a face inteira vai ao OBJ, e quem lê (o Blender) a triangula */
    const w = [0, 0, 0];
    for (let i = 0; i < pts.length; i++) { const p = pts[i]; const q = pts[(i + 1) % pts.length]; w[0] += (p[1] - q[1]) * (p[2] + q[2]); w[1] += (p[2] - q[2]) * (p[0] + q[0]); w[2] += (p[0] - q[0]) * (p[1] + q[1]); }
    if (Math.hypot(...w) / 2 < 1e-6) { puladas++; continue; }
    for (const p of pts) linhas.push(`v ${(p[0] / 1000).toFixed(6)} ${(p[1] / 1000).toFixed(6)} ${(p[2] / 1000).toFixed(6)}`);
    linhas.push(`f ${pts.map((_, i) => n + i + 1).join(' ')}`); n += pts.length; gravadas++;
  }
}
writeFileSync(saida, `${linhas.join('\n')}\n`);
console.log(JSON.stringify({ saida, partes: [...porParte.keys()], faces: gravadas, semArea: puladas }));
