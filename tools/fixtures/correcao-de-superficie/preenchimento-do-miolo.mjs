#!/usr/bin/env node
/* preenchimento-do-miolo.mjs — PROTÓTIPO, fora do núcleo, da frente que a pessoa abriu em 2026-11-19 na fatia 5 do plano das ferramentas
 * de correção de superfície (`docs/modelar/planos/2026-11-16-ferramentas-de-correcao-de-superficie.md`): um preenchimento do miolo dos
 * retalhos de quatro lados que nasça perto da forma em retalho grande e de dupla curvatura.
 *
 * O DE HOJE. A `gaiolaPorRede` preenche o retalho de quatro lados pela interpolação transfinita de Coons com mistura LINEAR:
 * F = P_u f + P_v f − P_u P_v f, com P_u a reta entre os dois lados opostos. O erro é o produto dos dois erros de interpolação linear,
 * (I − P_u)(I − P_v) f, isto é, uns f_uuvv L⁴/64 no meio do retalho: nulo na forma aditiva (o paraboloide) e 1,26 mm na calota de raio
 * 0,5 m num retalho de 300 mm.
 *
 * AS DUAS VARIANTES MEDIDAS (`modo`):
 *
 *   'vizinhas'  A mistura de cada direção passa a usar a curva seguinte da rede de cada lado, quando ela existe: no ponto i do lado A, o
 *               ponto oposto do retalho vizinho (o que está do outro lado de A, na mesma fileira) dá um terceiro ponto, e a derivada
 *               transversal em A é a da parábola pelos três, com as cordas como parâmetro. Com vizinho dos dois lados a mistura é a
 *               cúbica de Hermite com as duas derivadas (uma Catmull-Rom de passo desigual); com vizinho de um lado só, a parábola
 *               pelos três; sem vizinho, a reta, e o retalho isolado sai igual ao de hoje. É a superfície de Gordon local: exata em toda
 *               forma quadrática numa das direções (com qualquer dependência na outra), e o erro passa a ser o produto de dois erros
 *               de interpolação quadrática. A derivada em A é a mesma dos dois lados, e os dois retalhos saem dela com a mesma tangente.
 *   'fitas'     O Coons de mistura cúbica com fitas de tangente: a derivada transversal ao longo de cada lado é a reta entre as
 *               tangentes das duas curvas que o cruzam nos cantos (a diferença de três pontos da própria curva), e a torção no canto
 *               sai dessas retas. Usa só o que as curvas do próprio retalho trazem.
 *
 * Nos dois a soma é feita nas duas ordens (u primeiro e v primeiro) e tirada a média, para o resultado não depender de qual lado o
 * retalho declarou primeiro. O retalho de n lados, o lado de vinco e a borda livre não dão vizinho. A terceira família do pedido, a
 * energia só no miolo com as curvas fixas, já está medida na etapa B (a linha "sem cota" da correção c) e não foi refeita.
 *
 * O PROTÓTIPO NÃO USA O PREENCHIMENTO DO NÚCLEO: lê a rede montada com `liso: false`, confere que o Coons refeito aqui é o da rede ponto a
 * ponto, troca os pontos de dentro dos retalhos de quatro lados e devolve os pontos novos, que o passo `subdivisao` da rede ajusta (a
 * cota do miolo com o peso que a rede pôs: 1, ou 0,003 no passo da rede com `alisarSuperficie`).
 *
 * DESDE 2026-11-19 A `vizinhas` ESTÁ NO NÚCLEO, como o miolo da `gaiolaPorRede` com `alisarSuperficie` (decisão da pessoa, no plano). Este
 * arquivo fica como a conta independente dela: cada prova traz a coluna `nucleo` (a rede com a opção, como o núcleo a monta) ao lado da
 * `vizinhas.comEnergia` (os pontos do protótipo no passo da mesma rede), e `nucleo.contraPrototipoMm`, a maior distância entre os pontos
 * das duas, que o teste cobra abaixo de 1e-9. `hoje.comEnergia` continua sendo a etapa B (o Coons com a energia), que o núcleo já não
 * monta e só sai daqui, com os pontos da rede de `liso: false` no passo da rede com a opção.
 *
 * Uso: node tools/fixtures/correcao-de-superficie/preenchimento-do-miolo.mjs analiticas | grade | emendas | rede | lateral  [opções]
 *   --definicao=<json>   opções de `definicaoAnalitica`, como {"meio":[0.25,0.25]} ou {"pontos":16}
 *   --superficie=<nome>  só uma das analíticas (paraboloide, calota ou toro)
 *   --modos=<a,b>        as variantes a medir (padrão vizinhas,fitas)
 *   A saída é JSON na saída padrão. */
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { altura as alturaDaChapaLateral, definicao as definicaoDaChapaLateral } from '../../../procedural/nucleo/fixtures/gaiola-por-rede-prova.js';
import { alisarMioloNaNormal } from '../../../procedural/nucleo/gaiola-por-rede-liso.js';
import { gaiolaDoPasso } from '../../../procedural/nucleo/operacoes/subdivisao.js';
import { ajustarGaiolaAsMedidasComPeso, superficieLimite } from '../../../procedural/nucleo/subdivisao.js';
import { SUPERFICIES_ANALITICAS, definicaoAnalitica, definicaoDaEmenda, definicaoDaRede, painel, pontoDaEmenda, receitaDeProva } from './chapas.mjs';
import { cristaPontual, medirEmenda, medirRede } from './energia-de-curvatura.mjs';

export const MODOS = Object.freeze(['vizinhas', 'fitas']);
/* o mesmo limite do núcleo (`RAZAO_MAXIMA_DO_VIZINHO`, em `gaiola-por-rede.js`), escrito aqui de novo para a conta ficar independente;
   `razaoMaxima: Infinity` em `preencherGrades` dá a `vizinhas` como foi medida antes da revisão */
export const RAZAO_MAXIMA = 4;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const comb = (pesos, pts) => { const r = [0, 0, 0]; pesos.forEach((w, k) => { if (w !== 0 && pts[k]) { r[0] += w * pts[k][0]; r[1] += w * pts[k][1]; r[2] += w * pts[k][2]; } }); return r; };
const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
const hermite = (t) => [2 * t ** 3 - 3 * t * t + 1, t ** 3 - 2 * t * t + t, -2 * t ** 3 + 3 * t * t, t ** 3 - t * t]; // H00, H10, H01, H11

/** pesosDaMistura(t, h0, h, h1) -> [w−, w0, w1, w+]: os pesos, no parâmetro t de [0, 1], dos quatro pontos em −h0, 0, h e h + h1 (h0 ou h1
 *  null quando o ponto de fora não existe). Com os dois de fora, a cúbica de Hermite com a derivada da parábola por três pontos em cada
 *  ponta; com um, a parábola pelos três; sem nenhum, a reta. */
export function pesosDaMistura(t, h0, h, h1) {
  let m0 = null, m1 = null; const secante = [0, -1, 1, 0];
  if (h0 != null) { const a = (h * h) / (h0 * (h0 + h)), b = h0 / (h0 + h); m0 = [-a, a - b, b, 0]; }
  if (h1 != null) { const a = h1 / (h + h1), b = (h * h) / (h1 * (h + h1)); m1 = [0, -a, a - b, b]; }
  if (!m0 && !m1) { m0 = secante; m1 = secante; } else if (!m0) m0 = secante.map((s, q) => 2 * s - m1[q]); else if (!m1) m1 = secante.map((s, q) => 2 * s - m0[q]);
  const [H00, H10, H01, H11] = hermite(t);
  return [H10 * m0[0] + H11 * m1[0], H00 + H10 * m0[1] + H11 * m1[1], H01 + H10 * m0[2] + H11 * m1[2], H10 * m0[3] + H11 * m1[3]];
}

/** coons(P, nU, nV) -> (i, j) => ponto: o preenchimento de hoje, sobre a grade P(i, j) da borda */
const coons = (P, nU, nV) => (i, j) => {
  const u = i / nU, v = j / nV;
  return comb([1 - v, v, 1 - u, u, -(1 - u) * (1 - v), -u * (1 - v), -u * v, -(1 - u) * v], [P(i, 0), P(i, nV), P(0, j), P(nU, j), P(0, 0), P(nU, 0), P(nU, nV), P(0, nV)]);
};

/** gradeDoRetalho(id, lados, nomeDeDentro) -> a grade de um retalho de quatro lados: `lados` são as quatro listas de nomes em volta
 *  (cada uma começa onde a anterior termina) e `nome(i, j)` o nome de cada ponto, com i ao longo do lado 0 e j ao longo do lado 1. */
export function gradeDoRetalho(id, lados, nomeDeDentro) {
  const nU = lados[0].length - 1, nV = lados[1].length - 1;
  if (lados[2].length - 1 !== nU || lados[3].length - 1 !== nV) throw new Error(`preenchimento: o retalho '${id}' tem lados opostos de divisões diferentes`);
  const nome = (i, j) => (j === 0 ? lados[0][i] : i === nU ? lados[1][j] : j === nV ? lados[2][nU - i] : i === 0 ? lados[3][nV - j] : nomeDeDentro(i, j));
  return { id, lados, nU, nV, nome };
}

/** gradesDaRede(g) -> as grades dos retalhos de quatro lados da rede `g` (montada com `liso: false`), com a
 *  volta e o começo em que os nomes dos pontos de dentro reproduzem o Coons da rede ponto a ponto (a conferência do protótipo). */
export function gradesDaRede(g) {
  const dentro = new Map();
  for (const [ponto, o] of Object.entries(g.origens)) if (o.tipo === 'retalho') { if (!dentro.has(o.retalho)) dentro.set(o.retalho, []); dentro.get(o.retalho).push(ponto); }
  const grades = [];
  for (const [nomeDoRetalho, r] of Object.entries(g.retalhos)) {
    if (r.lados !== 4) continue;
    const volta = r.bordas.flatMap((b) => b.pontos.slice(0, -1));
    const onde = r.cantos.map((c) => volta.indexOf(c));
    const lado = (k) => { const de = onde[k], ate = onde[(k + 1) % 4]; const l = []; for (let q = de; ; q = (q + 1) % volta.length) { l.push(volta[q]); if (q === ate && l.length > 1) break; } return l; };
    const S = [0, 1, 2, 3].map(lado);
    const nomes = dentro.get(nomeDoRetalho) ?? [];
    const prefixo = nomes.length ? nomes[0].slice(0, nomes[0].lastIndexOf(`${nomeDoRetalho}.`)) : '';
    const nomeDeDentro = (i, j) => `${prefixo}${nomeDoRetalho}.${i}.${j}`;
    let achada = null;
    for (let giro = 0; giro < 4 && !achada; giro++) for (const virada of [false, true]) {
      const lados = virada ? [3, 2, 1, 0].map((k) => [...S[(giro + k) % 4]].reverse()) : [0, 1, 2, 3].map((k) => S[(giro + k) % 4]);
      if (lados[2].length !== lados[0].length || lados[3].length !== lados[1].length) continue;
      const gr = gradeDoRetalho(nomeDoRetalho, lados, nomeDeDentro); const P = (i, j) => g.pontos[gr.nome(i, j)]; const c = coons(P, gr.nU, gr.nV);
      let confere = true, contados = 0;
      for (let j = 1; j < gr.nV && confere; j++) for (let i = 1; i < gr.nU && confere; i++) { const p = P(i, j); contados++; if (!p || !(dist(p, c(i, j)) < 1e-9)) confere = false; }
      if (confere && contados === nomes.length) { achada = gr; break; }
    }
    if (!achada) throw new Error(`preenchimento: o miolo do retalho '${nomeDoRetalho}' não é o Coons da rede; monte a rede com liso: false`);
    grades.push(achada);
  }
  const vincos = new Set();
  for (const v of g.passo.vincos ?? []) if (v.nitidez) for (let k = 0; k + 1 < v.pontos.length; k++) vincos.add(chave(v.pontos[k], v.pontos[k + 1]));
  return { grades, vincos };
}

/** preencherGrades(grades, pos, { modo, vincos }) -> Map nome -> ponto: os pontos de dentro de cada grade pelo `modo` ('coons', 'vizinhas'
 *  ou 'fitas'), com `pos(nome)` a posição dos pontos da borda. Só os pontos das bordas entram na conta: o resultado não depende da ordem
 *  dos retalhos. */
export function preencherGrades(grades, pos, { modo = 'vizinhas', vincos = new Set(), razaoMaxima = RAZAO_MAXIMA } = {}) {
  const porAresta = new Map();
  for (const gr of grades) gr.lados.forEach((l, s) => { for (let k = 0; k + 1 < l.length; k++) { const c = chave(l[k], l[k + 1]); if (!porAresta.has(c)) porAresta.set(c, []); porAresta.get(c).push({ gr, s, k }); } });
  /* o ponto oposto ao ponto i do lado s, no retalho de quatro lados do outro lado desse lado: { gr, s, k, p } ou null */
  const foraSemCorte = (gr, s, i) => {
    const l = gr.lados[s]; const n = l.length - 1; const k = i < n ? i : n - 1; const c = chave(l[k], l[k + 1]);
    if (vincos.has(c)) return null;
    const outros = (porAresta.get(c) ?? []).filter((e) => e.gr !== gr);
    if (outros.length !== 1) return null;
    const o = outros[0]; const lq = o.gr.lados[o.s]; const kx = lq[o.k] === l[i] ? o.k : o.k + 1;
    if (lq[kx] !== l[i]) return null;
    const so = (o.s + 2) % 4; const ko = lq.length - 1 - kx;
    /* `inteiro`: o vizinho divide o lado inteiro, de canto a canto; `mesmo`: o lado oposto dele corre no sentido do nosso */
    const inteiro = lq.length === l.length && ((lq[0] === l[n] && lq[n] === l[0]) || (lq[0] === l[0] && lq[n] === l[n]));
    return { gr: o.gr, s: so, k: ko, p: pos(o.gr.lados[so][ko]), inteiro, mesmo: lq[0] === l[n] };
  };
  /* o corte da revisão de 2026-11-19: o lado em que, em algum ponto, a corda que atravessa o retalho passa de `razaoMaxima` vezes a corda
     até o ponto de fora fica inteiro sem vizinho (o ponto de fora entra na derivada multiplicado por perto dessa razão) */
  const cortes = new Map();
  const cortado = (gr, s) => {
    const c = `${gr.id}\u0000${s}`; if (cortes.has(c)) return cortes.get(c);
    const l = gr.lados[s]; const n = l.length - 1; const oposto = gr.lados[(s + 2) % 4];
    const corta = l.some((nome, i) => { const F = foraSemCorte(gr, s, i); return F ? !(dist(pos(nome), pos(oposto[n - i])) <= razaoMaxima * dist(F.p, pos(nome))) : false; });
    cortes.set(c, corta); return corta;
  };
  const fora = (gr, s, i) => (cortado(gr, s) ? null : foraSemCorte(gr, s, i));
  /* a mistura de uma linha: os pontos de fora (ou null), as duas pontas, e os pesos em t pelas cordas */
  const linha = (Fm, P0, P1, Fp) => { const h = dist(P0, P1); const h0 = Fm ? dist(Fm.p, P0) : null; const h1 = Fp ? dist(P1, Fp.p) : null; return (t) => pesosDaMistura(t, h0 || null, h, h1 || null); };
  /* o resíduo de um lado: cada ponto dele menos a mistura das duas pontas e, se `usaM` e `usaP`, dos pontos de fora de cada ponta ao longo
     da mesma curva. A fileira de fora de um retalho precisa da MESMA mistura das fileiras dele (a soma de Coons aplica uma mistura só ao
     longo de cada direção); quando o ponto de fora pedido não existe, devolve null, e a fileira de fora não entra. */
  const residuos = new Map();
  const residuoDoLado = (gr, s, usaM, usaP) => {
    const c = `${gr.id}\u0000${s}\u0000${usaM ? 1 : 0}${usaP ? 1 : 0}`; if (residuos.has(c)) return residuos.get(c);
    const l = gr.lados[s]; const n = l.length - 1; const P0 = pos(l[0]), P1 = pos(l[n]);
    const Fm = usaM ? fora(gr, (s + 3) % 4, gr.lados[(s + 3) % 4].length - 1) : null, Fp = usaP ? fora(gr, (s + 1) % 4, 0) : null;
    let r = null;
    if ((!usaM || Fm) && (!usaP || Fp)) { const w = linha(Fm, P0, P1, Fp); r = l.map((nome, k) => sub(pos(nome), comb(w(k / n), [Fm?.p, P0, P1, Fp?.p]))); }
    residuos.set(c, r); return r;
  };
  const saida = new Map();
  for (const gr of grades) {
    const { nU, nV } = gr; const P = (i, j) => pos(gr.nome(i, j));
    /* uma ordem: `d` 0 mistura primeiro ao longo de u (a é i), 1 ao longo de v (a é j); (a, b) -> (i, j) */
    const ordem = (d) => {
      const n1 = d === 0 ? nU : nV, n2 = d === 0 ? nV : nU; const pt = (a, b) => (d === 0 ? P(a, b) : P(b, a));
      /* os lados em volta, na ordem desta mistura: sM e sP são os das pontas da linha (a = 0 e a = n1); s0 e sN, os de b = 0 e b = n2 */
      const foraDaLinha = (b) => (d === 0 ? [fora(gr, 3, nV - b), fora(gr, 1, b)] : [fora(gr, 0, b), fora(gr, 2, nU - b)]);
      const foraDaColuna = (a) => (d === 0 ? [fora(gr, 0, a), fora(gr, 2, nU - a)] : [fora(gr, 3, nV - a), fora(gr, 1, a)]);
      if (modo === 'coons') { const c = coons(pt, n1, n2); return (a, b) => c(a, b); }
      if (modo === 'vizinhas') {
        const P1 = (a, b) => { const [Fm, Fp] = foraDaLinha(b); return comb(linha(Fm, pt(0, b), pt(n1, b), Fp)(a / n1), [Fm?.p, pt(0, b), pt(n1, b), Fp?.p]); };
        return (a, b) => {
          let [Fm, Fp] = foraDaColuna(a);
          const r0 = sub(pt(a, 0), P1(a, 0)), rN = sub(pt(a, n2), P1(a, n2));
          /* a fileira de fora entra com o resíduo dela pela mistura da nossa fileira vizinha (b = 0 ou n2): os mesmos pontos de fora */
          const residuoDeFora = (F, b, aoContrario) => { if (!F || !F.inteiro) return null; const [m, p] = foraDaLinha(b).map(Boolean); const igual = F.mesmo !== aoContrario; const r = residuoDoLado(F.gr, F.s, igual ? m : p, igual ? p : m); return r ? r[F.k] : null; };
          /* o lado 2 e o lado 3 do retalho correm ao contrário de a (i ou j crescente), e `mesmo` é contado no sentido do lado */
          const rm = residuoDeFora(Fm, 0, d === 1), rp = residuoDeFora(Fp, n2, d === 0);
          if (!rm) Fm = null; if (!rp) Fp = null;
          const w = linha(Fm, pt(a, 0), pt(a, n2), Fp)(b / n2);
          const p = P1(a, b), q = comb(w, [rm, r0, rN, rp]);
          return [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
        };
      }
      if (modo !== 'fitas') throw new Error(`preenchimento: modo '${modo}' não existe; use coons, ${MODOS.join(' ou ')}`);
      if (n1 < 2 || n2 < 2) { const c = coons(pt, n1, n2); return (a, b) => c(a, b); }
      /* as tangentes nos quatro cantos, pela diferença de três pontos da curva: t1 ao longo de a, t2 ao longo de b */
      const d3 = (p0, p1, p2, n) => comb([-1.5 * n, 2 * n, -0.5 * n], [p0, p1, p2]);
      const t1 = { '00': d3(pt(0, 0), pt(1, 0), pt(2, 0), n1), '0N': d3(pt(0, n2), pt(1, n2), pt(2, n2), n1), N0: d3(pt(n1, 0), pt(n1 - 1, 0), pt(n1 - 2, 0), -n1), NN: d3(pt(n1, n2), pt(n1 - 1, n2), pt(n1 - 2, n2), -n1) };
      const t2 = { '00': d3(pt(0, 0), pt(0, 1), pt(0, 2), n2), N0: d3(pt(n1, 0), pt(n1, 1), pt(n1, 2), n2), '0N': d3(pt(0, n2), pt(0, n2 - 1), pt(0, n2 - 2), -n2), NN: d3(pt(n1, n2), pt(n1, n2 - 1), pt(n1, n2 - 2), -n2) };
      const P1 = (a, b) => { const [H00, H10, H01, H11] = hermite(a / n1); const v = b / n2; return comb([H00, H01, H10 * (1 - v), H10 * v, H11 * (1 - v), H11 * v], [pt(0, b), pt(n1, b), t1['00'], t1['0N'], t1.N0, t1.NN]); };
      /* a fita do lado b = 0 (ou n2) menos a derivada em b da primeira mistura ali; a torção é a derivada das fitas da primeira mistura */
      const fita = (a, q) => { const u = a / n1; const [H00, H10, H01, H11] = hermite(u); return comb([1 - u - H00, u - H01, -H10, H10, -H11, H11], [t2[`0${q}`], t2[`N${q}`], t1['0N'], t1['00'], t1.NN, t1.N0]); };
      return (a, b) => {
        const [H00, H10, H01, H11] = hermite(b / n2);
        const r0 = sub(pt(a, 0), P1(a, 0)), rN = sub(pt(a, n2), P1(a, n2));
        const p = P1(a, b), q = comb([H00, H01, H10, H11], [r0, rN, fita(a, '0'), fita(a, 'N')]);
        return [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
      };
    };
    const F0 = ordem(0), F1 = ordem(1);
    for (let j = 1; j < nV; j++) for (let i = 1; i < nU; i++) { const a = F0(i, j), b = F1(j, i); saida.set(gr.nome(i, j), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]); }
  }
  return saida;
}

/** preencherRede(g, modo) -> { pontos, dentro, andou }: os pontos da rede `g` com o miolo dos retalhos de quatro lados refeito pelo `modo`;
 *  `dentro` são os nomes trocados e `andou` o maior deslocamento contra o Coons da rede (na unidade da rede, o metro). */
export function preencherRede(g, modo = 'vizinhas', opcoes = {}) {
  const { grades, vincos } = gradesDaRede(g);
  const novos = preencherGrades(grades, (nome) => g.pontos[nome], { modo, vincos, ...opcoes });
  const pontos = { ...g.pontos }; let andou = 0;
  for (const [nome, p] of novos) { andou = Math.max(andou, dist(p, g.pontos[nome])); pontos[nome] = p; }
  return { pontos, dentro: [...novos.keys()], andou };
}

/** alisarRede(g, pontos) -> pontos: o alisamento do miolo pela normal (`liso`, o padrão da rede) refeito aqui sobre os pontos dados, com os
 *  mesmos livres e pulados da `gaiolaPorRede` numa rede sem emenda declarada: livre é o miolo de valência 4 dos retalhos de quatro lados;
 *  sem laplaciano ficam a borda livre, o vinco, o canto e o ponto de valência diferente de 4. As provas conferem que, sobre o Coons da
 *  rede, ele devolve a rede de hoje. */
export function alisarRede(g, pontos) {
  const nomes = g.passo.vertices; const indice = new Map(nomes.map((v, k) => [v, k]));
  const faces = g.passo.faces.map((f) => f.map((v) => indice.get(v)));
  const usos = new Map(); const vizinhos = nomes.map(() => new Set());
  for (const f of faces) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; vizinhos[a].add(b); vizinhos[b].add(a); const c = a < b ? `${a},${b}` : `${b},${a}`; usos.set(c, (usos.get(c) ?? 0) + 1); });
  const livres = new Set(gradesDaRede(g).grades.flatMap((gr) => { const l = []; for (let j = 1; j < gr.nV; j++) for (let i = 1; i < gr.nU; i++) l.push(indice.get(gr.nome(i, j))); return l; }));
  const pulados = new Set();
  for (const [c, q] of usos) if (q === 1) for (const a of c.split(',')) pulados.add(Number(a));
  for (const v of g.passo.vincos ?? []) for (const id of v.pontos) pulados.add(indice.get(id));
  for (const id of g.passo.cantos ?? []) pulados.add(indice.get(id));
  vizinhos.forEach((vs, a) => { if (vs.size !== 4) { pulados.add(a); livres.delete(a); } });
  const r = alisarMioloNaNormal(nomes.map((v) => pontos[v]), faces, livres, pulados, {});
  const saida = { ...pontos };
  for (const a of livres) saida[nomes[a]] = r.posicoes[a];
  return saida;
}

/* a maior distância entre dois conjuntos de pontos de mesmo nome (na unidade deles) */
const maiorDiferenca = (A, B) => Object.keys(A).reduce((m, k) => Math.max(m, dist(A[k], B[k])), 0);

/* ---------- as provas ---------- */

/* a maior distância (na unidade da rede, o metro) entre os pontos da rede `gE`, montada pelo núcleo com `alisarSuperficie`, e os da
   `vizinhas` do protótipo sobre a rede `g0` (a mesma definição com `liso: false`); recusa se as duas não têm os mesmos pontos e faces */
export function contraPrototipo(g0, gE) {
  const a = Object.keys(g0.pontos), b = Object.keys(gE.pontos);
  if (a.length !== b.length || a.some((nome, k) => nome !== b[k]) || JSON.stringify(g0.passo.faces) !== JSON.stringify(gE.passo.faces)) throw new Error('preenchimento: a rede com alisarSuperficie não tem os mesmos pontos e faces da rede com liso: false');
  return maiorDiferenca(preencherRede(g0, 'vizinhas').pontos, gE.pontos);
}

const contexto = (pontos) => ({ vec: (p) => (typeof p === 'string' ? pontos[p] : p), num: Number });
/* a gaiola ajustada pelo passo `subdivisao` da rede, com os pontos dados (o ajuste do núcleo, com ou sem a energia, como o passo disser) */
function ajustar(passo, pontos) {
  const r = gaiolaDoPasso(passo, contexto(pontos));
  if (r.erro) throw new Error(r.erro.join(': '));
  return { gaiola: { ...r.gaiola, borda: passo.borda ?? 'suave' }, exatos: new Set((r.medidas ?? []).filter((m) => m.peso === Infinity).map((m) => m.indice)) };
}

/* a distância (mm) dos pontos de dentro à forma: a maior na chapa, a mais de 50 e a mais de 100 mm da borda */
function cotaDoMiolo(pontos, dentro, distanciaMm, aBordaMm) {
  let inteira = 0, a50 = 0, a100 = 0;
  for (const nome of dentro) { const p = pontos[nome].map((c) => c * 1000); const d = Math.abs(distanciaMm(p)); const b = aBordaMm(p); inteira = Math.max(inteira, d); if (b >= 50) a50 = Math.max(a50, d); if (b >= 100) a100 = Math.max(a100, d); }
  return [r4(inteira), r4(a50), r4(a100)];
}

/* a distância (mm) da superfície limite à analítica, nas mesmas 16 amostras por face de `medirAnalitica` (`energia-de-curvatura.mjs`), e a
   crista por ponto das curvas; sem a medida antiga das medianas, que esta prova não usa e custa a metade do tempo */
function medirAnalitica(Sa, gaiola, curvas, exatos) {
  const sup = superficieLimite(gaiola); let inteira = 0, a50 = 0, a100 = 0;
  gaiola.faces.forEach((f, fi) => {
    for (const canto of (f.length === 4 ? [0] : f.map((_, k) => k))) for (const u of [0, 0.25, 0.5, 0.75]) for (const v of [0, 0.25, 0.5, 0.75]) {
      const p = sup.avaliar(fi, u, v, { canto }).ponto.map((c) => c * 1000); const d = Math.abs(Sa.distancia(p)); const b = Sa.aBorda(p);
      inteira = Math.max(inteira, d); if (b >= 50) a50 = Math.max(a50, d); if (b >= 100) a100 = Math.max(a100, d);
    }
  });
  return { distanciaMm: r4(inteira), a50Mm: r4(a50), a100Mm: r4(a100), cristaPontual: curvas.map((c) => ({ nome: c.nome, ...cristaPontual(gaiola, c.gaiola, { exatos }) })) };
}

/** provaDasAnaliticas({ definicao, modos, superficies }) -> por superfície: a distância da cota do miolo à forma e a medida da superfície
 *  final (`medirAnalitica`), com o preenchimento de hoje e com cada modo, sem a energia e com a energia da etapa B */
export function provaDasAnaliticas({ definicao = {}, modos = MODOS, superficies = Object.keys(SUPERFICIES_ANALITICAS) } = {}) {
  return superficies.map((nome) => {
    const Sa = SUPERFICIES_ANALITICAS[nome]; const def = { ...definicaoAnalitica(nome, definicao), marcarCurvas: true };
    const gHoje = gaiolaPorRede(def), g0 = gaiolaPorRede({ ...def, liso: false }), gE = gaiolaPorRede({ ...def, alisarSuperficie: true });
    const indice = new Map(g0.passo.vertices.map((v, k) => [typeof v === 'string' ? v : v.nome ?? v[0], k]));
    const curvas = g0.passo.curvas.filter((c) => c.nome === 'h1' || c.nome === 'v1').map((c) => ({ nome: c.nome, gaiola: c.pontos.map((p) => indice.get(p)) }));
    const medir = (passo, pontos) => {
      const { gaiola, exatos } = ajustar(passo, pontos); const m = medirAnalitica(Sa, gaiola, curvas, exatos);
      return { distanciaMm: m.distanciaMm, a50Mm: m.a50Mm, a100Mm: m.a100Mm, crista: Object.fromEntries(m.cristaPontual.map((c) => [c.nome, c.maxima])), noCruzamento: Object.fromEntries(m.cristaPontual.map((c) => [c.nome, c.noCruzamento])) };
    };
    const coonsDaRede = preencherRede(g0, 'coons');
    const cota = (pontos) => cotaDoMiolo(pontos, coonsDaRede.dentro, Sa.distancia, Sa.aBorda);
    /* os pontos das curvas (as cotas exatas) contra a forma: o erro deles o preenchimento herda, qualquer que seja */
    const nasCurvas = Object.keys(g0.pontos).filter((p) => g0.origens[p] && g0.origens[p].tipo !== 'retalho');
    const saida = { superficie: nome, definicao, coonsRefeitoMm: r4(coonsDaRede.andou * 1000), curvasMm: cotaDoMiolo(g0.pontos, nasCurvas, Sa.distancia, Sa.aBorda), lisoRefeitoMm: r4(maiorDiferenca(gHoje.pontos, alisarRede(g0, g0.pontos)) * 1000),
      hoje: { cotaMm: cota(gHoje.pontos), cotaSemAlisarMm: cota(g0.pontos), semEnergia: medir(gHoje.passo, gHoje.pontos), semAlisarSemEnergia: medir(g0.passo, g0.pontos), comEnergia: medir(gE.passo, g0.pontos) } };
    for (const modo of modos) {
      const n0 = preencherRede(g0, modo);
      const liso = alisarRede(g0, n0.pontos);
      saida[modo] = { cotaMm: cota(n0.pontos), cotaAlisadaMm: cota(liso), andouMm: r4(n0.andou * 1000), semEnergia: medir(g0.passo, liso), semAlisarSemEnergia: medir(g0.passo, n0.pontos), comEnergia: medir(gE.passo, n0.pontos) };
    }
    saida.nucleo = { contraPrototipoMm: contraPrototipo(g0, gE) * 1000, cotaMm: cota(gE.pontos), comEnergia: medir(gE.passo, gE.pontos) };
    return saida;
  });
}

/** provaDaGrade({ modos }) -> a grade de razão 2 da revisão da etapa B (15 por 15 sobre 600 mm, a borda e as duas fileiras do meio exatas),
 *  com o miolo cotado pela forma (como na revisão), pelo Coons das fileiras exatas e por cada modo: a distância da cota à forma e o
 *  desvio da superfície a mais de 100 mm da borda, sem a opção (peso 1) e com a energia da etapa B (peso 0,003). */
export function provaDaGrade({ modos = MODOS, razoes = [1, 2] } = {}) {
  const FORMAS = { paraboloide: (x, z) => x * x + z * z, cilindro: (x) => 1 - Math.sqrt(1 - x * x), sela: (x, z) => (x * x - z * z) / 1.5, calota: (x, z) => Math.sqrt(0.25 - x * x - z * z) - 0.5 };
  const nx = 15; const saida = [];
  for (const [nome, f] of Object.entries(FORMAS)) for (const razao of razoes) {
    const a = 0.6 / (7 + 7 * razao); const xs = (i) => -0.3 + (i <= 7 ? i * a : 7 * a + (i - 7) * a * razao); const zs = (j) => -0.3 + (0.6 * j) / 14;
    const vertices = []; const faces = []; const k = (i, j) => j * nx + i;
    for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) vertices.push([xs(i), f(xs(i), zs(j)), zs(j)]);
    for (let j = 0; j + 1 < nx; j++) for (let i = 0; i + 1 < nx; i++) faces.push([k(i, j), k(i, j + 1), k(i + 1, j + 1), k(i + 1, j)]);
    const g = { vertices, faces, vincos: [], cantos: [], borda: 'suave' };
    const exata = (q) => { const i = q % nx, j = Math.floor(q / nx); return i === 0 || j === 0 || i === nx - 1 || j === nx - 1 || i === 7 || j === 7; };
    const medidas = (peso) => vertices.map((_, indice) => ({ indice, peso: exata(indice) ? Infinity : peso }));
    /* os quatro retalhos de 7 por 7 arestas entre as fileiras exatas */
    const grades = [[0, 0], [7, 0], [0, 7], [7, 7]].map(([i0, j0]) => {
      const lados = [Array.from({ length: 8 }, (_, q) => k(i0 + q, j0)), Array.from({ length: 8 }, (_, q) => k(i0 + 7, j0 + q)), Array.from({ length: 8 }, (_, q) => k(i0 + 7 - q, j0 + 7)), Array.from({ length: 8 }, (_, q) => k(i0, j0 + 7 - q))];
      return gradeDoRetalho(`${i0}.${j0}`, lados, (i, j) => k(i0 + i, j0 + j));
    });
    const desvio = (V) => {
      const sup = superficieLimite({ ...g, vertices: V }); let pior = 0;
      for (let fi = 0; fi < faces.length; fi++) for (const u of [0.25, 0.5, 0.75]) for (const v of [0.25, 0.5, 0.75]) { const p = sup.avaliar(fi, u, v).ponto; if (Math.min(0.3 - Math.abs(p[0]), 0.3 - Math.abs(p[2])) >= 0.1) pior = Math.max(pior, Math.abs(p[1] - f(p[0], p[2]))); }
      return r4(pior * 1000);
    };
    const medir = (V) => {
      let cota = 0; V.forEach((p, q) => { if (!exata(q)) cota = Math.max(cota, Math.abs(p[1] - f(p[0], p[2]))); });
      const gv = { ...g, vertices: V };
      return { cotaMm: r4(cota * 1000), semEnergiaMm: desvio(ajustarGaiolaAsMedidasComPeso(gv, medidas(1), null).vertices), comEnergiaMm: desvio(ajustarGaiolaAsMedidasComPeso(gv, medidas(0.003), { tipo: 'variacaoDeCurvatura' }).vertices) };
    };
    const linhaDaSaida = { forma: nome, razao, aForma: medir(vertices) };
    for (const modo of ['coons', ...modos]) { const novos = preencherGrades(grades, (q) => vertices[q], { modo }); const V = vertices.map((p, q) => novos.get(q) ?? p); linhaDaSaida[modo] = medir(V); }
    saida.push(linhaDaSaida);
  }
  return saida;
}

/* as chapas do neutro de uma chapa de prova por receita: hoje, hoje com a energia, e cada modo sem a energia e com ela */
function chapasDaReceita(nome, modos) {
  const neutro = (receita) => executarReceita({ ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined }).neutro.chapas[0];
  const hoje = neutro(receitaDeProva(nome, { marcarCurvas: true })); const nucleo = neutro(receitaDeProva(nome, { marcarCurvas: true, alisarSuperficie: true }));
  const def = { ...(nome === 'rede-sem-ruido' ? definicaoDaRede({ ruido: false }) : definicaoDaEmenda(nome)), marcarCurvas: true };
  const gHoje = gaiolaPorRede(def), g0 = gaiolaPorRede({ ...def, liso: false }), gE = gaiolaPorRede({ ...def, alisarSuperficie: true });
  const refeita = ajustar(gE.passo, gE.pontos); let dif = 0;
  refeita.gaiola.vertices.forEach((p, k) => { dif = Math.max(dif, dist(p, nucleo.vertices[k])); });
  if (!(dif < 1e-12) || refeita.gaiola.vertices.length !== nucleo.vertices.length || hoje.vertices.length !== nucleo.vertices.length) throw new Error(`${nome}: a gaiola refeita difere da do passo em ${dif}`);
  const etapaB = { ...nucleo, vertices: ajustar(gE.passo, g0.pontos).gaiola.vertices };
  const porModo = {};
  for (const modo of modos) {
    const n0 = preencherRede(g0, modo);
    const liso = alisarRede(g0, n0.pontos);
    porModo[modo] = { pontos: n0.pontos, liso, dentro: n0.dentro, andouMm: r4(n0.andou * 1000), semEnergia: { ...hoje, vertices: ajustar(g0.passo, liso).gaiola.vertices }, semAlisarSemEnergia: { ...hoje, vertices: ajustar(g0.passo, n0.pontos).gaiola.vertices }, comEnergia: { ...etapaB, vertices: ajustar(gE.passo, n0.pontos).gaiola.vertices } };
  }
  /* `nucleo` é a chapa do neutro da receita com a opção, como o núcleo a monta; `etapaB`, o Coons da rede com a energia, que só sai daqui */
  return { hoje, nucleo, etapaB, porModo, exatos: refeita.exatos, gHoje, g0, gE, contraPrototipoMm: contraPrototipo(g0, gE) * 1000, dentro: preencherRede(g0, 'coons').dentro, lisoRefeitoMm: r4(maiorDiferenca(gHoje.pontos, alisarRede(g0, g0.pontos)) * 1000) };
}

/** provaDasEmendas({ modos }) -> por chapa emendada: a cota do miolo contra a desenhada (mm, em y) e a medida na curva `emenda` */
export function provaDasEmendas({ modos = MODOS, nomes = ['emenda-g2', 'emenda-dupla', 'emenda-g1'] } = {}) {
  return nomes.map((nome) => {
    const c = chapasDaReceita(nome, modos);
    const medir = (chapa) => { const m = medirEmenda(nome, chapa, c.exatos); return { inclinacao: m.inclinacao, naCurva: m.naCurva, aoLado: m.aoLado, crista: m.cristaPontual.maxima, salto: m.salto, distanciaJuntoMm: m.distanciaJuntoMm, distanciaMm: m.distanciaMm }; };
    const cota = (pontos) => cotaDoMiolo(pontos, c.dentro, (p) => p[1] - pontoDaEmenda(nome, p[0], p[2])[1], (p) => Math.min(p[0], 600 - p[0], p[2], 400 - p[2]));
    const saida = { chapa: nome, lisoRefeitoMm: c.lisoRefeitoMm, hoje: { cotaMm: cota(c.gHoje.pontos), cotaSemAlisarMm: cota(c.g0.pontos), semEnergia: medir(c.hoje), comEnergia: medir(c.etapaB) } };
    for (const modo of modos) saida[modo] = { cotaMm: cota(c.porModo[modo].pontos), cotaAlisadaMm: cota(c.porModo[modo].liso), andouMm: c.porModo[modo].andouMm, semEnergia: medir(c.porModo[modo].semEnergia), semAlisarSemEnergia: medir(c.porModo[modo].semAlisarSemEnergia), comEnergia: medir(c.porModo[modo].comEnergia) };
    saida.nucleo = { contraPrototipoMm: c.contraPrototipoMm, cotaMm: cota(c.gE.pontos), comEnergia: medir(c.nucleo) };
    return saida;
  });
}

/** provaDaRede({ modos }) -> a `rede-sem-ruido`: a cota do miolo contra `painel` (mm, em y), as viradas por metro e a distância ao painel */
export function provaDaRede({ modos = MODOS } = {}) {
  const c = chapasDaReceita('rede-sem-ruido', modos);
  const cota = (pontos) => cotaDoMiolo(pontos, c.dentro, (p) => p[1] - painel(p[0], p[2]), (p) => Math.min(p[0], 1000 - p[0], p[2], 500 - p[2]));
  const saida = { chapa: 'rede-sem-ruido', lisoRefeitoMm: c.lisoRefeitoMm, hoje: { cotaMm: cota(c.gHoje.pontos), cotaSemAlisarMm: cota(c.g0.pontos), semEnergia: medirRede(c.hoje), comEnergia: medirRede(c.etapaB) } };
  for (const modo of modos) saida[modo] = { cotaMm: cota(c.porModo[modo].pontos), cotaAlisadaMm: cota(c.porModo[modo].liso), andouMm: c.porModo[modo].andouMm, semEnergia: medirRede(c.porModo[modo].semEnergia), semAlisarSemEnergia: medirRede(c.porModo[modo].semAlisarSemEnergia), comEnergia: medirRede(c.porModo[modo].comEnergia) };
  saida.nucleo = { contraPrototipoMm: c.contraPrototipoMm, cotaMm: cota(c.gE.pontos), comEnergia: medirRede(c.nucleo) };
  return saida;
}

/** provaDaChapaLateral({ passo }) -> por retalho da chapa lateral de prova (`procedural/nucleo/fixtures/gaiola-por-rede-prova.js`, com dois
 *  vincos, a janela em gota e dois retalhos de cinco lados): a maior distância (mm) da superfície limite à forma desenhada (`altura`), em
 *  nove amostras por face da gaiola, sem a opção, com a opção e o preenchimento padrão (a etapa B) e com a opção como o núcleo a monta;
 *  e a cota do miolo com o preenchimento padrão e com o do núcleo. A face é do retalho do primeiro ponto de dentro que ela tem. */
export function provaDaChapaLateral({ passo = 40 } = {}) {
  const gHoje = gaiolaPorRede(definicaoDaChapaLateral({ passo })), g0 = gaiolaPorRede(definicaoDaChapaLateral({ passo, extra: { liso: false } })), gE = gaiolaPorRede(definicaoDaChapaLateral({ passo, extra: { alisarSuperficie: true } }));
  const fora = (p) => Math.abs(p[1] * 1000 - alturaDaChapaLateral(p[0] * 1000, p[2] * 1000));
  const final = (g, pontos) => {
    const sup = superficieLimite(ajustar(g.passo, pontos).gaiola); const m = {};
    g.passo.faces.forEach((f, fi) => {
      const dentro = f.find((v) => g.origens[v]?.tipo === 'retalho'); if (!dentro) return; const r = g.origens[dentro].retalho;
      for (const u of [0.25, 0.5, 0.75]) for (const v of [0.25, 0.5, 0.75]) m[r] = Math.max(m[r] ?? 0, fora(sup.avaliar(fi, u, v, { canto: 0 }).ponto));
    });
    return m;
  };
  const cota = (pontos) => { const m = {}; for (const [p, o] of Object.entries(g0.origens)) if (o.tipo === 'retalho') m[o.retalho] = Math.max(m[o.retalho] ?? 0, fora(pontos[p])); return m; };
  const sem = final(gHoje, gHoje.pontos), etapaB = final(gE, g0.pontos), nucleo = final(gE, gE.pontos), c0 = cota(g0.pontos), cE = cota(gE.pontos);
  return { contraPrototipoMm: contraPrototipo(g0, gE) * 1000, retalhos: Object.fromEntries(Object.keys(sem).map((r) => [r, { lados: g0.retalhos[r].lados, semAOpcaoMm: r4(sem[r]), etapaBMm: r4(etapaB[r]), nucleoMm: r4(nucleo[r]), cotaPadraoMm: r4(c0[r]), cotaDoNucleoMm: r4(cE[r]) }])) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2); const qual = args.find((a) => !a.startsWith('--'));
  const opcao = (nome) => { const a = args.find((x) => x.startsWith(`--${nome}=`)); return a == null ? null : a.slice(nome.length + 3); };
  const opcoes = { ...(opcao('modos') ? { modos: opcao('modos').split(',') } : {}), ...(opcao('definicao') ? { definicao: JSON.parse(opcao('definicao')) } : {}), ...(opcao('superficie') ? { superficies: [opcao('superficie')] } : {}) };
  const provas = { analiticas: provaDasAnaliticas, grade: provaDaGrade, emendas: provaDasEmendas, rede: provaDaRede, lateral: provaDaChapaLateral };
  if (!provas[qual]) { console.error('uso: preenchimento-do-miolo.mjs analiticas | grade | emendas | rede | lateral [--definicao=<json>] [--superficie=<nome>] [--modos=vizinhas,fitas]'); process.exit(2); }
  process.stdout.write(`${JSON.stringify(provas[qual](opcoes), null, 1)}\n`);
}
