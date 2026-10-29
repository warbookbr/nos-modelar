#!/usr/bin/env node
/* gabarito-booleana.mjs — a booleana exata e o bevel do Blender como gabarito do núcleo, fatia 9 do plano de ajustes no núcleo.
 *
 * O núcleo calcula a booleana com a Manifold e divide o resultado em faces convexas; o Blender calcula a booleana exata e guarda
 * os polígonos como entram. Sobre as mesmas entradas, os dois dão o mesmo sólido, e a diferença que interessa é a divisão em
 * faces: quantas saem e quantas são finas. O gabarito mede o Blender (volume, área, faces, faces finas) e mede o núcleo do mesmo
 * jeito, lado a lado. É opcional: fica fora do núcleo, do CI e do `--completo`, e o teste que o usa se ignora sem o Blender.
 *
 *   MODELAR_BLENDER=<executável> node tools/blender/gabarito-booleana.mjs [--caso=booleana-colinear|bevel-facetado] [--json]
 *
 * Casos:
 *   booleana-colinear  caso 1 do plano: o perfil da perua menos dois cilindros de 8 lados (tools/modelar/fixtures/booleana-colinear).
 *                      Em 2026-10-20 (Blender 4.2.23) deu o mesmo volume e a mesma área a 3e-8 relativo, 29 faces e nenhuma fina,
 *                      contra 65 faces e duas finas do núcleo de então; o núcleo da fatia 10 dá 49 e nenhuma.
 *   bevel-facetado     caso da fatia 7: o prisma de 8 lados com a aresta 0 da tampa de cima arredondada em 0,05 com 2 segmentos. O
 *                      núcleo recusa (a lateral vizinha ficaria torta, 2,15e-2); o resultado do bevel do Blender, nesta máquina sem
 *                      Blender, ficou por registrar: rode o comando acima e anote no Andamento do plano.
 *
 * Sai com 2 sem MODELAR_BLENDER.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { doAmbiente } from '../ambiente.mjs';
import { nucleo } from '../../procedural/nucleo/entrada.js';
import { LIMITE_DE_FACE_FINA } from '../../procedural/nucleo/topologia.js';
import { lascasDoNeutro } from '../modelar/lasca.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Os vértices e as faces (por índice) de um neutro, na ordem do núcleo. */
export function malhaDoNeutro(neutro) {
  const ids = [...neutro.V.keys()];
  const indice = new Map(ids.map((id, k) => [id, k]));
  return { vertices: ids.map((id) => neutro.V.get(id)), faces: [...neutro.F.values()].map((f) => f.vs.map((v) => indice.get(v))) };
}

/** Volume, área, faces, vértices e faces finas de um neutro, com a mesma definição de face fina do Blender (área / maior aresta²). */
export function medidasDoNeutro(neutro, passos = []) {
  let volume = 0;
  let area = 0;
  for (const face of neutro.F.values()) {
    const p = face.vs.map((id) => neutro.V.get(id));
    for (let k = 1; k < p.length - 1; k += 1) {
      const [a, b, c] = [p[0], p[k], p[k + 1]];
      volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
    let [nx, ny, nz] = [0, 0, 0];
    for (let k = 0; k < p.length; k += 1) {
      const a = p[k];
      const b = p[(k + 1) % p.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    area += Math.hypot(nx, ny, nz) / 2;
  }
  const finas = lascasDoNeutro(neutro, { passos, limite: LIMITE_DE_FACE_FINA });
  return { volume, area, faces: neutro.F.size, vertices: neutro.V.size, facesFinas: finas.length };
}

/* ---------- os casos ---------- */

/** Caso 1: os operandos (o perfil extrudado e cada cilindro, sólidos fechados) e o neutro que o núcleo devolve. */
export async function casoBooleanaColinear() {
  const { default: receita } = await import('../modelar/fixtures/booleana-colinear/receita.js');
  const { executarReceita } = await import('../../src/autoria/executar-receita.js');
  const operandos = receita.PASSOS.filter(([op]) => op === 'extrusao' || op === 'cilindro')
    .map((passo) => malhaDoNeutro(nucleo([passo], {}, {}, {}, null, [])));
  const { entrada, neutro } = executarReceita(receita);
  return {
    entrada: { nome: 'booleana-colinear', operacao: 'subtrair', operandos },
    nucleo: { orfaos: neutro.orfaos ?? [], medidas: medidasDoNeutro(neutro, entrada.PASSOS) },
  };
}

const PRISMA = [['cilindro', { origemId: 1, raio: 0.5, altura: 1, lados: 8 }]];
const RAIO_DO_BEVEL = 0.05;
const SEGMENTOS_DO_BEVEL = 2;

/** Caso da fatia 7: a aresta 0 da tampa de cima do prisma de 8 lados. O núcleo recusa; o Blender arredonda. */
export function casoBevelFacetado() {
  const base = nucleo(PRISMA, {}, {});
  const malha = malhaDoNeutro(base);
  const alturaMaxima = Math.max(...malha.vertices.map((p) => p[1]));
  const tampa = [...base.F.values()].find((f) => f.vs.length === 8 && f.vs.every((v) => Math.abs(base.V.get(v)[1] - alturaMaxima) < 1e-9));
  const indice = new Map([...base.V.keys()].map((id, k) => [id, k]));
  const aresta = [indice.get(tampa.vs[0]), indice.get(tampa.vs[1])];
  const arredondado = nucleo([
    ...PRISMA,
    ['arredondarAresta', { origemId: 9, de: { op: 'cilindro', id: 1, tampa: 'topo' }, aresta: 0, raio: RAIO_DO_BEVEL, paineis: SEGMENTOS_DO_BEVEL }],
  ], {}, {});
  return {
    entrada: { nome: 'bevel-facetado', operandos: [malha], bevel: { arestas: [aresta], largura: RAIO_DO_BEVEL, segmentos: SEGMENTOS_DO_BEVEL } },
    nucleo: { orfaos: arredondado.orfaos, medidas: medidasDoNeutro(arredondado) },
  };
}

export const CASOS = { 'booleana-colinear': casoBooleanaColinear, 'bevel-facetado': casoBevelFacetado };

/** Roda o Blender sobre as entradas e devolve `{ nome: { volume, area, faces, vertices, facesFinas, razoesFinas } }`. */
export function rodarGabarito(blender, entradas) {
  const dir = mkdtempSync(join(tmpdir(), 'gabarito-booleana-'));
  try {
    const ent = join(dir, 'entrada.json');
    const sai = join(dir, 'saida.json');
    writeFileSync(ent, JSON.stringify(entradas));
    const r = spawnSync(blender, ['-b', '--factory-startup', '--python', join(AQUI, 'gabarito-booleana.py'), '--', ent, sai], { encoding: 'utf8', maxBuffer: 256 << 20 });
    if (r.status !== 0) throw new Error(`o Blender saiu com ${r.status}:\n${r.stdout.slice(-3000)}\n${r.stderr.slice(-3000)}`);
    return JSON.parse(readFileSync(sai, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const relativa = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-30);

function linha(nome, caso, blender) {
  const n = caso.nucleo.medidas;
  const partes = [`${nome}:`];
  if (caso.nucleo.orfaos.length) partes.push(`o núcleo recusa (${caso.nucleo.orfaos[0].motivo.slice(0, 90)})`);
  else partes.push(`núcleo ${n.faces} faces, ${n.facesFinas} fina(s), volume ${n.volume.toPrecision(10)}, área ${n.area.toPrecision(10)}`);
  partes.push(`Blender ${blender.faces} faces, ${blender.facesFinas} fina(s), volume ${blender.volume.toPrecision(10)}, área ${blender.area.toPrecision(10)}`);
  if (!caso.nucleo.orfaos.length) partes.push(`diferença relativa de volume ${relativa(n.volume, blender.volume).toExponential(1)}, de área ${relativa(n.area, blender.area).toExponential(1)}`);
  return partes.join(' · ');
}

export async function comoCLI(argv) {
  const blender = doAmbiente('BLENDER');
  if (!blender) { process.stderr.write('defina MODELAR_BLENDER com o caminho do executável do Blender\n'); return 2; }
  const pedido = argv.find((a) => a.startsWith('--caso='))?.slice('--caso='.length);
  const nomes = pedido ? [pedido] : Object.keys(CASOS);
  if (nomes.some((n) => !CASOS[n])) { process.stderr.write(`caso desconhecido; os casos são ${Object.keys(CASOS).join(', ')}\n`); return 2; }
  const casos = {};
  for (const nome of nomes) casos[nome] = await CASOS[nome]();
  const medidas = rodarGabarito(blender, nomes.map((n) => casos[n].entrada));
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(Object.fromEntries(nomes.map((n) => [n, { nucleo: casos[n].nucleo, blender: medidas[n] }])), null, 2)}\n`);
  } else {
    for (const n of nomes) process.stdout.write(`${linha(n, casos[n], medidas[n])}\n`);
  }
  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await comoCLI(process.argv.slice(2));
}
