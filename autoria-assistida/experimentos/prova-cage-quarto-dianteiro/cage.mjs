#!/usr/bin/env node
/* cage.mjs — formato `mecanifica.cage-quad@1` e seu validador, conforme
   docs/mecanifica/CHASSI-P1-CONTRATO-DA-CAGE.md. Privado e descartável: é a
   prova P2, não o núcleo.

   O validador recusa em vez de avisar. Cage que passa aqui é cage que a
   subdivisão pode consumir sem checar de novo. */

import { topologia } from './subdividir.mjs';

export const FORMATO_CAGE = 'mecanifica.cage-quad@1';
const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export class ErroDeCage extends Error {}

/* Espelha a meia carroceria em x. Vértice na costura (x ≈ 0) não é duplicado —
   duplicar criaria aresta de borda no plano de simetria e a superfície abriria
   uma fenda no meio do carro. */
export function espelhar(cage, { plano = 'x', tolerancia = 1e-6 } = {}) {
  const eixo = { x: 0, y: 1, z: 2 }[plano];
  const V = new Map(cage.V);
  const F = new Map(cage.F);
  const vincos = new Map(cage.vincos ?? []);
  const proximoV = Math.max(...V.keys()) + 1;
  const proximoF = Math.max(...F.keys()) + 1;

  const par = new Map();
  let n = 0;
  for (const [id, p] of [...cage.V.entries()].sort((a, b) => a[0] - b[0])) {
    if (Math.abs(p[eixo]) <= tolerancia) { par.set(id, id); continue; }
    const novo = proximoV + n;
    n += 1;
    const q = p.slice();
    q[eixo] = -q[eixo];
    V.set(novo, q);
    par.set(id, novo);
  }

  let m = 0;
  for (const f of [...cage.F.values()].sort((a, b) => a.id - b.id)) {
    const id = proximoF + m;
    m += 1;
    /* ordem invertida: espelhar sem inverter deixa a face virada para dentro */
    F.set(id, { id, vs: f.vs.map((v) => par.get(v)).reverse(), parte: f.parte });
  }
  for (const [k, s] of [...(cage.vincos ?? new Map()).entries()].sort()) {
    const [a, b] = k.split('|').map(Number);
    vincos.set(chave(par.get(a), par.get(b)), s);
  }
  return { ...cage, V, F, vincos, espelhada: true };
}

/* Validação. Cada regra vem do contrato de P1 e diz qual. */
export function validarCage(cage) {
  const problemas = [];
  const erro = (regra, texto) => problemas.push({ regra, texto });

  if (!cage || !(cage.V instanceof Map) || !(cage.F instanceof Map)) {
    return { problemas: [{ regra: 'formato', texto: 'cage precisa de V e F como Map' }], medidas: null };
  }

  /* P1 §2: só quadriláteros, e é erro, não aviso. */
  for (const f of [...cage.F.values()].sort((a, b) => a.id - b.id)) {
    if (!Array.isArray(f.vs) || f.vs.length !== 4) {
      erro('quad', `face ${f.id} tem ${f.vs?.length ?? 0} lados; a cage só aceita quadrilátero`);
      continue;
    }
    if (new Set(f.vs).size !== 4) erro('quad', `face ${f.id} repete vértice`);
    for (const v of f.vs) if (!cage.V.has(v)) erro('vertice', `face ${f.id} cita vértice ${v} inexistente`);
  }

  const faces = [...cage.F.values()].filter((f) => Array.isArray(f.vs) && f.vs.length === 4);
  const { arestas, arestasDoVertice } = topologia(faces);

  /* P1 §2: aresta é derivada; vinco só existe sobre aresta que existe. */
  for (const [k, s] of [...(cage.vincos ?? new Map()).entries()].sort()) {
    if (!arestas.has(k)) erro('vinco', `vinco declarado na aresta ${k}, que não existe na cage`);
    if (!(typeof s === 'number') || s < 0 || s > 3) erro('vinco', `nitidez ${s} na aresta ${k} fora de [0, 3]`);
  }

  /* P1 §3: loop é caminho de vértices, e cada par consecutivo precisa ser aresta. */
  for (const [nome, loop] of Object.entries(cage.loops ?? {})) {
    const vs = loop.v ?? [];
    if (vs.length < 2) { erro('loop', `loop '${nome}' tem menos de dois vértices`); continue; }
    const pares = loop.fechado ? vs.length : vs.length - 1;
    for (let i = 0; i < pares; i += 1) {
      const a = vs[i];
      const b = vs[(i + 1) % vs.length];
      if (!cage.V.has(a) || !cage.V.has(b)) { erro('loop', `loop '${nome}' cita vértice inexistente`); continue; }
      if (!arestas.has(chave(a, b))) erro('loop', `loop '${nome}' salta de ${a} para ${b}, que não são aresta — loop é caminho contínuo`);
    }
  }

  /* P1 §4: seção é conferência. Projeta os vértices da estação e mede o desvio
     contra o contorno declarado. */
  const secoes = [];
  for (const s of cage.secoes ?? []) {
    const tol = s.tolerancia ?? 8;
    const naEstacao = [...cage.V.entries()]
      .filter(([, p]) => Math.abs(p[2] - s.z) <= (s.janela ?? 1))
      .map(([id, p]) => ({ id, xy: [p[0], p[1]] }));
    if (naEstacao.length === 0) { erro('secao', `nenhum vértice na estação z = ${s.z}`); continue; }
    let pior = { id: null, desvio: 0 };
    for (const v of naEstacao) {
      const d = distanciaAoContorno(v.xy, s.contorno);
      if (d > pior.desvio) pior = { id: v.id, desvio: d };
    }
    secoes.push({ z: s.z, vertices: naEstacao.length, piorDesvio: Number(pior.desvio.toFixed(2)), vertice: pior.id, tolerancia: tol });
    if (pior.desvio > tol) erro('secao', `estação z = ${s.z}: vértice ${pior.id} a ${pior.desvio.toFixed(1)} mm do contorno, tolerância ${tol}`);
  }

  /* Orçamento de P0/P1: BLOCO por passo e teto do quarto dianteiro. */
  const medidas = {
    vertices: cage.V.size,
    faces: cage.F.size,
    arestas: arestas.size,
    bordas: [...arestas.values()].filter((e) => e.faces.length === 1).length,
    vincos: (cage.vincos ?? new Map()).size,
    loops: Object.keys(cage.loops ?? {}).length,
    extraordinarios: [...arestasDoVertice.entries()].filter(([, ks]) => ks.size !== 4).length,
    secoes,
  };
  if (cage.tetoPorPasso !== false) {
    if (medidas.vertices > 900) erro('bloco', `${medidas.vertices} vértices num passo; o limite de P1 é 900`);
    if (medidas.faces > 900) erro('bloco', `${medidas.faces} faces num passo; o limite de P1 é 900`);
  }

  /* Aresta com mais de duas faces não é superfície: é não-manifold. */
  for (const [k, e] of arestas) {
    if (e.faces.length > 2) erro('manifold', `aresta ${k} tem ${e.faces.length} faces; a pele precisa ser manifold`);
  }

  return { problemas, medidas };
}

/* Distância de um ponto ao contorno poligonal, em 2D. */
function distanciaAoContorno(p, contorno) {
  let melhor = Infinity;
  for (let i = 0; i < contorno.length; i += 1) {
    const a = contorno[i];
    const b = contorno[(i + 1) % contorno.length];
    const vx = b[0] - a[0]; const vy = b[1] - a[1];
    const wx = p[0] - a[0]; const wy = p[1] - a[1];
    const ll = vx * vx + vy * vy;
    const t = ll === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / ll));
    const d = Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t));
    if (d < melhor) melhor = d;
  }
  return melhor;
}

export function exigirCageValida(cage) {
  const { problemas, medidas } = validarCage(cage);
  if (problemas.length) {
    throw new ErroDeCage(`cage inválida — ${problemas.length} problema(s):\n`
      + problemas.map((p) => `  [${p.regra}] ${p.texto}`).join('\n'));
  }
  return medidas;
}

export function imprimirMedidas(m) {
  const L = [
    `  ${m.vertices} vértices, ${m.faces} faces, ${m.arestas} arestas`,
    `  ${m.bordas} aresta(s) de borda, ${m.vincos} vinco(s), ${m.loops} loop(s) nomeado(s)`,
    `  ${m.extraordinarios} ponto(s) extraordinário(s) na cage`,
  ];
  for (const s of m.secoes) {
    L.push(`  seção z=${s.z}: ${s.vertices} vértice(s), pior desvio ${s.piorDesvio} mm (tol ${s.tolerancia})`);
  }
  return L.join('\n');
}
