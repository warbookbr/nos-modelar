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

   A VIZINHANÇA. A booleana solda, confere e remonta toda face que recebe, e a chapa de um corpo tem centenas de milhares delas para um
   vão que ocupa um canto (no furgão, 41 dos 99 s de uma execução eram a booleana da chapa inteira em sete vãos). O `subtrair` recebe
   só o trecho da chapa em volta do vão (`vizinhancaDoVao`): as faces cuja caixa toca a do prisma e as que dividem um vértice com elas,
   de modo que as faces da borda do trecho não tocam o prisma e saem da booleana como entraram. O trecho de uma chapa com espessura
   tem uma volta de borda na pele de fora e outra na de dentro, e a banda (`bandaDaVizinhanca`, um zíper entre as duas voltas) o fecha
   num sólido que a Manifold aceita; dois tetraedros pequenos, nos cantos da caixa da chapa (`andaimeDaCaixa`), fazem a booleana e a
   Manifold medirem seus limiares na caixa da chapa inteira, como antes do recorte (sem eles a grade do furgão saía 5 mm diferente).
   A banda e o andaime saem da peça depois do corte, e o registro guarda a chapa inteira: as faces que a booleana não viu ficam como
   estavam. O trecho que alcança a parede de outro vão, ou a lateral da chapa, onde as peles se juntam e a borda tem uma volta só,
   perde as faces de parede (`soltarParedes`: a face sem pele do outro lado, a até duas espessuras na direção contrária à normal) e a
   banda refaz a parede entre as voltas que sobram. A borda tem número par de voltas, duas por anel de pele (o vão vizinho que o trecho
   envolve deixa quatro): a banda casa cada volta com a mais próxima, a da outra pele, e mede cada par pela aresta e pela espessura
   dele. O trecho que ainda não fecha (a parede toca o prisma, ou tiradas as faces de parede a borda toca a si mesma) engole o tubo de
   parede inteiro do vão vizinho (`absorverTubos`: as faces de parede ligadas às que ele já tem, as de pele que dividem vértice com
   elas, e a face que ficou de fora no meio do trecho, o poço), de modo que a borda corre só pelas peles. O trecho que ainda não fecha
   por uma banda de voltas em pares, o que passa de metade da chapa e a banda torcida (a diagonal dela passa de uma vez e
   meia a hipotenusa da maior aresta da borda com a espessura, e não do porte da borda, que a malha grossa estoura sem que as voltas
   deixem de se corresponder) não recortam, e a booleana vê a chapa inteira, como antes; `vizinhanca` no registro diz qual
   foi e por quê (a chapa de menos de FACES_MINIMAS_PARA_RECORTAR faces também não recorta). O vértice novo da booleana recebe o id na ordem da saída da Manifold, que muda com a malha que ela recebe, e a
   limpeza desempata fusões por id: a malha de um vão recortado pode diferir, por uma fusão a mais ou a menos, da do vão que a
   booleana vê a chapa inteira, na mesma forma até a fusão (a diferença medida no furgão está no plano da vizinhança).

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

   A CAMADA (`sentido: '+'` ou `'-'`). Num corpo fechado, como uma carroceria inteira, a reta do eixo atravessa a chapa mais de uma
   vez (a frente e a traseira, vistas pela frente), e sem `sentido` a operação recusa, porque o prisma abriria as duas. Com `sentido`
   ela corta só a camada vista desse lado do eixo ('+' é quem olha de +eixo para -eixo): mede, nos pontos do contorno, nos meios dos
   lados e numa grade de pontos de dentro dele, a profundidade da face de dentro da primeira camada e a da face de fora da camada
   seguinte, e o prisma vai de fora da chapa até o meio do vão entre as duas. A recusa de ponto fora da chapa e a de lado que cruza a
   borda dela valem só para a primeira camada, e a espessura da lente se mede nela. Recusa quando as duas camadas se sobrepõem em
   profundidade, sem plano que passe entre elas em todos os pontos. Pedaço de chapa que fique entre os pontos medidos e mais perto que
   esse plano seria cortado também; a grade de dentro existe para isso, e o contorno que cobre uma região muito acidentada pede
   conferência na bancada.

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

/** quadroDaVista(vista) -> { nome, eixo, u, v, local(p), mundo(p) } | null. Nos três eixos, os índices de VISTAS sobre as coordenadas
 *  como estão (local e mundo são a identidade, e a malha sai a mesma de antes). Num vetor [dx, dy, dz], a vista olha ao longo dele: o
 *  desenho fica no plano perpendicular, com u horizontal (perpendicular a y e ao vetor; no vetor vertical, x) e v = d × u, e `local`
 *  leva um ponto a [u, v, w], com w ao longo do vetor; `mundo` faz o inverso. O quadro é ortonormal e direito. */
export function quadroDaVista(vista) {
  if (typeof vista === 'string') {
    if (!Object.hasOwn(VISTAS, vista)) return null;
    const { eixo, u, v } = VISTAS[vista];
    return { nome: `do eixo ${vista}`, eixo, u, v, identidade: true, alinhada: true, local: (p) => p, mundo: (p) => p };
  }
  if (!Array.isArray(vista) || vista.length !== 3 || !vista.every(Number.isFinite)) return null;
  const l = Math.hypot(...vista);
  if (!(l > 0)) return null;
  const d = vista.map((c) => c / l);
  let u = cruz([0, 1, 0], d);
  if (tamanho(u) < 1e-9) u = [1, 0, 0];
  u = u.map((c) => c / tamanho(u));
  const v = cruz(d, u);
  return {
    nome: `da direção [${vista.map((c) => fmt(c)).join(', ')}]`, eixo: 2, u: 0, v: 1, alinhada: d.filter((c) => Math.abs(c) > 1e-12).length === 1,
    local: (p) => [ponto(p, u), ponto(p, v), ponto(p, d)],
    mundo: (q) => [0, 1, 2].map((c) => q[0] * u[c] + q[1] * v[c] + q[2] * d[c]),
  };
}
/* um mapa de vértices visto no quadro, com o ponto local guardado na primeira leitura */
const noQuadro = (V, q) => { if (q.identidade) return V; const memo = new Map(); return { get: (v) => { if (!memo.has(v)) { const p = V.get(v); memo.set(v, p && q.local(p)); } return memo.get(v); } }; };
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
function conferirProjecao(Vmundo, faces, poligono, q, sentido = null) {
  const V = noQuadro(Vmundo, q);
  const { eixo, u: iu, v: iv } = q; const vista = q.nome;
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
  /* só os triângulos cuja caixa toca a do contorno podem estar sob um ponto medido (todos ficam dentro dela): num corpo fechado
     de centenas de milhares de faces, medir cada ponto contra a casca inteira custava mais que o corte */
  const caixaDoContorno = [Math.min(...poligono.map((p) => p[0])), Math.min(...poligono.map((p) => p[1])), Math.max(...poligono.map((p) => p[0])), Math.max(...poligono.map((p) => p[1]))];
  const perto = tris.filter(({ caixa }) => !(caixa[2] < caixaDoContorno[0] || caixa[0] > caixaDoContorno[2] || caixa[3] < caixaDoContorno[1] || caixa[1] > caixaDoContorno[3]));
  const camadas = (p) => {
    const profundidades = [];
    for (const { fid, t, w, caixa } of perto) {
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
    return distintas;
  };
  const n = poligono.length;
  const doContorno = [];
  for (let k = 0; k < n; k++) doContorno.push(poligono[k], [(poligono[k][0] + poligono[(k + 1) % n][0]) / 2, (poligono[k][1] + poligono[(k + 1) % n][1]) / 2]);
  let corte = null;
  if (!sentido) {
    for (const p of doContorno) {
      const c = camadas(p).length;
      if (c === 0) return { recusa: `o ponto ${texto2(p)} do contorno fica fora da chapa vista ${vista}: o vão precisa caber inteiro dentro dela; traga o contorno para dentro ou troque a vista` };
      if (c > 2) return { recusa: `no ponto ${texto2(p)} do contorno a reta ${vista} atravessa a chapa ${Math.floor(c / 2)} vezes: a chapa se dobra sobre si nesta vista e o corte abriria mais de uma camada; desenhe o contorno numa vista em que a chapa passa uma vez só, ou declare sentido ('+' ou '-') para cortar só a camada vista desse lado do eixo` };
    }
  } else {
    /* a primeira camada vista do lado `sentido`: a face de dentro dela e a de fora da seguinte, em cada ponto medido */
    const sinal = sentido === '+' ? 1 : -1;
    let dentroMaisFundo = Infinity; let seguinteMaisPerto = -Infinity; let ondeDentro = null; let ondeSeguinte = null;
    const medidos = [...doContorno, ...pontosDeDentro(poligono)];
    for (const p of medidos) {
      const ds = camadas(p).map((w) => sinal * w).sort((a, b) => b - a); // do mais perto de quem olha ao mais longe
      if (ds.length === 0) {
        if (medidos.indexOf(p) < doContorno.length) return { recusa: `o ponto ${texto2(p)} do contorno fica fora da chapa vista ${vista}: o vão precisa caber inteiro dentro dela; traga o contorno para dentro ou troque a vista` };
        continue;
      }
      const dentro = ds[Math.min(1, ds.length - 1)];
      if (dentro < dentroMaisFundo) { dentroMaisFundo = dentro; ondeDentro = p; }
      if (ds.length > 2 && ds[2] > seguinteMaisPerto) { seguinteMaisPerto = ds[2]; ondeSeguinte = p; }
    }
    if (ondeSeguinte) {
      if (seguinteMaisPerto >= dentroMaisFundo - 1e-6) {
        return { recusa: `com sentido '${sentido}' a primeira camada da chapa e a seguinte se sobrepõem em profundidade: a face de dentro da primeira chega a ${mm(sinal * dentroMaisFundo)} mm na vista ${vista} no ponto ${texto2(ondeDentro)}, e a de fora da seguinte a ${mm(sinal * seguinteMaisPerto)} mm no ponto ${texto2(ondeSeguinte)}, de modo que nenhum plano passa entre elas no vão inteiro; desenhe o contorno onde as camadas ficam separadas ou troque a vista` };
      }
      corte = sinal * (dentroMaisFundo + seguinteMaisPerto) / 2;
    }
  }
  /* a borda da chapa vista do eixo: a aresta entre faces de lados diferentes; com a camada, só as faces dela */
  const naCamada = (vs) => corte == null || vs.some((v) => (sentido === '+' ? V.get(v)[eixo] > corte : V.get(v)[eixo] < corte));
  const donos = new Map();
  for (const [fid, vs] of faces) if (naCamada(vs)) for (let k = 0; k < vs.length; k++) {
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
        return { recusa: `o lado do contorno de ${texto2(c)} a ${texto2(d)} cruza a borda da chapa vista ${vista}: o vão precisa caber inteiro dentro dela (a borda de um vão aberto antes conta: a chapa não tem material dentro dele, e dois vãos vistos do mesmo eixo precisam de folga entre os contornos); traga o contorno para dentro, afastado da borda e dos vãos vizinhos nesta vista${corte == null ? '' : `; com sentido, a camada é o que fica ${sentido === '+' ? 'acima' : 'abaixo'} do plano a ${mm(corte)} mm no eixo, e uma face da outra camada que passe desse plano fora do contorno também conta como borda: aproxime as camadas do contorno ou desenhe-o onde a outra camada não chega ao plano`}` };
      }
    }
  }
  return { recusa: null, corte, naCamada };
}

/** Uma grade de pontos de dentro do polígono, 12 por 12 na caixa dele, para a medida da camada ver o meio do vão e não só a borda. */
function pontosDeDentro(poligono, n = 12) {
  const us = poligono.map((p) => p[0]); const vs = poligono.map((p) => p[1]);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const dentro = (p) => {
    let c = false;
    for (let k = 0, j = poligono.length - 1; k < poligono.length; j = k++) {
      const a = poligono[k], b = poligono[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  const pts = [];
  for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) { const p = [u0 + ((u1 - u0) * i) / n, v0 + ((v1 - v0) * j) / n]; if (dentro(p)) pts.push(p); }
  return pts;
}

/** espessuraVistaDoEixo(V, faces, poligono, vista) -> metro | null: a espessura da chapa nos pontos do contorno, antes do corte,
 *  pela reta do eixo: a distância entre a primeira e a última vez que ela cruza a casca, vezes o cosseno da normal da face de cima
 *  com o eixo (a espessura medida pela normal, numa chapa de duas faces paralelas). A mediana dos pontos; a lente recuada usa esta
 *  medida no recuo padrão, porque é calculada antes do corte, e o registro guarda também a medida da borda, depois dele. */
export function espessuraVistaDoEixo(Vmundo, faces, poligono, vista) {
  const q = typeof vista === 'object' && vista && 'local' in vista ? vista : quadroDaVista(vista);
  const V = noQuadro(Vmundo, q);
  const { eixo, u: iu, v: iv } = q;
  const tris = [];
  for (const vs of faces.values()) {
    const pts = vs.map((v) => V.get(v));
    const n = newell(pts); const l = tamanho(n);
    if (!(l > 0) || Math.abs(n[eixo] / l) <= 0.1) continue;
    for (let k = 1; k + 1 < pts.length; k++) tris.push({ p: [pts[0], pts[k], pts[k + 1]], cos: Math.abs(n[eixo] / l) });
  }
  const [u0, v0, u1, v1] = [Math.min(...poligono.map((q) => q[0])), Math.min(...poligono.map((q) => q[1])), Math.max(...poligono.map((q) => q[0])), Math.max(...poligono.map((q) => q[1]))];
  const perto = tris.filter(({ p: [a, b, c] }) => !(Math.max(a[iu], b[iu], c[iu]) < u0 || Math.min(a[iu], b[iu], c[iu]) > u1 || Math.max(a[iv], b[iv], c[iv]) < v0 || Math.min(a[iv], b[iv], c[iv]) > v1));
  const medidas = [];
  for (const q of poligono) {
    let baixo = null, alto = null;
    for (const { p: [a, b, c], cos } of perto) {
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
function prismaDoContorno(poligono, q, de, ate) {
  const { eixo, u: iu, v: iv } = q;
  const ccw = areaDoPoligono2(poligono) > 0 ? poligono : [...poligono].reverse();
  const N = ccw.length;
  const em3d = (s, w) => { const p = [0, 0, 0]; p[iu] = s[0]; p[iv] = s[1]; p[eixo] = w; return q.mundo(p); };
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
export function limparCostura({ pos, faces, costura, fixos, fracao = FRACAO_DA_FUSAO, piso = 0, parede = new Set(), guardaDeFina = false }) {
  const F = new Map([...faces].map(([id, vs]) => [id, [...vs]]));
  const fundidos = new Map(); const removidas = [];
  const posicao = (v) => pos(v);
  const nivel = (v) => (fixos.has(v) ? 2 : costura.has(v) ? 1 : 0);
  const recusadas = new Set();
  /* as faces de cada vértice, montadas uma vez e mantidas a cada fusão: refazê-las a cada volta custava a casca inteira por
     fusão (no furgão, 18 s das três aberturas), e só as faces do vértice que sai mudam */
  const facesDe = new Map();
  for (const [id, vs] of F) for (const v of vs) { if (!facesDe.has(v)) facesDe.set(v, new Set()); facesDe.get(v).add(id); }
  for (let volta = 0; volta < 10000; volta++) {
    /* só as faces que tocam a costura têm aresta nela */
    const daCostura = new Set();
    for (const v of costura) for (const id of facesDe.get(v) ?? []) daCostura.add(id);
    const arestas = new Map();
    for (const id of daCostura) { const vs = F.get(id); for (let k = 0; k < vs.length; k++) {
      const a = vs[k], b = vs[(k + 1) % vs.length];
      if (!costura.has(a) && !costura.has(b)) continue;
      const chave = a < b ? `${a},${b}` : `${b},${a}`;
      if (!arestas.has(chave)) arestas.set(chave, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
      arestas.get(chave).faces.push(id);
    } }
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
    if (piso > 0) for (const id of daCostura) {
      const vs = F.get(id);
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
      if (!fusaoValida(F, facesDe, sai, fica, posicao, parede, guardaDeFina)) { recusadas.add(c.chave); continue; }
      if (!facesDe.has(fica)) facesDe.set(fica, new Set());
      for (const id of [...facesDe.get(sai)]) {
        const vs = F.get(id).map((v) => (v === sai ? fica : v));
        const limpa = vs.filter((v, k) => v !== vs[(k + 1) % vs.length]);
        if (limpa.length < 3) { F.delete(id); removidas.push(id); for (const v of vs) facesDe.get(v)?.delete(id); } else { F.set(id, limpa); facesDe.get(fica).add(id); }
      }
      facesDe.delete(sai);
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
function fusaoValida(F, facesDe, sai, fica, pos, parede = new Set(), guardaDeFina = false) {
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
    /* a fusão não pode tornar fina uma face de pele: sobre uma costura reta, fundir um vértice atrás do outro puxa as faces da
       pele em leque (13 triângulos de 12 mm de base por 160 de altura, no vão da quina da caixa) */
    if (guardaDeFina && !parede.has(id) && vs.length <= 4) {
      const r = razaoDaFace(vs.map(pos)); const r2 = razaoDaFace(vs.map((v) => pos(v === sai ? fica : v)));
      if (r >= 1.5 * LIMITE_DE_FACE_FINA && r2 < LIMITE_DE_FACE_FINA) return false;
    }
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
 *  booleana. A face que fica com menos de três cantos some. `protegidos` são os vértices que outras faces, fora das dadas, também
 *  usam (a borda da vizinhança recortada): a contagem de usos deles está incompleta, e eles ficam. */
export function tirarValenciaDois(faces, protegidos = new Set()) {
  const F = new Map([...faces].map(([id, vs]) => [id, [...vs]]));
  const removidas = [];
  for (let volta = 0; volta < 8; volta++) {
    const usos = new Map();
    for (const [id, vs] of F) for (const v of vs) { if (!usos.has(v)) usos.set(v, []); usos.get(v).push(id); }
    let tirou = false;
    for (const [v, donos] of [...usos].sort((x, y) => x[0] - y[0])) {
      if (donos.length !== 2 || protegidos.has(v) || !donos.every((id) => F.has(id))) continue;
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

/** dividirCantosRetos({ pos, faces, limite }) -> Map id -> lista de partes (a primeira fica com o id), só das faces que dividiu.
 *  A face com três cantos seguidos alinhados (o triângulo deles abaixo de `limite` de área) tem de ter o vértice do meio, porque a
 *  vizinha da outra aresta o tem, mas a triangulação do adaptador pode cortar uma orelha sem área ali (float32 deixa de 3e-10 m² de
 *  ruído num lado de 77 mm). Ela se divide por uma diagonal que parte desse canto, em partes sem canto alinhado e do mesmo sentido. */
export function dividirCantosRetos({ pos, faces, limite }) {
  const area = (a, b, c) => tamanho(cruz(sub(pos(b), pos(a)), sub(pos(c), pos(a)))) / 2;
  const divididas = new Map();
  for (const [id, vs] of faces) {
    if (vs.length < 4) continue;
    const ref = newell(vs.map(pos));
    let partes = [vs];
    for (let volta = 0; volta < 16; volta++) {
      let feito = false;
      for (let q = 0; q < partes.length && !feito; q++) {
        const P = partes[q]; const n = P.length;
        if (n < 4) continue;
        for (let k = 0; k < n && !feito; k++) {
          if (!(area(P[(k - 1 + n) % n], P[k], P[(k + 1) % n]) < limite)) continue;
          /* a diagonal de P[k] para o canto dois adiante, ou dois atrás */
          for (const lado of [1, -1]) {
            const at = (j) => P[((k + lado * j) % n + n) % n];
            const orelha = [at(0), at(1), at(2)];
            const resto = [at(0), ...Array.from({ length: n - 2 }, (_, j) => at(j + 2))];
            if (lado < 0) { orelha.reverse(); resto.reverse(); }
            const retos = (f) => f.length === 3 ? (area(f[0], f[1], f[2]) >= limite ? 0 : 3) : f.filter((_, j) => area(f[(j + f.length - 1) % f.length], f[j], f[(j + 1) % f.length]) < limite).length;
            const voltada = (f) => ponto(newell(f.map(pos)), ref) > 0;
            /* a orelha sai sem canto alinhado, e o resto com menos deles que a face de antes (a face de dois cantos alinhados se divide em duas rodadas) */
            if (retos(orelha) || retos(resto) >= retos(P) || !voltada(orelha) || !voltada(resto)) continue;
            partes = [...partes.slice(0, q), resto, orelha, ...partes.slice(q + 1)];
            feito = true;
            break;
          }
        }
      }
      if (!feito) break;
    }
    if (partes.length > 1) divididas.set(id, partes);
  }
  return divididas;
}

/* ---- a interseção da lente, direto na Manifold ---- */

/** O menor e o maior de cada coordenada de uma lista de pontos, em laço: numa chapa de cem mil vértices o `Math.max(...lista)` estoura a pilha. */
function extremosDos(pontos) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of pontos) for (let c = 0; c < 3; c++) { if (p[c] < min[c]) min[c] = p[c]; if (p[c] > max[c]) max[c] = p[c]; }
  return [min, max];
}

/** A distância, em metro, abaixo da qual a projeção de uma face no desenho conta como tocando o contorno (o prisma): acima do erro
 *  de Float32 e da grade da Manifold, abaixo da folga de 0,3 mm que a operação exige entre dois vãos. */
const TOQUE_NO_PRISMA = 1e-4;

/** projecaoToca(poligonoDaFace, contorno, eps) -> boolean: o polígono 2D da face (um segmento, se a face é paralela ao eixo) cruza o
 *  contorno, está dentro dele, o contém ou chega a `eps` dele. */
function projecaoToca(face, contorno, eps) {
  const dentroDe = (p, poli) => {
    let c = false;
    for (let k = 0, j = poli.length - 1; k < poli.length; j = k++) {
      const a = poli[k], b = poli[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  if (face.some((p) => dentroDe(p, contorno)) || contorno.some((p) => dentroDe(p, face))) return true;
  const dPS = (p, a, b) => {
    const ab = [b[0] - a[0], b[1] - a[1]]; const l2 = ab[0] * ab[0] + ab[1] * ab[1];
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]);
  };
  const cruza = (a, b, c, d) => {
    const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  for (let i = 0; i < face.length; i++) {
    const a = face[i], b = face[(i + 1) % face.length];
    for (let j = 0; j < contorno.length; j++) {
      const c = contorno[j], d = contorno[(j + 1) % contorno.length];
      if (cruza(a, b, c, d) || dPS(a, c, d) <= eps || dPS(b, c, d) <= eps || dPS(c, a, b) <= eps || dPS(d, a, b) <= eps) return true;
    }
  }
  return false;
}

/** A interseção de dois sólidos { pontos, faces } (faces por índice, fechados e orientados), em pedaços convexos por face de
 *  entrada: { pontos, faces: [{ solido, face, vs }] }. Os pontos são os da saída da Manifold (Float32, em coordenada local). */
function intersecaoNaManifold(wasm, solidos, caixa = null) {
  /* `caixa` é a caixa de [min, max] que fixa o centro e a grade; sem ela, a dos sólidos. A lente de uma chapa recortada à vizinhança
     do vão passa a caixa da chapa inteira, para a grade e as coordenadas da Manifold serem as de antes do recorte. */
  const [min, max] = caixa ?? extremosDos(solidos.flatMap((s) => s.pontos));
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

/* ---- a vizinhança do vão: o recorte da chapa que a booleana vê ---- */

/** O controle das provas: com `ligado = false` a booleana vê sempre a chapa inteira, a malha de referência contra a qual as provas medem o
 *  recorte. A receita não o alcança; só o teste o desliga, e o religa no fim. */
export const CONTROLE_DO_RECORTE = { ligado: true };

/** A vizinhança só compensa quando é uma parte da chapa: acima desta fração das faces dela, a booleana vê a chapa inteira. */
export const FRACAO_MAXIMA_DA_VIZINHANCA = 0.5;
/** Abaixo deste número de faces a booleana da chapa inteira é barata (uma chapa de cinco mil faces leva uns 0,2 s), e o recorte não
 *  paga o andaime e a banda: a chapa pequena segue sem recorte, com a malha que a operação sempre deu a ela. */
export const FACES_MINIMAS_PARA_RECORTAR = 5000;
/** A folga da caixa do prisma, em fração da maior dimensão dela, dentro da qual uma face é semente da vizinhança. Fica muito acima do erro
 *  de Float32 e de grade da Manifold (2^-20 da caixa), de modo que a face fora da semente não é tocada pela booleana. */
const FOLGA_DA_VIZINHANCA = 1e-3;
/** A diagonal mais longa da banda, em vezes a hipotenusa da maior aresta da borda com a espessura: acima disso as voltas não se correspondem. */
const FOLGA_DA_DIAGONAL = 1.5;
/** Até quantas espessuras, na direção contrária à normal, uma face de pele tem a pele do outro lado; a face sem pele ali é parede. */
const ALCANCE_DA_PELE = 2;
/** Até quantas arestas tem a volta de borda, e quantas faces tem o lado de fora dela, que o trecho fecha como um poço (face que ficou de fora no meio dele). */
const TAMANHO_DO_POCO = 12;
/** O poço é pequeno diante do trecho: o trecho tem no mínimo tantas faces quanto este número de vezes as do lado de fora da volta. */
const FACES_POR_POCO = 20;
/** O cosseno, no máximo, entre a normal de uma face de pele e a da face de pele do outro lado: as duas olham para lados opostos, a menos
 *  da curvatura da chapa entre elas (cerca de 35 graus). */
const COS_DA_PELE_OPOSTA = -0.8;

/** bandaDaVizinhanca(pos, faces) -> { banda, bordas, voltas } | { motivo }
 *  `faces` é um Map id -> vértices de um trecho da chapa, e `pos` dá o ponto de um vértice. A borda do trecho (a aresta cuja
 *  oposta não está nele) de uma chapa com espessura tem duas voltas, a da pele de fora e a da de dentro (quatro, ou mais, em pares, quando
 *  o trecho envolve o anel de outro vão: cada volta se casa com a mais próxima); a banda são os triângulos que
 *  ligam uma à outra, a parede que a chapa teria no recorte, de modo que o trecho e a banda formam um sólido fechado e orientado, que a
 *  booleana aceita. Cada volta anda no sentido em que o trecho a percorre. A banda é um zíper: a partir do par de vértices mais
 *  próximo, avança a volta cuja próxima diagonal sai mais curta. Recusa, com o motivo, a borda que não é de duas voltas simples e a
 *  banda cujas diagonais passam de 1,5 vez a hipotenusa da maior aresta do par de voltas com a espessura (a banda torcida, que ligaria vértices que não se correspondem). */
export function bandaDaVizinhanca(pos, faces) {
  const dirigidas = new Set();
  for (const vs of faces.values()) for (let k = 0; k < vs.length; k++) dirigidas.add(`${vs[k]}>${vs[(k + 1) % vs.length]}`);
  const proximo = new Map(); const bordas = [];
  for (const vs of faces.values()) for (let k = 0; k < vs.length; k++) {
    const a = vs[k], b = vs[(k + 1) % vs.length];
    if (dirigidas.has(`${b}>${a}`)) continue;
    if (proximo.has(a)) return { motivo: `a borda da vizinhança toca a si mesma no vértice ${a}` };
    proximo.set(a, b); bordas.push([a, b]);
  }
  const vistos = new Set(); const voltas = [];
  for (const inicio of [...proximo.keys()].sort((x, y) => x - y)) {
    if (vistos.has(inicio)) continue;
    const volta = []; let c = inicio;
    while (c != null && !vistos.has(c)) { vistos.add(c); volta.push(c); c = proximo.get(c); }
    if (c !== inicio) return { motivo: 'a borda da vizinhança não fecha em voltas simples' };
    voltas.push(volta);
  }
  if (voltas.length < 2 || voltas.length % 2) return { nVoltas: voltas.length, motivo: `a borda da vizinhança tem ${voltas.length} voltas, e não as duas (pele de fora e de dentro) de uma chapa com espessura` };
  const dist = (x, y) => tamanho(sub(pos(x), pos(y)));
  /* cada volta de uma pele tem a sua par na outra: as mais próximas se casam (duas voltas: as duas; o trecho que engole o tubo de
     parede de outro vão tem quatro, as de fora e as de dentro do anel) */
  const pares = []; const usadas = new Set();
  if (voltas.length === 2) pares.push([0, 1, null]);
  else {
    const candidatos = [];
    for (let i = 0; i < voltas.length; i++) for (let j = i + 1; j < voltas.length; j++) {
      let menor = Infinity;
      for (const x of voltas[i]) for (const y of voltas[j]) { const d = dist(x, y); if (d < menor) menor = d; }
      candidatos.push([menor, i, j]);
    }
    candidatos.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
    for (const [, i, j] of candidatos) if (!usadas.has(i) && !usadas.has(j)) { usadas.add(i); usadas.add(j); pares.push([i, j, null]); }
  }
  const banda = [];
  for (const par of pares) {
    const P = [...voltas[par[0]]].reverse(); const Q = voltas[par[1]];
    let melhor = Infinity; let i0 = 0, j0 = 0;
    for (let i = 0; i < P.length; i++) for (let j = 0; j < Q.length; j++) { const d = dist(P[i], Q[j]); if (d < melhor) { melhor = d; i0 = i; j0 = j; } }
    const n = P.length, m = Q.length;
    let diagonal = 0;
    for (let i = 0, j = 0; i < n || j < m;) {
      const pi = P[(i0 + i) % n], pi1 = P[(i0 + i + 1) % n], qj = Q[(j0 + j) % m], qj1 = Q[(j0 + j + 1) % m];
      const avancaP = i >= n ? false : j >= m ? true : dist(pi1, qj) <= dist(pi, qj1);
      if (avancaP) { banda.push([pi, pi1, qj]); diagonal = Math.max(diagonal, dist(pi1, qj)); i++; } else { banda.push([qj1, qj, pi]); diagonal = Math.max(diagonal, dist(pi, qj1)); j++; }
    }
    /* Um par que se corresponde fica a uma espessura de distância e a uma aresta de deslocamento ao longo da volta: a diagonal do zíper
       passa da maior aresta da borda só pela espessura (`melhor`), e na malha grossa ela é longa sem que as voltas deixem de se
       corresponder. A banda torcida liga vértices a distâncias que a aresta e a espessura não explicam. */
    const nas = new Set([...voltas[par[0]], ...voltas[par[1]]]);
    let aresta = 0;
    for (const [a, b] of bordas) if (nas.has(a)) aresta = Math.max(aresta, dist(a, b));
    const limite = FOLGA_DA_DIAGONAL * Math.hypot(aresta, melhor);
    if (!(diagonal <= limite)) return { motivo: `a banda da vizinhança liga vértices a ${fmt(diagonal * 1000)} mm, mais que ${FOLGA_DA_DIAGONAL} vez a aresta de ${fmt(aresta * 1000)} mm da borda com a espessura de ${fmt(melhor * 1000)} mm: as duas voltas não se correspondem` };
  }
  return { banda, bordas, voltas };
}

/** vizinhancaDoVao({ V, F, idsDaChapa, proximas, pontosDoPrisma }) -> { ids, banda, bordas, voltas } | { motivo }
 *  O trecho da chapa que a booleana do vão precisa ver: as faces cuja caixa toca a do prisma (`proximas` são as que tocam o contorno
 *  na vista, e só entre elas há semente) mais as que dividem um vértice com elas, de modo que as faces da borda do trecho não tocam o
 *  prisma e saem da booleana como entraram. `ids` sai em ordem crescente, de `idsDaChapa`. Recusa o recorte (e a booleana vê a chapa
 *  inteira) quando o trecho passa de FRACAO_MAXIMA_DA_VIZINHANCA da chapa ou não fecha pela banda. Com `espessura` (metro, ou função que a
 *  dá) e `tocaOPrisma(id)`, o trecho que a banda recusa tenta perder as faces de parede (`soltarParedes`) e, se ainda assim não fecha,
 *  engolir o tubo de parede inteiro (`absorverTubos`) antes de recusar; `paredes` diz quais perdeu. */
export function vizinhancaDoVao({ V, F, idsDaChapa, proximas, pontosDoPrisma, caixaDaChapa, espessura = null, tocaOPrisma = null }) {
  if (!CONTROLE_DO_RECORTE.ligado) return { motivo: 'o recorte da vizinhança está desligado (controle de prova)' };
  if (idsDaChapa.length < FACES_MINIMAS_PARA_RECORTAR) return { motivo: `a chapa tem ${idsDaChapa.length} faces, menos que as ${FACES_MINIMAS_PARA_RECORTAR} a partir das quais o recorte compensa` };
  const [min, max] = extremosDos(pontosDoPrisma);
  const folga = FOLGA_DA_VIZINHANCA * Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const sementes = new Set(); const verticesDasSementes = new Set();
  for (const [id, vs] of proximas) {
    const [a, b] = extremosDos(vs.map((v) => V.get(v)));
    if (a[0] > max[0] + folga || b[0] < min[0] - folga || a[1] > max[1] + folga || b[1] < min[1] - folga || a[2] > max[2] + folga || b[2] < min[2] - folga) continue;
    sementes.add(id);
    for (const v of vs) verticesDasSementes.add(v);
  }
  if (!sementes.size) return { motivo: 'nenhuma face da chapa toca o prisma do vão' };
  let ids = idsDaChapa.filter((id) => sementes.has(id) || F.get(id).vs.some((v) => verticesDasSementes.has(v)));
  if (ids.length > FRACAO_MAXIMA_DA_VIZINHANCA * idsDaChapa.length) return { motivo: `a vizinhança do vão tem ${ids.length} das ${idsDaChapa.length} faces da chapa, mais que ${FRACAO_MAXIMA_DA_VIZINHANCA * 100}%` };
  const pos = (v) => V.get(v);
  let r = bandaDaVizinhanca(pos, new Map(ids.map((id) => [id, F.get(id).vs])));
  let paredes = [];
  const e = r.motivo && tocaOPrisma ? (typeof espessura === 'function' ? espessura() : espessura) : null;
  if (e > 0) {
    /* o trecho alcançou a parede de outro vão: tirar dela as faces de parede devolve as duas voltas, e a banda refaz a parede */
    const ehParede = classificadorDeParede({ V, F, idsDaChapa, espessura: e });
    const s = soltarParedes({ V, F, ids, idsDaChapa, espessura: e, tocaOPrisma, ehParede });
    let porque = s.motivo;
    if (!s.motivo) {
      const sem = new Set(s.paredes);
      const resto = ids.filter((id) => !sem.has(id));
      const r2 = bandaDaVizinhanca(pos, new Map(resto.map((id) => [id, F.get(id).vs])));
      if (!r2.motivo) { ids = resto; r = r2; paredes = s.paredes; } else porque = `tiradas as ${s.paredes.length} faces de parede, ${r2.motivo}`;
    }
    if (r.motivo) {
      /* a parede que não sai (a que o corte alcança, ou o tubo inteiro de um vão que a borda atravessa): o trecho a engole */
      const t = absorverTubos({ F, ids, idsDaChapa, ehParede });
      if (t.motivo) return { ...r, motivo: `${r.motivo}; ${porque}; ${t.motivo}` };
      const r3 = bandaDaVizinhanca(pos, new Map(t.ids.map((id) => [id, F.get(id).vs])));
      if (r3.motivo) return { ...r, motivo: `${r.motivo}; ${porque}; com os ${t.tubos} faces de tubo de parede dentro, ${r3.motivo}` };
      ids = t.ids; r = r3;
    }
  }
  if (r.motivo) return r;
  const andaime = andaimeDaCaixa(extremosDos([...new Set(ids.flatMap((id) => F.get(id).vs))].map((v) => V.get(v)).concat(pontosDoPrisma)), extremosDos([...caixaDaChapa, ...pontosDoPrisma]));
  return andaime.motivo ? andaime : { ids, ...r, andaime, paredes };
}

/** classificadorDeParede({ V, F, idsDaChapa, espessura }) -> (id) => boolean
 *  Diz se uma face da chapa é parede (de outro vão ou da lateral da chapa) e não pele: uma face de pele tem do outro lado da chapa, na
 *  direção contrária à da normal e a até ALCANCE_DA_PELE espessuras, uma face de normal oposta; a parede tem ali o miolo da chapa.
 *  A busca da pele oposta passa por uma grade de células de 25 espessuras sobre a chapa inteira, e a face de área nula não é parede. */
export function classificadorDeParede({ V, F, idsDaChapa, espessura }) {
  const alcance = ALCANCE_DA_PELE * espessura;
  const celula = 25 * espessura;
  const cel = (x) => Math.floor(x / celula);
  const dados = new Map(); const grade = new Map(); const grandes = [];
  const LIMITE_DE_CELULAS = 512;
  for (const id of idsDaChapa) {
    const pts = F.get(id).vs.map((v) => V.get(v)); const n = newell(pts); const l = tamanho(n);
    if (!(l > 0)) continue;
    const [a, b] = extremosDos(pts);
    const g = { id, pts, n: [n[0] / l, n[1] / l, n[2] / l], a, b };
    dados.set(id, g);
    const [i0, j0, k0, i1, j1, k1] = [cel(a[0]), cel(a[1]), cel(a[2]), cel(b[0]), cel(b[1]), cel(b[2])];
    if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > LIMITE_DE_CELULAS) { grandes.push(g); continue; }
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
      const c = `${i},${j},${k}`; const lista = grade.get(c); if (lista) lista.push(g); else grade.set(c, [g]);
    }
  }
  const tem = (f, g, c, fim) => {
    if (g.id === f.id || ponto(g.n, f.n) > COS_DA_PELE_OPOSTA) return false;
    if (g.a[0] > Math.max(c[0], fim[0]) || g.b[0] < Math.min(c[0], fim[0]) || g.a[1] > Math.max(c[1], fim[1]) || g.b[1] < Math.min(c[1], fim[1]) || g.a[2] > Math.max(c[2], fim[2]) || g.b[2] < Math.min(c[2], fim[2])) return false;
    const d = [-f.n[0], -f.n[1], -f.n[2]];
    for (let k = 1; k + 1 < g.pts.length; k++) {
      const t = raioNoTriangulo(c, d, g.pts[0], g.pts[k], g.pts[k + 1]);
      if (t != null && t <= alcance) return true;
    }
    return false;
  };
  const memo = new Map();
  return (id) => {
    if (memo.has(id)) return memo.get(id);
    const f = dados.get(id); let parede = false;
    if (f) {
      const d = [-f.n[0], -f.n[1], -f.n[2]];
      const c = [0, 1, 2].map((k) => f.pts.reduce((s, p) => s + p[k], 0) / f.pts.length);
      const fim = [c[0] + d[0] * alcance, c[1] + d[1] * alcance, c[2] + d[2] * alcance];
      let pele = grandes.some((g) => tem(f, g, c, fim));
      for (let i = cel(Math.min(c[0], fim[0])); !pele && i <= cel(Math.max(c[0], fim[0])); i++) for (let j = cel(Math.min(c[1], fim[1])); !pele && j <= cel(Math.max(c[1], fim[1])); j++) for (let k = cel(Math.min(c[2], fim[2])); !pele && k <= cel(Math.max(c[2], fim[2])); k++) {
        for (const g of grade.get(`${i},${j},${k}`) ?? []) if (tem(f, g, c, fim)) { pele = true; break; }
      }
      parede = !pele;
    }
    memo.set(id, parede);
    return parede;
  };
}

/** soltarParedes({ V, F, ids, idsDaChapa, espessura, tocaOPrisma, ehParede }) -> { paredes } | { motivo }
 *  As faces do trecho `ids` que são parede de outro vão (ou a lateral da chapa) e não pele (ver `classificadorDeParede`).
 *  Recusa o trecho sem parede nenhuma (o que impede as duas voltas é outra coisa) e o que tem parede que toca o prisma, porque então o
 *  vão corta a parede e ela tem de entrar na booleana. `tocaOPrisma(id)` diz se a face toca o prisma do vão. */
export function soltarParedes({ V, F, ids, idsDaChapa, espessura, tocaOPrisma, ehParede = classificadorDeParede({ V, F, idsDaChapa, espessura }) }) {
  const paredes = ids.filter((id) => ehParede(id));
  if (!paredes.length) return { motivo: 'o trecho não tem face de parede para tirar' };
  const toca = paredes.find((id) => tocaOPrisma(id));
  if (toca != null) return { motivo: `a face de parede ${toca} toca o prisma do vão, e então o corte a alcança` };
  return { paredes };
}

/** absorverTubos({ F, ids, idsDaChapa, ehParede }) -> { ids, tubos } | { motivo }
 *  O vão vizinho deixa na chapa um tubo de parede que liga as duas peles, e o trecho que o alcança pela metade tem a borda com voltas
 *  que passam de uma pele à outra pela parede. Aqui o trecho engole o tubo inteiro: das faces de parede que já tem, segue pelas que
 *  dividem um vértice com elas e são parede, e leva junto as faces de pele que dividem um vértice com o tubo, de modo que a borda
 *  do trecho volta a correr só pelas peles, longe do tubo; a parede que a borda ainda alcança entra na rodada seguinte. Recusa quando
 *  o trecho passa de FRACAO_MAXIMA_DA_VIZINHANCA da chapa. `ids` sai em ordem crescente. */
export function absorverTubos({ F, ids, idsDaChapa, ehParede }) {
  const daFace = new Map();
  for (const id of idsDaChapa) for (const v of F.get(id).vs) { const l = daFace.get(v); if (l) l.push(id); else daFace.set(v, [id]); }
  const trecho = new Set(ids); const tubos = new Set(); let fila = [];
  const semear = (id) => { if (tubos.has(id)) return; tubos.add(id); trecho.add(id); fila.push(id); };
  for (const id of ids) if (ehParede(id)) semear(id);
  for (let rodada = 0; ; rodada++) {
    for (let k = 0; k < fila.length; k++) {
      for (const v of F.get(fila[k]).vs) for (const n of daFace.get(v)) { trecho.add(n); if (ehParede(n)) semear(n); }
      if (trecho.size > FRACAO_MAXIMA_DA_VIZINHANCA * idsDaChapa.length) return { motivo: `o tubo de parede do vão vizinho leva a vizinhança a mais que ${FRACAO_MAXIMA_DA_VIZINHANCA * 100}% das ${idsDaChapa.length} faces da chapa` };
    }
    fila = [];
    /* a parede que a borda ainda alcança: a face do outro lado de uma aresta de borda */
    const dirigidas = new Set();
    for (const id of trecho) { const vs = F.get(id).vs; for (let k = 0; k < vs.length; k++) dirigidas.add(`${vs[k]}>${vs[(k + 1) % vs.length]}`); }
    for (const id of trecho) {
      const vs = F.get(id).vs;
      for (let k = 0; k < vs.length; k++) {
        const a = vs[k], b = vs[(k + 1) % vs.length];
        if (dirigidas.has(`${b}>${a}`)) continue;
        for (const n of daFace.get(b)) if (!trecho.has(n) && F.get(n).vs.some((v, q, vsn) => v === b && vsn[(q + 1) % vsn.length] === a) && ehParede(n)) semear(n);
      }
    }
    if (!fila.length || rodada > 50) break;
  }
  /* o poço: a volta de borda pequena (uma face, ou poucas, que ficou de fora no meio do trecho) fecha com as faces do outro lado dela */
  for (let rodada = 0; rodada < 5; rodada++) {
    const proximo = new Map(); const dirigidas = new Set();
    for (const id of trecho) { const vs = F.get(id).vs; for (let k = 0; k < vs.length; k++) dirigidas.add(`${vs[k]}>${vs[(k + 1) % vs.length]}`); }
    for (const id of trecho) { const vs = F.get(id).vs; for (let k = 0; k < vs.length; k++) { const a = vs[k], b = vs[(k + 1) % vs.length]; if (!dirigidas.has(`${b}>${a}`)) proximo.set(a, b); } }
    const vistos = new Set(); let tampou = false;
    for (const inicio of [...proximo.keys()].sort((x, y) => x - y)) {
      if (vistos.has(inicio)) continue;
      const volta = []; let c = inicio;
      while (c != null && !vistos.has(c)) { vistos.add(c); volta.push(c); c = proximo.get(c); }
      if (c !== inicio || volta.length > TAMANHO_DO_POCO) continue;
      const fora = new Set();
      for (let k = 0; k < volta.length; k++) {
        const a = volta[k], b = volta[(k + 1) % volta.length];
        for (const n of daFace.get(b)) if (!trecho.has(n) && F.get(n).vs.some((v, q, vsn) => v === b && vsn[(q + 1) % vsn.length] === a)) fora.add(n);
      }
      if (!fora.size || fora.size > TAMANHO_DO_POCO || FACES_POR_POCO * fora.size > trecho.size) continue;
      for (const n of fora) trecho.add(n);
      tampou = true;
    }
    if (!tampou) break;
  }
  return { ids: idsDaChapa.filter((id) => trecho.has(id)), tubos: tubos.size };
}

/** A distância ao longo do raio (origem o, direção d) até o triângulo abc, ou null (Möller-Trumbore, só para a frente). */
function raioNoTriangulo(o, d, a, b, c) {
  const e1 = sub(b, a), e2 = sub(c, a); const p = cruz(d, e2); const det = ponto(e1, p);
  if (Math.abs(det) < 1e-18) return null;
  const s = sub(o, a); const u = ponto(s, p) / det;
  if (u < -1e-9 || u > 1 + 1e-9) return null;
  const q = cruz(s, e1); const v = ponto(d, q) / det;
  if (v < -1e-9 || u + v > 1 + 1e-9) return null;
  const t = ponto(e2, q) / det;
  return t > 1e-12 ? t : null;
}

/** andaimeDaCaixa(caixaNova, caixaVelha) -> { pontos, faces } | { motivo }
 *  Os limiares da booleana (a grade da Manifold, a solda dos vértices novos, o piso de área, o teto da correção) são frações da caixa
 *  dos sólidos que ela recebe. O trecho da vizinhança tem caixa menor que a da chapa, e a malha do corte mudaria com ela (no furgão, a
 *  grade ganhava 5 mm). Para a booleana ver a caixa de antes, o sólido ganha dois tetraedros pequenos, um em cada canto da caixa velha, sem
 *  nada em comum com o trecho: eles só alargam a caixa, saem da booleana como entraram e saem da peça depois. Sem andaime
 *  quando as caixas são a mesma; recusa quando um canto da caixa velha cai junto do trecho. */
export function andaimeDaCaixa(nova, velha) {
  const [minN, maxN] = nova; const [minV, maxV] = velha;
  if ([0, 1, 2].every((c) => minN[c] <= minV[c] && maxN[c] >= maxV[c])) return { pontos: [], faces: [] };
  const lado = Math.max(maxV[0] - minV[0], maxV[1] - minV[1], maxV[2] - minV[2]);
  /* a face do tetraedro tem de passar do piso de área da booleana (2e-9 do quadrado da caixa) com folga */
  const e = 2e-3 * lado;
  const pontos = []; const faces = [];
  for (const [canto, sinal] of [[minV, 1], [maxV, -1]]) {
    const n = pontos.length;
    const p = [canto, [canto[0] + sinal * e, canto[1], canto[2]], [canto[0], canto[1] + sinal * e, canto[2]], [canto[0], canto[1], canto[2] + sinal * e]];
    const [lo, hi] = extremosDos(p);
    if ([0, 1, 2].every((c) => lo[c] <= maxN[c] + e && hi[c] >= minN[c] - e)) return { motivo: `o canto ${texto2([canto[0], canto[1]])} da caixa da chapa fica junto do trecho da vizinhança, e o andaime que fixa a caixa da booleana tocaria nele` };
    const f = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]].map((q) => q.map((k) => k + n));
    if (sinal < 0) for (const q of f) q.reverse();
    pontos.push(...p); faces.push(...f);
  }
  return { pontos, faces };
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
  const proximoLocal = (ids, i, exceto = null) => { let m = -1; for (const id of ids) { if (exceto?.has(id)) continue; const k = localDe(i, id); if (k != null && k > m) m = k; } return m + 1; };

  return {
  aberturaPorContorno(st, a, i) {
    if (a.origemId == null) return grita(st, i, OP, 'origemId', `${OP} é sempre estrutural: origemId é obrigatório (a chapa cortada, a parede e a borda do vão são citadas por ele)`);
    if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) return grita(st, i, OP, 'origemId', 'origemId precisa ser inteiro não-negativo');
    const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
    if (declaracoes.length > 1) return grita(st, i, OP, 'origemId', textoDeclaracoes(a.origemId, declaracoes));
    if (a.chapa == null) return grita(st, i, OP, 'chapa', "chapa é a seleção do sólido fechado que o vão corta, como { origem: { op: 'subdivisao', id } } de uma chapa com espessura");
    const quadro = quadroDaVista(Array.isArray(a.vista) ? a.vista.map((x) => st.num(x)) : a.vista);
    if (!quadro) return grita(st, i, OP, 'vista', `vista precisa ser 'x', 'y' ou 'z', o eixo ao longo do qual o contorno é projetado (na 'y' o ponto [u, v] é [x, z], na 'x' é [z, y] e na 'z' é [x, y]), ou um vetor [dx, dy, dz] não nulo, a direção de onde se olha (o desenho fica no plano perpendicular a ele, com u horizontal); veio ${JSON.stringify(a.vista)}`);
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
    if (a.sentido != null && a.sentido !== '+' && a.sentido !== '-') return grita(st, i, OP, 'sentido', `sentido só aceita '+' ou '-', o lado do eixo da vista de onde se olha a camada que o vão corta, num corpo que a reta do eixo atravessa mais de uma vez; veio ${JSON.stringify(a.sentido)}`);
    const sentido = a.sentido ?? null;
    if (a.limpezaFina != null && typeof a.limpezaFina !== 'boolean') return grita(st, i, OP, 'limpezaFina', 'limpezaFina só aceita true (a limpeza da costura não torna fina uma face de pele e divide a face com canto alinhado) ou false (a limpeza de antes); sem ela, true na vista por vetor oblíqua e false nos eixos x, y e z (e no vetor paralelo a um deles)');
    /* a limpeza fina: a fusão da costura recusa o que torna lasca uma face de pele saudável, e a face com três cantos alinhados se
       divide por uma diagonal. Na vista por vetor, o vão da quina precisa dela; nos eixos fica desligada por padrão, porque muda a
       malha de vãos já aceitos (no furgão, 2026-11-06, a grade ganhava 53 faces); declare true para adotá-la */
    const limpezaFina = a.limpezaFina ?? !quadro.alinhada;
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
    const { eixo, u: iu, v: iv } = quadro;
    const Vl = noQuadro(st.V, quadro);
    /* uma passada pela chapa: a profundidade dela no eixo, a caixa dela, e as faces que tocam a caixa do contorno na vista, as únicas
       que a conferência da projeção e a espessura medem (nenhuma outra face cruza um ponto nem um lado do contorno) */
    const [u0, v0, u1, v1] = [Math.min(...poligono.map((p) => p[0])), Math.min(...poligono.map((p) => p[1])), Math.max(...poligono.map((p) => p[0])), Math.max(...poligono.map((p) => p[1]))];
    let wMin = Infinity, wMax = -Infinity;
    const minDaChapa = [Infinity, Infinity, Infinity], maxDaChapa = [-Infinity, -Infinity, -Infinity];
    const proximas = new Map();
    for (const id of idsDaChapa) {
      const vs = st.F.get(id).vs;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const v of vs) {
        const p = st.V.get(v); const l = quadro.identidade ? p : Vl.get(v);
        for (let c = 0; c < 3; c++) { if (p[c] < minDaChapa[c]) minDaChapa[c] = p[c]; if (p[c] > maxDaChapa[c]) maxDaChapa[c] = p[c]; }
        const w = l[eixo]; if (w < wMin) wMin = w; if (w > wMax) wMax = w;
        if (l[iu] < a0) a0 = l[iu]; if (l[iu] > a1) a1 = l[iu]; if (l[iv] < b0) b0 = l[iv]; if (l[iv] > b1) b1 = l[iv];
      }
      if (!(a1 < u0 - 1e-9 || a0 > u1 + 1e-9 || b1 < v0 - 1e-9 || b0 > v1 + 1e-9)) proximas.set(id, vs);
    }
    const projecao = conferirProjecao(st.V, proximas, poligono, quadro, sentido);
    if (projecao.recusa) return grita(st, i, OP, 'contorno', projecao.recusa);
    const margem = 0.25 * (wMax - wMin) + 1e-3;
    /* com a camada, o prisma vai de fora da chapa, do lado de quem olha, até o plano entre a primeira camada e a seguinte */
    const de = projecao.corte != null && sentido === '+' ? projecao.corte : wMin - margem;
    const ate = projecao.corte != null && sentido === '-' ? projecao.corte : wMax + margem;
    const facesDaCamada = projecao.corte == null ? proximas : new Map([...proximas].filter(([, vs]) => projecao.naCamada(vs)));
    let prisma;
    try { prisma = prismaDoContorno(poligono, quadro, de, ate); } catch (e) {
      if (e instanceof ErroDePerfil) return grita(st, i, OP, 'contorno', e.message);
      throw e;
    }
    /* o piso de área da booleana, 2e-9 do quadrado do tamanho da chapa: o canto e a face abaixo de dez pisos se fundem */
    const escala = Math.max(...[0, 1, 2].map((c) => maxDaChapa[c] - minDaChapa[c]));
    const piso = 2e-9 * escala * escala;
    /* o piso da divisão é o do gate de malha, que mede a área do triângulo contra o maior raio da peça inteira, e não da chapa: 2e-9 dele */
    let raioDaPeca = 0; for (const p of st.V.values()) raioDaPeca = Math.max(raioDaPeca, Math.hypot(p[0], p[1], p[2]));
    const pisoDaDivisao = 2e-9 * raioDaPeca * raioDaPeca;

    /* A VIZINHANÇA. A booleana solda, confere e remonta toda face que recebe, e a chapa de um corpo tem centenas de milhares delas
       para um vão que ocupa um canto: ela recebe só o trecho da chapa em volta do vão, fechado por uma banda que liga as duas peles
       (e que sai da peça depois), e o resto da chapa fica como está, com os mesmos ids. Quando o trecho não fecha por uma banda de
       duas voltas, ou passa de metade da chapa, a booleana vê a chapa inteira, como antes. */
    const topo = BLOCO + FAIXA_ESTENDIDA;
    /* a face toca o prisma quando a projeção dela no desenho encosta no contorno (o prisma atravessa a chapa de lado a lado) */
    const espessuraDaChapa = () => espessuraVistaDoEixo(st.V, facesDaCamada, poligono, quadro);
    const tocaOPrisma = (id) => {
      const vs = proximas.get(id);
      return vs != null && projecaoToca(vs.map((v) => { const l = quadro.identidade ? st.V.get(v) : Vl.get(v); return [l[iu], l[iv]]; }), poligono, TOQUE_NO_PRISMA);
    };
    const viz = vizinhancaDoVao({ V: st.V, F: st.F, idsDaChapa, proximas, pontosDoPrisma: prisma.pontos, caixaDaChapa: [minDaChapa, maxDaChapa], espessura: espessuraDaChapa, tocaOPrisma });
    const recortada = !viz.motivo;
    const idsPerto = recortada ? viz.ids : idsDaChapa;
    /* no fim da faixa do passo, abaixo do prisma: a banda e as faces do andaime (e os vértices dele), que saem da peça depois do corte */
    const nAndaime = recortada ? viz.andaime.faces.length : 0;
    const nDaBanda = recortada ? viz.banda.length + nAndaime : 0;
    const idPB = (g) => idDoPasso(i, topo - prisma.faces.length - nDaBanda + g);
    const idPA = (g) => idDoPasso(i, topo - prisma.pontos.length - (recortada ? viz.andaime.pontos.length : 0) + g);
    const idsDaBanda = recortada ? Array.from({ length: nDaBanda }, (_, g) => idPB(g)) : [];
    const tirarBanda = () => {
      for (const f of idsDaBanda) { st.F.delete(f); st.consumidas.delete(f); st.pedacosDe.delete(f); }
      if (recortada) viz.andaime.pontos.forEach((_, g) => st.V.delete(idPA(g)));
    };
    /* a cópia da vizinhança antes do corte, para a lente: o trecho da chapa e a banda */
    const vsDaVizinhanca = [...idsPerto.map((id) => [...st.F.get(id).vs]), ...(recortada ? viz.banda : [])];
    const vertDaVizinhanca = [...new Set(vsDaVizinhanca.flat())].sort((x, y) => x - y);
    const indiceDaVizinhanca = new Map(vertDaVizinhanca.map((v, k) => [v, k]));
    /* com o andaime da caixa, para a Manifold medir a tolerância dela na caixa da chapa inteira, como antes do recorte */
    const andaimeDaLente = recortada ? viz.andaime : { pontos: [], faces: [] };
    const copia = a.lente ? {
      pontos: [...vertDaVizinhanca.map((v) => [...st.V.get(v)]), ...andaimeDaLente.pontos],
      faces: [...vsDaVizinhanca.map((vs) => vs.map((v) => indiceDaVizinhanca.get(v))), ...andaimeDaLente.faces.map((f) => f.map((k) => vertDaVizinhanca.length + k))],
      liso: [...idsPerto.map((id) => st.F.get(id).liso), ...(recortada ? viz.banda : []).map(() => undefined), ...andaimeDaLente.faces.map(() => undefined)],
    } : null;

    /* a lente sai da Manifold aqui, antes de o corte mexer na peça: a recusa dela não deixa a chapa cortada pela metade */
    const noPoligono = (P) => (p) => { const l = quadro.local(p); return P.some((q) => Math.hypot(l[iu] - q[0], l[iv] - q[1]) <= NO_POLIGONO); };
    const noDesenho = noPoligono(poligono);
    let lenteCalculada = null;
    let recuoDaLente = null;
    if (copia) {
      /* a lente recuada: a interseção da chapa com o prisma do contorno recuado, de modo que a volta dela fica além da perna da
         aba que o friso dobra na borda, e a pele dela continua sobre a da chapa */
      if (recuoDeclarado != null) recuoDaLente = recuoDeclarado;
      else {
        const e = espessuraVistaDoEixo(st.V, facesDaCamada, poligono, quadro);
        if (e == null) return grita(st, i, OP, 'recuoDaLente', 'a espessura da chapa no contorno não se mede pela reta do eixo, e o recuo padrão da lente depende dela; declare recuoDaLente em metro');
        recuoDaLente = RECUO_PADRAO_DA_LENTE * e;
      }
      const recuado = recuarPoligono(poligono, recuoDaLente);
      if (recuado.erro) return grita(st, i, OP, 'recuoDaLente', `a lente não cabe no vão: ${recuado.erro}; reduza recuoDaLente (o recuo de 0 deixa a lente do tamanho do vão)`);
      let r;
      try { const prismaDaLente = recuoDaLente > 0 ? prismaDoContorno(recuado.poligono, quadro, de, ate) : prisma; r = intersecaoNaManifold(wasm, [copia, prismaDaLente], extremosDos([minDaChapa, maxDaChapa, ...prismaDaLente.pontos])); } catch (e) { return grita(st, i, OP, 'lente', `a lente não saiu: ${e.message}`); }
      const facesL = new Map(r.faces.map((f, k) => [k, f.vs]));
      const paredeL = new Set(r.faces.map((f, k) => (f.solido === 1 ? k : -1)).filter((k) => k >= 0));
      const costuraL = new Set([...paredeL].flatMap((k) => facesL.get(k)));
      const naVoltaDaLente = noPoligono(recuado.poligono);
      const fixosL = new Set([...costuraL].filter((v) => naVoltaDaLente(r.pontos[v])));
      const limpaL0 = limparCostura({ pos: (v) => r.pontos[v], faces: facesL, costura: costuraL, fixos: fixosL, piso, parede: paredeL, guardaDeFina: limpezaFina });
      const limpaL = tirarValenciaDois(fundirLascas({ pos: (v) => r.pontos[v], faces: limpaL0.faces, costura: costuraL, parede: paredeL, piso }).faces);
      /* a face da lente com três cantos alinhados se divide como a da chapa; a parte nova leva a face de origem da primeira */
      const origemDaParte = new Map();
      if (limpezaFina) {
        let proxima = Math.max(-1, ...limpaL.faces.keys()) + 1;
        for (const [k, partes] of dividirCantosRetos({ pos: (v) => r.pontos[v], faces: limpaL.faces, limite: pisoDaDivisao })) {
          limpaL.faces.set(k, partes[0]);
          for (const vs of partes.slice(1)) { limpaL.faces.set(proxima, vs); origemDaParte.set(proxima, k); proxima++; }
        }
      }
      lenteCalculada = { r, limpaL, origemDaParte };
    }

    // ---- o corte: o prisma entra no fim da faixa do passo, a booleana o tira da chapa, e ele sai ----
    const idPV = (g) => idDoPasso(i, topo - prisma.pontos.length + g);
    const idPF = (g) => idDoPasso(i, topo - prisma.faces.length + g);
    prisma.pontos.forEach((p, g) => addV(st, idPV(g), p));
    prisma.faces.forEach((f, g) => addF(st, idPF(g), f.map(idPV)));
    if (recortada) {
      viz.andaime.pontos.forEach((p, g) => addV(st, idPA(g), p));
      [...viz.banda, ...viz.andaime.faces.map((f) => f.map(idPA))].forEach((vs, g) => addF(st, idPB(g), vs));
    }
    const doPrisma = new Set(prisma.faces.map((_, g) => idPF(g)));
    const tirarPrisma = () => {
      for (const f of doPrisma) { st.F.delete(f); st.consumidas.delete(f); }
      for (let g = 0; g < prisma.pontos.length; g++) st.V.delete(idPV(g));
      tirarBanda();
    };
    const antesDoCorte = st.orfaos.length;
    /* a chapa vai à booleana pelas faces já resolvidas, e não pela seleção de novo: resolvida aqui, uma seleção que pega a peça
       inteira (`tudo`) pegaria também o prisma */
    subtrair(st, { origemId: a.origemId, solidos: [{ f: [...idsPerto, ...idsDaBanda] }, { f: [...doPrisma] }] }, i);
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
    /* a banda existiu só para a booleana ver um sólido fechado: sai da peça, e das faces do corte */
    tirarBanda();
    const daBanda = new Set(idsDaBanda);
    doCorte.faces = doCorte.faces.filter((f) => !daBanda.has(f));

    /* a parede: o que sobrou das laterais do prisma (a face que guardou o id dele e os pedaços dela), com id novo depois dos pedaços */
    const daParede = (f) => doPrisma.has(f) || doPrisma.has(st.pedacosDe.get(f));
    let proximaFace = proximoLocal(st.F.keys(), i, doPrisma);
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
    const limpa = limparCostura({ pos: posDaPeca, faces: new Map(facesDoCorte.map((f) => [f, st.F.get(f).vs])), costura, fixos, piso, parede, guardaDeFina: limpezaFina });
    const antesDaFusao = new Map([...limpa.fundidos.keys()].map((v) => [v, [...st.V.get(v)]]));
    /* na fusão de lascas fica a face de antes do passo, que guarda a identidade; entre duas do mesmo tipo, a vizinha */
    const lascas = fundirLascas({ pos: posDaPeca, faces: limpa.faces, costura, parede, piso, preferir: (outra, lasca) => (localDe(i, outra) != null && localDe(i, lasca) == null ? lasca : outra) });
    const valencia = tirarValenciaDois(lascas.faces, new Set(recortada ? viz.voltas.flat() : []));
    const tocados = new Set([...limpa.faces.values(), ...facesDoCorte.map((f) => st.F.get(f).vs)].flat());
    for (const f of [...limpa.removidas, ...lascas.removidas, ...valencia.removidas]) {
      st.F.delete(f); parede.delete(f); st.pedacosDe.delete(f);
      if (localDe(i, f) == null) st.consumidas.set(f, { passo: i, op: OP });
    }
    for (const [f, vs] of valencia.faces) {
      const face = st.F.get(f);
      if (face.vs.length !== vs.length || face.vs.some((v, k) => v !== vs[k])) { face.vs = melhorInicio(posDaPeca, vs); face.tinta = []; }
    }
    /* o canto alinhado que a limpeza não pode fundir (o vértice da vizinha) divide a face por uma diagonal, para o adaptador não cortar nele uma orelha sem área */
    let divisoes = 0;
    for (const [f, partes] of limpezaFina ? dividirCantosRetos({ pos: posDaPeca, faces: valencia.faces, limite: pisoDaDivisao }) : []) {
      const face = st.F.get(f);
      face.vs = melhorInicio(posDaPeca, partes[0]); face.tinta = [];
      for (const vs of partes.slice(1)) {
        const novo = idDoPasso(i, proximaFace++);
        addF(st, novo, melhorInicio(posDaPeca, vs));
        const nf = st.F.get(novo);
        nf.cor = face.cor; nf.material = face.material; nf.parte = face.parte; nf.liso = face.liso; nf.solido = face.solido;
        if (st.parteAtribuidaEm?.has(f)) st.parteAtribuidaEm.set(novo, st.parteAtribuidaEm.get(f));
        (st.pedacosDe ??= new Map()).set(novo, f);
        if (parede.has(f)) parede.add(novo);
        facesDoCorte.push(novo);
        divisoes++;
      }
    }
    /* só as faces do corte usam um vértice tocado, a não ser os da borda da vizinhança, que a face de fora dela também usa e que a face
       da borda, que a booleana não tocou, mantém */
    const usados = new Set(); for (const f of facesDoCorte) { const face = st.F.get(f); if (face) for (const v of face.vs) usados.add(v); }
    for (const v of tocados) if (!usados.has(v)) st.V.delete(v);
    /* a costura deste vão a menos que a fusão de uns décimos de milímetro da borda de um vão aberto antes: a limpeza funde os vértices
       dela, a borda registrada do outro vão perde vértices (o friso nela quebra) e a tira de chapa entre os dois sai lasca */
    for (const antes of st.aberturas ?? []) {
      const perdidos = [...antes.borda.fora, ...antes.borda.dentro].filter((v) => !st.V.has(v)).length;
      if (perdidos) return grita(st, i, OP, 'contorno', `a costura deste vão chega tão perto da borda do vão do passo ${antes.passo} que a limpeza fundiu ${perdidos} vértices dela e a borda dele ficou sem os pontos que registrou: a folga entre os dois vãos medida na bateria (2026-11-06) é de 0,3 mm no mínimo, e abaixo de 1 mm a tira de chapa entre eles já é fina; afaste o contorno do vão vizinho, ou desenhe os dois como um vão só`);
    }
    const facesPerto = facesDoCorte.filter((f) => st.F.has(f)).sort((x, y) => x - y);
    /* a borda da vizinhança saiu da booleana como entrou: cada aresta dela está nas faces do corte, e o recorte não deixou fenda */
    if (recortada) {
      const arestas = new Set();
      for (const f of facesPerto) { const vs = st.F.get(f).vs; for (let k = 0; k < vs.length; k++) arestas.add(`${vs[k]}>${vs[(k + 1) % vs.length]}`); }
      const perdidas = viz.bordas.filter(([x, y]) => !arestas.has(`${x}>${y}`)).length;
      if (perdidas) return grita(st, i, OP, 'chapa', `o corte alcançou a borda da vizinhança recortada da chapa (${perdidas} arestas dela mudaram, de ${viz.bordas.length}) e abriu uma fenda entre o trecho cortado e o resto da chapa; o vão passa da vizinhança que a operação recorta, e o recorte deveria ter coberto o prisma com folga`);
    }
    /* a chapa cortada inteira: o que a booleana não viu, como estava, e o trecho cortado */
    const dentroDaVizinhanca = new Set(idsPerto);
    const facesDaChapaCortada = recortada ? [...idsDaChapa.filter((f) => !dentroDaVizinhanca.has(f)), ...facesPerto].sort((x, y) => x - y) : facesPerto;
    /* o quanto a fusão mexeu na superfície: a distância de cada vértice que saiu às faces que ficaram em volta do que ficou */
    let desvioDaFusao = 0;
    for (const [sai, p] of antesDaFusao) {
      const fica = limpa.fundidos.get(sai);
      let d = Infinity;
      for (const f of facesPerto) {
        const vs = st.F.get(f).vs;
        if (!vs.includes(fica)) continue;
        for (let k = 1; k + 1 < vs.length; k++) d = Math.min(d, distanciaAoTriangulo(p, st.V.get(vs[0]), st.V.get(vs[k]), st.V.get(vs[k + 1])));
      }
      if (Number.isFinite(d)) desvioDaFusao = Math.max(desvioDaFusao, d);
    }

    // ---- as bordas: a de fora é a que encosta na face externa de uma chapa por subdivisão, ou a voltada para o eixo ----
    const casca = new Map(facesPerto.map((f) => [f, st.F.get(f).vs]));
    const voltas = voltasDaBorda(casca, parede);
    if (!voltas || voltas.length !== 2) return grita(st, i, OP, 'chapa', `o corte deixou ${voltas ? voltas.length : 'uma'} borda${voltas?.length === 1 ? '' : 's'} ${voltas ? '' : 'que não fecha '}em vez das duas de uma chapa (a de fora e a de dentro); confira que a chapa é uma chapa com espessura que o contorno atravessa uma vez`);
    const externas = new Set();
    for (const regs of st.origens.values()) for (const r of regs) if (r.op === 'subdivisao' && Array.isArray(r.externa)) for (const f of r.externa) externas.add(f);
    const raizDe = (f) => { let x = f; while (st.pedacosDe.has(x)) x = st.pedacosDe.get(x); return x; };
    const facesDaVolta = (volta) => { const s = new Set(volta); return facesPerto.filter((f) => !parede.has(f) && st.F.get(f).vs.some((v) => s.has(v))); };
    const naExterna = (volta) => facesDaVolta(volta).some((f) => externas.has(raizDe(f)));
    const paraOEixo = (volta) => facesDaVolta(volta).reduce((s, f) => s + newell(st.F.get(f).vs.map((v) => quadro.local(st.V.get(v))))[eixo], 0);
    let [fora, dentro] = voltas;
    const ef = naExterna(fora), ed = naExterna(dentro);
    if (ef !== ed ? ed : paraOEixo(dentro) > paraOEixo(fora)) [fora, dentro] = [dentro, fora];
    /* cada volta começa no ponto do início do desenho e anda no sentido em que ele foi desenhado */
    const sentidoDesenhado = Math.sign(areaDoPoligono2(poligono));
    const ordenar = (volta) => {
      const q = volta.map((v) => { const l = quadro.local(st.V.get(v)); return [l[iu], l[iv]]; });
      let lista = Math.sign(areaDoPoligono2(q)) === sentidoDesenhado ? [...volta] : [...volta].reverse();
      const k = lista.findIndex((v) => { const l = quadro.local(st.V.get(v)); return Math.hypot(l[iu] - poligono[0][0], l[iv] - poligono[0][1]) <= NO_POLIGONO; });
      if (k > 0) lista = [...lista.slice(k), ...lista.slice(0, k)];
      return lista;
    };
    fora = ordenar(fora); dentro = ordenar(dentro);
    /* a espessura, medida pela normal da pele de fora entre os pontos do desenho das duas bordas */
    const espessuras = [];
    for (const v of fora) {
      if (!fixos.has(v)) continue;
      const p = st.V.get(v);
      const pl = quadro.local(p);
      const par = dentro.find((w) => { if (!fixos.has(w)) return false; const l = quadro.local(st.V.get(w)); return Math.hypot(l[iu] - pl[iu], l[iv] - pl[iv]) <= NO_POLIGONO; });
      if (par == null) continue;
      const n = facesPerto.filter((f) => !parede.has(f) && st.F.get(f).vs.includes(v)).reduce((s, f) => soma(s, newell(st.F.get(f).vs.map((x) => st.V.get(x)))), [0, 0, 0]);
      if (tamanho(n) > 0) espessuras.push(Math.abs(ponto(sub(p, st.V.get(par)), n)) / tamanho(n));
    }
    espessuras.sort((x, y) => x - y);
    const espessura = espessuras.length ? espessuras[espessuras.length >> 1] : null;

    // ---- a lente, calculada antes do corte e posta na peça depois da parede ----
    const lente = [];
    if (lenteCalculada) {
      const { r, limpaL, origemDaParte } = lenteCalculada;
      const usadosL = [...new Set([...limpaL.faces.values()].flat())].sort((x, y) => x - y);
      const base = proximoLocal(st.V.keys(), i);
      if (base + usadosL.length > topo || proximaFace + limpaL.faces.size > topo) return grita(st, i, OP, 'lente', `a lente estoura o bloco e a faixa estendida de ids do passo (${topo})`);
      const idV = new Map(usadosL.map((v, k) => [v, idDoPasso(i, base + k)]));
      for (const v of usadosL) addV(st, idV.get(v), r.pontos[v]);
      for (const [k, vs] of [...limpaL.faces].sort((x, y) => x[0] - y[0])) {
        const id = idDoPasso(i, proximaFace++);
        addF(st, id, melhorInicio((v) => r.pontos[v], vs).map((v) => idV.get(v)));
        const origem = r.faces[origemDaParte.get(k) ?? k];
        if (origem.solido === 0) st.F.get(id).liso = copia.liso[origem.face];
        lente.push(id);
      }
    }

    /* as faces finas (a lasca da topologia) que a limpeza não achou como desfazer, na chapa cortada com a parede e na lente: o gate de
       malha as acusa, e o registro diz quantas ficaram para quem lê */
    const finasRestantes = [...facesPerto, ...lente].filter((f) => st.F.has(f) && razaoDaFace(st.F.get(f).vs.map((v) => st.V.get(v))) < LIMITE_DE_FACE_FINA).length;
    const vizinhanca = { recortada, faces: idsPerto.length, daChapa: idsDaChapa.length, ...(recortada ? {} : { motivo: viz.motivo }) };
    (st.aberturas ??= []).push({ passo: i, origemId: a.origemId, vista: a.vista, borda: { fora: [...fora], dentro: [...dentro] }, espessura, parede: [...parede].sort((x, y) => x - y), lente: [...lente], recuoDaLente, vizinhanca, limpeza: { verticesFundidos: limpa.fundidos.size, desvioDaFusao, facesSemArea: limpa.removidas.length + valencia.removidas.length, lascas: lascas.removidas.length, divisoes, finasRestantes } });
    registraOrigem(st, i, OP, a.origemId, {
      faces: facesDaChapaCortada, parede: [...parede].sort((x, y) => x - y), lente, borda: { fora, dentro }, espessura, vista: a.vista, passo: i, lenteDeclarada: !!a.lente, recuoDaLente, vizinhanca,
      /* o que a limpeza fez na chapa: vértices fundidos e o quanto a superfície saiu do lugar deles, faces que sumiram e lascas */
      limpeza: { verticesFundidos: limpa.fundidos.size, desvioDaFusao, facesSemArea: limpa.removidas.length + valencia.removidas.length, lascas: lascas.removidas.length, divisoes, finasRestantes },
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
