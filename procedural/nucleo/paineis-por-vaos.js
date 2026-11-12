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
 *   linhas[i].separa: false declara a linha que não precisa separar os dois lados dela (um rasgo, uma ponta que para na chapa); sem ele, com `conferir`, cada linha prova que os pontos a meia lâmina mais 0,15 vão de cada lado, sobre a pele, caem em pedaços diferentes (a volta: o de dentro e o de fora), e a que não prova recusa com o ponto da ponte; `medidas.separacao` traz, por linha, os pares provados e o ponto da ponte.
 *   linhas[i].curva: [[x, y, z], ...] (mm, aberta ou fechada) no lugar de eixo e pontos: a linha de vão como curva 3D sobre a chapa, que sobe a quina arredondada onde a linha de uma vista é recusada. Cada ponto vai à pele de fora pelo ponto mais próximo (a tolerância é `distanciaDaCurva`, padrão 3 vãos), a lâmina é varrida como no modo superfície, e `curvaDaGaiola` tira a curva da gaiola (estação, coluna, fração). `alem` pode ser [início, fim]; a curva que sai da chapa sem `alem`, ou que não corta a chapa em dois pedaços, é recusada. `linhas[i].vistas: [{ eixo, pontos, lado? }]` continua a linha de uma vista a outra pela emenda.
 *   paineis: [{ nome, eixo, ponto, lado? }] o painel é o pedaço que contém o ponto [a, b] visto daquela vista (o primeiro que o raio vindo do `lado`, padrão '+', toca); nomes e pontos distintos. O passo `parte` sai com `onde.conexo` { de, dir, ate }: `ate` é a distância lida mais uma folga, e o núcleo recusa a receita salva cuja semente passou a cair num vão.
 *   modo: 'vista' (padrão: a lâmina é a extrusão da linha ao longo do eixo da vista, a que corta toda camada do raio, com o vão compensado pela inclinação) ou 'superficie' (a linha é projetada na chapa e a lâmina é varrida sobre ela, de paredes normais à chapa: a folga 3D é o vão em qualquer inclinação, a linha atravessa dobras, a ponta que sai da borda não alarga e duas pontas que se encontram fecham em esquadria; corta só a primeira camada lida do `lado`, até `profundidade` mm abaixo da pele, padrão a espessura lida mais meio vão); vale por linha em `linhas[i].modo`.
 *   limpar: as faces finas do corte saem por `limparLascas` depois do `subtrair` (true: 0,01 mm; { tolerancia } em mm; false: não emite); padrão ligado nas linhas por superfície e por curva, desligado no modo vista; `medidas.lascasAntes` e `lascasRestantes` contam as faces finas.
 *   aba: { largura, angulo?, raio?, espessura? } (mm; na chamada ou em `linhas[i].aba`, `false` desliga a linha; só nas linhas por superfície ou curva; padrão desligado, e então a saída não muda) a borda de cada painel cortado dobra para dentro com uma perna reta de `largura`, a `angulo` graus de giro da chapa (de 45 a 90, padrão 90: reta para baixo), com `raio` de filete no canto de dentro e a espessura lida na linha (ou `espessura`): o vão entre dois painéis ganha fundo sem o forro. A perna é um sólido varrido ao longo da linha, com a esquadria dos cantos, que recua um centésimo do vão da parede do corte e entra meia espessura na chapa; os passos acrescentam um `unir` depois do corte, e as partes saem dele (`origem` de cada parte, e `origemDoCorte` segue sendo o `subtrair`). Onde outra linha de vão passa (a emenda em T) a perna é cortada pela lâmina dela, para não ligar dois painéis. Mede-se com `npm run vao:partes -- <peça> --fundo=modelo`.
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
import { alongar, amostrasLaterais, bordasSeCruzam, bordasSeCruzamNaCurva, linhaPertoDeSiMesma, projetarCurva, projetarLinha, varrer, voltaMenorQueOVao } from './lamina-sobre-a-superficie.js';
import { prepararPontoNaMalha } from './ponto-na-malha.js';
import { pedacosConexos, prepararRaios } from './selecao-geometrica.js';
import { triangularFace } from './triangulacao-face.js';
import { analisarTopologia } from './topologia.js';

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
    if (op === 'limparLascas') return [op, { ...a, tolerancia: mm(a.tolerancia) }];
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
  const porCurva = (l) => l != null && (l.curva !== undefined || l.vistas !== undefined);
  if (o.distanciaDaCurva != null && !(Number.isFinite(o.distanciaDaCurva) && o.distanciaDaCurva > 0)) erro(`distanciaDaCurva precisa ser um número de mm maior que zero (recebido ${JSON.stringify(o.distanciaDaCurva)})`);
  const distanciaDaCurva = o.distanciaDaCurva ?? 3 * o.vao;
  /* o `alem` da curva aberta: um número para as duas pontas, ou [no início, no fim] */
  const alemDa = (l) => (Array.isArray(l.alem) ? l.alem : [l.alem ?? 0, l.alem ?? 0]);
  for (const [nomeDoModo, m] of [['modo', o.modo], ...o.linhas.map((l, i) => [`o modo da linha '${l?.nome ?? `linha${i}`}'`, l?.modo])]) {
    if (m != null && m !== 'vista' && m !== 'superficie') erro(`${nomeDoModo} é 'vista' (a lâmina é a extrusão da linha ao longo do eixo da vista) ou 'superficie' (a lâmina é varrida sobre a chapa, com as paredes normais a ela)`);
  }
  /* limpar: as faces finas que o corte deixa saem pela operação `limparLascas`, depois do `subtrair` e antes dos `parte`. Padrão: ligado onde há lâmina por superfície ou por curva, desligado no modo vista
     (para os passos de quem já usa o modo vista não mudarem); `true` usa a tolerância de 0,01 mm, `{ tolerancia }` (mm) escolhe e `false` não emite */
  if (o.limpar != null && typeof o.limpar !== 'boolean' && !(typeof o.limpar === 'object' && Number.isFinite(o.limpar.tolerancia) && o.limpar.tolerancia > 0)) erro(`limpar é true, false ou { tolerancia } em mm maior que zero (recebido ${JSON.stringify(o.limpar)})`);
  /* aba: a perna que cada painel cortado dobra para dentro na borda do corte, de modo que o vão entre dois painéis tenha fundo sem o forro. Desligada por padrão; `aba` na chamada vale
     para toda linha por superfície ou por curva, e `linhas[i].aba` (ou `false`) a escolhe por linha. */
  const lerAba = (v, quem) => {
    if (v == null || v === false) return null;
    if (typeof v !== 'object' || Array.isArray(v)) erro(`aba ${quem} é { largura, angulo?, raio?, espessura? } (largura da perna em mm) ou false, recebi ${JSON.stringify(v)}`);
    const extra = Object.keys(v).filter((k) => !['largura', 'angulo', 'raio', 'espessura'].includes(k));
    if (extra.length) erro(`aba ${quem} tem campo desconhecido '${extra[0]}'; os campos são largura, angulo, raio e espessura`);
    const { largura, angulo = 90, raio = 0, espessura = null } = v;
    if (!(Number.isFinite(largura) && largura > 0)) erro(`aba ${quem}: largura é o comprimento da perna em mm, maior que zero (recebi ${JSON.stringify(largura)})`);
    if (!(Number.isFinite(angulo) && angulo >= 45 && angulo <= 90)) erro(`aba ${quem}: angulo é o giro da chapa na dobra, de 45 a 90 graus (recebi ${JSON.stringify(angulo)}); acima de 90 a perna passaria por baixo do vão e cruzaria a do painel vizinho, e abaixo de 45 ela sairia pela pele de fora`);
    if (!(Number.isFinite(raio) && raio >= 0)) erro(`aba ${quem}: raio é o do canto de dentro da dobra, em mm a partir de zero (recebi ${JSON.stringify(raio)})`);
    if (espessura != null && !(Number.isFinite(espessura) && espessura > 0)) erro(`aba ${quem}: espessura é a da chapa em mm, maior que zero, quando a chapa não a dá para ser lida (recebi ${JSON.stringify(espessura)})`);
    return { largura, angulo, raio, espessura };
  };
  const abaGeral = lerAba(o.aba, 'da chamada');
  if (abaGeral && !o.linhas.some((l) => l?.modo === 'superficie' || l?.curva !== undefined || l?.vistas !== undefined || (l?.modo == null && modoGeral === 'superficie'))) erro("aba da chamada só vale no modo 'superficie' (a perna é varrida sobre a chapa, ao longo da linha): nenhuma linha está nele");
  const abaDaLinha = (l) => (l?.aba !== undefined ? lerAba(l.aba, `da linha '${l?.nome ?? ''}'`) : abaGeral);
  const sementesPerdidas = o.sementesPerdidas ?? 'recusa';
  if (sementesPerdidas !== 'recusa' && sementesPerdidas !== 'avisa') erro("sementesPerdidas é 'recusa' ou 'avisa'");
  const passosDaChapa = chapa.passos ?? null;
  if ((modoGeral === 'superficie' || o.linhas.some((l) => l?.modo === 'superficie' || porCurva(l))) && (!passosDaChapa || o.normal)) {
    erro("o modo 'superficie' (e a linha por `curva`) precisa dos passos da chapa (chapa.passos) para levar a linha à chapa, e não combina com `normal`");
  }
  const parametros = chapa.parametros ?? {};
  const topo = chapa.pontos ?? {};
  const avisos = [];
  const aviso = (ref, texto) => avisos.push({ ref, texto });

  /* ---- confere as linhas e as sementes, sem executar nada ---- */
  const nomesDeLinha = new Set();
  o.linhas.forEach((l, i) => {
    const nome = l?.nome ?? `linha${i}`;
    if (porCurva(l)) {
      if (l.pontos != null || l.eixo != null || (l.curva !== undefined && l.vistas !== undefined)) erro(`a linha '${nome}' dá \`${l.vistas !== undefined ? 'vistas' : 'curva'}\` e também \`${l.curva !== undefined && l.vistas !== undefined ? 'curva' : l.pontos != null ? 'pontos' : 'eixo'}\`; escolha uma entrada: a curva 3D, as vistas continuadas, ou a linha de uma vista`);
      if (l.modo != null && l.modo !== 'superficie') erro(`a linha '${nome}' dá \`curva\`, que só vale no modo 'superficie' (recebido '${l.modo}')`);
      if (l.alcance != null || l.lado != null) erro(`a linha '${nome}' dá \`curva\`: \`alcance\` e \`lado\` são da linha de uma vista e não valem nela (a curva já está sobre a chapa)`);
      if (l.vistas !== undefined) {
        const ok = Array.isArray(l.vistas) && l.vistas.length >= 1 && l.vistas.every((v) => v && Object.hasOwn(INDICE, v.eixo) && Array.isArray(v.pontos) && v.pontos.length >= 1
          && v.pontos.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite)) && (v.lado == null || v.lado === '+' || v.lado === '-'));
        if (!ok || l.vistas.reduce((t, v) => t + v.pontos.length, 0) < 2) erro(`a linha '${nome}' precisa de \`vistas\`: lista de { eixo, pontos: [[a, b], ...], lado? } com pelo menos dois pontos no total, cada trecho na vista dele; um trecho acaba onde o seguinte começa`);
      } else if (!Array.isArray(l.curva) || l.curva.length < 2 || !l.curva.every((q) => Array.isArray(q) && q.length === 3 && q.every(Number.isFinite))) {
        erro(`a linha '${nome}' precisa de \`curva\` com pelo menos dois pontos [x, y, z] em mm sobre a chapa`);
      }
      const nPontos = l.vistas !== undefined ? l.vistas.reduce((t, v) => t + v.pontos.length, 0) : l.curva.length;
      if (l.fechada && nPontos < 3) erro(`a curva fechada '${nome}' precisa de pelo menos três pontos`);
    } else {
      if (!l || !Object.hasOwn(INDICE, l.eixo)) erro(`a linha '${nome}' precisa de eixo 'x', 'y' ou 'z' (o eixo da vista em que foi desenhada), ou de \`curva\` (pontos 3D sobre a chapa)`);
      if (!Array.isArray(l.pontos) || l.pontos.length < 2 || !l.pontos.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite))) {
        erro(`a linha '${nome}' precisa de pelo menos dois pontos [a, b] em mm no plano da vista ${l.eixo}`);
      }
      if (l.fechada && l.pontos.length < 3) erro(`a linha fechada '${nome}' precisa de pelo menos três pontos`);
    }
    if (!porCurva(l) && l.alcance != null && !(Array.isArray(l.alcance) && l.alcance.length === 2 && l.alcance.every(Number.isFinite) && l.alcance[0] < l.alcance[1])) erro(`o alcance da linha '${nome}' precisa ser [min, max] no eixo ${l.eixo}, com min menor que max`);
    if (!porCurva(l) && l.lado != null && l.lado !== '+' && l.lado !== '-') erro(`o lado da linha '${nome}' é '+' ou '-'`);
    if (l.dentro != null && l.dentro !== 'painel' && l.dentro !== 'descarta') erro(`dentro da linha '${nome}' é 'painel' ou 'descarta'`);
    if (porCurva(l) && Array.isArray(l.alem)) {
      if (!(l.alem.length === 2 && l.alem.every((x) => Number.isFinite(x) && x >= 0))) erro(`alem da curva '${nome}' é um número de mm a partir de zero, ou [no início, no fim] (recebido ${JSON.stringify(l.alem)})`);
    } else if (l.alem != null && !(Number.isFinite(l.alem) && l.alem >= 0)) erro(`alem da linha '${nome}' precisa ser um número de mm a partir de zero (recebido ${JSON.stringify(l.alem)})`);
    if (l.separa != null && typeof l.separa !== 'boolean') erro(`separa da linha '${nome}' é true ou false (recebido ${JSON.stringify(l.separa)})`);
    if (l.dentro === 'descarta' && !l.fechada) erro(`dentro: 'descarta' só vale para linha fechada ('${nome}' é aberta)`);
    if (nomesDeLinha.has(nome)) erro(`duas linhas se chamam '${nome}'`);
    nomesDeLinha.add(nome);
    if (l.aba != null && l.aba !== false && l.dentro === 'descarta') erro(`a linha '${nome}' dá \`aba\` e \`dentro: 'descarta'\`: o pedaço de dentro some, e não há painel cuja borda dobrar`);
    if (l.aba != null && l.aba !== false && !(porCurva(l) || (l.modo ?? modoGeral) === 'superficie')) erro(`a linha '${nome}' dá \`aba\`, que só vale no modo 'superficie' (a perna é varrida sobre a chapa, ao longo da linha)`);
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
    /* a linha por `curva` leva o ponto à pele de FORA da chapa: numa `subdivisao` com espessura a origem publica as partes externa, interna e borda, e as três nomeiam as faces */
    const doPasso = chapa.origem.op === 'subdivisao' ? passosDaChapa.find((p) => Array.isArray(p) && p[0] === 'subdivisao' && p[1]?.origemId === chapa.origem.id) : null;
    const separaPele = o.linhas.some((l) => porCurva(l) || (l?.modo ?? modoGeral) === 'superficie') && doPasso?.[1]?.espessura != null;
    const marca = [...passosDaChapa, ...(separaPele
      ? ['externa', 'interna', 'borda'].map((parte) => ['parte', { nome: `__${parte}__`, sel: { origem: { ...chapa.origem, parte } } }])
      : [['parte', { nome: '__chapa__', sel: { origem: chapa.origem } }]])];
    let t0 = performance.now();
    const st = nucleo(marca, parametros, topo);
    cronometra('executarChapa', t0);
    /* só os passos da chapa falam: os `parte` que o ajudante acrescentou citam uma origem que o passo recusado não criou, e esse eco não é causa */
    const doAutor = st.orfaos.filter((x) => !(x.passo >= passosDaChapa.length));
    if (st.orfaos.length) erro(`os passos da chapa foram recusados pelo núcleo: ${(doAutor.length ? doAutor : st.orfaos).slice(0, 3).map((x) => x.motivo).join('; ')}`);
    const nomesDaChapa = separaPele ? new Set(['__externa__', '__interna__', '__borda__']) : new Set(['__chapa__']);
    const daChapa = [...st.F.values()].filter((f) => nomesDaChapa.has(f.parte)).map((f) => f.id);
    if (!daChapa.length) erro(`a origem ${chapa.origem.op}:${chapa.origem.id} não tem face nenhuma depois dos passos da chapa`);
    if (daChapa.length !== st.F.size) erro(`os passos da chapa deixam ${st.F.size - daChapa.length} face(s) fora da origem ${chapa.origem.op}:${chapa.origem.id}; passe só os passos que constroem a chapa`);
    const todos = [...st.V.values()];
    /* por laço, e não por espalhamento: Math.min(...lista) estoura a pilha com mais de uns 120 mil elementos (uma chapa grande tem mais vértices que isso) */
    const caixa = [0, 1, 2].map((e) => { let lo = Infinity; let hi = -Infinity; for (const p of todos) { if (p[e] < lo) lo = p[e]; if (p[e] > hi) hi = p[e]; } return [lo, hi]; });
    t0 = performance.now();
    leitura = { st, raios: prepararRaios(st.V, st.F, daChapa), caixa, passos: passosDaChapa.length, ids: daChapa,
      externa: separaPele ? [...st.F.values()].filter((f) => f.parte === '__externa__').map((f) => f.id) : null,
      interna: separaPele ? [...st.F.values()].filter((f) => f.parte === '__interna__').map((f) => f.id) : null,
      borda: separaPele ? [...st.F.values()].filter((f) => f.parte === '__borda__').map((f) => f.id) : null };
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
  const curvas = [];
  const linhasDeVista = [];
  let passosDasAbas = []; let origensDasAbas = []; let origensFundas = []; let gerarSuperficie = null; let conferirLaminas = null; let lidasDeSuperficie = []; let naPeleDaCurva = null; let larguraDaSuperficie = 0; let inicioDaSuperficie = 0; let inicioDasFerramentas = 0;
  for (let li = 0; li < o.linhas.length; li += 1) {
    const l = o.linhas[li];
    const nome = l.nome ?? `linha${li}`;
    const eixo = l.eixo;
    if (porCurva(l)) { pendentes.push({ l, nome, curva: true }); continue; }
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

    linhasDeVista.push({ nome, fechada: !!l.fechada, descarta: l.dentro === 'descarta' || l.separa === false, eixo, alcance, lado, trechos });
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
  const vizinhasDe = () => {
    if (!vizinhas) {
      vizinhas = new Map();
      for (const f of leitura.st.F.values()) for (const v of f.vs) { if (!vizinhas.has(v)) vizinhas.set(v, []); vizinhas.get(v).push(f.id); }
    }
    return vizinhas;
  };
  const normalSuave = (face, ponto) => {
    const { V, F } = leitura.st;
    vizinhasDe();
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
    /* a pele de fora e a de dentro da chapa, para a curva 3D: a grade do ponto mais próximo se monta uma vez, só com as faces da parte `externa` (a pele de fora de uma
       `subdivisao` com espessura), e senão com todas as faces da chapa */
    let pele = null; let interna = null;
    const peleDaChapa = () => {
      if (pele) return pele;
      pele = prepararPontoNaMalha(leitura.st.V, leitura.st.F, leitura.externa ?? leitura.ids);
      if (leitura.interna) interna = prepararPontoNaMalha(leitura.st.V, leitura.st.F, leitura.interna);
      return pele;
    };
    /* a normal no ponto do toque: a interpolação, pelas coordenadas baricêntricas, das normais alisadas dos três vértices do triângulo (a de cada vértice, a média das faces que o
       dividem e giram menos que 25 graus da face tocada), voltada para o lado da normal da face: varia sem salto de uma face da malha à vizinha, e a seção da lâmina gira por igual numa quina arredondada */
    const normalNoToque = (r) => {
      const { V, F } = leitura.st;
      const n0 = normalDaFace(V, F.get(r.face).vs);
      let nm = [0, 0, 0];
      r.vertices.forEach((v, k) => {
        let soma3 = [0, 0, 0];
        for (const id of vizinhasDe().get(v)) {
          const ni = normalDaFace(V, F.get(id).vs);
          if (ni[0] * n0[0] + ni[1] * n0[1] + ni[2] * n0[2] >= 0.9063) soma3 = [soma3[0] + ni[0], soma3[1] + ni[1], soma3[2] + ni[2]];
        }
        const L = Math.hypot(...soma3) || 1;
        nm = [nm[0] + (r.baricentro[k] * soma3[0]) / L, nm[1] + (r.baricentro[k] * soma3[1]) / L, nm[2] + (r.baricentro[k] * soma3[2]) / L];
      });
      const Ln = Math.hypot(...nm);
      nm = Ln > 1e-9 ? nm.map((x) => x / Ln) : n0;
      if (nm[0] * n0[0] + nm[1] * n0[1] + nm[2] * n0[2] < 0) nm = nm.map((x) => -x);
      return nm;
    };
    /* o ponto está fora do material, a mais de `margem` mm dele? A distância assinada à chapa inteira (fechada): o toque mais próximo dá a distância, e o lado vem da pseudonormal do traço tocado (a normal da
       face no meio dela, a soma das normais das duas faces numa aresta, a soma das normais das faces pesadas pelo ângulo num vértice: o sinal certo também junto de uma quina, onde a normal de uma face só erra) */
    let sobreAChapa = null;
    const foraDoMaterial = leitura.interna ? (p, margem = 0.01) => {
      const { V, F } = leitura.st;
      sobreAChapa ??= prepararPontoNaMalha(V, F, leitura.ids);
      const r = sobreAChapa.maisProximo(p, 4 * o.vao + 10 * margem);
      if (!r) return true;
      const vizinhas = vizinhasDe();
      const zeros = r.baricentro.map((w, k) => (w < 1e-9 ? k : -1)).filter((k) => k >= 0);
      const vs = r.vertices;
      let nm;
      if (zeros.length === 0) nm = normalDaFace(V, F.get(r.face).vs);
      else if (zeros.length === 1) {
        const [a, b] = vs.filter((_, k) => k !== zeros[0]);
        nm = [0, 0, 0];
        for (const id of vizinhas.get(a)) if (F.get(id).vs.includes(b)) { const n = normalDaFace(V, F.get(id).vs); nm = [nm[0] + n[0], nm[1] + n[1], nm[2] + n[2]]; }
      } else {
        const v = vs[r.baricentro.findIndex((w) => w > 1 - 1e-9)];
        nm = [0, 0, 0];
        for (const id of vizinhas.get(v)) {
          const fvs = F.get(id).vs; const k = fvs.indexOf(v); const n = fvs.length;
          const P = V.get(v); const A = V.get(fvs[(k + 1) % n]); const B = V.get(fvs[(k + n - 1) % n]);
          const u = [A[0] - P[0], A[1] - P[1], A[2] - P[2]]; const w = [B[0] - P[0], B[1] - P[1], B[2] - P[2]];
          const ang = Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / ((Math.hypot(...u) * Math.hypot(...w)) || 1))));
          const nf = normalDaFace(V, fvs);
          nm = [nm[0] + ang * nf[0], nm[1] + ang * nf[1], nm[2] + ang * nf[2]];
        }
      }
      return (p[0] - r.ponto[0]) * nm[0] + (p[1] - r.ponto[1]) * nm[1] + (p[2] - r.ponto[2]) * nm[2] > 0 && r.distancia > margem;
    } : null;
    /* o ponto da curva levado à pele: o ponto mais próximo, a normal alisada como no modo superfície, voltada para fora (o lado da normal da face), e a espessura lida
       (a distância à pele de dentro, ou o próximo toque do raio ao longo da normal) */
    const naPele = (q, limite) => {
      const r = peleDaChapa().maisProximo(q, limite);
      if (!r) return null;
      const nm = normalNoToque(r);
      let esp = null;
      if (interna) { const d = interna.maisProximo(r.ponto, 8 * o.vao); esp = d ? d.distancia : null; } else {
        const eps = 1e-4 * Math.max(...leitura.caixa.map(([a0, a1]) => a1 - a0));
        const baixo = leitura.raios.primeiro(r.ponto.map((x, k) => x - nm[k] * eps), nm.map((x) => -x));
        esp = baixo && baixo.t + eps <= 8 * o.vao ? baixo.t + eps : null;
      }
      return { c: r.ponto, n: nm, esp, d: r.distancia };
    };
    const lidas = pendentes.map((pd) => {
      if (pd.curva) {
        const { l, nome } = pd;
        /* a linha continuada de uma vista a outra: cada trecho vai à chapa pelo raio da vista dele (a primeira camada tocada), e a emenda entre dois trechos é uma corda que
           `projetarCurva` leva à pele, ponto a ponto, onde a normal gira */
        const P = l.vistas !== undefined ? l.vistas.flatMap((v, iv) => v.pontos.map((q, k) => {
          const e = EIXO[v.eixo]; const [lo, hi] = leitura.caixa[e];
          const dirv = [0, 0, 0]; dirv[e] = v.lado === '-' ? 1 : -1;
          const de = ponto3(v.eixo, q[0], q[1], v.lado === '-' ? lo - afasta(e) : hi + afasta(e));
          const acerto = leitura.raios.primeiro(de, dirv);
          if (!acerto) erro(`o ponto ${k} [${br(q[0])}, ${br(q[1])}] do trecho ${iv} (vista ${v.eixo}) da linha '${nome}' não toca a chapa: o raio da vista não acha face; confira o eixo, a ordem dos pontos e a unidade (mm)`);
          return [0, 1, 2].map((c) => de[c] + dirv[c] * acerto.t);
        })) : l.curva;
        const proj = projetarCurva({ projetar: naPele, pontos: P, fechada: !!l.fechada, amostragem, largura, nome, alem: alemDa(l), tolerancia: distanciaDaCurva });
        const profPedida = l.profundidade ?? o.profundidade ?? null;
        const espLida = Math.max(0, ...proj.segmentos.flat().map((st) => st.esp ?? 0));
        if (profPedida != null && espLida > 0 && profPedida <= espLida) {
          erro(`a profundidade ${br(profPedida)} mm da linha '${nome}' não atravessa a chapa: a espessura lida na linha chega a ${br(espLida)} mm; dê uma profundidade maior que a espessura, ou tire a opção para a lâmina descer a espessura lida mais meio vão`);
        }
        curvas.push({ nome, estacoes: proj.segmentos[0].length, quinas: proj.quinas, desvioMaximo: proj.desvioMaximo, podadas: proj.podadas });
        return { ...pd, ...proj, cima: null };
      }
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
    /* a curva aberta com `alem`: as duas pontas passam `alem` mm adiante, no plano tangente, e a lâmina vai além da borda da chapa */
    lidas.forEach((ln) => {
      if (!ln.curva || ln.l.fechada) return;
      const [antes, depois] = alemDa(ln.l);
      if (antes > 0) alongar(ln.segmentos[0], false, antes);
      if (depois > 0) alongar(ln.segmentos[0], true, depois);
    });
    /* as conferências da lâmina, numa largura dada: o ajudante as refaz a cada largura corrigida pela folga medida, porque a lâmina mais larga cruza onde a estreita não cruzava */
    conferirLaminas = (larg, depois = '') => {
      const nota = depois ? ` ${depois}` : '';
      for (const ln of lidas) {
        const { l, nome, segmentos, fechadaInteira } = ln;
        if (l.fechada && l.dentro !== 'descarta' && fechadaInteira) {
          if (voltaMenorQueOVao(segmentos[0], larg)) {
            erro(`a volta '${nome}' é menor que o vão: a lâmina de ${br(larg)} mm de largura${nota}, por dentro, passa do outro lado da volta e deixaria uma ilha fantasma; faça a volta maior que o vão, ou use dentro: 'descarta' para só furar a chapa`);
          }
        }
        for (const estacoes of segmentos) {
          const cruza = ln.curva ? bordasSeCruzamNaCurva(estacoes, !!l.fechada && fechadaInteira, larg) : bordasSeCruzam(estacoes, !!l.fechada && fechadaInteira, larg, ln.e);
          if (cruza === 'aberta') erro(`a lâmina da linha '${nome}' se cruza (canto muito fechado ou pontos muito juntos para a largura ${br(larg)} mm${depois ? `, ${depois}` : ''}); abra o canto ou afaste os pontos`);
          if (cruza === 'volta') erro(`a lâmina da volta '${nome}' se cruza por dentro ou por fora: algum trecho dela é mais estreito que o vão (${br(larg)} mm de lâmina${depois ? `, ${depois}` : ''}) ou o canto é fechado demais, e a lâmina deixaria uma ilha fantasma; alargue o trecho, abra o canto, ou use dentro: 'descarta' para só furar a chapa`);
        }
        const perto = linhaPertoDeSiMesma(segmentos[0], !!l.fechada && fechadaInteira, larg);
        if (perto != null) erro(`a linha '${nome}' passa a ${br(perto)} mm dela mesma, menos que a lâmina de ${br(larg)} mm${nota}: o vão de um trecho invade o do outro (um gargalo, um grampo ou uma volta estreita) e deixaria ilha ou fresta; alargue o trecho para mais que o vão, ou parta a linha`);
      }
    };
    conferirLaminas(largura);
    /* a curva que corre sobre a borda da chapa: a lâmina de uma linha que segue a borda a menos de meia largura dela sai pela quina o tempo todo, e o fundo dela passa pela pele de dentro de um lado e de outro; só o cruzamento da borda é aceito */
    if (leitura.borda?.length) {
      const nasBordas = prepararPontoNaMalha(leitura.st.V, leitura.st.F, leitura.borda);
      for (const ln of lidas) {
        if (!ln.curva) continue;
        for (const estacoes of ln.segmentos) {
          let arco = 0; let seguido = 0; let onde = null;
          for (let k = 0; k + 1 < estacoes.length; k += 1) {
            const A = estacoes[k]; const B = estacoes[k + 1];
            const perto = !A.alongada && !B.alongada && [A, B].every((x) => nasBordas.maisProximo(x.c, largura / 2 + 0.5));
            const passo = Math.hypot(B.c[0] - A.c[0], B.c[1] - A.c[1], B.c[2] - A.c[2]);
            if (perto) { seguido += passo; if (seguido > arco) { arco = seguido; onde = A.c; } } else seguido = 0;
          }
          if (arco > 3 * largura) {
            erro(`a curva '${ln.nome}' corre sobre a borda da chapa por ${br(arco)} mm seguidos (perto de [${onde.map(br).join(', ')}], a menos de ${br(largura / 2 + 0.5)} mm dela): a lâmina sai pela quina da chapa e o fundo dela cruza a pele de dentro, e o corte deixaria ponte; afaste a curva da borda, ou use a borda como linha de corte da própria chapa`);
          }
        }
      }
    }
    /* os sólidos das lâminas, de uma largura dada: os ids são os mesmos em toda largura, e o ajudante regera as lâminas com a largura corrigida pela folga medida */
    lidasDeSuperficie = lidas; naPeleDaCurva = naPele;
    const idBase = proximo;
    gerarSuperficie = (larguraDe) => {
      const passos = []; const ferr = []; let id = idBase;
      const abasDe = [];
      for (const ln of lidas) {
        const { l, nome, segmentos, fechadaInteira } = ln;
        const abaDela = abaDaLinha(l);
        const espessuraDaAba = (estacoes) => { const lidas2 = estacoes.filter((q) => !q.alongada && q.esp != null).map((q) => q.esp).sort((a, b) => a - b); return abaDela?.espessura ?? (lidas2.length ? lidas2[Math.floor(lidas2.length / 2)] : null); };
        for (const estacoes of segmentos) {
          const espessuraDela = abaDela ? espessuraDaAba(estacoes) : null;
          if (abaDela && !(espessuraDela > 0)) erro(`a aba da linha '${nome}' precisa da espessura da chapa: ela não pôde ser lida na linha, e \`aba.espessura\` (mm) não foi dada`);
          const varrido = varrer({ estacoes, fechada: !!l.fechada && fechadaInteira, largura: larguraDe, aba: abaDela ? { ...abaDela, espessura: espessuraDela } : null, profundidade: l.profundidade ?? o.profundidade ?? null, descarta: l.dentro === 'descarta', nome, cima: ln.cima, areaPorNorma: !!ln.curva, alemDaPele: foraDoMaterial ? (q) => foraDoMaterial(q) : null });
          passos.push(['subdivisao', { origemId: id, vertices: varrido.vertices, faces: varrido.faces, niveis: 0 }]);
          ferr.push({ op: 'subdivisao', id });
          id += 1;
          for (const shell of varrido.abas ?? []) abasDe.push({ ...shell, nome, fundo: (espessuraDela ?? 0) + abaDela.largura });
        }
      }
      /* as pernas das abas: os ids vêm depois dos das lâminas, e o número de pernas não muda com a largura da lâmina */
      const abasPassos = []; const abasOrigens = []; const fundasOrigens = [];
      for (const shell of abasDe) {
        abasPassos.push(['subdivisao', { origemId: id, vertices: shell.vertices, faces: shell.faces, niveis: 0 }]);
        abasOrigens.push({ op: 'subdivisao', id });
        id += 1;
      }
      /* A PERNA PARA ONDE OUTRA LINHA PASSA. Com mais de uma linha, a perna de uma desce pela borda do corte e passaria pelo vão da outra (a emenda em T): as lâminas de todas as linhas,
         refeitas até abaixo da ponta da perna, são tiradas das pernas, e a perna acaba na parede do vão vizinho em vez de ligar os dois painéis. */
      if (abasDe.length && lidas.length > 1) {
        const funda = Math.max(...abasDe.map((a2) => a2.fundo)) + 2 * o.vao;
        for (const ln of lidas) {
          const { l, nome, segmentos, fechadaInteira } = ln;
          for (const estacoes of segmentos) {
            const varrido = varrer({ estacoes, fechada: !!l.fechada && fechadaInteira, largura: larguraDe, profundidade: funda, descarta: l.dentro === 'descarta', nome, cima: ln.cima, areaPorNorma: !!ln.curva, alemDaPele: null });
            abasPassos.push(['subdivisao', { origemId: id, vertices: varrido.vertices, faces: varrido.faces, niveis: 0 }]);
            fundasOrigens.push({ op: 'subdivisao', id });
            id += 1;
          }
        }
      }
      return { passos, ferr, fim: id, abasPassos, abasOrigens, fundasOrigens };
    };
    larguraDaSuperficie = largura;
    const g0 = gerarSuperficie(largura);
    inicioDaSuperficie = passosDeCorte.length; inicioDasFerramentas = ferramentas.length;
    passosDeCorte.push(...g0.passos); ferramentas.push(...g0.ferr);
    passosDasAbas = g0.abasPassos; origensDasAbas = g0.abasOrigens; origensFundas = g0.fundasOrigens;
    proximo = g0.fim;
    folgaMinima = Math.min(folgaMinima, largura);
  }
  const idDoCorte = proximo; proximo += 1;
  let corte = ['subtrair', { origemId: idDoCorte, solidos: [{ origem: chapa.origem }, ...ferramentas.map((origem) => ({ origem }))] }];
  const origemDoCorte = { op: 'subtrair', id: idDoCorte };
  /* a união das pernas com os painéis cortados: o `unir` de depois do corte e da limpeza; as partes saem dela */
  const idDasPernas = origensDasAbas.length > 1 ? proximo : null; if (idDasPernas != null) proximo += 1;
  const idDasAparadas = origensDasAbas.length && origensFundas.length ? proximo : null; if (idDasAparadas != null) proximo += 1;
  const idDaUniao = origensDasAbas.length ? proximo : null; if (idDaUniao != null) proximo += 1;
  const origemDasPernas = idDasPernas != null ? { op: 'unir', id: idDasPernas } : origensDasAbas[0];
  const origemDasAparadas = idDasAparadas != null ? { op: 'subtrair', id: idDasAparadas } : origemDasPernas;
  const uniaoDasAbas = idDaUniao == null ? [] : [
    ...(idDasPernas != null ? [['unir', { origemId: idDasPernas, solidos: origensDasAbas.map((origem) => ({ origem })) }]] : []),
    ...(idDasAparadas != null ? [['subtrair', { origemId: idDasAparadas, solidos: [{ origem: origemDasPernas }, ...origensFundas.map((origem) => ({ origem }))] }]] : []),
    ['unir', { origemId: idDaUniao, solidos: [{ origem: origemDoCorte }, { origem: origemDasAparadas }] }]];
  const origemDasPartes = idDaUniao == null ? origemDoCorte : { op: 'unir', id: idDaUniao };
  const toleranciaDaLimpeza = o.limpar === false ? null : o.limpar != null && typeof o.limpar === 'object' ? o.limpar.tolerancia : o.limpar === true || pendentes.length ? 0.01 : null;
  const limpa = toleranciaDaLimpeza == null ? [] : [['limparLascas', { sel: { origem: origemDoCorte }, tolerancia: toleranciaDaLimpeza }]];

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
    const passosDasPartes = partes.map((p) => ['parte', { nome: p.nome, sel: { origem: origemDasPartes, onde: { conexo: { de: p.de, dir: p.dir, ...(p.ate != null ? { ate: p.ate } : {}) } } } }]);
    return [...(chapa.emitir === false ? [] : (passosDaChapa ?? [])), ...passosDeCorte, corte, ...limpa, ...passosDasAbas, ...uniaoDasAbas, ...passosDasPartes];
  };
  const passos = montarPassos();

  /* ---- o corte executado uma vez, e a conferência ---- */
  const medidas = {
    vaoPedido: o.vao, inclinacaoMaxima: r3(inclinacaoMaxima), fatorMinimo: r3(fatorMinimo), folgaMinima: r3(folgaMinima), paineis: [], paineisAchados: 0,
    sementesSemPainel: [], pedacosSemNome: [], pedacos: 0, execucoes: leitura ? 2 : 0,
  };
  const saida = { passos, partes: partes.map((p) => ({ nome: p.nome, origem: origemDasPartes, de: p.de, dir: p.dir })), origemDoCorte, proximoId: proximo, primeiroId, medidas, avisos };
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
    saida.partes = partes.map((p) => ({ nome: p.nome, origem: origemDasPartes, de: p.de, dir: p.dir, ate: p.ate ?? null }));
    medidas.execucoes = 1;
    if (o.medirTempo === true) medidas.tempos = tempos;
    return saida;
  }
  /* as causas da recusa do corte: o passo seguinte ao `subtrair` recusado (a limpeza de lascas) cita uma origem que o `subtrair` não chegou a criar, e esse eco não diz nada além da causa */
  const causasDoCorte = (orfaos) => {
    const eco = `origem subtrair:${idDoCorte} inexistente`;
    const causas = orfaos.filter((x) => !String(x.motivo).startsWith(eco));
    return (causas.length ? causas : orfaos).map((x) => x.motivo);
  };
  const executar = () => { const t0 = performance.now(); const r = nucleo([...passosDaChapa, ...passosDeCorte, corte, ...limpa, ...passosDasAbas, ...uniaoDasAbas], parametros, topo); cronometra('executarCorte', t0); return r; };
  const tCorte = performance.now();
  let executado = executar();
  if (executado.orfaos.length) {
    erro(`o corte foi recusado pelo núcleo: ${causasDoCorte(executado.orfaos).slice(0, 3).join('; ')}. Confira se alguma linha deixa a chapa sem pedaço, se o polígono da lâmina se cruza (pontos muito juntos num canto fechado) e se a chapa é um sólido fechado`);
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
      conferirLaminas(larguraDaSuperficie, `depois de corrigir a largura da lâmina de ${br(larguraDaSuperficie / fator)} para ${br(larguraDaSuperficie)} mm pela folga medida de ${br(folgaMedida)} mm`);
      const g = gerarSuperficie(larguraDaSuperficie);
      passosDeCorte.splice(inicioDaSuperficie, g.passos.length, ...g.passos);
      passosDasAbas = g.abasPassos;
      executado = executar();
      if (executado.orfaos.length) erro(`o corte foi recusado pelo núcleo depois de corrigir a largura da lâmina para ${br(larguraDaSuperficie)} mm: ${causasDoCorte(executado.orfaos).slice(0, 2).join('; ')}`);
      folgaMedida = medirFolga() ?? folgaMedida;
      ajustes += 1;
    }
    medidas.execucoes += ajustes;
    medidas.larguraDaLamina = r3(larguraDaSuperficie);
    if (folgaMedida > o.vao * 1.05) aviso('folgaAcimaDoVao', `a folga 3D medida entre os pedaços é ${br(folgaMedida)} mm, acima de 1,05 vez o vão pedido de ${br(o.vao)} mm, mesmo depois de ${ajustes} correção(ões) da largura da lâmina (${br(larguraDaSuperficie)} mm): a chapa curva demais junto da linha para a lâmina de parede normal dar o vão; afaste a linha da curva, divida-a ou aceite a folga`);
    if (folgaMedida < o.vao * 0.998) aviso('folgaAbaixoDoVao', `a folga 3D medida entre os pedaços é ${br(folgaMedida)} mm, abaixo do vão pedido de ${br(o.vao)} mm, mesmo depois de ${ajustes} correção(ões) da largura da lâmina (${br(larguraDaSuperficie)} mm): a chapa curva demais junto da linha; afaste a linha da curva, divida-a ou aceite a folga`);
  }
  if (folgaMedida != null) { medidas.folgaMedida = r3(folgaMedida); if (pendentes.length) medidas.folgaMinima = r3(folgaMedida); }
  if (curvas.length) medidas.curvas = curvas;
  if (limpa.length) {
    /* as faces finas do corte, antes e depois da limpeza: a de antes sai de uma execução a mais, sem o passo */
    const finas = (st) => analisarTopologia({ vertices: st.V, faces: st.F }).achados.filter((x) => x.codigo === 'face-fina').length;
    const sem = nucleo([...passosDaChapa, ...passosDeCorte, corte], parametros, topo);
    medidas.lascasAntes = finas(sem); medidas.lascasRestantes = finas(executado);
    medidas.execucoes += 1;
  }
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
  if (grupos.length <= pedacosDaChapa && !o.linhas.some((l) => l.dentro === 'descarta') && curvas.length) {
    erro(`o corte das linhas por curva deixou ${grupos.length} pedaço(s), os mesmos que a chapa tinha: nenhuma curva a separou em dois pedaços; a curva aberta precisa ir de borda a borda (termine-a na borda e dê \`alem\` para a ponta passar dela, e com isso a lâmina não deixa ponte) e a fechada precisa fechar a volta`);
  }
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
  /* CADA LINHA PROVA QUE SEPARA. O número de pedaços da chapa inteira não diz qual linha separou: uma curva que para no meio da chapa passa sem aviso quando outra linha separa. Em estações ao longo de cada linha, o ponto a meia lâmina mais
     0,15 vão de cada lado, sobre a pele, tem de cair em pedaços diferentes (na linha fechada, o de dentro e o de fora são pedaços diferentes). O ponto que cai num vão, numa abertura ou fora da chapa não conta (na curva, o par só vale com os dois pontos a menos de um vão da pele, e o segmento que toca a ponta alongada por `alem` não entra: ali os dois pontos caem fora da borda e são levados ao mesmo lado dela); a linha sem nenhum par contado
     avisa que não foi provada. O que recusa traz a linha e o ponto da ponte. */
  const provasDeSeparacao = [];
  {
    const malhaDepois = prepararPontoNaMalha(executado.V, executado.F, ids);
    const tolerancia = 0.02 * o.vao + 1e-4;
    const pedacoNoPonto = (c) => { const r = malhaDepois.maisProximo(c, tolerancia); return r ? pedacoDe.get(r.face) : null; };
    const pares = [];
    for (const v of linhasDeVista) {
      if (v.descarta) continue;
      const [ia, ib] = INDICE[v.eixo]; const e = EIXO[v.eixo];
      const dirv = [0, 0, 0]; dirv[e] = v.lado === '-' ? 1 : -1;
      const [lo, hi] = leitura.caixa[e];
      const naPeleDaVista = (a, b) => {
        const de = ponto3(v.eixo, a, b, v.lado === '-' ? lo - afasta(e) : hi + afasta(e));
        const h = leitura.raios.todos(de, dirv).find((x) => { const c = de[e] + dirv[e] * x.t; return c >= v.alcance[0] - FOLGA_DO_ALCANCE && c <= v.alcance[1] + FOLGA_DO_ALCANCE; });
        return h ? [0, 1, 2].map((k) => de[k] + dirv[k] * h.t) : null;
      };
      void ia; void ib;
      const lista = [];
      for (const T of v.trechos) {
        const P = T.pontos;
        for (let k = 0; k + 1 < P.length; k += 1) {
          const A = P[k]; const B = P[k + 1];
          const L = Math.hypot(B.q[0] - A.q[0], B.q[1] - A.q[1]);
          const M = Math.max(1, Math.ceil(L / amostragem));
          for (let j = 0; j < M; j += 1) {
            const u = (j + 0.5) / M;
            const q = [A.q[0] + (B.q[0] - A.q[0]) * u, A.q[1] + (B.q[1] - A.q[1]) * u];
            const h = (A.h + (B.h - A.h) * u) * 1.3;
            lista.push({ c: naPeleDaVista(q[0], q[1]), a: naPeleDaVista(q[0] + T.m[0] * h, q[1] + T.m[1] * h), b: naPeleDaVista(q[0] - T.m[0] * h, q[1] - T.m[1] * h) });
          }
        }
      }
      pares.push({ nome: v.nome, fechada: v.fechada, lista });
    }
    for (const ln of lidasDeSuperficie) {
      if (ln.l.dentro === 'descarta' || ln.l.separa === false) continue;
      const h = larguraDaSuperficie / 2 + 0.15 * o.vao;
      const lista = [];
      for (const estacoes of ln.segmentos) {
        for (const x of amostrasLaterais(estacoes, !!ln.l.fechada && ln.fechadaInteira, h)) {
          if (ln.curva) {
            /* o par só vale com os dois pontos sobre a pele: a ponta alongada passa da borda, e ali o ponto de cada lado cai fora da chapa e é levado à mesma
               borda (uma ponte que não existe); o segmento que toca uma estação alongada, e o ponto que a pele mais próxima deixa a mais de um vão, saem */
            const alongado = estacoes[x.i].alongada || estacoes[(x.i + 1) % estacoes.length].alongada;
            const ra = alongado ? null : naPeleDaCurva(x.a, 4 * o.vao); const rb = alongado ? null : naPeleDaCurva(x.b, 4 * o.vao);
            const sobre = (r) => (r && r.d <= o.vao ? r.c : null);
            lista.push({ c: x.c, a: sobre(ra), b: sobre(rb) });
          } else {
            const cima = ln.cima;
            const sobe = (p) => { const e = cima.findIndex((w) => Math.abs(w) > 0.5); const [lo, hi] = leitura.caixa[e]; const de = p.map((w, k) => (k === e ? (cima[e] > 0 ? hi + afasta(e) : lo - afasta(e)) : w)); const dd = cima.map((w) => -w); const t = leitura.raios.primeiro(de, dd); return t ? [0, 1, 2].map((k) => de[k] + dd[k] * t.t) : null; };
            lista.push({ c: x.c, a: sobe(x.a), b: sobe(x.b) });
          }
        }
      }
      pares.push({ nome: ln.nome, fechada: !!ln.l.fechada, lista });
    }
    for (const { nome, fechada, lista } of pares) {
      const uteis = lista.map((x) => ({ ...x, pa: x.a && x.c ? pedacoNoPonto(x.a) : null, pb: x.b && x.c ? pedacoNoPonto(x.b) : null })).filter((x) => x.pa != null && x.pb != null);
      const ponte = uteis.find((x) => x.pa === x.pb);
      provasDeSeparacao.push({ nome, pares: uteis.length, ponte: ponte ? ponte.c.map(r3) : null });
      if (ponte) erro(`a ${fechada ? 'volta' : 'linha'} '${nome}' não separa os dois lados dela: os pontos a ${br((larguraDaSuperficie || o.vao) / 2 + 0.15 * o.vao)} mm de cada lado, perto de [${ponte.c.map(br).join(', ')}], caem no mesmo pedaço, e ${fechada ? 'o de dentro e o de fora são um pedaço só' : 'uma ponte (a linha para antes da borda, ou outra linha a deixa passar) liga os dois lados'}; ${fechada ? 'feche a volta e confira a lâmina' : 'termine a linha na borda da chapa e dê `alem` para a ponta passar dela'}`);
      if (!uteis.length) aviso('separacaoNaoProvada', `a ${fechada ? 'volta' : 'linha'} '${nome}' não teve nenhum par de pontos de lados opostos sobre a chapa, e o ajudante não provou que ela separa (ela sai da chapa, passa por abertura ou por outro vão)`);
    }
    medidas.separacao = provasDeSeparacao;
  }
  saida.passos = montarPassos();
  saida.partes = partes.map((p) => ({ nome: p.nome, origem: origemDasPartes, de: p.de, dir: p.dir, ate: p.ate ?? null }));
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
