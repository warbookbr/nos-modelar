#!/usr/bin/env node
/* medidas-da-fonte.mjs — tira de `fonte-partes.json`, em milímetro, o ponto de partida das três vistas da carroceria: o perfil lateral, a planta, a seção frontal e as rodas.

   Uso: node tools/modelar/medidas-da-fonte.mjs <fonte-partes.json> [--tol <mm>] [--json <arquivo.json>] [--codigo <arquivo.js>]

   O perfil lateral (z, y) vem do y máximo de cada fatia em z, a planta (z, meia largura) do x máximo, a seção frontal (meia largura, y) do x máximo de cada fatia em y, e a face da frente e a de trás
   (z, y) do z máximo e mínimo de cada fatia em y. Cada polilinha é simplificada por Douglas-Peucker com a tolerância dada (padrão 25 mm), para ficar com os vértices onde a forma dobra e não um por
   fatia. As rodas saem das caixas das malhas de roda (pelo nome) ou, quando a fonte é uma malha só, dos vales de y mínimo (as fatias que não tocam o chão). A saída é o JSON em milímetro (com `--json`,
   ou na tela) e um trecho de código de receita (com `--codigo`, ou na tela): a TABELA das medidas, as duas funções que levam perfil e seção ao referencial do núcleo (medido: a extrusão em x leva [u, v] a
   (y = -u, z = v); em z, a (x = u, y = -v)) e o passo `extrusao` de cada vista. Recusa fonte sem `frente`.
   Atenção: o x máximo por fatia é o máximo de TUDO naquela altura (rodas, espelhos, para-lamas); onde a roda ou o espelho domina, a seção da carroceria é menor. Leia contra `fonte-vistas.png`. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exigirFrente } from './frente-da-fonte.mjs';

const mm = (v) => Math.round(v * 1000);

/** Douglas-Peucker sobre uma polilinha de [a, b], com tolerância `eps` na mesma unidade. */
export function simplificar(pts, eps) {
  if (pts.length < 3) return pts;
  const [p, q] = [pts[0], pts[pts.length - 1]];
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
  let iMax = 0; let dMax = 0;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const dist = Math.abs((q[0] - p[0]) * (p[1] - pts[i][1]) - (p[0] - pts[i][0]) * (q[1] - p[1])) / L;
    if (dist > dMax) { dMax = dist; iMax = i; }
  }
  return dMax <= eps ? [p, q] : [...simplificar(pts.slice(0, iMax + 1), eps).slice(0, -1), ...simplificar(pts.slice(iMax), eps)];
}

/** As medidas da fonte em milímetro. Cada polilinha é uma lista de pares; `rodas` uma lista de `{ nome, centro: [x, y, z], raio, largura, xDe, xAte }`. */
export function medidasDaFonte(fonte, { tol = 25 } = {}) {
  const Z = fonte.silhueta.porFatiaEmZ; const Y = fonte.silhueta.porFatiaEmY;
  const meio = (f) => mm((f.de + f.ate) / 2);
  const validas = (l, c) => l.filter((f) => f[c] !== null);
  const caixa = { xMeia: mm(fonte.total.maximo[0]), yMax: mm(fonte.total.maximo[1]), zDe: mm(fonte.total.minimo[2]), zAte: mm(fonte.total.maximo[2]) };
  const avisos = [];
  const rodas = []; let baseEntreRodas = null;
  const nomeadas = fonte.partes.filter((p) => /wheel|roda|tire|tyre|pneu/i.test(p.nome));
  if (nomeadas.length) {
    for (const r of nomeadas) rodas.push({ nome: r.nome, centro: [0, 1, 2].map((i) => mm((r.minimo[i] + r.maximo[i]) / 2)), raio: mm((r.maximo[1] - r.minimo[1]) / 2), largura: mm(r.maximo[0] - r.minimo[0]), xDe: mm(r.minimo[0]), xAte: mm(r.maximo[0]) });
  } else {
    const yBase = Math.max(...Z.map((f) => f.ymin));
    const grupos = []; let atual = null;
    for (const f of Z) { if (f.ymin < yBase - 0.005) { if (!atual) { atual = []; grupos.push(atual); } atual.push(f); } else atual = null; }
    for (const g of grupos) {
      const z0 = g[0].de; const z1 = g[g.length - 1].ate;
      rodas.push({ nome: 'pelo vale de ymin', centro: [null, null, mm((z0 + z1) / 2)], raio: mm((z1 - z0) / 2) });
    }
    baseEntreRodas = mm(yBase);
    avisos.push('rodas medidas pelos vales de y mínimo (a fonte é uma malha só): o raio é aproximado e a fatia mede a roda e o para-lama juntos; confira na vista lateral');
  }
  avisos.push('o x máximo por fatia é o máximo de tudo naquela altura (rodas, espelhos, para-lamas); onde a roda ou o espelho domina, a seção da carroceria é menor: confira contra fonte-vistas.png');
  return {
    unidade: 'mm', tolerancia: tol, caixa, baseEntreRodas, rodas, avisos,
    perfilLateral: simplificar(validas(Z, 'ymax').map((f) => [meio(f), mm(f.ymax)]), tol).reverse(),
    planta: simplificar(validas(Z, 'xmax').map((f) => [meio(f), mm(f.xmax)]), tol).reverse(),
    secaoFrontal: simplificar(validas(Y, 'xmax').map((f) => [mm(f.xmax), meio(f)]), tol),
    faceDaFrente: simplificar(validas(Y, 'zmax').map((f) => [mm(f.zmax), meio(f)]), tol),
    faceDeTras: simplificar(validas(Y, 'zmin').map((f) => [mm(f.zmin), meio(f)]), tol),
  };
}

/** O trecho de código de receita: a TABELA com as medidas, as funções de referencial e os dois passos de extrusão (perfil lateral em x, seção frontal em z). */
export function codigoDeReceita(medidas, nome = 'veiculo') {
  const j = (v) => JSON.stringify(v).replace(/\],\[/g, '], [');
  const r = medidas.rodas.filter((x) => x.centro[2] !== null);
  const C = medidas.caixa.zAte - medidas.caixa.zDe;
  return `/* Trecho gerado por medidas-da-fonte.mjs a partir de fonte-partes.json (${nome}); medidas em milímetro, de fonte. Confira cada vértice contra fonte-vistas.png antes de usar. */
const m = (v) => v / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo, medido: eixo x leva [u,v] a (y=-u, z=v); eixo z leva [u,v] a (x=u, y=-v); eixo y leva [u,v] a (x=u, z=v). */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

export const TABELA = {
  comprimento: ${C}, meia_largura: ${medidas.caixa.xMeia}, altura: ${medidas.caixa.yMax},
  /* perfil lateral (z, y), da frente para trás pelo topo */
  lado: ${j(medidas.perfilLateral)},
  /* planta (z, meia largura), da frente para trás */
  planta: ${j(medidas.planta)},
  /* seção frontal (meia largura, y), de baixo para cima */
  frente: ${j(medidas.secaoFrontal)},
  /* face da frente e a de trás (z, y), de baixo para cima */
  face_frente: ${j(medidas.faceDaFrente)}, face_tras: ${j(medidas.faceDeTras)},
  /* rodas (centro z, raio) */
  rodas: ${j(r.map((x) => ({ z: x.centro[2], y: x.centro[1], raio: x.raio, ...(x.largura ? { largura: x.largura, x_de: x.xDe, x_ate: x.xAte } : {}) })))},
};

const T = TABELA; const L = T.meia_largura + 50; const C = T.comprimento / 2 + 50;
/* O perfil lateral guarda só o topo; o fundo fecha no chão (y = 0), e o arco das rodas se recorta no próprio perfil. */
const ladoFechado = [...T.lado, [T.lado[T.lado.length - 1][0], 0], [T.lado[0][0], 0]];
/* A carroceria é a interseção destes dois prismas com uma caixa de recorte por parte. */
export const passosDasVistas = (base) => [
  ['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilLateral(ladoFechado) }],
  ['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: secaoFrontal(espelhar(T.frente)) }],
];
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const COM_VALOR = ['--tol', '--json', '--codigo'];
  const valor = (flag) => { const i = a.indexOf(flag); return i >= 0 ? a[i + 1] : null; };
  const arq = a.find((x, i) => !x.startsWith('--') && !COM_VALOR.includes(a[i - 1]));
  if (!arq) { console.error('uso: node tools/modelar/medidas-da-fonte.mjs <fonte-partes.json> [--tol <mm>] [--json <arquivo.json>] [--codigo <arquivo.js>]'); process.exit(2); }
  try {
    const fonte = JSON.parse(readFileSync(resolve(arq), 'utf8'));
    exigirFrente(fonte, arq);
    const med = medidasDaFonte(fonte, { tol: valor('--tol') !== null ? parseFloat(valor('--tol')) : 25 });
    const codigo = codigoDeReceita(med, arq);
    if (valor('--json')) writeFileSync(resolve(valor('--json')), `${JSON.stringify(med, null, 1)}\n`); else console.log(JSON.stringify(med));
    if (valor('--codigo')) writeFileSync(resolve(valor('--codigo')), codigo); else console.log(`\n${codigo}`);
    if (valor('--json') || valor('--codigo')) console.log(`medidas: ${med.perfilLateral.length} vértices no perfil lateral, ${med.secaoFrontal.length} na seção frontal, ${med.rodas.length} rodas`);
  } catch (e) { console.error(`medidas-da-fonte: ${e.message}`); process.exit(2); }
}
