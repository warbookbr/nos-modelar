#!/usr/bin/env node
/* subdividir.mjs — Catmull-Clark determinística com vinco semi-agudo, para a
   prova P2. Módulo PRIVADO e descartável: não é o núcleo, não vira operação
   registrada e não conhece carro. Entra cage de quads, sai malha por nível.

   Puro, sem dependência, sem estado global. A ordem de tudo é derivada de ids
   crescentes, nunca de ordem de inserção, para que a saída seja byte-idêntica
   entre execuções. */

const chaveAresta = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const parDaChave = (k) => k.split('|').map(Number);
const media = (pts) => {
  const s = pts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
  return [s[0] / pts.length, s[1] / pts.length, s[2] / pts.length];
};
const mistura = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t,
];

/* Topologia derivada da lista de faces: arestas, faces por aresta e por vértice.
   Tudo ordenado por id, porque ordem de inserção não é identidade. */
export function topologia(faces) {
  const arestas = new Map();      // chave -> { a, b, faces: [] }
  const facesDoVertice = new Map();
  const arestasDoVertice = new Map();

  for (const f of faces) {
    const n = f.vs.length;
    for (let i = 0; i < n; i += 1) {
      const a = f.vs[i];
      const b = f.vs[(i + 1) % n];
      const k = chaveAresta(a, b);
      if (!arestas.has(k)) arestas.set(k, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
      arestas.get(k).faces.push(f.id);
      if (!arestasDoVertice.has(a)) arestasDoVertice.set(a, new Set());
      if (!arestasDoVertice.has(b)) arestasDoVertice.set(b, new Set());
      arestasDoVertice.get(a).add(k);
      arestasDoVertice.get(b).add(k);
    }
    for (const v of f.vs) {
      if (!facesDoVertice.has(v)) facesDoVertice.set(v, new Set());
      facesDoVertice.get(v).add(f.id);
    }
  }
  for (const e of arestas.values()) e.faces.sort((x, y) => x - y);
  return { arestas, facesDoVertice, arestasDoVertice };
}

/* Nitidez efetiva de uma aresta. Borda — aresta com uma face só — é sempre
   aguda: sem isso o contorno de uma superfície aberta encolhe a cada nível. */
function nitidezDe(e, vincos) {
  if (e.faces.length < 2) return Infinity;
  return vincos.get(chaveAresta(e.a, e.b)) ?? 0;
}

/* Um nível de Catmull-Clark. Vinco semi-agudo pelo método de nitidez inteira
   com interpolação: nitidez >= 1 mantém a regra aguda e decrementa; entre 0 e 1
   interpola entre o resultado liso e o agudo. */
export function subdividirUmNivel(cage) {
  const { V, F, vincos = new Map() } = cage;
  const faces = [...F.values()].sort((a, b) => a.id - b.id);
  const { arestas, facesDoVertice, arestasDoVertice } = topologia(faces);

  /* Ponto de face. */
  const pontoDaFace = new Map();
  for (const f of faces) pontoDaFace.set(f.id, media(f.vs.map((v) => V.get(v))));

  /* Ponto de aresta: média dos quatro (liso) ou ponto médio (agudo). */
  const pontoDaAresta = new Map();
  for (const [k, e] of arestas) {
    const meio = media([V.get(e.a), V.get(e.b)]);
    const s = nitidezDe(e, vincos);
    if (s >= 1) { pontoDaAresta.set(k, meio); continue; }
    const liso = media([V.get(e.a), V.get(e.b), ...e.faces.map((fid) => pontoDaFace.get(fid))]);
    pontoDaAresta.set(k, s <= 0 ? liso : mistura(liso, meio, s));
  }

  /* Ponto de vértice. Vértice tocado por aresta aguda usa a regra de vinco:
     com duas agudas, a média das pontas; com três ou mais, o canto fica fixo. */
  const pontoDoVertice = new Map();
  for (const [v, p] of [...V.entries()].sort((a, b) => a[0] - b[0])) {
    const ks = [...(arestasDoVertice.get(v) ?? [])].sort();
    if (ks.length === 0) { pontoDoVertice.set(v, p); continue; }

    const agudas = ks.filter((k) => nitidezDe(arestas.get(k), vincos) >= 1);
    const maiorNitidez = Math.max(0, ...ks.map((k) => {
      const s = nitidezDe(arestas.get(k), vincos);
      return Number.isFinite(s) ? s : 1;
    }));

    const fs = [...(facesDoVertice.get(v) ?? [])].sort((a, b) => a - b);
    const n = ks.length;
    const F_ = media(fs.map((fid) => pontoDaFace.get(fid)));
    const R = media(ks.map((k) => {
      const e = arestas.get(k);
      return media([V.get(e.a), V.get(e.b)]);
    }));
    const liso = [
      (F_[0] + 2 * R[0] + (n - 3) * p[0]) / n,
      (F_[1] + 2 * R[1] + (n - 3) * p[1]) / n,
      (F_[2] + 2 * R[2] + (n - 3) * p[2]) / n,
    ];

    /* Canto fixo em dois casos. Três ou mais arestas agudas é canto de vinco.
       E valência 2 com as duas agudas é CANTO DE RETALHO: sem congelar, toda
       abertura perde a esquina a cada nível, e P0 exige retorno de borda no arco
       de roda e no vão envidraçado. Um vértice no meio de uma borda curva tem
       valência 3 ou mais e continua seguindo a regra de cordão, que é o que faz
       o contorno do arco suavizar em vez de virar polígono. */
    if (agudas.length >= 3 || (agudas.length === 2 && ks.length === 2)) {
      pontoDoVertice.set(v, p);
      continue;
    }
    if (agudas.length === 2) {
      const pontas = agudas.map((k) => {
        const e = arestas.get(k);
        return V.get(e.a === v ? e.b : e.a);
      });
      const cordao = [
        (pontas[0][0] + 6 * p[0] + pontas[1][0]) / 8,
        (pontas[0][1] + 6 * p[1] + pontas[1][1]) / 8,
        (pontas[0][2] + 6 * p[2] + pontas[1][2]) / 8,
      ];
      pontoDoVertice.set(v, maiorNitidez >= 1 ? cordao : mistura(liso, cordao, maiorNitidez));
      continue;
    }
    pontoDoVertice.set(v, liso);
  }

  /* Numeração do nível seguinte, derivada e ordenada: primeiro os pontos de
     vértice, depois os de aresta, depois os de face. Não é identidade
     persistida — é derivação válida dentro desta compilação, como P1 fixou. */
  const idsV = [...V.keys()].sort((a, b) => a - b);
  const idsA = [...arestas.keys()].sort();
  const novoV = new Map();
  const deVertice = new Map();
  const deAresta = new Map();
  const deFace = new Map();
  let proximo = 0;
  for (const v of idsV) { deVertice.set(v, proximo); novoV.set(proximo, pontoDoVertice.get(v)); proximo += 1; }
  for (const k of idsA) { deAresta.set(k, proximo); novoV.set(proximo, pontoDaAresta.get(k)); proximo += 1; }
  for (const f of faces) { deFace.set(f.id, proximo); novoV.set(proximo, pontoDaFace.get(f.id)); proximo += 1; }

  /* Cada face de n lados vira n quads. */
  const novoF = new Map();
  let idFace = 0;
  for (const f of faces) {
    const n = f.vs.length;
    for (let i = 0; i < n; i += 1) {
      const v = f.vs[i];
      const ant = f.vs[(i - 1 + n) % n];
      const prox = f.vs[(i + 1) % n];
      novoF.set(idFace, {
        id: idFace,
        vs: [
          deVertice.get(v),
          deAresta.get(chaveAresta(v, prox)),
          deFace.get(f.id),
          deAresta.get(chaveAresta(ant, v)),
        ],
        parte: f.parte,
      });
      idFace += 1;
    }
  }

  /* Vincos do nível seguinte: cada aresta aguda vira duas, com nitidez − 1. */
  const novosVincos = new Map();
  for (const [k, e] of arestas) {
    const s = nitidezDe(e, vincos);
    if (!Number.isFinite(s) || s <= 0) continue;
    const resto = Math.max(0, s - 1);
    if (resto === 0) continue;
    const m = deAresta.get(k);
    novosVincos.set(chaveAresta(deVertice.get(e.a), m), resto);
    novosVincos.set(chaveAresta(m, deVertice.get(e.b)), resto);
  }

  return { V: novoV, F: novoF, vincos: novosVincos };
}

export function subdividir(cage, niveis = 1) {
  let atual = { V: cage.V, F: cage.F, vincos: cage.vincos ?? new Map() };
  for (let i = 0; i < niveis; i += 1) atual = subdividirUmNivel(atual);
  return atual;
}

/* Forma canônica para comparação e replay: ids crescentes, número com precisão
   fixa. É contra isto que o determinismo é provado. */
export function malhaCanonica(malha, { casas = 6 } = {}) {
  const nn = (v) => Number(v.toFixed(casas));
  return {
    V: [...malha.V.entries()].sort((a, b) => a[0] - b[0]).map(([id, p]) => [id, nn(p[0]), nn(p[1]), nn(p[2])]),
    F: [...malha.F.values()].sort((a, b) => a.id - b.id).map((f) => (f.parte
      ? [f.id, f.vs.slice(), f.parte]
      : [f.id, f.vs.slice()])),
  };
}

/* Vértices de valência diferente de 4 — os pontos extraordinários que P0 limita. */
export function pontosExtraordinarios(malha) {
  const { arestasDoVertice } = topologia([...malha.F.values()]);
  const fora = [];
  for (const [v, ks] of [...arestasDoVertice.entries()].sort((a, b) => a[0] - b[0])) {
    if (ks.size !== 4) fora.push({ vertice: v, valencia: ks.size });
  }
  return fora;
}

export const utilitarios = { chaveAresta, parDaChave, media, mistura };
