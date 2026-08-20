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
/* Em que sentido a pele já percorre esta aresta. A fita de retorno tem de
   percorrê-la no sentido CONTRÁRIO, senão entra com a normal invertida — e
   normal invertida não dispara nada por si: o sintoma aparece longe, como
   diedro de 168° entre duas superfícies que na verdade fazem 12°. */
export function sentidoNaPele(F, a, b) {
  for (const f of F.values()) {
    const n = f.vs.length;
    for (let i = 0; i < n; i += 1) {
      if (f.vs[i] === a && f.vs[(i + 1) % n] === b) return 1;
      if (f.vs[i] === b && f.vs[(i + 1) % n] === a) return -1;
    }
  }
  return 0;
}

/* Fita de retorno de uma borda, já orientada contra a pele. */
export function fita(F, arestas, parceiro, parte, proximoId) {
  let idF = proximoId;
  const feitas = [];
  for (const [a, b] of arestas) {
    const [p, q] = sentidoNaPele(F, a, b) === 1 ? [b, a] : [a, b];
    feitas.push({ id: idF, vs: [p, q, parceiro.get(q), parceiro.get(p)], parte });
    idF += 1;
  }
  return { feitas, idF };
}

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
    /* `apenas` limita a conferência à pele externa. O retorno de borda é
       deslocado para dentro por construção, então cobrá-lo contra o contorno da
       seção reprovaria exatamente o que P0 mandou existir. */
    const permitido = s.apenas ? new Set(s.apenas) : null;
    const naEstacao = [...cage.V.entries()]
      .filter(([id, p]) => (!permitido || permitido.has(id)) && Math.abs(p[2] - s.z) <= (s.janela ?? 1))
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

  /* Orientação consistente: duas faces vizinhas percorrem a aresta comum em
     sentidos OPOSTOS. Sem esta regra uma região inteira pode entrar com a
     normal invertida e nada reclama — foi o que aconteceu com a fáscia
     dianteira, montada com os índices transpostos em relação à pele. O sintoma
     apareceu longe da causa: o diedro entre pele e fáscia lia 168°, que é 180
     menos os 12° reais da quina, e virou caça a facetamento inexistente. */
  const sentido = new Map();
  for (const f of faces) {
    const n = f.vs.length;
    for (let i = 0; i < n; i += 1) {
      const a = f.vs[i];
      const b = f.vs[(i + 1) % n];
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const dir = a < b ? 1 : -1;
      if (!sentido.has(k)) sentido.set(k, []);
      sentido.get(k).push({ face: f.id, dir });
    }
  }
  for (const [k, usos] of [...sentido.entries()].sort()) {
    if (usos.length !== 2) continue;
    if (usos[0].dir === usos[1].dir) {
      erro('orientacao', `faces ${usos[0].face} e ${usos[1].face} percorrem a aresta ${k} no mesmo sentido; uma delas está com a normal invertida`);
    }
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
