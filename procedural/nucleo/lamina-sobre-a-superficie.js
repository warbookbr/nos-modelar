/* lamina-sobre-a-superficie.js — a lâmina de vão varrida sobre a superfície de uma chapa, com a seção perpendicular a ela
 *
 * Função pura, sem domínio. A linha de vão é desenhada numa vista ortogonal; aqui cada ponto dela é projetado na chapa pelo raio da vista
 * (a primeira camada tocada, dentro do alcance), e a lâmina é o sólido varrido ao longo dessa curva 3D: a seção é um retângulo de largura
 * `largura` medida no plano tangente e perpendicular à curva, com as paredes na direção da normal da chapa, de modo que o vão da pele e a
 * folga entre as paredes são a mesma medida, qualquer que seja a inclinação da chapa em relação à vista. O sólido sai como um passo
 * `subdivisao` de `niveis: 0` (vértices e triângulos), que o `subtrair` do núcleo aceita como qualquer sólido fechado.
 *
 * AS ESTAÇÕES. A linha é amostrada a cada `amostragem` mm; entre duas estações cuja normal gira mais de 8 graus o trecho é bipartido até a
 * normal girar menos que isso (ou o trecho medir menos que um décimo da largura), e a dobra viva que sobra (giro maior que 8 graus entre duas
 * estações coladas) parte a lâmina em duas, uma varrida sobre cada face, que se encontram na quina e cobrem juntas a espessura sob ela. Os cantos da
 * linha são em esquadria, pelo vetor lateral de cada trecho. Onde o raio não toca a chapa (a linha sai pela borda, ou passa por uma
 * abertura) a estação usa o plano da estação válida mais próxima, tocado pelo mesmo raio da vista: a lâmina segue a chapa além da borda,
 * sem alargar. O raio rasante (a normal a mais de 80 graus do eixo da vista) é recusado.
 *
 * A PROFUNDIDADE. Acima da pele, um quarto do vão; abaixo, a espessura lida (o próximo toque do raio ao longo da normal, no máximo cinco vezes
 * o vão) mais meio vão, ou `profundidade` (mm abaixo da pele) quando dada, ou dois vãos quando não há espessura para ler. A lâmina corta só a camada
 * lida, e não as outras do raio. */

const GRAUS = 180 / Math.PI;
const GIRO_LISO = 8;
const RASANTE = 0.17;

const erro = (texto) => { throw new Error(`paineisPorVaos: ${texto}`); };
const br = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const L = norma(a); return L > 0 ? mul(a, 1 / L) : null; };
const giro = (n1, n2) => Math.acos(Math.max(-1, Math.min(1, dot(n1, n2)))) * GRAUS;

/**
 * Projeta a polilinha 2D da vista na chapa.
 * @param {{ ler: (a: number, b: number) => ({ c: number[], n: number[], esp: number | null } | null), plano: (a: number, b: number, v: any) => number[] | null,
 *   pontos: number[][], fechada: boolean, amostragem: number, largura: number, eixoIdx: number, indices: number[], nome: string }} o
 * @returns {{ segmentos: { c: number[], n: number[], esp: number | null }[][], fechadaInteira: boolean, quinas: number, inclinacaoMaxima: number, semChapa: number }}
 */
export function projetarLinha(o) {
  const { ler, plano, pontos, fechada, amostragem, largura, eixoIdx, nome } = o;
  const [ia, ib] = o.indices;
  const perp3 = (u, v) => { const r = [0, 0, 0]; r[ia] = u; r[ib] = v; return r; };
  const n = pontos.length;
  const nSeg = fechada ? n : n - 1;
  /* a lista densa de pontos 2D, com a marca dos que são vértices da linha */
  const densos = [];
  /* o perpendicular da linha no plano da vista, de cada trecho, como vetor 3D: a direção lateral da lâmina, antes de ir ao plano tangente */
  const perpendicular = (A, B) => {
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (!(L > 0)) erro(`a linha '${nome}' tem dois pontos iguais em [${br(A[0])}, ${br(A[1])}]`);
    return perp3(-(B[1] - A[1]) / L, (B[0] - A[0]) / L);
  };
  for (let k = 0; k < nSeg; k += 1) {
    const A = pontos[k]; const B = pontos[(k + 1) % n];
    const m = perpendicular(A, B);
    const M = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / amostragem));
    for (let j = 0; j < M; j += 1) densos.push({ q: [A[0] + (B[0] - A[0]) * (j / M), A[1] + (B[1] - A[1]) * (j / M)], mOut: m, mIn: j === 0 ? null : m });
  }
  if (!fechada) densos.push({ q: [...pontos[n - 1]], mOut: densos[densos.length - 1].mOut, mIn: densos[densos.length - 1].mOut });
  /* a marca de entrada do vértice da linha é a saída do trecho anterior */
  densos.forEach((d, i) => { if (!d.mIn) d.mIn = (densos[(i + densos.length - 1) % densos.length]).mOut; });
  const lidos = densos.map((d) => ({ q: d.q, mIn: d.mIn, mOut: d.mOut, v: ler(d.q[0], d.q[1]) }));
  if (lidos.every((s) => !s.v)) return { segmentos: [], fechadaInteira: false, quinas: 0, inclinacaoMaxima: 0, semChapa: lidos.length };
  let semChapa = 0;
  /* a estação sem chapa herda o plano da válida mais próxima, no mesmo raio da vista */
  const proximaValida = (i) => {
    for (let d = 1; d < lidos.length; d += 1) {
      for (const j of [i - d, i + d]) {
        const jj = fechada ? ((j % lidos.length) + lidos.length) % lidos.length : j;
        if (jj >= 0 && jj < lidos.length && lidos[jj].v) return lidos[jj].v;
      }
    }
    return null;
  };
  const cheias = lidos.map((s, i) => {
    if (s.v) return { q: s.q, ...s.v, real: true, mIn: s.mIn, mOut: s.mOut };
    semChapa += 1;
    const v = proximaValida(i);
    const c = plano(s.q[0], s.q[1], v);
    if (!c) erro(`a linha '${nome}' sai da chapa num ponto em que a chapa mais próxima é rasante à vista (raio rasante): desenhe essa linha na vista em que a chapa aparece de frente`);
    return { q: s.q, c, n: v.n, esp: v.esp, real: false, mIn: s.mIn, mOut: s.mOut };
  });
  /* a bipartição entre duas estações reais de normal muito diferente */
  const refinar = (A, B, prof) => {
    if (!A.real || !B.real || giro(A.n, B.n) <= GIRO_LISO || prof >= 10) return [];
    if (Math.hypot(A.q[0] - B.q[0], A.q[1] - B.q[1]) <= 0.1 * largura) return [];
    const q = [(A.q[0] + B.q[0]) / 2, (A.q[1] + B.q[1]) / 2];
    const v = ler(q[0], q[1]);
    if (!v) return [];
    const M = { q, ...v, real: true, mIn: A.mOut, mOut: A.mOut };
    return [...refinar(A, M, prof + 1), M, ...refinar(M, B, prof + 1)];
  };
  const todas = [];
  for (let i = 0; i < cheias.length; i += 1) {
    todas.push(cheias[i]);
    const prox = fechada ? cheias[(i + 1) % cheias.length] : cheias[i + 1];
    if (prox) todas.push(...refinar(cheias[i], prox, 0));
  }
  /* a dobra viva que sobrou entre duas estações coladas ganha uma seção do meio: o ponto médio, de normal a bissetriz e profundidade alongada por 1 / cos do meio giro.
     É uma lâmina só, sem duas varreduras que dividam parede: a seção do meio cobre sob a quina a espessura das duas faces, côncava ou convexa */
  let inclinacaoMaxima = 0;
  let quinas = 0;
  const lista = [];
  todas.forEach((s, i) => {
    const cos = Math.abs(dot(s.n, [0, 1, 2].map((e) => (e === eixoIdx ? 1 : 0))));
    if (cos < RASANTE) {
      erro(`a chapa fica a ${br(Math.acos(Math.min(1, cos)) * GRAUS)} graus da vista no ponto [${br(s.q[0])}, ${br(s.q[1])}] da linha '${nome}' (raio rasante): desenhe essa linha na vista em que a chapa aparece de frente`);
    }
    inclinacaoMaxima = Math.max(inclinacaoMaxima, Math.acos(Math.min(1, cos)) * GRAUS);
    lista.push({ c: s.c, n: s.n, esp: s.esp, mIn: s.mIn, mOut: s.mOut });
    const prox = fechada ? todas[(i + 1) % todas.length] : todas[i + 1];
    if (prox && s.real && prox.real) {
      const g = giro(s.n, prox.n);
      if (g > GIRO_LISO) {
        if (g > 150) erro(`a chapa dobra ${br(g)} graus sobre a linha '${nome}': a dobra é mais fechada que a largura da lâmina e a lâmina não a atravessa; divida a linha dos dois lados da dobra`);
        quinas += 1;
        const meio = unit(soma(s.n, prox.n));
        lista.push({ c: mul(soma(s.c, prox.c), 0.5), n: meio, esp: Math.max(s.esp ?? 0, prox.esp ?? 0) || null, ds: Math.min(3, 1 / Math.max(dot(meio, s.n), 1e-6)), mIn: s.mOut, mOut: s.mOut });
      }
    }
  });
  /* a espessura lida na própria quina corre ao longo da outra face: vale no máximo três vezes a menor lida na linha */
  const lidas = lista.map((s) => s.esp).filter((x) => x != null);
  if (lidas.length) { const teto = 3 * Math.min(...lidas); for (const s of lista) s.esp = s.esp == null ? null : Math.min(s.esp, teto); }
  const segmentos = [lista];
  return { segmentos, fechadaInteira: fechada, quinas, inclinacaoMaxima, semChapa };
}

/** O vetor lateral de cada estação: o perpendicular da linha no plano da vista, levado ao plano tangente da chapa, com a esquadria nos cantos. */
function lateraisDe(est) {
  const lado = (m, n) => unit(sub(m, mul(n, dot(m, n))));
  return est.map((s) => {
    const sIn = lado(s.mIn, s.n); const sOut = lado(s.mOut, s.n);
    if (!sIn || !sOut) return null;
    const sm = unit(soma(sIn, sOut));
    if (!sm) return null;
    const k = 1 / Math.max(Math.min(dot(sm, sIn), dot(sm, sOut)), 0.25);
    return { sm, k };
  });
}

/** Alonga a ponta de uma linha aberta de `ext` mm na direção do último trecho, no plano tangente. */
export function alongar(estacoes, fim, ext) {
  const N = estacoes.length;
  const a = fim ? estacoes[N - 1] : estacoes[0];
  const b = fim ? estacoes[N - 2] : estacoes[1];
  let e = unit(sub(a.c, b.c));
  if (!e) return;
  e = unit(sub(e, mul(a.n, dot(e, a.n)))) ?? e;
  const nova = { c: soma(a.c, mul(e, ext)), n: a.n, esp: a.esp, mIn: fim ? a.mOut : a.mIn, mOut: fim ? a.mOut : a.mIn };
  if (fim) estacoes.push(nova); else estacoes.unshift(nova);
}

/**
 * O sólido da lâmina: vértices e triângulos de um passo `subdivisao` de niveis 0.
 * @returns {{ vertices: number[][], faces: number[][], pontosDeDentro: number[][] | null }}
 */
export function varrer({ estacoes, fechada, largura, profundidade, descarta, nome }) {
  const est = estacoes.filter((s, i) => i === 0 || norma(sub(s.c, estacoes[i - 1].c)) > 1e-6);
  if (fechada && est.length > 1 && norma(sub(est[0].c, est[est.length - 1].c)) <= 1e-6) est.pop();
  if (est.length < 2) erro(`a linha '${nome}' ficou com menos de duas estações sobre a chapa`);
  const lat = lateraisDe(est);
  if (lat.some((l) => !l)) erro(`a linha '${nome}' volta sobre si mesma sobre a chapa (um trecho some contra o vizinho); afaste os pontos`);
  const h = largura / 2;
  const topo = 0.25 * largura;
  const fundoDe = (s) => (profundidade != null ? profundidade : s.esp != null ? s.esp + 0.5 * largura : 2 * largura);
  const vertices = [];
  const faces = [];
  const N = est.length;
  let dentro = null;
  if (descarta) {
    /* o furo: o prisma da borda de fora; o lado de fora é o de maior área vista de cima da normal média */
    const lado = (sinal) => est.map((s, i) => soma(s.c, mul(lat[i].sm, sinal * h * lat[i].k)));
    const area = (pts) => { let t = [0, 0, 0]; pts.forEach((p, i) => { t = soma(t, cruz(p, pts[(i + 1) % pts.length])); }); return Math.abs(dot(t, est[0].n)); };
    const L = lado(1); const R = lado(-1);
    const sinal = area(L) >= area(R) ? 1 : -1;
    dentro = sinal === 1 ? R : L;
    const borda = sinal === 1 ? L : R;
    borda.forEach((p, i) => { const s = est[i]; const u = unit(sub(s.n, mul(lat[i].sm, dot(s.n, lat[i].sm)))) ?? s.n; vertices.push(soma(p, mul(u, topo)), sub(p, mul(u, fundoDe(s)))); });
    for (let i = 0; i < N; i += 1) {
      const j = (i + 1) % N;
      faces.push([2 * i, 2 * j, 2 * j + 1], [2 * i, 2 * j + 1, 2 * i + 1]);
    }
    const capa = (k) => Array.from({ length: N }, (_, i) => 2 * i + k);
    faces.push(capa(0).reverse(), capa(1));
  } else {
    est.forEach((s, i) => {
      const { sm, k } = lat[i];
      const off = mul(sm, h * k);
      /* a direção da profundidade é a normal tirada da componente lateral: as paredes ficam planas e normais ao lado, e a folga entre elas é a largura */
      const u = unit(sub(s.n, mul(sm, dot(s.n, sm)))) ?? s.n;
      const cima = mul(u, topo * (s.ds ?? 1)); const baixo = mul(u, fundoDe(s) * (s.ds ?? 1));
      vertices.push(soma(soma(s.c, off), cima), sub(soma(s.c, cima), off), sub(sub(s.c, baixo), off), sub(soma(s.c, off), baixo));
    });
    const lim = fechada ? N : N - 1;
    for (let i = 0; i < lim; i += 1) {
      const j = (i + 1) % N;
      for (let a = 0; a < 4; a += 1) {
        const b = (a + 1) % 4;
        faces.push([4 * i + a, 4 * i + b, 4 * j + b], [4 * i + a, 4 * j + b, 4 * j + a]);
      }
    }
    if (!fechada) faces.push([3, 2, 1, 0], [4 * (N - 1), 4 * (N - 1) + 1, 4 * (N - 1) + 2, 4 * (N - 1) + 3]);
    if (fechada) dentro = est.map((s, i) => sub(s.c, mul(lat[i].sm, h * lat[i].k)));
  }
  /* de fora: o volume com sinal manda no sentido das faces */
  let volume = 0;
  for (const f of faces) for (let k = 1; k + 1 < f.length; k += 1) volume += dot(vertices[f[0]], cruz(vertices[f[k]], vertices[f[k + 1]])) / 6;
  const saida = volume < 0 ? faces.map((f) => [...f].reverse()) : faces;
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  return { vertices: vertices.map((p) => p.map(r4)), faces: saida, dentro, estacoes: est };
}

/** A volta fechada cujo contorno de dentro, deslocado meia largura, inverte algum trecho (a volta é menor que o vão): a lâmina o deixaria como ilha. */
export function voltaMenorQueOVao(estacoes, largura) {
  const lat = lateraisDe(estacoes);
  if (lat.some((l) => !l)) return true;
  const N = estacoes.length;
  const h = largura / 2;
  const area = (pts) => { let t = [0, 0, 0]; pts.forEach((p, i) => { t = soma(t, cruz(p, pts[(i + 1) % pts.length])); }); return Math.abs(dot(t, estacoes[0].n)); };
  const lado = (sinal) => estacoes.map((s, i) => soma(s.c, mul(lat[i].sm, sinal * h * lat[i].k)));
  const A = lado(1); const B = lado(-1);
  const dentro = area(A) <= area(B) ? A : B;
  for (let i = 0; i < N; i += 1) {
    const j = (i + 1) % N;
    if (dot(sub(estacoes[j].c, estacoes[i].c), sub(dentro[j], dentro[i])) < 0) return true;
  }
  return false;
}
