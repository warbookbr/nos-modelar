#!/usr/bin/env node
/* compilar.mjs — compila a cage do quarto dianteiro, mede e desenha. É o passo
   Q4 da prova P2: nada aqui vira peça publicada. */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirQuartoDianteiro, ALVO } from './quarto-dianteiro.mjs';
import { validarCage, imprimirMedidas, espelhar } from './cage.mjs';
import { subdividir, malhaCanonica, topologia } from './subdividir.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'evidencias');

/* Pontos extraordinários que IMPORTAM: os do interior. Vértice de borda tem
   valência diferente de 4 por definição, e P0 limita o que a reflexão denuncia,
   não o que a topologia obriga. */
export function extraordinariosInternos(malha) {
  const { arestas, arestasDoVertice } = topologia([...malha.F.values()]);
  const naBorda = new Set();
  for (const e of arestas.values()) if (e.faces.length === 1) { naBorda.add(e.a); naBorda.add(e.b); }
  const fora = [];
  for (const [v, ks] of [...arestasDoVertice.entries()].sort((a, b) => a[0] - b[0])) {
    if (naBorda.has(v)) continue;
    if (ks.size !== 4) fora.push({ vertice: v, valencia: ks.size });
  }
  return fora;
}

export function silhuetaLateral(malha, { passo = 25 } = {}) {
  const porZ = new Map();
  for (const p of malha.V.values()) {
    const k = Math.round(p[2] / passo) * passo;
    const atual = porZ.get(k);
    if (!atual) porZ.set(k, { min: p[1], max: p[1] });
    else { atual.min = Math.min(atual.min, p[1]); atual.max = Math.max(atual.max, p[1]); }
  }
  return [...porZ.entries()].sort((a, b) => a[0] - b[0]).map(([z, r]) => [z, r.max]);
}

export function medirCompilacao(cage, niveis) {
  const linhas = [];
  const resultados = [];
  for (const n of niveis) {
    const t0 = process.hrtime.bigint();
    const m = subdividir(cage, n);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const canon = malhaCanonica(m);
    const bytes = Buffer.byteLength(JSON.stringify(canon));
    const ext = extraordinariosInternos(m);
    resultados.push({ nivel: n, malha: m, faces: m.F.size, vertices: m.V.size, ms, bytes, extraordinarios: ext.length });
    linhas.push(`  nível ${n}: ${m.F.size} faces, ${m.V.size} vértices, `
      + `${(bytes / 1024).toFixed(0)} KB, ${ms.toFixed(1)} ms, `
      + `${ext.length} ponto(s) extraordinário(s) interno(s)`);
  }
  return { resultados, relato: linhas.join('\n') };
}

if (process.argv[1] && process.argv[1].endsWith('compilar.mjs')) {
  const cage = construirQuartoDianteiro();
  const { problemas, medidas } = validarCage(cage);
  console.log('CAGE (meia carroceria, x >= 0)');
  console.log(imprimirMedidas(medidas));
  if (problemas.length) {
    console.log(`  ALERTA ${problemas.length} problema(s):`);
    for (const p of problemas) console.log(`    [${p.regra}] ${p.texto}`);
    process.exitCode = 1;
  } else console.log('  sem problemas');

  const inteira = espelhar(cage);
  const vi = validarCage({ ...inteira, secoes: [] });
  console.log('\nCAGE ESPELHADA');
  console.log(imprimirMedidas(vi.medidas));
  console.log(vi.problemas.length ? `  ALERTA ${vi.problemas.length} problema(s)` : '  sem problemas');

  console.log('\nCOMPILACAO');
  const { resultados, relato } = medirCompilacao(inteira, [1, 2]);
  console.log(relato);
  const cageFaces = inteira.F.size;
  for (const r of resultados) {
    console.log(`  razão cage→nível ${r.nivel}: ${(r.faces / cageFaces).toFixed(1)}×`);
  }

  console.log('\nCRITERIO DE DESCARTE (P0)');
  const quads = cage.F.size;
  console.log(`  quads da cage no quarto dianteiro: ${quads} — teto 800: ${quads <= 800 ? 'OK' : 'ESTOUROU'}`);
  console.log(`  arco aberto sem booleana: ${cage.arcoRemovido > 0 ? 'OK' : 'NAO'} (${cage.arcoRemovido} faces removidas por topologia)`);

  mkdirSync(SAIDA, { recursive: true });
  const nivel2 = resultados[resultados.length - 1];
  writeFileSync(path.join(SAIDA, 'malha-nivel-2.json'), `${JSON.stringify(malhaCanonica(nivel2.malha))}\n`);
  console.log(`\nevidência: ${path.relative(process.cwd(), path.join(SAIDA, 'malha-nivel-2.json'))}`);
}
