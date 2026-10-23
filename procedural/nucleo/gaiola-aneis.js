/* gaiola-aneis.js — anéis de gaiola em volta de um vão, opção da gaiola por estações
 *
 * Função pura, sem Three.js e sem domínio. `gaiolaPorEstacoes` chama `lerAneis` e `construirAneis` quando a definição
 * declara `aneis`; sem a opção nada aqui roda e a saída do ajudante é a de antes, byte a byte.
 *
 *   aneis: [{ nome, vao, recuo: mm, voltas: n, largura: mm | larguras: [mm, ...], raio?: mm, relevo?: [mm, ...],
 *             segmentos?: n, cantoGraus?: graus }]
 *
 * O anel preenche um vão da grade por dentro. O vão que a receita declara em `vaos` é o limite de fora: as faces da grade
 * ficam como estão, e a abertura de verdade, a borda livre da chapa, fica `recuo` mm para dentro da borda do vão. A volta 1
 * é essa borda, e as voltas 2, 3... se afastam dela, em direção à grade, a `largura` mm uma da outra (`larguras` dá as
 * K - 1 larguras de uma volta à seguinte quando elas diferem). São esses laços de arestas apertados que recebem o vinco, o
 * relevo e a cota da moldura, da calha ou do lábio. Entre a última volta e a borda do vão o anel acrescenta laços de
 * transição, `${nome}_c${j}_…`, cada um até duas vezes mais largo que o anterior e o último dentro de 2,5 vezes a aresta
 * da grade que sai da borda do vão: a face de 10 mm ao lado de uma de 100 mm dobra a superfície quando a subdivisão leva os
 * vértices ao limite, e o dobro de uma faixa à seguinte é o que ela aguenta. O recuo precisa deixar essa folga, e o anel grita
 * com o intervalo que ela pede quando não deixa.
 *
 * Com `raio`, os cantos da abertura saem arredondados. Um canto é o vértice da borda do vão em que ela vira para dentro do
 * vão em `cantoGraus` ou mais (padrão 30); abaixo disso o vértice só recua pela bissetriz. As voltas se afastam da abertura
 * como curvas paralelas, de modo que o raio do canto cresce com o afastamento (raio + afastamento) e a largura de cada volta
 * se mantém nos cantos, e os laços de transição estreitam o raio até o canto vivo da borda do vão. O arco de cada canto tem
 * `segmentos` segmentos por quarto de volta (par, padrão 4), com os pontos sobre o arco; a poligonal da gaiola se afasta do
 * arco até raio × (1 − cos(45° / segmentos)), e a superfície limite passa pelos pontos do anel que forem medidas.
 *
 * A POSIÇÃO. A chapa dentro do vão não existe na grade, e um recuo no plano tangente sairia dela por d²/(2R), 0,75 mm a
 * 30 mm numa chapa de raio 600 mm. Os pontos do anel se calculam, então, num plano de referência (a normal média das faces
 * que tocam a borda): o recuo e os arcos se desenham no plano, e a altura de cada ponto sai de um ajuste polinomial por
 * mínimos quadrados (grau 3, 2 ou 1 conforme o número de pontos) aos da borda e da fileira da grade em volta dela, mais o
 * resíduo de cada um interpolado por 1/d², de modo que o ajuste passa pelos pontos da grade. As distâncias declaradas são
 * medidas sobre a chapa: o passo no plano é o que integra a inclinação do ajuste ao longo do caminho até o comprimento
 * pedido, a partir do pé do ponto na borda, e o arco de cada canto usa a inclinação do meio dele. O relevo desloca o ponto
 * pela normal local dessa superfície, no sentido da normal das faces.
 *
 * Entre duas esquinas da borda, os pontos do lado se distribuem pela mesma fração do comprimento do lado recuado, porque o
 * recuo da esquina anda ao longo do lado e passaria por cima dos pontos vizinhos. O raio do canto mais o recuo da esquina
 * precisam caber entre a esquina e o primeiro ponto do lado, e o anel grita com os dois pontos quando não cabem.
 *
 * A COSTURA. O laço de fora tem os mesmos pontos da borda do vão, um a um, e mais os do arco de cada canto, e os dois se
 * ligam por uma faixa só de quadriláteros, pelo alinhamento de menor distância entre eles (programação dinâmica): a face
 * tem dois pontos de cada laço, ou três de um e um do outro, e esta última é o que acrescenta ou tira um par de pontos.
 * Daí os vértices extraordinários: valência 5 nos pontos da borda do vão que ganham uma aresta, e 3 nos pontos do arco que
 * a recebem, três e dois por canto com o padrão de quatro segmentos. `aneis` devolve todos declarados pelo nome. Os laços
 * seguintes têm os mesmos pontos do primeiro e se ligam a ele um a um.
 *
 * O vão que se abre na borda da chapa (o arco da roda) dá um caminho aberto: os laços começam e acabam sobre a borda livre
 * da chapa, no prolongamento dela pela parábola que passa pela ponta da borda do vão e pelos dois pontos livres de antes.
 *
 * Os pontos se chamam `${nome}_a${volta}_${ponto da borda}`, e os do arco de um canto `…_arco${j}`, de modo que nenhum nome
 * depende de índice de gaiola. Mesma definição, mesma saída, byte a byte. */

const MM = 1000;
const MARGEM = 1e-4;
const MAIOR_RAZAO = 2.5;
const citar = (n) => `'${n}'`;
const lista = (nomes) => nomes.map(citar).join(', ');
function falha(texto) { throw new TypeError(`gaiola por estações: ${texto}`); }

function exigirCampos(objeto, permitidos, onde) {
  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) falha(`${onde} precisa ser objeto`);
  const extra = Object.keys(objeto).filter((k) => !permitidos.includes(k));
  if (extra.length) falha(`${onde} tem campo desconhecido ${lista(extra)}; os campos são ${permitidos.join(', ')}`);
}

export const PADROES_DOS_ANEIS = Object.freeze({ segmentos: 4, cantoGraus: 30 });

/** lerAneis(aneis, vaos) -> os anéis conferidos, com os padrões; `vaos` é a lista dos nomes de vão da gaiola. */
export function lerAneis(aneis, vaos) {
  if (aneis == null) return [];
  if (!Array.isArray(aneis)) falha('aneis precisa ser lista de { nome, vao, recuo, voltas, largura, raio?, relevo? }');
  const nomes = new Set(); const dosVaos = new Set();
  return aneis.map((a, n) => {
    exigirCampos(a, ['nome', 'vao', 'recuo', 'voltas', 'largura', 'larguras', 'raio', 'relevo', 'segmentos', 'cantoGraus'], `o anel ${n}`);
    if (typeof a.nome !== 'string' || !a.nome) falha(`o anel ${n} precisa de nome (texto não vazio)`);
    const nome = a.nome;
    if (nomes.has(nome)) falha(`o nome de anel ${citar(nome)} aparece mais de uma vez`);
    nomes.add(nome);
    if (typeof a.vao !== 'string' || !vaos.includes(a.vao)) falha(`o anel ${citar(nome)} cita o vão ${citar(a.vao)}, que não existe; os vãos declarados são ${vaos.length ? lista(vaos) : 'nenhum'}`);
    if (dosVaos.has(a.vao)) falha(`o vão ${citar(a.vao)} tem mais de um anel`);
    dosVaos.add(a.vao);
    const positivo = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0;
    if (!positivo(a.recuo)) falha(`o anel ${citar(nome)} precisa de recuo: quanto a abertura recua da borda do vão, em mm maior que zero`);
    let larguras;
    if (a.larguras != null) {
      if (a.largura != null) falha(`o anel ${citar(nome)} declara larguras e largura; declare larguras (uma entre cada par de voltas) ou largura com voltas`);
      if (!Array.isArray(a.larguras) || !a.larguras.every(positivo)) falha(`o anel ${citar(nome)} precisa de larguras: lista de larguras em mm maiores que zero, uma entre cada par de voltas seguidas`);
      if (a.voltas != null && a.voltas !== a.larguras.length + 1) falha(`o anel ${citar(nome)} declara ${a.voltas} voltas e ${a.larguras.length} larguras; são K - 1 larguras para K voltas`);
      larguras = [...a.larguras];
    } else {
      if (!Number.isInteger(a.voltas) || a.voltas < 1) falha(`o anel ${citar(nome)} precisa de voltas: inteiro de 1 em diante`);
      if (a.voltas > 1 && !positivo(a.largura)) falha(`o anel ${citar(nome)} precisa de largura em mm maior que zero, a distância entre voltas seguidas`);
      larguras = Array.from({ length: a.voltas - 1 }, () => a.largura);
    }
    const voltas = larguras.length + 1;
    const raio = a.raio ?? 0;
    if (typeof raio !== 'number' || !Number.isFinite(raio) || raio < 0) falha(`o anel ${citar(nome)} precisa de raio em mm de zero em diante`);
    const relevo = a.relevo ?? Array.from({ length: voltas }, () => 0);
    if (!Array.isArray(relevo) || relevo.length !== voltas || !relevo.every((x) => typeof x === 'number' && Number.isFinite(x))) falha(`o anel ${citar(nome)} precisa de relevo: lista de ${voltas} deslocamentos em mm pela normal, um por volta`);
    const segmentos = a.segmentos ?? PADROES_DOS_ANEIS.segmentos;
    if (!Number.isInteger(segmentos) || segmentos < 2 || segmentos % 2) falha(`o anel ${citar(nome)} precisa de segmentos: inteiro par de 2 em diante, os segmentos do arco de cada quarto de volta`);
    const cantoGraus = a.cantoGraus ?? PADROES_DOS_ANEIS.cantoGraus;
    if (typeof cantoGraus !== 'number' || !(cantoGraus > 0 && cantoGraus < 180)) falha(`o anel ${citar(nome)} precisa de cantoGraus entre 0 e 180`);
    const ate = larguras.reduce((s, x) => s + x, 0);
    if (!(a.recuo > ate)) falha(`o anel ${citar(nome)} recua ${a.recuo} mm da borda do vão e as ${voltas} voltas ocupam ${ate} mm da abertura; o recuo precisa passar disso, para sobrar a transição até a grade`);
    return { nome, vao: a.vao, recuo: a.recuo, voltas, larguras, raio, relevo, segmentos, cantoGraus };
  });
}

/* ---------------------------------------------------------------- vetores */

const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cruz = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const norma = (u) => Math.hypot(u[0], u[1], u[2]);
const unit3 = (u) => { const l = norma(u); return [u[0] / l, u[1] / l, u[2] / l]; };
const dot2 = (u, v) => u[0] * v[0] + u[1] * v[1];
const cruz2 = (u, v) => u[0] * v[1] - u[1] * v[0];
const unit2 = (u) => { const l = Math.hypot(u[0], u[1]); return [u[0] / l, u[1] / l]; };
const giro2 = (v, t) => { const c = Math.cos(t), s = Math.sin(t); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
const chave = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

function newell(P) {
  const n = [0, 0, 0];
  for (let k = 0; k < P.length; k++) {
    const a = P[k], b = P[(k + 1) % P.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/* O plano de referência: origem na média da borda, normal média das faces que a tocam (a de fora), e e1, e2 do plano. */
function quadroDaBorda(nomes, pos, faces, onde) {
  const naBorda = new Set(nomes);
  const n = [0, 0, 0]; const suporte = new Set(nomes);
  const comprimentos = [];
  const vistas = new Set();
  for (const f of faces) {
    if (!f.some((p) => naBorda.has(p))) continue;
    const nf = newell(f.map(pos));
    n[0] += nf[0]; n[1] += nf[1]; n[2] += nf[2];
    for (const p of f) suporte.add(p);
    for (let k = 0; k < f.length; k++) {
      const a = f[k], b = f[(k + 1) % f.length];
      if (naBorda.has(a) === naBorda.has(b)) continue;
      const c = chave(a, b);
      if (vistas.has(c)) continue;
      vistas.add(c); comprimentos.push(norma(sub(pos(a), pos(b))));
    }
  }
  if (!(norma(n) > 0)) falha(`${onde}: as faces em volta da borda não têm normal`);
  const N = unit3(n);
  const eixo = [0, 1, 2].reduce((m, i) => (Math.abs(N[i]) < Math.abs(N[m]) ? i : m), 0);
  const ref = [0, 0, 0]; ref[eixo] = 1;
  const r = sub(ref, [N[0] * N[eixo], N[1] * N[eixo], N[2] * N[eixo]]);
  const e1 = unit3(r), e2 = cruz(N, e1);
  const o = [0, 0, 0];
  for (const p of nomes) { const q = pos(p); o[0] += q[0] / nomes.length; o[1] += q[1] / nomes.length; o[2] += q[2] / nomes.length; }
  const local = (q) => { const d = sub(q, o); return [dot(d, e1), dot(d, e2), dot(d, N)]; };
  const ordenados = comprimentos.sort((a, b) => a - b);
  const espacamento = ordenados.length ? ordenados[Math.floor((ordenados.length - 1) / 2)] : 0;
  return { N, e1, e2, o, local, suporte: [...suporte], espacamento };
}

/* ---------------------------------------------------------------- altura da chapa dentro do vão */

function resolver(A, b) {
  const n = b.length; const M = A.map((l, i) => [...l, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let c = n - 1; c >= 0; c--) {
    let s = M[c][n];
    for (let k = c + 1; k < n; k++) s -= M[c][k] * x[k];
    x[c] = s / M[c][c];
  }
  return x;
}

/* h(x, y) e o gradiente da superfície dos pontos de suporte [x, y, h]: polinômio por mínimos quadrados, mais o resíduo
   de cada ponto interpolado por 1/(d² + ε²), para a superfície passar pelos pontos da grade. */
function superficieLocal(amostras) {
  const grau = amostras.length >= 20 ? 3 : amostras.length >= 10 ? 2 : 1;
  const termos = [];
  for (let a = 0; a <= grau; a++) for (let b = 0; a + b <= grau; b++) termos.push([a, b]);
  const escala = Math.max(...amostras.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) || 1;
  const base = (x, y) => termos.map(([a, b]) => (x / escala) ** a * (y / escala) ** b);
  const T = termos.length;
  const A = Array.from({ length: T }, () => new Array(T).fill(0)); const b = new Array(T).fill(0);
  for (const [x, y, h] of amostras) {
    const f = base(x, y);
    for (let i = 0; i < T; i++) { b[i] += f[i] * h; for (let j = 0; j < T; j++) A[i][j] += f[i] * f[j]; }
  }
  for (let i = 0; i < T; i++) A[i][i] += 1e-12 * (A[i][i] || 1);
  const c = resolver(A, b);
  const poli = (x, y) => { const f = base(x, y); let s = 0; for (let i = 0; i < T; i++) s += c[i] * f[i]; return s; };
  const residuos = amostras.map(([x, y, h]) => h - poli(x, y));
  const EPS2 = 1e-8;
  const corrige = (x, y) => {
    let sw = 0, sr = 0;
    amostras.forEach(([px, py], i) => { const w = 1 / ((x - px) ** 2 + (y - py) ** 2 + EPS2); sw += w; sr += w * residuos[i]; });
    return sr / sw;
  };
  const h = (x, y) => poli(x, y) + corrige(x, y);
  const grad = (x, y) => {
    let gx = 0, gy = 0;
    termos.forEach(([a, bb], i) => {
      if (a > 0) gx += c[i] * a * (x / escala) ** (a - 1) * (y / escala) ** bb / escala;
      if (bb > 0) gy += c[i] * bb * (x / escala) ** a * (y / escala) ** (bb - 1) / escala;
    });
    return [gx, gy];
  };
  return { h, grad, grau };
}

/* ---------------------------------------------------------------- transição até a grade */

/* As larguras dos laços de transição, da última volta para a borda do vão: m larguras wRef·q^i, 1 <= q <= 2, que somam
   `g` e acabam entre sp/2,5 e 2,5·sp (a face da grade ao lado). Devolve { larguras } ou { de, ate } com o intervalo de `g`
   que a transição aceita. */
function graduar(g, wRef, sp) {
  const soma = (m, q) => { let s = 0, t = wRef; for (let i = 0; i < m; i++) { t *= q; s += t; } return s; };
  let de = Infinity, ate = 0;
  for (let m = 1; m <= 24; m++) {
    const qMin = Math.max(1, (sp / MAIOR_RAZAO / wRef) ** (1 / m)), qMax = Math.min(2, (sp * MAIOR_RAZAO / wRef) ** (1 / m));
    if (qMin > qMax) continue;
    const s0 = soma(m, qMin), s1 = soma(m, qMax);
    de = Math.min(de, s0); ate = Math.max(ate, s1);
    if (g < s0 - 1e-12 || g > s1 + 1e-12) continue;
    let lo = qMin, hi = qMax;
    for (let it = 0; it < 100; it++) { const mid = (lo + hi) / 2; if (soma(m, mid) < g) lo = mid; else hi = mid; }
    const q = (lo + hi) / 2;
    return { larguras: Array.from({ length: m }, (_, i) => wRef * q ** (i + 1)) };
  }
  return { de, ate };
}

/* ---------------------------------------------------------------- costura */

/* O alinhamento de menor distância entre o laço B (M pontos) e o laço R (N pontos) por faixa de quadriláteros: cada
   face avança (1, 1), tem um ponto de B e três de R (0, 2) ou três de B e um de R (2, 0). Devolve as faces em índices. */
function costurar(Bp, Rp, fechada) {
  const M = Bp.length, N = Rp.length;
  const iMax = fechada ? M : M - 1, jMax = fechada ? N : N - 1;
  const d2 = (a, b) => ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) * MM * MM;
  const radial = (i, j) => d2(Bp[i % M], Rp[j % N]);
  const PENALIDADE_DO_PAR = 1e3, PENALIDADE_DA_REPETICAO = 6e3;
  const idx = (i, j, t) => (i * (jMax + 1) + j) * 3 + t;
  const custo = new Float64Array((iMax + 1) * (jMax + 1) * 3).fill(Infinity);
  const veio = new Int32Array((iMax + 1) * (jMax + 1) * 3).fill(-1);
  custo[idx(0, 0, 0)] = radial(0, 0);
  for (let i = 0; i <= iMax; i++) for (let j = 0; j <= jMax; j++) for (let t = 0; t < 3; t++) {
    const c = custo[idx(i, j, t)];
    if (c === Infinity) continue;
    const tentar = (ni, nj, nt, extra) => {
      if (ni > iMax || nj > jMax) return;
      const v = c + radial(ni, nj) + extra;
      const k = idx(ni, nj, nt);
      if (v < custo[k]) { custo[k] = v; veio[k] = idx(i, j, t); }
    };
    tentar(i + 1, j + 1, 0, 0);
    if (t !== 2) tentar(i, j + 2, 1, PENALIDADE_DO_PAR + (t === 1 ? PENALIDADE_DA_REPETICAO : 0));
    if (t !== 1) tentar(i + 2, j, 2, PENALIDADE_DO_PAR + (t === 2 ? PENALIDADE_DA_REPETICAO : 0));
  }
  let melhor = -1;
  for (let t = 0; t < 3; t++) if (custo[idx(iMax, jMax, t)] < (melhor < 0 ? Infinity : custo[melhor])) melhor = idx(iMax, jMax, t);
  if (melhor < 0) falha('a costura do anel à borda do vão não encontra alinhamento; confira a abertura e a borda');
  const passos = [];
  for (let k = melhor; veio[k] >= 0; k = veio[k]) {
    const de = veio[k];
    const dj = Math.floor(de / 3) % (jMax + 1), di = Math.floor(Math.floor(de / 3) / (jMax + 1));
    const aj = Math.floor(k / 3) % (jMax + 1), ai = Math.floor(Math.floor(k / 3) / (jMax + 1));
    passos.push([di, dj, ai - di, aj - dj]);
  }
  passos.reverse();
  return passos.map(([i, j, di, dj]) => {
    const b = (x) => x % M, r = (x) => x % N;
    if (di === 1 && dj === 1) return [['B', b(i + 1)], ['B', b(i)], ['R', r(j)], ['R', r(j + 1)]];
    if (di === 0) return [['B', b(i)], ['R', r(j)], ['R', r(j + 1)], ['R', r(j + 2)]];
    return [['B', b(i + 2)], ['B', b(i + 1)], ['B', b(i)], ['R', r(j)]];
  });
}

/* ---------------------------------------------------------------- um anel */

/**
 * construirUm(anel, borda, contexto) -> { pontos, voltas, costuras, faces, borda, ... }
 * `borda` é { nomes, fechada } com os nomes em sequência (a chapa à esquerda, vista de fora); `contexto` dá `pos(nome)`,
 * as `faces` finais da grade e o `vizinhoLivre(ponto, nomesDaBorda)` para a ponta da borda aberta.
 */
function construirUm(anel, borda, contexto) {
  const onde = `o anel ${citar(anel.nome)}`;
  const { pos, faces } = contexto;
  const fechada = borda.fechada;
  let nomes = [...borda.nomes];
  if (fechada && nomes[0] === nomes[nomes.length - 1]) nomes.pop();
  const quadro = quadroDaBorda(nomes, pos, faces, onde);
  const { N, e1, e2, o, local } = quadro;
  const Lb = nomes.map((p) => local(pos(p)));
  const sinal = (P) => { let a = 0; for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  if (fechada && !(sinal(Lb) < 0)) falha(`${onde}: a borda do vão ${citar(anel.vao)} percorre a chapa à direita; a borda precisa seguir com a chapa à esquerda, vista de fora`);

  const modelo = superficieLocal(quadro.suporte.map((p) => local(pos(p))));

  const tangentes = (Q, F) => {
    const m = Q.length; const E = F ? m : m - 1;
    return Array.from({ length: E }, (_, j) => { const a = Q[j], b = Q[(j + 1) % m]; return unit2([b[0] - a[0], b[1] - a[1]]); });
  };
  const virada = (t0, t1) => Math.atan2(cruz2(t0, t1), dot2(t0, t1));
  const cantoRad = anel.cantoGraus * Math.PI / 180;
  /* a virada de cada vértice da borda (nula nas pontas do caminho aberto) */
  const viradas = (Q, F) => {
    const t = tangentes(Q, F); const m = Q.length;
    return Q.map((_, i) => ((!F && (i === 0 || i === m - 1)) ? 0 : virada(t[(i - 1 + t.length) % t.length], t[i % t.length])));
  };
  /* a borda fechada começa num vértice que não vira esquina, para o alinhamento da costura começar numa lateral */
  if (fechada) {
    const v0 = viradas(Lb, true);
    let r0 = 0;
    while (r0 < nomes.length && Math.abs(v0[r0]) >= cantoRad) r0++;
    if (r0 === nomes.length) r0 = 0;
    if (r0 > 0) { nomes = [...nomes.slice(r0), ...nomes.slice(0, r0)]; Lb.push(...Lb.splice(0, r0)); }
  }
  const M = nomes.length;
  const P = Lb.map((q) => [q[0], q[1]]);
  const t = tangentes(P, fechada);
  const nu = t.map((v) => [v[1], -v[0]]);
  const entrada = (i) => (fechada ? (i - 1 + M) % M : i - 1);
  const viradasP = viradas(P, fechada);
  /* esquina: a borda vira em cantoGraus ou mais (para qualquer lado); canto: esquina que vira para dentro do vão, que
     com `raio` ganha um arco */
  const esquina = P.map((_, i) => (!fechada && (i === 0 || i === M - 1)) || Math.abs(viradasP[i]) >= cantoRad);
  const cantos = P.map((_, i) => anel.raio > 0 && !(!fechada && (i === 0 || i === M - 1)) && viradasP[i] < 0 && -viradasP[i] >= cantoRad);
  const phis = P.map((_, i) => (cantos[i] ? viradasP[i] : 0));
  /* as corridas de vértices entre duas esquinas (ou pontas): neles os pontos do laço se distribuem pela mesma fração
     do comprimento da corrida recuada, para o canto não passar por cima dos pontos vizinhos */
  const corridas = [];
  { const marcas = esquina.map((e, i) => (e ? i : -1)).filter((i) => i >= 0);
    for (let q = 0; q < marcas.length; q++) {
      const a = marcas[q]; const b = marcas[(q + 1) % marcas.length];
      if (!fechada && q === marcas.length - 1) break;
      if (fechada && marcas.length === 1) break;
      const meio = []; for (let k = (a + 1) % M; k !== b; k = (k + 1) % M) meio.push(k);
      corridas.push({ a, b, meio });
    } }

  /* os laços, da borda do vão para a abertura: a transição e depois as voltas K, ..., 1 */
  const r = anel.raio / MM;
  const recuo = anel.recuo / MM;
  const afastamentos = [0];
  for (const w of anel.larguras) afastamentos.push(afastamentos[afastamentos.length - 1] + w / MM);
  const ultimo = afastamentos[afastamentos.length - 1];
  const lacuna = recuo - ultimo;
  const sp = quadro.espacamento;
  const wRef = anel.larguras.length ? anel.larguras[anel.larguras.length - 1] / MM : sp / 8;
  const g = graduar(lacuna, wRef, sp);
  if (!g.larguras) {
    falha(`${onde}: a abertura recua ${anel.recuo} mm da borda do vão ${citar(anel.vao)} e a última volta fica a ${(lacuna * MM).toFixed(1)} mm dela; a transição dessa volta de ${(wRef * MM).toFixed(1)} mm de largura até a grade, de ${(sp * MM).toFixed(1)} mm, pede entre ${(g.de * MM).toFixed(1)} e ${(g.ate * MM).toFixed(1)} mm`);
  }
  const transicoes = [];
  { let d = ultimo; g.larguras.forEach((w, j) => { d += w; transicoes.push({ rotulo: `c${j + 1}`, afastamento: d, relevo: 0 }); }); }
  /* o último laço de transição é a borda do vão; o que fica antes dela é o que o anel acrescenta */
  transicoes.pop();
  const lacos = [
    ...transicoes.reverse(),
    ...afastamentos.map((d, k) => ({ rotulo: `a${k + 1}`, volta: k + 1, afastamento: d, relevo: anel.relevo[k] / MM })).reverse(),
  ];
  const raioDe = (d) => {
    if (!(r > 0)) return 0;
    if (d <= ultimo + 1e-12) return r + d;
    return (r + ultimo) * (recuo - d) / lacuna;
  };

  /* segmentos do arco de cada canto: `segmentos` por quarto de volta, em número par */
  const nDoArco = phis.map((phi) => {
    if (phi === 0) return 0;
    const n = Math.round(-phi / (Math.PI / 2) * anel.segmentos);
    return Math.max(2, n + (n % 2));
  });

  /* a borda livre na ponta de um caminho aberto, prolongada para dentro do vão: a parábola pelos dois pontos livres de
     antes e pela ponta, porque a reta no plano sairia da borda curva da chapa */
  let pontaIni = null, pontaFim = null;
  if (!fechada) {
    const livre = (ponto) => {
      const q1 = contexto.vizinhoLivre(ponto, nomes);
      if (!q1) falha(`${onde}: a ponta ${citar(ponto)} da borda do vão ${citar(anel.vao)} não encontra a aresta livre da chapa; o vão que se abre na borda precisa terminar nela`);
      const q2 = contexto.vizinhoLivre(q1, [ponto]);
      const l0 = local(pos(ponto)), l1 = local(pos(q1));
      const plano = (l) => [l[0], l[1]];
      const A = q2 ? plano(local(pos(q2))) : null, B1 = plano(l1), C0 = plano(l0);
      const u = unit2([C0[0] - B1[0], C0[1] - B1[1]]);
      if (!A) return { u, ponto: (tau) => [C0[0] + tau * u[0], C0[1] + tau * u[1]], derivada: () => u };
      const s1 = Math.hypot(B1[0] - A[0], B1[1] - A[1]), s2 = Math.hypot(C0[0] - B1[0], C0[1] - B1[1]);
      const S = s1 + s2;
      const L = (x) => [(x - s1) * (x - S) / ((0 - s1) * (0 - S)), (x - 0) * (x - S) / ((s1 - 0) * (s1 - S)), (x - 0) * (x - s1) / ((S - 0) * (S - s1))];
      const dL = (x) => [((x - s1) + (x - S)) / ((0 - s1) * (0 - S)), ((x - 0) + (x - S)) / ((s1 - 0) * (s1 - S)), ((x - 0) + (x - s1)) / ((S - 0) * (S - s1))];
      const comb = (w) => [A[0] * w[0] + B1[0] * w[1] + C0[0] * w[2], A[1] * w[0] + B1[1] * w[1] + C0[1] * w[2]];
      return { u: unit2(comb(dL(S))), ponto: (tau) => comb(L(S + tau)), derivada: (tau) => comb(dL(S + tau)) };
    };
    pontaIni = livre(nomes[0]); pontaFim = livre(nomes[M - 1]);
    pontaIni.den = dot2(pontaIni.u, nu[0]); pontaFim.den = dot2(pontaFim.u, nu[M - 2]);
    if (!(pontaIni.den > 0.2) || !(pontaFim.den > 0.2)) falha(`${onde}: a aresta livre da chapa na ponta da borda do vão ${citar(anel.vao)} não entra no vão; confira a ordem das estações e colunas`);
  }

  /* o comprimento sobre a chapa do caminho que sai de `p` pelo plano na direção `dir` (Simpson, 8 partes) e o passo no plano
     cujo caminho mede `alvo` sobre a chapa: a largura declarada é medida na chapa, e a inclinação muda ao longo do recuo */
  const comprimentoSobreAChapa = (p, dir, ate) => {
    const f = (tau) => { const gr = modelo.grad(p[0] + tau * dir[0], p[1] + tau * dir[1]); return Math.sqrt(1 + (gr[0] * dir[0] + gr[1] * dir[1]) ** 2); };
    const n = 8, h = ate / n; let soma = f(0) + f(ate);
    for (let k = 1; k < n; k++) soma += f(k * h) * (k % 2 ? 4 : 2);
    return soma * h / 3;
  };
  const passoNoPlano = (p, dir, alvo) => {
    let passo = alvo;
    for (let it = 0; it < 5; it++) {
      const gr = modelo.grad(p[0] + passo * dir[0], p[1] + passo * dir[1]);
      passo += (alvo - comprimentoSobreAChapa(p, dir, passo)) / Math.sqrt(1 + (gr[0] * dir[0] + gr[1] * dir[1]) ** 2);
    }
    return passo;
  };

  /* os vértices de um laço, no plano: o recuo de cada vértice pela bissetriz e os arcos dos cantos */
  const lacoNoPlano = (laco) => {
    const d = recuo - laco.afastamento; const rho = raioDe(laco.afastamento);
    const X = P.map((p, i) => {
      /* a distância declarada vale para os dois lados que se encontram no vértice, medida sobre a chapa a partir do pé do
         ponto recuado em cada lado: duas iterações acertam o pé, que anda com o ponto */
      const dos = (n, tl, x0) => {
        const w = [x0[0] - p[0], x0[1] - p[1]]; const c = w[0] * tl[0] + w[1] * tl[1];
        return passoNoPlano([p[0] + c * tl[0], p[1] + c * tl[1]], n, d);
      };
      if (!fechada && (i === 0 || i === M - 1)) {
        const ponta = i === 0 ? pontaIni : pontaFim; const j = i === 0 ? 0 : M - 2;
        /* tau é o passo ao longo da borda livre que leva o ponto à distância certa do lado da borda do vão */
        let tau = d / ponta.den; let x = ponta.ponto(tau);
        for (let it = 0; it < 4; it++) {
          const alvo = dos(nu[j], t[j], x);
          const f = nu[j][0] * (x[0] - p[0]) + nu[j][1] * (x[1] - p[1]) - alvo;
          const dv = ponta.derivada(tau);
          tau -= f / (nu[j][0] * dv[0] + nu[j][1] * dv[1]);
          x = ponta.ponto(tau);
        }
        return x;
      }
      const a = nu[entrada(i)], b = nu[i % nu.length];
      const den = 1 + dot2(a, b);
      if (!(den > 0.15)) falha(`${onde}: a borda do vão ${citar(anel.vao)} vira mais de 130 graus em ${citar(nomes[i])}; o recuo não tem esquadria`);
      const bis = unit2([a[0] + b[0], a[1] + b[1]]);
      const m = Math.hypot(a[0] + b[0], a[1] + b[1]) / den;
      const s0 = passoNoPlano(p, bis, d * m);
      let x = [p[0] + s0 * bis[0], p[1] + s0 * bis[1]];
      const det = a[0] * b[1] - a[1] * b[0];
      if (Math.abs(det) > 0.17) {
        for (let it = 0; it < 3; it++) {
          const s1 = dos(a, t[entrada(i)], x), s2 = dos(b, t[i % t.length], x);
          x = [p[0] + (s1 * b[1] - s2 * a[1]) / det, p[1] + (a[0] * s2 - b[0] * s1) / det];
        }
      }
      return x;
    });
    const Y = X.map((q) => [...q]);
    /* o arco de cada canto, desenhado com o raio medido sobre a chapa: no plano, a direção da inclinação encolhe pelo fator da métrica */
    const arcos = P.map((_, i) => {
      if (!cantos[i]) return null;
      /* a inclinação no meio do arco, que é onde o raio mede a chapa */
      const tin0 = t[entrada(i)], tg0 = rho * Math.tan(-phis[i] / 2);
      const centro0 = [X[i][0] - tg0 * tin0[0] + rho * tin0[1], X[i][1] - tg0 * tin0[1] - rho * tin0[0]];
      const gr = modelo.grad(centro0[0], centro0[1]);
      const sg = Math.sqrt(1 + gr[0] * gr[0] + gr[1] * gr[1]);
      const gu = Math.hypot(gr[0], gr[1]) > 1e-12 ? unit2(gr) : [1, 0];
      const esticar = (v) => { const c = v[0] * gu[0] + v[1] * gu[1]; return [v[0] + (sg - 1) * c * gu[0], v[1] + (sg - 1) * c * gu[1]]; };
      const encolher = (v) => { const c = v[0] * gu[0] + v[1] * gu[1]; return [v[0] + (1 / sg - 1) * c * gu[0], v[1] + (1 / sg - 1) * c * gu[1]]; };
      const tin = unit2(esticar(t[entrada(i)])), tout = unit2(esticar(t[i % t.length]));
      const phi = virada(tin, tout);
      const tg = rho * Math.tan(-phi / 2);
      const nin = [tin[1], -tin[0]];
      const C = [-tg * tin[0] + rho * nin[0], -tg * tin[1] + rho * nin[1]];
      const n = nDoArco[i];
      const pts = [];
      for (let j = 0; j <= n; j++) {
        const tj = giro2(tin, phi * j / n);
        const dq = encolher([C[0] - rho * tj[1], C[1] + rho * tj[0]]);
        pts.push([X[i][0] + dq[0], X[i][1] + dq[1]]);
      }
      const lado = (v) => Math.hypot(...encolher([v[0] * tg, v[1] * tg]));
      return { pts, entra: lado(tin), sai: lado(tout) };
    });
    const tangente = P.map((_, i) => (arcos[i] ? arcos[i].sai : 0));
    const tangenteB = P.map((_, i) => (arcos[i] ? arcos[i].entra : 0));
    for (const { a, b, meio } of corridas) {
      const a0 = nomes[a], b0 = nomes[b];
      const dir = unit2([P[b][0] - P[a][0], P[b][1] - P[a][1]]);
      const ao = (q, ref) => (q[0] - ref[0]) * dir[0] + (q[1] - ref[1]) * dir[1];
      const comprimentoB = ao(P[b], P[a]);
      const xa = ao(X[a], P[a]), xb = ao(X[b], P[a]);
      const total = xb - xa;
      if (!(total > MARGEM)) falha(`${onde}: o laço a ${(laco.afastamento * MM).toFixed(1)} mm da abertura passa da largura do vão ${citar(anel.vao)} entre ${citar(a0)} e ${citar(b0)}; reduza o recuo`);
      /* os pontos do lado se redistribuem pela mesma fração da corrida: a esquina recuada anda ao longo do lado */
      const novos = meio.map((k) => ao(P[k], P[a]) / comprimentoB * total + xa);
      const primeiro = meio.length ? novos[0] - xa : total, ultimoLado = meio.length ? xb - novos[novos.length - 1] : total;
      const falta = meio.length ? (primeiro - tangente[a] < MARGEM || ultimoLado - tangenteB[b] < MARGEM) : tangente[a] + tangenteB[b] > total - MARGEM;
      if (falta) {
        falha(`${onde}: no laço a ${(laco.afastamento * MM).toFixed(1)} mm da abertura o raio de ${(rho * MM).toFixed(1)} mm dos cantos não cabe entre ${citar(a0)} e ${citar(b0)}: o canto pede ${(Math.max(tangente[a], tangenteB[b]) * MM).toFixed(1)} mm de lado e o primeiro ponto do lado fica a ${(Math.min(primeiro, ultimoLado) * MM).toFixed(1)} mm; reduza o raio ou ponha pontos na borda do vão`);
      }
      /* o recuo de cada ponto do lado se mede a partir do pé dele na borda, na altura nova ao longo do lado, porque a
         inclinação muda ao longo da corrida */
      const ao0 = [a, ...meio, b].map((k) => ao(P[k], P[a]));
      meio.forEach((k, j) => {
        const alvo = novos[j];
        let h = 0; while (h + 2 < ao0.length && ao0[h + 1] < alvo) h++;
        const u = P[[a, ...meio, b][h]], v = P[[a, ...meio, b][h + 1]];
        const f = ao0[h + 1] > ao0[h] ? Math.min(1, Math.max(0, (alvo - ao0[h]) / (ao0[h + 1] - ao0[h]))) : 0;
        const pe = [u[0] + f * (v[0] - u[0]), u[1] + f * (v[1] - u[1])];
        const dl = unit2([v[0] - u[0], v[1] - u[1]]);
        const normal = [dl[1], -dl[0]];
        const passo = passoNoPlano(pe, normal, d);
        Y[k] = [pe[0] + passo * normal[0], pe[1] + passo * normal[1]];
      });
    }
    const saida = [];
    P.forEach((_, i) => {
      if (!cantos[i]) { saida.push({ x: Y[i][0], y: Y[i][1], ancora: i, arco: null }); return; }
      arcos[i].pts.forEach((q, j) => saida.push({ x: q[0], y: q[1], ancora: i, arco: j }));
    });
    return saida;
  };

  const noPlano = lacos.map(lacoNoPlano);
  const pontos = {}; const nomesDosLacos = [];
  noPlano.forEach((v, k) => {
    const laco = lacos[k];
    const lista3 = v.map((q) => {
      const hh = modelo.h(q.x, q.y);
      const gr = modelo.grad(q.x, q.y);
      const normalLocal = unit3([-gr[0], -gr[1], 1]);
      const lx = q.x + laco.relevo * normalLocal[0], ly = q.y + laco.relevo * normalLocal[1], lz = hh + laco.relevo * normalLocal[2];
      return [o[0] + lx * e1[0] + ly * e2[0] + lz * N[0], o[1] + lx * e1[1] + ly * e2[1] + lz * N[1], o[2] + lx * e1[2] + ly * e2[2] + lz * N[2]];
    });
    const nm = v.map((q) => `${anel.nome}_${laco.rotulo}_${nomes[q.ancora]}${q.arco === null ? '' : `_arco${q.arco}`}`);
    nm.forEach((n, j) => {
      if (n in pontos) falha(`${onde}: o ponto ${citar(n)} sai duas vezes; renomeie o anel ou a borda`);
      pontos[n] = lista3[j];
    });
    nomesDosLacos.push(nm);
  });

  /* a faixa da borda ao primeiro laço e as faixas entre os laços */
  const posB = nomes.map(pos);
  const posR = nomesDosLacos[0].map((n) => pontos[n]);
  const costura = costurar(posB, posR, fechada);
  const facesNovas = costura.map((f) => f.map(([lado, i]) => (lado === 'B' ? nomes[i] : nomesDosLacos[0][i])));
  const Nr = nomesDosLacos[0].length;
  for (let k = 0; k + 1 < nomesDosLacos.length; k++) {
    const a = nomesDosLacos[k], b = nomesDosLacos[k + 1];
    const E = fechada ? Nr : Nr - 1;
    for (let j = 0; j < E; j++) facesNovas.push([a[(j + 1) % Nr], a[j], b[j], b[(j + 1) % Nr]]);
  }
  const voltas = Array.from({ length: anel.voltas }, (_, k) => nomesDosLacos[lacos.findIndex((l) => l.volta === k + 1)]);
  const costuras = lacos.map((l, k) => (l.volta ? null : nomesDosLacos[k])).filter(Boolean).reverse();
  const primeira = voltas[0];
  return {
    pontos, voltas, costuras, faces: facesNovas, fechada,
    borda: fechada ? [...primeira, primeira[0]] : [...primeira],
    ancoras: noPlano[0].map((q) => nomes[q.ancora]),
    origens: Object.fromEntries(noPlano.flatMap((v, k) => v.map((q, j) => [nomesDosLacos[k][j], {
      tipo: 'anel', anel: anel.nome, ...(lacos[k].volta ? { volta: lacos[k].volta } : { costura: lacos[k].rotulo }), borda: nomes[q.ancora], ...(q.arco === null ? {} : { arco: q.arco }),
    }]))),
  };
}

/**
 * construirAneis(aneis, contexto) -> { porNome: Map(nome -> resultado), pontos, faces }
 * `contexto` dá `pos(nome)`, a lista de `faces` finais da grade, `bordaDoVao(nome)` (o caminho da borda do vão: com o
 * primeiro repetido no fim, é uma volta) e `vizinhoLivre(ponto, nomesDaBorda)` (o ponto da aresta livre da chapa que sai
 * de `ponto` e não é da borda).
 */
export function construirAneis(aneis, contexto) {
  const porNome = new Map(); const pontos = {}; const faces = [];
  for (const anel of aneis) {
    const caminho = contexto.bordaDoVao(anel.vao);
    const fechada = caminho.length > 2 && caminho[0] === caminho[caminho.length - 1];
    const r = construirUm(anel, { nomes: caminho, fechada }, contexto);
    porNome.set(anel.nome, { ...r, anel, vao: anel.vao });
    Object.assign(pontos, r.pontos);
    faces.push(...r.faces);
  }
  return { porNome, pontos, faces };
}

/** extraordinarios(vertices, faces) -> os vértices de `vertices` com valência fora da regular, { ponto, valencia, borda }:
 *  4 no interior; 2 ou 3 na borda livre. */
export function extraordinarios(vertices, faces) {
  const vizinhos = new Map(); const contagem = new Map();
  for (const f of faces) {
    for (let k = 0; k < f.length; k++) {
      const a = f[k], b = f[(k + 1) % f.length]; const c = chave(a, b);
      contagem.set(c, (contagem.get(c) ?? 0) + 1);
      if (!vizinhos.has(a)) vizinhos.set(a, new Set());
      if (!vizinhos.has(b)) vizinhos.set(b, new Set());
      vizinhos.get(a).add(b); vizinhos.get(b).add(a);
    }
  }
  const saida = [];
  for (const p of vertices) {
    const vs = vizinhos.get(p); if (!vs) continue;
    const valencia = vs.size;
    const naBorda = [...vs].some((q) => contagem.get(chave(p, q)) === 1);
    if (naBorda ? (valencia < 2 || valencia > 3) : valencia !== 4) saida.push({ ponto: p, valencia, borda: naBorda });
  }
  return saida;
}
