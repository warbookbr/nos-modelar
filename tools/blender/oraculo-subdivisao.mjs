#!/usr/bin/env node
/* oraculo-subdivisao.mjs — gera a fixture do oráculo da subdivisão, `procedural/nucleo/fixtures/subdivisao-oraculo-blender.json`,
   com o modificador Subdivision Surface do Blender, ou a confere contra o arquivo versionado.

   Uso:
     MECANIFICA_BLENDER=<executável do blender> node tools/blender/oraculo-subdivisao.mjs [--saida <arquivo.json>] [--conferir]

   As gaiolas são desenhadas aqui por código e nada vem de fora. Em `casos` ficam gaiolas por índice com o vinco do Blender de
   0 a 1, e em `receitas` passos `subdivisao` escritos só com nomes, que este gerador traduz em índices para o Blender (a
   nitidez `'viva'` vira vinco 1 e o canto vira vinco de vértice 1). O Blender roda `oraculo-subdivisao.py`, ao lado deste
   arquivo, que devolve os vértices de cada nível arredondados a 1e-6 nos casos e a 1e-7 nas receitas.

   Sem `--saida`, escreve sobre a fixture versionada. Com `--conferir`, não escreve: compara o que o Blender gerou com a
   fixture, número a número, e sai 1 se alguma coordenada diferir mais de 1e-7 ou se a estrutura mudar. O Blender fica fora
   do núcleo, do CI e do `--completo`; a fixture congelada é o que os testes do núcleo leem. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const FIXTURE = resolve(AQUI, '../../procedural/nucleo/fixtures/subdivisao-oraculo-blender.json');
export const TOLERANCIA = 1e-7;

export const SOBRE = 'Saída do modificador Subdivision Surface do Blender 5.0.1 (use_creases ligado, boundary_smooth All ou Keep Corners). '
  + 'Em casos, gaiolas por índice com o vinco do Blender de 0 a 1, use_limit_surface desligado e vértices arredondados a 1e-6. '
  + 'Em receitas, passos subdivisao escritos só com nomes, com a nitidez da receita igual ao vinco do Blender (viva é vinco 1) '
  + 'e o canto como vinco de vértice 1; nome@n é o nível n com use_limit_surface desligado e nome@n@limite é o mesmo nível '
  + 'com use_limit_surface ligado e qualidade 10, com vértices arredondados a 1e-7.';

/** As gaiolas por índice: cubo de 2 m, grade aberta ondulada e uma gaiola com polígono de cinco lados e triângulos. */
export function casos() {
  const cubo = {
    vertices: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
  };
  const grade = (() => {
    const v = []; const f = [];
    for (let j = 0; j <= 3; j++) for (let i = 0; i <= 4; i++) v.push([i * 0.5, 0.15 * Math.sin(i + j) + (i === 2 ? 0.3 : 0), j * 0.5]);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) f.push([j * 5 + i, (j + 1) * 5 + i, (j + 1) * 5 + i + 1, j * 5 + i + 1]);
    return { vertices: v, faces: f };
  })();
  const misto = {
    vertices: [[0, 0, 0], [1, 0, 0], [1.3, 0.2, 0.8], [0.5, 0.1, 1.3], [-0.3, 0.2, 0.8], [0.5, 0.9, 0.5], [1.6, 0.4, 0.0]],
    faces: [[0, 1, 2, 3, 4], [0, 4, 5], [1, 0, 5], [2, 1, 6]],
  };
  const vinco = (pares, c) => pares.map(([a, b]) => [a, b, c]);
  return [
    { nome: 'cubo-liso', ...cubo, vincos: [], niveis: [1, 2, 3] },
    { nome: 'cubo-topo-vivo', ...cubo, vincos: vinco([[4, 5], [5, 6], [6, 7], [7, 4]], 1.0), niveis: [1, 2, 3] },
    { nome: 'cubo-meio-vinco', ...cubo, vincos: vinco([[4, 5], [5, 6], [6, 7], [7, 4], [0, 4]], 0.5), niveis: [1, 2, 3] },
    { nome: 'cubo-vinco-fraco', ...cubo, vincos: vinco([[4, 5], [5, 6]], 0.3), niveis: [1, 2] },
    { nome: 'grade-aberta', ...grade, vincos: vinco([[2, 7], [7, 12], [12, 17]], 1.0), niveis: [1, 2] },
    { nome: 'grade-aberta-cantos', ...grade, vincos: [], niveis: [2], borda: 'cantos' },
    { nome: 'misto-ngon-tri', ...misto, vincos: vinco([[0, 1]], 0.7), niveis: [1, 2] },
  ];
}

/** As receitas nomeadas: cubo de 1 m com as doze arestas vincadas e chapa ondulada com vincos que se cruzam e terminam
    dentro dela; `limite` lista os níveis gerados também com a superfície limite do Blender. */
export function receitas() {
  const lista = [];
  const c = (x, y, z) => `c${x}${y}${z}`;
  const cuboPontos = {};
  for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) cuboPontos[c(x, y, z)] = [x - 0.5, y - 0.5, z - 0.5];
  const cuboFaces = [
    [c(0, 0, 0), c(0, 1, 0), c(1, 1, 0), c(1, 0, 0)], [c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)],
    [c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(0, 0, 1)], [c(1, 0, 0), c(1, 1, 0), c(1, 1, 1), c(1, 0, 1)],
    [c(1, 1, 0), c(0, 1, 0), c(0, 1, 1), c(1, 1, 1)], [c(0, 1, 0), c(0, 0, 0), c(0, 0, 1), c(0, 1, 1)],
  ];
  for (const [rotulo, nitidez] of [['025', 0.25], ['05', 0.5], ['075', 0.75], ['viva', 'viva']]) {
    lista.push({
      nome: `cubo-1m-arestas-${rotulo}`,
      pontos: cuboPontos,
      passo: {
        vertices: Object.keys(cuboPontos), faces: cuboFaces,
        vincos: [
          { nome: 'aroDeBaixo', pontos: [c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(0, 1, 0), c(0, 0, 0)], nitidez },
          { nome: 'aroDeCima', pontos: [c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1), c(0, 0, 1)], nitidez },
          { nome: 'coluna00', pontos: [c(0, 0, 0), c(0, 0, 1)], nitidez },
          { nome: 'coluna10', pontos: [c(1, 0, 0), c(1, 0, 1)], nitidez },
          { nome: 'coluna11', pontos: [c(1, 1, 0), c(1, 1, 1)], nitidez },
          { nome: 'coluna01', pontos: [c(0, 1, 0), c(0, 1, 1)], nitidez },
        ],
      },
      niveis: [1, 2, 3], limite: [2],
    });
  }
  const g = (i, j) => `g${i}_${j}`;
  const chapaPontos = {};
  for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) {
    chapaPontos[g(i, j)] = [0.4 * i, 0.15 * Math.sin(1.3 * i + 0.7 * j) + 0.05 * j, 0.35 * j + 0.03 * i * i];
  }
  const chapaFaces = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) chapaFaces.push([g(i, j), g(i, j + 1), g(i + 1, j + 1), g(i + 1, j)]);
  lista.push({
    nome: 'chapa-vincos-025-05-075',
    pontos: chapaPontos,
    passo: {
      vertices: Object.keys(chapaPontos), faces: chapaFaces,
      vincos: [
        { nome: 'dobra', pontos: [g(0, 2), g(1, 2), g(2, 2), g(3, 2), g(4, 2)], nitidez: 0.5 },
        { nome: 'friso', pontos: [g(3, 0), g(3, 1), g(3, 2)], nitidez: 0.25 },
        { nome: 'nervura', pontos: [g(1, 1), g(1, 2), g(1, 3)], nitidez: 0.75 },
      ],
      cantos: [g(4, 3)],
    },
    niveis: [1, 2], limite: [2],
  });
  lista.push({
    nome: 'chapa-vinco-vivo-borda-cantos',
    pontos: chapaPontos,
    passo: {
      vertices: Object.keys(chapaPontos), faces: chapaFaces, borda: 'cantos',
      vincos: [{ nome: 'dobraViva', pontos: [g(1, 2), g(2, 2), g(3, 2), g(3, 3), g(4, 3)], nitidez: 'viva' }],
    },
    niveis: [1, 2], limite: [2],
  });
  return lista;
}

/** A entrada do Blender, por índice: os casos como estão (1e-6) e as receitas traduzidas (1e-7). */
export function entradaDoBlender(listaDeCasos, listaDeReceitas) {
  const doCaso = (c) => ({
    nome: c.nome, vertices: c.vertices, faces: c.faces, vincos: c.vincos, cantos: [], borda: c.borda,
    niveis: c.niveis, limiteEm: [], casas: 6,
  });
  const daReceita = (r) => {
    const idx = new Map(r.passo.vertices.map((n, k) => [n, k]));
    const vincos = [];
    for (const v of r.passo.vincos) {
      for (let k = 0; k + 1 < v.pontos.length; k++) vincos.push([idx.get(v.pontos[k]), idx.get(v.pontos[k + 1]), v.nitidez === 'viva' ? 1 : v.nitidez]);
    }
    return {
      nome: r.nome, vertices: r.passo.vertices.map((n) => r.pontos[n]), faces: r.passo.faces.map((f) => f.map((n) => idx.get(n))),
      vincos, cantos: (r.passo.cantos ?? []).map((n) => idx.get(n)), borda: r.passo.borda,
      niveis: [...new Set([...r.niveis, ...r.limite])].sort((a, b) => a - b), limiteEm: r.limite, casas: 7,
    };
  };
  return [...listaDeCasos.map(doCaso), ...listaDeReceitas.map(daReceita)];
}

/** Roda o Blender sobre a entrada e devolve { 'nome@n' | 'nome@n@limite': vértices }. */
export function rodarBlender(blender, entrada) {
  const dir = mkdtempSync(join(tmpdir(), 'oraculo-subdivisao-'));
  try {
    const ent = join(dir, 'entrada.json'); const sai = join(dir, 'saida.json');
    writeFileSync(ent, JSON.stringify(entrada));
    const r = spawnSync(blender, ['-b', '--factory-startup', '--python', join(AQUI, 'oraculo-subdivisao.py'), '--', ent, sai], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`o Blender saiu com ${r.status}:\n${r.stdout}\n${r.stderr}`);
    return JSON.parse(readFileSync(sai, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A fixture inteira, na ordem de chaves da versionada. */
export function gerarFixture(blender) {
  const cs = casos(); const rs = receitas();
  return { sobre: SOBRE, casos: cs, blender: rodarBlender(blender, entradaDoBlender(cs, rs)), receitas: rs };
}

/** Diferenças entre duas fixtures: estrutura (chaves, contagens, gaiolas) igual e coordenadas a até `tol`. */
export function compararFixtures(a, b, tol = TOLERANCIA) {
  const erros = [];
  if (a.sobre !== b.sobre) erros.push('o texto de sobre difere');
  if (JSON.stringify(a.casos) !== JSON.stringify(b.casos)) erros.push('as gaiolas dos casos diferem');
  if (JSON.stringify(a.receitas) !== JSON.stringify(b.receitas)) erros.push('as receitas diferem');
  const ka = Object.keys(a.blender); const kb = Object.keys(b.blender);
  if (JSON.stringify(ka) !== JSON.stringify(kb)) erros.push(`as chaves do Blender diferem: ${ka.length} contra ${kb.length}`);
  let pior = 0;
  for (const k of ka) {
    const va = a.blender[k]; const vb = b.blender[k];
    if (!vb) continue;
    if (va.length !== vb.length) { erros.push(`${k}: ${va.length} vértices contra ${vb.length}`); continue; }
    for (let i = 0; i < va.length; i++) for (let e = 0; e < 3; e++) pior = Math.max(pior, Math.abs(va[i][e] - vb[i][e]));
  }
  if (pior > tol) erros.push(`a maior diferença de coordenada é ${pior.toExponential(2)}, acima de ${tol}`);
  return { erros, pior };
}

function principal(args) {
  const blender = process.env.MECANIFICA_BLENDER;
  if (!blender) { console.error('defina MECANIFICA_BLENDER com o caminho do executável do Blender'); return 2; }
  const i = args.indexOf('--saida');
  const saida = i >= 0 ? resolve(args[i + 1]) : FIXTURE;
  const nova = gerarFixture(blender);
  if (args.includes('--conferir')) {
    const versionada = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    const { erros, pior } = compararFixtures(nova, versionada);
    const identica = JSON.stringify(nova) === readFileSync(FIXTURE, 'utf8');
    console.log(`oráculo: ${Object.keys(nova.blender).length} saídas, maior diferença ${pior.toExponential(2)}, ${identica ? 'byte a byte idêntica' : 'texto diferente'}`);
    for (const e of erros) console.error(`  ${e}`);
    return erros.length ? 1 : 0;
  }
  writeFileSync(saida, JSON.stringify(nova));
  console.log(`oráculo: ${Object.keys(nova.blender).length} saídas gravadas em ${saida}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(principal(process.argv.slice(2)));
