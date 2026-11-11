#!/usr/bin/env node
/* raio-da-aresta.mjs — mede o raio de cada aresta de caráter de uma peça, sobre a malha final.
 *
 * POR QUE ELE EXISTE. O raio de uma quina de lataria é a diferença entre a chapa que reflete uma faixa de luz e a que reflete uma
 * linha, e o critério do plano é o raio dentro de 20% do pedido. Nenhuma ferramenta o media: o ciclo 1 do sedã em alta definição
 * escreveu um script próprio, que dava duas respostas para a mesma malha (5,8 e 9,7 mm), porque o raio de um perfil que a
 * subdivisão dá não tem uma definição só. Aqui a definição é uma, e é a do núcleo (`raioDoFilete`, em `procedural/nucleo/apoio-do-vinco.js`,
 * a mesma que converte o raio pedido na distância das colunas de apoio): o arco de círculo tangente às duas faces que melhor cobre o
 * perfil entre os pontos de tangência.
 *
 * COMO MEDE. A malha final é cortada por planos perpendiculares à aresta, a cada `--cada` mm (50 por padrão), e em cada corte o
 * perfil é a polilinha da interseção a até `--janela` mm da aresta (40 por padrão), da pele que olha para o lado da normal das faces
 * da gaiola (a malha de espessura tem duas peles, e o raio pedido é o da de fora). O raio do corte é o do filete. Sai também, como
 * coluna secundária, o menor raio de curvatura do perfil (o círculo por três pontos seguidos): num arco as duas medidas coincidem, e a
 * que passa de `LIMITE_DA_DIVERGENCIA` de diferença diz que a quina não é arco (a rampa de uma subdivisão não é circular), e então o
 * raio do filete é o do arco que melhor a cobre, e não o da curva. O raio abaixo de `RAIO_DA_QUINA_VIVA_MM` é dito quina viva.
 *
 * QUAL ARESTA. Cada vinco nomeado dos passos `subdivisao` (a linha dos pontos da gaiola que ele cita); com `--aresta=x,y,z:x,y,z`, o
 * trecho entre dois pontos em mm; com `--automatico`, as cadeias de crista que `vinco:oculto` acha na superfície e que a receita não
 * declarou (só leitura dele). O raio pedido vem do campo `raio` (mm) do vinco, quando a receita ou o esboço o declaram, ou de
 * `--pedido=<nome>:<mm>`, repetível. Sai com 1 quando algum corte foge do pedido por mais de `--tolerancia` (fração, 0,2 por padrão).
 *
 * A ENTRADA é receita, esboço 2.0 (`--opcao`) ou montagem persistida, pelo resolvedor comum das ferramentas de medida.
 *
 *   node tools/modelar/raio-da-aresta.mjs <receita | esboço | montagem> [--opcao=<n>] [--vinco=<nome>] [--aresta=x,y,z:x,y,z] [--automatico]
 *        [--cada=50] [--janela=40] [--pedido=<nome>:<mm>]... [--tolerancia=0.2] [--json]
 *
 * Mesma entrada, mesma saída: nenhuma conta depende de relógio nem de acaso. */
import { pathToFileURL } from 'node:url';
import { raioDoFilete } from '../../procedural/nucleo/apoio-do-vinco.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';
import { ErroDeEntrada, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';
import { lerArgumentos } from './argumentos.mjs';

export const CADA_PADRAO_MM = 50;
export const JANELA_PADRAO_MM = 40;
export const TOLERANCIA_PADRAO = 0.2;
export const RAIO_DA_QUINA_VIVA_MM = 0.25;
export const LIMITE_DA_DIVERGENCIA = 0.25;
export const DISTANCIA_MAXIMA_DO_PERFIL_MM = 5;
export const ANGULO_MINIMO_DA_DOBRA_GRAUS = 2;
const PELE_MINIMA = 0.3;
const MM = 1000;

const arred = (x, casas = 2) => { if (x === null || x === undefined || !Number.isFinite(x)) return null; const f = 10 ** casas; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = norma(a); return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; };
const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

function newell(pts) {
  const n = [0, 0, 0];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k]; const b = pts[(k + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/* ---------- a malha e o corte ---------- */

/** A malha de um neutro (`{ V, F }`, em metro) pronta para cortar: por face, os cantos, a normal unitária e a caixa. */
export function prepararMalha(neutro) {
  const faces = [];
  for (const f of neutro.F.values()) {
    const pts = f.vs.map((id) => neutro.V.get(id));
    if (pts.length < 3 || pts.some((p) => !p)) continue;
    const n = unit(newell(pts));
    if (n[0] === 0 && n[1] === 0 && n[2] === 0) continue;
    faces.push({ pts, n, min: [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k]))), max: [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k]))) });
  }
  return { faces };
}

const chaveDoPonto = (p) => `${Math.round(p[0] * 1e9)},${Math.round(p[1] * 1e9)},${Math.round(p[2] * 1e9)}`;

/**
 * perfilNoCorte(malha, { q, t, janelaMm, pele }) corta a malha pelo plano que passa por `q` (metro) com normal `t` (a direção da aresta) e
 * devolve o perfil: `{ pontos2d, pontos3d, distanciaMm }`, a polilinha da interseção a até `janelaMm` de `q`, em mm no plano do corte,
 * ou null quando o corte não acha nada. `pele` é a normal para a qual a pele medida olha (as faces de normal oposta, a pele de dentro
 * da malha de espessura, ficam fora); sem ela entram todas, e vale a cadeia mais perto de `q`.
 */
export function perfilNoCorte(malha, { q, t, janelaMm = JANELA_PADRAO_MM, pele = null }) {
  const W = janelaMm / MM;
  const segmentos = [];
  for (const f of malha.faces) {
    let fora = false;
    for (let k = 0; k < 3; k++) if (f.max[k] < q[k] - W || f.min[k] > q[k] + W) { fora = true; break; }
    if (fora) continue;
    if (pele && dot(f.n, pele) < PELE_MINIMA) continue;
    const d = f.pts.map((p) => dot(sub(p, q), t) || 1e-12);
    const cruzam = [];
    for (let i = 0; i < f.pts.length; i++) {
      const j = (i + 1) % f.pts.length;
      if (d[i] * d[j] < 0) { const u = d[i] / (d[i] - d[j]); cruzam.push([0, 1, 2].map((k) => f.pts[i][k] + (f.pts[j][k] - f.pts[i][k]) * u)); }
    }
    if (cruzam.length !== 2) continue;
    const meio = [0, 1, 2].map((k) => (cruzam[0][k] + cruzam[1][k]) / 2);
    if (norma(sub(meio, q)) > W) continue;
    segmentos.push(cruzam);
  }
  if (!segmentos.length) return null;
  /* as cadeias: segmentos que dividem um ponto */
  const nos = new Map();
  segmentos.forEach((s, i) => s.forEach((p) => { const c = chaveDoPonto(p); if (!nos.has(c)) nos.set(c, []); nos.get(c).push(i); }));
  const componente = new Array(segmentos.length).fill(-1); let n = 0;
  for (let i = 0; i < segmentos.length; i++) {
    if (componente[i] >= 0) continue;
    const fila = [i]; componente[i] = n;
    for (let h = 0; h < fila.length; h++) for (const p of segmentos[fila[h]]) for (const j of nos.get(chaveDoPonto(p))) if (componente[j] < 0) { componente[j] = n; fila.push(j); }
    n++;
  }
  const distAoSegmento = (p, a, b) => {
    const ab = sub(b, a); const L = dot(ab, ab); const u = L > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / L)) : 0;
    return norma(sub(p, [a[0] + ab[0] * u, a[1] + ab[1] * u, a[2] + ab[2] * u]));
  };
  let melhor = -1; let dMelhor = Infinity;
  for (let c = 0; c < n; c++) {
    const dc = Math.min(...segmentos.map((s, i) => (componente[i] === c ? distAoSegmento(q, s[0], s[1]) : Infinity)));
    if (dc < dMelhor) { dMelhor = dc; melhor = c; }
  }
  const dela = segmentos.map((s, i) => ({ s, i })).filter(({ i }) => componente[i] === melhor).map(({ s }) => s);
  /* a polilinha: parte de uma ponta (ponto de um segmento só) e segue pelos segmentos ainda não usados */
  const lig = new Map();
  dela.forEach((s, i) => s.forEach((p) => { const c = chaveDoPonto(p); if (!lig.has(c)) lig.set(c, []); lig.get(c).push(i); }));
  const ponta = dela.flatMap((s) => s).find((p) => lig.get(chaveDoPonto(p)).length === 1) ?? dela[0][0];
  const usado = new Set(); const pontos3d = [ponta]; let atual = ponta;
  for (;;) {
    const i = (lig.get(chaveDoPonto(atual)) ?? []).find((k) => !usado.has(k));
    if (i === undefined) break;
    usado.add(i);
    const s = dela[i]; atual = chaveDoPonto(s[0]) === chaveDoPonto(atual) ? s[1] : s[0];
    pontos3d.push(atual);
  }
  if (pontos3d.length < 2) return null;
  const e1 = unit(sub(pontos3d[pontos3d.length - 1], pontos3d[0]));
  const e2 = cruz(t, e1);
  const pontos2d = pontos3d.map((p) => { const v = sub(p, q); return [dot(v, e1) * MM, dot(v, e2) * MM]; });
  return { pontos2d, pontos3d, distanciaMm: dMelhor * MM };
}

/* ---------- a medida do perfil ---------- */

/** O menor raio de curvatura de um perfil 2D (mm): o círculo por três pontos seguidos. Sai `{ raio, segmento }`, com `segmento` o menor dos dois lados do trio. */
export function menorRaioDeCurvatura(perfil) {
  let melhor = null;
  for (let i = 1; i + 1 < perfil.length; i++) {
    const a = perfil[i - 1]; const b = perfil[i]; const c = perfil[i + 1];
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1]); const bc = Math.hypot(c[0] - b[0], c[1] - b[1]); const ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
    const area2 = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    if (!(ab > 1e-9 && bc > 1e-9) || area2 / (ab * bc) < 1e-4) continue;
    const r = (ab * bc * ca) / (2 * area2);
    if (!melhor || r < melhor.raio) melhor = { raio: r, segmento: Math.min(ab, bc) };
  }
  return melhor;
}

/**
 * medirPerfil(perfil2d) -> `{ raioMm, curvaturaMm, divergencia, anguloGraus, natureza, erroMm, razaoDoErro, segmentoMm, motivo }`. `raioMm` é o do filete
 * (`raioDoFilete`, a definição do núcleo); `curvaturaMm` é o menor raio de curvatura do perfil, e `divergencia` a diferença relativa dos dois. `natureza`
 * é `arco` (as duas medidas concordam), `nao-arco` (divergem por mais de `LIMITE_DA_DIVERGENCIA`), `viva` (raio abaixo de `RAIO_DA_QUINA_VIVA_MM`),
 * `plana` (dobra de menos de `ANGULO_MINIMO_DA_DOBRA_GRAUS`, 2, sem raio que se leia) ou `sem-medida` (perfil curto demais ou que não sai das retas das faces).
 */
export function medirPerfil(perfil) {
  const f = raioDoFilete(perfil);
  const c = menorRaioDeCurvatura(perfil);
  /* a dobra de menos de 2 graus não tem raio que se leia: o filete de 0,3 grau dá milhares de mm e não diz nada da aresta */
  if (f.raio === null || f.raio === undefined || f.angulo < ANGULO_MINIMO_DA_DOBRA_GRAUS) {
    return { raioMm: null, curvaturaMm: arred(c?.raio ?? null), divergencia: null, anguloGraus: arred(f.angulo ?? null, 1), natureza: f.angulo === 0 || f.angulo < ANGULO_MINIMO_DA_DOBRA_GRAUS ? 'plana' : 'sem-medida', erroMm: null, razaoDoErro: null, segmentoMm: arred(c?.segmento ?? null), motivo: f.motivo ?? null };
  }
  const divergencia = c ? Math.abs(f.raio - c.raio) / Math.max(f.raio, c.raio) : null;
  const natureza = f.raio < RAIO_DA_QUINA_VIVA_MM ? 'viva' : divergencia !== null && divergencia > LIMITE_DA_DIVERGENCIA ? 'nao-arco' : 'arco';
  return { raioMm: arred(f.raio, 3), curvaturaMm: arred(c?.raio ?? null, 3), divergencia: arred(divergencia, 3), anguloGraus: arred(f.angulo, 1), natureza, erroMm: arred(f.erro, 4), razaoDoErro: arred(f.razaoDoErro, 3), segmentoMm: arred(c?.segmento ?? null, 3), motivo: null };
}

/* ---------- a aresta ---------- */

/** Os pontos de corte sobre a polilinha (em metro) de `pontos`, a cada `cadaMm` a partir de meio passo: `[{ s, q, t, segmento }]`, `s` em mm. */
export function amostrasDaLinha(pontos, cadaMm = CADA_PADRAO_MM) {
  const acc = [0];
  for (let i = 1; i < pontos.length; i++) acc.push(acc[i - 1] + norma(sub(pontos[i], pontos[i - 1])) * MM);
  const total = acc[acc.length - 1];
  const n = Math.max(1, Math.floor(total / cadaMm));
  const folga = (total - (n - 1) * cadaMm) / 2;
  const saida = [];
  for (let k = 0; k < n; k++) {
    const s = folga + k * cadaMm;
    let i = 0; while (i + 2 < acc.length && acc[i + 1] < s) i++;
    const seg = acc[i + 1] - acc[i]; const u = seg > 0 ? (s - acc[i]) / seg : 0;
    const a = pontos[i]; const b = pontos[i + 1];
    saida.push({ s, q: [0, 1, 2].map((j) => a[j] + (b[j] - a[j]) * u), t: unit(sub(b, a)), segmento: i });
  }
  return { amostras: saida, comprimentoMm: total };
}

/**
 * medirAresta(malha, linha, opcoes) mede o raio ao longo de uma aresta. `linha` é `{ nome, pontos, peles? }`: os pontos em metro e, por trecho da
 * polilinha, a normal da pele medida (ou null). Com `pedidoMm`, cada corte é comparado a ele (`tolerancia`, fração). Devolve os cortes e o resumo.
 */
export function medirAresta(malha, linha, { cadaMm = CADA_PADRAO_MM, janelaMm = JANELA_PADRAO_MM, pedidoMm = null, tolerancia = TOLERANCIA_PADRAO } = {}) {
  const { amostras, comprimentoMm } = amostrasDaLinha(linha.pontos, cadaMm);
  const cortes = amostras.map((a) => {
    const perfil = perfilNoCorte(malha, { q: a.q, t: a.t, janelaMm, pele: linha.peles?.[a.segmento] ?? null });
    const base = { posicaoMm: a.q.map((x) => arred(x * MM, 1)), sMm: arred(a.s, 1) };
    if (!perfil) return { ...base, raioMm: null, natureza: 'sem-corte', motivo: 'o plano do corte não toca a malha a menos da janela' };
    if (perfil.distanciaMm > DISTANCIA_MAXIMA_DO_PERFIL_MM) return { ...base, raioMm: null, natureza: 'sem-corte', motivo: `o perfil passa a ${arred(perfil.distanciaMm, 1)} mm da aresta (mais de ${DISTANCIA_MAXIMA_DO_PERFIL_MM} mm): a malha não está onde a gaiola diz` };
    const m = medirPerfil(perfil.pontos2d);
    const fora = pedidoMm !== null && m.natureza !== 'plana' && (m.raioMm === null || Math.abs(m.raioMm - pedidoMm) > tolerancia * pedidoMm);
    return { ...base, pontosDoPerfil: perfil.pontos2d.length, ...m, ...(pedidoMm !== null ? { desvioDoPedido: m.raioMm === null ? null : arred((m.raioMm - pedidoMm) / pedidoMm, 3), foraDoPedido: fora } : {}) };
  });
  const medidos = cortes.filter((c) => c.raioMm !== null);
  const raios = medidos.map((c) => c.raioMm); const curv = medidos.map((c) => c.curvaturaMm).filter((x) => x !== null);
  const alvo = pedidoMm ?? mediana(raios);
  const pior = medidos.length ? medidos.reduce((m, c) => (Math.abs(c.raioMm - alvo) > Math.abs(m.raioMm - alvo) ? c : m), medidos[0]) : null;
  const naturezas = {};
  for (const c of cortes) naturezas[c.natureza] = (naturezas[c.natureza] ?? 0) + 1;
  const angulos = medidos.map((c) => c.anguloGraus).filter((x) => x !== null);
  const foraDoPedido = pedidoMm === null ? null : cortes.filter((c) => c.foraDoPedido).length;
  return {
    nome: linha.nome, comprimentoMm: arred(comprimentoMm, 1), cortes: cortes.length, medidos: medidos.length,
    raioMm: { minimo: arred(Math.min(...raios)), mediano: arred(mediana(raios)), maximo: arred(Math.max(...raios)) },
    curvaturaMm: curv.length ? { minimo: arred(Math.min(...curv)), mediano: arred(mediana(curv)), maximo: arred(Math.max(...curv)) } : null,
    anguloDaDobraGraus: angulos.length ? { minimo: arred(Math.min(...angulos), 1), mediano: arred(mediana(angulos), 1), maximo: arred(Math.max(...angulos), 1) } : null,
    naturezas,
    piorDesvio: pior ? { posicaoMm: pior.posicaoMm, raioMm: pior.raioMm, referenciaMm: arred(alvo), diferenca: arred(pior.raioMm - alvo) } : null,
    ...(pedidoMm !== null ? { pedidoMm, tolerancia, foraDoPedido, semDobra: naturezas.plana ?? 0, sobPedido: foraDoPedido === 0 && medidos.length > 0 } : {}),
    porCorte: cortes,
  };
}

/* ---------- as arestas de uma receita ---------- */

const operacaoDe = (passo) => (Array.isArray(passo) ? passo[0] : passo?.op);
const argumentosDe = (passo) => (Array.isArray(passo) ? passo[1] ?? {} : passo ?? {});

/**
 * Os vincos nomeados dos passos `subdivisao` como linhas medíveis: `[{ nome, passo, pontos, peles, pedidoMm }]`, com os pontos da gaiola em metro, a normal média
 * das faces da gaiola de cada trecho (a pele medida) e o campo `raio` (mm) que o vinco declara, quando declara. O vinco de nitidez 0 entra como os demais.
 */
export function linhasDosVincos(entrada) {
  const dict = { ...entrada.PARAMS, ...entrada.TOPO };
  const { num } = criarResolverNumerico(dict);
  const vec = (a) => (typeof a === 'string' ? dict[a] : a).map(num);
  const linhas = [];
  (entrada.PASSOS ?? []).forEach((passo, i) => {
    const args = argumentosDe(passo);
    if (operacaoDe(passo) !== 'subdivisao' || !Array.isArray(args.vincos) || !args.vincos.length) return;
    const resolvida = gaiolaDoPasso(args, { vec, num });
    if (resolvida.erro) throw new ErroDeEntrada(`o passo ${i} (subdivisao) não resolve a gaiola: ${resolvida.erro[1]}`);
    const { gaiola, declarados } = resolvida;
    const indice = new Map(declarados.map((d, k) => [d, k]).filter(([d]) => typeof d === 'string'));
    const facesDaAresta = (a, b) => gaiola.faces.filter((f) => f.includes(a) && f.includes(b));
    for (const v of args.vincos) {
      if (!v || typeof v !== 'object' || !Array.isArray(v.pontos)) continue;
      const ids = v.pontos.map((p) => indice.get(p));
      if (ids.some((k) => k === undefined) || ids.length < 2) continue;
      const peles = [];
      for (let k = 0; k + 1 < ids.length; k++) {
        const fs = facesDaAresta(ids[k], ids[k + 1]);
        const soma = fs.reduce((s, f) => { const n = unit(newell(f.map((j) => gaiola.vertices[j]))); return [s[0] + n[0], s[1] + n[1], s[2] + n[2]]; }, [0, 0, 0]);
        peles.push(fs.length && norma(soma) > 1e-9 ? unit(soma) : null);
      }
      let pedidoMm = null;
      if (v.raio !== undefined && v.raio !== null) { pedidoMm = Number(num(v.raio)); if (!(pedidoMm > 0)) throw new ErroDeEntrada(`o vinco '${v.nome}' declara raio ${v.raio}; o raio é um número de mm maior que zero`); }
      linhas.push({ nome: v.nome, passo: i, pontos: ids.map((k) => gaiola.vertices[k]), peles, pedidoMm });
    }
  });
  return linhas;
}

/** Os pontos de uma lista de segmentos soltos, em ordem ao longo do eixo maior, para cadeias de crista; uma linha por cadeia. */
export function linhasDasCristas(segmentos, minimoMm = 80) {
  const nos = new Map(); const pt = new Map();
  segmentos.forEach(([a, b], i) => [a, b].forEach((p) => { const c = chaveDoPonto(p); pt.set(c, p); if (!nos.has(c)) nos.set(c, []); nos.get(c).push(i); }));
  const visto = new Array(segmentos.length).fill(false); const linhas = [];
  for (let i = 0; i < segmentos.length; i++) {
    if (visto[i]) continue;
    const fila = [i]; visto[i] = true; const chaves = new Set();
    for (let h = 0; h < fila.length; h++) for (const p of segmentos[fila[h]]) { const c = chaveDoPonto(p); chaves.add(c); for (const j of nos.get(c)) if (!visto[j]) { visto[j] = true; fila.push(j); } }
    const ps = [...chaves].map((c) => pt.get(c));
    const min = [0, 1, 2].map((k) => Math.min(...ps.map((p) => p[k]))); const max = [0, 1, 2].map((k) => Math.max(...ps.map((p) => p[k])));
    const eixo = unit(max.map((x, k) => x - min[k]));
    const ordenados = ps.map((p) => ({ p, u: dot(sub(p, min), eixo) })).sort((x, y) => x.u - y.u).map((x) => x.p);
    if (norma(sub(ordenados[ordenados.length - 1], ordenados[0])) * MM >= minimoMm) linhas.push({ pontos: ordenados, peles: null, pedidoMm: null });
  }
  return linhas.sort((x, y) => x.pontos[0][0] - y.pontos[0][0] || x.pontos[0][1] - y.pontos[0][1] || x.pontos[0][2] - y.pontos[0][2]).map((l, k) => ({ ...l, nome: `crista${k + 1}`, passo: null }));
}

/** `x,y,z:x,y,z` (mm) -> `{ nome: 'aresta', pontos, peles: null }` com os pontos em metro. */
export function linhaDaAresta(texto) {
  const partes = texto.split(':');
  const ponto = (t) => { const v = t.split(',').map(Number); if (v.length !== 3 || v.some((x) => !Number.isFinite(x))) throw new ErroDeEntrada(`--aresta espera x,y,z:x,y,z em mm, e veio '${texto}'`); return v.map((x) => x / MM); };
  if (partes.length !== 2) throw new ErroDeEntrada(`--aresta espera x,y,z:x,y,z em mm, e veio '${texto}'`);
  const pontos = partes.map(ponto);
  if (norma(sub(pontos[1], pontos[0])) === 0) throw new ErroDeEntrada('--aresta com os dois pontos iguais');
  return { nome: 'aresta', passo: null, pontos, peles: null, pedidoMm: null };
}

/** Mede as linhas de uma peça (`neutro` final, em metro): `{ arestas, avisos }`. */
export function medirLinhas(neutro, linhas, { cadaMm, janelaMm, pedidos = {}, tolerancia = TOLERANCIA_PADRAO } = {}) {
  const malha = prepararMalha(neutro);
  const arestas = linhas.map((l) => ({ passo: l.passo, ...medirAresta(malha, l, { cadaMm, janelaMm, tolerancia, pedidoMm: pedidos[l.nome] ?? l.pedidoMm ?? null }), origemDoPedido: pedidos[l.nome] !== undefined ? '--pedido' : l.pedidoMm !== null ? 'raio do vinco' : null }));
  return { arestas };
}

/* ---------- a linha de comando ---------- */

const virgula = (x, c = 1) => (x === null || x === undefined ? '-' : Number(x).toFixed(c).replace('.', ','));
const faixa = (r, c = 1) => (r ? `${virgula(r.minimo, c)} / ${virgula(r.mediano, c)} / ${virgula(r.maximo, c)}` : '-');

function textoDaAresta(a) {
  const linhas = [`${a.nome}${a.passo !== null ? ` (passo ${a.passo})` : ''}: ${a.medidos} de ${a.cortes} cortes medidos em ${virgula(a.comprimentoMm, 0)} mm`];
  if (a.medidos) {
    linhas.push(`  raio do filete (mín / mediano / máx): ${faixa(a.raioMm)} mm; menor raio de curvatura: ${faixa(a.curvaturaMm)} mm; dobra de ${faixa(a.anguloDaDobraGraus)} graus`);
    linhas.push(`  natureza dos cortes: ${Object.entries(a.naturezas).map(([k, v]) => `${v} ${k}`).join(', ')}${a.naturezas['nao-arco'] ? ' (o perfil não é arco: o raio do filete é o do arco que melhor o cobre, e o menor raio de curvatura diverge dele)' : ''}${a.naturezas.viva ? ' (quina viva: o raio é menor que 0,25 mm)' : ''}`);
    if (a.piorDesvio) linhas.push(`  pior desvio de ${virgula(a.piorDesvio.referenciaMm)} mm${a.pedidoMm === undefined ? ' (a mediana)' : ' (o pedido)'}: raio ${virgula(a.piorDesvio.raioMm)} mm em [${a.piorDesvio.posicaoMm.join('; ')}]`);
  }
  if (a.pedidoMm !== undefined) linhas.push(`  pedido ${virgula(a.pedidoMm)} mm (${a.origemDoPedido}), tolerância de ${virgula(a.tolerancia * 100, 0)}%: ${a.foraDoPedido} de ${a.cortes} cortes fora${a.sobPedido ? '; dentro do pedido' : '; FORA DO PEDIDO'}`);
  const semMedida = a.porCorte.filter((c) => c.raioMm === null && c.natureza !== 'plana');
  if (a.semDobra) linhas.push(`  ${a.semDobra} corte(s) sem dobra (menos de 2 graus): sem raio que se leia, fora da conta do pedido`);
  if (semMedida.length) linhas.push(`  sem medida: ${semMedida.length} (${[...new Set(semMedida.map((c) => c.motivo ?? c.natureza))].join('; ')})`);
  return linhas.join('\n');
}

function lerPedidos(argv) {
  const pedidos = {}; const resto = [];
  for (const a of argv) {
    const m = /^--pedido=(.*)$/.exec(a);
    if (!m) { resto.push(a); continue; }
    const k = m[1].lastIndexOf(':'); const nome = m[1].slice(0, k); const mm = Number(m[1].slice(k + 1));
    if (k <= 0 || !(mm > 0)) throw new ErroDeEntrada(`--pedido espera <nome>:<mm> com o raio maior que zero, e veio '${m[1]}'`);
    if (nome in pedidos) throw new ErroDeEntrada(`--pedido repete o nome '${nome}'`);
    pedidos[nome] = mm;
  }
  return { pedidos, resto };
}

/** A linha de comando: devolve `{ codigo, stdout, stderr }`. */
export async function executar(argv) {
  try {
    const { pedidos, resto } = lerPedidos(argv);
    let lido;
    try { lido = lerArgumentos(resto, { opcoes: ['opcao', 'aresta', 'cada', 'janela', 'tolerancia', 'vinco'], bandeiras: ['json', 'automatico'], posicional: { nome: 'a receita, o esboço ou a montagem', obrigatorio: true } }); } catch (e) { throw new ErroDeEntrada(e.message); }
    const numero = (nome, padrao) => { const t = lido.opcao(nome); if (t === null) return padrao; const x = Number(t); if (!(x > 0)) throw new ErroDeEntrada(`--${nome} espera um número maior que zero, e veio '${t}'`); return x; };
    const cadaMm = numero('cada', CADA_PADRAO_MM); const janelaMm = numero('janela', JANELA_PADRAO_MM); const tolerancia = numero('tolerancia', TOLERANCIA_PADRAO);
    const alvo = lido.posicional;
    const entrada = await lerEntradaDeMedida(alvo, { opcao: opcaoDaLinha(lido.opcao('opcao')), montagem: true });
    const pecas = entrada.tipo === 'montagem' ? entrada.partes.map((p) => ({ nome: p.nome, receita: p.receita, executada: null })) : [{ nome: alvo, receita: entrada.receita, executada: entrada.executar() }];
    const resultados = [];
    for (const p of pecas) {
      const executada = p.executada ?? (await import('../../src/autoria/executar-receita.js')).executarReceita(p.receita);
      let linhas;
      if (lido.opcao('aresta') !== null) linhas = [linhaDaAresta(lido.opcao('aresta'))];
      else if (lido.bandeira('automatico')) {
        const { vincoOcultoDaReceita } = await import('./vinco-oculto.mjs');
        const r = vincoOcultoDaReceita(p.receita, {}, executada);
        linhas = r._desenho.flatMap((d) => linhasDasCristas(d.segmentos.vinco));
      } else {
        linhas = linhasDosVincos(executada.entrada);
        if (lido.opcao('vinco') !== null) linhas = linhas.filter((l) => l.nome === lido.opcao('vinco'));
      }
      if (!linhas.length) throw new ErroDeEntrada(`${p.nome}: nenhuma aresta para medir (${lido.opcao('vinco') !== null ? `o vinco '${lido.opcao('vinco')}' não existe` : lido.bandeira('automatico') ? 'nenhuma crista não declarada' : 'nenhum vinco nomeado nos passos subdivisao; use --aresta=x,y,z:x,y,z ou --automatico'}`);
      const nomes = new Set(linhas.map((l) => l.nome));
      for (const n of Object.keys(pedidos)) if (!nomes.has(n) && pecas.length === 1) throw new ErroDeEntrada(`--pedido cita '${n}', que não é aresta desta peça (${[...nomes].join(', ')})`);
      resultados.push({ peca: p.nome, ...medirLinhas(executada.neutro, linhas, { cadaMm, janelaMm, pedidos, tolerancia }) });
    }
    const todas = resultados.flatMap((r) => r.arestas);
    const comPedido = todas.filter((a) => a.pedidoMm !== undefined);
    const fora = comPedido.filter((a) => !a.sobPedido);
    const codigo = fora.length ? 1 : 0;
    const saida = { entrada: entrada.origem, cadaMm, janelaMm, ...(comPedido.length ? { tolerancia, foraDoPedido: fora.map((a) => a.nome) } : {}), pecas: resultados.map((r) => ({ peca: r.peca, arestas: r.arestas })) };
    if (lido.bandeira('json')) return { codigo, stdout: `${JSON.stringify(saida, null, 2)}\n`, stderr: '' };
    const cabeca = `raio:aresta — ${entrada.origem}; corte a cada ${cadaMm} mm, janela de ${janelaMm} mm; o raio é o do filete (núcleo), com o menor raio de curvatura ao lado\n`;
    const corpo = resultados.map((r) => `${resultados.length > 1 ? `[${r.peca}]\n` : ''}${r.arestas.map(textoDaAresta).join('\n')}`).join('\n');
    const rodape = comPedido.length ? `\n${fora.length ? `${fora.length} de ${comPedido.length} arestas com pedido fogem dele por mais de ${virgula(tolerancia * 100, 0)}%: ${fora.map((a) => a.nome).join(', ')}` : `as ${comPedido.length} arestas com pedido estão dentro de ${virgula(tolerancia * 100, 0)}%`}\n` : '\n';
    return { codigo, stdout: `${cabeca}${corpo}${rodape}`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDeEntrada || erro?.code === 'ENOENT') return { codigo: 2, stdout: '', stderr: `raio:aresta: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const r = await executar(process.argv.slice(2));
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  process.exitCode = r.codigo;
}
