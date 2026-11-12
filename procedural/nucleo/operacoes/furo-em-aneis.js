/* furo-em-aneis.js — a face furada refeita em anéis (plano "costuras e furos limpos", fatia 4), e a região plana de várias faces como face de entrada.

   O QUE ERA. O `furo` repartia a face entre o contorno e os anéis sem criar vértice nenhum: com um anel, uma face de borda por aresta do anel
   abraçando um trecho do contorno; com vários, pontes e orelhas. Quando o contorno tem muitos cantos (a tampa de 144 lados de um disco), cada face
   dessas liga um canto do contorno, a dezenas de milímetros, a uma aresta do furo de um milímetro: triângulos longos e finos, de razão de aspecto
   até 13 898 no flange do braço, que o sombreamento suave mostra como estrias.

   O QUE É. Quando o contorno da face tem 48 cantos ou mais, a face é refeita (sem passar pela repartição antiga, que é a parte cara):
     1. em volta de cada furo, um anel de quadriláteros: cada aresta do furo ganha o quadrilátero que a liga à aresta correspondente de um POLÍGONO DE
        APOIO, o contorno do furo afastado `d` para fora (com vários furos, pela esquadria; com um furo, sobre a reta do canto ao contorno que a repartição
        antiga dava ao setor), com `d` igual ao raio médio do furo e reduzido pela metade até o apoio caber com folga;
     2. o resto da face (o contorno menos os polígonos de apoio) pela repartição de sempre (com um furo, um polígono por setor), mais pontos de reforço
        numa grade hexagonal de passo 4 vezes a aresta média, sem chegar a menos de meio passo do contorno, dos apoios nem das retas dos setores, e então
        por flips de Delaunay que respeitam as arestas do contorno, dos apoios e dos setores (nunca flipadas); o passo fecha (3, 2,5, 2) até não restar
        triângulo fino pela régua.
   Nenhum vértice cai sobre o contorno da face nem dentro de um furo, então a vizinhança da peça não ganha junção em T. A face de menos de 48 cantos fica
   byte a byte como era. Qualquer prova que falhe, o teto de crescimento (4 vezes os triângulos da repartição antiga) ou os limites de 1.500 cantos e 40.000
   pontos de grade devolvem `{motivo}`, e o `furo` segue com a repartição antiga e põe o motivo em `neutro.avisos`. A aresta do apoio mais longa que 8 vezes
   a aresta média (o lado reto de um rasgo) é partida, e o polígono da `borda` dela vira um triângulo mais um leque, para não ter cantos colineares. */
import { triangularFace } from '../triangulacao-face.js';

/* Só a face de contorno denso (48 cantos ou mais) é refeita. Nela a repartição sem vértice novo liga cada canto do contorno a um furo a dezenas de arestas
   dali, e é de lá que vêm as estrias. As faces de poucos cantos (placa de 4 cantos, tampa de 16 ou 32 lados) têm a repartição que os testes A-26, A-30 e
   A-33 fixam (contagem fechada de faces, nenhum vértice a mais) e seguem como eram, mesmo onde a régua acha triângulo fino neles (29 a 99 nas oito figuras
   da linha de base do furo, de face com 6 a 32 lados). */
export const CANTOS_DO_CONTORNO_DENSO = 48;
const LIMITE_DA_RAZAO = 10;
const FATOR_DO_LADO = 4;
const FATORES_DA_GRADE = [4, 3, 2.5, 2];
const LIMITE_DE_CANTOS = 1500;
const LIMITE_DA_GRADE = 40000;
const CRESCIMENTO_MAXIMO = 4;
const FATOR_DA_FOLGA = 0.5;

const cruz2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** A aresta média de uma lista de polígonos (só os lados, cada aresta uma vez por polígono). */
export function arestaMedia(poligonos) {
  let soma = 0, n = 0;
  for (const P of poligonos) for (let k = 0; k < P.length; k++) { soma += dist(P[k], P[(k + 1) % P.length]); n++; }
  return n ? soma / n : 0;
}

/** Verdadeiro se algum polígono (cantos em 2D, anti-horário), triangulado como o adaptador triangula, tem triângulo fino. */
export function temTrianguloFino(poligonos, media) {
  for (const uv of poligonos) {
    const pts = uv.map((p) => [p[0], p[1], 0]);
    const tris = pts.length === 3 ? [[0, 1, 2]] : triangularFace(pts);
    for (const [a, b, c] of tris) {
      const maior = Math.max(dist(uv[a], uv[b]), dist(uv[b], uv[c]), dist(uv[c], uv[a]));
      const dobro = Math.abs(cruz2(uv[a], uv[b], uv[c]));
      const razao = dobro > 0 ? (maior * maior) / dobro : Infinity;
      if (razao > LIMITE_DA_RAZAO && maior > FATOR_DO_LADO * media) return true;
    }
  }
  return false;
}

/* o contorno do anel afastado `d` para fora, nos cantos pela esquadria; o anel é convexo e anti-horário */
function afastar(anel, d) {
  const n = anel.length;
  const normais = anel.map((p, k) => {
    const q = anel[(k + 1) % n];
    const len = dist(p, q) || 1;
    return [(q[1] - p[1]) / len, -(q[0] - p[0]) / len];
  });
  return anel.map((p, k) => {
    const a = normais[(k + n - 1) % n], b = normais[k];
    const m = Math.max(0.2, 1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + d * (a[0] + b[0]) / m, p[1] + d * (a[1] + b[1]) / m];
  });
}

/** Verdadeiro se o polígono (cantos em 2D) tem todo giro estritamente positivo (mais que `eps` no dobro da área): convexo, sem canto colinear e anti-horário. */
export function convexoAntiHorario(P, eps) {
  for (let t = 0; t < P.length; t++) if (!(cruz2(P[(t + P.length - 1) % P.length], P[t], P[(t + 1) % P.length]) > eps)) return false;
  return true;
}

function distanciaAoSegmento(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const l2 = abx * abx + aby * aby;
  let t = l2 > 0 ? ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t);
}
const distanciaAoPoligono = (p, P) => Math.min(...P.map((q, k) => distanciaAoSegmento(p, q, P[(k + 1) % P.length])));

/* o centro do círculo que passa por a, b, c fica à esquerda de a→b se positivo; incircle > 0 quando d está dentro do círculo de (a,b,c) anti-horário */
function dentroDoCirculo(a, b, c, d, eps) {
  const ax = a[0] - d[0], ay = a[1] - d[1], bx = b[0] - d[0], by = b[1] - d[1], cx = c[0] - d[0], cy = c[1] - d[1];
  const det = (ax * ax + ay * ay) * (bx * cy - cx * by) - (bx * bx + by * by) * (ax * cy - cx * ay) + (cx * cx + cy * cy) * (ax * by - bx * ay);
  return det > eps;
}

/* UM furo: os cantos do apoio sobre as retas que dividem o furo em setores. A reta do canto j do anel sai dele para fora, pela esquadria (a normal do
   canto), até o contorno, e termina no canto do contorno mais perto de onde a normal o encontra (a âncora). Num furo redondo ela é radial, como era na
   repartição antiga; num rasgo ela acompanha a normal do lado reto, e o apoio fica a uma distância de verdade dele. */
function apoioPelasRetas(contorno, anel, raioMedio, margemDentro) {
  const n = contorno.length;
  const L = anel.length;
  const fora = afastar(anel, 1);
  const normais = anel.map((p, j) => { const v = [fora[j][0] - p[0], fora[j][1] - p[1]]; const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; });
  const ancoras = [];
  for (let j = 0; j < L; j++) {
    const p = anel[j], u = normais[j];
    let tMenor = Infinity;
    for (let k = 0; k < n; k++) {
      const a = contorno[k], b = contorno[(k + 1) % n];
      const e = [b[0] - a[0], b[1] - a[1]];
      const det = u[0] * e[1] - u[1] * e[0];
      if (!(Math.abs(det) > 1e-18)) continue;
      const t = ((a[0] - p[0]) * e[1] - (a[1] - p[1]) * e[0]) / det;
      const q = ((a[0] - p[0]) * u[1] - (a[1] - p[1]) * u[0]) / det;
      if (t > 0 && q >= 0 && q <= 1 && t < tMenor) tMenor = t;
    }
    if (!Number.isFinite(tMenor)) return { motivo: `a normal do canto ${j} do furo não encontra o contorno da face` };
    const acerto = [p[0] + u[0] * tMenor, p[1] + u[1] * tMenor];
    let melhor = 0, menor = Infinity;
    for (let k = 0; k < n; k++) { const d = dist(contorno[k], acerto); if (d < menor) { menor = d; melhor = k; } }
    ancoras.push(melhor);
  }
  let passos = 0;
  for (let j = 0; j < L; j++) passos += (ancoras[(j + 1) % L] - ancoras[j] + n) % n;
  if (passos !== n) return { motivo: 'as retas do furo ao contorno não dão uma volta só (as âncoras não andam sempre no mesmo sentido)' };
  const direcao = anel.map((p, j) => { const q = contorno[ancoras[j]]; const l = dist(p, q) || 1; return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; });
  for (const f of [1, 0.5, 0.25, 0.125]) {
    const d = raioMedio * f;
    const apoio = anel.map((p, j) => [p[0] + direcao[j][0] * d, p[1] + direcao[j][1] * d]);
    if (apoio.every((p) => margemDentro(contorno, p) > 0.5 * d)) return { apoio, ancoras };
  }
  return { motivo: 'o polígono de apoio não cabe na face com folga, nem com um oitavo do raio do furo' };
}

/* Orelhas de um polígono simples anti-horário, com cantos colineares permitidos: só corta orelha de área positiva, sem outro canto dentro, sobre a borda
   ou sobre a diagonal dela (o canto colinear de uma reta de setor é vértice da malha e não pode ficar fora de nenhum triângulo); entre as orelhas livres
   corta a de melhor forma (soma dos lados ao quadrado sobre a área), com empate no menor índice. Devolve os triângulos em índices do polígono, ou null. */
export function orelhas(pts, eps) {
  const resto = pts.map((_, k) => k);
  const tris = [];
  while (resto.length > 3) {
    let melhor = -1, nota = Infinity;
    for (let c = 0; c < resto.length; c++) {
      const a = resto[(c + resto.length - 1) % resto.length], b = resto[c], d = resto[(c + 1) % resto.length];
      const area = cruz2(pts[a], pts[b], pts[d]);
      if (!(area > eps)) continue;
      let livre = true;
      for (const v of resto) {
        if (v === a || v === b || v === d) continue;
        if (cruz2(pts[a], pts[b], pts[v]) >= -eps && cruz2(pts[b], pts[d], pts[v]) >= -eps && cruz2(pts[d], pts[a], pts[v]) >= -eps) { livre = false; break; }
      }
      if (!livre) continue;
      const q = (dist(pts[a], pts[b]) ** 2 + dist(pts[b], pts[d]) ** 2 + dist(pts[d], pts[a]) ** 2) / area;
      if (q < nota * (1 - 1e-9)) { nota = q; melhor = c; }
    }
    if (melhor < 0) return null;
    tris.push([resto[(melhor + resto.length - 1) % resto.length], resto[melhor], resto[(melhor + 1) % resto.length]]);
    resto.splice(melhor, 1);
  }
  if (!(cruz2(pts[resto[0]], pts[resto[1]], pts[resto[2]]) > eps)) return null;
  tris.push([resto[0], resto[1], resto[2]]);
  return tris;
}

/* UM furo: o setor j é o polígono do contorno de ancoras[j] a ancoras[j+1], da reta j+1 de volta ao apoio (do canto j+1 ao canto j) e pela reta j até a âncora.
   Cada reta (do canto do apoio à âncora) leva pontos de reforço a cada `passo`, que são vértices dos dois setores vizinhos, e é aresta fixa. */
function repartirEmSetores(contorno, apoio, inicio, ancoras, L, passo, escala) {
  const n = contorno.length;
  const pontos = [];
  const retaDe = [];
  for (let j = 0; j < L; j++) {
    const a = apoio[inicio[j]], b = contorno[ancoras[j]];
    const m = Math.max(0, Math.round(dist(a, b) / passo) - 1);
    const lista = [];
    for (let t = 1; t <= m; t++) { lista.push(pontos.length); pontos.push([a[0] + (b[0] - a[0]) * t / (m + 1), a[1] + (b[1] - a[1]) * t / (m + 1)]); }
    retaDe.push(lista);
  }
  const triangulos = [], fixas = [], retas = [];
  const eps = 1e-12 * escala * escala;
  for (let j = 0; j < L; j++) {
    const jn = (j + 1) % L;
    const cantos = [];
    for (let k = ancoras[j]; ; k = (k + 1) % n) { cantos.push({ tipo: 'contorno', i: k }); if (k === ancoras[jn]) break; }
    for (let t = retaDe[jn].length - 1; t >= 0; t--) cantos.push({ tipo: 'extra', m: retaDe[jn][t] });
    const q0 = inicio[j], q1 = inicio[jn] === 0 ? apoio.length : inicio[jn];
    for (let q = q1; q >= q0; q--) cantos.push({ tipo: 'apoio', k: 0, j: q % apoio.length });
    for (const m of retaDe[j]) cantos.push({ tipo: 'extra', m });
    const pts = cantos.map((t) => (t.tipo === 'contorno' ? contorno[t.i] : t.tipo === 'apoio' ? apoio[t.j] : pontos[t.m]));
    const sai = orelhas(pts, eps);
    if (!sai) return { motivo: `o setor ${j} do furo não fechou em orelhas de área positiva (${cantos.length} cantos)` };
    for (const tri of sai) triangulos.push({ cantos: tri.map((x) => cantos[x]), setor: j });
    // a reta j em trechos fixos: do canto do apoio, pelos pontos, à âncora
    const cadeia = [{ tipo: 'apoio', k: 0, j: q0 }, ...retaDe[j].map((m) => ({ tipo: 'extra', m })), { tipo: 'contorno', i: ancoras[j] }];
    for (let t = 0; t + 1 < cadeia.length; t++) fixas.push([cadeia[t], cadeia[t + 1]]);
    retas.push([apoio[q0], contorno[ancoras[j]]]);
  }
  return { triangulos, fixas, retas, pontos };
}

/**
 * Refaz a face em anéis. `contorno` e `aneis` em 2D como o `furo` os tem (contorno anti-horário, anéis anti-horários), `particionar` a repartição de
 * sempre e `margemDentro` a margem do núcleo. Devolve { bordas, preenchimento, apoios, extras, anexos } com os cantos por etiqueta
 * ({tipo:'contorno',i} | {tipo:'anel',k,j} | {tipo:'apoio',k,j} | {tipo:'extra',m}), `bordas[k][j]` o polígono da aresta j do anel k (o quadrilátero, ou
 * mais cantos onde a aresta do apoio foi partida), `apoios[k]` os cantos 2D do polígono de apoio, `extras` os pontos de reforço e `anexos[k][j]` os
 * índices do `preenchimento` que ficam no setor da aresta j do furo k (o triângulo vai ao furo do anel mais próximo); ou { motivo } quando a face não
 * aceita a refeitura (o `furo` segue com a repartição antiga e avisa).
 */
export function refazerEmAneis(entrada) {
  const { contorno, aneis, raios, escala, particionar, margemDentro, media } = entrada;
  const M = aneis.length;
  const L = aneis[0].length;
  if (M * L > LIMITE_DE_CANTOS || contorno.length > LIMITE_DE_CANTOS) return { motivo: `${contorno.length} cantos no contorno e ${M * L} nos anéis passam do limite de ${LIMITE_DE_CANTOS}` };
  const centroDe = (anel) => [anel.reduce((s, p) => s + p[0], 0) / anel.length, anel.reduce((s, p) => s + p[1], 0) / anel.length];
  const centros = aneis.map(centroDe);
  const raioMedio = aneis.map((anel, k) => anel.reduce((s, p) => s + dist(p, centros[k]), 0) / anel.length);

  /* o apoio: o maior afastamento (o raio médio do furo, depois metade, um quarto, um oitavo) em que o apoio, com a folga de meio afastamento, cabe.
     Com UM furo, cada canto do apoio fica sobre a reta do canto do anel até o canto do contorno que a repartição antiga lhe dava (`ancoras`), e essa reta
     é aresta da malha: o setor de cada aresta do furo (a face `borda` de antes) continua um polígono que a malha nova só subdivide. */
  let apoiosSimples = null, ancoras = null;
  if (M === 1) {
    const r = apoioPelasRetas(contorno, aneis[0], raioMedio[0], margemDentro);
    if (r.motivo) return r;
    apoiosSimples = [r.apoio]; ancoras = r.ancoras;
  } else {
    for (const f of [1, 0.5, 0.25, 0.125]) {
      const d = raioMedio.map((r) => r * f);
      const folgados = aneis.map((anel, k) => afastar(anel, 1.5 * d[k]));
      const cabe = folgados.every((F) => F.every((p) => margemDentro(contorno, p) > 0))
        && folgados.every((F, k) => folgados.every((G, l) => l <= k || !sePerto(F, G, escala)));
      if (cabe) { apoiosSimples = aneis.map((anel, k) => afastar(anel, d[k])); break; }
    }
    if (!apoiosSimples) return { motivo: 'os polígonos de apoio não cabem na face com folga, nem com um oitavo do raio dos furos' };
  }

  /* a aresta longa do apoio (o lado reto de um rasgo) é partida em trechos de no máximo o passo da grade, para o triângulo que a usa não ser fino;
     `inicio[k][j]` é o índice, no apoio k, do canto que nasce do canto j do anel */
  const limiteDaAresta = 2 * FATORES_DA_GRADE[0] * media;
  const inicio = [];
  const apoios = apoiosSimples.map((A) => {
    const saida = [];
    inicio.push(A.map((p, j) => {
      const idx = saida.length;
      saida.push(p);
      const q = A[(j + 1) % A.length];
      const partes = Math.ceil(dist(p, q) / limiteDaAresta - 1e-9);
      for (let s = 1; s < partes; s++) saida.push([p[0] + (q[0] - p[0]) * s / partes, p[1] + (q[1] - p[1]) * s / partes]);
      return idx;
    }));
    return saida;
  });
  const cantosDeApoio = apoios.reduce((s, A) => s + A.length, 0);

  /* o teto de crescimento: a refeitura não passa de CRESCIMENTO_MAXIMO vezes os triângulos da repartição antiga (n + M·L + 2M − 2), estimados antes de
     triangular qualquer coisa pela grade de cada passo */
  const referencia = contorno.length + M * L + 2 * M - 2;
  const area = (P) => Math.abs(P.reduce((s, p, k) => { const q = P[(k + 1) % P.length]; return s + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0));
  const livre = area(contorno) - apoios.reduce((s, A) => s + area(A), 0);
  const compRetas = ancoras ? ancoras.reduce((t, a, j) => t + dist(apoios[0][inicio[0][j]], contorno[a]), 0) : 0;
  const estimar = (fator) => M * L + contorno.length + cantosDeApoio + 2 * M - 2 + 2 * Math.ceil(livre / (0.866 * (fator * media) ** 2)) + 2 * Math.ceil(compRetas / (fator * media));
  if (estimar(FATORES_DA_GRADE[0]) > CRESCIMENTO_MAXIMO * referencia) {
    return { motivo: `a refeitura daria cerca de ${estimar(FATORES_DA_GRADE[0])} triângulos, mais de ${CRESCIMENTO_MAXIMO} vezes os ${referencia} da repartição antiga` };
  }

  /* a repartição do resto, sem vértice novo (fora os pontos das retas): com UM furo, um polígono por setor (o contorno de uma âncora à outra e o apoio de volta),
     cada um por orelhas, com as retas dos setores como arestas fixas e com pontos de reforço; com vários, pontes e orelhas sobre a face inteira */
  let baseVarios = null;
  if (M > 1) {
    const r = particionar(contorno, apoios, escala, raios);
    if (!r || r.erro) return { motivo: `a repartição do contorno menos os apoios não fecha${r && r.erro ? `: ${r.erro}` : ''}` };
    baseVarios = { triangulos: [...r.bordas.flat(), ...r.preenchimento].map((d) => ({ cantos: d.cantos.map((t) => (t.tipo === 'anel' ? { tipo: 'apoio', k: t.k, j: t.j } : t)) })), fixas: [], pontos: [] };
  }

  /* o passo da grade de reforço começa em 4 vezes a aresta média e fecha (3, 2,5 e 2) até a refeitura não ter triângulo fino pela mesma régua; se nenhum
     passo chega lá, fica o mais fino que coube no teto */
  let melhor = null;
  for (const fator of FATORES_DA_GRADE) {
    if (melhor && estimar(fator) > CRESCIMENTO_MAXIMO * referencia) break;
    const base = M === 1 ? repartirEmSetores(contorno, apoios[0], inicio[0], ancoras, L, fator * media, escala) : baseVarios;
    if (base.motivo) { if (!melhor) return base; break; }
    const r = montar(entrada, apoios, inicio, base, fator);
    if (!r) break;
    const ponto = (t) => (t.tipo === 'contorno' ? contorno[t.i] : t.tipo === 'anel' ? aneis[t.k][t.j] : t.tipo === 'apoio' ? r.apoios[t.k][t.j] : r.extras[t.m]);
    /* a prova da borda: cada polígono do anel (o quadrilátero, o triângulo e os do leque) é estritamente convexo e anti-horário no plano da face. O canto do
       apoio anda na direção da âncora, quase tangente ao contorno quando o furo está perto da borda, e a prova de margem sozinha deixa passar o quadrilátero
       em gravata, que o adaptador entrega com um triângulo virado; as bordas não dependem da grade, então a falha vale para todos os passos */
    const epsBorda = 1e-12 * escala * escala;
    for (const [k, lista] of r.bordas.entries()) {
      for (const [j, d] of lista.entries()) {
        if (!convexoAntiHorario(d.cantos.map(ponto), epsBorda)) return { motivo: `a borda ${j} do anel ${k} sairia torcida ou invertida no plano da face (o apoio não envolve o furo com folga)` };
      }
    }
    for (const d of r.anexados) {
      if (d.cantos.some((t) => t.tipo === 'extra' || t.tipo === 'contorno')) continue;
      if (!convexoAntiHorario(d.cantos.map(ponto), epsBorda)) return { motivo: `o leque da aresta ${d.j} do anel ${d.k} sairia invertido no plano da face` };
    }
    melhor = r;
    const poligonos = [...r.bordas.flat(), ...r.preenchimento, ...r.anexados].map((d) => d.cantos.map(ponto));
    melhor.fino = temTrianguloFino(poligonos, media);
    if (!melhor.fino) break;
  }
  if (!melhor) return { motivo: 'a grade de reforço não fechou a triangulação (a prova de contagem, área ou arestas falhou, ou a grade passa de 40000 pontos)' };
  return melhor;
}

function montar({ contorno, aneis, escala, margemDentro, media }, apoios, inicio, base, fatorDaGrade) {
  const M = aneis.length;
  const L = aneis[0].length;
  const tags = [];
  const pontos = [];
  const indice = new Map();
  const idDe = (t) => {
    const chave = `${t.tipo}|${t.i ?? ''}|${t.k ?? ''}|${t.j ?? ''}|${t.m ?? ''}`;
    if (!indice.has(chave)) {
      indice.set(chave, pontos.length);
      tags.push(t);
      pontos.push(t.tipo === 'contorno' ? contorno[t.i] : apoios[t.k][t.j]);
    }
    return indice.get(chave);
  };
  const usados = [];
  // os pontos das retas dos setores já são vértices de reforço: entram primeiro, com a etiqueta que os setores usam
  for (const p of base.pontos) {
    indice.set(`extra||||${usados.length}`, pontos.length);
    tags.push({ tipo: 'extra', m: usados.length });
    usados.push(p);
    pontos.push(p);
  }
  const tri = base.triangulos.map((d) => ({ ids: d.cantos.map(idDe), setor: d.setor }));
  const cantosDeApoio = apoios.reduce((s, A) => s + A.length, 0);

  // a grade de reforço
  const passo = fatorDaGrade * media;
  const folga = FATOR_DA_FOLGA * passo;
  const caixa = contorno.reduce((c, p) => [Math.min(c[0], p[0]), Math.min(c[1], p[1]), Math.max(c[2], p[0]), Math.max(c[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const origem = [(caixa[0] + caixa[2]) / 2, (caixa[1] + caixa[3]) / 2];
  const linhas = Math.ceil((caixa[3] - caixa[1]) / (passo * Math.sqrt(3) / 2) / 2) + 1;
  const colunas = Math.ceil((caixa[2] - caixa[0]) / passo / 2) + 2;
  const extras = [];
  if ((2 * linhas + 1) * (2 * colunas + 1) > LIMITE_DA_GRADE) return null;
  if (passo > 0 && passo < Math.max(caixa[2] - caixa[0], caixa[3] - caixa[1])) {
    for (let r = -linhas; r <= linhas; r++) {
      for (let c = -colunas; c <= colunas; c++) {
        const p = [origem[0] + (c + (Math.abs(r) % 2) * 0.5) * passo, origem[1] + r * passo * Math.sqrt(3) / 2];
        if (!(margemDentro(contorno, p) >= folga)) continue;
        if (apoios.some((A) => margemDentro(A, p) > 0 || distanciaAoPoligono(p, A) < folga)) continue;
        if ((base.retas ?? []).some(([a, b]) => distanciaAoSegmento(p, a, b) < folga)) continue;
        extras.push(p);
      }
    }
  }

  // inserção dos reforços, um a um, com flips de Delaunay que nunca tocam aresta do contorno nem do apoio
  const eps = 1e-12 * escala * escala;
  const epsCirculo = 1e-13 * escala ** 4;
  const arestas = new Map();
  const chave = (a, b) => `${a}>${b}`;
  const poe = (t) => { for (let e = 0; e < 3; e++) arestas.set(chave(t[e], t[(e + 1) % 3]), t); };
  const tira = (t) => { for (let e = 0; e < 3; e++) if (arestas.get(chave(t[e], t[(e + 1) % 3])) === t) arestas.delete(chave(t[e], t[(e + 1) % 3])); };
  const triangulos = new Set();
  const novo = (a, b, c, setor) => { const t = [a, b, c]; t.setor = setor; triangulos.add(t); poe(t); return t; };
  const remove = (t) => { tira(t); triangulos.delete(t); };
  for (const t of tri) novo(...t.ids, t.setor);
  const fixa = new Set();
  for (const k of arestas.keys()) { const [a, b] = k.split('>'); if (!arestas.has(chave(b, a))) { fixa.add(k); fixa.add(chave(b, a)); } }
  // as retas dos setores (um furo só) também são arestas fixas: os flips e os reforços não as cruzam
  for (const [x, y] of base.fixas) { const a = idDe(x), b = idDe(y); fixa.add(chave(a, b)); fixa.add(chave(b, a)); }

  const legaliza = (pilha) => {
    let guarda = 100 * (triangulos.size + 10);
    while (pilha.length && guarda-- > 0) {
      const [u, v] = pilha.pop();
      const t1 = arestas.get(chave(u, v));
      const t2 = arestas.get(chave(v, u));
      if (!t1 || !t2 || fixa.has(chave(u, v))) continue;
      const p = t1.find((x) => x !== u && x !== v);
      const w = t2.find((x) => x !== u && x !== v);
      if (!dentroDoCirculo(pontos[u], pontos[v], pontos[p], pontos[w], epsCirculo)) continue;
      if (!(cruz2(pontos[u], pontos[w], pontos[p]) > eps && cruz2(pontos[w], pontos[v], pontos[p]) > eps)) continue;
      remove(t1); remove(t2);
      novo(u, w, p, t1.setor); novo(w, v, p, t1.setor);
      pilha.push([u, w], [w, v], [v, p], [p, u]);
    }
  };
  legaliza([...arestas.keys()].sort().map((k) => k.split('>').map(Number)));

  /* localização do triângulo que contém o ponto por caminhada: parte do último triângulo criado e atravessa a aresta pela qual o ponto está à direita;
     sem vizinho (aresta de borda) ou depois de muitos passos, cai na varredura linear, que é a conta de sempre */
  const posicao = (t, p) => {
    const s = [cruz2(pontos[t[0]], pontos[t[1]], p), cruz2(pontos[t[1]], pontos[t[2]], p), cruz2(pontos[t[2]], pontos[t[0]], p)];
    return { s, estrito: s.every((x) => x > eps), sobre: s.every((x) => x > -eps) };
  };
  let ultimo = null;
  const localizar = (p) => {
    let t = ultimo && triangulos.has(ultimo) ? ultimo : null;
    for (let passos = 0; t && passos < 4 * triangulos.size + 10; passos++) {
      const { s, estrito, sobre } = posicao(t, p);
      if (estrito) return { alvo: t, sobre: false };
      if (sobre) return { alvo: null, sobre: true };
      let e = 0;
      for (let q = 1; q < 3; q++) if (s[q] < s[e]) e = q;
      const viz = arestas.get(chave(t[(e + 1) % 3], t[e]));
      if (!viz) break;
      t = viz;
    }
    let sobre = false;
    for (const u of triangulos) {
      const r = posicao(u, p);
      if (r.estrito) return { alvo: u, sobre: false };
      if (r.sobre) sobre = true;
    }
    return { alvo: null, sobre };
  };
  for (const p of extras) {
    const { alvo, sobre } = localizar(p);
    if (!alvo || sobre) continue;
    const id = pontos.length;
    tags.push({ tipo: 'extra', m: usados.length });
    usados.push(p);
    pontos.push(p);
    const [a, b, c] = alvo;
    remove(alvo);
    novo(a, b, id, alvo.setor); novo(b, c, id, alvo.setor); ultimo = novo(c, a, id, alvo.setor);
    legaliza([[a, b], [b, c], [c, a]]);
  }

  // as provas: contagem, área, cada aresta de borda uma vez, cada interna em duas direções
  const finais = [...triangulos];
  const esperado = contorno.length + cantosDeApoio + 2 * M - 2 + 2 * usados.length;
  if (finais.length !== esperado) return null;
  let area = 0;
  for (const [a, b, c] of finais) { const t = cruz2(pontos[a], pontos[b], pontos[c]) / 2; if (!(t > 0)) return null; area += t; }
  const areaDe = (P) => P.reduce((s, p, k) => { const q = P[(k + 1) % P.length]; return s + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0);
  const alvoArea = areaDe(contorno) - apoios.reduce((s, A) => s + areaDe(A), 0);
  if (Math.abs(area - alvoArea) > 1e-9 * Math.max(1, Math.abs(alvoArea))) return null;
  for (const [a, b, c] of finais) for (const [x, y] of [[a, b], [b, c], [c, a]]) {
    const fora = fixa.has(chave(x, y)) && !arestas.has(chave(y, x));
    if (!fora && !arestas.has(chave(y, x))) return null;
  }

  /* as famílias: a borda j do anel k é o quadrilátero da aresta j. Onde a aresta do apoio foi partida, o polígono teria cantos colineares, que o adaptador
     pode triangular com um triângulo de área nula; então a borda j fica só com o triângulo da aresta do furo e do canto do meio do apoio, e o resto do
     leque entra no preenchimento, onde o setor de j o recolhe. O resto é preenchimento. */
  const leque = [];
  const bordas = aneis.map((anel, k) => anel.map((_, j) => {
    const n = (j + 1) % L;
    const q0 = inicio[k][j];
    const q1 = inicio[k][n] === 0 ? apoios[k].length : inicio[k][n];
    const apoio = (q) => ({ tipo: 'apoio', k, j: q % apoios[k].length });
    if (q1 - q0 === 1) return { cantos: [{ tipo: 'anel', k, j: n }, { tipo: 'anel', k, j }, apoio(q0), apoio(q1)] };
    /* o canto do meio do apoio liga os dois cantos do furo; a metade de lá do leque sai do canto j do anel e a metade de cá do canto j+1, o mais perto
       de cada trecho, para o triângulo não ficar fino */
    const meio = q0 + Math.floor((q1 - q0) / 2);
    for (let q = q0; q < meio; q++) leque.push({ cantos: [{ tipo: 'anel', k, j }, apoio(q), apoio(q + 1)], k, j });
    for (let q = meio; q < q1; q++) leque.push({ cantos: [{ tipo: 'anel', k, j: n }, apoio(q), apoio(q + 1)], k, j });
    return { cantos: [{ tipo: 'anel', k, j: n }, { tipo: 'anel', k, j }, apoio(meio)] };
  }));
  /* Duas famílias que não se sobrepõem. `anexados` são as faces que a `borda j` (e a `saida j`) leva além do quadrilátero e que NÃO entram no
     `preenchimento`: o leque do apoio partido e, com UM furo, o setor inteiro, que é a área que a face `borda j` da repartição antiga cobria. O
     `preenchimento` é o resto: com UM furo, nada, como antes; com vários, os triângulos que não são do leque, e a `borda` cobre só o quadrilátero. */
  const anexados = leque.slice();
  const preenchimento = [];
  for (const t of finais) {
    const desc = { cantos: t.map((x) => tags[x]) };
    if (t.setor != null) anexados.push({ ...desc, k: 0, j: t.setor }); else preenchimento.push(desc);
  }
  return { bordas, preenchimento, anexados, apoios, extras: usados };
}

function sePerto(A, B, escala) {
  /* dois convexos se encostam ou se cruzam: eixo separador, como `aneisSeSobrepoem` do núcleo */
  const folga = 1e-9 * Math.max(1, escala);
  for (const [P, Q] of [[A, B], [B, A]]) {
    for (let k = 0; k < P.length; k++) {
      const p = P[k], q = P[(k + 1) % P.length];
      const len = dist(p, q);
      if (!(len > 0)) continue;
      const nx = -(q[1] - p[1]) / len, ny = (q[0] - p[0]) / len;
      let maxP = -Infinity, minP = Infinity, maxQ = -Infinity, minQ = Infinity;
      for (const r of P) { const t = r[0] * nx + r[1] * ny; maxP = Math.max(maxP, t); minP = Math.min(minP, t); }
      for (const r of Q) { const t = r[0] * nx + r[1] * ny; maxQ = Math.max(maxQ, t); minQ = Math.min(minQ, t); }
      if (minQ - maxP > folga || minP - maxQ > folga) return false;
    }
  }
  return true;
}
