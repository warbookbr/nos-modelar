/* paineis-por-vaos.js — uma chapa partida em painéis por linhas de vão desenhadas em vistas, com o vão medido ao longo da chapa
 *
 * FICHA paineisPorVaos
 * serve: dividir uma chapa já feita (a casca facetada de um corpo, ou uma `subdivisao` com `espessura`) em painéis de chapa separados
 *   por um vão de largura constante, cada painel como parte nomeada, sem montar a chapa de novo para cada painel: a chapa entra uma vez,
 *   todas as lâminas de vão saem num `subtrair` só, e cada pedaço é nomeado pelo ponto que se vê dele.
 * quando: capô, para-lamas, portas, teto e tampa de um carro, tampas e portinholas de uma máquina, qualquer carenagem que a referência
 *   mostra em peças com frestas. Para uma abertura que vira peça rente à pele (a lente), `aberturaPorContorno`; aqui o vão é entre painéis
 *   vizinhos da mesma chapa, e a linha pode sair pela borda dela.
 * unidades: tudo em mm, na mesma unidade da chapa. A linha é desenhada numa vista ortogonal: eixo 'x' (pontos [z, y]), 'y' (pontos [x, z])
 *   ou 'z' (pontos [x, y]), o mesmo plano de `extrusao` com o mesmo eixo.
 * campos:
 *   chapa: { passos, origem, emitir?, parametros?, pontos? } os passos que constroem SÓ a chapa e a origem `{ op, id }` dela. Com `passos`
 *     o ajudante executa a chapa uma vez, em tempo de autoria, para ler a normal de cada ponto das linhas, achar as sementes e conferir o
 *     corte; `emitir: false` não os devolve (a receita já os tem). Sem `passos` (só `origem`), não há leitura: dê `normal` ou aceite o
 *     vão medido no plano da vista, e o aviso `semLeitura` diz isso. `parametros` e `pontos` são o PARAMS e o TOPO que os passos citam.
 *   vao: a largura do vão ao longo da chapa, em mm. A lâmina é estreitada onde a chapa é inclinada em relação à vista, pela normal local.
 *   linhas: [{ nome?, eixo, pontos, fechada?, alcance?, lado?, dentro?, alem? }] o meio do vão. `alcance: [min, max]` limita a lâmina ao
 *     intervalo do eixo da vista, para a linha de um lado do carro não cortar o outro; `lado` ('+' ou '-') é de onde se lê a chapa
 *     (padrão: o lado do alcance); `fechada` fecha a volta, e o pedaço de dentro é um painel próprio, ou some com `dentro: 'descarta'`
 *     (a janela, a tampa de combustível); `alem` alonga as duas pontas da linha aberta, em mm (padrão 0: a ponta passa da borda da chapa
 *     ou para no meio de outra linha, e quem desenha a põe lá).
 *   paineis: [{ nome, eixo, ponto: [a, b], lado? }] o painel é o pedaço que contém o ponto visto daquela vista (o primeiro que o raio
 *     vindo do `lado` toca; padrão '+'). Nomes e pontos são distintos.
 *   origemId: o primeiro `origemId` livre (padrão: o maior dos passos da chapa mais um); o ajudante usa de `origemId` em diante.
 *   normal: (ponto3d, eixo) => [nx, ny, nz] troca a leitura da chapa. amostragem: passo, em mm, da leitura da normal ao longo da linha
 *     (padrão 40). areaMinima: área, em mm², abaixo da qual um pedaço é lasca e entra em `avisos` (padrão 100).
 *     sementesPerdidas: 'recusa' (padrão) ou 'avisa' para a semente que cai fora da chapa ou num vão.
 * devolve: { passos, partes, origemDoCorte, proximoId, medidas, avisos }, com `medidas` { vaoPedido, inclinacaoMaxima (graus de inclinação da
 *   chapa em relação à lâmina, que é acos(f) abaixo; 38 numa chapa a 38 graus da vista), fatorMinimo (a razão entre a lâmina e o vão), paineis, paineisAchados, sementesSemPainel,
 *   pedacosSemNome, pedacos, execucoes }; os avisos são { ref, texto }.
 * exemplo:
 *   paineisPorVaos({ chapa: { passos: casca, origem: { op: 'subtrair', id: 4 } }, vao: 4,
 *     linhas: [{ eixo: 'y', pontos: [[-900, 690], [900, 690]] }, { eixo: 'x', pontos: [[690, 1100], [690, 300]], alcance: [600, 1100] }],
 *     paineis: [{ nome: 'capo', eixo: 'y', ponto: [0, 1200] }, { nome: 'cabine', eixo: 'y', ponto: [0, 0] }] })
 * peça: procedural/pecas/sedan-chassi-e-lataria/ (o rascunho que a pediu; o teste prova a chapa plana a 38 graus e a de subdivisão).
 * FIM DA FICHA
 *
 * A LÂMINA. Cada linha vira um prisma da largura do vão, extrudado ao longo do eixo da vista, e todos entram juntos no `subtrair` da chapa: a
 * parede do corte é paralela ao eixo da vista, e com chapa de 1 mm a direção dela não pesa. A linha fechada com pedaço de dentro vira um
 * anel (o prisma de fora menos o de dentro); com `dentro: 'descarta'`, o prisma inteiro. Os cantos da linha são em esquadria.
 *
 * O VÃO AO LONGO DA CHAPA. A lâmina mede `w` no plano da vista, e a chapa de normal `n` mostra um vão de `w / f`, onde `f = sqrt(1 - (n . m)^2)`
 * e `m` é a perpendicular da linha no plano da vista (numa chapa a 38 graus da vista, cortada por uma linha paralela à aresta de
 * inclinação, `f = cos 38`, e o vão do plano cresce a 5,08 mm para um pedido de 4). O ajudante pede `w = vao * f` em cada ponto da linha:
 * lê a normal da chapa executada pelo raio da vista, amostra a linha a cada `amostragem` mm e funde os pontos que a reta já dá. Onde a
 * chapa fica a mais de 80 graus da vista (f abaixo de 0,17), a linha é recusada: escolha a vista de frente dela.
 *
 * O QUE ELE CONFERE, antes de entregar os passos, com a chapa executada uma vez a mais e o corte executado uma vez: a linha que não encontra a chapa,
 * a semente que cai fora dela ou num vão (o raio vê a chapa de antes e a de depois do corte e precisa da mesma distância), duas sementes no
 * mesmo pedaço, o corte que não separou nada e o `subtrair` que o núcleo recusa. Pedaço sem nome e lasca saem em `avisos`.
 * Os pedaços nomeados saem pelo critério `onde.conexo` de `sel`, que o núcleo resolve na execução; o ajudante só escreve os passos.
 * A semente não pode cair numa abertura que a chapa já tem: o raio passaria por ela e nomearia o pedaço do outro lado. */
import { nucleo } from './entrada.js';
import { normalDaFace } from './nucleo.js';
import { pedacosConexos, prepararRaios } from './selecao-geometrica.js';

const erro = (texto) => { throw new Error(`paineisPorVaos: ${texto}`); };
const br = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');
const r3 = (v) => Math.round(v * 1000) / 1000;

const INDICE = { x: [2, 1], y: [0, 2], z: [0, 1] };
const EIXO = { x: 0, y: 1, z: 2 };
const FATOR_MINIMO = 0.17;
const FOLGA_DA_SEMENTE = 0.01;
const FOLGA_DO_ALCANCE = 1e-3;
const GRAUS = 180 / Math.PI;

const area2d = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const anti = (l) => (area2d(l) < 0 ? [...l].reverse() : l);
const ponto3 = (eixo, a, b, c) => { const p = [0, 0, 0]; p[INDICE[eixo][0]] = a; p[INDICE[eixo][1]] = b; p[EIXO[eixo]] = c; return p; };

/** O prisma de um polígono na vista: o mesmo plano e a mesma ordem de `extrusao` que a receita do sedã usa. */
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

/**
 * Chapa partida em painéis por linhas de vão desenhadas em vistas ortogonais.
 * @param {{ chapa: { passos?: any[], origem: { op: string, id: number }, emitir?: boolean, parametros?: object, pontos?: object }, vao: number,
 *   linhas: any[], paineis: any[], origemId?: number, normal?: Function, amostragem?: number, areaMinima?: number, sementesPerdidas?: 'recusa' | 'avisa' }} o
 */
export function paineisPorVaos(o) {
  if (o == null || typeof o !== 'object') erro('espera { chapa, vao, linhas, paineis }');
  const { chapa } = o;
  if (!chapa || typeof chapa !== 'object' || !chapa.origem || typeof chapa.origem.op !== 'string' || !Number.isSafeInteger(chapa.origem.id)) {
    erro('chapa precisa ser { passos, origem: { op, id } }: a origem da chapa que os passos constroem');
  }
  if (!(o.vao > 0) || !Number.isFinite(o.vao)) erro(`vao precisa ser maior que zero, em mm (recebido ${o.vao})`);
  if (!Array.isArray(o.linhas) || !o.linhas.length) erro('linhas precisa ter ao menos uma linha de vão');
  if (!Array.isArray(o.paineis) || !o.paineis.length) erro('paineis precisa ter ao menos um painel { nome, eixo, ponto }');
  const amostragem = o.amostragem ?? 40;
  if (!(amostragem > 0)) erro('amostragem precisa ser maior que zero, em mm');
  const areaMinima = o.areaMinima ?? 100;
  const sementesPerdidas = o.sementesPerdidas ?? 'recusa';
  if (sementesPerdidas !== 'recusa' && sementesPerdidas !== 'avisa') erro("sementesPerdidas é 'recusa' ou 'avisa'");
  const passosDaChapa = chapa.passos ?? null;
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
    const st = nucleo(marca, parametros, topo);
    if (st.orfaos.length) erro(`os passos da chapa foram recusados pelo núcleo: ${st.orfaos.slice(0, 3).map((x) => x.motivo).join('; ')}`);
    const daChapa = [...st.F.values()].filter((f) => f.parte === '__chapa__').map((f) => f.id);
    if (!daChapa.length) erro(`a origem ${chapa.origem.op}:${chapa.origem.id} não tem face nenhuma depois dos passos da chapa`);
    if (daChapa.length !== st.F.size) erro(`os passos da chapa deixam ${st.F.size - daChapa.length} face(s) fora da origem ${chapa.origem.op}:${chapa.origem.id}; passe só os passos que constroem a chapa`);
    const todos = [...st.V.values()];
    const caixa = [0, 1, 2].map((e) => [Math.min(...todos.map((p) => p[e])), Math.max(...todos.map((p) => p[e]))]);
    leitura = { st, raios: prepararRaios(st.V, st.F, daChapa), caixa, passos: passosDaChapa.length };
  } else if (!o.normal) {
    aviso('semLeitura', 'a chapa veio sem passos: o ajudante não leu a normal nem conferiu o corte, e o vão sai medido no plano da vista (dê chapa.passos ou normal para compensar a inclinação)');
  }

  let proximo = o.origemId ?? (passosDaChapa ? maiorOrigem(passosDaChapa) + 1 : null);
  if (proximo == null) erro('sem os passos da chapa, dê origemId: o primeiro origemId livre');
  if (!Number.isSafeInteger(proximo) || proximo < 1) erro('origemId precisa ser um inteiro positivo');
  const primeiroId = proximo;

  /* a normal da chapa no ponto da vista, ou null onde a chapa não tem face */
  const normalEm = (eixo, a, b, alcance, lado) => {
    if (o.normal) {
      const n = o.normal(ponto3(eixo, a, b, alcance ? (alcance[0] + alcance[1]) / 2 : 0), eixo);
      return Array.isArray(n) && n.length === 3 && n.every(Number.isFinite) && Math.hypot(...n) > 0 ? n.map((x) => x / Math.hypot(...n)) : null;
    }
    if (!leitura) return null;
    const e = EIXO[eixo];
    const [lo, hi] = leitura.caixa[e];
    const dir = [0, 0, 0]; dir[e] = lado === '-' ? 1 : -1;
    const de = ponto3(eixo, a, b, lado === '-' ? lo - 1 : hi + 1);
    const acertos = alcance ? leitura.raios.todos(de, dir).filter((h) => { const c = de[e] + dir[e] * h.t; return c >= alcance[0] - FOLGA_DO_ALCANCE && c <= alcance[1] + FOLGA_DO_ALCANCE; }) : leitura.raios.todos(de, dir).slice(0, 1);
    if (!acertos.length) return null;
    return normalDaFace(leitura.st.V, leitura.st.F.get(acertos[0].face).vs);
  };

  /* ---- as lâminas ---- */
  const passosDeCorte = [];
  let inclinacaoMaxima = 0;
  let fatorMinimo = 1;
  /* as ferramentas do `subtrair`: a extrusão de cada linha aberta ou descartada, e o anel de cada linha fechada */
  const ferramentas = [];
  for (let li = 0; li < o.linhas.length; li += 1) {
    const l = o.linhas[li];
    const nome = l.nome ?? `linha${li}`;
    const eixo = l.eixo;
    const e = EIXO[eixo];
    const alcance = l.alcance ?? (leitura ? [leitura.caixa[e][0] - 1, leitura.caixa[e][1] + 1] : null);
    if (!alcance) erro(`a linha '${nome}' precisa de alcance: sem os passos da chapa o ajudante não sabe até onde a lâmina vai no eixo ${eixo}`);
    const lado = l.lado ?? (l.alcance && leitura ? ((l.alcance[0] + l.alcance[1]) / 2 >= (leitura.caixa[e][0] + leitura.caixa[e][1]) / 2 ? '+' : '-') : '+');
    const P = pontosDaLinha(l.pontos, !!l.fechada, l.alem ?? 0);
    const n = P.length;
    const nSeg = l.fechada ? n : n - 1;

    /* os pontos amostrados de cada trecho: { p, k (o trecho), h (a meia lâmina) } */
    const trechos = [];
    let sem = 0; let total = 0;
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
        const nm = normalEm(eixo, q[0], q[1], alcance, lado);
        let f = 1;
        if (nm) {
          const m3 = ponto3(eixo, m[0], m[1], 0);
          const nm_m = nm[0] * m3[0] + nm[1] * m3[1] + nm[2] * m3[2];
          f = Math.sqrt(Math.max(0, 1 - nm_m * nm_m));
          const tilt = Math.acos(Math.min(1, f)) * GRAUS;
          inclinacaoMaxima = Math.max(inclinacaoMaxima, tilt);
          if (f < FATOR_MINIMO) erro(`a chapa fica inclinada ${br(tilt)} graus em relação à lâmina no ponto [${br(q[0])}, ${br(q[1])}] da linha '${nome}' (vista ${eixo}): a lâmina precisaria de ${br(f * o.vao)} mm de largura no plano para dar ${br(o.vao)} mm ao longo da chapa; desenhe essa linha na vista em que a chapa aparece de frente`);
          fatorMinimo = Math.min(fatorMinimo, f);
        } else sem += 1;
        amostras.push({ q, h: (o.vao * f) / 2, achou: !!nm });
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
    if (sem > 0) aviso('linhaForaDaChapa', `${sem} dos ${total} pontos da linha '${nome}' não têm chapa na vista ${eixo} (a linha sai pela borda ou passa por uma abertura); neles a lâmina vale o vão inteiro`);

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
      passosDeCorte.push(prismaDe(eixo, [...esq, ...[...dir].reverse()], alcance[0], alcance[1], proximo)); ferramentas.push({ op: 'extrusao', id: proximo }); proximo += 1;
    }
  }
  const idDoCorte = proximo; proximo += 1;
  const corte = ['subtrair', { origemId: idDoCorte, solidos: [{ origem: chapa.origem }, ...ferramentas.map((origem) => ({ origem }))] }];
  const origemDoCorte = { op: 'subtrair', id: idDoCorte };

  /* ---- as sementes: de onde o raio sai, e para onde vai ---- */
  const semente = (p) => {
    const e = EIXO[p.eixo];
    const lado = p.lado ?? '+';
    const caixa = leitura ? leitura.caixa[e] : [-1e4, 1e4];
    const de = ponto3(p.eixo, p.ponto[0], p.ponto[1], lado === '-' ? Math.floor(caixa[0]) - 10 : Math.ceil(caixa[1]) + 10);
    const dir = [0, 0, 0]; dir[e] = lado === '-' ? 1 : -1;
    return { de, dir };
  };
  const partes = o.paineis.map((p) => ({ nome: p.nome, ...semente(p) }));
  const passosDasPartes = partes.map((p) => ['parte', { nome: p.nome, sel: { origem: origemDoCorte, onde: { conexo: { de: p.de, dir: p.dir } } } }]);
  const passos = [...(chapa.emitir === false ? [] : (passosDaChapa ?? [])), ...passosDeCorte, corte, ...passosDasPartes];

  /* ---- o corte executado uma vez, e a conferência ---- */
  const medidas = {
    vaoPedido: o.vao, inclinacaoMaxima: r3(inclinacaoMaxima), fatorMinimo: r3(fatorMinimo), paineis: [], paineisAchados: 0,
    sementesSemPainel: [], pedacosSemNome: [], pedacos: 0, execucoes: leitura ? 2 : 0,
  };
  const saida = { passos, partes: partes.map((p) => ({ nome: p.nome, origem: origemDoCorte, de: p.de, dir: p.dir })), origemDoCorte, proximoId: proximo, primeiroId, medidas, avisos };
  if (!leitura) return saida;

  const executado = nucleo([...passosDaChapa, ...passosDeCorte, corte], parametros, topo);
  if (executado.orfaos.length) {
    erro(`o corte foi recusado pelo núcleo: ${executado.orfaos.slice(0, 3).map((x) => x.motivo).join('; ')}. Confira se alguma linha deixa a chapa sem pedaço, se o polígono da lâmina se cruza (pontos muito juntos num canto fechado) e se a chapa é um sólido fechado`);
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
  if (grupos.length <= pedacosDaChapa && !o.linhas.some((l) => l.dentro === 'descarta')) {
    aviso('semSeparacao', `o corte deixou ${grupos.length} pedaço(s), os mesmos que a chapa tinha: nenhuma linha a separou; confira se alguma vai de borda a borda (ou fecha uma volta) no alcance dado`);
  }
  const raiosDepois = prepararRaios(executado.V, executado.F, ids);
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
    if (dono.has(g)) erro(`os painéis '${dono.get(g)}' e '${p.nome}' caem no mesmo pedaço (a semente de '${p.nome}' é ${descricao}); mova uma das sementes para o pedaço dela, ou confira a linha que devia separá-los`);
    dono.set(g, p.nome);
  });
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
  return saida;
}
