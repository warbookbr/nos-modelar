/* divisao-por-contorno.js (operação) — `divisaoPorContorno`: uma chapa se divide em partes ao longo de um contorno desenhado numa
   vista. As faces que o contorno atravessa são cortadas na curva, e a região de dentro vira parte nova (nome e material), sem sair
   da peça. Plano `docs/modelar/planos/2026-11-18-divisao-por-contorno.md`; as medidas estão em
   `docs/modelar/banco-de-provas/divisao-por-contorno-2026-11-18/README.md`.

   O CONTORNO e a VISTA são os da `aberturaPorContorno` (`curva2d.js` e `quadroDaVista`, importados de lá sem mudança): o desenho
   fica num plano perpendicular ao eixo da vista e é projetado ao longo dele sobre a chapa.

   O CORTE É PRÓPRIO. O corte da abertura é a booleana de um prisma contra um sólido fechado: ele tira a região de dentro e fecha o
   vão com uma parede nova, de modo que a soma das áreas muda e a pele deixa de ser uma só. Dividir sem tirar pede o contrário: a
   mesma superfície, com arestas novas sobre ela. Por isso o corte aqui é o traço do contorno sobre os triângulos de cada face:
     1. cada face perto do contorno é vista pelos triângulos que o adaptador desenha (`triangularFace`), que são a superfície dela;
     2. cada aresta desses triângulos que um lado do contorno cruza ganha um vértice no cruzamento, sobre a aresta (as duas faces da
        aresta o usam, e a casca continua fechada), e cada canto do contorno ganha um vértice no plano do triângulo em que cai;
     3. cada triângulo é dividido pelos trechos do contorno que passam por ele, e os pedaços côncavos se partem em convexos;
     4. o lado de cada pedaço sai do sentido do contorno (o de dentro fica à esquerda do contorno anti-horário), e as faces inteiras
        de dentro são alcançadas a partir dos pedaços de dentro, sem atravessar a borda nova. O pedaço marcado de fora que essa
        busca alcançasse denunciaria uma borda aberta, e a operação recusa em vez de marcar a chapa inteira.
   Todo vértice novo fica sobre uma aresta ou sobre o plano de um triângulo de antes, então a superfície não muda: as faces que o
   contorno não toca ficam com o id e os cantos, a face cortada fica com o id no maior pedaço, e os outros pedaços e os vértices
   novos ganham id no bloco do passo.

   O ENCAIXE. O cruzamento a menos de `encaixe` (fração do comprimento da aresta, padrão 0,05) de uma ponta da aresta usa o vértice
   da ponta, e o canto do contorno a menos disso de um vértice do triângulo usa esse vértice: a borda passa pelo vértice que já
   existe em vez de cortar uma lasca ao lado dele, e se afasta do contorno no máximo essa fração da aresta. A superfície continua a
   mesma, porque nenhum vértice de antes se move. O pedaço que ainda assim sai abaixo do limite de face fina do projeto
   (`LIMITE_DE_FACE_FINA`) faz a operação recusar com a medida, sem mexer na malha.

   OS EMPATES. O contorno de cotas redondas passa exatamente por vértices e arestas da malha. O sinal zero é decidido como se a malha
   estivesse deslocada de uma distância menor que qualquer outra (`ladoDoVertice`, `ladoDoPonto`), sem mudar coordenada nenhuma, e o
   cruzamento que cai sobre um vértice usa o vértice. O canto do contorno sobre uma aresta é um vértice só, e as passagens que caem no
   mesmo lugar do contorno são postas na ordem que alterna entrar e sair (`alternar`).

   O BICO. Onde os dois lados de um bico mais estreito que o encaixe caem sobre a mesma aresta, a borda passaria por ela nos dois
   sentidos e a parte não teria largura. O trecho de até duas vezes o encaixe da maior aresta do triângulo sai da borda (a ponta do
   bico é aparada), e o mais longo recusa com o lugar.

   AS ORIGENS. A face cortada continua sendo a mesma superfície: o passo anota em `st.pedacosDaDivisao` os pedaços novos de cada face,
   e a resolução de origem do núcleo (`comPedacosDaDivisao`, em `nucleo.js`) entrega os pedaços logo depois da face, qualquer que seja o
   jeito de o gerador guardar as faces (a lista da subdivisão, a grade do plano, o mapa de cópias do espelha, a face nomeada de um cubo).
   A seleção pela origem continua cobrindo o objeto inteiro, e uma segunda divisão acha as faces da primeira. A origem citada dentro
   de outra (o `de` de uma cópia) resolve sem os pedaços, porque a cópia conhece as faces da fonte como eram.

   AS FACES QUE O CONTORNO SÓ ENCOSTA. A face cujos pedaços caem todos do mesmo lado, sem vértice novo, fica como estava, com o id e os
   cantos na mesma ordem: o contorno que corre sobre as arestas dela não a corta.

   A CAMADA (`sentido: '+'` ou `'-'`), como na abertura: no corpo que a reta do eixo atravessa mais de uma vez, corta só a camada
   vista desse lado. A chapa fechada (com espessura) tem duas peles por camada, e as duas são cortadas; a seleção aberta tem uma.

   AS RECUSAS, todas antes de mexer na malha: contorno que se cruza, ponto do contorno fora da chapa na vista, contorno que cruza a
   borda da chapa ou a parede de um vão, chapa atravessada mais de uma vez sem `sentido`, contorno que cabe inteiro numa face,
   espinho que entra e sai pelo mesmo vértice, bico mais estreito que o encaixe, pedaço fino e face que já é de outra parte sem
   `substituir: true`. */
import { contornoPorTrechos, ErroDeCurva } from '../curva2d.js';
import { diagnosticarContorno, limparContorno } from '../contorno.js';
import { convexo, desvioDoPlano, fundir, lequeDe, melhorInicio, pedacosConvexos } from '../pedacos-convexos.js';
import { triangularFace } from '../triangulacao-face.js';
import { LIMITE_DE_FACE_FINA } from '../topologia.js';
import { quadroDaVista, tirarValenciaDois } from './abertura-por-contorno.js';

/** A fração da aresta abaixo da qual o cruzamento usa o vértice da ponta. */
export const ENCAIXE_PADRAO = 0.05;
const ENCAIXE_MAXIMO = 0.25;
const SEGMENTOS_ARCO_PADRAO = 4;
const SEGMENTOS_MAXIMOS = 4096;
/* a face cuja projeção na vista tem área abaixo desta fração do quadrado do maior lado dela é vista de perfil */
const PERFIL = 1e-9;
/* o desvio do próprio plano, como fração do tamanho, abaixo do qual dois pedaços da mesma face se juntam */
const PLANO = 1e-9;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const tamanho = (a) => Math.hypot(a[0], a[1], a[2]);
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/* OS EMPATES. O contorno de cotas redondas passa exatamente por vértices e por arestas da malha, e o sinal zero decidido caso a caso
   dava respostas que não cabem juntas (um trecho entrava num triângulo e não saía). Os dois predicados abaixo decidem o zero como se
   a malha inteira estivesse deslocada de [e, e²] na vista, com e menor que qualquer distância: é uma posição de verdade, então todas
   as respostas cabem juntas, e nenhuma coordenada muda. O cruzamento que essa decisão põe a distância nula de um vértice usa o
   vértice, pelo encaixe. */
const ladoDoVertice = (p, q, A) => { const v = orient(p, q, A); if (v !== 0) return v > 0; const dy = q[1] - p[1]; return dy !== 0 ? dy < 0 : q[0] - p[0] > 0; };
const ladoDoPonto = (A, B, p) => { const v = orient(A, B, p); if (v !== 0) return v > 0; const dy = B[1] - A[1]; return dy !== 0 ? dy > 0 : B[0] - A[0] < 0; };
/* dois pontos do contorno a menos disto, em comprimento de lado, são o mesmo lugar */
const MESMO_LUGAR = 1e-9;
const chave = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const mm = (x) => (x * 1000).toFixed(2);
const texto2 = (p) => `[${mm(p[0])}, ${mm(p[1])}] mm`;

function newell(pts) {
  const n = [0, 0, 0];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/** A razão de face fina do projeto, pela conta de `topologia.js`: área / maior aresta². */
export function razaoDaFace(pts) {
  let maior = 0;
  for (let k = 0; k < pts.length; k++) maior = Math.max(maior, tamanho(sub(pts[k], pts[(k + 1) % pts.length])));
  return maior > 0 ? tamanho(newell(pts)) / 2 / (maior * maior) : 0;
}

function pontoNoLaco(p, pts) {
  let dentro = false;
  for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) {
    const a = pts[k], b = pts[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro;
  }
  return dentro;
}

/* A triangulação de um laço simples na vista (com cantos alinhados) cujo pior triângulo é o melhor possível, pela razão de face
   fina medida no espaço: programação dinâmica sobre os pares de cantos. O triângulo vale quando gira no sentido do laço, não tem
   outro canto dentro nem sobre ele e os lados dele não cruzam lado nenhum do laço. Devolve os triângulos, ou null quando não há
   triangulação assim. O leque de orelhas escolhidas uma a uma deixava para o fim o triângulo quase alinhado com um vértice distante. */
function melhorTriangulacao(ids, p2, p3, sinal) {
  const n = ids.length; const q = ids.map(p2); const r = ids.map(p3);
  const cruzaLado = (a, b) => {
    for (let k = 0; k < n; k++) {
      const c = k, d = (k + 1) % n;
      if (c === a || c === b || d === a || d === b) continue;
      if (orient(q[a], q[b], q[c]) * orient(q[a], q[b], q[d]) < 0 && orient(q[c], q[d], q[a]) * orient(q[c], q[d], q[b]) < 0) return true;
    }
    return false;
  };
  const vale = (i, k, j) => {
    const area = orient(q[i], q[k], q[j]) * sinal;
    const maior = Math.max(dist2(q[i], q[k]), dist2(q[k], q[j]), dist2(q[j], q[i]));
    if (!(area > 1e-14 * maior * maior)) return false;
    for (let m = 0; m < n; m++) {
      if (m === i || m === k || m === j) continue;
      if (orient(q[i], q[k], q[m]) * sinal >= 0 && orient(q[k], q[j], q[m]) * sinal >= 0 && orient(q[j], q[i], q[m]) * sinal >= 0) return false;
    }
    return !cruzaLado(i, k) && !cruzaLado(k, j) && !cruzaLado(j, i);
  };
  const nota = Array.from({ length: n }, () => new Float64Array(n).fill(-1));
  const apice = Array.from({ length: n }, () => new Int32Array(n).fill(-1));
  for (let i = 0; i + 1 < n; i++) nota[i][i + 1] = Infinity;
  for (let vao = 2; vao < n; vao++) for (let i = 0; i + vao < n; i++) {
    const j = i + vao;
    for (let k = i + 1; k < j; k++) {
      if (nota[i][k] < 0 || nota[k][j] < 0 || !vale(i, k, j)) continue;
      const m = Math.min(nota[i][k], nota[k][j], razaoDaFace([r[i], r[k], r[j]]));
      if (m > nota[i][j]) { nota[i][j] = m; apice[i][j] = k; }
    }
  }
  if (nota[0][n - 1] < 0) return null;
  const tri = [];
  const desce = (i, j) => { if (j - i < 2) return; const k = apice[i][j]; tri.push([ids[i], ids[k], ids[j]]); desce(i, k); desce(k, j); };
  desce(0, n - 1);
  return tri;
}

/* Põe as passagens do contorno por um triângulo na ordem em que ele as faz: pela posição no contorno e, entre as que caem no mesmo
   lugar dele (as que o encaixe leva ao mesmo vértice), na ordem que alterna entrar e sair com as vizinhas. Devolve false quando
   nenhuma ordem alterna. */
function alternar(eventos) {
  if (!eventos.length) return true;
  eventos.sort((m, n) => m.s - n.s);
  const grupos = [];
  for (const ev of eventos) { const g = grupos[grupos.length - 1]; if (g && ev.s - g[g.length - 1].s <= MESMO_LUGAR) g.push(ev); else grupos.push([ev]); }
  const saldo = grupos.map((g) => g.reduce((n, ev) => n + (ev.entra ? 1 : -1), 0));
  if (saldo.some((n) => Math.abs(n) > 1)) return false;
  const ancora = saldo.findIndex((n) => n !== 0);
  /* o grupo com uma passagem a mais começa e termina por ela; o grupo par começa pelo contrário do fim do anterior, e, sem âncora, por entrar */
  const comeca = new Array(grupos.length);
  let fim = ancora < 0 ? false : null;
  for (let j = 0; j < grupos.length; j++) {
    const k = ancora < 0 ? j : (ancora + j) % grupos.length;
    if (saldo[k] !== 0) { const tipo = saldo[k] > 0; if (fim !== null && fim === tipo) return false; comeca[k] = tipo; fim = tipo; } else { comeca[k] = !fim; }
  }
  if (ancora >= 0 && fim === comeca[ancora]) return false;
  const ordenados = [];
  grupos.forEach((g, k) => {
    const entram = g.filter((ev) => ev.entra), saem = g.filter((ev) => !ev.entra);
    let tipo = comeca[k];
    while (entram.length || saem.length) { const fonte = tipo ? entram : saem; if (!fonte.length) return; ordenados.push(fonte.shift()); tipo = !tipo; }
  });
  if (ordenados.length !== eventos.length) return false;
  eventos.splice(0, eventos.length, ...ordenados);
  return eventos.length % 2 === 0;
}

/**
 * dividirMalhaPorContorno({ V, F, ids, quadro, poligono, sentido, encaixe }) -> { erro, ref } | { faces, dentro, vertices, medidas }
 * A conta da divisão, sem mexer na malha. `V` é o mapa de vértices, `F` o de faces (`{ vs }`), `ids` as faces da chapa, `quadro` o de
 * `quadroDaVista` e `poligono` o contorno já discretizado, em [u, v].
 * Devolve `vertices` (as posições dos vértices novos; o vértice novo k aparece nos pedaços como o id negativo -1 - k), `faces` (para
 * cada face cortada, os pedaços `{ vs, dentro }`, o maior primeiro), `dentro` (as faces inteiras da região de dentro) e `medidas`.
 */
export function dividirMalhaPorContorno({ V, F, ids, quadro, poligono, sentido = null, encaixe = ENCAIXE_PADRAO }) {
  const incoerente = (onde) => ({ ref: 'contorno', erro: `a divisão não fechou a borda (${onde}): o contorno passa rente a um vértice ou a uma aresta da chapa de um jeito que a conta do traço não resolve; mova o desenho uma fração de milímetro ou troque o valor do encaixe` });
  let P;
  try { P = limparContorno(poligono, { colineares: true }); } catch (e) { return { ref: 'contorno', erro: `o contorno não tem forma: ${e.message}` }; }
  let area2 = 0;
  for (let k = 0; k < P.length; k++) area2 += P[k][0] * P[(k + 1) % P.length][1] - P[(k + 1) % P.length][0] * P[k][1];
  if (area2 < 0) P.reverse();
  const N = P.length;
  const caixa = [Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1]))];

  /* a malha na vista: [u, v, w] de cada vértice, com w ao longo do eixo; os vértices novos têm id negativo */
  const novos = []; const novos2 = [];
  const naVista = new Map();
  const p2 = (v) => {
    if (v < 0) return novos2[-1 - v];
    let r = naVista.get(v);
    if (!r) { const p = V.get(v); const l = quadro.identidade ? p : quadro.local(p); r = [l[quadro.u], l[quadro.v], l[quadro.eixo]]; naVista.set(v, r); }
    return r;
  };
  const p3 = (v) => (v < 0 ? novos[-1 - v] : V.get(v));
  const criar = (pos, uv) => { novos.push(pos); novos2.push(uv); return -novos.length; };

  /* as faces da chapa cuja caixa na vista toca a do contorno, e as que dividem um vértice com elas (a vizinha de uma aresta que
     ganha vértice novo precisa recebê-lo): só elas podem ser cortadas ou ficar dentro */
  const daVolta = new Set();
  for (const f of ids) {
    const vs = F.get(f).vs;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const v of vs) { const q = p2(v); if (q[0] < a0) a0 = q[0]; if (q[0] > a1) a1 = q[0]; if (q[1] < b0) b0 = q[1]; if (q[1] > b1) b1 = q[1]; }
    if (a1 < caixa[0] || a0 > caixa[2] || b1 < caixa[1] || b0 > caixa[3]) continue;
    for (const v of vs) daVolta.add(v);
  }
  const perto = ids.filter((f) => F.get(f).vs.some((v) => daVolta.has(v)));
  const triangulosDe = (f) => { const vs = F.get(f).vs; return triangularFace(vs.map((v) => V.get(v))).map((t) => t.map((k) => vs[k])); };
  const tri = [];
  for (const f of perto) for (const t of triangulosDe(f)) {
    const [a, b, c] = t.map(p2);
    const maior = Math.max(dist2(a, b), dist2(b, c), dist2(c, a));
    const s = orient(a, b, c);
    tri.push({ f, v: t, sinal: Math.abs(s) <= PERFIL * maior * maior ? 0 : Math.sign(s) });
  }

  /* a chapa fechada tem duas peles por camada; a seleção aberta tem uma */
  const usosDaAresta = new Map();
  for (const f of ids) { const vs = F.get(f).vs; for (let k = 0; k < vs.length; k++) { const ch = chave(vs[k], vs[(k + 1) % vs.length]); usosDaAresta.set(ch, (usosDaAresta.get(ch) ?? 0) + 1); } }
  let fechada = true;
  for (const n of usosDaAresta.values()) if (n !== 2) { fechada = false; break; }
  const pelesPorCamada = fechada ? 2 : 1;

  /* onde a reta do eixo de cada ponto do contorno fura a chapa, do lado de quem olha para o outro */
  let escalaW = 0;
  for (const t of tri) for (const v of t.v) escalaW = Math.max(escalaW, Math.abs(p2(v)[2]));
  const deQuemOlha = sentido === '-' ? (x, y) => x - y : (x, y) => y - x;
  let limite = null; let seguinte = null;
  const peles = new Uint16Array(N);   // quantas peles da camada a reta de cada canto do contorno fura
  for (let k = 0; k < N; k++) {
    const p = P[k]; const furos = [];
    for (const t of tri) {
      if (!t.sinal) continue;
      const [a, b, c] = t.v.map(p2);
      const wa = orient(b, c, p) * t.sinal, wb = orient(c, a, p) * t.sinal, wc = orient(a, b, p) * t.sinal;
      if (wa < 0 || wb < 0 || wc < 0) continue;
      furos.push((wa * a[2] + wb * b[2] + wc * c[2]) / (wa + wb + wc));
    }
    furos.sort(deQuemOlha);
    const unicos = furos.filter((w, j) => j === 0 || Math.abs(w - furos[j - 1]) > 1e-9 * (1 + escalaW));
    if (!unicos.length) return { ref: 'contorno', erro: `o ponto ${texto2(p)} do contorno fica fora da chapa vista ${quadro.nome}: a reta do eixo por ele não toca nenhuma face da seleção; desenhe o contorno inteiro sobre a chapa` };
    if (sentido == null) {
      if (unicos.length > pelesPorCamada) return { ref: 'sentido', erro: `a reta do eixo pelo ponto ${texto2(p)} do contorno fura a chapa ${unicos.length} vezes, e uma camada dela tem ${pelesPorCamada} pele(s): a divisão cortaria todas as camadas; declare sentido ('+' ou '-'), o lado do eixo de onde se olha a camada que se divide` };
      peles[k] = unicos.length;
      continue;
    }
    peles[k] = Math.min(pelesPorCamada, unicos.length);
    const daCamada = unicos[Math.min(pelesPorCamada, unicos.length) - 1];
    if (limite == null || deQuemOlha(limite, daCamada) < 0) limite = daCamada;
    if (unicos.length > pelesPorCamada && (seguinte == null || deQuemOlha(seguinte, unicos[pelesPorCamada]) > 0)) seguinte = unicos[pelesPorCamada];
  }
  let candidatas = new Set(perto);
  if (sentido != null && seguinte != null) {
    if (!(deQuemOlha(limite, seguinte) < 0)) return { ref: 'sentido', erro: `as duas camadas da chapa se sobrepõem em profundidade nos pontos do contorno (a de trás da primeira chega a ${mm(limite)} mm e a da frente da seguinte a ${mm(seguinte)} mm no eixo): não há plano que separe a camada que se divide; divida por outra vista` };
    const corte = (limite + seguinte) / 2;
    candidatas = new Set(perto.filter((f) => F.get(f).vs.every((v) => deQuemOlha(p2(v)[2], corte) < 0)));
  }
  const T = tri.filter((t) => candidatas.has(t.f));

  /* ---- os cruzamentos: cada aresta dos triângulos contra cada lado do contorno ---- */
  const semBorda = (q0, quadroNome) => ({ ref: 'contorno', erro: `o contorno toca ou cruza a borda da chapa ou a parede de um vão em ${texto2(q0)}, vista ${quadroNome}: a divisão corta só a pele da chapa, e o contorno precisa ficar inteiro sobre ela` });
  const reais = new Map();
  for (const f of candidatas) { const vs = F.get(f).vs; for (let k = 0; k < vs.length; k++) { const ch = chave(vs[k], vs[(k + 1) % vs.length]); reais.set(ch, (reais.get(ch) ?? 0) + 1); } }
  const lados = P.map((p, k) => { const q = P[(k + 1) % N]; return [p, q, Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]; });
  const nosDaAresta = new Map();
  const cantoUsado = new Uint16Array(N); const cantoNaAresta = new Uint8Array(N);
  const medidas = { cruzamentos: 0, encaixados: 0, cantos: 0, cantosEncaixados: 0, bicosAparados: 0, facesCortadas: 0, pedacos: 0, desvioDoEncaixe: 0 };
  for (const t of T) for (let e = 0; e < 3; e++) {
    const x = t.v[e], y = t.v[(e + 1) % 3];
    const ch = chave(x, y);
    if (nosDaAresta.has(ch)) continue;
    const u = Math.min(x, y), v = Math.max(x, y);
    const A = p2(u), B = p2(v);
    const nos = []; const doCanto = new Map();
    nosDaAresta.set(ch, nos);
    const a0 = Math.min(A[0], B[0]), a1 = Math.max(A[0], B[0]), b0 = Math.min(A[1], B[1]), b1 = Math.max(A[1], B[1]);
    if (a1 < caixa[0] || a0 > caixa[2] || b1 < caixa[1] || b0 > caixa[3]) continue;
    for (let k = 0; k < N; k++) {
      const [p, q, u0, v0, u1, v1] = lados[k];
      if (a1 < u0 || a0 > u1 || b1 < v0 || b0 > v1) continue;
      if (ladoDoVertice(p, q, A) === ladoDoVertice(p, q, B)) continue;
      const para = ladoDoPonto(A, B, q);
      if (ladoDoPonto(A, B, p) === para) continue;
      const d1 = orient(p, q, A), d2 = orient(p, q, B), d3 = orient(A, B, p), d4 = orient(A, B, q);
      const t1 = d1 / (d1 - d2);
      const onde = [A[0] + (B[0] - A[0]) * t1, A[1] + (B[1] - A[1]) * t1];
      if (reais.has(ch) && reais.get(ch) !== 2) return semBorda(onde, quadro.nome);
      /* o canto do contorno que cai sobre a aresta é o próprio cruzamento: um vértice só, para os dois lados que chegam a ele */
      const tc = d3 / (d3 - d4);
      const canto = tc <= MESMO_LUGAR ? k : tc >= 1 - MESMO_LUGAR ? (k + 1) % N : null;
      if (canto != null) cantoNaAresta[canto] = 1;
      let id = canto != null ? doCanto.get(canto) : undefined;
      if (id === undefined) {
        if (t1 <= encaixe) id = u; else if (t1 >= 1 - encaixe) id = v;
        else { const a3 = V.get(u), b3 = V.get(v); id = criar([0, 1, 2].map((c) => a3[c] + (b3[c] - a3[c]) * t1), [onde[0], onde[1], A[2] + (B[2] - A[2]) * t1]); }
        if (canto != null) doCanto.set(canto, id);
        if (id >= 0) { medidas.encaixados++; medidas.desvioDoEncaixe = Math.max(medidas.desvioDoEncaixe, dist2(onde, p2(id))); }
      }
      medidas.cruzamentos++;
      let sNo = canto != null ? canto : k + tc;
      if (sNo >= N - MESMO_LUGAR) sNo = 0;
      nos.push({ s: sNo, t: t1, id, para });
    }
    nos.sort((m, n) => m.t - n.t || m.s - n.s);
  }

  /* ---- cada triângulo: os trechos do contorno que passam por ele ---- */
  const trechosDe = new Map();   // índice do triângulo -> as sequências de ids de cada trecho, da entrada à saída
  for (let ti = 0; ti < T.length; ti++) {
    const t = T[ti];
    const chaves = [0, 1, 2].map((e) => chave(t.v[e], t.v[(e + 1) % 3]));
    const arestas = chaves.map((ch) => nosDaAresta.get(ch));
    if (arestas.every((nos) => nos.every((no) => no.apoio))) continue;
    const q = t.v.map(p2);
    if (!t.sinal) return semBorda(q[0], quadro.nome);
    const eventos = [];
    for (let e = 0; e < 3; e++) {
      const x = t.v[e], y = t.v[(e + 1) % 3], z = t.v[(e + 2) % 3];
      const ladoDoTerceiro = orient(p2(Math.min(x, y)), p2(Math.max(x, y)), p2(z)) > 0;
      for (const no of arestas[e]) if (!no.apoio) eventos.push({ s: no.s, id: no.id, entra: no.para === ladoDoTerceiro });
    }
    if (!alternar(eventos)) return incoerente(`as passagens do contorno pelo triângulo em ${texto2(q[0])} não alternam entre entrar e sair`);
    const curto = encaixe * Math.min(dist2(q[0], q[1]), dist2(q[1], q[2]), dist2(q[2], q[0]));
    const seqs = [];
    for (let j = 0; j < eventos.length; j++) {
      const de = eventos[j];
      if (!de.entra) continue;
      const ate = eventos[(j + 1) % eventos.length];
      let vao = ate.s - de.s; if (Math.abs(vao) <= MESMO_LUGAR) vao = 0; else if (vao < 0) vao += N;
      /* os cantos do contorno neste trecho; o que fica a menos do encaixe do ponto anterior da borda, ou do fim do trecho, sai
         (a borda segue reta por ali, e o leque que ele abriria para um vértice distante seria uma lasca) */
      const cantos = []; let anterior = p2(de.id);
      for (let k = Math.floor(de.s) + 1; k < de.s + vao; k++) {
        const c = ((k % N) + N) % N;
        cantoUsado[c]++;
        if (dist2(P[c], anterior) <= curto) { medidas.cantosEncaixados++; continue; }
        cantos.push(c); anterior = P[c];
      }
      while (cantos.length && dist2(P[cantos[cantos.length - 1]], p2(ate.id)) <= curto) { cantos.pop(); medidas.cantosEncaixados++; }
      const seq = [de.id];
      for (const c of cantos) {
        const p = P[c];
        let id = null;
        /* o canto do contorno rente a um vértice do triângulo usa o vértice */
        for (let e = 0; e < 3 && id == null; e++) {
          const menor = Math.min(dist2(q[e], q[(e + 1) % 3]), dist2(q[e], q[(e + 2) % 3]));
          if (dist2(p, q[e]) <= encaixe * menor) id = t.v[e];
        }
        /* o canto rente a uma aresta do triângulo vai para cima dela, num vértice que a face do outro lado também usa: a tira
           entre a borda e a aresta seria uma lasca */
        for (let e = 0; e < 3 && id == null; e++) {
          const u = Math.min(t.v[e], t.v[(e + 1) % 3]), v = Math.max(t.v[e], t.v[(e + 1) % 3]);
          const A = p2(u), B = p2(v); const l2 = (B[0] - A[0]) ** 2 + (B[1] - A[1]) ** 2;
          const t1 = ((p[0] - A[0]) * (B[0] - A[0]) + (p[1] - A[1]) * (B[1] - A[1])) / l2;
          if (!(t1 > 0 && t1 < 1)) continue;
          const pe = [A[0] + (B[0] - A[0]) * t1, A[1] + (B[1] - A[1]) * t1];
          if (dist2(p, pe) > curto || (reais.has(chaves[e]) && reais.get(chaves[e]) !== 2)) continue;
          if (t1 <= encaixe) id = u; else if (t1 >= 1 - encaixe) id = v;
          else {
            const a3 = V.get(u), b3 = V.get(v);
            id = criar([0, 1, 2].map((c3) => a3[c3] + (b3[c3] - a3[c3]) * t1), [pe[0], pe[1], A[2] + (B[2] - A[2]) * t1]);
            nosDaAresta.get(chaves[e]).push({ apoio: true, t: t1, id });
          }
        }
        if (id != null) { medidas.cantosEncaixados++; medidas.desvioDoEncaixe = Math.max(medidas.desvioDoEncaixe, dist2(p, p2(id))); }
        else {
          const wa = orient(q[1], q[2], p), wb = orient(q[2], q[0], p), wc = orient(q[0], q[1], p); const w = wa + wb + wc;
          const [a3, b3, c3] = t.v.map(p3);
          id = criar([0, 1, 2].map((e) => (wa * a3[e] + wb * b3[e] + wc * c3[e]) / w), [p[0], p[1], (wa * q[0][2] + wb * q[1][2] + wc * q[2][2]) / w]);
          medidas.cantos++;
        }
        if (seq[seq.length - 1] !== id) seq.push(id);
      }
      if (seq[seq.length - 1] !== ate.id) seq.push(ate.id);
      seqs.push(seq);
    }
    trechosDe.set(ti, seqs);
  }
  for (const nos of nosDaAresta.values()) if (nos.some((no) => no.apoio)) nos.sort((m, n) => m.t - n.t);

  /* ---- cada triângulo: o laço dele com os vértices novos das arestas, e os pedaços que os trechos deixam ---- */
  const direcao = new Set();     // 'a>b': a borda nova passa de a para b no sentido do contorno
  const barreira = new Set();    // a mesma aresta, sem sentido
  /* a aresta por onde a borda passa nos dois sentidos (um bico mais estreito que o encaixe, fechado sobre ela) não separa nada: o trecho
     de até duas vezes o encaixe da maior aresta do triângulo sai da borda (a ponta do bico é aparada), e o mais longo recusa, com o lugar */
  let bicoFechado = null; let aparo = 0;
  const marca = (a, b) => {
    if (!direcao.delete(`${b}>${a}`)) { direcao.add(`${a}>${b}`); barreira.add(chave(a, b)); return; }
    barreira.delete(chave(a, b));
    if (dist2(p2(a), p2(b)) > aparo) bicoFechado ??= [a, b]; else medidas.bicosAparados++;
  };
  const pedacosDe = new Map();   // face -> [{ vs, sinal }]
  const inteiros = [];
  for (let ti = 0; ti < T.length; ti++) {
    const t = T[ti];
    const arestas = [0, 1, 2].map((e) => nosDaAresta.get(chave(t.v[e], t.v[(e + 1) % 3])));
    if (arestas.every((nos) => !nos.length)) { inteiros.push(t); continue; }
    if (!pedacosDe.has(t.f)) pedacosDe.set(t.f, []);
    /* o laço do triângulo com os nós sobre as arestas, e a que aresta cada id pertence */
    const laco = []; const arestaDe = new Map();
    const poe = (id, e) => { if (!arestaDe.has(id)) arestaDe.set(id, new Set()); arestaDe.get(id).add(e); };
    for (let e = 0; e < 3; e++) {
      const x = t.v[e], y = t.v[(e + 1) % 3];
      const nos = arestas[e]; const crescente = x < y;
      laco.push(x); poe(x, e); poe(y, e);
      for (let j = 0; j < nos.length; j++) {
        const no = nos[crescente ? j : nos.length - 1 - j];
        if (no.id < 0 && !arestaDe.has(no.id)) { laco.push(no.id); poe(no.id, e); }
      }
    }
    /* o trecho que passa por um ponto da borda do triângulo (um vértice dele ou um vértice novo de aresta) se parte nele */
    const cadeias = [];
    for (const seq of trechosDe.get(ti) ?? []) {
      let atual = [seq[0]];
      for (let k = 1; k < seq.length; k++) {
        atual.push(seq[k]);
        if (k < seq.length - 1 && arestaDe.has(seq[k])) { cadeias.push(atual); atual = [seq[k]]; }
      }
      cadeias.push(atual);
    }
    let pedacos = [laco];
    { const q = t.v.map(p2); aparo = 2 * encaixe * Math.max(dist2(q[0], q[1]), dist2(q[1], q[2]), dist2(q[2], q[0])); }
    for (const c of cadeias) {
      if (c.length < 2) continue;
      const x0 = c[0], x1 = c[c.length - 1];
      if (x0 === x1) return { ref: 'contorno', erro: `o contorno faz um espinho em ${texto2(p2(c[1]))}, vista ${quadro.nome}: entra numa face e sai dela pelo mesmo ponto da borda dela, e o pedaço entre as duas passagens não tem largura; abra o espinho, tire-o do contorno ou reduza o encaixe` };
      if (c.length === 2) {
        const comum = [...arestaDe.get(x0)].find((e) => arestaDe.get(x1).has(e));
        if (comum != null) {
          /* o trecho corre sobre uma aresta do triângulo: a borda é a própria aresta, e nada se divide */
          const i0 = laco.indexOf(x0), i1 = laco.indexOf(x1);
          const naAresta = (de, ate) => { for (let k = de; ; k = (k + 1) % laco.length) { if (!arestaDe.get(laco[k]).has(comum)) return false; if (k === ate) return true; } };
          if (naAresta(i0, i1)) for (let k = i0; k !== i1; k = (k + 1) % laco.length) marca(laco[k], laco[(k + 1) % laco.length]);
          else for (let k = i0; k !== i1; k = (k - 1 + laco.length) % laco.length) marca(laco[k], laco[(k - 1 + laco.length) % laco.length]);
          continue;
        }
      }
      let donos = pedacos.filter((L) => L.includes(x0) && L.includes(x1));
      if (donos.length > 1) {
        const a = p2(c[0]), b = p2(c[1]); const meio = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        donos = donos.filter((L) => pontoNoLaco(meio, L.map(p2)));
      }
      if (donos.length !== 1) return incoerente('um trecho do contorno não cabe num pedaço só do triângulo');
      const L = donos[0]; const i0 = L.indexOf(x0), i1 = L.indexOf(x1);
      const caminho = (de, ate) => { const r = []; for (let k = de; ; k = (k + 1) % L.length) { r.push(L[k]); if (k === ate) return r; } };
      const meioDaCadeia = c.slice(1, -1);
      pedacos.splice(pedacos.indexOf(L), 1, [...caminho(i1, i0), ...meioDaCadeia], [...caminho(i0, i1), ...meioDaCadeia.slice().reverse()]);
      for (let k = 0; k + 1 < c.length; k++) marca(c[k], c[k + 1]);
    }
    /* o pedaço côncavo se parte em convexos, pela normal do triângulo */
    const n3 = cruz(sub(p3(t.v[1]), p3(t.v[0])), sub(p3(t.v[2]), p3(t.v[0])));
    const ln = tamanho(n3); const n = n3.map((x) => x / ln);
    for (const L of pedacos) {
      if (L.length < 3) return incoerente('um pedaço ficou com menos de três cantos');
      if (convexo(p3, L, n)) { pedacosDe.get(t.f).push({ vs: L, sinal: t.sinal }); continue; }
      const tris = melhorTriangulacao(L, p2, p3, t.sinal);
      if (!tris) return incoerente('um pedaço côncavo não se partiu em convexos');
      for (const C of pedacosConvexos(p3, tris, n)) pedacosDe.get(t.f).push({ vs: C, sinal: t.sinal });
    }
  }
  if (bicoFechado) {
    const [a, b] = bicoFechado.map(p2);
    return { ref: 'contorno', erro: `o contorno tem um bico ou uma faixa mais estreita que o encaixe perto de ${texto2([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])}, vista ${quadro.nome}: os dois lados dele caem sobre a mesma aresta da chapa (de ${mm(dist2(a, b))} mm na vista), e a parte ali não teria largura; alargue o bico, reduza o encaixe (${encaixe}) ou use uma chapa de faces menores` };
  }
  /* os triângulos que o contorno não tocou, de uma face que ele tocou, entram inteiros como pedaços */
  for (const t of inteiros) if (pedacosDe.has(t.f)) pedacosDe.get(t.f).push({ vs: [...t.v], sinal: t.sinal });
  for (let k = 0; k < N; k++) {
    if (cantoUsado[k] >= peles[k] || cantoNaAresta[k]) continue;
    /* o canto que o traço não alcançou em alguma pele: o contorno não cruza aresta nenhuma em volta dele */
    return { ref: 'contorno', erro: `o contorno não cruza aresta nenhuma da chapa em volta de ${texto2(P[k])}, vista ${quadro.nome}: ou ele cabe inteiro dentro de um triângulo de uma face (a divisão corta as faces pelas arestas que o contorno cruza; use uma chapa mais fina, com mais níveis de subdivisão, ou um contorno maior), ou, com sentido, a face sob ele atravessa o plano que separa as camadas` };
  }

  /* ---- o lado de cada pedaço e as faces inteiras de dentro ---- */
  const nosDoGrafo = [];   // { f, vs, sinal, pedaco }
  for (const f of perto) {
    if (pedacosDe.has(f)) { for (const p of pedacosDe.get(f)) nosDoGrafo.push({ f, vs: p.vs, sinal: p.sinal, pedaco: p }); continue; }
    const vs = F.get(f).vs; let s = 0; let maior = 0;
    for (let k = 0; k < vs.length; k++) { const a = p2(vs[k]), b = p2(vs[(k + 1) % vs.length]); s += a[0] * b[1] - b[0] * a[1]; maior = Math.max(maior, dist2(a, b)); }
    nosDoGrafo.push({ f, vs, sinal: Math.abs(s) <= PERFIL * maior * maior ? 0 : Math.sign(s), pedaco: null });
  }
  const vizinhos = new Map();
  nosDoGrafo.forEach((no, k) => { for (let j = 0; j < no.vs.length; j++) { const ch = chave(no.vs[j], no.vs[(j + 1) % no.vs.length]); if (!vizinhos.has(ch)) vizinhos.set(ch, []); vizinhos.get(ch).push(k); } });
  const voto = new Int8Array(nosDoGrafo.length);
  for (const ch of barreira) for (const k of vizinhos.get(ch) ?? []) {
    const no = nosDoGrafo[k];
    if (!no.sinal || voto[k]) continue;
    let aFavor = false; let contra = false;
    for (let j = 0; j < no.vs.length; j++) {
      const a = no.vs[j], b = no.vs[(j + 1) % no.vs.length];
      const v = direcao.has(`${a}>${b}`) ? no.sinal : direcao.has(`${b}>${a}`) ? -no.sinal : 0;
      if (v > 0) aFavor = true; else if (v < 0) contra = true;
    }
    if (aFavor !== contra) { voto[k] = aFavor ? 1 : -1; continue; }
    /* a face mais estreita na vista que o encaixe (a parede da borda da chapa, vista quase de perfil) fica entre duas bordas que o
       encaixe levou para as arestas dela, e os sentidos delas se contradizem: vale o lado em que o centro dela cai no contorno */
    const centro = no.vs.map(p2).reduce((c, x) => [c[0] + x[0] / no.vs.length, c[1] + x[1] / no.vs.length], [0, 0]);
    voto[k] = pontoNoLaco(centro, P) ? 1 : -1;
  }
  const dentroDoGrafo = new Uint8Array(nosDoGrafo.length);
  const fila = [];
  voto.forEach((v, k) => { if (v > 0) { dentroDoGrafo[k] = 1; fila.push(k); } });
  if (!fila.length) return incoerente('nenhum pedaço ficou do lado de dentro');
  while (fila.length) {
    const k = fila.pop(); const no = nosDoGrafo[k];
    for (let j = 0; j < no.vs.length; j++) {
      const ch = chave(no.vs[j], no.vs[(j + 1) % no.vs.length]);
      if (barreira.has(ch)) continue;
      for (const outro of vizinhos.get(ch)) {
        if (dentroDoGrafo[outro]) continue;
        if (voto[outro] < 0) return { ref: 'contorno', erro: `a região de dentro do contorno se liga à de fora por outro caminho da chapa, sem passar pela borda nova (um túnel ou uma alça por trás da camada que se divide, vista ${quadro.nome}): a borda não separa as duas regiões, e a divisão marcaria a chapa inteira; selecione em chapa só a pele que se divide` };
        dentroDoGrafo[outro] = 1; fila.push(outro);
      }
    }
  }
  const dentro = [];
  nosDoGrafo.forEach((no, k) => { if (no.pedaco) no.pedaco.dentro = !!dentroDoGrafo[k]; else if (dentroDoGrafo[k]) dentro.push(no.f); });

  /* ---- os pedaços de cada face: os do mesmo lado e do mesmo plano se juntam, e o vértice novo que sobra no meio de uma aresta sai ---- */
  const juntos = new Map();
  for (const [f, pedacos] of pedacosDe) {
    const vivos = pedacos.map((p) => ({ vs: p.vs, dentro: p.dentro }));
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (let a = 0; a < vivos.length && !mudou; a++) for (let b = a + 1; b < vivos.length; b++) {
        if (vivos[a].dentro !== vivos[b].dentro) continue;
        const m = fundir(vivos[a].vs, vivos[b].vs);
        if (!m) continue;
        const pts = m.map(p3); const nm = newell(pts); const l = tamanho(nm);
        let porte = 0; for (const p of pts) porte = Math.max(porte, tamanho(sub(p, pts[0])));
        if (!(l > 0) || desvioDoPlano(p3, lequeDe(m)) > PLANO * porte || !convexo(p3, m, nm.map((x) => x / l))) continue;
        vivos[a].vs = m; vivos.splice(b, 1); mudou = true; break;
      }
    }
    vivos.forEach((p, k) => juntos.set(`${f}/${k}`, p));
  }
  const antigos = new Set();
  for (const p of juntos.values()) for (const v of p.vs) if (v >= 0) antigos.add(v);
  const limpas = tirarValenciaDois(new Map([...juntos].map(([k, p]) => [k, p.vs])), antigos).faces;
  /* a face cujos pedaços ficaram todos do mesmo lado, sem vértice novo (depois de sair o que sobrava no meio de uma aresta), não foi
     cortada: fica como estava, com o id e os cantos */
  for (const f of pedacosDe.keys()) {
    const chaves = [...juntos.keys()].filter((k) => k.startsWith(`${f}/`));
    const lado = juntos.get(chaves[0]).dentro;
    if (!chaves.every((k) => juntos.get(k).dentro === lado && limpas.get(k)?.every((v) => v >= 0))) continue;
    for (const k of chaves) juntos.delete(k);
    if (lado) dentro.push(f);
  }
  const faces = new Map();
  for (const [k, p] of juntos) {
    const vs = limpas.get(k);
    if (!vs) return incoerente('um pedaço sumiu na limpeza');
    const pts = vs.map(p3);
    const razao = razaoDaFace(pts);
    const f = Number(k.slice(0, k.indexOf('/')));
    if (!(razao >= LIMITE_DE_FACE_FINA)) {
      const c = vs.map(p2).reduce((s, x) => [s[0] + x[0] / vs.length, s[1] + x[1] / vs.length], [0, 0]);
      return { ref: 'contorno', erro: `o corte deixaria um pedaço fino na face ${f}, em ${texto2(c)}, vista ${quadro.nome}: área / maior aresta² = ${razao.toExponential(2)}, abaixo do limite de face fina ${LIMITE_DE_FACE_FINA}; o contorno passa rente a uma aresta ou a um vértice da chapa ali: aumente o encaixe (${encaixe}) ou desloque o contorno` };
    }
    if (!faces.has(f)) faces.set(f, []);
    faces.get(f).push({ vs: melhorInicio(p3, vs), dentro: p.dentro, area: tamanho(newell(pts)) / 2 });
  }
  for (const lista of faces.values()) { lista.sort((a, b) => b.area - a.area); medidas.pedacos += lista.length; }
  medidas.facesCortadas = faces.size;
  return { faces, dentro, vertices: novos, medidas };
}

export function criarOperacoesDivisaoPorContorno(servicos) {
  const { idDoPasso, grita, addV, addF, resolverSelecao, nomeDeParteInvalido, temNomeDeParte, parte } = servicos;
  const OP = 'divisaoPorContorno';

  function dividir(st, a, i) {
    if (a.chapa == null) return grita(st, i, OP, 'chapa', "chapa é a seleção das faces que a divisão corta, como { origem: { op: 'subdivisao', id } } de uma chapa");
    const quadro = quadroDaVista(Array.isArray(a.vista) ? a.vista.map((x) => st.num(x)) : a.vista);
    if (!quadro) return grita(st, i, OP, 'vista', `vista precisa ser 'x', 'y' ou 'z', o eixo ao longo do qual o contorno é projetado na chapa (na 'y' o ponto [u, v] é [x, z], na 'x' é [z, y] e na 'z' é [x, y]), ou um vetor [dx, dy, dz] não nulo; veio ${JSON.stringify(a.vista)}`);
    const erroNome = nomeDeParteInvalido(a.nome);
    if (erroNome) return grita(st, i, OP, 'nome', `nome é o da parte nova, a região de dentro do contorno, e ${erroNome}`);
    const material = a.material ?? null;
    if (material !== null && (typeof material !== 'string' || !Object.hasOwn(st.materiais, material))) return grita(st, i, OP, 'material', `o material '${material}' da parte nova não existe em MATERIAIS (${Object.keys(st.materiais).map((n) => `'${n}'`).join(', ') || 'nenhum declarado'})`);
    if (a.substituir != null && a.substituir !== true) return grita(st, i, OP, 'substituir', `substituir só aceita o literal true (a região de dentro sai da parte que já tinha e passa à parte nova); veio ${JSON.stringify(a.substituir)}`);
    if (a.sentido != null && a.sentido !== '+' && a.sentido !== '-') return grita(st, i, OP, 'sentido', `sentido só aceita '+' ou '-', o lado do eixo da vista de onde se olha a camada que se divide, num corpo que a reta do eixo atravessa mais de uma vez; veio ${JSON.stringify(a.sentido)}`);
    /* cada número no campo dele: o valor que `st.num` não resolve (um NaN, um nome que não existe) recusa pelo campo em que veio */
    const lido = {};
    for (const [campo, padrao] of [['segmentosArco', SEGMENTOS_ARCO_PADRAO], ['segmentosSpline', undefined], ['encaixe', ENCAIXE_PADRAO]]) {
      try { lido[campo] = a[campo] == null ? padrao : st.num(a[campo]); } catch (e) { return grita(st, i, OP, campo, `${campo} da divisão não é um número que a receita resolva (veio ${String(a[campo])}): ${e.message}`); }
    }
    const { segmentosArco, segmentosSpline, encaixe } = lido;
    for (const [campo, n] of [['segmentosArco', segmentosArco], ['segmentosSpline', segmentosSpline]]) {
      if (n != null && (!Number.isInteger(n) || n < 1 || n > SEGMENTOS_MAXIMOS)) return grita(st, i, OP, campo, `${campo} da divisão precisa ser inteiro de 1 a ${SEGMENTOS_MAXIMOS}, e veio ${n}`);
    }
    if (!Number.isFinite(encaixe) || encaixe < 0 || encaixe > ENCAIXE_MAXIMO) return grita(st, i, OP, 'encaixe', `encaixe é a fração da aresta, de 0 a ${ENCAIXE_MAXIMO}, abaixo da qual o corte usa o vértice que já existe em vez de criar outro ao lado; veio ${a.encaixe}`);
    const contorno = a.contorno;
    if (!contorno || typeof contorno !== 'object' || Array.isArray(contorno)) return grita(st, i, OP, 'contorno', 'contorno da divisão precisa ser { inicio: [u, v], trechos: [...] }, o de curva2d (reto, arco, arcoTangente, concordancia e spline), em metros na vista');
    let poligono;
    try { poligono = contornoPorTrechos(contorno, { campo: 'contorno', num: (x) => st.num(x), segmentosArco, segmentosSpline }); } catch (e) {
      if (e instanceof ErroDeCurva) return grita(st, i, OP, e.campo, `${e.message}`);
      return grita(st, i, OP, 'contorno', `o contorno da divisão tem um valor que a receita não resolve: ${e.message}`);
    }
    const semNumero = poligono.findIndex((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]));
    if (semNumero >= 0) return grita(st, i, OP, 'contorno', `o ponto ${semNumero} do contorno da divisão tem coordenada que não é número finito ([${poligono[semNumero]}]); confira o início e os trechos`);
    const diagnostico = diagnosticarContorno(poligono);
    if (diagnostico) return grita(st, i, OP, 'contorno', `o contorno da divisão se cruza: ${diagnostico.mensagem}; a parte precisa de um contorno simples, que não toque a si mesmo`);

    const antes = st.orfaos.length;
    const selecao = resolverSelecao(st, a.chapa, OP, i);
    if (st.orfaos.length > antes) return;
    const ids = [...selecao.faces].sort((x, y) => x - y);
    if (!ids.length) return grita(st, i, OP, 'chapa', 'a seleção da chapa da divisão não tem face nenhuma');

    const r = dividirMalhaPorContorno({ V: st.V, F: st.F, ids, quadro, poligono, sentido: a.sentido ?? null, encaixe });
    if (r.erro) return grita(st, i, OP, r.ref, r.erro);
    /* a face que já é de outra parte só muda de parte com `substituir: true`: conferido antes de qualquer corte */
    if (a.substituir !== true) {
      const alheia = [...r.dentro, ...[...r.faces].filter(([, pedacos]) => pedacos.some((p) => p.dentro)).map(([f]) => f)].sort((x, y) => x - y).find((f) => temNomeDeParte(st.F.get(f).parte) && st.F.get(f).parte !== a.nome);
      if (alheia != null) return grita(st, i, OP, alheia, `a região de dentro do contorno já pertence à parte '${st.F.get(alheia).parte}' (a face ${alheia}, por exemplo) e viraria '${a.nome}'; escreva substituir: true para a divisão tirá-la de lá`);
    }

    /* ---- a malha: os vértices novos que algum pedaço usa, e os pedaços, o maior com o id da face ---- */
    const idDe = new Map(); let proximoV = 0; let proximaF = 0;
    const real = (v) => {
      if (v >= 0) return v;
      if (!idDe.has(v)) { const id = idDoPasso(i, proximoV++); addV(st, id, r.vertices[-1 - v]); idDe.set(v, id); }
      return idDe.get(v);
    };
    const daParte = [...r.dentro];
    for (const f of [...r.faces.keys()].sort((x, y) => x - y)) {
      const face = st.F.get(f); const pedacos = r.faces.get(f);
      pedacos.forEach((p, k) => {
        const vs = p.vs.map(real);
        let id = f;
        if (k === 0) { face.vs = vs; face.tinta = []; } else {
          id = idDoPasso(i, proximaF++);
          addF(st, id, vs);
          const nf = st.F.get(id);
          nf.cor = face.cor; nf.material = face.material; nf.parte = face.parte; nf.liso = face.liso; nf.solido = face.solido;
          if (st.parteAtribuidaEm?.has(f)) st.parteAtribuidaEm.set(id, st.parteAtribuidaEm.get(f));
          (st.pedacosDe ??= new Map()).set(id, f);
          /* quem cita a face por origem cita os pedaços dela: `comPedacosDaDivisao`, no núcleo, lê este mapa */
          const irmaos = (st.pedacosDaDivisao ??= new Map()).get(f) ?? [];
          irmaos.push(id); st.pedacosDaDivisao.set(f, irmaos);
        }
        if (p.dentro) daParte.push(id);
      });
    }
    parte(st, { nome: a.nome, ...(material !== null ? { material } : {}), ...(a.substituir === true ? { substituir: true } : {}), faces: daParte.sort((x, y) => x - y) }, i);
  }

  /* a operação publicada tem a assinatura de todas, `(st, a, i)` */
  return {
  divisaoPorContorno(st, a, i) { return dividir(st, a, i); },
  };
}
