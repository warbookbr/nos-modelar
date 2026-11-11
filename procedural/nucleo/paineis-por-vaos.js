/* paineis-por-vaos.js — uma chapa partida em painéis por linhas de vão desenhadas em vistas, com o vão medido ao longo da chapa
 *
 * FICHA paineisPorVaos
 * serve: dividir uma chapa já feita em painéis separados por linhas de vão, com o vão constante ao longo da chapa, cada painel uma parte nomeada pelo ponto visto dele e a chapa montada uma vez.
 * quando: capô, portas, tampas, teto e para-lamas de uma carenagem, portinholas e tampas de uma máquina, qualquer chapa que a referência mostra em painéis com frestas. `aberturaPorContorno` com `lente` tira um pedaço rente à pele e não aceita linha que sai pela borda; aqui o vão é entre painéis vizinhos da mesma chapa e a linha pode sair pela borda dela.
 * unidades: ENTRADA em mm, como `gaiolaPorLacos` e `gaiolaVarrida` (a chapa.passos também, executada como vem). SAÍDA: `saida: 'mm'` (padrão) devolve os passos em mm, para o esboço, cujo conversor os passa a metro (ele converte `onde.conexo.de` e `ate`); `saida: 'metro'` devolve os passos do corte e das partes em metro, para a receita, sem os passos da chapa (ela já os tem em metro). A linha é desenhada numa vista ortogonal: eixo 'x' (pontos [z, y]), 'y' ([x, z]) ou 'z' ([x, y]), o mesmo plano de `extrusao` com o mesmo eixo.
 * campos:
 *   chapa: { passos, origem, emitir?, parametros?, pontos? } os passos (em mm) que constroem SÓ a chapa e a origem { op, id } dela; com `passos` o ajudante a executa em tempo de autoria (normais, sementes, conferência) e `emitir: false` não os devolve; sem `passos`, dê `normal` e `origemId`, e o aviso `semLeitura` diz que nada foi conferido; `parametros` e `pontos` são o PARAMS e o TOPO que os passos citam.
 *   vao: a largura do vão DA PELE, ao longo da chapa, em mm; a lâmina é estreitada onde a chapa é inclinada em relação à linha, pela normal local lida da chapa. A folga entre as paredes do corte é a largura da lâmina (menor que o vão na chapa inclinada) e sai em `medidas.folgaMinima`.
 *   linhas: [{ nome?, eixo, pontos, fechada?, alcance?, lado?, dentro?, alem? }] o meio do vão em cada vista; `alcance` [min, max] limita a lâmina no eixo da vista (a linha de um lado do corpo não corta o outro); `lado` '+' ou '-' é de onde se lê a chapa (padrão o lado do alcance); `fechada` fecha a volta e o pedaço de dentro é um painel, ou some com `dentro: 'descarta'`; a volta menor que o vão é recusada; `alem` (mm, não negativo) alonga as pontas da linha aberta.
 *   paineis: [{ nome, eixo, ponto, lado? }] o painel é o pedaço que contém o ponto [a, b] visto daquela vista (o primeiro que o raio vindo do `lado`, padrão '+', toca); nomes e pontos distintos. O passo `parte` sai com `onde.conexo` { de, dir, ate }: `ate` é a distância lida mais uma folga, e o núcleo recusa a receita salva cuja semente passou a cair num vão.
 *   modo: 'vista' (padrão: a lâmina é a extrusão da linha ao longo do eixo da vista, a que corta toda camada do raio, com o vão compensado pela inclinação) ou 'superficie' (a linha é projetada na chapa e a lâmina é varrida sobre ela, de paredes normais à chapa: a folga 3D é o vão em qualquer inclinação, a linha atravessa dobras, a ponta que sai da borda não alarga e duas pontas que se encontram fecham em esquadria; corta só a primeira camada lida do `lado`, até `profundidade` mm abaixo da pele, padrão a espessura lida mais meio vão); vale por linha em `linhas[i].modo`.
 *   origemId: o primeiro origemId livre (padrão: o maior dos passos da chapa mais um); o ajudante usa dali em diante e devolve `proximoId`.
 *   normal: (ponto3d, eixo) => [nx, ny, nz] troca a leitura da chapa; amostragem: o passo da leitura ao longo da linha (padrão 40 mm); areaMinima: área em mm² abaixo da qual o pedaço é lasca e avisa (padrão 100); sementesPerdidas: 'recusa' (padrão) ou 'avisa'; margem: a fração a mais da lâmina (padrão 0,02), para a curvatura e o Float32 da Manifold nunca deixarem o vão abaixo do pedido; folgaAbaixoDe: o aviso `folgaEstreita` quando a lâmina fica abaixo disso, em mm (padrão metade do vão); saida: 'mm' ou 'metro'; conferir: false não executa o corte (só a chapa, uma vez; o `ate` sai da chapa de antes) e avisa `naoConferiu`; medirTempo: true põe em medidas.tempos o tempo de cada etapa; medirFolga: true mede a folga 3D também no modo vista (no modo superfície ela é sempre medida).
 * devolve: { passos, partes, origemDoCorte, proximoId, medidas, avisos } com medidas { vaoPedido, inclinacaoMaxima, fatorMinimo, folgaMinima, paineis, paineisAchados, sementesSemPainel, pedacosSemNome, pedacos, execucoes } e avisos { ref, texto }; o resultado é memorizado pela entrada (memoria-de-pura), então a receita que o chama a cada leitura paga a conta uma vez.
 * exemplo:
 *   paineisPorVaos({ chapa: { passos: [['cubo', { origemId: 1, larg: 600, alt: 1, prof: 400 }]], origem: { op: 'cubo', id: 1 } }, vao: 4,
 *     linhas: [{ eixo: 'y', pontos: [[0, -300], [0, 300]] }],
 *     paineis: [{ nome: 'esquerda', eixo: 'y', ponto: [-150, 0] }, { nome: 'direita', eixo: 'y', ponto: [150, 0] }] })
 * peça: procedural/nucleo/paineis-por-vaos.test.ts (a caixa de chapa com uma face a 38 graus da vista e a cuba de subdivisão).
 * FIM DA FICHA
 *
 * O MODO SUPERFICIE está em `lamina-sobre-a-superficie.js`: a lâmina sai como passo `subdivisao` de niveis 0 (vértices e triângulos, em mm como o resto) e o `subtrair` a trata como qualquer sólido; margem padrão 0,5%.
 *
 * A LÂMINA (modo vista). Cada linha vira um prisma da largura do vão, extrudado ao longo do eixo da vista, e todos entram juntos no `subtrair` da chapa: a
 * parede do corte é paralela ao eixo da vista, e com chapa de 1 mm a direção dela não pesa. A linha fechada com pedaço de dentro vira um
 * anel (o prisma de fora menos o de dentro); com `dentro: 'descarta'`, o prisma inteiro. Os cantos da linha são em esquadria.
 *
 * O VÃO AO LONGO DA CHAPA. A lâmina mede `w` no plano da vista, e a chapa de normal `n` mostra um vão de `w / f`, onde `f = sqrt(1 - (n . m)^2)`
 * e `m` é a perpendicular da linha no plano da vista (numa chapa a 38 graus da vista, cortada por uma linha paralela à aresta de
 * inclinação, `f = cos 38`, e o vão do plano cresce a 5,08 mm para um pedido de 4). O ajudante pede `w = vao * f` em cada ponto da linha:
 * lê a normal da chapa executada pelo raio da vista, amostra a linha a cada `amostragem` mm e funde os pontos que a reta já dá. Onde a
 * chapa fica a mais de 80 graus da vista (f abaixo de 0,17), a linha é recusada: escolha a vista de frente dela.
 *
 * A LEITURA DA NORMAL vê todas as camadas que o raio da vista toca dentro do alcance, porque a lâmina corta todas; a primeira dá a largura, e se outra tem fator diferente por mais de 0,03 o aviso `camadasInclinadas` manda limitar o alcance ou cortar em duas linhas.
 *
 * O QUE ELE CONFERE, antes de entregar os passos, com a chapa executada uma vez a mais e o corte executado uma vez: a linha que não encontra a chapa, a volta fechada menor que o vão e a lâmina que se cruza,
 * a semente que cai fora dela ou num vão (o raio vê a chapa de antes e a de depois do corte e precisa da mesma distância), duas sementes no
 * mesmo pedaço, o corte que não separou nada e o `subtrair` que o núcleo recusa. Pedaço sem nome e lasca saem em `avisos`.
 * Os pedaços nomeados saem pelo critério `onde.conexo` de `sel`, que o núcleo resolve na execução; o ajudante só escreve os passos.
 * A semente não pode cair numa abertura que a chapa já tem: o raio passaria por ela e nomearia o pedaço do outro lado. */
import { nucleo } from './entrada.js';
import { memoizarPura } from './memoria-de-pura.js';
import { normalDaFace } from './nucleo.js';
import { alongar, bordasSeCruzam, linhaPertoDeSiMesma, projetarLinha, varrer, voltaMenorQueOVao } from './lamina-sobre-a-superficie.js';
import { pedacosConexos, prepararRaios } from './selecao-geometrica.js';
import { triangularFace } from './triangulacao-face.js';

const erro = (texto) => { throw new Error(`paineisPorVaos: ${texto}`); };
const br = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');
const r3 = (v) => Math.round(v * 1000) / 1000;

const INDICE = { x: [2, 1], y: [0, 2], z: [0, 1] };
const EIXO = { x: 0, y: 1, z: 2 };
const FATOR_MINIMO = 0.17;
const FOLGA_DA_SEMENTE = 0.01;
const FOLGA_DO_ALCANCE = 1e-3;
const MARGEM_DA_SUPERFICIE = 0.005;
const TOLERANCIA_DAS_CAMADAS = 0.03;
const GRAUS = 180 / Math.PI;

const area2d = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const anti = (l) => (area2d(l) < 0 ? [...l].reverse() : l);
const ponto3 = (eixo, a, b, c) => { const p = [0, 0, 0]; p[INDICE[eixo][0]] = a; p[INDICE[eixo][1]] = b; p[EIXO[eixo]] = c; return p; };

/** O prisma de um polígono na vista: o mesmo plano e a mesma ordem de `extrusao`. */
function prismaDe(eixo, pol, a0, a1, origemId) {
  const perfil = anti(eixo === 'x' ? pol.map(([z, y]) => [-y, z]) : eixo === 'z' ? pol.map(([x, y]) => [x, -y]) : pol);
  const em = eixo === 'x' ? [a0, 0, 0] : eixo === 'z' ? [0, 0, a0] : [0, a0, 0];
  return ['extrusao', { origemId, eixo, altura: a1 - a0, em, perfil }];
}

function maiorOrigem(passos) {
  let m = 0;
  for (const p of passos) if (Array.isArray(p) && p[1] && Number.isSafeInteger(p[1].origemId)) m = Math.max(m, p[1].origemId);
  return m;
}

/** Os pontos da linha, com as duas pontas alongadas de `alem` mm na direção do primeiro e do último trecho (só na linha aberta). */
function pontosDaLinha(pontos, fechada, alem) {
  let P = pontos.map((q) => [q[0], q[1]]);
  /* a ponta alongada: só na linha aberta */
  if (!fechada && alem > 0) {
    const tdir = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]]; const L = Math.hypot(...d); return [d[0] / L, d[1] / L]; };
    const t0 = tdir(P[0], P[1]); const t1 = tdir(P[P.length - 2], P[P.length - 1]);
    P = [[P[0][0] - t0[0] * alem, P[0][1] - t0[1] * alem], ...P, [P[P.length - 1][0] + t1[0] * alem, P[P.length - 1][1] + t1[1] * alem]];
  }
  return P;
}

const unit = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]]; const L = Math.hypot(...d); return L > 0 ? [d[0] / L, d[1] / L] : null; };
const perp = (t) => [-t[1], t[0]];
const cruz2 = (a, b) => a[0] * b[1] - a[1] * b[0];

/** A interseção de duas retas (ponto + direção), ou null se paralelas. */
function cruzar(p, t, q, u) {
  const det = cruz2(t, u);
  if (Math.abs(det) < 1e-9) return null;
  const s = cruz2([q[0] - p[0], q[1] - p[1]], u) / det;
  return [p[0] + t[0] * s, p[1] + t[1] * s];
}

/** O polígono tem duas arestas não vizinhas que se cruzam? */
function seCruza(pol) {
  const n = pol.length;
  const lado = (a, b, c) => Math.sign(cruz2([b[0] - a[0], b[1] - a[1]], [c[0] - a[0], c[1] - a[1]]));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue;
      const [a, b, c, d] = [pol[i], pol[(i + 1) % n], pol[j], pol[(j + 1) % n]];
      if (lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0) return true;
    }
  }
  return false;
}

/** A menor distância do ponto à poligonal fechada. */
function distanciaAoContorno(p, pol) {
  let m = Infinity;
  for (let i = 0; i < pol.length; i += 1) {
    const a = pol[i]; const b = pol[(i + 1) % pol.length];
    const d = [b[0] - a[0], b[1] - a[1]];
    const L2 = d[0] * d[0] + d[1] * d[1];
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)) : 0;
    m = Math.min(m, Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t));
  }
  return m;
}

/** A distância do ponto ao triângulo. */
function distanciaAoTriangulo(p, [A, B, C]) {
  const sb = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dt = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sb(B, A); const ac = sb(C, A); const ap = sb(p, A);
  const d1 = dt(ab, ap); const d2 = dt(ac, ap);
  const ate = (q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  if (d1 <= 0 && d2 <= 0) return ate(A);
  const bp = sb(p, B); const d3 = dt(ab, bp); const d4 = dt(ac, bp);
  if (d3 >= 0 && d4 <= d3) return ate(B);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return ate([A[0] + ab[0] * t, A[1] + ab[1] * t, A[2] + ab[2] * t]); }
  const cp = sb(p, C); const d5 = dt(ab, cp); const d6 = dt(ac, cp);
  if (d6 >= 0 && d5 <= d6) return ate(C);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return ate([A[0] + ac[0] * t, A[1] + ac[1] * t, A[2] + ac[2] * t]); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / (d4 - d3 + d5 - d6); return ate([B[0] + (C[0] - B[0]) * t, B[1] + (C[1] - B[1]) * t, B[2] + (C[2] - B[2]) * t]); }
  const den = 1 / (va + vb + vc); const v = vb * den; const w = vc * den;
  return ate([A[0] + ab[0] * v + ac[0] * w, A[1] + ab[1] * v + ac[1] * w, A[2] + ab[2] * v + ac[2] * w]);
}

/**
 * A folga medida no resultado do corte: a menor distância 3D entre os vértices que o corte criou e os triângulos de OUTRO pedaço, entre pedaços a menos de `alcance`.
 * Os triângulos entram numa grade de células de `alcance`, e cada vértice olha as 27 células em volta. Devolve null quando nenhum par fica perto.
 */
function folgaEntrePedacos(executado, verticesDeAntes, grupos, pedacoDe, alcance) {
  const celula = (p) => p.map((x) => Math.floor(x / alcance));
  const chave = (c) => `${c[0]},${c[1]},${c[2]}`;
  const grade = new Map();
  for (const f of executado.F.values()) {
    const pts = f.vs.map((v) => executado.V.get(v));
    const g = pedacoDe.get(f.id);
    for (const [i, j, k] of triangularFace(pts)) {
      const T = [pts[i], pts[j], pts[k]];
      const lo = celula([0, 1, 2].map((e) => Math.min(T[0][e], T[1][e], T[2][e])));
      const hi = celula([0, 1, 2].map((e) => Math.max(T[0][e], T[1][e], T[2][e])));
      for (let x = lo[0]; x <= hi[0]; x += 1) for (let y = lo[1]; y <= hi[1]; y += 1) for (let z = lo[2]; z <= hi[2]; z += 1) {
        const c = chave([x, y, z]);
        if (!grade.has(c)) grade.set(c, []);
        grade.get(c).push({ T, g });
      }
    }
  }
  let menor = null;
  const vistos = new Set();
  for (const f of executado.F.values()) {
    const g = pedacoDe.get(f.id);
    for (const v of f.vs) {
      if (verticesDeAntes.has(v) || vistos.has(`${v}:${g}`)) continue;
      vistos.add(`${v}:${g}`);
      const p = executado.V.get(v);
      const c = celula(p);
      for (let x = c[0] - 1; x <= c[0] + 1; x += 1) for (let y = c[1] - 1; y <= c[1] + 1; y += 1) for (let z = c[2] - 1; z <= c[2] + 1; z += 1) {
        for (const t of grade.get(chave([x, y, z])) ?? []) {
          if (t.g === g) continue;
          const d = distanciaAoTriangulo(p, t.T);
          if (d < alcance && (menor == null || d < menor)) menor = d;
        }
      }
    }
  }
  void grupos;
  return menor;
}

/** Os passos do corte e das partes em metro: extrusao (altura, em, perfil) e o conexo (de, ate); dir é só direção. */
function emMetro(r) {
  const mm = (v) => (Array.isArray(v) ? v.map(mm) : typeof v === 'number' ? v / 1000 : v);
  r.passos = r.passos.map(([op, a]) => {
    if (op === 'extrusao') return [op, { ...a, altura: mm(a.altura), em: mm(a.em), perfil: mm(a.perfil) }];
    if (op === 'subdivisao') return [op, { ...a, vertices: mm(a.vertices) }];
    if (op === 'parte' && a.sel?.onde?.conexo) {
      const c = a.sel.onde.conexo;
      return [op, { ...a, sel: { ...a.sel, onde: { conexo: { ...c, de: mm(c.de), ...(c.ate != null ? { ate: mm(c.ate) } : {}) } } } }];
    }
    return [op, a];
  });
  for (const p of r.partes) { p.de = mm(p.de); if (p.ate != null) p.ate = mm(p.ate); }
  return r;
}

/**
 * Chapa partida em painéis por linhas de vão desenhadas em vistas ortogonais.
 * @param {{ chapa: { passos?: any[], origem: { op: string, id: number }, emitir?: boolean, parametros?: object, pontos?: object }, vao: number,
 *   linhas: any[], paineis: any[], origemId?: number, normal?: Function, amostragem?: number, areaMinima?: number, margem?: number, sementesPerdidas?: 'recusa' | 'avisa' }} o
 */
function paineisPorVaosBruto(o) {
  const tempos = {};
  const cronometra = (nome, de) => { tempos[nome] = Math.round(((tempos[nome] ?? 0) + performance.now() - de) * 10) / 10; };
  if (o == null || typeof o !== 'object') erro('espera { chapa, vao, linhas, paineis }');
  const { chapa } = o;
  if (!chapa || typeof chapa !== 'object' || !chapa.origem || typeof chapa.origem.op !== 'string' || !Number.isSafeInteger(chapa.origem.id)) {
    erro('chapa precisa ser { passos, origem: { op, id } }: a origem da chapa que os passos constroem');
  }
  if (!(o.vao > 0) || !Number.isFinite(o.vao)) erro(`vao precisa ser maior que zero, em mm (recebido ${o.vao})`);
  if (!Array.isArray(o.linhas) || !o.linhas.length) erro('linhas precisa ter ao menos uma linha de vão');
  if (!Array.isArray(o.paineis) || !o.paineis.length) erro('paineis precisa ter ao menos um painel { nome, eixo, ponto }');
  const saidaEm = o.saida ?? 'mm';
  if (saidaEm !== 'mm') erro("saida é 'mm' ou 'metro' (a de metro é tratada por quem chama)");
  const amostragem = o.amostragem ?? 40;
  if (!(amostragem > 0)) erro('amostragem precisa ser maior que zero, em mm');
  const areaMinima = o.areaMinima ?? 100;
  if (!(Number.isFinite(areaMinima) && areaMinima >= 0)) erro(`areaMinima precisa ser um número de mm² a partir de zero (recebido ${o.areaMinima})`);
  const folgaAbaixoDe = o.folgaAbaixoDe ?? o.vao / 2;
  if (!(Number.isFinite(folgaAbaixoDe) && folgaAbaixoDe >= 0)) erro(`folgaAbaixoDe precisa ser um número de mm a partir de zero (recebido ${o.folgaAbaixoDe})`);
  const margem = o.margem ?? 0.02;
  if (!(margem >= 0 && margem < 0.5)) erro('margem precisa estar de 0 a 0,5 (a fração a mais da lâmina; padrão 0,02)');
  const validaProfundidade = (v, quem) => { if (v != null && !(Number.isFinite(v) && v > 0)) erro(`profundidade ${quem} precisa ser um número de mm maior que zero, a profundidade da lâmina abaixo da pele (recebido ${JSON.stringify(v)})`); };
  validaProfundidade(o.profundidade, 'da chamada');
  o.linhas.forEach((l, i) => validaProfundidade(l?.profundidade, `da linha '${l?.nome ?? `linha${i}`}'`));
  const modoGeral = o.modo ?? 'vista';
  for (const [nomeDoModo, m] of [['modo', o.modo], ...o.linhas.map((l, i) => [`o modo da linha '${l?.nome ?? `linha${i}`}'`, l?.modo])]) {
    if (m != null && m !== 'vista' && m !== 'superficie') erro(`${nomeDoModo} é 'vista' (a lâmina é a extrusão da linha ao longo do eixo da vista) ou 'superficie' (a lâmina é varrida sobre a chapa, com as paredes normais a ela)`);
  }
  const sementesPerdidas = o.sementesPerdidas ?? 'recusa';
  if (sementesPerdidas !== 'recusa' && sementesPerdidas !== 'avisa') erro("sementesPerdidas é 'recusa' ou 'avisa'");
  const passosDaChapa = chapa.passos ?? null;
  if ((modoGeral === 'superficie' || o.linhas.some((l) => l?.modo === 'superficie')) && (!passosDaChapa || o.normal)) {
    erro("o modo 'superficie' precisa dos passos da chapa (chapa.passos) para projetar a linha nela, e não combina com `normal`");
  }
  const parametros = chapa.parametros ?? {};
  const topo = chapa.pontos ?? {};
  const avisos = [];
  const aviso = (ref, texto) => avisos.push({ ref, texto });

  /* ---- confere as linhas e as sementes, sem executar nada ---- */
  const nomesDeLinha = new Set();
  o.linhas.forEach((l, i) => {
    const nome = l?.nome ?? `linha${i}`;
    if (!l || !Object.hasOwn(INDICE, l.eixo)) erro(`a linha '${nome}' precisa de eixo 'x', 'y' ou 'z' (o eixo da vista em que foi desenhada)`);
    if (!Array.isArray(l.pontos) || l.pontos.length < 2 || !l.pontos.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite))) {
      erro(`a linha '${nome}' precisa de pelo menos dois pontos [a, b] em mm no plano da vista ${l.eixo}`);
    }
    if (l.fechada && l.pontos.length < 3) erro(`a linha fechada '${nome}' precisa de pelo menos três pontos`);
    if (l.alcance != null && !(Array.isArray(l.alcance) && l.alcance.length === 2 && l.alcance.every(Number.isFinite) && l.alcance[0] < l.alcance[1])) erro(`o alcance da linha '${nome}' precisa ser [min, max] no eixo ${l.eixo}, com min menor que max`);
    if (l.lado != null && l.lado !== '+' && l.lado !== '-') erro(`o lado da linha '${nome}' é '+' ou '-'`);
    if (l.dentro != null && l.dentro !== 'painel' && l.dentro !== 'descarta') erro(`dentro da linha '${nome}' é 'painel' ou 'descarta'`);
    if (l.alem != null && !(Number.isFinite(l.alem) && l.alem >= 0)) erro(`alem da linha '${nome}' precisa ser um número de mm a partir de zero (recebido ${JSON.stringify(l.alem)})`);
    if (l.dentro === 'descarta' && !l.fechada) erro(`dentro: 'descarta' só vale para linha fechada ('${nome}' é aberta)`);
    if (nomesDeLinha.has(nome)) erro(`duas linhas se chamam '${nome}'`);
    nomesDeLinha.add(nome);
  });
  const nomesDePainel = new Map();
  o.paineis.forEach((p, i) => {
    if (!p || typeof p.nome !== 'string' || !p.nome) erro(`o painel ${i} precisa de nome`);
    if (!Object.hasOwn(INDICE, p.eixo)) erro(`o painel '${p.nome}' precisa de eixo 'x', 'y' ou 'z' (a vista em que se vê o ponto dele)`);
    if (!Array.isArray(p.ponto) || p.ponto.length !== 2 || !p.ponto.every(Number.isFinite)) erro(`o painel '${p.nome}' precisa de ponto [a, b] em mm no plano da vista ${p.eixo}`);
    if (p.lado != null && p.lado !== '+' && p.lado !== '-') erro(`o lado do painel '${p.nome}' é '+' ou '-'`);
    if (nomesDePainel.has(p.nome)) erro(`dois painéis se chamam '${p.nome}'; cada painel tem um nome só`);
    for (const [outro, q] of nomesDePainel) {
      if (q.eixo === p.eixo && (q.lado ?? '+') === (p.lado ?? '+') && q.ponto[0] === p.ponto[0] && q.ponto[1] === p.ponto[1]) erro(`os painéis '${outro}' e '${p.nome}' recebem a mesma semente (${p.eixo} [${br(p.ponto[0])}, ${br(p.ponto[1])}]); dê a cada painel um ponto dentro do pedaço dele`);
    }
    nomesDePainel.set(p.nome, p);
  });

  /* ---- a chapa executada uma vez, para ler normais, caixa e sementes ---- */
  let leitura = null;
  if (passosDaChapa) {
    const marca = [...passosDaChapa, ['parte', { nome: '__chapa__', sel: { origem: chapa.origem } }]];
    let t0 = performance.now();
    const st = nucleo(marca, parametros, topo);
    cronometra('executarChapa', t0);
    if (st.orfaos.length) erro(`os passos da chapa foram recusados pelo núcleo: ${st.orfaos.slice(0, 3).map((x) => x.motivo).join('; ')}`);
    const daChapa = [...st.F.values()].filter((f) => f.parte === '__chapa__').map((f) => f.id);
    if (!daChapa.length) erro(`a origem ${chapa.origem.op}:${chapa.origem.id} não tem face nenhuma depois dos passos da chapa`);
    if (daChapa.length !== st.F.size) erro(`os passos da chapa deixam ${st.F.size - daChapa.length} face(s) fora da origem ${chapa.origem.op}:${chapa.origem.id}; passe só os passos que constroem a chapa`);
    const todos = [...st.V.values()];
    /* por laço, e não por espalhamento: Math.min(...lista) estoura a pilha com mais de uns 120 mil elementos (uma chapa grande tem mais vértices que isso) */
    const caixa = [0, 1, 2].map((e) => { let lo = Infinity; let hi = -Infinity; for (const p of todos) { if (p[e] < lo) lo = p[e]; if (p[e] > hi) hi = p[e]; } return [lo, hi]; });
    t0 = performance.now();
    leitura = { st, raios: prepararRaios(st.V, st.F, daChapa), caixa, passos: passosDaChapa.length };
    cronometra('prepararRaios', t0);
    if (Math.max(...caixa.map(([lo, hi]) => hi - lo)) < 20) aviso('unidadeSuspeita', `a chapa mede no máximo ${br(Math.max(...caixa.map(([lo, hi]) => hi - lo)))} unidades: a entrada é em mm (vao, linhas, sementes e os passos da chapa); se a chapa foi escrita em metro, escreva-a em mm e peça saida: 'metro'`);
  } else if (!o.normal) {
    aviso('semLeitura', 'a chapa veio sem passos: o ajudante não leu a normal nem conferiu o corte, e o vão sai medido no plano da vista (dê chapa.passos ou normal para compensar a inclinação)');
  }

  let proximo = o.origemId ?? (passosDaChapa ? maiorOrigem(passosDaChapa) + 1 : null);
  if (proximo == null) erro('sem os passos da chapa, dê origemId: o primeiro origemId livre');
  if (!Number.isSafeInteger(proximo) || proximo < 1) erro('origemId precisa ser um inteiro positivo');
  const primeiroId = proximo;

  /* a folga do raio em volta da caixa: uma fração dela, e não uma medida fixa */
  const afasta = (e) => Math.max(0.05 * (leitura.caixa[e][1] - leitura.caixa[e][0]), 1e-3);

  /* as normais da chapa no ponto da vista, da primeira camada que o raio toca à última, dentro do alcance; [] onde não há face */
  const normaisEm = (eixo, a, b, alcance, lado) => {
    if (o.normal) {
      const n = o.normal(ponto3(eixo, a, b, alcance ? (alcance[0] + alcance[1]) / 2 : 0), eixo);
      return Array.isArray(n) && n.length === 3 && n.every(Number.isFinite) && Math.hypot(...n) > 0 ? [n.map((x) => x / Math.hypot(...n))] : [];
    }
    if (!leitura) return [];
    const e = EIXO[eixo];
    const [lo, hi] = leitura.caixa[e];
    const dir = [0, 0, 0]; dir[e] = lado === '-' ? 1 : -1;
    const de = ponto3(eixo, a, b, lado === '-' ? lo - afasta(e) : hi + afasta(e));
    const acertos = leitura.raios.todos(de, dir).filter((h) => { const c = de[e] + dir[e] * h.t; return c >= alcance[0] - FOLGA_DO_ALCANCE && c <= alcance[1] + FOLGA_DO_ALCANCE; });
    return acertos.map((h) => normalDaFace(leitura.st.V, leitura.st.F.get(h.face).vs));
  };

  /* ---- as lâminas ---- */
  const passosDeCorte = [];
  let inclinacaoMaxima = 0;
  let fatorMinimo = 1;
  let folgaMinima = Infinity;
  /* as ferramentas do `subtrair`: a extrusão de cada linha aberta ou descartada, e o anel de cada linha fechada */
  const ferramentas = [];
  const pendentes = [];
  let gerarSuperficie = null; let larguraDaSuperficie = 0; let inicioDaSuperficie = 0; let inicioDasFerramentas = 0;
  for (let li = 0; li < o.linhas.length; li += 1) {
    const l = o.linhas[li];
    const nome = l.nome ?? `linha${li}`;
    const eixo = l.eixo;
    const e = EIXO[eixo];
    const alcance = l.alcance ?? (leitura ? [leitura.caixa[e][0] - afasta(e), leitura.caixa[e][1] + afasta(e)] : null);
    if (!alcance) erro(`a linha '${nome}' precisa de alcance: sem os passos da chapa o ajudante não sabe até onde a lâmina vai no eixo ${eixo}`);
    const lado = l.lado ?? (l.alcance && leitura ? ((l.alcance[0] + l.alcance[1]) / 2 >= (leitura.caixa[e][0] + leitura.caixa[e][1]) / 2 ? '+' : '-') : '+');
    const P = pontosDaLinha(l.pontos, !!l.fechada, l.alem ?? 0);
    if ((l.modo ?? modoGeral) === 'superficie') {
      pendentes.push({ l, nome, eixo, e, alcance, lado, P });
      continue;
    }
    const n = P.length;
    const nSeg = l.fechada ? n : n - 1;

    /* os pontos amostrados de cada trecho: { p, k (o trecho), h (a meia lâmina) } */
    const trechos = [];
    let sem = 0; let total = 0; let camadas = 0; let fatorDaLinha = 1;
    for (let k = 0; k < nSeg; k += 1) {
      const A = P[k]; const B = P[(k + 1) % n];
      const t = unit(A, B);
      if (!t) erro(`a linha '${nome}' tem dois pontos iguais em [${br(A[0])}, ${br(A[1])}]`);
      const m = perp(t);
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const M = Math.max(1, Math.ceil(L / amostragem));
      const amostras = [];
      for (let j = 0; j <= M; j += 1) {
        const q = [A[0] + (B[0] - A[0]) * (j / M), A[1] + (B[1] - A[1]) * (j / M)];
        total += 1;
        const nms = normaisEm(eixo, q[0], q[1], alcance, lado);
        const m3 = ponto3(eixo, m[0], m[1], 0);
        const fatorDe = (nm) => { const c = nm[0] * m3[0] + nm[1] * m3[1] + nm[2] * m3[2]; return Math.sqrt(Math.max(0, 1 - c * c)); };
        let f = 1;
        if (nms.length) {
          f = fatorDe(nms[0]);
          const tilt = Math.acos(Math.min(1, f)) * GRAUS;
          inclinacaoMaxima = Math.max(inclinacaoMaxima, tilt);
          if (f < FATOR_MINIMO) erro(`a chapa fica inclinada ${br(tilt)} graus em relação à lâmina no ponto [${br(q[0])}, ${br(q[1])}] da linha '${nome}' (vista ${eixo}): a lâmina precisaria de ${br(f * o.vao)} mm de largura no plano para dar ${br(o.vao)} mm ao longo da chapa; desenhe essa linha na vista em que a chapa aparece de frente`);
          fatorMinimo = Math.min(fatorMinimo, f);
          fatorDaLinha = Math.min(fatorDaLinha, f);
          for (const outra of nms.slice(1)) {
            const fo = fatorDe(outra);
            if (Math.abs(fo - f) > TOLERANCIA_DAS_CAMADAS) camadas = Math.max(camadas, Math.abs(fo - f));
          }
        } else sem += 1;
        folgaMinima = Math.min(folgaMinima, o.vao * f * (1 + margem));
        amostras.push({ q, h: (o.vao * f * (1 + margem)) / 2 });
      }
      /* funde o que a reta já dá: o ponto fica só quando a meia lâmina sai do que as pontas dão por mais de 0,005 mm */
      const mantidos = [0];
      let ancora = 0;
      for (let j = 2; j <= M; j += 1) {
        const desvio = (idx) => { const u = (idx - ancora) / (j - ancora); return Math.abs(amostras[idx].h - (amostras[ancora].h + (amostras[j].h - amostras[ancora].h) * u)); };
        let pior = 0;
        for (let idx = ancora + 1; idx < j; idx += 1) pior = Math.max(pior, desvio(idx));
        if (pior > 0.005) { mantidos.push(j - 1); ancora = j - 1; }
      }
      mantidos.push(M);
      trechos.push({ t, m, pontos: mantidos.map((idx) => amostras[idx]) });
    }
    if (leitura && !o.normal && sem === total) {
      erro(`a linha '${nome}' não corta a chapa: nenhum dos ${total} pontos dela tem chapa na vista ${eixo}, de ${br(alcance[0])} a ${br(alcance[1])} mm; confira o eixo da vista, a ordem dos pontos ([${eixo === 'x' ? 'z, y' : eixo === 'y' ? 'x, z' : 'x, y'}]), o alcance e a unidade (mm)`);
    }

    const folgaDaLinha = o.vao * (1 + margem) * fatorDaLinha;
    if (camadas > 0) aviso('camadasInclinadas', `o raio da vista ${eixo} toca, na linha '${nome}', camadas da chapa de inclinação diferente (o fator da lâmina difere até ${br(camadas)}): a lâmina vale a primeira camada, e o vão das outras sai fora do pedido; limite o alcance a uma camada ou corte em duas linhas`);

    /* o contorno de cada lado: a esquadria nos cantos entre trechos, de pontas retas nas pontas */
    const lado2 = (sinal) => {
      const pts = [];
      const nT = trechos.length;
      for (let k = 0; k < nT; k += 1) {
        const T = trechos[k];
        T.pontos.forEach((s, j) => {
          const ultimoDoTrecho = j === T.pontos.length - 1;
          const primeiroDoTrecho = j === 0;
          const deste = [s.q[0] + sinal * T.m[0] * s.h, s.q[1] + sinal * T.m[1] * s.h];
          if (ultimoDoTrecho && (l.fechada || k < nT - 1)) return; /* o canto é do início do trecho seguinte */
          if (primeiroDoTrecho && (l.fechada || k > 0)) {
            const Tp = trechos[(k + nT - 1) % nT];
            const sp = Tp.pontos[Tp.pontos.length - 1];
            const doAnterior = [sp.q[0] + sinal * Tp.m[0] * sp.h, sp.q[1] + sinal * Tp.m[1] * sp.h];
            const mit = cruzar(doAnterior, Tp.t, deste, T.t);
            const maxH = Math.max(s.h, sp.h);
            if (mit && Math.hypot(mit[0] - s.q[0], mit[1] - s.q[1]) <= 4 * maxH) pts.push(mit);
            else if (Math.hypot(doAnterior[0] - deste[0], doAnterior[1] - deste[1]) < 1e-6) pts.push(deste);
            else { pts.push(doAnterior); pts.push(deste); }
            return;
          }
          pts.push(deste);
        });
      }
      return pts;
    };
    const esq = lado2(1).map(([a, b]) => [r3(a), r3(b)]);
    const dir = lado2(-1).map(([a, b]) => [r3(a), r3(b)]);
    if (l.fechada) {
      const [fora, dentro] = Math.abs(area2d(esq)) >= Math.abs(area2d(dir)) ? [esq, dir] : [dir, esq];
      const original = area2d(l.pontos);
      if (seCruza(fora)) erro(`a lâmina da volta '${nome}' se cruza por fora (cantos muito fechados ou pontos muito juntos); abra os cantos ou afaste os pontos`);
      if (l.dentro !== 'descarta' && (Math.sign(area2d(dentro)) !== Math.sign(original) || Math.abs(area2d(dentro)) >= Math.abs(original) || seCruza(dentro)
        || dentro.some((q) => distanciaAoContorno(q, l.pontos) < 0.9 * (folgaDaLinha / (1 + margem)) / 2))) {
        erro(`a volta '${nome}' é menor que o vão: a lâmina de ${br(folgaDaLinha)} mm de largura, por dentro, passa do outro lado da volta e deixaria uma ilha fantasma; faça a volta maior que o vão, ou use dentro: 'descarta' para só furar a chapa`);
      }
      if (l.dentro === 'descarta') {
        passosDeCorte.push(prismaDe(eixo, fora, alcance[0], alcance[1], proximo)); ferramentas.push({ op: 'extrusao', id: proximo }); proximo += 1;
      } else {
        const idFora = proximo; const idDentro = proximo + 1; const idAnel = proximo + 2;
        passosDeCorte.push(prismaDe(eixo, fora, alcance[0], alcance[1], idFora), prismaDe(eixo, dentro, alcance[0], alcance[1], idDentro),
          ['subtrair', { origemId: idAnel, solidos: [{ origem: { op: 'extrusao', id: idFora } }, { origem: { op: 'extrusao', id: idDentro } }] }]);
        ferramentas.push({ op: 'subtrair', id: idAnel });
        proximo += 3;
      }
    } else {
      if (seCruza([...esq, ...[...dir].reverse()])) erro(`a lâmina da linha '${nome}' se cruza (canto muito fechado ou pontos muito juntos para a largura ${br(folgaDaLinha)} mm); abra o canto ou afaste os pontos`);
      passosDeCorte.push(prismaDe(eixo, [...esq, ...[...dir].reverse()], alcance[0], alcance[1], proximo)); ferramentas.push({ op: 'extrusao', id: proximo }); proximo += 1;
    }
  }
  /* a normal da chapa no ponto do toque, alisada: a de cada canto da face é a média das normais das faces que o dividem e que giram menos que 25 graus da face tocada
     (a quina viva não entra na média), pesadas pelo inverso da distância do toque ao canto; a normal crua de cada face da malha varia alguns graus de uma face à outra e
     entortaria a parede da lâmina de uma estação à seguinte */
  let vizinhas = null;
  const normalSuave = (face, ponto) => {
    const { V, F } = leitura.st;
    if (!vizinhas) {
      vizinhas = new Map();
      for (const f of F.values()) for (const v of f.vs) { if (!vizinhas.has(v)) vizinhas.set(v, []); vizinhas.get(v).push(f.id); }
    }
    const n0 = normalDaFace(V, F.get(face).vs);
    let acc = [0, 0, 0];
    for (const v of F.get(face).vs) {
      const p = V.get(v);
      const w = 1 / (Math.hypot(p[0] - ponto[0], p[1] - ponto[1], p[2] - ponto[2]) + 1e-6);
      let soma3 = [0, 0, 0];
      for (const id of vizinhas.get(v)) {
        const ni = normalDaFace(V, F.get(id).vs);
        if (ni[0] * n0[0] + ni[1] * n0[1] + ni[2] * n0[2] >= 0.9063) soma3 = [soma3[0] + ni[0], soma3[1] + ni[1], soma3[2] + ni[2]];
      }
      const L = Math.hypot(...soma3) || 1;
      acc = [acc[0] + (w * soma3[0]) / L, acc[1] + (w * soma3[1]) / L, acc[2] + (w * soma3[2]) / L];
    }
    const L = Math.hypot(...acc);
    return L > 0 ? acc.map((x) => x / L) : n0;
  };

  /* as linhas em modo 'superficie': projetadas na chapa, alongadas onde duas pontas se encontram, e varridas */
  if (pendentes.length) {
    const largura = o.vao * (1 + (o.margem ?? MARGEM_DA_SUPERFICIE));
    const lidas = pendentes.map((pd) => {
      const { l, nome, eixo, e, alcance, lado, P } = pd;
      const dirv = [0, 0, 0]; dirv[e] = lado === '-' ? 1 : -1;
      const [lo, hi] = leitura.caixa[e];
      const origemDoRaio = (a, b) => ponto3(eixo, a, b, lado === '-' ? lo - afasta(e) : hi + afasta(e));
      const ler = (a, b) => {
        const de = origemDoRaio(a, b);
        const acertos = leitura.raios.todos(de, dirv).filter((h) => { const c = de[e] + dirv[e] * h.t; return c >= alcance[0] - FOLGA_DO_ALCANCE && c <= alcance[1] + FOLGA_DO_ALCANCE; });
        if (!acertos.length) return null;
        const c = [0, 1, 2].map((k) => de[k] + dirv[k] * acertos[0].t);
        let nm = normalSuave(acertos[0].face, c);
        if (nm[0] * dirv[0] + nm[1] * dirv[1] + nm[2] * dirv[2] > 0) nm = nm.map((x) => -x);
        const eps = 1e-4 * Math.max(...leitura.caixa.map(([a0, a1]) => a1 - a0));
        const p0 = c.map((x, k) => x - nm[k] * eps);
        const baixo = leitura.raios.todos(p0, nm.map((x) => -x))[0];
        const esp = baixo && baixo.t + eps <= 8 * o.vao ? baixo.t + eps : null;
        return { c, n: nm, esp };
      };
      const plano = (a, b, v) => {
        const p0 = origemDoRaio(a, b);
        const den = dirv[0] * v.n[0] + dirv[1] * v.n[1] + dirv[2] * v.n[2];
        if (Math.abs(den) < 0.17) return null;
        const s2 = ((v.c[0] - p0[0]) * v.n[0] + (v.c[1] - p0[1]) * v.n[1] + (v.c[2] - p0[2]) * v.n[2]) / den;
        return [0, 1, 2].map((k) => p0[k] + dirv[k] * s2);
      };
      const proj = projetarLinha({ ler, plano, pontos: P, fechada: !!l.fechada, amostragem, largura, eixoIdx: e, indices: INDICE[eixo], nome });
      if (!proj.segmentos.length) {
        erro(`a linha '${nome}' não corta a chapa: nenhum dos pontos dela tem chapa na vista ${eixo}, de ${br(alcance[0])} a ${br(alcance[1])} mm; confira o eixo da vista, a ordem dos pontos ([${eixo === 'x' ? 'z, y' : eixo === 'y' ? 'x, z' : 'x, y'}]), o alcance e a unidade (mm)`);
      }
      inclinacaoMaxima = Math.max(inclinacaoMaxima, proj.inclinacaoMaxima);
      const profPedida = l.profundidade ?? o.profundidade ?? null;
      const espLida = Math.max(0, ...proj.segmentos.flat().map((st) => st.esp ?? 0));
      if (profPedida != null && espLida > 0 && profPedida <= espLida) {
        erro(`a profundidade ${br(profPedida)} mm da linha '${nome}' não atravessa a chapa: a espessura lida na linha chega a ${br(espLida)} mm; dê uma profundidade maior que a espessura, ou tire a opção para a lâmina descer a espessura lida mais meio vão`);
      }
      return { ...pd, ...proj, cima: dirv.map((x) => -x) };
    });
    /* onde a ponta de uma linha aberta encontra a ponta de outra, as duas passam meia largura: o canto de duas lâminas fecha em esquadria */
    const pontas = [];
    lidas.forEach((ln, i) => {
      if (ln.l.fechada) return;
      const primeira = ln.segmentos[0]; const ultima = ln.segmentos[ln.segmentos.length - 1];
      pontas.push({ i, fim: false, c: primeira[0].c }, { i, fim: true, c: ultima[ultima.length - 1].c });
    });
    const longe = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const aAlongar = pontas.filter((p) => pontas.some((q) => q.i !== p.i && longe(p.c, q.c) <= 0.5 * o.vao));
    for (const p of aAlongar) { const segs = lidas[p.i].segmentos; alongar(segs[p.fim ? segs.length - 1 : 0], p.fim, largura / 2); }
    for (const ln of lidas) {
      const { l, nome, segmentos, fechadaInteira } = ln;
      if (l.fechada && l.dentro !== 'descarta' && fechadaInteira) {
        if (voltaMenorQueOVao(segmentos[0], largura)) {
          erro(`a volta '${nome}' é menor que o vão: a lâmina de ${br(largura)} mm de largura, por dentro, passa do outro lado da volta e deixaria uma ilha fantasma; faça a volta maior que o vão, ou use dentro: 'descarta' para só furar a chapa`);
        }
      }
      for (const estacoes of segmentos) {
        const cruza = bordasSeCruzam(estacoes, !!l.fechada && fechadaInteira, largura, ln.e);
        if (cruza === 'aberta') erro(`a lâmina da linha '${nome}' se cruza (canto muito fechado ou pontos muito juntos para a largura ${br(largura)} mm); abra o canto ou afaste os pontos`);
        if (cruza === 'volta') erro(`a lâmina da volta '${nome}' se cruza por dentro ou por fora: algum trecho dela é mais estreito que o vão (${br(largura)} mm de lâmina) ou o canto é fechado demais, e a lâmina deixaria uma ilha fantasma; alargue o trecho, abra o canto, ou use dentro: 'descarta' para só furar a chapa`);
      }
      const perto = linhaPertoDeSiMesma(segmentos[0], !!l.fechada && fechadaInteira, largura);
      if (perto != null) erro(`a linha '${nome}' passa a ${br(perto)} mm dela mesma, menos que a lâmina de ${br(largura)} mm: o vão de um trecho invade o do outro (um gargalo, um grampo ou uma volta estreita) e deixaria ilha ou fresta; alargue o trecho para mais que o vão, ou parta a linha`);
    }
    /* os sólidos das lâminas, de uma largura dada: os ids são os mesmos em toda largura, e o ajudante regera as lâminas com a largura corrigida pela folga medida */
    const idBase = proximo;
    gerarSuperficie = (larguraDe) => {
      const passos = []; const ferr = []; let id = idBase;
      for (const ln of lidas) {
        const { l, nome, segmentos, fechadaInteira } = ln;
        for (const estacoes of segmentos) {
          const varrido = varrer({ estacoes, fechada: !!l.fechada && fechadaInteira, largura: larguraDe, profundidade: l.profundidade ?? o.profundidade ?? null, descarta: l.dentro === 'descarta', nome, cima: ln.cima });
          passos.push(['subdivisao', { origemId: id, vertices: varrido.vertices, faces: varrido.faces, niveis: 0 }]);
          ferr.push({ op: 'subdivisao', id });
          id += 1;
        }
      }
      return { passos, ferr, fim: id };
    };
    larguraDaSuperficie = largura;
    const g0 = gerarSuperficie(largura);
    inicioDaSuperficie = passosDeCorte.length; inicioDasFerramentas = ferramentas.length;
    passosDeCorte.push(...g0.passos); ferramentas.push(...g0.ferr);
    proximo = g0.fim;
    folgaMinima = Math.min(folgaMinima, largura);
  }
  const idDoCorte = proximo; proximo += 1;
  let corte = ['subtrair', { origemId: idDoCorte, solidos: [{ origem: chapa.origem }, ...ferramentas.map((origem) => ({ origem }))] }];
  const origemDoCorte = { op: 'subtrair', id: idDoCorte };

  /* ---- as sementes: de onde o raio sai, e para onde vai ---- */
  const semente = (p) => {
    const e = EIXO[p.eixo];
    const lado = p.lado ?? '+';
    const caixa = leitura ? leitura.caixa[e] : [-1e4, 1e4];
    const fora = leitura ? afasta(e) : 10;
    const de = ponto3(p.eixo, p.ponto[0], p.ponto[1], r3(lado === '-' ? caixa[0] - fora : caixa[1] + fora));
    const dir = [0, 0, 0]; dir[e] = lado === '-' ? 1 : -1;
    return { de, dir };
  };
  const partes = o.paineis.map((p) => ({ nome: p.nome, ...semente(p) }));
  /* os passos `parte`: com `ate` (a distância lida mais uma folga) quando o ajudante leu a chapa */
  const montarPassos = () => {
    const passosDasPartes = partes.map((p) => ['parte', { nome: p.nome, sel: { origem: origemDoCorte, onde: { conexo: { de: p.de, dir: p.dir, ...(p.ate != null ? { ate: p.ate } : {}) } } } }]);
    return [...(chapa.emitir === false ? [] : (passosDaChapa ?? [])), ...passosDeCorte, corte, ...passosDasPartes];
  };
  const passos = montarPassos();

  /* ---- o corte executado uma vez, e a conferência ---- */
  const medidas = {
    vaoPedido: o.vao, inclinacaoMaxima: r3(inclinacaoMaxima), fatorMinimo: r3(fatorMinimo), folgaMinima: r3(folgaMinima), paineis: [], paineisAchados: 0,
    sementesSemPainel: [], pedacosSemNome: [], pedacos: 0, execucoes: leitura ? 2 : 0,
  };
  const saida = { passos, partes: partes.map((p) => ({ nome: p.nome, origem: origemDoCorte, de: p.de, dir: p.dir })), origemDoCorte, proximoId: proximo, primeiroId, medidas, avisos };
  if (!leitura) {
    if (folgaMinima < folgaAbaixoDe) aviso('folgaEstreita', `a folga entre as paredes do corte cai a ${br(folgaMinima)} mm (a lâmina, e não o vão da pele)`);
    return saida;
  }

  if (o.conferir === false) {
    /* sem a conferência: nenhum corte é executado. O `ate` de cada semente sai da chapa de antes, e nada confirma que o corte parte a chapa, que as sementes caem em pedaços distintos
       nem a folga; o aviso diz isso */
    o.paineis.forEach((p, i) => {
      const antes = leitura.raios.primeiro(partes[i].de, partes[i].dir);
      if (!antes) erro(`o painel '${p.nome}' não achou pedaço: o ponto ${p.eixo} [${br(p.ponto[0])}, ${br(p.ponto[1])}] cai fora da chapa: o raio da vista ${p.eixo} não toca nenhuma face dela; mova o ponto para dentro do pedaço que o painel deve ser`);
      partes[i].ate = r3(antes.t + o.vao / 4);
    });
    aviso('naoConferiu', 'conferir: false: o corte não foi executado; nada confirma que as linhas partem a chapa, que as sementes caem em pedaços distintos e que a folga é a pedida. As sementes valem pela chapa de antes do corte, e o núcleo as confere na execução (conexo.ate)');
    saida.passos = montarPassos();
    saida.partes = partes.map((p) => ({ nome: p.nome, origem: origemDoCorte, de: p.de, dir: p.dir, ate: p.ate ?? null }));
    medidas.execucoes = 1;
    if (o.medirTempo === true) medidas.tempos = tempos;
    return saida;
  }
  const executar = () => { const t0 = performance.now(); const r = nucleo([...passosDaChapa, ...passosDeCorte, corte], parametros, topo); cronometra('executarCorte', t0); return r; };
  const tCorte = performance.now();
  let executado = executar();
  if (executado.orfaos.length) {
    erro(`o corte foi recusado pelo núcleo: ${executado.orfaos.slice(0, 3).map((x) => x.motivo).join('; ')}. Confira se alguma linha deixa a chapa sem pedaço, se o polígono da lâmina se cruza (pontos muito juntos num canto fechado) e se a chapa é um sólido fechado`);
  }
  /* a folga medida no resultado: a menor distância 3D entre pedaços diferentes, junto do corte. No modo superfície a largura da lâmina é corrigida por ela, até a folga ficar
     entre o vão e 1,05 vez o vão (a curvatura transversal da chapa estreita a folga, e a lâmina de parede normal só garante o vão onde a chapa é plana na seção) */
  const verticesDeAntes = new Set(leitura.st.V.keys());
  const medirFolga = () => {
    const idsX = [...executado.F.keys()];
    const gruposX = pedacosConexos(executado.F, idsX);
    const dono = new Map();
    gruposX.forEach((g, gi) => g.forEach((id) => dono.set(id, gi)));
    return folgaEntrePedacos(executado, verticesDeAntes, gruposX, dono, 3 * o.vao);
  };
  const tFolga = performance.now();
  let folgaMedida = pendentes.length || o.medirFolga === true ? medirFolga() : null;
  cronometra('medirFolga', tFolga);
  let ajustes = 0;
  if (pendentes.length && folgaMedida != null) {
    while (ajustes < 3 && (folgaMedida < o.vao || folgaMedida > o.vao * 1.05)) {
      const fator = Math.max(0.5, Math.min(2, (o.vao * 1.01) / folgaMedida));
      larguraDaSuperficie *= fator;
      const g = gerarSuperficie(larguraDaSuperficie);
      passosDeCorte.splice(inicioDaSuperficie, g.passos.length, ...g.passos);
      executado = executar();
      if (executado.orfaos.length) erro(`o corte foi recusado pelo núcleo depois de corrigir a largura da lâmina para ${br(larguraDaSuperficie)} mm: ${executado.orfaos.slice(0, 2).map((x) => x.motivo).join('; ')}`);
      folgaMedida = medirFolga() ?? folgaMedida;
      ajustes += 1;
    }
    medidas.execucoes += ajustes;
    medidas.larguraDaLamina = r3(larguraDaSuperficie);
    if (folgaMedida < o.vao * 0.998) aviso('folgaAbaixoDoVao', `a folga 3D medida entre os pedaços é ${br(folgaMedida)} mm, abaixo do vão pedido de ${br(o.vao)} mm, mesmo depois de ${ajustes} correção(ões) da largura da lâmina (${br(larguraDaSuperficie)} mm): a chapa curva demais junto da linha; afaste a linha da curva, divida-a ou aceite a folga`);
  }
  if (folgaMedida != null) { medidas.folgaMedida = r3(folgaMedida); if (pendentes.length) medidas.folgaMinima = r3(folgaMedida); }
  const ids = [...executado.F.keys()];
  const grupos = pedacosConexos(executado.F, ids);
  medidas.pedacos = grupos.length;
  const pedacoDe = new Map();
  grupos.forEach((g, gi) => g.forEach((id) => pedacoDe.set(id, gi)));
  const areaDe = (g) => g.reduce((s, id) => {
    const vs = executado.F.get(id).vs.map((v) => executado.V.get(v));
    let nx = 0; let ny = 0; let nz = 0;
    for (let k = 0; k < vs.length; k += 1) {
      const c = vs[k]; const d = vs[(k + 1) % vs.length];
      nx += (c[1] - d[1]) * (c[2] + d[2]); ny += (c[2] - d[2]) * (c[0] + d[0]); nz += (c[0] - d[0]) * (c[1] + d[1]);
    }
    return s + Math.hypot(nx, ny, nz) / 2;
  }, 0);
  const pedacosDaChapa = pedacosConexos(leitura.st.F, [...leitura.st.F.keys()]).length;
  if (grupos.length <= pedacosDaChapa && !o.linhas.some((l) => l.dentro === 'descarta')) {
    aviso('semSeparacao', `o corte deixou ${grupos.length} pedaço(s), os mesmos que a chapa tinha: nenhuma linha a separou; confira se alguma vai de borda a borda (ou fecha uma volta) no alcance dado`);
  }
  const tConferencia = performance.now();
  const raiosDepois = prepararRaios(executado.V, executado.F, ids);
  const dicaDaProfundidade = pendentes.length ? ` (modo 'superficie': a lâmina desce só até ${br(Math.max(...(o.profundidade != null ? [o.profundidade] : [2 * o.vao])))} mm abaixo da pele quando a espessura não pôde ser lida, ou a espessura lida mais meio vão; se a chapa é mais grossa que ${br(8 * o.vao)} mm, dê profundidade maior que a espessura e não atravessa a chapa de outro modo)` : '';
  const dono = new Map();
  const perdidas = [];
  o.paineis.forEach((p, i) => {
    const { de, dir } = partes[i];
    const antes = leitura.raios.primeiro(de, dir);
    const depois = raiosDepois.primeiro(de, dir);
    const descricao = `${p.eixo} [${br(p.ponto[0])}, ${br(p.ponto[1])}]${p.lado === '-' ? ' vista do lado -' : ''}`;
    let motivo = null;
    if (!antes) motivo = `o ponto ${descricao} cai fora da chapa: o raio da vista ${p.eixo} não toca nenhuma face dela`;
    else if (!depois || Math.abs(depois.t - antes.t) > FOLGA_DA_SEMENTE) motivo = `o ponto ${descricao} cai num vão (ou numa abertura que a chapa já tem): a chapa de antes do corte aparece a ${br(antes.t)} mm do raio e a de depois, ${depois ? `a ${br(depois.t)} mm` : 'em lugar nenhum'}`;
    if (motivo) {
      if (sementesPerdidas === 'recusa') erro(`o painel '${p.nome}' não achou pedaço: ${motivo}; mova o ponto para dentro do pedaço que o painel deve ser`);
      perdidas.push(p.nome); aviso('sementeSemPainel', `o painel '${p.nome}' não achou pedaço: ${motivo}`);
      return;
    }
    const g = pedacoDe.get(depois.face);
    if (dono.has(g)) erro(`os painéis '${dono.get(g)}' e '${p.nome}' caem no mesmo pedaço (a semente de '${p.nome}' é ${descricao}); mova uma das sementes para o pedaço dela, ou confira a linha que devia separá-los${dicaDaProfundidade}`);
    dono.set(g, p.nome);
    partes[i].ate = r3(depois.t + o.vao / 4);
  });
  if (folgaMinima < folgaAbaixoDe) aviso('folgaEstreita', `a folga entre as paredes do corte cai a ${br(folgaMinima)} mm (a lâmina, e não o vão da pele, que é ${br(o.vao)} mm): a chapa é muito inclinada em relação à linha; desenhe a linha numa vista mais de frente, ou baixe folgaAbaixoDe se essa folga serve`);
  saida.passos = montarPassos();
  saida.partes = partes.map((p) => ({ nome: p.nome, origem: origemDoCorte, de: p.de, dir: p.dir, ate: p.ate ?? null }));
  medidas.sementesSemPainel = perdidas;
  medidas.paineis = [...dono].map(([g, nome]) => ({ nome, faces: grupos[g].length, area: r3(areaDe(grupos[g])) }));
  medidas.paineisAchados = medidas.paineis.length;
  grupos.forEach((g, gi) => {
    const area = areaDe(g);
    const pontos = g.flatMap((id) => executado.F.get(id).vs.map((v) => executado.V.get(v)));
    const centro = [0, 1, 2].map((c) => r3(pontos.reduce((s, q) => s + q[c], 0) / pontos.length));
    if (!dono.has(gi)) {
      medidas.pedacosSemNome.push({ faces: g.length, area: r3(area), centro });
      aviso('pedacoSemNome', `sobrou um pedaço sem nome (${g.length} faces, ${br(area)} mm², perto de [${centro.map(br).join(', ')}]): dê a ele um painel com um ponto visto dele, ou feche a linha que o isola com dentro: 'descarta'`);
    }
    if (area < areaMinima) aviso('lasca', `o pedaço${dono.has(gi) ? ` '${dono.get(gi)}'` : ` perto de [${centro.map(br).join(', ')}]`} tem ${br(area)} mm², menos que areaMinima (${br(areaMinima)}): é uma lasca do corte; afaste a linha da borda ou do canto que a gera`);
  });
  cronometra('conferencia', tConferencia);
  void tCorte;
  if (o.medirTempo === true) medidas.tempos = tempos;
  return saida;
}

const paineisMemorizados = memoizarPura(paineisPorVaosBruto, { tamanho: 4 });

/** Chapa partida em painéis por linhas de vão: a ficha está no cabeçalho. */
export function paineisPorVaos(o) {
  if (o == null || typeof o !== 'object') erro('espera { chapa, vao, linhas, paineis }');
  const { saida, ...entrada } = o;
  if (saida != null && saida !== 'mm' && saida !== 'metro') erro("saida é 'mm' ou 'metro'");
  if (saida === 'metro') {
    if (entrada.chapa?.emitir === true) erro("com saida: 'metro' os passos da chapa não são devolvidos (a receita já os tem em metro); tire chapa.emitir ou use saida: 'mm'");
    return emMetro(paineisMemorizados({ ...entrada, chapa: { ...entrada.chapa, emitir: false } }));
  }
  return paineisMemorizados(entrada);
}
