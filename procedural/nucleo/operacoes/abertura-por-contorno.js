/* abertura-por-contorno.js (operação) — `aberturaPorContorno`: um vão na chapa pela curva que a receita desenha numa vista, sem
   depender das linhas da gaiola. Plano `docs/modelar/planos/encerrados/2026-11-05-abertura-de-contorno-livre.md`; as medidas da técnica estão
   em `docs/modelar/banco-de-provas/abertura-de-contorno-2026-11-05/README.md`.

   O CONTORNO é o de `curva2d.js` (`{ inicio, trechos }`, com reto, arco, arcoTangente, concordancia e spline), desenhado num plano
   perpendicular ao eixo da `vista` e projetado ao longo dele: na vista 'y' o ponto [u, v] é [x, z], na 'x' é [z, y] e na 'z' é
   [x, y]. O canto vivo é o encontro de dois trechos sem concordância; o arredondado, a concordância de raio declarado no ponto.

   O CORTE é o `subtrair` do núcleo (a booleana da Manifold, em `booleanas.js`), depois da subdivisão: o contorno vira um prisma
   ao longo do eixo da vista, mais longo que a chapa nos dois sentidos, e a booleana o tira da seleção `chapa`, que precisa ser um
   sólido fechado. A lei de identidade é a da booleana: face que o corte não toca fica com id e cantos, face cortada fica com o id no
   maior pedaço, e a parede do vão (o que sobra das laterais do prisma dentro da chapa) ganha id novo no bloco do passo, depois dos
   pedaços. O prisma não fica na peça, e nenhuma face dele entra em `consumidas`.

   A LIMPEZA DA COSTURA. A costura passa a décimos de milímetro, ou menos, de vértices e arestas da malha fina, e deixa lasca e
   triângulo sem área junto da borda (medido na fatia 1 em todas as dez posições do contorno). Depois do corte, em três passos:
     - `limparCostura` funde num ponto só a aresta que toca a costura e mede menos que `FRACAO_DA_FUSAO` da maior aresta das faces
       em volta, o canto da costura quase reto, a aresta mais curta da face sem área e, na face de pele fina presa à costura (a
       orelha de dois pontos de cruzamento e um ponto do desenho sobre um arco), a aresta mais curta que corre na costura, de modo
       que o ponto de cruzamento anda sobre o contorno até o vizinho. O vértice que fica é o do contorno desenhado
       (um ponto do polígono), depois o da costura, depois o da malha, de modo que a borda continua sobre o contorno e a malha fina
       em volta só se move pela aresta curta. A fusão só acontece quando não muda a topologia em volta (a aresta tem duas
       faces, os vizinhos comuns são os das faces triangulares que somem) e não vira face nenhuma;
     - `fundirLascas` junta à vizinha a face de pele que ainda sai fina (a ponta de um leque que a booleana abre de um vértice da
       malha para os pontos de um arco), quando o resultado sai convexo e sem canto quase reto;
     - `tirarValenciaDois` tira o vértice que ficou no meio da aresta entre duas faces só.
   A face que some era um pedaço sem área e, se era face de antes do passo, entra em `consumidas`. A lente passa pelos mesmos três.

   O PISO DE SEGMENTOS. O bico se mede contra o desenho, pela tangente dos trechos que o formam: a discretização troca o arco pela
   corda e o bico abre ou fecha meio segmento. A operação compara o ângulo de cada canto vivo do polígono com o de uma referência
   fina (`SEGMENTOS_DA_REFERENCIA` e o dobro dele por quarto de volta e por vão de spline, extrapolados ao limite, porque o erro da
   corda cai com o inverso dos segmentos) e recusa o contorno cujo erro passa de
   `ERRO_MAXIMO_DO_BICO`, o gate de forma do plano, dizendo qual o menor `segmentosArco` (ou `segmentosSpline`) que o mantém abaixo.

   AS RECUSAS, antes de mexer na malha: contorno que não fecha (o fecho implícito de `curva2d` vira um reto que ninguém desenhou),
   que se cruza, que sai da chapa (um ponto fora da projeção dela, ou um lado que cruza a borda dela vista do eixo), que atravessa a
   chapa mais de uma vez (a chapa dobrada sobre si na vista), com segmentos abaixo do piso e com o recuo da lente que o vão não
   comporta (um lado some ou o contorno recuado se cruza).

   A LENTE (`lente: true`). O pedaço retirado sai como sólido próprio, a interseção da chapa com o prisma do contorno recuado
   `recuoDaLente` para dentro do vão (cada lado levado para dentro, cada canto na esquadria: `recuarPoligono`), calculada pela
   Manifold aqui (todas as faces são novas, no bloco do passo, depois da parede) e limpa pela mesma fusão. A pele dela fica sobre a
   da chapa e a volta dela fica além da perna da aba que o friso dobra para dentro do vão; o recuo padrão é RECUO_PADRAO_DA_LENTE
   vezes a espessura da chapa medida pela reta do eixo antes do corte (`espessuraVistaDoEixo`), e o recuo 0 dá a lente do tamanho
   do vão. As faces de pele herdam o liso da chapa; nenhuma herda parte, cor nem material.

   ORIGEM PUBLICADA `{ op: 'aberturaPorContorno', id }`: as faces da chapa cortada, com a parede do vão. `parte: 'parede'` é só a
   parede, `parte: 'lente'` só a lente. O registro guarda também as duas bordas do vão (`borda.fora`, a da face de fora da chapa,
   e `borda.dentro`), como voltas de ids de vértice na ordem do contorno, e a espessura medida nelas; o `friso` lê a borda de fora
   por `superficie: { op: 'aberturaPorContorno', id }` (`bordaDaAbertura`). */
import { contornoPorTrechos, ErroDeCurva } from '../curva2d.js';
import { diagnosticarContorno } from '../contorno.js';
import { ErroDePerfil, triangularPerfil } from '../perfil2d.js';
import { convexo, fundir, melhorInicio, pedacosConvexos } from '../pedacos-convexos.js';
import { LIMITE_DE_FACE_FINA } from '../topologia.js';

/** As vistas: o eixo ao longo do qual o contorno é projetado e os eixos de u e v no plano do desenho. */
export const VISTAS = Object.freeze({ x: Object.freeze({ eixo: 0, u: 2, v: 1 }), y: Object.freeze({ eixo: 1, u: 0, v: 2 }), z: Object.freeze({ eixo: 2, u: 0, v: 1 }) });
/** O erro máximo do ângulo de um bico vivo, em graus: o gate 2 do plano. */
export const ERRO_MAXIMO_DO_BICO = 2;
/** A aresta da costura mais curta que esta fração da maior aresta das faces em volta é fundida num ponto só. A lasca que
 *  `topologia.js` reprova tem área / maior aresta² abaixo de 0,003, e o triângulo de base b e lados L chega lá com b < 0,006 L. */
export const FRACAO_DA_FUSAO = 0.01;
/** Segmentos por quarto de volta e por vão de spline da referência contra a qual o bico se mede: a corda dela erra 0,02 grau, e
 *  a extrapolação com o dobro tira esse erro. */
export const SEGMENTOS_DA_REFERENCIA = 2048;
const SEGMENTOS_MAXIMOS = 4096;
/** Giro, em graus, a partir do qual um ponto da referência fina é canto vivo. */
const GIRO_DO_CANTO_VIVO = 0.5;
const SEGMENTOS_ARCO_PADRAO = 4;
/** O recuo padrão da lente, em espessuras da chapa: a aba do friso dobra para dentro do vão e a face de fora da perna dela fica a
 *  raio + espessura da borda; com o raio da dobra até uma espessura, a lente recuada 2,5 espessuras fica ao menos meia espessura
 *  além dela. Na peça de teste (2 mm, aba de raio 1 mm) a lente fica a 1,685 mm da aba, e com 3 mm de recuo ainda a cruza no bico. */
export const RECUO_PADRAO_DA_LENTE = 2.5;
/** Distância, em metro, até a qual um vértice da costura é o ponto do polígono desenhado (a Manifold devolve Float32). */
const NO_POLIGONO = 2e-6;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const tamanho = (a) => Math.hypot(a[0], a[1], a[2]);
const mm = (x) => Number((x * 1000).toFixed(3));
const graus = (r) => (r * 180) / Math.PI;
const fmt = (x) => String(Number(x.toPrecision(4)));
const texto2 = (p) => `[${mm(p[0])}, ${mm(p[1])}] mm`;

function newell(pts) {
  const n = [0, 0, 0];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}
const areaDoPoligono2 = (p) => { let s = 0; for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const anguloEntre2 = (u, v) => graus(Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))))));

/* ---- o desenho: o fecho, o polígono e o piso de segmentos do bico ---- */

/** O ponto em que o último trecho termina, para a recusa do contorno que não fecha (os números já passaram por `contornoPorTrechos`). */
function fimDoContorno(contorno, num) {
  const pt = (p) => [num(p[0]), num(p[1])];
  let atual = pt(contorno.inicio);
  for (const t of contorno.trechos) {
    const [tipo] = Object.keys(t); const corpo = t[tipo];
    if (tipo === 'reto' || tipo === 'arcoTangente') atual = pt(corpo);
    else if (tipo === 'arco') {
      if (corpo.ate != null) atual = pt(corpo.ate);
      else {
        const c = pt(corpo.centro); const a = (num(corpo.angulo) * Math.PI) / 180;
        const d = [atual[0] - c[0], atual[1] - c[1]];
        atual = [c[0] + d[0] * Math.cos(a) - d[1] * Math.sin(a), c[1] + d[0] * Math.sin(a) + d[1] * Math.cos(a)];
      }
    } else if (tipo === 'spline') { const lista = Array.isArray(corpo) ? corpo : corpo.pontos; atual = pt(lista[lista.length - 1]); }
  }
  return atual;
}

/** Os cantos vivos de um polígono de referência fina: índice, ponto e abertura em graus (o ângulo entre os dois lados). */
function cantosVivos(poligono) {
  const n = poligono.length; const cantos = [];
  for (let k = 0; k < n; k++) {
    const p = poligono[k], a = poligono[(k - 1 + n) % n], b = poligono[(k + 1) % n];
    const ida = [p[0] - a[0], p[1] - a[1]], volta = [b[0] - p[0], b[1] - p[1]];
    if (anguloEntre2(ida, volta) > GIRO_DO_CANTO_VIVO) cantos.push({ p, abertura: anguloEntre2([a[0] - p[0], a[1] - p[1]], [b[0] - p[0], b[1] - p[1]]) });
  }
  return cantos;
}

/** Os cantos vivos do desenho, com a abertura extrapolada de duas referências finas (n e 2n): a(∞) ≈ 2 a(2n) − a(n). */
function cantosDoDesenho(contorno, num) {
  const fino = (n) => cantosVivos(contornoPorTrechos(contorno, { num, segmentosArco: n, segmentosSpline: n }));
  const um = fino(SEGMENTOS_DA_REFERENCIA); const dois = fino(2 * SEGMENTOS_DA_REFERENCIA);
  return dois.map((c) => {
    const par = um.find((q) => Math.hypot(q.p[0] - c.p[0], q.p[1] - c.p[1]) <= 1e-8);
    return par ? { p: c.p, abertura: 2 * c.abertura - par.abertura } : c;
  });
}

/** errosDosBicos(contorno, { num, segmentosArco, segmentosSpline }, referencia) -> [{ p, desenhado, discretizado, erro }]
 *  O ângulo de cada canto vivo do polígono que a discretização dá, contra o da referência fina (o desenho). */
export function errosDosBicos(contorno, { num = (x) => x, segmentosArco = SEGMENTOS_ARCO_PADRAO, segmentosSpline } = {}, referencia = null) {
  const ref = referencia ?? cantosDoDesenho(contorno, num);
  const poligono = contornoPorTrechos(contorno, { num, segmentosArco, segmentosSpline });
  const n = poligono.length;
  return ref.map((c) => {
    const k = poligono.findIndex((q) => Math.hypot(q[0] - c.p[0], q[1] - c.p[1]) <= 1e-8);
    if (k < 0) return { p: c.p, desenhado: c.abertura, discretizado: null, erro: 0 };
    const p = poligono[k], a = poligono[(k - 1 + n) % n], b = poligono[(k + 1) % n];
    const discretizado = anguloEntre2([a[0] - p[0], a[1] - p[1]], [b[0] - p[0], b[1] - p[1]]);
    return { p: c.p, desenhado: c.abertura, discretizado, erro: Math.abs(discretizado - c.abertura) };
  });
}

/** pisoDeSegmentos(contorno, opcoes) -> { arco, spline }: o menor segmentosArco (com o segmentosSpline dado) e o menor
 *  segmentosSpline (com o segmentosArco dado) que deixam todo bico vivo abaixo de ERRO_MAXIMO_DO_BICO; null quando nem com
 *  SEGMENTOS_MAXIMOS o campo sozinho chega lá. */
export function pisoDeSegmentos(contorno, { num = (x) => x, segmentosArco = SEGMENTOS_ARCO_PADRAO, segmentosSpline } = {}) {
  const ref = cantosDoDesenho(contorno, num);
  const passa = (nA, nS) => errosDosBicos(contorno, { num, segmentosArco: nA, segmentosSpline: nS }, ref).every((e) => e.erro < ERRO_MAXIMO_DO_BICO);
  const menor = (teste) => {
    if (!teste(SEGMENTOS_MAXIMOS)) return null;
    let lo = 1, hi = SEGMENTOS_MAXIMOS;
    while (lo < hi) { const m = (lo + hi) >> 1; if (teste(m)) hi = m; else lo = m + 1; }
    return lo;
  };
  return { arco: menor((n) => passa(n, segmentosSpline)), spline: menor((n) => passa(segmentosArco, n)) };
}

/** A distância do ponto ao triângulo, em 3D. */
function distanciaAoTriangulo(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const no = (q) => tamanho(sub(p, q));
  const naReta = (u, v) => { const uv = sub(v, u); const l2 = ponto(uv, uv); const t = l2 > 0 ? Math.max(0, Math.min(1, ponto(sub(p, u), uv) / l2)) : 0; return no(soma(u, [uv[0] * t, uv[1] * t, uv[2] * t])); };
  const n = cruz(ab, ac); const l = tamanho(n);
  if (!(l > 0)) return Math.min(naReta(a, b), naReta(b, c), naReta(c, a));
  const N = n.map((x) => x / l); const h = ponto(ap, N);
  const q = sub(p, N.map((x) => x * h));
  const dentro = [[a, b], [b, c], [c, a]].every(([u, v]) => ponto(cruz(sub(v, u), sub(q, u)), N) >= 0);
  if (dentro) return Math.abs(h);
  return Math.min(naReta(a, b), naReta(b, c), naReta(c, a));
}

/* ---- a projeção: a chapa vista do eixo ---- */

/** A chapa vista do eixo da vista: quantas vezes a reta do eixo por cada ponto do contorno atravessa a casca, e se algum lado do
 *  contorno cruza a borda dela (a aresta entre uma face virada para o eixo e outra que não está). Devolve null ou a recusa. */
function conferirProjecao(V, faces, poligono, vista) {
  const { eixo, u: iu, v: iv } = VISTAS[vista];
  const proj = (p) => [p[iu], p[iv]];
  const lado = new Map(); const tris = [];
  for (const [fid, vs] of faces) {
    const pts = vs.map((v) => V.get(v));
    const n = newell(pts); const l = tamanho(n);
    const s = l > 0 && Math.abs(n[eixo] / l) > 0.1 ? Math.sign(n[eixo]) : 0;
    lado.set(fid, s);
    if (!s) continue;
    const q = pts.map(proj);
    for (let k = 1; k + 1 < q.length; k++) {
      const t = [q[0], q[k], q[k + 1]]; const w = [pts[0][eixo], pts[k][eixo], pts[k + 1][eixo]];
      const caixa = [Math.min(t[0][0], t[1][0], t[2][0]), Math.min(t[0][1], t[1][1], t[2][1]), Math.max(t[0][0], t[1][0], t[2][0]), Math.max(t[0][1], t[1][1], t[2][1])];
      tris.push({ fid, t, w, caixa });
    }
  }
  const camadas = (p) => {
    const profundidades = [];
    for (const { fid, t, w, caixa } of tris) {
      if (p[0] < caixa[0] || p[0] > caixa[2] || p[1] < caixa[1] || p[1] > caixa[3]) continue;
      const d = (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1]);
      if (d === 0) continue;
      const s = ((p[0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (p[1] - t[0][1])) / d;
      const r = ((t[1][0] - t[0][0]) * (p[1] - t[0][1]) - (p[0] - t[0][0]) * (t[1][1] - t[0][1])) / d;
      if (s < -1e-12 || r < -1e-12 || s + r > 1 + 1e-12) continue;
      profundidades.push({ fid, w: w[0] + s * (w[1] - w[0]) + r * (w[2] - w[0]) });
    }
    profundidades.sort((a, b) => a.w - b.w);
    const distintas = [];
    for (const x of profundidades) if (!distintas.length || x.w - distintas[distintas.length - 1] > 1e-7) distintas.push(x.w);
    return distintas.length;
  };
  const n = poligono.length;
  for (let k = 0; k < n; k++) {
    for (const p of [poligono[k], [(poligono[k][0] + poligono[(k + 1) % n][0]) / 2, (poligono[k][1] + poligono[(k + 1) % n][1]) / 2]]) {
      const c = camadas(p);
      if (c === 0) return `o ponto ${texto2(p)} do contorno fica fora da chapa vista do eixo ${vista}: o vão precisa caber inteiro dentro dela; traga o contorno para dentro ou troque a vista`;
      if (c > 2) return `no ponto ${texto2(p)} do contorno a reta do eixo ${vista} atravessa a chapa ${Math.floor(c / 2)} vezes: a chapa se dobra sobre si nesta vista e o corte abriria mais de uma camada; desenhe o contorno numa vista em que a chapa passa uma vez só`;
    }
  }
  /* a borda da chapa vista do eixo: a aresta entre faces de lados diferentes */
  const donos = new Map();
  for (const [fid, vs] of faces) for (let k = 0; k < vs.length; k++) {
    const a = vs[k], b = vs[(k + 1) % vs.length];
    const chave = a < b ? `${a},${b}` : `${b},${a}`;
    if (!donos.has(chave)) donos.set(chave, [a, b, []]);
    donos.get(chave)[2].push(fid);
  }
  const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  for (const [a, b, fs] of donos.values()) {
    if (fs.length === 2 && lado.get(fs[0]) === lado.get(fs[1])) continue;
    const pa = proj(V.get(a)), pb = proj(V.get(b));
    for (let k = 0; k < n; k++) {
      const c = poligono[k], d = poligono[(k + 1) % n];
      if (orient(pa, pb, c) !== orient(pa, pb, d) && orient(c, d, pa) !== orient(c, d, pb)) {
        return `o lado do contorno de ${texto2(c)} a ${texto2(d)} cruza a borda da chapa vista do eixo ${vista}: o vão precisa caber inteiro dentro dela; traga o contorno para dentro`;
      }
    }
  }
  return null;
}

/** espessuraVistaDoEixo(V, faces, poligono, vista) -> metro | null: a espessura da chapa nos pontos do contorno, antes do corte,
 *  pela reta do eixo: a distância entre a primeira e a última vez que ela cruza a casca, vezes o cosseno da normal da face de cima
 *  com o eixo (a espessura medida pela normal, numa chapa de duas faces paralelas). A mediana dos pontos; a lente recuada usa esta
 *  medida no recuo padrão, porque é calculada antes do corte, e o registro guarda também a medida da borda, depois dele. */
export function espessuraVistaDoEixo(V, faces, poligono, vista) {
  const { eixo, u: iu, v: iv } = VISTAS[vista];
  const tris = [];
  for (const vs of faces.values()) {
    const pts = vs.map((v) => V.get(v));
    const n = newell(pts); const l = tamanho(n);
    if (!(l > 0) || Math.abs(n[eixo] / l) <= 0.1) continue;
    for (let k = 1; k + 1 < pts.length; k++) tris.push({ p: [pts[0], pts[k], pts[k + 1]], cos: Math.abs(n[eixo] / l) });
  }
  const medidas = [];
  for (const q of poligono) {
    let baixo = null, alto = null;
    for (const { p: [a, b, c], cos } of tris) {
      const d = (b[iu] - a[iu]) * (c[iv] - a[iv]) - (c[iu] - a[iu]) * (b[iv] - a[iv]);
      if (d === 0) continue;
      const s = ((q[0] - a[iu]) * (c[iv] - a[iv]) - (c[iu] - a[iu]) * (q[1] - a[iv])) / d;
      const r = ((b[iu] - a[iu]) * (q[1] - a[iv]) - (q[0] - a[iu]) * (b[iv] - a[iv])) / d;
      if (s < -1e-12 || r < -1e-12 || s + r > 1 + 1e-12) continue;
      const w = a[eixo] + s * (b[eixo] - a[eixo]) + r * (c[eixo] - a[eixo]);
      if (!baixo || w < baixo.w) baixo = { w, cos };
      if (!alto || w > alto.w) alto = { w, cos };
    }
    if (baixo && alto && alto.w > baixo.w) medidas.push((alto.w - baixo.w) * alto.cos);
  }
  medidas.sort((x, y) => x - y);
  return medidas.length ? medidas[medidas.length >> 1] : null;
}

/** recuarPoligono(poligono, d) -> { poligono, lados } | { erro }: o polígono com cada lado levado `d` para dentro e cada canto no
 *  encontro dos dois lados recuados (a esquadria: o bico vivo continua vivo, com o mesmo ângulo, e entra d / sen(meio ângulo)).
 *  O lado que o recuo encolhe a nada antes de `d` sai, e os vizinhos dele se encontram (o evento de aresta do esqueleto reto, um
 *  de cada vez, do que some primeiro): junto de um bico vivo, o segmento curto do arco que o forma some assim. `lados` diz quantos
 *  saíram. Recusa o recuo que fecha o vão, ou que deixa o polígono recuado se cruzar (o vão estreito demais para ele). */
export function recuarPoligono(poligono, d) {
  if (!(d > 0)) return { poligono: poligono.map((p) => [...p]), lados: 0 };
  const sentido = Math.sign(areaDoPoligono2(poligono));
  const n0 = poligono.length;
  /* cada lado é a reta dele, com a direção e a normal para dentro; o canto i é o encontro dos lados i − 1 e i, linear em d */
  let lados = poligono.map((q, k) => {
    const b = poligono[(k + 1) % n0]; const t = [b[0] - q[0], b[1] - q[1]]; const l = Math.hypot(t[0], t[1]);
    return { q, dir: [t[0] / l, t[1] / l], nor: [(-sentido * t[1]) / l, (sentido * t[0]) / l] };
  });
  const encontro = (A, B, s) => {
    const pa = [A.q[0] + A.nor[0] * s, A.q[1] + A.nor[1] * s], pb = [B.q[0] + B.nor[0] * s, B.q[1] + B.nor[1] * s];
    const den = A.dir[0] * B.dir[1] - A.dir[1] * B.dir[0];
    if (Math.abs(den) < 1e-12) return null;
    const t = ((pb[0] - pa[0]) * B.dir[1] - (pb[1] - pa[1]) * B.dir[0]) / den;
    return [pa[0] + A.dir[0] * t, pa[1] + A.dir[1] * t];
  };
  for (let volta = 0; volta < n0; volta++) {
    const n = lados.length;
    if (n < 3) return { erro: `o recuo de ${mm(d)} mm fecha o vão inteiro` };
    const zero = []; const um = [];
    for (let k = 0; k < n; k++) {
      const A = lados[(k - 1 + n) % n], B = lados[k];
      const c0 = encontro(A, B, 0), c1 = encontro(A, B, 1);
      if (!c0 || !c1) return { erro: `com o recuo de ${mm(d)} mm dois lados paralelos do contorno, perto de ${texto2(B.q)}, se encontram` };
      zero.push(c0); um.push(c1);
    }
    /* o lado k vai do canto k ao canto k + 1, com o comprimento ao longo da direção dele linear em d */
    let sai = -1, primeiro = Infinity;
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n; const { dir } = lados[k];
      const comprimento = (zero[j][0] - zero[k][0]) * dir[0] + (zero[j][1] - zero[k][1]) * dir[1];
      const taxa = (um[j][0] - zero[j][0] - um[k][0] + zero[k][0]) * dir[0] + (um[j][1] - zero[j][1] - um[k][1] + zero[k][1]) * dir[1];
      if (!(taxa < 0)) continue;
      const quando = -comprimento / taxa;
      if (quando < d && quando < primeiro) { primeiro = quando; sai = k; }
    }
    if (sai < 0) {
      const novo = zero.map((c, k) => [c[0] + (um[k][0] - c[0]) * d, c[1] + (um[k][1] - c[1]) * d]);
      const diagnostico = diagnosticarContorno(novo);
      if (diagnostico || Math.sign(areaDoPoligono2(novo)) !== sentido) return { erro: `com o recuo de ${mm(d)} mm o contorno recuado se cruza${diagnostico ? ` (${diagnostico.mensagem.replace(/\[(-?[\d.e-]+), (-?[\d.e-]+)\]/g, (_, u, v) => texto2([Number(u), Number(v)]))})` : ''}: o vão é estreito demais para ele` };
      return { poligono: novo, lados: n0 - n };
    }
    lados = lados.filter((_, k) => k !== sai);
  }
  return { erro: `o recuo de ${mm(d)} mm fecha o vão inteiro` };
}

/* ---- o prisma ---- */

/** O prisma do contorno ao longo do eixo, de `de` a `ate`: { pontos, faces }, fechado e com as faces para fora. */
function prismaDoContorno(poligono, vista, de, ate) {
  const { eixo, u: iu, v: iv } = VISTAS[vista];
  const ccw = areaDoPoligono2(poligono) > 0 ? poligono : [...poligono].reverse();
  const N = ccw.length;
  const em3d = (q, w) => { const p = [0, 0, 0]; p[iu] = q[0]; p[iv] = q[1]; p[eixo] = w; return p; };
  const pontos = [...ccw.map((q) => em3d(q, de)), ...ccw.map((q) => em3d(q, ate))];
  const faces = [];
  for (let g = 0; g < N; g++) faces.push([g, (g + 1) % N, N + ((g + 1) % N), N + g]);
  const tampa = triangularPerfil({ componentes: [{ externo: ccw, furos: [] }] });
  for (const [a, b, c] of tampa.triangulos) { faces.push([a, c, b]); faces.push([N + a, N + b, N + c]); }
  /* o sentido certo em (u, v, eixo) pode ser o errado em (x, y, z): o volume com sinal decide */
  let volume = 0;
  for (const f of faces) for (let k = 1; k + 1 < f.length; k++) volume += ponto(pontos[f[0]], cruz(pontos[f[k]], pontos[f[k + 1]]));
  if (volume < 0) for (const f of faces) f.reverse();
  return { pontos, faces };
}

/* ---- a limpeza da costura ---- */

/** limparCostura({ pos, faces, costura, fixos, fracao }) -> { faces, fundidos, removidas }
 *  `faces` é um Map id -> lista de vértices (a casca inteira em volta da costura), `costura` o conjunto dos vértices da costura e
 *  `fixos` os da costura que são pontos do polígono desenhado. Funde, enquanto houver, a aresta que toca a costura e mede menos que
 *  `fracao` da maior aresta das faces dela, o canto da costura quase reto (o triângulo com os vizinhos abaixo de dez vezes `piso`)
 *  no vizinho mais perto, a aresta mais curta da face sem área e, na face de pele fina (fora de `parede`), a aresta mais curta que
 *  corre na costura; o vértice que fica é o fixo, depois o da costura, depois o de
 *  menor id. Devolve as faces novas (sem as que sumiram), o mapa vértice que saiu -> vértice que ficou e os ids das faces que
 *  sumiram. */
export function limparCostura({ pos, faces, costura, fixos, fracao = FRACAO_DA_FUSAO, piso = 0, parede = new Set() }) {
  const F = new Map([...faces].map(([id, vs]) => [id, [...vs]]));
  const fundidos = new Map(); const removidas = [];
  const posicao = (v) => pos(v);
  const nivel = (v) => (fixos.has(v) ? 2 : costura.has(v) ? 1 : 0);
  const recusadas = new Set();
  for (let volta = 0; volta < 10000; volta++) {
    const facesDe = new Map(); const arestas = new Map();
    for (const [id, vs] of F) for (let k = 0; k < vs.length; k++) {
      const a = vs[k], b = vs[(k + 1) % vs.length];
      if (!facesDe.has(a)) facesDe.set(a, new Set());
      facesDe.get(a).add(id);
      if (!costura.has(a) && !costura.has(b)) continue;
      const chave = a < b ? `${a},${b}` : `${b},${a}`;
      if (!arestas.has(chave)) arestas.set(chave, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
      arestas.get(chave).faces.push(id);
    }
    const maiorAresta = (id) => { const vs = F.get(id); let m = 0; for (let k = 0; k < vs.length; k++) m = Math.max(m, tamanho(sub(posicao(vs[k]), posicao(vs[(k + 1) % vs.length])))); return m; };
    const candidatas = [];
    for (const [chave, e] of arestas) {
      if (recusadas.has(chave)) continue;
      const l = tamanho(sub(posicao(e.a), posicao(e.b)));
      const ref = Math.max(...e.faces.map(maiorAresta));
      if (l < fracao * ref) candidatas.push({ chave, l, ...e });
    }
    /* o canto quase reto (o triângulo com os vizinhos abaixo de dez pisos de área), que o adaptador cortaria numa orelha sem
       área, se funde ao vizinho mais perto; a face sem área perde a aresta mais curta */
    if (piso > 0) for (const [id, vs] of F) {
      if (!vs.some((v) => costura.has(v))) continue;
      const n = vs.length;
      const pares = [];
      if (tamanho(newell(vs.map(posicao))) / 2 < 10 * piso) {
        let k0 = 0; for (let k = 1; k < n; k++) if (tamanho(sub(posicao(vs[k]), posicao(vs[(k + 1) % n]))) < tamanho(sub(posicao(vs[k0]), posicao(vs[(k0 + 1) % n])))) k0 = k;
        pares.push([vs[k0], vs[(k0 + 1) % n]]);
      }
      /* a face fina presa à costura (a orelha de dois pontos de cruzamento e um ponto do desenho sobre um arco) perde a aresta mais
         curta que corre na costura: o ponto de cruzamento anda sobre o contorno até o vizinho */
      if (!parede.has(id) && razaoDaFace(vs.map(posicao)) < 1.5 * LIMITE_DE_FACE_FINA) {
        let melhor = null;
        for (let k = 0; k < n; k++) {
          const a = vs[k], b = vs[(k + 1) % n];
          if (!costura.has(a) || !costura.has(b) || (fixos.has(a) && fixos.has(b))) continue;
          const l = tamanho(sub(posicao(a), posicao(b)));
          if (!melhor || l < melhor.l) melhor = { l, par: [a, b] };
        }
        if (melhor) pares.push(melhor.par);
      }
      for (let k = 0; k < n; k++) {
        const v = vs[k]; if (!costura.has(v) || fixos.has(v)) continue;
        const a = vs[(k - 1 + n) % n], b = vs[(k + 1) % n];
        if (tamanho(cruz(sub(posicao(a), posicao(v)), sub(posicao(b), posicao(v)))) / 2 >= 10 * piso) continue;
        pares.push([v, tamanho(sub(posicao(a), posicao(v))) <= tamanho(sub(posicao(b), posicao(v))) ? a : b]);
      }
      for (const [x, y] of pares) {
        const chave = x < y ? `${x},${y}` : `${y},${x}`;
        if (recusadas.has(chave) || !arestas.has(chave) || candidatas.some((c) => c.chave === chave)) continue;
        candidatas.push({ chave, l: tamanho(sub(posicao(x), posicao(y))), ...arestas.get(chave) });
      }
    }
    candidatas.sort((x, y) => x.l - y.l || x.a - y.a || x.b - y.b);
    let fez = false;
    for (const c of candidatas) {
      /* quem fica: o de nível maior; dois fixos só se fundem quando são o mesmo ponto do desenho (a booleana às vezes deixa dois a
         menos de um mícron), e o empate fica com o menor id */
      const na = nivel(c.a), nb = nivel(c.b);
      if (na === 2 && nb === 2 && !(c.l <= 2 * NO_POLIGONO)) { recusadas.add(c.chave); continue; }
      const [sai, fica] = na > nb ? [c.b, c.a] : nb > na ? [c.a, c.b] : [c.b, c.a];
      if (!fusaoValida(F, facesDe, sai, fica, posicao)) { recusadas.add(c.chave); continue; }
      for (const id of [...facesDe.get(sai)]) {
        const vs = F.get(id).map((v) => (v === sai ? fica : v));
        const limpa = vs.filter((v, k) => v !== vs[(k + 1) % vs.length]);
        if (limpa.length < 3) { F.delete(id); removidas.push(id); } else F.set(id, limpa);
      }
      fundidos.set(sai, fica);
      for (const [a, b] of fundidos) if (b === sai) fundidos.set(a, fica);
      fez = true;
      break;
    }
    if (!fez) break;
  }
  return { faces: F, fundidos, removidas };
}

/* A fusão de `sai` em `fica` mantém a casca: a aresta tem exatamente duas faces, que a têm em sequência; nenhuma outra face
   tem os dois; os vizinhos comuns são só os terceiros cantos das faces triangulares da aresta; e nenhuma face em volta de `sai`
   vira (a normal dela não inverte nem zera). */
function fusaoValida(F, facesDe, sai, fica, pos) {
  const deSai = facesDe.get(sai) ?? new Set(); const deFica = facesDe.get(fica) ?? new Set();
  const daAresta = [...deSai].filter((id) => deFica.has(id));
  if (daAresta.length !== 2) return false;
  const terceiros = new Set();
  for (const id of daAresta) {
    const vs = F.get(id); const k = vs.indexOf(sai); const n = vs.length;
    if (vs[(k + 1) % n] !== fica && vs[(k - 1 + n) % n] !== fica) return false;
    if (n === 3) terceiros.add(vs.find((v) => v !== sai && v !== fica));
  }
  const vizinhos = (v, deV) => { const s = new Set(); for (const id of deV) { const vs = F.get(id); const k = vs.indexOf(v); s.add(vs[(k + 1) % vs.length]); s.add(vs[(k - 1 + vs.length) % vs.length]); } return s; };
  const nSai = vizinhos(sai, deSai); const nFica = vizinhos(fica, deFica);
  for (const w of nSai) if (w !== fica && nFica.has(w) && !terceiros.has(w)) return false;
  for (const id of deSai) {
    if (deFica.has(id)) continue;
    const vs = F.get(id);
    const antes = newell(vs.map(pos)); const depois = newell(vs.map((v) => pos(v === sai ? fica : v)));
    if (!(ponto(antes, depois) > 0) || !(tamanho(depois) > 1e-6 * tamanho(antes))) return false;
  }
  return true;
}

/** A face fina, pela conta de `topologia.js`: área / maior aresta². */
function razaoDaFace(pts) {
  let maior = 0;
  for (let k = 0; k < pts.length; k++) maior = Math.max(maior, tamanho(sub(pts[k], pts[(k + 1) % pts.length])));
  return maior > 0 ? tamanho(newell(pts)) / 2 / (maior * maior) : 0;
}

/* O polígono, visto pela própria normal, não cruza a si mesmo (lados não vizinhos não se cortam). */
function poligonoSimples(pts) {
  const n = newell(pts); const l = tamanho(n);
  if (!(l > 0)) return false;
  const N = n.map((x) => x / l);
  const e = Math.abs(N[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const U = cruz(e, N); const lu = tamanho(U); const u = U.map((x) => x / lu); const w = cruz(N, u);
  const q = pts.map((p) => [ponto(p, u), ponto(p, w)]);
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const m = q.length;
  for (let i = 0; i < m; i++) for (let j = i + 2; j < m; j++) {
    if (i === 0 && j === m - 1) continue;
    const a = q[i], b = q[(i + 1) % m], c = q[j], d = q[(j + 1) % m];
    if (orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0) return false;
  }
  return true;
}

/** fundirLascas({ pos, faces, costura, parede, limite, preferir, piso }) -> { faces, removidas }
 *  A face de pele que toca a costura e sai fina (área / maior aresta² abaixo de `limite`) se funde à vizinha, pela aresta mais
 *  longa dela primeiro, quando o resultado sai convexo, no sentido da vizinha e sem canto quase reto (o triângulo com os vizinhos
 *  abaixo de dez pisos de área), para nenhuma orelha que o adaptador corta ficar sem área; fica o id que `preferir(a, b)` escolhe.
 *  Os cantos de antes ficam todos, então a casca continua fechada; a lasca que não acha fusão assim fica, e o gate a acusa. */
export function fundirLascas({ pos, faces, costura, parede, limite = 1.5 * LIMITE_DE_FACE_FINA, preferir = (a) => a, piso = 0 }) {
  /* o resultado precisa sair convexo e sem canto quase reto: assim nenhuma orelha que o adaptador corta fica sem área */
  const aceita = (m, referencia) => {
    const pts = m.map(pos); const n = newell(pts);
    /* o sentido de cada pedaço é o da face de origem: um pedaço virado (a diagonal por fora do polígono) não passa */
    if (!(ponto(n, referencia) > 0) || !convexo(pos, m, referencia, 1e-6)) return false;
    for (let k = 0; k < pts.length; k++) if (tamanho(cruz(sub(pts[(k - 1 + pts.length) % pts.length], pts[k]), sub(pts[(k + 1) % pts.length], pts[k]))) / 2 < 10 * piso) return false;
    return true;
  };
  const F = new Map([...faces].map(([id, vs]) => [id, [...vs]]));
  const removidas = [];
  const recusadas = new Set();
  for (let volta = 0; volta < 10000; volta++) {
    const dono = new Map();
    for (const [id, vs] of F) for (let k = 0; k < vs.length; k++) dono.set(`${vs[k]}>${vs[(k + 1) % vs.length]}`, id);
    const lascas = [...F].filter(([id, vs]) => !parede.has(id) && !recusadas.has(id) && vs.some((v) => costura.has(v)) && razaoDaFace(vs.map(pos)) < limite)
      .sort((x, y) => razaoDaFace(x[1].map(pos)) - razaoDaFace(y[1].map(pos)) || x[0] - y[0]);
    let fez = false;
    for (const [id, vs] of lascas) {
      const arestas = vs.map((v, k) => [v, vs[(k + 1) % vs.length]]).sort((p, q) => tamanho(sub(pos(q[0]), pos(q[1]))) - tamanho(sub(pos(p[0]), pos(p[1]))));
      for (const [x, y] of arestas) {
        const outra = dono.get(`${y}>${x}`);
        if (outra == null || parede.has(outra)) continue;
        const m = fundir(F.get(outra), vs);
        if (!m || new Set(m).size !== m.length || !poligonoSimples(m.map(pos)) || !aceita(m, newell(F.get(outra).map(pos)))) continue;
        const fica = preferir(outra, id); const sai = fica === outra ? id : outra;
        F.delete(sai); F.set(fica, melhorInicio(pos, m)); removidas.push(sai);
        fez = true;
        break;
      }
      if (fez) break;
      recusadas.add(id);
    }
    if (!fez) break;
  }
  return { faces: F, removidas };
}

/** tirarValenciaDois(faces) -> { faces, removidas }: o vértice que só duas faces usam, com os mesmos dois vizinhos nas duas, está no
 *  meio da aresta entre elas (as duas dividiriam duas arestas, a dobra que `topologia.js` reprova); ele sai das duas, como na
 *  booleana. A face que fica com menos de três cantos some. */
export function tirarValenciaDois(faces) {
  const F = new Map([...faces].map(([id, vs]) => [id, [...vs]]));
  const removidas = [];
  for (let volta = 0; volta < 8; volta++) {
    const usos = new Map();
    for (const [id, vs] of F) for (const v of vs) { if (!usos.has(v)) usos.set(v, []); usos.get(v).push(id); }
    let tirou = false;
    for (const [v, donos] of [...usos].sort((x, y) => x[0] - y[0])) {
      if (donos.length !== 2 || !donos.every((id) => F.has(id))) continue;
      const vizinhos = donos.map((id) => { const vs = F.get(id); const k = vs.indexOf(v); return new Set([vs[(k - 1 + vs.length) % vs.length], vs[(k + 1) % vs.length]]); });
      if (![...vizinhos[0]].every((w) => vizinhos[1].has(w))) continue;
      for (const id of donos) F.set(id, F.get(id).filter((w) => w !== v));
      tirou = true;
    }
    for (const [id, vs] of [...F]) if (vs.length < 3) { F.delete(id); removidas.push(id); }
    if (!tirou) break;
  }
  return { faces: F, removidas };
}

/* ---- a interseção da lente, direto na Manifold ---- */

/** A interseção de dois sólidos { pontos, faces } (faces por índice, fechados e orientados), em pedaços convexos por face de
 *  entrada: { pontos, faces: [{ solido, face, vs }] }. Os pontos são os da saída da Manifold (Float32, em coordenada local). */
function intersecaoNaManifold(wasm, solidos) {
  const todos = solidos.flatMap((s) => s.pontos);
  const min = [0, 1, 2].map((c) => Math.min(...todos.map((p) => p[c]))), max = [0, 1, 2].map((c) => Math.max(...todos.map((p) => p[c])));
  const centro = [0, 1, 2].map((c) => (min[c] + max[c]) / 2);
  const grade = 2 ** Math.floor(Math.log2(Math.max(...[0, 1, 2].map((c) => max[c] - min[c])) * 2 ** -20));
  const local = (p) => [0, 1, 2].map((c) => Math.round((p[c] - centro[c]) / grade) * grade);
  const entradas = []; const manifolds = [];
  try {
    solidos.forEach((s, k) => {
      const tris = []; const ids = [];
      s.faces.forEach((f, j) => { const e = entradas.length; entradas.push({ solido: k, face: j, normal: newell(f.map((v) => s.pontos[v])) }); for (let t = 1; t + 1 < f.length; t++) { tris.push(f[0], f[t], f[t + 1]); ids.push(e); } });
      const props = new Float32Array(s.pontos.length * 3);
      s.pontos.forEach((p, t) => props.set(local(p), t * 3));
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: props, triVerts: Uint32Array.from(tris), faceID: Uint32Array.from(ids) });
      mesh.merge();
      manifolds.push(new wasm.Manifold(mesh));
      const estado = manifolds[k].status();
      if (estado !== 'NoError') throw new TypeError(`a Manifold recusou o sólido ${k} da lente: ${estado}`);
    });
    const r = wasm.Manifold.intersection(manifolds);
    try {
      if (r.isEmpty()) throw new TypeError('a interseção da chapa com o prisma do contorno saiu vazia');
      const malha = r.getMesh();
      const nP = malha.numProp, VP = malha.vertProperties, TV = malha.triVerts;
      const nV = VP.length / nP;
      const pai = Array.from({ length: nV }, (_, k) => k);
      const raiz = (k) => { while (pai[k] !== k) { pai[k] = pai[pai[k]]; k = pai[k]; } return k; };
      for (let k = 0; k < (malha.mergeFromVert?.length ?? 0); k++) { const a = raiz(malha.mergeFromVert[k]), b = raiz(malha.mergeToVert[k]); if (a !== b) pai[Math.max(a, b)] = Math.min(a, b); }
      const indice = new Map(); const pontos = [];
      const idDe = (j) => { const r0 = raiz(j); if (!indice.has(r0)) { indice.set(r0, pontos.length); pontos.push([VP[r0 * nP] + centro[0], VP[r0 * nP + 1] + centro[1], VP[r0 * nP + 2] + centro[2]]); } return indice.get(r0); };
      const porFace = new Map();
      for (let t = 0; t < TV.length / 3; t++) {
        const tri = [idDe(TV[3 * t]), idDe(TV[3 * t + 1]), idDe(TV[3 * t + 2])];
        if (new Set(tri).size < 3) continue;
        const e = malha.faceID[t];
        if (!porFace.has(e)) porFace.set(e, []);
        porFace.get(e).push(tri);
      }
      const pos = (v) => pontos[v];
      const faces = [];
      /* o pedaço sem área (três pontos da costura numa reta, que a Manifold deixa onde o contorno cruza a diagonal de uma face
         torta) se funde ao vizinho mesmo sem convexidade, com o piso de área da booleana */
      const escala = Math.max(...[0, 1, 2].map((c) => max[c] - min[c]));
      const piso = 2e-9 * escala * escala;
      for (const e of [...porFace.keys()].sort((a, b) => a - b)) {
        const { solido, face, normal } = entradas[e];
        for (const P of pedacosConvexos(pos, porFace.get(e), normal, piso)) faces.push({ solido, face, vs: P });
      }
      return { pontos, faces };
    } finally { r.delete(); }
  } finally { for (const m of manifolds) m.delete(); }
}

/* ---- as bordas do vão ---- */

/** As voltas de borda entre a parede e o resto da casca, cada uma uma lista de vértices; `faces` é a casca, `parede` o conjunto
 *  das faces da parede. Cada volta segue a aresta no sentido em que a face que não é parede a percorre. */
function voltasDaBorda(faces, parede) {
  const proximo = new Map();
  for (const [id, vs] of faces) {
    if (parede.has(id)) continue;
    for (let k = 0; k < vs.length; k++) proximo.set(`${vs[k]}>${vs[(k + 1) % vs.length]}`, [vs[k], vs[(k + 1) % vs.length]]);
  }
  const seguinte = new Map();
  for (const [id, vs] of faces) {
    if (!parede.has(id)) continue;
    for (let k = 0; k < vs.length; k++) {
      const a = vs[k], b = vs[(k + 1) % vs.length];
      if (proximo.has(`${b}>${a}`)) seguinte.set(b, a);
    }
  }
  const vistos = new Set(); const voltas = [];
  for (const inicio of [...seguinte.keys()].sort((a, b) => a - b)) {
    if (vistos.has(inicio)) continue;
    const volta = []; let c = inicio;
    while (c != null && !vistos.has(c)) { vistos.add(c); volta.push(c); c = seguinte.get(c); }
    if (c !== inicio) return null;
    voltas.push(volta);
  }
  return voltas;
}

/* ---- a operação ---- */

export function criarOperacoesAberturaPorContorno(servicos) {
  const { BLOCO, FAIXA_ESTENDIDA, BASE_ESTENDIDA, idDoPasso, grita, addV, addF, registraOrigem, resolverSelecao, textoDeclaracoes, subtrair, manifoldCarregada, erroDaCargaDaManifold } = servicos;
  const OP = 'aberturaPorContorno';
  const localDe = (i, id) => {
    if (id >= i * BLOCO && id < (i + 1) * BLOCO) return id - i * BLOCO;
    const base = BASE_ESTENDIDA + i * FAIXA_ESTENDIDA;
    return id >= base && id < base + FAIXA_ESTENDIDA ? BLOCO + id - base : null;
  };
  const proximoLocal = (mapa, i) => { let m = -1; for (const id of mapa.keys()) { const k = localDe(i, id); if (k != null && k > m) m = k; } return m + 1; };

  return {
  aberturaPorContorno(st, a, i) {
    if (a.origemId == null) return grita(st, i, OP, 'origemId', `${OP} é sempre estrutural: origemId é obrigatório (a chapa cortada, a parede e a borda do vão são citadas por ele)`);
    if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) return grita(st, i, OP, 'origemId', 'origemId precisa ser inteiro não-negativo');
    const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
    if (declaracoes.length > 1) return grita(st, i, OP, 'origemId', textoDeclaracoes(a.origemId, declaracoes));
    if (a.chapa == null) return grita(st, i, OP, 'chapa', "chapa é a seleção do sólido fechado que o vão corta, como { origem: { op: 'subdivisao', id } } de uma chapa com espessura");
    if (!Object.hasOwn(VISTAS, a.vista)) return grita(st, i, OP, 'vista', `vista precisa ser 'x', 'y' ou 'z', o eixo ao longo do qual o contorno é projetado (na 'y' o ponto [u, v] é [x, z], na 'x' é [z, y] e na 'z' é [x, y]); veio ${JSON.stringify(a.vista)}`);
    const vista = a.vista;
    const contorno = a.contorno;
    if (!contorno || typeof contorno !== 'object' || Array.isArray(contorno)) return grita(st, i, OP, 'contorno', 'contorno precisa ser { inicio: [u, v], trechos: [...] }, o de curva2d (reto, arco, arcoTangente, concordancia e spline), em metros na vista');
    let segmentosArco; let segmentosSpline;
    try {
      segmentosArco = a.segmentosArco == null ? SEGMENTOS_ARCO_PADRAO : st.num(a.segmentosArco);
      segmentosSpline = a.segmentosSpline == null ? undefined : st.num(a.segmentosSpline);
    } catch (e) { return grita(st, i, OP, 'segmentosArco', String(e.message)); }
    for (const [campo, n] of [['segmentosArco', segmentosArco], ['segmentosSpline', segmentosSpline]]) {
      if (n != null && (!Number.isInteger(n) || n < 1 || n > SEGMENTOS_MAXIMOS)) return grita(st, i, OP, campo, `${campo} precisa ser inteiro de 1 a ${SEGMENTOS_MAXIMOS}, e veio ${n}`);
    }
    if (a.lente != null && typeof a.lente !== 'boolean') return grita(st, i, OP, 'lente', 'lente só aceita true (o pedaço retirado sai como sólido próprio) ou false');
    let recuoDeclarado = null;
    if (a.recuoDaLente != null) {
      if (!a.lente) return grita(st, i, OP, 'recuoDaLente', 'recuoDaLente recua a lente para dentro do vão, e o passo não declarou lente: true; declare a lente ou tire o recuo');
      try { recuoDeclarado = st.num(a.recuoDaLente); } catch (e) { return grita(st, i, OP, 'recuoDaLente', String(e.message)); }
      if (!Number.isFinite(recuoDeclarado) || recuoDeclarado < 0) return grita(st, i, OP, 'recuoDaLente', `recuoDaLente é a distância, em metro e zero ou mais, de que a volta da lente entra no vão a partir da borda; veio ${a.recuoDaLente}`);
    }
    const num = (x) => st.num(x);

    // ---- o desenho ----
    let poligono;
    try { poligono = contornoPorTrechos(contorno, { campo: 'contorno', num, segmentosArco, segmentosSpline }); } catch (e) {
      if (e instanceof ErroDeCurva) return grita(st, i, OP, e.campo, `${e.message}`);
      throw e;
    }
    const inicio = [num(contorno.inicio[0]), num(contorno.inicio[1])];
    const fim = fimDoContorno(contorno, num);
    const folga = Math.hypot(fim[0] - inicio[0], fim[1] - inicio[1]);
    if (folga > 1e-9) return grita(st, i, OP, 'contorno', `o contorno não fecha: o último trecho termina em ${texto2(fim)}, a ${mm(folga)} mm do início ${texto2(inicio)}, e o vão fecharia por um reto que ninguém desenhou; termine o último trecho no início (por exemplo { reto: inicio }, ou o arco que volta a ele)`);
    const diagnostico = diagnosticarContorno(poligono);
    if (diagnostico) return grita(st, i, OP, 'contorno', `o contorno se cruza: ${diagnostico.mensagem.replace(/\[(-?[\d.e-]+), (-?[\d.e-]+)\]/g, (_, u, v) => texto2([Number(u), Number(v)]))}; o vão precisa de um contorno simples, que não toque a si mesmo`);
    const erros = errosDosBicos(contorno, { num, segmentosArco, segmentosSpline });
    const pior = erros.reduce((m, e) => (e.erro > (m?.erro ?? -1) ? e : m), null);
    if (pior && pior.erro >= ERRO_MAXIMO_DO_BICO) {
      const piso = pisoDeSegmentos(contorno, { num, segmentosArco, segmentosSpline });
      const conserto = piso.arco != null
        ? `o piso deste contorno é segmentosArco ${piso.arco}${segmentosSpline != null ? ` (com segmentosSpline ${segmentosSpline})` : ''}`
        : piso.spline != null ? `o piso deste contorno é segmentosSpline ${piso.spline} (com segmentosArco ${segmentosArco})` : 'nem segmentosArco nem segmentosSpline sozinhos chegam lá; suba os dois';
      return grita(st, i, OP, 'segmentosArco', `o bico em ${texto2(pior.p)} sai com ${fmt(pior.discretizado)} graus contra ${fmt(pior.desenhado)} desenhados (diferença de ${fmt(pior.erro)}, acima dos ${ERRO_MAXIMO_DO_BICO} graus do gate de forma): a corda do primeiro segmento da curva que forma o bico se afasta da tangente dela; ${conserto}`);
    }

    // ---- a chapa vista do eixo ----
    const wasm = manifoldCarregada();
    if (!wasm) return grita(st, i, OP, null, `${OP} precisa da biblioteca Manifold, que não carregou: ${erroDaCargaDaManifold()?.message ?? 'motivo desconhecido'}`);
    const antes = st.orfaos.length;
    const selecao = resolverSelecao(st, a.chapa, OP, i);
    if (st.orfaos.length > antes) return;
    const idsDaChapa = [...selecao.faces].sort((x, y) => x - y);
    if (!idsDaChapa.length) return grita(st, i, OP, 'chapa', 'a seleção da chapa não tem face nenhuma');
    const facesDaChapa = new Map(idsDaChapa.map((id) => [id, [...st.F.get(id).vs]]));
    const recusa = conferirProjecao(st.V, facesDaChapa, poligono, vista);
    if (recusa) return grita(st, i, OP, 'contorno', recusa);
    const { eixo } = VISTAS[vista];
    let wMin = Infinity, wMax = -Infinity;
    for (const vs of facesDaChapa.values()) for (const v of vs) { const w = st.V.get(v)[eixo]; wMin = Math.min(wMin, w); wMax = Math.max(wMax, w); }
    const margem = 0.25 * (wMax - wMin) + 1e-3;
    let prisma;
    try { prisma = prismaDoContorno(poligono, vista, wMin - margem, wMax + margem); } catch (e) {
      if (e instanceof ErroDePerfil) return grita(st, i, OP, 'contorno', e.message);
      throw e;
    }
    /* a cópia da chapa antes do corte, para a lente */
    const vertDaChapa = [...new Set(idsDaChapa.flatMap((id) => facesDaChapa.get(id)))].sort((x, y) => x - y);
    const indiceDaChapa = new Map(vertDaChapa.map((v, k) => [v, k]));
    /* o piso de área da booleana, 2e-9 do quadrado do tamanho da chapa: o canto e a face abaixo de dez pisos se fundem */
    const escala = Math.max(...[0, 1, 2].map((c) => Math.max(...vertDaChapa.map((v) => st.V.get(v)[c])) - Math.min(...vertDaChapa.map((v) => st.V.get(v)[c]))));
    const piso = 2e-9 * escala * escala;
    const copia = a.lente ? { pontos: vertDaChapa.map((v) => [...st.V.get(v)]), faces: idsDaChapa.map((id) => facesDaChapa.get(id).map((v) => indiceDaChapa.get(v))), liso: idsDaChapa.map((id) => st.F.get(id).liso) } : null;

    /* a lente sai da Manifold aqui, antes de o corte mexer na peça: a recusa dela não deixa a chapa cortada pela metade */
    const { u: iu, v: iv } = VISTAS[vista];
    const noPoligono = (P) => (p) => P.some((q) => Math.hypot(p[iu] - q[0], p[iv] - q[1]) <= NO_POLIGONO);
    const noDesenho = noPoligono(poligono);
    let lenteCalculada = null;
    let recuoDaLente = null;
    if (copia) {
      /* a lente recuada: a interseção da chapa com o prisma do contorno recuado, de modo que a volta dela fica além da perna da
         aba que o friso dobra na borda, e a pele dela continua sobre a da chapa */
      if (recuoDeclarado != null) recuoDaLente = recuoDeclarado;
      else {
        const e = espessuraVistaDoEixo(st.V, facesDaChapa, poligono, vista);
        if (e == null) return grita(st, i, OP, 'recuoDaLente', 'a espessura da chapa no contorno não se mede pela reta do eixo, e o recuo padrão da lente depende dela; declare recuoDaLente em metro');
        recuoDaLente = RECUO_PADRAO_DA_LENTE * e;
      }
      const recuado = recuarPoligono(poligono, recuoDaLente);
      if (recuado.erro) return grita(st, i, OP, 'recuoDaLente', `a lente não cabe no vão: ${recuado.erro}; reduza recuoDaLente (o recuo de 0 deixa a lente do tamanho do vão)`);
      let r;
      try { r = intersecaoNaManifold(wasm, [copia, recuoDaLente > 0 ? prismaDoContorno(recuado.poligono, vista, wMin - margem, wMax + margem) : prisma]); } catch (e) { return grita(st, i, OP, 'lente', `a lente não saiu: ${e.message}`); }
      const facesL = new Map(r.faces.map((f, k) => [k, f.vs]));
      const paredeL = new Set(r.faces.map((f, k) => (f.solido === 1 ? k : -1)).filter((k) => k >= 0));
      const costuraL = new Set([...paredeL].flatMap((k) => facesL.get(k)));
      const naVoltaDaLente = noPoligono(recuado.poligono);
      const fixosL = new Set([...costuraL].filter((v) => naVoltaDaLente(r.pontos[v])));
      const limpaL0 = limparCostura({ pos: (v) => r.pontos[v], faces: facesL, costura: costuraL, fixos: fixosL, piso, parede: paredeL });
      lenteCalculada = { r, limpaL: tirarValenciaDois(fundirLascas({ pos: (v) => r.pontos[v], faces: limpaL0.faces, costura: costuraL, parede: paredeL, piso }).faces) };
    }

    // ---- o corte: o prisma entra no fim da faixa do passo, a booleana o tira da chapa, e ele sai ----
    const topo = BLOCO + FAIXA_ESTENDIDA;
    const idPV = (g) => idDoPasso(i, topo - prisma.pontos.length + g);
    const idPF = (g) => idDoPasso(i, topo - prisma.faces.length + g);
    prisma.pontos.forEach((p, g) => addV(st, idPV(g), p));
    prisma.faces.forEach((f, g) => addF(st, idPF(g), f.map(idPV)));
    const doPrisma = new Set(prisma.faces.map((_, g) => idPF(g)));
    const tirarPrisma = () => {
      for (const f of doPrisma) { st.F.delete(f); st.consumidas.delete(f); }
      for (let g = 0; g < prisma.pontos.length; g++) st.V.delete(idPV(g));
    };
    const antesDoCorte = st.orfaos.length;
    subtrair(st, { origemId: a.origemId, solidos: [a.chapa, { f: [...doPrisma] }] }, i);
    if (st.orfaos.length > antesDoCorte) {
      for (const o of st.orfaos.slice(antesDoCorte)) { o.op = OP; o.ref = o.ref === 'solidos' || o.ref === 'solidos[0]' ? 'chapa' : o.ref; o.motivo = `o corte da chapa pela booleana recusou: ${o.motivo}`; }
      tirarPrisma();
      return;
    }
    const registros = st.origens.get(a.origemId);
    const doCorte = registros.pop();
    if (!registros.length) st.origens.delete(a.origemId);
    for (const f of doPrisma) st.consumidas.delete(f);
    for (let g = 0; g < prisma.pontos.length; g++) st.V.delete(idPV(g));

    /* a parede: o que sobrou das laterais do prisma (a face que guardou o id dele e os pedaços dela), com id novo depois dos pedaços */
    const daParede = (f) => doPrisma.has(f) || doPrisma.has(st.pedacosDe.get(f));
    let proximaFace = proximoLocal(new Map([...st.F].filter(([id]) => !doPrisma.has(id))), i);
    const renumerada = new Map();
    for (const f of doCorte.faces.filter((id) => doPrisma.has(id)).sort((x, y) => x - y)) {
      const face = st.F.get(f); const novo = idDoPasso(i, proximaFace++);
      st.F.delete(f); face.id = novo; st.F.set(novo, face); renumerada.set(f, novo);
    }
    const facesDoCorte = doCorte.faces.map((f) => renumerada.get(f) ?? f);
    const parede = new Set(doCorte.faces.filter(daParede).map((f) => renumerada.get(f) ?? f));
    for (const [pedaco, pai] of [...st.pedacosDe]) if (doPrisma.has(pai)) st.pedacosDe.delete(pedaco);

    // ---- a limpeza da costura ----
    const costura = new Set([...parede].flatMap((f) => st.F.get(f).vs));
    const fixos = new Set([...costura].filter((v) => noDesenho(st.V.get(v))));
    const posDaPeca = (v) => st.V.get(v);
    const limpa = limparCostura({ pos: posDaPeca, faces: new Map(facesDoCorte.map((f) => [f, st.F.get(f).vs])), costura, fixos, piso, parede });
    const antesDaFusao = new Map([...limpa.fundidos.keys()].map((v) => [v, [...st.V.get(v)]]));
    /* na fusão de lascas fica a face de antes do passo, que guarda a identidade; entre duas do mesmo tipo, a vizinha */
    const lascas = fundirLascas({ pos: posDaPeca, faces: limpa.faces, costura, parede, piso, preferir: (outra, lasca) => (localDe(i, outra) != null && localDe(i, lasca) == null ? lasca : outra) });
    const valencia = tirarValenciaDois(lascas.faces);
    const tocados = new Set([...limpa.faces.values(), ...facesDoCorte.map((f) => st.F.get(f).vs)].flat());
    for (const f of [...limpa.removidas, ...lascas.removidas, ...valencia.removidas]) {
      st.F.delete(f); parede.delete(f); st.pedacosDe.delete(f);
      if (localDe(i, f) == null) st.consumidas.set(f, { passo: i, op: OP });
    }
    for (const [f, vs] of valencia.faces) {
      const face = st.F.get(f);
      if (face.vs.length !== vs.length || face.vs.some((v, k) => v !== vs[k])) { face.vs = melhorInicio(posDaPeca, vs); face.tinta = []; }
    }
    const usados = new Set(); for (const f of st.F.values()) for (const v of f.vs) usados.add(v);
    for (const v of tocados) if (!usados.has(v)) st.V.delete(v);
    const facesDaChapaCortada = facesDoCorte.filter((f) => st.F.has(f)).sort((x, y) => x - y);
    /* o quanto a fusão mexeu na superfície: a distância de cada vértice que saiu às faces que ficaram em volta do que ficou */
    let desvioDaFusao = 0;
    for (const [sai, p] of antesDaFusao) {
      const fica = limpa.fundidos.get(sai);
      let d = Infinity;
      for (const f of facesDaChapaCortada) {
        const vs = st.F.get(f).vs;
        if (!vs.includes(fica)) continue;
        for (let k = 1; k + 1 < vs.length; k++) d = Math.min(d, distanciaAoTriangulo(p, st.V.get(vs[0]), st.V.get(vs[k]), st.V.get(vs[k + 1])));
      }
      if (Number.isFinite(d)) desvioDaFusao = Math.max(desvioDaFusao, d);
    }

    // ---- as bordas: a de fora é a que encosta na face externa de uma chapa por subdivisão, ou a voltada para o eixo ----
    const casca = new Map(facesDaChapaCortada.map((f) => [f, st.F.get(f).vs]));
    const voltas = voltasDaBorda(casca, parede);
    if (!voltas || voltas.length !== 2) return grita(st, i, OP, 'chapa', `o corte deixou ${voltas ? voltas.length : 'uma'} borda${voltas?.length === 1 ? '' : 's'} ${voltas ? '' : 'que não fecha '}em vez das duas de uma chapa (a de fora e a de dentro); confira que a chapa é uma chapa com espessura que o contorno atravessa uma vez`);
    const externas = new Set();
    for (const regs of st.origens.values()) for (const r of regs) if (r.op === 'subdivisao' && Array.isArray(r.externa)) for (const f of r.externa) externas.add(f);
    const raizDe = (f) => { let x = f; while (st.pedacosDe.has(x)) x = st.pedacosDe.get(x); return x; };
    const facesDaVolta = (volta) => { const s = new Set(volta); return facesDaChapaCortada.filter((f) => !parede.has(f) && st.F.get(f).vs.some((v) => s.has(v))); };
    const naExterna = (volta) => facesDaVolta(volta).some((f) => externas.has(raizDe(f)));
    const paraOEixo = (volta) => facesDaVolta(volta).reduce((s, f) => s + newell(st.F.get(f).vs.map((v) => st.V.get(v)))[eixo], 0);
    let [fora, dentro] = voltas;
    const ef = naExterna(fora), ed = naExterna(dentro);
    if (ef !== ed ? ed : paraOEixo(dentro) > paraOEixo(fora)) [fora, dentro] = [dentro, fora];
    /* cada volta começa no ponto do início do desenho e anda no sentido em que ele foi desenhado */
    const sentidoDesenhado = Math.sign(areaDoPoligono2(poligono));
    const ordenar = (volta) => {
      const q = volta.map((v) => [st.V.get(v)[iu], st.V.get(v)[iv]]);
      let lista = Math.sign(areaDoPoligono2(q)) === sentidoDesenhado ? [...volta] : [...volta].reverse();
      const k = lista.findIndex((v) => Math.hypot(st.V.get(v)[iu] - poligono[0][0], st.V.get(v)[iv] - poligono[0][1]) <= NO_POLIGONO);
      if (k > 0) lista = [...lista.slice(k), ...lista.slice(0, k)];
      return lista;
    };
    fora = ordenar(fora); dentro = ordenar(dentro);
    /* a espessura, medida pela normal da pele de fora entre os pontos do desenho das duas bordas */
    const espessuras = [];
    for (const v of fora) {
      if (!fixos.has(v)) continue;
      const p = st.V.get(v);
      const par = dentro.find((w) => fixos.has(w) && Math.hypot(st.V.get(w)[iu] - p[iu], st.V.get(w)[iv] - p[iv]) <= NO_POLIGONO);
      if (par == null) continue;
      const n = facesDaChapaCortada.filter((f) => !parede.has(f) && st.F.get(f).vs.includes(v)).reduce((s, f) => soma(s, newell(st.F.get(f).vs.map((x) => st.V.get(x)))), [0, 0, 0]);
      if (tamanho(n) > 0) espessuras.push(Math.abs(ponto(sub(p, st.V.get(par)), n)) / tamanho(n));
    }
    espessuras.sort((x, y) => x - y);
    const espessura = espessuras.length ? espessuras[espessuras.length >> 1] : null;

    // ---- a lente, calculada antes do corte e posta na peça depois da parede ----
    const lente = [];
    if (lenteCalculada) {
      const { r, limpaL } = lenteCalculada;
      const usadosL = [...new Set([...limpaL.faces.values()].flat())].sort((x, y) => x - y);
      const base = proximoLocal(st.V, i);
      if (base + usadosL.length > topo || proximaFace + limpaL.faces.size > topo) return grita(st, i, OP, 'lente', `a lente estoura o bloco e a faixa estendida de ids do passo (${topo})`);
      const idV = new Map(usadosL.map((v, k) => [v, idDoPasso(i, base + k)]));
      for (const v of usadosL) addV(st, idV.get(v), r.pontos[v]);
      for (const [k, vs] of [...limpaL.faces].sort((x, y) => x[0] - y[0])) {
        const id = idDoPasso(i, proximaFace++);
        addF(st, id, melhorInicio((v) => r.pontos[v], vs).map((v) => idV.get(v)));
        const origem = r.faces[k];
        if (origem.solido === 0) st.F.get(id).liso = copia.liso[origem.face];
        lente.push(id);
      }
    }

    (st.aberturas ??= []).push({ passo: i, origemId: a.origemId, vista, borda: { fora: [...fora], dentro: [...dentro] }, espessura, parede: [...parede].sort((x, y) => x - y), lente: [...lente], recuoDaLente, limpeza: { verticesFundidos: limpa.fundidos.size, desvioDaFusao, facesSemArea: limpa.removidas.length + valencia.removidas.length, lascas: lascas.removidas.length } });
    registraOrigem(st, i, OP, a.origemId, {
      faces: facesDaChapaCortada, parede: [...parede].sort((x, y) => x - y), lente, borda: { fora, dentro }, espessura, vista, passo: i, lenteDeclarada: !!a.lente, recuoDaLente,
      /* o que a limpeza fez na chapa: vértices fundidos e o quanto a superfície saiu do lugar deles, faces que sumiram e lascas */
      limpeza: { verticesFundidos: limpa.fundidos.size, desvioDaFusao, facesSemArea: limpa.removidas.length + valencia.removidas.length, lascas: lascas.removidas.length },
    });
  },
  };
}

/** bordaDaAbertura(st, origem) -> { pontos, normais, faces, cadeia, espessura, passo } | { erro }
 *  A borda de fora do vão que o passo `aberturaPorContorno` da origem abriu, como o `friso` a lê: os pontos da volta na posição
 *  de agora, a normal de cada um (a soma das normais das faces de pele em volta), as faces de pele que tocam a volta (para o lado
 *  da chapa) e a volta de ids, com o primeiro repetido no fim. */
export function bordaDaAbertura(st, origem) {
  if (!origem || typeof origem !== 'object' || Object.keys(origem).some((k) => k !== 'op' && k !== 'id')) return { erro: "a superfície de uma abertura é { op: 'aberturaPorContorno', id }, sem parte: a aba segue a borda de fora do vão" };
  const declaracoes = st.declaracoesOrigem.get(origem.id) ?? [];
  if (declaracoes.length !== 1 || declaracoes[0].op !== 'aberturaPorContorno') return { erro: `nenhum passo aberturaPorContorno declara a origem ${origem.id}${declaracoes.length > 1 ? ' sozinho' : ''}` };
  const registro = (st.origens.get(origem.id) ?? []).find((r) => r.op === 'aberturaPorContorno');
  if (!registro) return { erro: `o passo aberturaPorContorno da origem ${origem.id} ainda não foi executado ou gritou; ele precisa vir antes do friso` };
  const parede = new Set(registro.parede);
  const volta = registro.borda.fora;
  const naVolta = new Set(volta);
  const pele = registro.faces.filter((f) => st.F.has(f) && !parede.has(f) && st.F.get(f).vs.some((v) => naVolta.has(v)));
  const pontos = []; const normais = [];
  for (const v of volta) {
    const p = st.V.get(v);
    if (!p) return { erro: `o vértice ${v} da borda do vão não existe mais; o friso lê a borda como o passo ${registro.passo} a deixou` };
    const n = pele.filter((f) => st.F.get(f).vs.includes(v)).reduce((s, f) => soma(s, newell(st.F.get(f).vs.map((x) => st.V.get(x)))), [0, 0, 0]);
    pontos.push(p); normais.push(n);
  }
  return { pontos, normais, faces: pele.map((f) => st.F.get(f).vs), cadeia: [...volta, volta[0]], espessura: registro.espessura, passo: registro.passo };
}

/** alturaDaMalha(vertices, faces) -> (x, z) => y: a altura da malha onde a vertical por (x, z) a cruza, pela face que contém o
 *  ponto visto de cima (cada face em leque a partir do primeiro canto). Para a superfície de uma chapa sem dobra sobre si, que a
 *  vertical cruza uma vez só; a peça de teste a usa para medir a borda do vão contra a chapa sem vão. */
export function alturaDaMalha(vertices, faces) {
  const tris = [];
  for (const f of faces) for (let k = 1; k + 1 < f.length; k++) tris.push([vertices[f[0]], vertices[f[k]], vertices[f[k + 1]]]);
  return (x, z) => {
    for (const [a, b, c] of tris) {
      const d = (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]);
      if (d === 0) continue;
      const s = ((x - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (z - a[2])) / d;
      const t = ((b[0] - a[0]) * (z - a[2]) - (x - a[0]) * (b[2] - a[2])) / d;
      if (s >= -1e-12 && t >= -1e-12 && s + t <= 1 + 1e-12) return a[1] + s * (b[1] - a[1]) + t * (c[1] - a[1]);
    }
    throw new TypeError(`abertura por contorno: o ponto [${x}, ${z}] fica fora da chapa vista de cima`);
  };
}
