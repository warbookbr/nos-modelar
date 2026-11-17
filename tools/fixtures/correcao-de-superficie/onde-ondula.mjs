#!/usr/bin/env node
/* onde-ondula.mjs — onde a curvatura da superfície limite oscila, por classe de lugar (fatia 5 do plano das ferramentas de correção de
 * superfície): perto de um ponto singular (vértice extraordinário, canto declarado, canto da borda), num vinco, na borda livre, numa curva
 * declarada, ou no miolo dos retalhos.
 *
 * COMO MEDE. A gaiola do passo `subdivisao` (o neutro com as curvas marcadas, como em `medida-na-curva.mjs`) refinada um nível tem só
 * quadriláteros; cada fileira de faces nas duas direções é percorrida, e em `--amostras` pontos por face, no meio dela, a curvatura normal
 * na direção da fileira é avaliada pelo oráculo exato (`superficieLimite`). Ao longo da fileira, a curvatura é uma função do comprimento,
 * e a ONDULAÇÃO é a dos pontos de virada dela: o máximo ou o mínimo local que vira mais de `--virada` (1/m, padrão 0,1) até a virada
 * seguinte, contado por metro de fileira em cada classe, com a mediana do quanto vira. A régua é fina de propósito: um erro de posição δ
 * dos pontos da gaiola de espaçamento h já faz a curvatura variar uns 16 δ / h² (0,06 1/m com 5 micrômetros a 25 mm), e é essa variação na
 * frequência da gaiola que a zebra mostra como ondulação. A RAMPA é |dk/ds| (1/m²) entre amostras seguidas: a maior e a soma de (dk/ds)² ds
 * de cada classe, a parte dela na energia total de variação da curvatura. A classe de cada amostra é a do lugar mais perto, nesta ordem:
 * singular a até um espaçamento da gaiola, vinco a até meio, borda a até um, curva declarada a até meio, e o resto é miolo. Na simetria
 * em x só a metade x >= 0 entra.
 *
 * Uso: node tools/fixtures/correcao-de-superficie/onde-ondula.mjs <chapa de prova | caminho da receita> [--amostras=<n>] [--virada=<1/m>]
 *   O JSON vai para a saída padrão e o resumo, para a saída de erro. Roda só os passos `subdivisao` da receita. */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { curvaturaNormal, descendenciaDasLinhas, refinarGaiola, superficieLimite } from '../../../procedural/nucleo/subdivisao.js';
import { CHAPAS_DE_PROVA, receitaDeProva } from './chapas.mjs';

const CLASSES = ['singular', 'vinco', 'borda', 'curva', 'miolo'];
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* os pontos de referência de cada classe, numa grade espacial de lado `lado`, para a distância ao mais perto */
function grade(pontos, lado) {
  const mapa = new Map(); const k = (p) => p.map((c) => Math.floor(c / lado));
  for (const p of pontos) { const c = k(p).join(','); if (!mapa.has(c)) mapa.set(c, []); mapa.get(c).push(p); }
  return (p) => {
    const [i, j, l] = k(p); let melhor = Infinity;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const q of mapa.get(`${i + a},${j + b},${l + c}`) ?? []) melhor = Math.min(melhor, dist(p, q));
    return melhor;
  };
}

/** ondeOndula(chapa, { amostras, virada }) -> { espacamentoMm, classes: { [classe]: { comprimentoM, viradas, viradasPorM, amplitudeMediana,
 *  rampaMaxima, energia, parteDaEnergia, parteForaDoVinco } } }; a amplitude é o quanto a curvatura volta (1/m) depois de cada virada */
export function ondeOndula(chapa, { amostras = 6, virada = 0.1 } = {}) {
  const gaiola0 = { vertices: chapa.vertices, faces: chapa.faces, vincos: chapa.vincos ?? [], cantos: chapa.cantos ?? [], borda: chapa.borda ?? 'suave' };
  const G = refinarGaiola(gaiola0);
  const sup = superficieLimite(G);
  const P0 = chapa.vertices; const nV0 = P0.length;
  /* o espaçamento da gaiola: a mediana das arestas */
  const comp = [];
  for (const f of chapa.faces) for (let k = 0; k < f.length; k++) comp.push(dist(P0[f[k]], P0[f[(k + 1) % f.length]]));
  comp.sort((a, b) => a - b); const h = comp[comp.length >> 1];
  /* os lugares de referência, na gaiola refinada: singulares, vincos, borda e curvas */
  const valencia = new Array(G.vertices.length).fill(0); const arestas = new Map();
  G.faces.forEach((f) => { for (let k = 0; k < 4; k++) { const a = f[k], b = f[(k + 1) % 4]; const c = a < b ? `${a},${b}` : `${b},${a}`; arestas.set(c, (arestas.get(c) ?? 0) + 1); } });
  const naBorda = new Set();
  for (const [c, n] of arestas) { const [a, b] = c.split(',').map(Number); valencia[a]++; valencia[b]++; if (n !== 2) { naBorda.add(a); naBorda.add(b); } }
  const cantos = new Set(G.cantos);
  const singulares = []; const borda = [];
  for (let x = 0; x < G.vertices.length; x++) {
    if (!valencia[x]) continue;
    if (cantos.has(x) || (naBorda.has(x) ? valencia[x] !== 3 : valencia[x] !== 4)) singulares.push(G.vertices[x]);
    if (naBorda.has(x)) borda.push(G.vertices[x]);
  }
  const vincos = (chapa.vincos ?? []).flatMap(([a, b]) => [P0[a], P0[b], P0[a].map((c, j) => (c + P0[b][j]) / 2)]);
  const curvas = (chapa.curvas ?? []).length
    ? descendenciaDasLinhas(chapa.faces, nV0, 1, chapa.curvas.map((c) => c.gaiola)).flat().map((v) => G.vertices[v])
    : [];
  const perto = { singular: grade(singulares, h), vinco: grade(vincos, h), borda: grade(borda, h), curva: grade(curvas, h) };
  const classe = (p) => {
    if (perto.singular(p) <= h) return 'singular';
    if (perto.vinco(p) <= h / 2) return 'vinco';
    if (perto.borda(p) <= h) return 'borda';
    if (perto.curva(p) <= h / 2) return 'curva';
    return 'miolo';
  };
  const soMetade = chapa.simetria === 'x';
  /* as fileiras: a face que entra pelo lado s e sai pelo oposto, nas duas direções, cada (face, direção) uma vez */
  const dirigida = new Map();
  G.faces.forEach((f, fi) => { for (let k = 0; k < 4; k++) dirigida.set(`${f[k]}>${f[(k + 1) % 4]}`, { face: fi, lado: k }); });
  const atravessar = (fi, s) => { const f = G.faces[fi]; const e = (s + 2) % 4; return dirigida.get(`${f[(e + 1) % 4]}>${f[e]}`) ?? null; };
  const voltar = (fi, s) => { const f = G.faces[fi]; return dirigida.get(`${f[(s + 1) % 4]}>${f[s]}`) ?? null; };
  const visto = new Set();
  const PARAM = [(t, w) => [t, w], (t, w) => [1 - w, t], (t, w) => [1 - t, 1 - w], (t, w) => [w, 1 - t]];
  const soma = Object.fromEntries(CLASSES.map((c) => [c, { comprimento: 0, viradas: 0, rampaMaxima: 0, energia: 0, amplitudes: [] }]));
  for (let f0 = 0; f0 < G.faces.length; f0++) for (const s0 of [0, 1]) {
    if (visto.has(`${f0}:${s0 % 2}`)) continue;
    /* volta até o começo da fileira (a borda, ou a própria face se a fileira fecha) */
    let fi = f0, s = s0;
    for (let n = 0; n < G.faces.length; n++) { const a = voltar(fi, s); if (!a || (a.face === f0)) break; fi = a.face; s = (a.lado + 2) % 4; }
    const perfil = [];
    for (let n = 0; n < G.faces.length && fi !== null; n++) {
      const chave = `${fi}:${s % 2}`;
      if (visto.has(chave)) break;
      visto.add(chave);
      for (let j = 0; j < amostras; j++) {
        const am = sup.avaliar(fi, ...PARAM[s](0.5, (j + 0.5) / amostras));
        if (!am.fundamentais) { perfil.push(null); continue; }
        const d = s % 2 === 0 ? am.dv : am.du;
        perfil.push({ p: am.ponto, k: curvaturaNormal(am, d) });
      }
      const prox = atravessar(fi, s);
      if (!prox) break;
      fi = prox.face; s = prox.lado;
    }
    /* a fileira em trechos sem buraco: o comprimento, a rampa e as viradas por classe */
    let trecho = [];
    const fechar = () => {
      for (let m = 1; m < trecho.length; m++) {
        const a = trecho[m - 1], b = trecho[m]; const ds = dist(a.p, b.p);
        if (!(ds > 0) || (soMetade && (a.p[0] < 0 || b.p[0] < 0))) continue;
        const c = soma[classe(b.p)]; const dk = (b.k - a.k) / ds;
        c.comprimento += ds; c.rampaMaxima = Math.max(c.rampaMaxima, Math.abs(dk)); c.energia += dk * dk * ds;
      }
      /* as viradas: o extremo local que vira mais que `virada` até o próximo */
      let extremo = trecho[0], sentido = 0;
      for (let m = 1; m < trecho.length; m++) {
        const q = trecho[m];
        if (sentido >= 0 && q.k > extremo.k) { extremo = q; if (sentido === 0 && q.k - trecho[0].k > virada) sentido = 1; continue; }
        if (sentido <= 0 && q.k < extremo.k) { extremo = q; if (sentido === 0 && trecho[0].k - q.k > virada) sentido = -1; continue; }
        if (sentido === 0) { if (Math.abs(q.k - extremo.k) > virada) sentido = q.k > extremo.k ? 1 : -1; extremo = q; continue; }
        if (Math.abs(q.k - extremo.k) > virada) {
          if (!(soMetade && extremo.p[0] < 0)) { const c = soma[classe(extremo.p)]; c.viradas++; c.amplitudes.push(Math.abs(q.k - extremo.k)); }
          sentido = -sentido; extremo = q;
        }
      }
      trecho = [];
    };
    for (const a of perfil) { if (a && a.k !== null) trecho.push(a); else fechar(); }
    fechar();
  }
  const total = CLASSES.reduce((t, c) => t + soma[c].energia, 0) || 1;
  /* o filete do vinco de nitidez finita tem curvatura de centenas por metro e domina a energia; a parte fora dele compara o resto */
  const foraDoVinco = CLASSES.reduce((t, c) => t + (c === 'vinco' ? 0 : soma[c].energia), 0) || 1;
  return {
    espacamentoMm: r3(h * 1000), virada, amostras,
    classes: Object.fromEntries(CLASSES.map((c) => [c, {
      comprimentoM: r3(soma[c].comprimento), viradas: soma[c].viradas, viradasPorM: r3(soma[c].comprimento ? soma[c].viradas / soma[c].comprimento : 0),
      amplitudeMediana: r3([...soma[c].amplitudes].sort((a, b) => a - b)[soma[c].amplitudes.length >> 1] ?? 0),
      rampaMaxima: r3(soma[c].rampaMaxima), energia: r3(soma[c].energia), parteDaEnergia: r3(soma[c].energia / total),
      parteForaDoVinco: c === 'vinco' ? null : r3(soma[c].energia / foraDoVinco),
    }])),
  };
}

async function principal() {
  const args = process.argv.slice(2);
  const alvo = args.find((a) => !a.startsWith('--'));
  const opcao = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  if (!alvo) { console.error('uso: onde-ondula.mjs <chapa de prova | caminho da receita> [--amostras=<n>] [--virada=<1/m>]'); process.exit(2); }
  const receita = CHAPAS_DE_PROVA.includes(alvo) ? receitaDeProva(alvo, { marcarCurvas: true }) : (await import(pathToFileURL(resolve(alvo)).href)).default;
  const { neutro } = executarReceita({ ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined });
  const saida = (neutro.chapas ?? []).map((chapa) => ({ passo: chapa.passo, ...ondeOndula(chapa, { amostras: Number(opcao('amostras') ?? 6), virada: Number(opcao('virada') ?? 0.1) }) }));
  for (const c of saida) {
    console.error(`passo ${c.passo} (espaçamento ${c.espacamentoMm} mm, virada ${c.virada} 1/m):`);
    for (const [k, v] of Object.entries(c.classes)) console.error(`  ${k.padEnd(9)} ${String(v.comprimentoM).padStart(8)} m de fileira, ${String(v.viradas).padStart(5)} viradas (${v.viradasPorM}/m, de ${v.amplitudeMediana} 1/m na mediana), rampa até ${v.rampaMaxima} 1/m², ${Math.round(v.parteDaEnergia * 100)}% da energia${v.parteForaDoVinco === null ? '' : ` (${Math.round(v.parteForaDoVinco * 100)}% fora do vinco)`}`);
  }
  process.stdout.write(`${JSON.stringify({ alvo, chapas: saida }, null, 1)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await principal();
