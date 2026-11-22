#!/usr/bin/env node
/* distancia-a-pele.mjs — a distância da superfície limite da chapa à pele analítica que a receita declara, por região, e o veredito que
 * junta essa distância à zebra numérica.
 *
 * POR QUE ELE EXISTE. A zebra sozinha aprova a chapa que fica lisa saindo da forma: no quarto traseiro do carro a onda de 400 mm da energia
 * de curvatura limpou o reflexo e levou a chapa 8,6 mm para fora da pele (banco de provas `correcao-de-superficie-2026-11-16`). Aquela
 * distância saiu de roteiro de rascunho; aqui ela é medida pela ferramenta, contra a pele que a própria receita calcula.
 *
 * O CONTRATO DA RECEITA. A receita em arquivo exporta `PELE`, uma função dos parâmetros (`PELE(receita.PARAMS)`, a variante de `--params`
 * inclusive) que devolve { <nome>: { u: [a, b], v: [c, d], ponto(u, v) -> [x, y, z] em mm, espelho?: 'x' | 'y' | 'z', limiteMm? } }: cada
 * entrada é um retalho paramétrico da pele, no domínio retangular [a, b] x [c, d]. Com `espelho`, a distância é a menor entre a pele e a
 * imagem dela no plano daquele eixo (a chapa simétrica que cobre os dois lados). `limiteMm` é a maior distância que o veredito aceita naquele
 * retalho, e `--limite` vale para os que não declaram.
 *
 * O QUE ELE MEDE. A superfície limite é amostrada como na zebra numérica (o oráculo `superficieLimite` na gaiola refinada, passo `--passo`
 * mm por face). Para cada amostra, o pé na pele sai do ponto mais próximo de uma grade do retalho (espaçamento de metade do passo), refinado
 * por Gauss-Newton no parâmetro. A amostra cujo pé cai na borda do domínio está além do retalho e conta como `foraDaPele`; a que fica a mais
 * de `--alcance` mm da grade conta como `longe`. Das outras saem a maior distância, o percentil 95 e a mediana, e a maior para cada lado da
 * normal ∂u × ∂v do retalho (`paraFora` no sentido dela, `paraDentro` no contrário), com o lugar da maior. As regiões são as caixas de
 * `--caixas`, no formato da zebra numérica (centro da face da gaiola refinada, com `menos`); sem caixas, a chapa toda é uma região.
 *
 * O VEREDITO. Com `--zebra`, a mesma execução mede a zebra numérica nas mesmas regiões. Com `--contra=<json>` (a saída de uma medida anterior
 * com `--zebra`, que é a linha de base), o veredito reprova quando os laços esperados de uma região sobem mais que `--folga` (padrão 0,05)
 * sobre a base, ou quando a distância de um retalho numa região passa do limite dele. Nenhuma das duas medidas aprova forma: a zebra que não
 * sobe com a chapa dentro da pele é o que a ferramenta exige, e quem aprova a forma é a pessoa.
 *
 * Uso: node tools/modelar/distancia-a-pele.mjs <receita> [--passo=<mm>] [--caixas=<json>] [--alcance=<mm>] [--limite=<mm>] [--zebra]
 *        [--contra=<json>] [--folga=<laços>] [--params=<json | arquivo.json>] [--saida=<json>] [--sem-cache]
 *   O JSON vai para a saída padrão e a tabela para a saída de erro; o código de saída é 1 quando o veredito reprova. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { refinarGaiola, superficieLimite } from '../../procedural/nucleo/subdivisao.js';
import { lerArgumentos } from './argumentos.mjs';
import { lerParams } from './entrada-de-medida.mjs';
import { PADROES as PADROES_DA_ZEBRA, chapaDaReceita, exclusoesDe, zebraNumerica } from './zebra-numerica.mjs';

export const PADROES = Object.freeze({ passoMm: 25, alcanceMm: 30, folgaDeLacos: 0.05 });
const EIXOS = ['x', 'y', 'z'];
const r3 = (x) => Math.round(x * 1000) / 1000;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);

/** conferirPele(nome, retalho) -> o retalho com os campos conferidos, ou a recusa que diz o campo, o valor e o esperado */
export function conferirPele(nome, r) {
  const onde = `a pele '${nome}'`;
  if (!r || typeof r !== 'object') throw new Error(`${onde} espera { u, v, ponto }, e veio ${JSON.stringify(r)}`);
  for (const k of ['u', 'v']) {
    const d = r[k];
    if (!Array.isArray(d) || d.length !== 2 || !d.every(Number.isFinite) || !(d[1] > d[0])) throw new Error(`${onde} espera em ${k} o domínio [a, b] com a < b, e veio ${JSON.stringify(d)}`);
  }
  if (typeof r.ponto !== 'function') throw new Error(`${onde} espera em ponto a função (u, v) -> [x, y, z] em mm`);
  if (r.espelho !== undefined && !EIXOS.includes(r.espelho)) throw new Error(`${onde} espera em espelho 'x', 'y' ou 'z', e veio ${JSON.stringify(r.espelho)}`);
  if (r.limiteMm !== undefined && !(Number.isFinite(r.limiteMm) && r.limiteMm > 0)) throw new Error(`${onde} espera em limiteMm um número maior que zero, e veio ${JSON.stringify(r.limiteMm)}`);
  const p = r.ponto((r.u[0] + r.u[1]) / 2, (r.v[0] + r.v[1]) / 2);
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) throw new Error(`${onde}: ponto no meio do domínio devolveu ${JSON.stringify(p)}, e o esperado é [x, y, z] em mm`);
  return r;
}

/** o projetor de um retalho sem espelho: (p em mm) -> { d, s, pe, fora } ou null quando a grade não tem ponto a menos de `alcance` mm */
function projetorDe(r, passoMm, alcanceMm) {
  const [u0, u1] = r.u; const [v0, v1] = r.v;
  /* o tamanho do retalho por uma grade grossa, para a grade fina ter espaçamento de metade do passo */
  const G = 8; let lu = 0; let lv = 0;
  for (let i = 0; i <= G; i++) {
    let su = 0; let sv = 0;
    for (let j = 0; j < G; j++) {
      su += norma(sub(r.ponto(u0 + ((j + 1) / G) * (u1 - u0), v0 + (i / G) * (v1 - v0)), r.ponto(u0 + (j / G) * (u1 - u0), v0 + (i / G) * (v1 - v0))));
      sv += norma(sub(r.ponto(u0 + (i / G) * (u1 - u0), v0 + ((j + 1) / G) * (v1 - v0)), r.ponto(u0 + (i / G) * (u1 - u0), v0 + (j / G) * (v1 - v0))));
    }
    lu = Math.max(lu, su); lv = Math.max(lv, sv);
  }
  const Nu = Math.min(2000, Math.max(4, Math.ceil(lu / (passoMm / 2)))); const Nv = Math.min(2000, Math.max(4, Math.ceil(lv / (passoMm / 2))));
  const grade = []; const celula = alcanceMm; const hash = new Map();
  const chave = (q) => `${Math.floor(q[0] / celula)},${Math.floor(q[1] / celula)},${Math.floor(q[2] / celula)}`;
  for (let i = 0; i <= Nu; i++) for (let j = 0; j <= Nv; j++) {
    const u = u0 + (i / Nu) * (u1 - u0); const v = v0 + (j / Nv) * (v1 - v0); const q = r.ponto(u, v);
    const k = grade.length; grade.push({ u, v, q });
    const c = chave(q); if (!hash.has(c)) hash.set(c, []); hash.get(c).push(k);
  }
  const hu = (u1 - u0) * 1e-6; const hv = (v1 - v0) * 1e-6;
  const derivadas = (u, v) => {
    const ua = Math.max(u0, u - hu); const ub = Math.min(u1, u + hu); const va = Math.max(v0, v - hv); const vb = Math.min(v1, v + hv);
    const du = sub(r.ponto(ub, v), r.ponto(ua, v)).map((x) => x / (ub - ua)); const dv = sub(r.ponto(u, vb), r.ponto(u, va)).map((x) => x / (vb - va));
    return [du, dv];
  };
  const naBorda = (u, v) => u <= u0 + hu || u >= u1 - hu || v <= v0 + hv || v >= v1 - hv;
  return (p) => {
    const [cx, cy, cz] = [0, 1, 2].map((k) => Math.floor(p[k] / celula));
    let melhor = -1; let dMelhor = Infinity;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const k of hash.get(`${cx + a},${cy + b},${cz + c}`) ?? []) { const d = norma(sub(grade[k].q, p)); if (d < dMelhor) { dMelhor = d; melhor = k; } }
    }
    if (melhor < 0 || dMelhor > alcanceMm) return null;
    let { u, v } = grade[melhor];
    for (let it = 0; it < 12; it++) {
      const q = r.ponto(u, v); const e = sub(p, q); const [du, dv] = derivadas(u, v);
      const a11 = dot(du, du); const a12 = dot(du, dv); const a22 = dot(dv, dv); const b1 = dot(du, e); const b2 = dot(dv, e);
      const det = a11 * a22 - a12 * a12; if (!(Math.abs(det) > 0)) break;
      const su = (a22 * b1 - a12 * b2) / det; const sv = (a11 * b2 - a12 * b1) / det;
      const nu = Math.min(u1, Math.max(u0, u + su)); const nv = Math.min(v1, Math.max(v0, v + sv));
      const parado = Math.abs(nu - u) < hu * 1e-3 && Math.abs(nv - v) < hv * 1e-3;
      u = nu; v = nv; if (parado) break;
    }
    const pe = r.ponto(u, v); const e = sub(p, pe); const [du, dv] = derivadas(u, v); const n = cruz(du, dv); const nn = norma(n);
    const d = norma(e);
    return { d, s: nn > 0 ? Math.sign(dot(e, n)) || 1 : 1, pe, fora: naBorda(u, v) };
  };
}

/** projetorDaPele(retalho, { passoMm, alcanceMm }) -> (p em mm) -> { d, s, pe, fora } | null: o pé do ponto p no retalho da pele, com a
 *  distância d (mm), o lado s da normal ∂u × ∂v (1 no sentido dela, -1 no contrário), o pé pe (mm) e fora quando o pé cai na borda do
 *  domínio; null quando o ponto fica a mais de `alcanceMm` da grade do retalho. Com `espelho`, vale o pé da imagem do ponto quando ele
 *  cai dentro do domínio e o da original não, ou quando fica mais perto. */
export function projetorDaPele(retalho, { passoMm = PADROES.passoMm, alcanceMm = PADROES.alcanceMm } = {}) {
  const projetar = projetorDe(retalho, passoMm, alcanceMm);
  const k = retalho.espelho ? EIXOS.indexOf(retalho.espelho) : -1;
  return (p) => {
    const a = projetar(p);
    if (k < 0) return a;
    const q = [...p]; q[k] = -q[k]; const b = projetar(q);
    if (!a) return b; if (!b) return a;
    if (a.fora !== b.fora) return a.fora ? b : a;
    return b.d < a.d ? b : a;
  };
}

/** distanciaAPele(chapa, peles, { passoMm, alcanceMm, caixas }) -> { parametros, peles: [{ nome, regioes: [{ nome, faces, pontos, medidos,
 *  foraDaPele, longe, maxMm, p95Mm, medianaMm, paraForaMm, paraDentroMm, onde }] }] }
 *  `chapa` é o neutro de um passo `subdivisao`; `peles` é o que `PELE(PARAMS)` devolve; `caixas` como na zebra numérica. */
export function distanciaAPele(chapa, peles, { passoMm = PADROES.passoMm, alcanceMm = PADROES.alcanceMm, caixas = null } = {}) {
  if (!(passoMm > 0)) throw new Error(`--passo espera mm maior que zero, e veio ${passoMm}`);
  if (!(alcanceMm > 0)) throw new Error(`--alcance espera mm maior que zero, e veio ${alcanceMm}`);
  const nomesDasPeles = Object.keys(peles ?? {});
  if (!nomesDasPeles.length) throw new Error('a receita não declara pele: exporte PELE(PARAMS) -> { <nome>: { u: [a, b], v: [c, d], ponto(u, v) } }');
  const G = refinarGaiola({ vertices: chapa.vertices, faces: chapa.faces, vincos: chapa.vincos ?? [], cantos: chapa.cantos ?? [], borda: chapa.borda ?? 'suave' });
  if (G.faces.some((f) => f.length !== 4)) throw new Error('a gaiola refinada tem face de mais de quatro lados; a distância à pele pede quadriláteros');
  const sup = superficieLimite(G);
  const comp = [];
  for (const f of G.faces) for (let k = 0; k < 4; k++) comp.push(norma(sub(G.vertices[f[k]], G.vertices[f[(k + 1) % 4]])) * 1000);
  comp.sort((a, b) => a - b);
  const N = Math.max(1, Math.round(comp[comp.length >> 1] / passoMm));
  const centros = G.faces.map((f) => [0, 1, 2].map((k) => (f.reduce((s, v) => s + G.vertices[v][k], 0) / 4) * 1000));
  const dentro = (c, cx) => EIXOS.every((e, k) => !cx[e] || (c[k] >= cx[e][0] && c[k] <= cx[e][1]));
  /* as amostras de cada face, no interior e nos lados de baixo e da esquerda, para cada ponto da superfície entrar uma vez por face */
  const amostrasDaFace = G.faces.map((_, fi) => { const a = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) a.push(sup.avaliar(fi, (i + 0.5) / N, (j + 0.5) / N).ponto.map((c) => c * 1000)); return a; });
  const saida = [];
  for (const nome of nomesDasPeles) {
    const r = conferirPele(nome, peles[nome]);
    const medir = projetorDaPele(r, { passoMm, alcanceMm });
    const medidaDaFace = new Map();
    const regioes = [];
    for (const [nomeDaRegiao, cx] of Object.entries(caixas ?? { chapa: {} })) {
      const exclusoes = exclusoesDe(nomeDaRegiao, cx.menos);
      const faces = []; G.faces.forEach((_, fi) => { if (dentro(centros[fi], cx) && !exclusoes.some((fora) => fora(centros[fi]))) faces.push(fi); });
      if (!faces.length) throw new Error(`a região '${nomeDaRegiao}' não tem face: a caixa não cobre o centro de nenhuma face da gaiola refinada`);
      const ds = []; let foraDaPele = 0; let longe = 0; let paraFora = 0; let paraDentro = 0; let maior = null;
      for (const fi of faces) {
        if (!medidaDaFace.has(fi)) medidaDaFace.set(fi, amostrasDaFace[fi].map((p) => ({ p, m: medir(p) })));
        for (const { p, m } of medidaDaFace.get(fi)) {
          if (!m) { longe++; continue; }
          if (m.fora) { foraDaPele++; continue; }
          ds.push(m.d);
          if (m.s > 0) paraFora = Math.max(paraFora, m.d); else paraDentro = Math.max(paraDentro, m.d);
          if (!maior || m.d > maior.d) maior = { d: m.d, p };
        }
      }
      ds.sort((a, b) => a - b);
      const q = (t) => (ds.length ? ds[Math.min(ds.length - 1, Math.floor(t * (ds.length - 1) + 0.5))] : null);
      regioes.push({
        nome: nomeDaRegiao, faces: faces.length, pontos: faces.length * N * N, medidos: ds.length, foraDaPele, longe,
        maxMm: ds.length ? r3(ds[ds.length - 1]) : null, p95Mm: ds.length ? r3(q(0.95)) : null, medianaMm: ds.length ? r3(q(0.5)) : null,
        paraForaMm: r3(paraFora), paraDentroMm: r3(paraDentro), onde: maior ? maior.p.map(Math.round) : null,
      });
    }
    saida.push({ nome, ...(r.espelho ? { espelho: r.espelho } : {}), ...(r.limiteMm ? { limiteMm: r.limiteMm } : {}), regioes });
  }
  return { parametros: { passoMm, passoEfetivoMm: r3(comp[comp.length >> 1] / N), alcanceMm }, peles: saida };
}

/** veredito({ distancia, zebra, base, limiteMm, folgaDeLacos }) -> { aprovada, problemas: [texto] }
 *  `distancia` e `zebra` são as medidas de agora; `base` é a saída anterior desta ferramenta com `--zebra` (ou null); `limiteMm` vale para o
 *  retalho que não declara o seu. */
export function veredito({ distancia, zebra = null, base = null, limiteMm = null, folgaDeLacos = PADROES.folgaDeLacos }) {
  const problemas = [];
  for (const p of distancia.peles) {
    const limite = p.limiteMm ?? limiteMm;
    if (!(limite > 0)) continue;
    for (const r of p.regioes) if (r.maxMm !== null && r.maxMm > limite) problemas.push(`a pele '${p.nome}' na região '${r.nome}': a chapa fica a ${r.maxMm} mm dela em ${JSON.stringify(r.onde)}, e o limite é ${limite} mm`);
  }
  if (base) {
    if (!base.zebra) throw new Error('a linha de base de --contra não tem a zebra; grave-a com --zebra --saida=<json>');
    if (!zebra) throw new Error('--contra compara a zebra com a da linha de base; meça com --zebra');
    const antes = new Map(base.zebra.regioes.map((r) => [r.nome, r]));
    for (const r of zebra.regioes) {
      const a = antes.get(r.nome);
      if (!a) { problemas.push(`a região '${r.nome}' não está na linha de base; regrave a base com as mesmas caixas`); continue; }
      if (r.lacosEsperados > a.lacosEsperados + folgaDeLacos) problemas.push(`a zebra subiu na região '${r.nome}': de ${a.lacosEsperados} para ${r.lacosEsperados} laços esperados (folga ${folgaDeLacos})`);
    }
  }
  return { aprovada: problemas.length === 0, problemas };
}

/** tabelaDaDistancia(resultado, nome) -> o texto legível da medida */
export function tabelaDaDistancia(res, nome) {
  const linhas = [`distância à pele — ${nome}, passo ${res.parametros.passoEfetivoMm} mm, alcance ${res.parametros.alcanceMm} mm`];
  const col = (t, n) => String(t).padEnd(n); const num = (x, n) => String(x ?? '-').padStart(n);
  for (const p of res.peles) {
    const larg = Math.max(8, ...p.regioes.map((r) => r.nome.length));
    linhas.push(`pele ${p.nome}${p.espelho ? ` (espelho em ${p.espelho})` : ''}${p.limiteMm ? `, limite ${p.limiteMm} mm` : ''}`,
      `  ${col('região', larg)}  ${num('medidos', 7)}  ${num('fora', 6)}  ${num('longe', 6)}  ${num('máx', 7)}  ${num('p95', 7)}  ${num('mediana', 7)}  ${num('p/ fora', 7)}  ${num('p/ dentro', 9)}  onde (mm)`,
      ...p.regioes.map((r) => `  ${col(r.nome, larg)}  ${num(r.medidos, 7)}  ${num(r.foraDaPele, 6)}  ${num(r.longe, 6)}  ${num(r.maxMm, 7)}  ${num(r.p95Mm, 7)}  ${num(r.medianaMm, 7)}  ${num(r.paraForaMm, 7)}  ${num(r.paraDentroMm, 9)}  ${r.onde ? r.onde.join(', ') : '-'}`));
  }
  return linhas.join('\n');
}

export const OPCOES_DA_CLI = ['passo', 'caixas', 'alcance', 'limite', 'contra', 'folga', 'params', 'saida'];

function numero(lido, nome, padrao) {
  const t = lido.opcao(nome); if (t === null || t === undefined) return padrao;
  const x = Number(t); if (!Number.isFinite(x)) throw new Error(`--${nome} espera um número, e veio '${t}'`);
  return x;
}

async function principal(argv) {
  let lido;
  try { lido = lerArgumentos(argv.slice(2), { opcoes: OPCOES_DA_CLI, bandeiras: ['ajuda', 'zebra', 'sem-cache'], posicional: { nome: 'receita', obrigatorio: false } }); } catch (e) { process.stderr.write(`distancia-a-pele: ${e.message}\n`); return 2; }
  const alvo = lido.posicional;
  if (lido.bandeira('ajuda') || !alvo) {
    process.stderr.write(`uso: node tools/modelar/distancia-a-pele.mjs <receita> [--${OPCOES_DA_CLI.join('=...] [--')}=...] [--zebra] [--sem-cache]\n  padrões: passo ${PADROES.passoMm} mm, alcance ${PADROES.alcanceMm} mm, folga ${PADROES.folgaDeLacos} laço; a receita exporta PELE(PARAMS); ver o cabeçalho do arquivo\n`);
    return lido.bandeira('ajuda') ? 0 : 2;
  }
  let saida; let julgado;
  try {
    const caixas = lido.opcao('caixas') ? JSON.parse(readFileSync(resolve(lido.opcao('caixas')), 'utf8')) : null;
    const base = lido.opcao('contra') ? JSON.parse(readFileSync(resolve(lido.opcao('contra')), 'utf8')) : null;
    const { chapa, receita, modulo } = await chapaDaReceita(alvo, { params: lerParams(lido.opcao('params')), cache: !lido.bandeira('sem-cache'), rotulo: 'distancia-a-pele' });
    if (typeof modulo?.PELE !== 'function') throw new Error(`${alvo}: a receita não exporta PELE(PARAMS); declare a pele analítica que ela já calcula (ver o cabeçalho de distancia-a-pele.mjs)`);
    const passoMm = numero(lido, 'passo', PADROES.passoMm);
    const distancia = distanciaAPele(chapa, modulo.PELE(receita.PARAMS), { passoMm, alcanceMm: numero(lido, 'alcance', PADROES.alcanceMm), caixas });
    const zebra = lido.bandeira('zebra') ? zebraNumerica(chapa, { passoMm, caixas, persistencia: PADROES_DA_ZEBRA.persistencia }) : null;
    julgado = veredito({ distancia, zebra, base, limiteMm: numero(lido, 'limite', null), folgaDeLacos: numero(lido, 'folga', PADROES.folgaDeLacos) });
    saida = { alvo, ...(lido.opcao('params') ? { params: lido.opcao('params') } : {}), distancia, ...(zebra ? { zebra } : {}), veredito: julgado };
  } catch (e) { process.stderr.write(`distancia-a-pele: ${e.message}\n`); return 2; }
  const texto = `${JSON.stringify(saida, null, 1)}\n`;
  if (lido.opcao('saida')) { const s = resolve(lido.opcao('saida')); mkdirSync(dirname(s), { recursive: true }); writeFileSync(s, texto); }
  process.stderr.write(`${tabelaDaDistancia(saida.distancia, alvo)}\n`);
  for (const p of julgado.problemas) process.stderr.write(`reprova: ${p}\n`);
  process.stdout.write(texto);
  return julgado.aprovada ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
