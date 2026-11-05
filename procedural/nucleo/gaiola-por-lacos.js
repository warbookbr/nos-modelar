/* gaiola-por-lacos.js — monta a gaiola fechada da operação `subdivisao` a partir de laços, um contorno por plano ao longo de um eixo
 *
 * FICHA gaiolaPorLacos
 * serve: gaiola de um sólido fechado dado por laços, o contorno da peça em cada plano ao longo de um eixo, com as pontas tampadas.
 * quando: corpos que se fundem numa malha só sem emenda (L, U, cotovelo, alça, cabo, carcaça com cantos suaves), cortados em planos
 *   paralelos; para uma chapa aberta use gaiolaPorEstacoes, e para uma faixa de seção constante use gaiolaVarrida.
 * unidades: `em` e os pontos dos trechos entram em mm; `pontos` sai em metro, para pôr em TOPO; espalhe `passo` no passo subdivisao.
 * campos:
 *   nome: prefixo dos pontos, que saem como `${nome}_${laco}_${trecho}${k}`.
 *   eixo: 'x', 'y' ou 'z'; o ponto [u, v] do laço são os outros dois eixos na ordem x, y, z.
 *   trechos: [{ nome, pontos }] a volta do laço em ordem, e quantos pontos (com as duas pontas) o trecho tem em todo laço.
 *   lacos: [{ nome?, em, trechos: { [trecho]: [[u, v], ...] } }] em crescente; o trecho começa onde o anterior acaba.
 *   tampa: { de, ate } os trechos entre os quais a escada tampa as pontas; as duas cadeias entre eles têm os mesmos pontos.
 *   vincos: [{ nome, trecho | entre: [a, b] | laco, trechos?, nitidez }] borda da faixa de um trecho, linha ou volta de laço.
 *   cantos: [{ entre: [a, b], laco? }] o ponto entre dois trechos fica vivo, em todos os laços ou num só.
 *   medidas: [{ trecho | entre, laco?, peso? }] cota nos pontos marcados; em todos os pontos é recusado.
 *   compensar: true | { trechos, lacos? } move os pontos para a superfície limite passar por eles: o arco de r sai com r.
 * devolve: { pontos, pontosMm, alvosMm, passo, nomeDe(laco, trecho, k), lacos, trechos, avisos, compensacao? }.
 * exemplo:
 *   gaiolaPorLacos({ nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' },
 *     trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 3 }],
 *     lacos: [0, 50, 100].map((em) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [30, 40]],
 *       cima: [[30, 40], [30, 0]], tras: [[30, 0], [0, 0]] } })),
 *     vincos: [{ nome: 'pontas', laco: 'primeiro', nitidez: 'viva' }] })
 * peça: tools/fixtures/solido-por-lacos/receita.js (L) e tools/fixtures/solido-por-lacos/dobra-em-u.js (dobra em U).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. A receita dá, em cada plano, o contorno fechado da peça cortada por ele, em trechos
 * nomeados que vêm na mesma ordem em todo laço; a função reamostra cada trecho com pontos por igual ao longo do comprimento, no
 * número que `trechos` pede, liga dois laços vizinhos ponto a ponto (as tiras), tampa o primeiro e o último laço com uma escada
 * entre as duas cadeias que vão de `tampa.de` a `tampa.ate`, funde os pontos seguidos do mesmo laço que coincidem (a ponta que se
 * fecha num ponto) e orienta as faces pelo sinal do volume. Sai no formato do passo `subdivisao`, com nomes e sem índice.
 *
 * O LAÇO. Cada trecho é uma polilinha [[u, v], ...] de um ou mais pontos; o primeiro ponto dele é o último do trecho anterior, e
 * o último do último trecho é o primeiro do primeiro (a volta fecha), com tolerância de TOLERANCIA_DE_FUSAO_MM. Um trecho de um
 * ponto só tem comprimento zero: todos os pontos dele coincidem e se fundem. O trecho de `pontos` n dá n pontos, as duas pontas
 * nos lugares dados e os outros a distâncias iguais ao longo da polilinha; o último é o primeiro do trecho seguinte, de modo que
 * o laço tem a soma de (n - 1) pontos, o mesmo em todo laço, e os pontos do trecho t no laço l se chamam `${nome}_${l}_${t}${k}`,
 * k de 0 a n - 2. O laço sem nome se chama `l${r}`, pela posição.
 *
 * A TAMPA. A escada liga, no primeiro e no último laço, o ponto j da cadeia A (do fim de `de`, para a frente na volta, até o
 * começo de `ate`) ao ponto j da cadeia B (do começo de `de`, para trás, até o fim de `ate`), e por isso as duas cadeias precisam
 * do mesmo número de pontos. A primeira face é o trecho `de` com o primeiro degrau, as do meio são quadriláteros entre dois
 * degraus, e o trecho `ate` com mais de dois pontos fecha a última face. Um laço que se funde num ponto só dispensa a tampa.
 *
 * OS VINCOS. `{ trecho: t }` é a borda da faixa que o trecho t varre: a linha do primeiro ponto de t por todos os laços, o trecho
 * no último laço, a linha do último ponto de volta e o trecho no primeiro laço. `{ entre: [a, b] }` é só a linha do ponto entre a
 * e b. `{ laco: nome | 'primeiro' | 'ultimo' }` é a volta inteira do laço, ou os `trechos` listados dela, um vinco por trecho.
 * A nitidez é a do passo: 'viva' ou de 0 a 1.
 *
 * AS RECUSAS. Dois laços a menos de DISTANCIA_MINIMA_ENTRE_PLANOS_MM um do outro ondulam a superfície (na peça de teste do plano,
 * a 0,12 mm, uma falha de 5,16 mm na traseira) e são recusados com os dois planos e a distância. A cota exata em todos os pontos
 * (`medidas: 'todos'`, ou marcas que cobrem todos) dobra a superfície e é recusada: marque só os pontos de cota.
 *
 * OS AVISOS. Onde dois trechos vizinhos de um laço têm pontos espaçados muito diferentes (razão acima de RAZAO_MAXIMA_DE_AMOSTRAGEM
 * entre o último segmento de um e o primeiro do outro, fora de vinco e de canto), a subdivisão deixa calombo; o mesmo vale para
 * dois intervalos vizinhos entre planos. Sai um aviso por junção, com o laço da maior razão; o aviso não impede a gaiola.
 *
 * A COMPENSAÇÃO. A superfície limite da subdivisão passa por dentro dos pontos de um arco: o canto de 32 mm com os pontos no arco
 * sai com o recuo de um arco de 34,2 mm. `compensar` move os pontos marcados no plano do laço, na direção da normal da gaiola sem
 * a componente do eixo, em PASSOS_DA_COMPENSACAO passos, cada um o bastante para cobrir a distância normal que ainda falta do ponto
 * limite (de `limitesDaGaiola`) ao ponto declarado. Ficam onde estão os pontos de canto, os fundidos e os de normal quase no eixo
 * (parte no plano abaixo de INCLINACAO_MINIMA_DA_COMPENSACAO), que só andariam muito para cobrir pouco. `alvosMm` guarda os pontos
 * declarados, e `compensacao` o número de pontos movidos, o maior deslocamento e o maior resíduo normal, em mm. Na peça em L o
 * canto de 32 mm sai com 31,8 mm no corte, e na dobra em U as curvas de 40 e 24 mm saem com 40,1 e 24,0. */
import { limitesDaGaiola, nitidezDoVinco } from './subdivisao.js';

/* Planos mais perto que isto ondulam a superfície (fatia 1 do plano do sólido por laços). */
export const DISTANCIA_MINIMA_ENTRE_PLANOS_MM = 2.5;
/* Pontos seguidos de um laço mais perto que isto viram um ponto só; é também a folga da emenda entre trechos. */
export const TOLERANCIA_DE_FUSAO_MM = 1e-3;
/* Razão entre segmentos vizinhos acima da qual sai o aviso de amostragem desigual. */
export const RAZAO_MAXIMA_DE_AMOSTRAGEM = 4;
/* Passos da compensação do ponto limite, e a menor parte da normal no plano do laço com que o ponto ainda anda: o ponto cuja
   normal fica quase no eixo (a face da tampa) não se move. */
export const PASSOS_DA_COMPENSACAO = 8;
export const INCLINACAO_MINIMA_DA_COMPENSACAO = 0.5;

const EIXOS = { x: 0, y: 1, z: 2 };
const citar = (x) => `'${x}'`;
const br = (x, casas = 2) => String(Number(x.toFixed(casas))).replace('.', ',');
const MEDIDAS_EM_TODOS = 'na peça de teste do plano do sólido por laços, a cota exata nos 817 pontos da gaiola dobrou a parede de lado numa emenda de 62,6 mm e virou 302 faces';

function falha(texto) { throw new RangeError(`gaiolaPorLacos: ${texto}`); }

/* reamostrar(polilinha, n) -> n pontos, as pontas nos lugares dados e os de dentro a distâncias iguais ao longo dela */
function reamostrar(poli, n) {
  const s = [0];
  for (let k = 1; k < poli.length; k++) s.push(s[k - 1] + Math.hypot(poli[k][0] - poli[k - 1][0], poli[k][1] - poli[k - 1][1]));
  const total = s[s.length - 1];
  const ultimo = poli[poli.length - 1];
  if (total <= TOLERANCIA_DE_FUSAO_MM) return Array.from({ length: n }, (_, i) => [...(i === n - 1 ? ultimo : poli[0])]);
  const saida = [[...poli[0]]];
  let j = 0;
  for (let i = 1; i < n - 1; i++) {
    const alvo = (total * i) / (n - 1);
    while (j < s.length - 2 && s[j + 1] < alvo) j++;
    const d = s[j + 1] - s[j];
    const t = d > 0 ? (alvo - s[j]) / d : 0;
    saida.push([poli[j][0] + (poli[j + 1][0] - poli[j][0]) * t, poli[j][1] + (poli[j + 1][1] - poli[j][1]) * t]);
  }
  saida.push([...ultimo]);
  return saida;
}

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/* normal de Newell da face (não normalizada; o módulo é o dobro da área da face plana) */
function normalDaFace(f, P) {
  let nx = 0; let ny = 0; let nz = 0;
  f.forEach((v, k) => {
    const [x1, y1, z1] = P[v]; const [x2, y2, z2] = P[f[(k + 1) % f.length]];
    nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2);
  });
  return [nx, ny, nz];
}

function volumeComSinal(faces, P) {
  let v = 0;
  for (const f of faces) for (let k = 1; k + 1 < f.length; k++) {
    const a = P[f[0]]; const b = P[f[k]]; const c = P[f[k + 1]];
    v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return v / 6;
}

function lerTrechos(trechos) {
  if (!Array.isArray(trechos) || trechos.length < 2) falha('trechos precisa ser lista de pelo menos dois { nome, pontos }, na ordem da volta do laço');
  const vistos = new Set();
  for (const t of trechos) {
    if (!t || typeof t.nome !== 'string' || !t.nome) falha(`cada trecho precisa de nome, e veio ${JSON.stringify(t)}`);
    if (vistos.has(t.nome)) falha(`o trecho ${citar(t.nome)} aparece duas vezes em trechos`);
    vistos.add(t.nome);
    if (!Number.isInteger(t.pontos) || t.pontos < 2) falha(`o trecho ${citar(t.nome)} pede ${JSON.stringify(t.pontos)} pontos; são as duas pontas e os de dentro, inteiro de 2 para cima`);
  }
  return trechos.map((t) => ({ nome: t.nome, pontos: t.pontos }));
}

function lerLacos(lacos, trechos, e) {
  if (!Array.isArray(lacos) || lacos.length < 2) falha('lacos precisa ser lista de pelo menos dois laços { em, trechos }');
  const nomes = new Set();
  const lidos = lacos.map((l, r) => {
    const nome = l?.nome ?? `l${r}`;
    if (nomes.has(nome)) falha(`o laço ${citar(nome)} aparece duas vezes`);
    nomes.add(nome);
    if (!Number.isFinite(l?.em)) falha(`o laço ${citar(nome)} precisa de em, a posição em mm no eixo ${e}`);
    const dados = l.trechos ?? {};
    const extra = Object.keys(dados).filter((k) => !trechos.some((t) => t.nome === k));
    if (extra.length) falha(`o laço ${citar(nome)} traz o trecho ${citar(extra[0])}, que não está em trechos`);
    const pontos = trechos.map((t, i) => {
      const poli = dados[t.nome];
      if (!Array.isArray(poli) || !poli.length || poli.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) {
        falha(`o laço ${citar(nome)} precisa do trecho ${citar(t.nome)} como polilinha [[u, v], ...] de números`);
      }
      return { poli, i };
    });
    pontos.forEach(({ poli, i }) => {
      const ant = pontos[(i + trechos.length - 1) % trechos.length].poli;
      const fim = ant[ant.length - 1];
      const d = Math.hypot(poli[0][0] - fim[0], poli[0][1] - fim[1]);
      if (d > TOLERANCIA_DE_FUSAO_MM) falha(`no laço ${citar(nome)}, o trecho ${citar(trechos[i].nome)} começa em [${poli[0].map((x) => br(x, 3)).join('; ')}] e o ${citar(trechos[(i + trechos.length - 1) % trechos.length].nome)} acaba em [${fim.map((x) => br(x, 3)).join('; ')}], a ${br(d, 3)} mm; cada trecho começa onde o anterior acaba`);
    });
    return { nome, em: l.em, polilinhas: pontos.map((p) => p.poli) };
  });
  const perto = [];
  for (let r = 1; r < lidos.length; r++) {
    const a = lidos[r - 1]; const b = lidos[r];
    const d = b.em - a.em;
    if (!(d > 0)) falha(`os laços vêm em ordem crescente de em, e ${citar(b.nome)} (${e} = ${br(b.em)} mm) vem depois de ${citar(a.nome)} (${e} = ${br(a.em)} mm)`);
    if (d < DISTANCIA_MINIMA_ENTRE_PLANOS_MM) perto.push({ a, b, d });
  }
  if (perto.length) {
    /* o par mais perto, e o primeiro dele em caso de empate */
    const { a, b, d } = perto.reduce((x, y) => (y.d < x.d ? y : x));
    const outros = perto.length > 1 ? `, e mais ${perto.length - 1} ${perto.length === 2 ? 'par fica' : 'pares ficam'} abaixo do mínimo` : '';
    falha(`os laços ${citar(a.nome)} (${e} = ${br(a.em)} mm) e ${citar(b.nome)} (${e} = ${br(b.em)} mm) ficam a ${br(d)} mm um do outro, abaixo do mínimo de ${br(DISTANCIA_MINIMA_ENTRE_PLANOS_MM)} mm${outros}: planos tão perto ondulam a superfície (na peça de teste do plano, a 0,12 mm, uma falha de 5,16 mm); tire um dos dois ou afaste-os`);
  }
  return lidos;
}

/**
 * gaiolaPorLacos({ nome, eixo, trechos, lacos, tampa, vincos?, cantos?, medidas?, compensar? })
 *   -> { pontos, pontosMm, alvosMm, passo, nomeDe, lacos, trechos, avisos, compensacao? }
 */
export function gaiolaPorLacos(o = {}) {
  const prefixo = o.nome ?? 'laco';
  if (typeof prefixo !== 'string' || !prefixo) falha('nome é o prefixo dos pontos, texto não vazio');
  if (!(o.eixo in EIXOS)) falha(`eixo é 'x', 'y' ou 'z', e veio ${JSON.stringify(o.eixo)}`);
  const e = EIXOS[o.eixo];
  const outros = [0, 1, 2].filter((k) => k !== e);
  const trechos = lerTrechos(o.trechos);
  const lacos = lerLacos(o.lacos, trechos, o.eixo);
  const iTrecho = new Map(trechos.map((t, i) => [t.nome, i]));
  const exigeTrecho = (t, onde) => { if (!iTrecho.has(t)) falha(`${onde} cita o trecho ${citar(t)}, que não está em trechos (${trechos.map((x) => x.nome).join(', ')})`); return iTrecho.get(t); };

  /* a volta do laço: os pontos de cada trecho menos o último, que é o primeiro do seguinte */
  const inicio = []; let N = 0;
  for (const t of trechos) { inicio.push(N); N += t.pontos - 1; }
  const fimDe = (i) => inicio[(i + 1) % trechos.length];
  const R = lacos.length;
  const iLaco = new Map(lacos.map((l, r) => [l.nome, r]));
  const lacoDe = (x, onde) => {
    if (x === 'primeiro') return 0;
    if (x === 'ultimo') return R - 1;
    if (!iLaco.has(x)) falha(`${onde} cita o laço ${citar(x)}, que não existe`);
    return iLaco.get(x);
  };

  const nomeCru = (r, q) => {
    let i = trechos.length - 1;
    while (inicio[i] > q) i--;
    return `${prefixo}_${lacos[r].nome}_${trechos[i].nome}${q - inicio[i]}`;
  };
  /* posições [u, v] de cada laço, reamostradas */
  const uv = lacos.map((l) => {
    const volta = [];
    trechos.forEach((t, i) => { reamostrar(l.polilinhas[i], t.pontos).slice(0, -1).forEach((p) => volta.push(p)); });
    return volta;
  });
  /* fusão: cada corrida de pontos seguidos na volta que coincidem vira um ponto só, o de menor posição da corrida */
  const rep = uv.map((volta) => {
    const liga = volta.map((p, q) => { const b = volta[(q + 1) % N]; return Math.hypot(p[0] - b[0], p[1] - b[1]) <= TOLERANCIA_DE_FUSAO_MM; });
    if (liga.every(Boolean)) return volta.map(() => 0);
    const dono = new Array(N);
    let partida = 0;
    while (liga[(partida + N - 1) % N]) partida++;
    let corrida = [];
    for (let s = 0; s <= N; s++) {
      const q = (partida + s) % N;
      if (s > 0 && (s === N || !liga[(q + N - 1) % N])) { const menor = Math.min(...corrida); for (const c of corrida) dono[c] = menor; corrida = []; }
      if (s < N) corrida.push(q);
    }
    return dono;
  });
  const nm = (r, q) => nomeCru(r, rep[r][((q % N) + N) % N]);

  const pontosMm = {};
  lacos.forEach((l, r) => uv[r].forEach((p, q) => {
    if (rep[r][q] !== q) return;
    const x = [0, 0, 0]; x[e] = l.em; x[outros[0]] = p[0]; x[outros[1]] = p[1];
    pontosMm[nomeCru(r, q)] = x;
  }));
  const nomes = Object.keys(pontosMm);
  const indice = new Map(nomes.map((n, k) => [n, k]));

  const limpa = (f) => {
    const g = f.filter((v, k) => v !== f[(k + 1) % f.length]);
    return g.length >= 3 && new Set(g).size === g.length ? g : null;
  };
  const faces = [];
  for (let r = 0; r + 1 < R; r++) {
    for (let q = 0; q < N; q++) {
      const f = limpa([nm(r, q), nm(r, q + 1), nm(r + 1, q + 1), nm(r + 1, q)]);
      if (f) faces.push(f);
    }
  }

  /* a tampa: escada entre as cadeias A (do fim de `de` para a frente) e B (do começo de `de` para trás) */
  if (o.tampa == null || typeof o.tampa !== 'object') falha('tampa precisa ser { de, ate }, os trechos de onde parte e aonde chega a escada que tampa as pontas');
  const iDe = exigeTrecho(o.tampa.de, 'tampa.de');
  const iAte = exigeTrecho(o.tampa.ate, 'tampa.ate');
  if (iDe === iAte) falha('tampa.de e tampa.ate precisam ser trechos diferentes');
  const A = []; for (let q = fimDe(iDe); ; q = (q + 1) % N) { A.push(q); if (q === inicio[iAte]) break; }
  const B = []; for (let q = inicio[iDe]; ; q = (q + N - 1) % N) { B.push(q); if (q === fimDe(iAte)) break; }
  if (A.length !== B.length) {
    const lado = (de, ate, passo) => { const l = []; for (let i = de; ; i = (i + passo + trechos.length) % trechos.length) { l.push(trechos[i].nome); if (i === ate) break; } return l; };
    falha(`a tampa liga a cadeia ${lado((iDe + 1) % trechos.length, (iAte + trechos.length - 1) % trechos.length, 1).join('+')} (${A.length} pontos) à ${lado((iDe + trechos.length - 1) % trechos.length, (iAte + 1) % trechos.length, -1).join('+')} (${B.length} pontos); a escada pede o mesmo número de pontos nas duas, então mude os pontos de um trecho`);
  }
  if (A.length < 2) falha('a tampa precisa de pelo menos um degrau entre tampa.de e tampa.ate');
  const n = A.length;
  const tampa = (r) => {
    const fs = [];
    const de = []; for (let q = inicio[iDe]; ; q = (q + 1) % N) { de.push(nm(r, q)); if (q === fimDe(iDe)) break; }
    fs.push([...de, nm(r, A[1]), nm(r, B[1])]);
    for (let j = 1; j + 1 < n; j++) fs.push([nm(r, A[j]), nm(r, A[j + 1]), nm(r, B[j + 1]), nm(r, B[j])]);
    const ate = []; for (let q = inicio[iAte]; ; q = (q + 1) % N) { ate.push(nm(r, q)); if (q === fimDe(iAte)) break; }
    if (ate.length > 2) fs.push(ate);
    return fs.map(limpa).filter(Boolean);
  };
  faces.push(...tampa(0).map((f) => [...f].reverse()), ...tampa(R - 1));

  /* fechamento: cada aresta em duas faces, uma em cada sentido */
  const sentido = new Map();
  for (const f of faces) f.forEach((a, k) => { const b = f[(k + 1) % f.length]; const c = `${a}|${b}`; sentido.set(c, (sentido.get(c) ?? 0) + 1); });
  for (const [c, k] of sentido) {
    const [a, b] = c.split('|');
    if (k > 1) falha(`a aresta ${citar(a)}-${citar(b)} aparece ${k} vezes no mesmo sentido; os laços se cruzam ou a tampa não casa com eles`);
    if (!sentido.has(`${b}|${a}`)) falha(`a gaiola não fecha na aresta ${citar(a)}-${citar(b)}; confira tampa.de e tampa.ate`);
  }
  const P = nomes.map((k) => pontosMm[k]);
  const fIdx = faces.map((f) => f.map((v) => indice.get(v)));
  let orientadas = faces;
  if (volumeComSinal(fIdx, P) < 0) { orientadas = faces.map((f) => [...f].reverse()); fIdx.forEach((f) => f.reverse()); }

  /* vincos */
  const semRepetir = (l) => l.filter((v, k) => v !== l[k - 1]);
  const rs = [...Array(R).keys()];
  const trechoNoLaco = (r, i) => { const l = []; for (let q = inicio[i]; ; q = (q + 1) % N) { l.push(nm(r, q)); if (q === fimDe(i)) break; } return l; };
  const vincos = [];
  for (const [k, v] of (o.vincos ?? []).entries()) {
    const onde = `vincos[${k}]`;
    if (!v || typeof v.nome !== 'string') falha(`${onde} precisa de nome`);
    if (v.nitidez == null) falha(`${onde} precisa de nitidez, 'viva' ou de 0 a 1`);
    const formas = ['trecho', 'entre', 'laco'].filter((c) => v[c] != null);
    if (formas.length !== 1) falha(`${onde} declara o vinco por um de trecho, entre ou laco, e veio ${formas.length ? formas.join(' e ') : 'nenhum'}`);
    if (v.trecho != null) {
      const i = exigeTrecho(v.trecho, onde);
      const ida = rs.map((r) => nm(r, inicio[i]));
      const volta = [...rs].reverse().map((r) => nm(r, fimDe(i)));
      const pontos = semRepetir([...ida, ...trechoNoLaco(R - 1, i).slice(1), ...volta.slice(1), ...trechoNoLaco(0, i).reverse().slice(1)]);
      vincos.push({ nome: v.nome, pontos, nitidez: v.nitidez });
    } else if (v.entre != null) {
      if (!Array.isArray(v.entre) || v.entre.length !== 2) falha(`${onde}.entre precisa ser [a, b], dois trechos seguidos`);
      const [a, b] = v.entre.map((t) => exigeTrecho(t, onde));
      if ((a + 1) % trechos.length !== b) falha(`${onde}.entre cita ${citar(v.entre[0])} e ${citar(v.entre[1])}, que não são seguidos na volta`);
      vincos.push({ nome: v.nome, pontos: semRepetir(rs.map((r) => nm(r, inicio[b]))), nitidez: v.nitidez });
    } else {
      const r = lacoDe(v.laco, onde);
      if (v.trechos == null) {
        const volta = semRepetir([...Array(N + 1).keys()].map((q) => nm(r, q)));
        vincos.push({ nome: v.nome, pontos: volta, nitidez: v.nitidez });
      } else {
        for (const t of v.trechos) {
          const pontos = semRepetir(trechoNoLaco(r, exigeTrecho(t, onde)));
          if (pontos.length >= 2) vincos.push({ nome: `${v.nome}_${t}`, pontos, nitidez: v.nitidez });
        }
      }
    }
  }

  /* cantos e medidas: pontos marcados por trecho ou pelo ponto entre dois trechos, em todos os laços ou num só */
  const marcados = (s, onde) => {
    const lista = s.laco != null ? [lacoDe(s.laco, onde)] : rs;
    if ((s.trecho != null) === (s.entre != null)) falha(`${onde} marca os pontos por trecho ou por entre, um dos dois`);
    let qs;
    if (s.trecho != null) { const i = exigeTrecho(s.trecho, onde); qs = []; for (let q = inicio[i]; ; q = (q + 1) % N) { qs.push(q); if (q === fimDe(i)) break; } }
    else {
      const [a, b] = (s.entre ?? []).map((t) => exigeTrecho(t, onde));
      if ((a + 1) % trechos.length !== b) falha(`${onde}.entre precisa de dois trechos seguidos na volta`);
      qs = [inicio[b]];
    }
    return [...new Set(lista.flatMap((r) => qs.map((q) => nm(r, q))))];
  };
  const cantos = [...new Set((o.cantos ?? []).flatMap((c, k) => marcados(c, `cantos[${k}]`)))];
  let medidas = null;
  if (o.medidas != null) {
    if (o.medidas === 'todos' || o.medidas === true) falha(`medidas em todos os pontos não é aceito: ${MEDIDAS_EM_TODOS}; marque só os pontos de cota, por trecho, por entre ou por laço`);
    if (!Array.isArray(o.medidas) || !o.medidas.length) falha('medidas precisa ser lista não vazia de { trecho | entre, laco?, peso? }');
    const porPonto = new Map();
    o.medidas.forEach((s, k) => {
      for (const p of marcados(s, `medidas[${k}]`)) {
        if (porPonto.has(p) && porPonto.get(p) !== (s.peso ?? null)) falha(`o ponto ${citar(p)} aparece em medidas com pesos diferentes`);
        porPonto.set(p, s.peso ?? null);
      }
    });
    if (porPonto.size >= nomes.length) falha(`as medidas marcam todos os ${nomes.length} pontos da gaiola, o que não é aceito: ${MEDIDAS_EM_TODOS}; marque só os pontos de cota`);
    medidas = nomes.filter((p) => porPonto.has(p)).map((p) => (porPonto.get(p) == null ? p : { ponto: p, peso: porPonto.get(p) }));
  }

  /* avisos de amostragem desigual: nas junções de trechos e entre intervalos vizinhos de planos */
  const avisos = [];
  const nosVincos = new Set(vincos.flatMap((v) => v.pontos));
  const vivos = new Set(cantos);
  trechos.forEach((t, b) => {
    const a = (b + trechos.length - 1) % trechos.length;
    let pior = null;
    rs.forEach((r) => {
      const q = inicio[b];
      const nome = nm(r, q);
      if (nosVincos.has(nome) || vivos.has(nome)) return;
      const p = uv[r][q]; const ant = uv[r][(q + N - 1) % N]; const prox = uv[r][(q + 1) % N];
      const la = Math.hypot(p[0] - ant[0], p[1] - ant[1]); const lb = Math.hypot(prox[0] - p[0], prox[1] - p[1]);
      if (la <= TOLERANCIA_DE_FUSAO_MM || lb <= TOLERANCIA_DE_FUSAO_MM) return;
      const razao = Math.max(la, lb) / Math.min(la, lb);
      if (!pior || razao > pior.razao) pior = { razao, la, lb, laco: lacos[r].nome };
    });
    if (pior && pior.razao > RAZAO_MAXIMA_DE_AMOSTRAGEM) {
      avisos.push({
        ref: 'amostragemDesigual', trechos: [trechos[a].nome, t.nome], laco: pior.laco, razao: Number(pior.razao.toFixed(2)),
        texto: `amostragem desigual entre os trechos ${citar(trechos[a].nome)} e ${citar(t.nome)}: no laço ${citar(pior.laco)}, o último segmento de ${citar(trechos[a].nome)} tem ${br(pior.la, 1)} mm e o primeiro de ${citar(t.nome)} ${br(pior.lb, 1)} mm, razão ${br(pior.razao, 1)}, acima de ${RAZAO_MAXIMA_DE_AMOSTRAGEM}; a subdivisão deixa calombo ali (razão 20 deu 0,76 mm na peça de teste do plano), então dê pontos aos dois trechos na mesma proporção do comprimento ou ponha um vinco na junção`,
      });
    }
  });
  for (let r = 1; r + 1 < R; r++) {
    const d1 = lacos[r].em - lacos[r - 1].em; const d2 = lacos[r + 1].em - lacos[r].em;
    const razao = Math.max(d1, d2) / Math.min(d1, d2);
    if (razao > RAZAO_MAXIMA_DE_AMOSTRAGEM) {
      avisos.push({
        ref: 'planosDesiguais', lacos: [lacos[r - 1].nome, lacos[r].nome, lacos[r + 1].nome], razao: Number(razao.toFixed(2)),
        texto: `os planos em volta do laço ${citar(lacos[r].nome)} ficam a ${br(d1, 1)} e ${br(d2, 1)} mm, razão ${br(razao, 1)}, acima de ${RAZAO_MAXIMA_DE_AMOSTRAGEM}; a subdivisão deixa calombo ali, então espace os planos aos poucos`,
      });
    }
  }

  /* compensação: os pontos marcados andam no plano do laço até o ponto limite chegar ao declarado pela normal */
  const alvosMm = Object.fromEntries(nomes.map((k) => [k, [...pontosMm[k]]]));
  let compensacao = null;
  if (o.compensar != null && o.compensar !== false) {
    const c = o.compensar === true ? {} : o.compensar;
    if (typeof c !== 'object') falha('compensar é true ou { trechos, lacos? }');
    const lacosC = c.lacos == null ? rs : c.lacos.map((l) => lacoDe(l, 'compensar.lacos'));
    const its = c.trechos == null ? trechos.map((_, i) => i) : c.trechos.map((t) => exigeTrecho(t, 'compensar.trechos'));
    const fundidos = new Set();
    lacos.forEach((_, r) => rep[r].forEach((d, q) => { if (d !== q) fundidos.add(nomeCru(r, d)); }));
    const moveis = new Set();
    for (const r of lacosC) for (const i of its) for (let q = inicio[i]; ; q = (q + 1) % N) { moveis.add(nm(r, q)); if (q === fimDe(i)) break; }
    for (const v of [...vivos, ...fundidos]) moveis.delete(v);
    const lista = nomes.filter((k) => moveis.has(k)).map((k) => indice.get(k));
    const vincosIdx = [];
    for (const v of vincos) for (let k = 0; k + 1 < v.pontos.length; k++) vincosIdx.push([indice.get(v.pontos[k]), indice.get(v.pontos[k + 1]), nitidezDoVinco(v.nitidez)]);
    const cantosIdx = cantos.map((k) => indice.get(k));
    const facesDo = nomes.map(() => []);
    fIdx.forEach((f, k) => f.forEach((v) => facesDo[v].push(k)));
    const V = P.map((p) => [...p]);
    const alvo = P.map((p) => [...p]);
    let residuo = 0;
    for (let passo = 0; passo <= PASSOS_DA_COMPENSACAO; passo++) {
      const L = limitesDaGaiola({ vertices: V, faces: fIdx, vincos: vincosIdx, cantos: cantosIdx });
      residuo = 0;
      const novos = lista.map((i) => {
        const nn = [0, 0, 0];
        for (const k of facesDo[i]) { const w = normalDaFace(fIdx[k], V); nn[0] += w[0]; nn[1] += w[1]; nn[2] += w[2]; }
        const l = Math.hypot(...nn) || 1;
        for (let a = 0; a < 3; a++) nn[a] /= l;
        const d = sub3(alvo[i], L[i]);
        const s = d[0] * nn[0] + d[1] * nn[1] + d[2] * nn[2];
        /* o ponto anda no plano do laço, na direção da normal sem a componente do eixo, o bastante para cobrir s pela normal */
        const no = [...nn]; no[e] = 0;
        const lp = Math.hypot(...no);
        if (lp < INCLINACAO_MINIMA_DA_COMPENSACAO) return V[i];
        residuo = Math.max(residuo, Math.abs(s));
        const passoNoPlano = s / lp;
        return V[i].map((c, a) => c + (passoNoPlano * no[a]) / lp);
      });
      if (passo === PASSOS_DA_COMPENSACAO) break;
      lista.forEach((i, k) => { V[i] = novos[k]; });
    }
    const deslocamentos = lista.map((i) => Math.hypot(...sub3(V[i], alvo[i]))).filter((x) => x > 0);
    nomes.forEach((k, i) => { pontosMm[k] = V[i]; });
    compensacao = { pontos: deslocamentos.length, maiorDeslocamentoMm: Number(Math.max(0, ...deslocamentos).toFixed(3)), residuoMm: Number(residuo.toFixed(3)) };
  }

  const pontos = {};
  for (const k of nomes) pontos[k] = pontosMm[k].map((x) => x / 1000);
  const passo = { vertices: nomes, faces: orientadas, vincos };
  if (cantos.length) passo.cantos = cantos;
  if (medidas) passo.medidas = medidas;
  const nomeDe = (laco, trecho, k = 0) => {
    const r = lacoDe(laco, 'nomeDe'); const i = exigeTrecho(trecho, 'nomeDe');
    if (!Number.isInteger(k) || k < 0 || k >= trechos[i].pontos) falha(`nomeDe: o trecho ${citar(trecho)} tem os pontos 0 a ${trechos[i].pontos - 1}`);
    return nm(r, inicio[i] + k);
  };
  const saida = { pontos, pontosMm, alvosMm, passo, nomeDe, lacos: lacos.map((l) => ({ nome: l.nome, em: l.em })), trechos, avisos };
  if (compensacao) saida.compensacao = compensacao;
  return saida;
}
