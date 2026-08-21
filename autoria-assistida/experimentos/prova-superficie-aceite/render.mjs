#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirPeleDianteira } from './secoes-de-carater.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const cameras = {
  lateral: { u: [0, 0, -1], v: [0, -1, 0] },
  frontal: { u: [-1, 0, 0], v: [0, -1, 0] },
  superior: { u: [0, 0, -1], v: [-1, 0, 0] },
  isometrica: { u: unit([-0.62, 0, -0.78]), v: unit([-0.34, -0.9, 0.28]) },
};

export function desenhar(pele, camera) {
  const cam = cameras[camera];
  const projetar = (p) => [dot(p, cam.u), dot(p, cam.v)];
  const faces = [...pele.F.values()].map((f) => ({ ...f, pontos: f.vs.map((id) => projetar(pele.V.get(id)) ) }));
  const todos = faces.flatMap((f) => f.pontos);
  const xs = todos.map((p) => p[0]); const ys = todos.map((p) => p[1]);
  const escala = Math.min(560 / (Math.max(...xs) - Math.min(...xs)), 370 / (Math.max(...ys) - Math.min(...ys)));
  const tela = ([x, y]) => `${(30 + (x - Math.min(...xs)) * escala).toFixed(1)},${(25 + (y - Math.min(...ys)) * escala).toFixed(1)}`;
  const cores = { capo: '#638db6', quebraDeOmbro: '#35678e', flanco: '#497ca6', arcoDeRoda: '#315c80', gradeLocalDoArco: '#47779b', gradeLocalDoFarol: '#2f5c7d' };
  return [`<svg xmlns="http://www.w3.org/2000/svg" width="620" height="430" viewBox="0 0 620 430">`, '<rect width="100%" height="100%" fill="#f4f3ef"/>', ...faces.map((f) => `<polygon points="${f.pontos.map(tela).join(' ')}" fill="${cores[f.parte]}" stroke="#17324a" stroke-width="1.1"/>`), `<text x="18" y="412" font-family="system-ui" font-size="13" fill="#52606d">R2 — primeira hipótese, ${camera}</text>`, '</svg>'].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pele = construirPeleDianteira();
  const destino = path.join(aqui, 'evidencias');
  mkdirSync(destino, { recursive: true });
  for (const camera of Object.keys(cameras)) writeFileSync(path.join(destino, `rascunho-1-${camera}.svg`), `${desenhar(pele, camera)}\n`);
  console.log(`primeira hipótese: ${pele.V.size} vértices, ${pele.F.size} quads`);
}
