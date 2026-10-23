/* gaiola-aneis.js — anéis de gaiola em volta de um vão, opção da gaiola por estações
 *
 * Função pura, sem Three.js e sem domínio. `gaiolaPorEstacoes` chama `lerAneis` e `construirAneis` quando a definição
 * declara `aneis`; sem a opção nada aqui roda e a saída do ajudante é a de antes, byte a byte.
 *
 *   aneis: [{ nome, vao, recuo: mm | { <coluna ou estação do limite do vão>: mm, padrao?: mm } | 0, voltas: n,
 *             largura: mm | larguras: [mm, ...], raio?: mm, raios?: { <ponto da borda do vão>: mm }, relevo?: [mm, ...],
 *             segmentos?: n, cantoGraus?: graus, camadas?: n, arredondar?: boolean }]
 *
 * DOIS JEITOS DE POR O ANEL. Com `recuo` maior que zero o anel preenche o vão da grade por dentro: o vão que a receita declara
 * em `vaos` é o limite de fora, as faces da grade ficam como estão, e a abertura de verdade, a borda livre da chapa, fica
 * `recuo` mm para dentro da borda do vão. O recuo pode ser um número para todos os lados ou um por lado, citando os limites do
 * vão pelo nome: `{ baixo: 60, cima: 80, e5: 70, e14: 70 }` são as duas colunas e as duas estações que o vão declara em
 * `colunas` e `estacoes`, e `padrao` vale para o lado que faltar. Com `recuo: 0` a abertura é a própria borda do vão, que a
 * gaiola já tem, e as voltas crescem para fora, sobre a grade: o anel troca a faixa de faces que cerca o vão por faces suas
 * (`camadas` diz quantas camadas de faces da grade, de uma a quatro; sem a opção ele toma a menor que fecha a transição) e se
 * costura às faces que sobram. Os dois jeitos servem a um vão fechado, a um que se abre na borda da chapa e ao vão de borda
 * livre que as colunas que terminam e começam deixam (`livre: true` no vão, em `gaiola-por-estacoes.js`).
 *
 * AS VOLTAS. A volta 1 é a abertura, e as voltas 2, 3... se afastam dela, em direção à grade, a `largura` mm uma da outra
 * (`larguras` dá as K - 1 larguras de uma volta à seguinte quando elas diferem). São esses laços de arestas apertados que
 * recebem o vinco, o relevo e a cota da moldura, da calha ou do lábio. Com recuo 0 a volta 1 são os pontos da própria borda
 * do vão, com os nomes da grade, e o relevo dela se faz movendo as colunas e estações da borda.
 *
 * A TRANSIÇÃO. Entre a última volta e a grade o anel acrescenta laços de transição, `${nome}_c${j}_…`, cada um até duas vezes
 * mais largo que o anterior e o último dentro de 2,5 vezes a aresta da grade que sai dali: a face de 10 mm ao lado de uma de
 * 100 mm dobra a superfície quando a subdivisão leva os vértices ao limite, e o dobro de uma faixa à seguinte é o que ela
 * aguenta. A transição usa o espaçamento da grade de cada lado da borda, e o mesmo número de laços em todos os lados, cada
 * lado com a sua razão de alargamento: a gota de uma janela, que afina até uns 10 mm numa ponta e tem a grade a 40 mm de um
 * lado e a 70 mm do outro, fecha com recuos e camadas diferentes. A grade que varia até 5% em volta do vão usa a mediana do
 * espaçamento, e a que varia mais, em que nenhum número de laços serve a todos os lados, cai também na mediana antes de gritar.
 * Quando nada fecha, o anel diz o lado (a coluna ou a estação e as estações ou colunas entre as quais fica), o que sobra entre
 * a última volta e a grade, o que a transição pede, e o que mudar: o recuo daquele lado, ou a coluna ou a estação a acrescentar
 * entre dois nomes, com a aresta que a grade precisa ter ali.
 *
 * Com `raio`, os cantos da abertura saem arredondados (só com recuo); `raios` troca o raio de um canto, pelo nome do ponto da
 * borda do vão, e zero o deixa vivo, como a ponta de uma gota. Um canto é o vértice da borda do vão em que ela vira para dentro
 * do vão em `cantoGraus` ou mais (padrão 30); abaixo disso o vértice só recua pela bissetriz. As voltas se afastam da abertura
 * como curvas paralelas, de modo que o raio do canto cresce com o afastamento (raio + afastamento) e a largura de cada volta
 * se mantém nos cantos, e os laços de transição estreitam o raio até o canto vivo da borda do vão. O arco de cada canto tem no
 * máximo `segmentos` segmentos por quarto de volta (par, padrão 4), com os pontos sobre o arco, e o canto de mais de 90 graus
 * fica com os mesmos segmentos do de 90: mais que isso põe mais de um deslocamento no mesmo ponto da borda e a valência sobe a
 * 6. Com recuo 0 os cantos das voltas saem em esquadria, o ponto do canto a distância / cos(meia virada) da quina, sem arco e
 * sem vértice extraordinário nas voltas; `arredondar: true` os contorna com arco de raio igual à distância (`segmentos` vale 2
 * por padrão aí), que segue a borda a menos de 0,5 mm também no canto mas faz faces de 10 mm junto de faces de 50 mm.
 *
 * A POSIÇÃO. A chapa dentro do vão não existe na grade, e um recuo no plano tangente sairia dela por d²/(2R), 0,75 mm a
 * 30 mm numa chapa de raio 600 mm. Os pontos do anel se calculam, então, num plano de referência (a normal média das faces
 * que tocam a borda): o recuo e os arcos se desenham no plano, e a altura de cada ponto sai de um ajuste polinomial por
 * mínimos quadrados (grau 3, 2 ou 1 conforme o número de pontos) aos da borda e da fileira da grade em volta dela (com recuo
 * 0, aos da faixa trocada e da fileira de fora), mais o resíduo de cada um interpolado por 1/d², de modo que o ajuste passa
 * pelos pontos da grade. As distâncias declaradas são medidas sobre a chapa: o passo no plano é o que integra a inclinação do
 * ajuste ao longo do caminho até o comprimento pedido, a partir do pé do ponto na borda, e o arco de cada canto usa a inclinação
 * do meio dele. O relevo desloca o ponto pela normal local dessa superfície, no sentido da normal das faces.
 *
 * Entre duas esquinas da borda, com recuo, os pontos do lado se distribuem pela mesma fração do comprimento do lado recuado,
 * porque o recuo da esquina anda ao longo do lado e passaria por cima dos pontos vizinhos. O raio do canto mais o recuo da
 * esquina precisam caber entre a esquina e o primeiro ponto do lado, e o anel grita com o ponto e o raio que cabe quando não
 * cabem. Com recuo 0 os pontos do lado ficam no pé de cada ponto da borda.
 *
 * A COSTURA. Com recuo, o laço de fora tem os mesmos pontos da borda do vão, um a um, e mais os do arco de cada canto, e os dois
 * se ligam por uma faixa só de quadriláteros, pelo alinhamento de menor distância entre eles (programação dinâmica): a face
 * tem dois pontos de cada laço, ou três de um e um do outro, e esta última é o que acrescenta ou tira um par de pontos.
 * Daí os vértices extraordinários: valência 5 nos pontos da borda do vão que ganham uma aresta, e 3 nos pontos do arco que
 * a recebem, três e dois por canto com o padrão de quatro segmentos. Com recuo 0 a costura liga o laço de fora à borda da
 * faixa trocada, que a grade tem, e os cantos da faixa ganham os pontos que dão valência 5 ou 6 ao ponto do canto do laço.
 * `aneis` devolve todos declarados pelo nome. Os laços seguintes têm os mesmos pontos do primeiro e se ligam a ele um a um. Toda
 * face do anel segue o sentido das faces da grade, e a que sai ao contrário (um laço que se cruza num canto de lados muito
 * diferentes) faz o anel gritar com os pontos.
 *
 * O vão que se abre na borda da chapa (o arco da roda) dá um caminho aberto: com recuo, os laços começam e acabam sobre a borda
 * livre da chapa, no prolongamento dela pela parábola que passa pela ponta da borda do vão e pelos dois pontos livres de antes;
 * com recuo 0, sobre a borda livre da grade, para fora do vão. Num vão que se abre no plano de simetria em x, as pontas dos
 * laços ficam exatamente sobre o plano.
 *
 * Os pontos se chamam `${nome}_a${volta}_${ponto da borda}`, e os do arco de um canto `…_arco${j}`, de modo que nenhum nome
 * depende de índice de gaiola. Mesma definição, mesma saída, byte a byte. */

const MM = 1000;
const MARGEM = 1e-4;
const MAIOR_RAZAO = 2.5;
const UNIFORME = 0.05;
const citar = (n) => `'${n}'`;
const lista = (nomes) => nomes.map(citar).join(', ');
const mm1 = (x) => (Math.round(x * MM * 10) / 10).toFixed(1);
function falha(texto) { throw new TypeError(`gaiola por estações: ${texto}`); }

function exigirCampos(objeto, permitidos, onde) {
  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) falha(`${onde} precisa ser objeto`);
  const extra = Object.keys(objeto).filter((k) => !permitidos.includes(k));
  if (extra.length) falha(`${onde} tem campo desconhecido ${lista(extra)}; os campos são ${permitidos.join(', ')}`);
}

export const PADROES_DOS_ANEIS = Object.freeze({ segmentos: 4, segmentosFora: 2, cantoGraus: 30 });
export const CAMADAS_MAXIMAS = 4;

/** lerAneis(aneis, vaos) -> os anéis conferidos, com os padrões; `vaos` é a lista dos nomes de vão da gaiola. */
export function lerAneis(aneis, vaos) {
  if (aneis == null) return [];
  if (!Array.isArray(aneis)) falha('aneis precisa ser lista de { nome, vao, recuo, voltas, largura, raio?, relevo? }');
  const nomes = new Set(); const dosVaos = new Set();
  return aneis.map((a, n) => {
    exigirCampos(a, ['nome', 'vao', 'recuo', 'voltas', 'largura', 'larguras', 'raio', 'raios', 'relevo', 'segmentos', 'cantoGraus', 'camadas', 'arredondar'], `o anel ${n}`);
    if (typeof a.nome !== 'string' || !a.nome) falha(`o anel ${n} precisa de nome (texto não vazio)`);
    const nome = a.nome;
    if (nomes.has(nome)) falha(`o nome de anel ${citar(nome)} aparece mais de uma vez`);
    nomes.add(nome);
    if (typeof a.vao !== 'string' || !vaos.includes(a.vao)) falha(`o anel ${citar(nome)} cita o vão ${citar(a.vao)}, que não existe; os vãos declarados são ${vaos.length ? lista(vaos) : 'nenhum'}`);
    if (dosVaos.has(a.vao)) falha(`o vão ${citar(a.vao)} tem mais de um anel`);
    dosVaos.add(a.vao);
    const positivo = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0;
    const falhaDoRecuo = () => falha(`o anel ${citar(nome)} precisa de recuo: quanto a abertura recua da borda do vão, em mm maior que zero (um número para todos os lados, ou { <coluna ou estação do limite do vão>: mm, padrao?: mm } para um recuo por lado), ou 0 para a abertura ser a própria borda do vão, com as voltas crescendo para fora, sobre a grade`);
    let recuo = null; let lados = null;
    if (typeof a.recuo === 'number') {
      if (!Number.isFinite(a.recuo) || a.recuo < 0) falhaDoRecuo();
      recuo = a.recuo;
    } else if (a.recuo && typeof a.recuo === 'object' && !Array.isArray(a.recuo)) {
      const chaves = Object.keys(a.recuo);
      if (!chaves.length || !chaves.every((k) => positivo(a.recuo[k]))) falha(`o anel ${citar(nome)} precisa de recuo por lado com mm maiores que zero em cada lado: ${chaves.length ? `${lista(chaves)} não são todos números positivos` : 'o objeto está vazio'}; o recuo zero vale para o anel todo, como número`);
      lados = { ...a.recuo };
    } else falhaDoRecuo();
    const fora = recuo === 0;
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
    let raios = {};
    if (a.raios != null) {
      if (!a.raios || typeof a.raios !== 'object' || Array.isArray(a.raios) || !Object.values(a.raios).every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0)) falha(`o anel ${citar(nome)} precisa de raios: { <ponto da borda do vão>: mm de zero em diante }, o raio de um canto que difere do raio do anel`);
      raios = { ...a.raios };
    }
    if (fora && (raio > 0 || Object.keys(raios).length)) falha(`o anel ${citar(nome)} tem recuo 0 e raio: a abertura é a borda do vão, e o canto dela é o da gaiola; as voltas contornam o canto com arco do raio da distância à abertura. Arredonde o canto com pontos na borda do vão, ou dê um recuo`);
    const relevo = a.relevo ?? Array.from({ length: voltas }, () => 0);
    if (!Array.isArray(relevo) || relevo.length !== voltas || !relevo.every((x) => typeof x === 'number' && Number.isFinite(x))) falha(`o anel ${citar(nome)} precisa de relevo: lista de ${voltas} deslocamentos em mm pela normal, um por volta`);
    if (fora && relevo[0] !== 0) falha(`o anel ${citar(nome)} tem recuo 0 e relevo ${relevo[0]} na volta 1; a volta 1 é a borda do vão, e o relevo dela se faz movendo as colunas e estações da borda`);
    const segmentos = a.segmentos ?? (fora ? PADROES_DOS_ANEIS.segmentosFora : PADROES_DOS_ANEIS.segmentos);
    if (!Number.isInteger(segmentos) || segmentos < 2 || segmentos % 2) falha(`o anel ${citar(nome)} precisa de segmentos: inteiro par de 2 em diante, os segmentos do arco de cada quarto de volta`);
    const cantoGraus = a.cantoGraus ?? PADROES_DOS_ANEIS.cantoGraus;
    if (typeof cantoGraus !== 'number' || !(cantoGraus > 0 && cantoGraus < 180)) falha(`o anel ${citar(nome)} precisa de cantoGraus entre 0 e 180`);
    const arredondar = a.arredondar ?? false;
    if (arredondar !== true && arredondar !== false) falha(`o anel ${citar(nome)} aceita arredondar só como true ou false`);
    if (arredondar && !fora) falha(`o anel ${citar(nome)} declara arredondar, que só vale com recuo 0: com recuo, o raio dos cantos da abertura é o raio do anel`);
    const camadas = a.camadas ?? null;
    if (camadas !== null) {
      if (!Number.isInteger(camadas) || camadas < 1 || camadas > CAMADAS_MAXIMAS) falha(`o anel ${citar(nome)} precisa de camadas: inteiro de 1 a ${CAMADAS_MAXIMAS}, quantas camadas de faces da grade em volta do vão o anel troca`);
      if (!fora) falha(`o anel ${citar(nome)} declara camadas, que só vale com recuo 0: com recuo, o anel fica dentro do vão e não troca faces da grade`);
    }
    const ate = larguras.reduce((s, x) => s + x, 0);
    for (const [lado, valor] of Object.entries(lados ?? (recuo !== null && !fora ? { '': recuo } : {}))) {
      if (!(valor > ate)) falha(`o anel ${citar(nome)} recua ${valor} mm da borda do vão${lado ? ` no lado ${citar(lado)}` : ''} e as ${voltas} voltas ocupam ${ate} mm da abertura; o recuo precisa passar disso, para sobrar a transição até a grade. Aumente o recuo, ou declare recuo: 0 para a abertura ser a própria borda do vão e as voltas crescerem para fora, sobre a grade`);
    }
    return { nome, vao: a.vao, recuo, lados, fora, voltas, larguras, raio, raios, relevo, segmentos, cantoGraus, camadas, arredondar };
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

/* O plano de referência: origem na média da borda, normal média das faces que a tocam (a de fora), e e1, e2 do plano.
   `espacoDe(ponto)` é o comprimento médio das arestas que saem do ponto da borda para fora dela, o espaçamento da grade ali;
   `extras` acrescenta pontos ao suporte do ajuste da altura. */
function quadroDaBorda(nomes, pos, faces, onde, extras = []) {
  const naBorda = new Set(nomes);
  const n = [0, 0, 0]; const suporte = new Set(nomes);
  const comprimentos = [];
  const vistas = new Set();
  const porPonto = new Map();
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
      const l = norma(sub(pos(a), pos(b)));
      vistas.add(c); comprimentos.push(l);
      const dentro = naBorda.has(a) ? a : b;
      const acumulado = porPonto.get(dentro) ?? [0, 0];
      porPonto.set(dentro, [acumulado[0] + l, acumulado[1] + 1]);
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
  const espacoDe = (p) => { const a = porPonto.get(p); return a ? a[0] / a[1] : null; };
  for (const p of extras) suporte.add(p);
  return { N, e1, e2, o, local, suporte: [...suporte], espacamento, espacoDe };
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

/* As larguras dos laços de transição, da última volta para a grade: m larguras wRef·q^i, 1 <= q <= 2, que somam `g` e acabam
   entre sp/2,5 e 2,5·sp (a face da grade ao lado). Cada lado da borda tem o seu `g`, o seu `wRef` e o seu `sp`, e a transição
   usa o mesmo número m de laços em todos eles, com um q por lado. */
const somaDeLacos = (m, q, wRef) => { let s = 0, t = wRef; for (let i = 0; i < m; i++) { t *= q; s += t; } return s; };

function intervaloDaTransicao(m, wRef, sp) {
  const qMin = Math.max(1, (sp / MAIOR_RAZAO / wRef) ** (1 / m)), qMax = Math.min(2, (sp * MAIOR_RAZAO / wRef) ** (1 / m));
  if (qMin > qMax) return null;
  return { qMin, qMax, s0: somaDeLacos(m, qMin, wRef), s1: somaDeLacos(m, qMax, wRef) };
}

/* o q dos m laços que somam g, ou null se m laços não fecham g */
function resolverLacos(m, g, wRef, sp) {
  const iv = intervaloDaTransicao(m, wRef, sp);
  if (!iv || g < iv.s0 - 1e-12 || g > iv.s1 + 1e-12) return null;
  let lo = iv.qMin, hi = iv.qMax;
  for (let it = 0; it < 100; it++) { const mid = (lo + hi) / 2; if (somaDeLacos(m, mid, wRef) < g) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/* o intervalo de g que alguma transição aceita, { de, ate } */
function limitesDaTransicao(wRef, sp) {
  let de = Infinity, ate = 0;
  for (let m = 1; m <= 24; m++) {
    const iv = intervaloDaTransicao(m, wRef, sp);
    if (!iv) continue;
    de = Math.min(de, iv.s0); ate = Math.max(ate, iv.s1);
  }
  return { de, ate };
}

/* os intervalos de g que alguma transição fecha, do menor para o maior, com os que se tocam juntos: [{ de, ate }] */
function intervalosDaTransicao(wRef, sp) {
  const todos = [];
  for (let m = 1; m <= 24; m++) { const iv = intervaloDaTransicao(m, wRef, sp); if (iv) todos.push({ de: iv.s0, ate: iv.s1 }); }
  todos.sort((a, b) => a.de - b.de);
  const juntos = [];
  for (const iv of todos) {
    const ultimoIv = juntos[juntos.length - 1];
    if (ultimoIv && iv.de <= ultimoIv.ate + 1e-12) ultimoIv.ate = Math.max(ultimoIv.ate, iv.ate); else juntos.push({ ...iv });
  }
  return juntos;
}

/* o maior espaçamento de grade que uma transição de wRef fecha em g, ou 0 se nem a grade mais fina fecha */
function maiorEspacamento(g, wRef) {
  if (!(limitesDaTransicao(wRef, wRef).de <= g)) return 0;
  let lo = wRef, hi = Math.max(wRef, g) * 64;
  for (let it = 0; it < 80; it++) { const mid = (lo + hi) / 2; if (limitesDaTransicao(wRef, mid).de <= g) lo = mid; else hi = mid; }
  return lo;
}

const viaveisDaTransicao = (it) => { const ms = []; for (let m = 1; m <= 24; m++) if (resolverLacos(m, it.g, it.wRef, it.sp) !== null) ms.push(m); return ms; };

/* graduarTodas(itens) -> { m, qs } com o menor m que fecha todos os lados, ou null. `itens` são { g, wRef, sp } por lado. */
function graduarTodas(itens) {
  const memo = new Map();
  for (let m = 1; m <= 24; m++) {
    const qs = []; let ok = true;
    for (const it of itens) {
      const k = `${m}|${it.g}|${it.wRef}|${it.sp}`;
      let q = memo.get(k);
      if (q === undefined) { q = resolverLacos(m, it.g, it.wRef, it.sp); memo.set(k, q); }
      if (q === null) { ok = false; break; }
      qs.push(q);
    }
    if (ok) return { m, qs };
  }
  return null;
}

/* o espaçamento de cada lado, trocado pela mediana quando a grade em volta é uniforme (varia até 5%), para a transição não
   ganhar ruído do comprimento das arestas na chapa curva */
function uniformizar(valores, mediana) {
  const bom = valores.filter((v) => v > 0);
  if (!bom.length) return valores.map(() => mediana);
  const media = bom.reduce((s, v) => s + v, 0) / bom.length;
  const fora = bom.some((v) => Math.abs(v - media) / media > UNIFORME);
  return fora ? valores.map((v) => (v > 0 ? v : media)) : valores.map(() => mediana);
}

/* ---------------------------------------------------------------- costura */

/* O alinhamento de menor distância entre o laço B (M pontos) e o laço R (N pontos) por faixa de quadriláteros: cada
   face avança (1, 1), tem um ponto de B e três de R (0, 2) ou três de B e um de R (2, 0). Devolve as faces em índices. */
function costurar(Bp, Rp, fechada, onde) {
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
  if (melhor < 0) falha(`${onde}: não fecha em quadriláteros, porque os dois laços têm um número de pontos de paridade diferente; a faixa de faces da grade ali tem triângulos ou pentágonos (uma região, uma fusão ou uma divisão de coluna perto do vão), então afaste o vão deles`);
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

/* As funções de medida sobre a chapa para o modelo de altura: o comprimento sobre a chapa do caminho que sai de `p` pelo plano na
   direção `dir` (Simpson, 8 partes) e o passo no plano cujo caminho mede `alvo` sobre a chapa. A largura declarada é medida na
   chapa, e a inclinação muda ao longo do recuo. */
function fabricarMetrica(modelo) {
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
  return { comprimentoSobreAChapa, passoNoPlano };
}

/* A faixa de faces da grade que um anel de recuo 0 troca: as faces que tocam a borda do vão e, a cada camada a mais, as que
   tocam as dessa. Devolve os índices delas, a borda de fora da faixa (`grade`, a grade em sequência, no mesmo sentido da borda
   do vão) e os pontos que ficam dentro da faixa e saem da gaiola. No vão que se abre na borda da chapa, a faixa também chega à
   borda livre: `cadeiaIni` e `cadeiaFim` são os pontos dessa borda, da ponta da borda do vão para fora, até a ponta da grade. */
function faixaEmVolta(nomes, fechada, faces, camadas, consumidas, onde, anel, pos) {
  const noVao = new Set(nomes);
  const naFaixa = new Set();
  const alcance = new Set(nomes);
  const camadasTexto = `${camadas} ${camadas > 1 ? 'camadas' : 'camada'}`;
  for (let c = 0; c < camadas; c++) {
    const novos = [];
    faces.forEach((f, i) => { if (!naFaixa.has(i) && f.some((p) => alcance.has(p))) novos.push(i); });
    for (const i of novos) { naFaixa.add(i); for (const p of faces[i]) alcance.add(p); }
  }
  for (const i of naFaixa) {
    if (consumidas.has(i)) falha(`${onde}: a faixa de ${camadasTexto} de faces em volta do vão ${citar(anel.vao)} inclui a face [${lista(faces[i])}], que já é do anel ${citar(consumidas.get(i))}; afaste os dois vãos, ou dê um recuo a um deles`);
  }
  const total = new Map();
  for (const f of faces) for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); total.set(c, (total.get(c) ?? 0) + 1); }
  const dentro = new Map(); const sentido = new Map();
  for (const i of naFaixa) {
    const f = faces[i];
    for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length]; const c = chave(a, b); dentro.set(c, (dentro.get(c) ?? 0) + 1); sentido.set(c, [a, b]); }
  }
  const doVao = new Set();
  for (let k = 0; k < (fechada ? nomes.length : nomes.length - 1); k++) doVao.add(chave(nomes[k], nomes[(k + 1) % nomes.length]));
  const exteriores = []; const livres = [];
  for (const [c, n] of dentro) {
    if (n !== 1 || doVao.has(c)) continue;
    const [a, b] = sentido.get(c);
    if (total.get(c) === 1) {
      if (fechada) falha(`${onde}: a faixa de ${camadasTexto} de faces em volta do vão ${citar(anel.vao)} chega à borda livre da chapa, ou a outro vão, em ${citar(a)} e ${citar(b)}; afaste o vão dessa borda, ou dê um recuo ao anel e declare o vão maior que a abertura`);
      livres.push([a, b]);
    } else exteriores.push([a, b]);
  }
  const proximo = new Map();
  for (const [a, b] of exteriores) {
    if (proximo.has(b)) falha(`${onde}: a faixa em volta do vão ${citar(anel.vao)} se bifurca no ponto ${citar(b)}; há uma região, uma estação parcial ou outro vão colado a ele`);
    proximo.set(b, a);
  }
  const grade = []; let cadeiaIni = null; let cadeiaFim = null;
  const semBordaDeFora = `${onde}: a faixa de faces em volta do vão ${citar(anel.vao)} não tem uma borda de fora só; há outro vão ou uma região a menos de ${camadasTexto} dele`;
  if (fechada) {
    if (exteriores.length) {
      const inicio = exteriores[0][1];
      let atual = inicio;
      do { grade.push(atual); atual = proximo.get(atual); } while (atual !== undefined && atual !== inicio && grade.length <= exteriores.length);
      if (atual !== inicio || grade.length !== exteriores.length) falha(semBordaDeFora);
    }
  } else {
    /* a borda livre que a faixa toca, no sentido da face: chega à ponta do fim da borda do vão e sai da ponta do começo */
    const adiante = new Map(); const atras = new Map();
    for (const [a, b] of livres) { adiante.set(a, b); atras.set(b, a); }
    const seguir = (inicio, mapa) => { const cadeia = [inicio]; for (let q = mapa.get(inicio); q !== undefined && cadeia.length <= livres.length + 1; q = mapa.get(q)) cadeia.push(q); return cadeia; };
    cadeiaFim = seguir(nomes[nomes.length - 1], adiante);
    cadeiaIni = seguir(nomes[0], atras);
    if (cadeiaFim.length < 2 || cadeiaIni.length < 2 || cadeiaFim.length + cadeiaIni.length - 2 !== livres.length) falha(`${onde}: a borda livre da chapa perto das pontas do vão ${citar(anel.vao)} não é uma cadeia só dentro da faixa de ${camadasTexto}; o vão que se abre na borda precisa terminar nela, longe de outro vão`);
    for (const cadeia of [cadeiaIni, cadeiaFim]) {
      for (let k = 1; k + 1 < cadeia.length; k++) {
        const a = pos(cadeia[k - 1]), b = pos(cadeia[k]), c = pos(cadeia[k + 1]);
        const u = sub(b, a), v = sub(c, b);
        if (dot(u, v) < 0.5 * norma(u) * norma(v)) falha(`${onde}: a faixa de ${camadasTexto} de faces em volta do vão ${citar(anel.vao)} chega a uma quina da borda livre da chapa, em ${citar(cadeia[k])}; afaste o vão da quina, ou dê um recuo ao anel e declare o vão maior que a abertura`);
      }
    }
    const inicio = cadeiaIni[cadeiaIni.length - 1];
    let atual = inicio;
    while (atual !== undefined && grade.length <= exteriores.length) { grade.push(atual); atual = proximo.get(atual); }
    if (grade.length !== exteriores.length + 1 || grade[grade.length - 1] !== cadeiaFim[cadeiaFim.length - 1]) falha(semBordaDeFora);
  }
  const naGrade = new Set(grade);
  const interiores = [...alcance].filter((p) => !noVao.has(p) && !naGrade.has(p));
  return { indices: [...naFaixa], grade, interiores, alcance, cadeiaIni, cadeiaFim, camadas };
}

/**
 * construirUm(anel, borda, contexto, consumidas, semSugestao) -> { pontos, voltas, costuras, faces, borda, ... }
 * `borda` é { nomes, fechada } com os nomes em sequência (a chapa à esquerda, vista de fora); `contexto` dá `pos(nome)`,
 * as `faces` finais da grade, o `vizinhoLivre(ponto, nomesDaBorda)` para a ponta da borda aberta, `limitesDoVao(vao)`,
 * `ladoDaAresta(vao, a, b)` e `localizar(ponto)`. `consumidas` guarda as faces que os anéis de recuo 0 já trocaram.
 */
function construirUm(anel, borda, contexto, consumidas, semSugestao = false) {
  const onde = `o anel ${citar(anel.nome)}`;
  const { pos, faces } = contexto;
  const fechada = borda.fechada;
  const fora = anel.fora;
  let nomes = [...borda.nomes];
  if (fechada && nomes[0] === nomes[nomes.length - 1]) nomes.pop();
  const quadro = quadroDaBorda(nomes, pos, faces, onde);
  const { N, e1, e2, o, local } = quadro;
  const Lb = nomes.map((p) => local(pos(p)));
  const sinal = (P) => { let a = 0; for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  if (fechada && !(sinal(Lb) < 0)) falha(`${onde}: a borda do vão ${citar(anel.vao)} percorre a chapa à direita; a borda precisa seguir com a chapa à esquerda, vista de fora`);

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
  const E = nu.length;
  const entrada = (i) => (fechada ? (i - 1 + M) % M : i - 1);
  const viradasP = viradas(P, fechada);
  const nomeDaAresta = (e) => [nomes[e], nomes[(e + 1) % M]];
  /* esquina: a borda vira em cantoGraus ou mais (para qualquer lado); canto: esquina que vira para dentro do vão, que
     com `raio` ganha um arco; com recuo 0 todo canto ganha o arco da distância à abertura */
  const esquina = P.map((_, i) => (!fechada && (i === 0 || i === M - 1)) || Math.abs(viradasP[i]) >= cantoRad);
  for (const ponto of Object.keys(anel.raios)) {
    const k = nomes.indexOf(ponto);
    if (k < 0 || !esquina[k]) falha(`${onde}: raios cita ${citar(ponto)}, que não é canto da borda do vão ${citar(anel.vao)}; os cantos são ${lista(nomes.filter((_, i) => esquina[i]))}`);
  }
  const raiosDosCantos = nomes.map((nm) => anel.raios[nm] ?? anel.raio);
  const cantos = P.map((_, i) => ((fora && anel.arredondar) || raiosDosCantos[i] > 0) && !(!fechada && (i === 0 || i === M - 1)) && viradasP[i] < 0 && -viradasP[i] >= cantoRad);
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

  /* ---- onde a abertura fica: o recuo de cada lado, ou a faixa de faces que o anel troca, e a transição até a grade ---- */
  const afastamentos = [0];
  for (const w of anel.larguras) afastamentos.push(afastamentos[afastamentos.length - 1] + w / MM);
  const ultimo = afastamentos[afastamentos.length - 1];
  const larguraDaUltima = anel.larguras.length ? anel.larguras[anel.larguras.length - 1] / MM : null;
  const wRefDe = (sp) => larguraDaUltima ?? sp / 8;
  const planejarCom = (T, espacos) => {
    const itens = T.map((Te, e) => ({ g: Te - ultimo, wRef: wRefDe(espacos[e]), sp: espacos[e] }));
    return { itens, plano: graduarTodas(itens) };
  };
  /* a transição acompanha o espaçamento de cada trecho; se nenhum número de laços serve a todos os trechos, a grade irregular cai na
     mediana do espaçamento, como a transição de uma grade uniforme, e só grita se nem a mediana serve (com a explicação por trecho) */
  const planejar = (T, espacos) => {
    const r = planejarCom(T, espacos);
    if (r.plano || espacos.every((v) => v === quadro.espacamento)) return r;
    const uniforme = planejarCom(T, espacos.map(() => quadro.espacamento));
    return uniforme.plano ? uniforme : r;
  };

  /* o texto de onde fica a aresta e o que acrescentar à grade ali, nos nomes de estação e coluna do modelador */
  const lugar = (e) => {
    const [a, b] = nomeDaAresta(e); const la = contexto.localizar(a), lb = contexto.localizar(b);
    if (la && lb && la.coluna === lb.coluna) return `ao longo da coluna ${citar(la.coluna)}, entre as estações ${citar(la.estacao)} e ${citar(lb.estacao)}`;
    if (la && lb && la.estacao === lb.estacao) return `ao longo da estação ${citar(la.estacao)}, entre as colunas ${citar(la.coluna)} e ${citar(lb.coluna)}`;
    return `entre ${citar(a)} e ${citar(b)}`;
  };
  const acrescentar = (e) => {
    const [a, b] = nomeDaAresta(e); const la = contexto.localizar(a), lb = contexto.localizar(b);
    if (!la || !lb) return null;
    for (const f of faces) {
      for (let k = 0; k < f.length; k++) {
        if (f[k] !== a || f[(k + 1) % f.length] !== b) continue;
        const va = contexto.localizar(f[(k - 1 + f.length) % f.length]);
        if (!va) return null;
        if (la.coluna === lb.coluna && va.coluna !== la.coluna) return `acrescente uma coluna entre ${citar(la.coluna)} e ${citar(va.coluna)}, nas estações ${citar(la.estacao)} e ${citar(lb.estacao)}`;
        if (la.estacao === lb.estacao && va.estacao !== la.estacao) return `acrescente uma estação entre ${citar(la.estacao)} e ${citar(va.estacao)}, nas colunas ${citar(la.coluna)} e ${citar(lb.coluna)}`;
        return null;
      }
    }
    return null;
  };
  /* o lado da borda (coluna, estação ou a aresta solta) a que uma aresta pertence, para a mensagem falar de um lado por vez */
  const ladoDe = (e) => {
    const [a, b] = nomeDaAresta(e); const la = contexto.localizar(a), lb = contexto.localizar(b);
    if (la && lb && la.coluna === lb.coluna) return `coluna:${la.coluna}`;
    if (la && lb && la.estacao === lb.estacao) return `estacao:${la.estacao}`;
    return `aresta:${a}:${b}`;
  };
  /* a mensagem de uma transição que não fecha: cada lado que não cabe, com o que mudar */
  const explicar = (itens, T, destino) => {
    const ruins = itens.map((it, e) => ({ it, e })).filter(({ it }) => viaveisDaTransicao(it).length === 0);
    if (ruins.length) {
      const grupos = new Map();
      for (const r of ruins) { const k = ladoDe(r.e); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r); }
      const nomeDoLado = (k) => (k.startsWith('coluna:') ? `a coluna ${citar(k.slice(7))}` : k.startsWith('estacao:') ? `a estação ${citar(k.slice(8))}` : null);
      /* cada lado diz o seu trecho pior; lados com os mesmos números saem juntos */
      const porNumeros = new Map();
      for (const [k, lote] of grupos) {
        /* o trecho pior do lado: o que mais falta (ou mais sobra) em relação ao que a transição aceita */
        const folga = ({ it }) => { const { de, ate } = limitesDaTransicao(it.wRef, it.sp); return it.g < de ? it.g / de : ate / it.g; };
        const { it, e } = lote.reduce((p, q) => (folga(q) < folga(p) ? q : p));
        const assinatura = `${mm1(it.g)}|${mm1(it.sp)}|${mm1(it.wRef)}`;
        if (!porNumeros.has(assinatura)) porNumeros.set(assinatura, []);
        porNumeros.get(assinatura).push({ k, lote, it, e });
      }
      const partes = [];
      for (const grupo of [...porNumeros.values()].slice(0, 3)) {
        const { it, e, lote } = grupo[0];
        const intervalos = intervalosDaTransicao(it.wRef, it.sp);
        const { de, ate } = limitesDaTransicao(it.wRef, it.sp);
        const iguais = grupo.slice(1).map(({ k }) => nomeDoLado(k)).filter(Boolean);
        const ondeTexto = `${lugar(e)}${lote.length > 1 ? ` (e mais ${lote.length - 1} ${lote.length > 2 ? 'trechos' : 'trecho'} desse lado)` : ''}${iguais.length ? `, e também ${iguais.join(', ')},` : ''}`;
        const lado = iguais.length ? 'desses lados' : 'desse lado';
        const afinar = acrescentar(e) ?? 'afine a grade ali';
        let texto;
        if (it.g <= 0) {
          texto = `${ondeTexto} a última volta, a ${mm1(ultimo)} mm da abertura, já passa d${fora ? 'a grade' : 'a borda do vão'}, que fica a ${mm1(ultimo + it.g)} mm; reduza as voltas ou a largura delas${fora ? '' : `, ou aumente o recuo ${lado} para pelo menos ${mm1(ultimo + de)} mm`}`;
        } else {
          texto = `${ondeTexto} sobram ${mm1(it.g)} mm entre a última volta (a ${mm1(ultimo)} mm da abertura) e ${destino(e)}, e as arestas da grade ali medem ${mm1(it.sp)} mm`;
          if (it.g < de) {
            const cabe = maiorEspacamento(it.g, it.wRef);
            texto += `; a transição pede ${mm1(de)} mm ou mais`;
            texto += cabe > 0
              ? `; ${fora ? '' : `aumente o recuo ${lado} para pelo menos ${mm1(ultimo + de)} mm, ou `}${afinar}: a aresta da grade precisa medir ${mm1(cabe)} mm ou menos ali, e mede ${mm1(it.sp)} mm`
              : `; nem a grade mais fina fecha ${mm1(it.g)} mm depois de uma volta de ${mm1(it.wRef)} mm, então reduza as voltas ou a largura delas${fora ? '' : `, ou aumente o recuo para pelo menos ${mm1(ultimo + de)} mm`}`;
          } else if (it.g > ate) {
            texto += `; a transição fecha até ${mm1(ate)} mm`;
            texto += `; ${fora ? 'a grade ali é larga demais para as voltas: acrescente voltas, alargue-as ou afine a grade ali' : `reduza o recuo ${lado} para no máximo ${mm1(ultimo + ate)} mm`}`;
          } else {
            const abaixo = [...intervalos].reverse().find((iv) => iv.ate < it.g), acima = intervalos.find((iv) => iv.de > it.g);
            texto += `; a transição fecha ${abaixo ? `de ${mm1(abaixo.de)} a ${mm1(abaixo.ate)} mm` : ''}${abaixo && acima ? ' ou ' : ''}${acima ? `a partir de ${mm1(acima.de)} mm` : ''}, e não os ${mm1(it.g)} mm daqui`;
            texto += fora
              ? `; ${afinar}, ou mude o número de camadas (camadas: n)`
              : `; ponha o recuo ${lado} ${abaixo ? `em ${mm1(ultimo + abaixo.ate)} mm ou menos` : ''}${abaixo && acima ? ', ou ' : ''}${acima ? `em ${mm1(ultimo + acima.de)} mm ou mais` : ''}, ou ${afinar}`;
          }
        }
        partes.push(texto);
      }
      return `a transição das voltas até a grade não fecha: ${partes.join('; ')}${porNumeros.size > partes.length ? `; e mais ${porNumeros.size - partes.length} ${porNumeros.size - partes.length > 1 ? 'casos' : 'caso'}` : ''}`;
    }
    const porLado = new Map();
    itens.forEach((it, e) => { const l = ladoDe(e); const ms = viaveisDaTransicao(it); if (!porLado.has(l)) porLado.set(l, { e, ms }); else porLado.get(l).ms = porLado.get(l).ms.filter((m) => ms.includes(m)); });
    const textos = [...porLado.values()].slice(0, 4).map(({ e, ms }) => `${lugar(e)} aceita ${ms.length === 0 ? 'nenhum número comum de' : ms.length > 3 ? `${ms[0]} a ${ms[ms.length - 1]}` : ms.join(' ou ')} laços`);
    return `os lados da borda pedem números diferentes de laços de transição e a transição usa o mesmo número em todos: ${textos.join('; ')}; aproxime ${fora ? 'os espaçamentos da grade' : 'os recuos e os espaçamentos da grade'} entre eles`;
  };

  let T; let espacos; let plano; let itens; let faixa = null; let modelo;
  if (!fora) {
    const limites = contexto.limitesDoVao(anel.vao);
    const nomesDosLados = [...limites.colunas, ...limites.estacoes];
    if (anel.lados) {
      for (const k of Object.keys(anel.lados)) {
        if (k !== 'padrao' && !nomesDosLados.includes(k)) falha(`${onde}: o recuo cita o lado ${citar(k)}, que não é limite do vão ${citar(anel.vao)}; os lados são as colunas ${lista(limites.colunas)} e as estações ${lista(limites.estacoes)}, mais padrao`);
        if (k !== 'padrao' && limites.colunas.includes(k) && limites.estacoes.includes(k)) falha(`${onde}: ${citar(k)} é nome de coluna e de estação do vão ${citar(anel.vao)}, e o recuo por lado não distingue; renomeie uma delas`);
      }
    }
    T = Array.from({ length: E }, (_, e) => {
      if (!anel.lados) return anel.recuo / MM;
      const [a, b] = nomeDaAresta(e);
      const lado = contexto.ladoDaAresta(anel.vao, a, b);
      const valor = lado !== null && lado in anel.lados ? anel.lados[lado] : anel.lados.padrao;
      if (valor === undefined) falha(`${onde}: o recuo não diz o lado ${lado !== null ? citar(lado) : `da aresta entre ${citar(a)} e ${citar(b)}`} do vão ${citar(anel.vao)}; declare recuo: { ${nomesDosLados.map((n) => `${n}: mm`).join(', ')} } ou acrescente padrao`);
      return valor / MM;
    });
    espacos = uniformizar(Array.from({ length: E }, (_, e) => {
      const [a, b] = nomeDaAresta(e);
      const v = [quadro.espacoDe(a), quadro.espacoDe(b)].filter((x) => x != null);
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : quadro.espacamento;
    }), quadro.espacamento);
    ({ itens, plano } = planejar(T, espacos));
    modelo = superficieLocal(quadro.suporte.map((p) => local(pos(p))));
    if (!plano) {
      const recuoTexto = anel.lados ? 'os recuos' : `o recuo de ${anel.recuo} mm`;
      falha(`${onde}: com ${recuoTexto} da borda do vão ${citar(anel.vao)}, ${explicar(itens, T, (e) => `a borda do vão (recuo de ${mm1(T[e])} mm)`)}`);
    }
  } else {
    const falhas = [];
    const tentativas = anel.camadas ? [anel.camadas] : Array.from({ length: CAMADAS_MAXIMAS }, (_, k) => k + 1);
    for (const L of tentativas) {
      let f;
      try { f = faixaEmVolta(nomes, fechada, faces, L, consumidas, onde, anel, pos); } catch (erro) {
        if (!falhas.length) throw erro;
        falhas.push({ L, erro: erro.message.replace(/^gaiola por estações: /, '') }); break;
      }
      const noFaixa = new Set(f.indices);
      const alem = new Set();
      faces.forEach((fc, i) => { if (!noFaixa.has(i) && fc.some((p) => f.grade.includes(p))) for (const p of fc) alem.add(p); });
      const mod = superficieLocal(quadroDaBorda(nomes, pos, faces, onde, [...f.alcance, ...alem]).suporte.map((p) => local(pos(p))));
      const { comprimentoSobreAChapa } = fabricarMetrica(mod);
      const G = f.grade.map((p) => { const q = local(pos(p)); return [q[0], q[1]]; });
      const trechosDeG = fechada ? G.length : G.length - 1;
      /* o espaçamento da grade que sai de cada ponto da borda de fora da faixa, para fora dela */
      const esp = new Map();
      for (const p of f.grade) {
        const ls = [];
        faces.forEach((fc, i) => {
          if (noFaixa.has(i)) return;
          const k = fc.indexOf(p); if (k < 0) return;
          for (const w of [fc[(k + 1) % fc.length], fc[(k - 1 + fc.length) % fc.length]]) if (!f.alcance.has(w)) ls.push(norma(sub(pos(p), pos(w))));
        });
        esp.set(p, ls.length ? ls.reduce((s, x) => s + x, 0) / ls.length : quadro.espacamento);
      }
      const Tl = []; const sp = []; let semFechar = null;
      for (let e = 0; e < E; e++) {
        const meio = [(P[e][0] + P[(e + 1) % M][0]) / 2, (P[e][1] + P[(e + 1) % M][1]) / 2];
        const esq = [-nu[e][0], -nu[e][1]];
        let melhor = Infinity; let acerto = -1;
        for (let k = 0; k < trechosDeG; k++) {
          const u = G[k], v = G[(k + 1) % G.length];
          const d = [v[0] - u[0], v[1] - u[1]];
          const den = esq[0] * d[1] - esq[1] * d[0];
          if (Math.abs(den) < 1e-12) continue;
          const w = [u[0] - meio[0], u[1] - meio[1]];
          const s = (w[0] * d[1] - w[1] * d[0]) / den;
          const r = (w[0] * esq[1] - w[1] * esq[0]) / den;
          if (s > 0 && r >= -1e-9 && r <= 1 + 1e-9 && s < melhor) { melhor = s; acerto = k; }
        }
        if (acerto < 0) { semFechar = `a faixa de faces em volta do vão ${citar(anel.vao)} não fecha ao redor da aresta ${citar(nomeDaAresta(e)[0])} a ${citar(nomeDaAresta(e)[1])}`; break; }
        Tl.push(comprimentoSobreAChapa(meio, esq, melhor));
        sp.push((esp.get(f.grade[acerto]) + esp.get(f.grade[(acerto + 1) % f.grade.length])) / 2);
      }
      if (semFechar) {
        if (!falhas.length) falha(`${onde}: ${semFechar}`);
        falhas.push({ L, erro: semFechar }); break;
      }
      const espL = uniformizar(sp, quadro.espacamento);
      const r = planejar(Tl, espL);
      if (r.plano) { faixa = f; T = Tl; espacos = espL; itens = r.itens; plano = r.plano; modelo = mod; break; }
      falhas.push({ L, T: Tl, itens: r.itens });
    }
    if (!faixa) {
      const ultima = falhas[falhas.length - 1];
      const primeira = falhas[0];
      const camadasTexto = (L) => `${L} ${L > 1 ? 'camadas' : 'camada'} de faces`;
      const partes = [];
      if (ultima.itens) partes.push(`com ${camadasTexto(ultima.L)} em volta do vão ${citar(anel.vao)}, ${explicar(ultima.itens, ultima.T, (e) => `a grade (a ${mm1(ultima.T[e])} mm da abertura)`)}`);
      else partes.push(`com ${camadasTexto(primeira.L)}, ${explicar(primeira.itens, primeira.T, (e) => `a grade (a ${mm1(primeira.T[e])} mm da abertura)`)}; com mais camadas, ${ultima.erro}`);
      falha(`${onde}: ${partes.join('; ')}`);
    }
    for (const i of faixa.indices) consumidas.set(i, anel.nome);
  }
  const { comprimentoSobreAChapa, passoNoPlano } = fabricarMetrica(modelo);

  /* os laços, da borda do vão (ou da grade) para a abertura: a transição e depois as voltas K, ..., 1 (com recuo 0 a volta 1
     é a própria borda do vão e não é laço novo) */
  const transicoes = [];
  { let acumulado = T.map(() => ultimo);
    for (let j = 0; j < plano.m; j++) {
      const af = acumulado.map((d, e) => d + itens[e].wRef * plano.qs[e] ** (j + 1));
      acumulado = af; transicoes.push({ rotulo: `c${j + 1}`, af, relevo: 0 });
    } }
  /* o último laço de transição é a borda do vão; o que fica antes dela é o que o anel acrescenta */
  transicoes.pop();
  const lacos = [
    ...transicoes.reverse(),
    ...afastamentos.map((d, k) => ({ rotulo: `a${k + 1}`, volta: k + 1, af: Array.from({ length: E }, () => d), relevo: anel.relevo[k] / MM })).filter((l) => !(fora && l.volta === 1)).reverse(),
  ];
  const lacunaDe = (i) => (T[entrada(i)] + T[i % E]) / 2;
  const raioDe = (i, af) => {
    const ri = raiosDosCantos[i] / MM;
    if (!fora && !(ri > 0)) return 0;
    if (af <= ultimo + 1e-12) return ri + af;
    const Ti = lacunaDe(i);
    /* com recuo 0 o raio parte da própria distância à abertura, que não é zero nem com uma volta só */
    if (fora) return af * (Ti - af) / (Ti - ultimo);
    return (ri + ultimo) * (Ti - af) / (Ti - ultimo);
  };

  /* segmentos do arco de cada canto: `segmentos` por quarto de volta, em número par */
  const nDoArco = phis.map((phi) => {
    if (phi === 0) return 0;
    const n = Math.round(-phi / (Math.PI / 2) * anel.segmentos);
    /* mais de `segmentos` segmentos põem mais de um deslocamento no mesmo ponto da borda, e a valência sobe a 6: o canto de mais de 90 graus fica com os mesmos segmentos do de 90 */
    return Math.min(anel.segmentos, Math.max(2, n + (n % 2)));
  });

  /* a borda livre na ponta de um caminho aberto, prolongada para dentro do vão: a parábola pelos dois pontos livres de
     antes e pela ponta, porque a reta no plano sairia da borda curva da chapa */
  let pontaIni = null, pontaFim = null;
  if (!fechada && fora) {
    /* com recuo 0 o laço sai da ponta da borda do vão pela borda livre da chapa, para fora do vão: a poligonal da borda da grade */
    const cadeiaDaBorda = (cadeia) => {
      const C = cadeia.map((p) => { const q = local(pos(p)); return [q[0], q[1]]; });
      const acum = [0];
      for (let k = 1; k < C.length; k++) acum.push(acum[k - 1] + Math.hypot(C[k][0] - C[k - 1][0], C[k][1] - C[k - 1][1]));
      const trecho = (tau) => { let k = 0; while (k < C.length - 2 && tau > acum[k + 1]) k++; return k; };
      const ponto = (tau) => { const k = trecho(tau); const f = (tau - acum[k]) / (acum[k + 1] - acum[k]); return [C[k][0] + f * (C[k + 1][0] - C[k][0]), C[k][1] + f * (C[k + 1][1] - C[k][1])]; };
      const derivada = (tau) => { const k = trecho(tau); return unit2([C[k + 1][0] - C[k][0], C[k + 1][1] - C[k][1]]); };
      return { u: derivada(0), ponto, derivada };
    };
    pontaIni = cadeiaDaBorda(faixa.cadeiaIni); pontaFim = cadeiaDaBorda(faixa.cadeiaFim);
    pontaIni.den = dot2(pontaIni.u, nu[0]); pontaFim.den = dot2(pontaFim.u, nu[M - 2]);
    if (!(pontaIni.den < -0.2) || !(pontaFim.den < -0.2)) falha(`${onde}: a borda livre da chapa na ponta da borda do vão ${citar(anel.vao)} não se afasta do vão; confira a ordem das estações e colunas`);
  } else if (!fechada) {
    const livre = (ponto) => {
      const q1 = contexto.vizinhoLivre(ponto, nomes);
      if (!q1) falha(`${onde}: a ponta ${citar(ponto)} da borda do vão ${citar(anel.vao)} não encontra a aresta livre da chapa; o vão que se abre na borda precisa terminar nela`);
      const q2 = contexto.vizinhoLivre(q1, [ponto]);
      const l0 = local(pos(ponto)), l1 = local(pos(q1));
      const plano2 = (l) => [l[0], l[1]];
      const A = q2 ? plano2(local(pos(q2))) : null, B1 = plano2(l1), C0 = plano2(l0);
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

  /* os vértices de um laço, no plano: o recuo de cada vértice pela bissetriz e os arcos dos cantos */
  const lacoNoPlano = (laco) => {
    /* a distância de cada lado da borda do vão ao laço, para dentro do vão (para fora dele, negativa, com recuo 0) */
    const dE = laco.af.map((af, e) => (fora ? -af : T[e] - af));
    const afDoCanto = (i) => (laco.af[entrada(i)] + laco.af[i % E]) / 2;
    const X = P.map((p, i) => {
      /* a distância declarada vale para os dois lados que se encontram no vértice, medida sobre a chapa a partir do pé do
         ponto recuado em cada lado: duas iterações acertam o pé, que anda com o ponto */
      const dos = (dd, n, tl, x0) => {
        const w = [x0[0] - p[0], x0[1] - p[1]]; const c = w[0] * tl[0] + w[1] * tl[1];
        return passoNoPlano([p[0] + c * tl[0], p[1] + c * tl[1]], n, dd);
      };
      if (!fechada && (i === 0 || i === M - 1)) {
        const ponta = i === 0 ? pontaIni : pontaFim; const j = i === 0 ? 0 : M - 2;
        /* tau é o passo ao longo da borda livre que leva o ponto à distância certa do lado da borda do vão */
        let tau = dE[j] / ponta.den; let x = ponta.ponto(tau);
        for (let it = 0; it < 4; it++) {
          const alvo = dos(dE[j], nu[j], t[j], x);
          const f = nu[j][0] * (x[0] - p[0]) + nu[j][1] * (x[1] - p[1]) - alvo;
          const dv = ponta.derivada(tau);
          tau -= f / (nu[j][0] * dv[0] + nu[j][1] * dv[1]);
          x = ponta.ponto(tau);
        }
        return x;
      }
      const ea = entrada(i), eb = i % nu.length;
      const a = nu[ea], b = nu[eb];
      const den = 1 + dot2(a, b);
      if (!(den > 0.15)) falha(`${onde}: a borda do vão ${citar(anel.vao)} vira mais de 130 graus em ${citar(nomes[i])}; o recuo não tem esquadria`);
      const bis = unit2([a[0] + b[0], a[1] + b[1]]);
      const m = Math.hypot(a[0] + b[0], a[1] + b[1]) / den;
      const s0 = passoNoPlano(p, bis, (dE[ea] + dE[eb]) / 2 * m);
      let x = [p[0] + s0 * bis[0], p[1] + s0 * bis[1]];
      const det = a[0] * b[1] - a[1] * b[0];
      if (Math.abs(det) > 0.17) {
        for (let it = 0; it < 3; it++) {
          const s1 = dos(dE[ea], a, t[ea], x), s2 = dos(dE[eb], b, t[eb], x);
          x = [p[0] + (s1 * b[1] - s2 * a[1]) / det, p[1] + (a[0] * s2 - b[0] * s1) / det];
        }
      }
      return x;
    });
    const Y = X.map((q) => [...q]);
    /* o arco de cada canto, desenhado com o raio medido sobre a chapa: no plano, a direção da inclinação encolhe pelo fator da métrica */
    const arcos = P.map((_, i) => {
      if (!cantos[i]) return null;
      const rho = raioDe(i, afDoCanto(i));
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
    if (fora) {
      /* com recuo 0 o laço anda para fora da borda: os pontos dos lados ficam no pé de cada ponto da borda, sem se redistribuir, e
         o arco do canto tem as pontas nesses pés */
      for (let e = 0; e < E; e++) {
        const a = e, b = (e + 1) % M;
        const pa = arcos[a] ? arcos[a].pts[arcos[a].pts.length - 1] : Y[a];
        const pb = arcos[b] ? arcos[b].pts[0] : Y[b];
        if (!((pb[0] - pa[0]) * t[e][0] + (pb[1] - pa[1]) * t[e][1] > MARGEM)) {
          falha(`${onde}: o laço a ${mm1(laco.af[e])} mm da abertura se cruza ao longo da aresta ${citar(nomes[a])} a ${citar(nomes[b])} do vão ${citar(anel.vao)}, porque a borda vira para dentro da chapa nesse trecho; reduza as voltas ou a largura delas`);
        }
      }
    } else {
      const tangente = P.map((_, i) => (arcos[i] ? arcos[i].sai : 0));
      const tangenteB = P.map((_, i) => (arcos[i] ? arcos[i].entra : 0));
      for (const { a, b, meio } of corridas) {
        const a0 = nomes[a], b0 = nomes[b];
        const dir = unit2([P[b][0] - P[a][0], P[b][1] - P[a][1]]);
        const ao = (q, ref) => (q[0] - ref[0]) * dir[0] + (q[1] - ref[1]) * dir[1];
        const comprimentoB = ao(P[b], P[a]);
        const xa = ao(X[a], P[a]), xb = ao(X[b], P[a]);
        const total = xb - xa;
        if (!(total > MARGEM)) falha(`${onde}: o laço a ${(laco.af[a] * MM).toFixed(1)} mm da abertura passa da largura do vão ${citar(anel.vao)} entre ${citar(a0)} e ${citar(b0)}; reduza o recuo`);
        /* os pontos do lado se redistribuem pela mesma fração da corrida: a esquina recuada anda ao longo do lado */
        const novos = meio.map((k) => ao(P[k], P[a]) / comprimentoB * total + xa);
        const primeiro = meio.length ? novos[0] - xa : total, ultimoLado = meio.length ? xb - novos[novos.length - 1] : total;
        const falta = meio.length ? (primeiro - tangente[a] < MARGEM || ultimoLado - tangenteB[b] < MARGEM) : tangente[a] + tangenteB[b] > total - MARGEM;
        if (falta) {
          const soEsquinas = !meio.length;
          const culpados = soEsquinas ? [a, b] : [tangente[a] >= tangenteB[b] ? a : b];
          const quais = culpados.map((c) => citar(nomes[c]));
          const afirmacao = `no laço a ${(laco.af[a] * MM).toFixed(1)} mm da abertura o raio dos cantos não cabe entre ${citar(a0)} e ${citar(b0)}: ${soEsquinas
            ? `os dois cantos pedem ${(tangente[a] * MM).toFixed(1)} e ${(tangenteB[b] * MM).toFixed(1)} mm de lado e o lado entre eles tem ${(total * MM).toFixed(1)} mm`
            : `o canto pede ${(Math.max(tangente[a], tangenteB[b]) * MM).toFixed(1)} mm de lado e o primeiro ponto do lado fica a ${(Math.min(primeiro, ultimoLado) * MM).toFixed(1)} mm`}`;
          if (semSugestao) falha(`${onde}: ${afirmacao}`);
          /* o raio que cabe, em milímetro inteiro, achado refazendo o anel com o raio dos cantos culpados cada vez menor e, se isso não basta
             porque outro canto também não cabe, com o raio de todos eles */
          const refaz = (ajuste) => { try { construirUm(ajuste, borda, contexto, consumidas, true); return true; } catch (erro) { return false; } };
          const soOsCulpados = (rr) => { const raios = { ...anel.raios }; for (const c of culpados) raios[nomes[c]] = Math.min(raiosDosCantos[c], rr); return { ...anel, raios }; };
          const todos = (rr) => ({ ...anel, raio: Math.min(anel.raio, rr), raios: Object.fromEntries(Object.entries(anel.raios).map(([k, v]) => [k, Math.min(v, rr)])) });
          const maior = (monta, teto) => { let lo = 0, hi = teto - 1; while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (refaz(monta(mid))) lo = mid; else hi = mid - 1; } return lo; };
          const tetoDosCulpados = Math.floor(Math.max(...culpados.map((c) => raiosDosCantos[c])));
          const tetoDeTodos = Math.floor(Math.max(anel.raio, ...Object.values(anel.raios)));
          let sugestao;
          if (refaz(soOsCulpados(0))) {
            const lo = maior(soOsCulpados, tetoDosCulpados);
            sugestao = `reduza o raio ${culpados.length > 1 ? 'dos cantos' : 'do canto'} ${quais.join(' e ')} para ${lo} mm ou menos (raios: { ${culpados.map((c) => `${citar(nomes[c])}: ${lo}`).join(', ')} }), ou ponha pontos na borda do vão`;
          } else if (refaz(todos(0))) {
            const lo = maior(todos, tetoDeTodos);
            sugestao = `reduza o raio do anel para ${lo} mm ou menos (raio: ${lo}), porque outros cantos também não cabem, ou ponha pontos na borda do vão`;
          } else sugestao = `nem o canto vivo cabe; ponha pontos na borda do vão entre ${citar(a0)} e ${citar(b0)}`;
          falha(`${onde}: ${afirmacao}; ${sugestao}`);
        }
        /* o recuo de cada ponto do lado se mede a partir do pé dele na borda, na altura nova ao longo do lado, porque a
           inclinação muda ao longo da corrida */
        const sequencia = [a, ...meio, b];
        const ao0 = sequencia.map((k) => ao(P[k], P[a]));
        meio.forEach((k, j) => {
          const alvo = novos[j];
          let h = 0; while (h + 2 < ao0.length && ao0[h + 1] < alvo) h++;
          const u = P[sequencia[h]], v = P[sequencia[h + 1]];
          const f = ao0[h + 1] > ao0[h] ? Math.min(1, Math.max(0, (alvo - ao0[h]) / (ao0[h + 1] - ao0[h]))) : 0;
          const pe = [u[0] + f * (v[0] - u[0]), u[1] + f * (v[1] - u[1])];
          const dl = unit2([v[0] - u[0], v[1] - u[1]]);
          const normal = [dl[1], -dl[0]];
          const passo = passoNoPlano(pe, normal, dE[sequencia[h]]);
          Y[k] = [pe[0] + passo * normal[0], pe[1] + passo * normal[1]];
        });
      }
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

  /* o vão que se abre no plano de simetria: as pontas dos laços ficam sobre o plano, e o ajuste da altura as tira dele por micra */
  if (!fechada && contexto.simetria === 'x') {
    const noPlano = (n) => Math.abs(pos(n)[0]) <= 1e-9;
    const pontaNoPlano = (ponto, cadeia) => (cadeia ? cadeia.every(noPlano) : noPlano(ponto) && noPlano(contexto.vizinhoLivre(ponto, nomes) ?? ponto));
    const ini = pontaNoPlano(nomes[0], faixa?.cadeiaIni), fim = pontaNoPlano(nomes[M - 1], faixa?.cadeiaFim);
    for (const laco of nomesDosLacos) {
      if (ini) pontos[laco[0]][0] = 0;
      if (fim) pontos[laco[laco.length - 1]][0] = 0;
    }
  }

  /* a faixa da borda ao primeiro laço, as faixas entre os laços e, com recuo 0, a faixa do último laço à abertura */
  const posDe = (ns) => ns.map((n) => (n in pontos ? pontos[n] : pos(n)));
  const facesNovas = [];
  const costurarPares = (fora_, dentro, ondeFica) => {
    const costura = costurar(posDe(fora_), posDe(dentro), fechada, `${onde}: a costura ${ondeFica} (${fora_.length} e ${dentro.length} pontos)`);
    for (const f of costura) facesNovas.push(f.map(([lado, i]) => (lado === 'B' ? fora_[i] : dentro[i])));
  };
  let grade = null;
  if (!fora) {
    costurarPares(nomes, nomesDosLacos[0], 'do anel à borda do vão');
  } else {
    grade = [...faixa.grade];
    const primeiroDentro = nomesDosLacos.length ? nomesDosLacos[0] : nomes;
    if (fechada) {
      const alvo = posDe(primeiroDentro)[0];
      let j0 = 0; let melhorD = Infinity;
      grade.forEach((g, j) => { const d = norma(sub(pos(g), alvo)); if (d < melhorD) { melhorD = d; j0 = j; } });
      grade = [...grade.slice(j0), ...grade.slice(0, j0)];
    }
    costurarPares(grade, primeiroDentro, 'do anel à grade');
  }
  const Nr = nomesDosLacos.length ? nomesDosLacos[0].length : 0;
  for (let k = 0; k + 1 < nomesDosLacos.length; k++) {
    const a = nomesDosLacos[k], b = nomesDosLacos[k + 1];
    const Ek = fechada ? Nr : Nr - 1;
    for (let j = 0; j < Ek; j++) facesNovas.push([a[(j + 1) % Nr], a[j], b[j], b[(j + 1) % Nr]]);
  }
  if (fora && nomesDosLacos.length) {
    const ultimoLaco = nomesDosLacos[nomesDosLacos.length - 1];
    if (ultimoLaco.length === nomes.length) {
      const Ek = fechada ? nomes.length : nomes.length - 1;
      for (let j = 0; j < Ek; j++) facesNovas.push([ultimoLaco[(j + 1) % nomes.length], ultimoLaco[j], nomes[j], nomes[(j + 1) % nomes.length]]);
    } else costurarPares(ultimoLaco, nomes, 'do anel à borda do vão');
  }
  /* toda face do anel segue o sentido das faces da grade; a que sai ao contrário é o laço que se cruza, num canto onde os dois lados pedem transições muito diferentes */
  for (const f of facesNovas) {
    if (!(dot(newell(posDe(f)), N) > 0)) falha(`${onde}: a face [${lista(f)}] sai virada: um laço se cruza ali, num canto em que os dois lados da borda do vão ${citar(anel.vao)} têm ${fora ? 'espaçamentos de grade' : 'recuos ou espaçamentos de grade'} muito diferentes; aproxime os dois lados`);
  }
  const voltas = Array.from({ length: anel.voltas }, (_, k) => (fora && k === 0 ? [...nomes] : nomesDosLacos[lacos.findIndex((l) => l.volta === k + 1)]));
  const costuras = lacos.map((l, k) => (l.volta ? null : nomesDosLacos[k])).filter(Boolean).reverse();
  const primeira = voltas[0];
  return {
    pontos, voltas, costuras, faces: facesNovas, fechada,
    borda: fechada ? [...primeira, primeira[0]] : [...primeira],
    ancoras: fora ? [...nomes] : noPlano[0].map((q) => nomes[q.ancora]),
    grade: grade ?? [],
    camadas: faixa ? faixa.camadas : 0,
    remover: faixa ? faixa.indices : [],
    removidos: faixa ? faixa.interiores : [],
    origens: Object.fromEntries(noPlano.flatMap((v, k) => v.map((q, j) => [nomesDosLacos[k][j], {
      tipo: 'anel', anel: anel.nome, ...(lacos[k].volta ? { volta: lacos[k].volta } : { costura: lacos[k].rotulo }), borda: nomes[q.ancora], ...(q.arco === null ? {} : { arco: q.arco }),
    }]))),
  };
}

/**
 * construirAneis(aneis, contexto) -> { porNome: Map(nome -> resultado), pontos, faces, remover, removidos }
 * `contexto` dá `pos(nome)`, a lista de `faces` finais da grade, `bordaDoVao(nome)` (o caminho da borda do vão: com o
 * primeiro repetido no fim, é uma volta), `vizinhoLivre(ponto, nomesDaBorda)` (o ponto da aresta livre da chapa que sai
 * de `ponto` e não é da borda), `limitesDoVao(vao)` ({ estacoes, colunas } dos limites do vão), `ladoDaAresta(vao, a, b)` (o
 * nome do limite do vão em que a aresta fica, ou null) e `localizar(ponto)` ({ estacao, coluna }). `remover` lista os índices
 * das faces da grade que os anéis de recuo 0 trocam, e `removidos` os pontos que ficam sem face por isso.
 */
export function construirAneis(aneis, contexto) {
  const porNome = new Map(); const pontos = {}; const faces = [];
  const consumidas = new Map(); const removidos = new Set();
  for (const anel of aneis) {
    const caminho = contexto.bordaDoVao(anel.vao);
    const fechada = caminho.length > 2 && caminho[0] === caminho[caminho.length - 1];
    const r = construirUm(anel, { nomes: caminho, fechada }, contexto, consumidas);
    porNome.set(anel.nome, { ...r, anel, vao: anel.vao });
    Object.assign(pontos, r.pontos);
    faces.push(...r.faces);
    for (const p of r.removidos) removidos.add(p);
  }
  return { porNome, pontos, faces, remover: [...consumidas.keys()].sort((a, b) => a - b), removidos: [...removidos] };
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
