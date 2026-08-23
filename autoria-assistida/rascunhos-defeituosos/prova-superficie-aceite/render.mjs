#!/usr/bin/env node
/* render.mjs — rasterizador descartável da prova; suas vistas sem profundidade não servem ao aceite. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirPeleDianteira } from './secoes-de-carater.mjs';
import { encodePng } from '../../../tools/bancadas/bench/pngwrite.mjs';

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
  const cores = { capo: '#638db6', quebraDeOmbro: '#35678e', flanco: '#497ca6', arcoDeRoda: '#315c80', gradeLocalDoArco: '#47779b', transicaoDoArco: '#5689ac', gradeLocalDoFarol: '#2f5c7d' };
  return [`<svg xmlns="http://www.w3.org/2000/svg" width="620" height="430" viewBox="0 0 620 430">`, '<rect width="100%" height="100%" fill="#f4f3ef"/>', ...faces.map((f) => `<polygon points="${f.pontos.map(tela).join(' ')}" fill="${cores[f.parte]}" stroke="#17324a" stroke-width="1.1"/>`), `<text x="18" y="412" font-family="system-ui" font-size="13" fill="#52606d">R2 — primeira hipótese, ${camera}</text>`, '</svg>'].join('\n');
}

/* Raster derivado da mesma projeção das vistas SVG. Ele permite que o crítico
   examine a forma, sem precisar ler a marcação vetorial ou o código gerador. */
export function desenharPng(pele, camera) {
  const cam = cameras[camera]; const projetar = (p) => [dot(p, cam.u), dot(p, cam.v)];
  const faces = [...pele.F.values()].map((face) => ({ ...face, pontos: face.vs.map((id) => projetar(pele.V.get(id))) }));
  const todos = faces.flatMap((face) => face.pontos); const xs = todos.map((p) => p[0]); const ys = todos.map((p) => p[1]);
  const escala = Math.min(560 / (Math.max(...xs) - Math.min(...xs)), 370 / (Math.max(...ys) - Math.min(...ys)));
  const tela = ([x, y]) => [30 + (x - Math.min(...xs)) * escala, 25 + (y - Math.min(...ys)) * escala];
  const W = 620; const H = 430; const pixels = Buffer.alloc(W * H * 3, 244);
  const cores = { capo: [99, 141, 182], quebraDeOmbro: [53, 103, 142], flanco: [73, 124, 166], arcoDeRoda: [49, 92, 128], gradeLocalDoArco: [71, 119, 155], transicaoDoArco: [86, 137, 172], gradeLocalDoFarol: [47, 92, 125] };
  const dentro = (ponto, poligono) => {
    let sim = false;
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i, i += 1) {
      const a = poligono[i]; const b = poligono[j];
      if ((a[1] > ponto[1]) !== (b[1] > ponto[1]) && ponto[0] < (b[0] - a[0]) * (ponto[1] - a[1]) / (b[1] - a[1]) + a[0]) sim = !sim;
    }
    return sim;
  };
  for (const face of faces) {
    const poligono = face.pontos.map(tela); const minX = Math.max(0, Math.floor(Math.min(...poligono.map((p) => p[0])))); const maxX = Math.min(W - 1, Math.ceil(Math.max(...poligono.map((p) => p[0]))));
    const minY = Math.max(0, Math.floor(Math.min(...poligono.map((p) => p[1])))); const maxY = Math.min(H - 1, Math.ceil(Math.max(...poligono.map((p) => p[1])))); const cor = cores[face.parte];
    for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) if (dentro([x + 0.5, y + 0.5], poligono)) {
      const indice = (y * W + x) * 3; pixels[indice] = cor[0]; pixels[indice + 1] = cor[1]; pixels[indice + 2] = cor[2];
    }
  }
  return encodePng({ W, H, ch: 3, pixels });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pele = construirPeleDianteira();
  const destino = path.join(aqui, 'evidencias');
  mkdirSync(destino, { recursive: true });
  for (const camera of Object.keys(cameras)) {
    writeFileSync(path.join(destino, `rascunho-1-${camera}.svg`), `${desenhar(pele, camera)}\n`);
    writeFileSync(path.join(destino, `rascunho-1-${camera}.png`), desenharPng(pele, camera));
  }
  console.log(`primeira hipótese: ${pele.V.size} vértices, ${pele.F.size} quads`);
}
