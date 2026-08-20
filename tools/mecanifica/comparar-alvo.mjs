#!/usr/bin/env node
/* comparar-alvo.mjs — sobrepõe a silhueta do MODELO ao DESENHO ALVO, em
   milímetros, na mesma origem e na mesma escala.

   Por que existe: durante toda a prova do quarto dianteiro eu modelei sem abrir
   o desenho de referência uma única vez, e mandei ao revisor visual só o render.
   A pergunta que ele podia responder era "isso parece um carro?", e a resposta
   foi 3/10 duas vezes seguidas sem que nenhum de nós pudesse apontar contra o
   quê. Comparar contra o alvo é outra pergunta, e essa tem resposta.

   Cinza é o alvo, azul é o modelo. Onde só há cinza, falta forma; onde só há
   azul, sobra.

   Uso: node tools/mecanifica/comparar-alvo.mjs saida.svg malha.json [zMin zMax] */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { filete } from './prancha-geometria.mjs';
import * as ALVO from './alvo-chassi-p0.mjs';

/* Só a PELE EXTERIOR entra na silhueta. Incluir tudo punha a caixa da grelha e
   as fitas de retorno na projeção, e o contorno saía com picos verticais até o
   fundo dos recessos — ruído que não é a forma vista de fora. */
export const PELE = /^(capo|paralama|lateral|fascia|teto|traseira)/i;

export function verticesDaPele(malha) {
  const usados = new Set();
  for (const f of malha.F) {
    const parte = f[2];
    if (!parte || !PELE.test(parte)) continue;
    for (const v of f[1]) usados.add(v);
  }
  return malha.V.filter((p) => usados.has(p[0]));
}

/* Contorno projetado do modelo: extremos por faixa, no par de eixos da vista.
   Faixa com poucas amostras é descartada: um único vértice não define contorno. */
export function silhueta(V, [ejeA, ejeB], passo = 40, absA = false, absB = false) {
  const por = new Map();
  for (const p of V) {
    const a = absA ? Math.abs(p[ejeA]) : p[ejeA];
    const b = absB ? Math.abs(p[ejeB]) : p[ejeB];
    const k = Math.round(a / passo) * passo;
    const atual = por.get(k);
    if (!atual) por.set(k, { min: b, max: b, n: 1 });
    else { atual.min = Math.min(atual.min, b); atual.max = Math.max(atual.max, b); atual.n += 1; }
  }
  const ord = [...por.entries()].filter(([, r]) => r.n >= 3).sort((x, y) => x[0] - y[0]);
  return {
    maxima: ord.map(([a, r]) => [a, r.max]),
    minima: ord.map(([a, r]) => [a, r.min]),
  };
}

const expandir = (pts) => (pts.some((p) => p.length > 2) ? filete(pts) : pts.map((p) => [p[0], p[1]]));

/* Uma vista da folha: alvo por baixo, modelo por cima, mesma transformação. */
function vista({ rotulo, alvoLinhas, modeloLinhas, caixa, largura, altura, x0, y0, escala, inverterB }) {
  const O = [];
  const tela = ([a, b]) => {
    const px = x0 + (a - caixa[0]) * escala;
    const py = inverterB ? y0 + (caixa[3] - b) * escala : y0 + (b - caixa[1]) * escala;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  };
  O.push(`<text x="${x0}" y="${y0 - 12}" font-size="13" fill="#6b7481">${rotulo}</text>`);
  O.push(`<rect x="${x0 - 8}" y="${y0 - 8}" width="${largura + 16}" height="${altura + 16}" fill="none" stroke="#e3e3e0"/>`);
  for (const l of alvoLinhas) {
    if (l.length < 2) continue;
    O.push(`<polyline points="${l.map(tela).join(' ')}" fill="none" stroke="#9aa3ad" stroke-width="3.2"/>`);
  }
  for (const l of modeloLinhas) {
    if (l.length < 2) continue;
    O.push(`<polyline points="${l.map(tela).join(' ')}" fill="none" stroke="#2f5d9e" stroke-width="1.8"/>`);
  }
  return O.join('\n');
}

export function comparar(V, { zMin = 400, zMax = 2320 } = {}) {
  const dentro = (pts) => pts.filter(([z]) => z >= zMin && z <= zMax);
  const Vz = V.filter((p) => p[3] >= zMin && p[3] <= zMax).map((p) => [p[1], p[2], p[3]]);

  /* LATERAL: z contra y. */
  const lat = silhueta(Vz, [2, 1]);
  const alvoLat = [dentro(expandir(ALVO.TOPO)), ...ALVO.BASE.map((b) => dentro(expandir(b)))];

  /* PLANTA: z contra meia largura. */
  const pla = silhueta(Vz, [2, 0], 40, false, true);
  const alvoPla = [dentro(expandir(ALVO.PLANTA))];

  /* FRONTAL: altura contra meia largura, que é como o alvo declara a vista. */
  const fro = silhueta(Vz.map((p) => [p[0], p[1], p[2]]), [1, 0], 40, false, true);
  const alvoFro = [expandir(ALVO.FRONTAL)];

  const esc = 0.28;
  const L = { z: [zMin, 0, zMax, 1250] };
  const partes = [];
  partes.push(vista({
    rotulo: 'LATERAL — cinza: alvo do P0 · azul: modelo',
    alvoLinhas: alvoLat, modeloLinhas: [lat.maxima, lat.minima],
    caixa: [zMin, 0, zMax, 1250], escala: esc, inverterB: true,
    largura: (zMax - zMin) * esc, altura: 1250 * esc, x0: 40, y0: 40,
  }));
  partes.push(vista({
    rotulo: 'PLANTA — meia largura',
    alvoLinhas: alvoPla, modeloLinhas: [pla.maxima],
    caixa: [zMin, 0, zMax, 1100], escala: esc, inverterB: true,
    largura: (zMax - zMin) * esc, altura: 1100 * esc, x0: 40, y0: 40 + 1250 * esc + 70,
  }));
  partes.push(vista({
    rotulo: 'FRONTAL — altura × meia largura',
    alvoLinhas: alvoFro, modeloLinhas: [fro.maxima],
    caixa: [0, 0, 1250, 1100], escala: esc, inverterB: false,
    largura: 1250 * esc, altura: 1100 * esc,
    x0: 40 + (zMax - zMin) * esc + 80, y0: 40,
  }));

  const larguraTotal = 40 + (zMax - zMin) * esc + 80 + 1250 * esc + 40;
  const alturaTotal = 40 + 1250 * esc + 70 + 1100 * esc + 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larguraTotal.toFixed(0)} ${alturaTotal.toFixed(0)}" width="${larguraTotal.toFixed(0)}" height="${alturaTotal.toFixed(0)}" font-family="ui-sans-serif, system-ui, sans-serif">
<rect width="100%" height="100%" fill="#fbfbfa"/>
${partes.join('\n')}
</svg>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [saida, malhaJson, zMin, zMax] = process.argv.slice(2);
  if (!saida || !malhaJson) {
    console.error('uso: comparar-alvo.mjs saida.svg malha.json [zMin zMax]');
    process.exit(2);
  }
  const malha = JSON.parse(readFileSync(malhaJson, 'utf8'));
  const svg = comparar(verticesDaPele(malha), {
    zMin: zMin ? Number(zMin) : undefined,
    zMax: zMax ? Number(zMax) : undefined,
  });
  mkdirSync(path.dirname(saida), { recursive: true });
  writeFileSync(saida, svg);
  console.log(saida);
}
