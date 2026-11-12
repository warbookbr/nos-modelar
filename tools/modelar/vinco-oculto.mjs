#!/usr/bin/env node
/* vinco-oculto.mjs — acha na superfície de subdivisão o vinco e o chanfro que a receita não declarou, e desenha onde estão.
 *
 * POR QUE ELE EXISTE. A faixa ondulada em y = 39 da peça dos tubos fatiados na horizontal (a costura onde a parede vertical encontra o fundo do tubo
 * deitado) e a aba da técnica de hoje passam pela ondulação (que mede calombo contra uma versão suavizada), pela dobra (diedro abaixo de 120 graus) e
 * pela face virada (mais de 90 graus): nenhuma delas diz "há uma linha viva aqui que ninguém pediu". Esta régua olha a forma dessa linha.
 *
 * COMO MEDE. Sobre as mesmas superfícies de `dobra-da-superficie.mjs`, em cada aresta de duas faces fora de vinco declarado o ângulo é o entre as
 * normais das faces. Uma CRISTA é a aresta em que esse ângulo é de pelo menos `anguloMinimoGraus` e passa em `saltoGraus` o das arestas paralelas
 * dos dois lados (nos quadriláteros da malha, as arestas opostas): o máximo local, que a superfície lisa não tem e que a costura ou o vinco têm; a
 * aresta com `anguloForteGraus` ou mais é crista de qualquer jeito (a aba fina é uma faixa de arestas fortes lado a lado, sem máximo local). As
 * cristas que se tocam formam uma CADEIA, que conta quando tem `arestasMinimas` arestas e `comprimentoMinimoMm`, ou, se o ângulo médio é forte,
 * `arestasMinimasFortes` arestas e `comprimentoMinimoForteMm`. Um VINCO NÃO DECLARADO é uma cadeia; um
 * CHANFRO NÃO DECLARADO é um par de cadeias paralelas (direções com cosseno de pelo menos `paralelismo`, comprimentos com razão de pelo menos `razao`)
 * a no máximo `larguraMaximaMm` uma da outra, que ladeiam uma faixa estreita. Cada achado leva a parte, a posição, o comprimento, o ângulo médio e,
 * no chanfro, a largura. `desenharAchados` pinta a malha em cinza e os achados em cor (vinco em vermelho, chanfro em laranja), numa vista ortográfica,
 * sem passar pela bancada, que não tem destaque por aresta.
 *
 * Mesma receita, mesma saída. Não é gate: a pessoa decide o limiar e onde ligá-la.
 *
 *   node tools/modelar/vinco-oculto.mjs <peça> [--angulo-minimo=12] [--salto=4] [--comprimento-minimo=80] [--imagem=<png>] [--vista=iso|frontal|direita|superior] */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { aceitasDaReceita, extensaoDaCadeia, separarAceitos } from '../../src/autoria/dobras-aceitas.js';
import { superficiesDaReceita } from './dobra-da-superficie.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const PADROES = Object.freeze({
  anguloMinimoGraus: 12, saltoGraus: 4, arestasMinimas: 12, comprimentoMinimoMm: 80, larguraMaximaMm: 20, paralelismo: 0.9, razao: 0.5,
  anguloForteGraus: 45, arestasMinimasFortes: 2, comprimentoMinimoForteMm: 3,
});
const MM = 1000;
const arred = (x, casas = 2) => { const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const newell = (pts) => {
  const n = [0, 0, 0];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k]; const b = pts[(k + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
};

/** vincoOcultoDaSuperficie(sup, opcoes) -> { vincos, chanfros, arestasCrista } */
export function vincoOcultoDaSuperficie(sup, opcoes = {}) {
  const o = { ...PADROES, ...opcoes };
  const V = sup.vertices; const F = sup.faces; const nV = V.length;
  const chave = (a, b) => (a < b ? a * nV + b : b * nV + a);
  const declarada = new Set(sup.vincos.map(([a, b]) => chave(a, b)));
  const arestas = new Map();
  F.forEach((f, fi) => f.forEach((a, k) => {
    const b = f[(k + 1) % f.length]; const c = chave(a, b);
    if (!arestas.has(c)) arestas.set(c, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
    arestas.get(c).faces.push(fi);
  }));
  const nf = F.map((f) => newell(f.map((v) => V[v])));
  const mod = nf.map((n) => Math.hypot(...n));
  const angulo = (f, g) => {
    if (mod[f] < 1e-18 || mod[g] < 1e-18) return 0;
    const c = (nf[f][0] * nf[g][0] + nf[f][1] * nf[g][1] + nf[f][2] * nf[g][2]) / (mod[f] * mod[g]);
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  };
  const turno = new Map();
  for (const [c, e] of arestas) if (!declarada.has(c) && e.faces.length === 2) turno.set(c, angulo(e.faces[0], e.faces[1]));
  /* a aresta oposta, em cada quadrilátero que toca a aresta: a paralela do outro lado dele */
  const opostas = (e) => e.faces.map((fi) => {
    const fv = F[fi]; if (fv.length !== 4) return 0;
    const ka = fv.indexOf(e.a); const kb = fv.indexOf(e.b); const k = (ka + 1) % 4 === kb ? ka : kb;
    return turno.get(chave(fv[(k + 2) % 4], fv[(k + 3) % 4])) ?? 0;
  });
  const cristas = [];
  for (const [c, e] of [...arestas].sort((x, y) => x[0] - y[0])) {
    const t = turno.get(c);
    if (t === undefined || t < o.anguloMinimoGraus) continue;
    if (t >= o.anguloForteGraus || t - Math.max(0, ...opostas(e)) >= o.saltoGraus) cristas.push({ e, t });
  }
  /* as cristas que se tocam: uma cadeia */
  const porVertice = new Map();
  cristas.forEach((x, k) => { for (const v of [x.e.a, x.e.b]) { if (!porVertice.has(v)) porVertice.set(v, []); porVertice.get(v).push(k); } });
  const visto = new Uint8Array(cristas.length);
  const cadeias = [];
  for (let k0 = 0; k0 < cristas.length; k0++) {
    if (visto[k0]) continue;
    const fila = [k0]; visto[k0] = 1;
    for (let q = 0; q < fila.length; q++) for (const v of [cristas[fila[q]].e.a, cristas[fila[q]].e.b]) for (const k of porVertice.get(v)) if (!visto[k]) { visto[k] = 1; fila.push(k); }
    const itens = fila.map((k) => cristas[k]);
    const comprimento = itens.reduce((s, x) => s + dist(V[x.e.a], V[x.e.b]), 0) * MM;
    const media = itens.reduce((q, x) => q + x.t, 0) / itens.length;
    const longa = itens.length >= o.arestasMinimas && comprimento >= o.comprimentoMinimoMm;
    const forte = media >= o.anguloForteGraus && itens.length >= o.arestasMinimasFortes && comprimento >= o.comprimentoMinimoForteMm;
    if (!longa && !forte) continue;
    const verts = [...new Set(itens.flatMap((x) => [x.e.a, x.e.b]))];
    const centro = [0, 1, 2].map((j) => verts.reduce((s, v) => s + V[v][j], 0) / verts.length);
    const partes = new Set(); for (const v of verts) for (const p of sup.partes[v]) partes.add(p);
    /* a direção: o eixo maior das pontas da cadeia (a diagonal da caixa dos vértices) */
    const min = [0, 1, 2].map((j) => Math.min(...verts.map((v) => V[v][j]))); const max = [0, 1, 2].map((j) => Math.max(...verts.map((v) => V[v][j])));
    const diag = max.map((x, j) => x - min[j]); const ld = Math.hypot(...diag) || 1;
    cadeias.push({
      itens, verts, comprimento, centro, direcao: diag.map((x) => x / ld),
      parte: [...partes].sort().join('+') || null, anguloMedio: itens.reduce((s, x) => s + x.t, 0) / itens.length,
    });
  }
  const resumo = (c, tipo, largura = null) => ({
    tipo, parte: c.parte, posicaoMm: c.centro.map((x) => arred(x * MM, 1)), comprimentoMm: arred(c.comprimento, 1), anguloMedioGraus: arred(c.anguloMedio, 1),
    ...(largura === null ? {} : { larguraMm: arred(largura, 1) }), arestas: c.itens.length, ...extensaoDaCadeia(c.verts.map((v) => V[v])),
  });
  /* o chanfro: duas cadeias paralelas, de tamanho parecido e perto uma da outra */
  const emPar = new Set(); const chanfros = [];
  const distanciaMediana = (A, B) => {
    const ds = A.verts.map((v) => Math.min(...B.verts.map((w) => dist(V[v], V[w])))).sort((x, y) => x - y);
    return ds[Math.floor(ds.length / 2)] * MM;
  };
  for (let i = 0; i < cadeias.length; i++) for (let j = i + 1; j < cadeias.length; j++) {
    const A = cadeias[i]; const B = cadeias[j];
    const par = Math.abs(A.direcao[0] * B.direcao[0] + A.direcao[1] * B.direcao[1] + A.direcao[2] * B.direcao[2]);
    if (par < o.paralelismo || Math.min(A.comprimento, B.comprimento) / Math.max(A.comprimento, B.comprimento) < o.razao) continue;
    const w = Math.max(distanciaMediana(A, B), distanciaMediana(B, A));
    if (w > o.larguraMaximaMm || w < 1e-6) continue;
    emPar.add(i); emPar.add(j);
    chanfros.push({ ...resumo({ ...A, verts: [...A.verts, ...B.verts], comprimento: (A.comprimento + B.comprimento) / 2, anguloMedio: (A.anguloMedio + B.anguloMedio) / 2, centro: A.centro.map((x, k) => (x + B.centro[k]) / 2), parte: A.parte }, 'chanfro', w), cadeias: [i, j] });
  }
  const vincos = cadeias.map((c, i) => ({ c, i })).filter(({ i }) => !emPar.has(i)).map(({ c }) => resumo(c, 'vinco'));
  const ordem = (x, y) => y.comprimentoMm - x.comprimentoMm || x.posicaoMm[0] - y.posicaoMm[0] || x.posicaoMm[1] - y.posicaoMm[1] || x.posicaoMm[2] - y.posicaoMm[2];
  vincos.sort(ordem); chanfros.sort(ordem);
  return { vincos, chanfros, arestasCrista: cristas.length, _cadeias: cadeias, segmentos: { vinco: cadeias.filter((_, i) => !emPar.has(i)).flatMap((c) => c.itens.map((x) => [V[x.e.a], V[x.e.b]])), chanfro: cadeias.filter((_, i) => emPar.has(i)).flatMap((c) => c.itens.map((x) => [V[x.e.a], V[x.e.b]])) } };
}

/** vincoOcultoDaReceita(receita, opcoes, executada?) -> { opcoes, superficies, vincos, chanfros, aceitos }; o achado que `PLANO.dobrasAceitas` cobre sai de `vincos` e `chanfros`
 *  e entra em `aceitos`, com o motivo. `executada` é o resultado de `executarReceita`, quando quem chama já o tem. */
export function vincoOcultoDaReceita(receita, opcoes = {}, executada = null) {
  const o = { ...PADROES, ...opcoes };
  const aceitas = aceitasDaReceita(receita);
  const superficies = superficiesDaReceita(receita, executada).map((sup) => {
    const { segmentos, _cadeias, ...r } = vincoOcultoDaSuperficie(sup, o);
    const v = separarAceitos(aceitas, r.vincos); const c = separarAceitos(aceitas, r.chanfros);
    return { passo: sup.passo, ...r, vincos: v.restantes, chanfros: c.restantes, aceitos: [...v.aceitos, ...c.aceitos], _sup: sup, _segmentos: segmentos };
  });
  return {
    opcoes: o,
    superficies: superficies.map(({ _sup, _segmentos, ...r }) => r),
    vincos: superficies.reduce((s, x) => s + x.vincos.length, 0),
    chanfros: superficies.reduce((s, x) => s + x.chanfros.length, 0),
    aceitos: superficies.reduce((s, x) => s + x.aceitos.length, 0),
    _desenho: superficies.map((x) => ({ sup: x._sup, segmentos: x._segmentos })),
  };
}

export function textoDoAchado(a) {
  const n = (x) => String(x).replace('.', ',');
  return `${a.tipo} não declarado na parte ${a.parte ?? 'sem parte'}, em [${a.posicaoMm.join('; ')}] mm: ${n(a.comprimentoMm)} mm de comprimento, ângulo médio de ${n(a.anguloMedioGraus)} graus${a.larguraMm === undefined ? '' : `, largura de ${n(a.larguraMm)} mm`}${a.pontasMm ? `, de [${a.pontasMm[0].join('; ')}] a [${a.pontasMm[1].join('; ')}] mm` : ''}`;
}

/* ---------- a imagem: a malha em cinza e os achados em cor, numa vista ortográfica ---------- */
const VISTAS = { iso: [35, 25], frontal: [0, 0], direita: [90, 0], superior: [0, 89], inferior: [0, -89] };

/** desenharAchados(desenho, { vista, largura, altura }) -> PNG (pngjs) */
export function desenharAchados(desenho, { vista = 'iso', largura = 1100, altura = 800 } = {}) {
  const [yaw, pitch] = VISTAS[vista] ?? VISTAS.iso;
  const ya = (yaw * Math.PI) / 180; const pa = (pitch * Math.PI) / 180;
  const girar = (p) => {
    const x = p[0] * MM; const y = p[1] * MM; const z = p[2] * MM;
    const x1 = x * Math.cos(ya) - z * Math.sin(ya); const z1 = x * Math.sin(ya) + z * Math.cos(ya);
    const y2 = y * Math.cos(pa) - z1 * Math.sin(pa); const z2 = y * Math.sin(pa) + z1 * Math.cos(pa);
    return [x1, y2, z2];
  };
  const triangulos = []; const segs = [];
  for (const { sup, segmentos } of desenho) {
    for (const f of sup.faces) {
      const q = f.map((v) => girar(sup.vertices[v]));
      for (let k = 1; k + 1 < q.length; k++) triangulos.push([q[0], q[k], q[k + 1]]);
    }
    for (const tipo of ['vinco', 'chanfro']) for (const [a, b] of segmentos[tipo]) segs.push({ tipo, a: girar(a), b: girar(b) });
  }
  const todos = triangulos.flat();
  if (!todos.length) return new PNG({ width: largura, height: altura });
  const min = [Infinity, Infinity]; const max = [-Infinity, -Infinity];
  for (const p of todos) for (let j = 0; j < 2; j++) { if (p[j] < min[j]) min[j] = p[j]; if (p[j] > max[j]) max[j] = p[j]; }
  const escala = 0.86 * Math.min(largura / (max[0] - min[0] || 1), altura / (max[1] - min[1] || 1));
  const px = (p) => [(p[0] - (min[0] + max[0]) / 2) * escala + largura / 2, altura / 2 - (p[1] - (min[1] + max[1]) / 2) * escala, p[2]];
  const img = new PNG({ width: largura, height: altura });
  const prof = new Float64Array(largura * altura).fill(-Infinity);
  for (let i = 0; i < largura * altura; i++) { img.data[4 * i] = 241; img.data[4 * i + 1] = 244; img.data[4 * i + 2] = 243; img.data[4 * i + 3] = 255; }
  const luz = [0.35, 0.6, 0.72]; const lm = Math.hypot(...luz);
  for (const t of triangulos) {
    const [a, b, c] = t.map(px);
    const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const nm = Math.hypot(...n) || 1;
    const sombra = 0.45 + 0.5 * Math.abs((n[0] * luz[0] - n[1] * luz[1] + n[2] * luz[2]) / (nm * lm));
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))); const x1 = Math.min(largura - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))); const y1 = Math.min(altura - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const l1 = ((b[1] - c[1]) * (x + 0.5 - c[0]) + (c[0] - b[0]) * (y + 0.5 - c[1])) / den;
      const l2 = ((c[1] - a[1]) * (x + 0.5 - c[0]) + (a[0] - c[0]) * (y + 0.5 - c[1])) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const z = l1 * a[2] + l2 * b[2] + l3 * c[2];
      const i = y * largura + x;
      if (z <= prof[i]) continue;
      prof[i] = z;
      img.data[4 * i] = Math.round(150 * sombra); img.data[4 * i + 1] = Math.round(160 * sombra); img.data[4 * i + 2] = Math.round(155 * sombra);
    }
  }
  const cor = { vinco: [220, 30, 30], chanfro: [245, 140, 0] };
  for (const s of segs) {
    const a = px(s.a); const b = px(s.b);
    const passos = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5));
    for (let k = 0; k <= passos; k++) {
      const u = k / passos; const x = a[0] + (b[0] - a[0]) * u; const y = a[1] + (b[1] - a[1]) * u; const z = a[2] + (b[2] - a[2]) * u;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const xi = Math.round(x) + dx; const yi = Math.round(y) + dy;
        if (xi < 0 || yi < 0 || xi >= largura || yi >= altura) continue;
        const i = yi * largura + xi;
        if (z < prof[i] - 6) continue;
        img.data[4 * i] = cor[s.tipo][0]; img.data[4 * i + 1] = cor[s.tipo][1]; img.data[4 * i + 2] = cor[s.tipo][2];
      }
    }
  }
  return img;
}

function lerOpcoes(args) {
  const nomes = { 'angulo-minimo': 'anguloMinimoGraus', salto: 'saltoGraus', 'comprimento-minimo': 'comprimentoMinimoMm', 'largura-maxima': 'larguraMaximaMm' };
  const o = {}; let imagem = null; let vista = 'iso';
  for (const a of args) {
    const m = /^--([a-z-]+)=(.+)$/.exec(a);
    if (!m) throw new Error(`argumento desconhecido: ${a}`);
    if (m[1] === 'imagem') imagem = m[2];
    else if (m[1] === 'vista') vista = m[2];
    else if (nomes[m[1]] && Number.isFinite(Number(m[2]))) o[nomes[m[1]]] = Number(m[2]);
    else throw new Error(`argumento desconhecido: ${a}`);
  }
  return { o, imagem, vista };
}

async function principal(argv) {
  const [alvo, ...resto] = argv.slice(2);
  if (!alvo) { process.stderr.write('uso: node tools/modelar/vinco-oculto.mjs <peça> [--angulo-minimo=12] [--salto=4] [--comprimento-minimo=80] [--imagem=<png>] [--vista=iso]\n'); return 2; }
  const caminho = resolverCaminhoReceita(alvo);
  if (!caminho) { process.stderr.write(`vinco-oculto: não achei a receita '${alvo}'.\n`); return 2; }
  const { o, imagem, vista } = lerOpcoes(resto);
  const r = vincoOcultoDaReceita(receitaDoModulo(await importarReceita(caminho)), o);
  const { _desenho, ...saida } = r;
  if (imagem) writeFileSync(imagem, PNG.sync.write(desenharAchados(_desenho, { vista })));
  process.stdout.write(`${JSON.stringify({ peca: alvo, ...saida }, null, 2)}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => { process.stderr.write(`${erro.message}\n`); process.exitCode = 1; });
}
