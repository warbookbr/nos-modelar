/* friso.js — varredura de um perfil 2D ao longo de uma linha 3D, e a linha de uma gaiola de subdivisão refinada.
 *
 * Funções puras, sem Three.js, sem estado e sem domínio. `varrerPerfil` leva o perfil [u, v] por uma polilinha com uma
 * normal em cada ponto: v anda pela normal, u anda para a esquerda de quem segue a linha com a normal para cima
 * (u = normal × tangente), e o resultado é um sólido fechado, com as pontas tampadas, afinadas até um ponto ou, na
 * linha fechada, sem ponta. Em cada junta o perfil fica no plano bissetor das duas direções e se estica na direção da
 * curva por 1 / cos(θ/2), a esquadria, de modo que cada trecho mantém a seção do perfil e as juntas não abrem nem se
 * cruzam enquanto o recuo do lado de dentro couber no trecho; quando não cabe, grita com o ponto.
 *
 * `cadeiaRefinada` segue uma sequência de vértices ao longo das arestas de uma gaiola pelos níveis de Catmull-Clark:
 * cada aresta (a, b) ganha no nível seguinte o ponto de aresta entre a e b, e a cadeia de nível n é a lista dos
 * vértices da malha de nível n que ficam sobre as arestas da cadeia original. A numeração repete a de
 * `subdividirCatmullClark` (pontos de vértice, depois de aresta na ordem em que as arestas aparecem varrendo as faces,
 * depois de face), e por isso o índice da cadeia é o índice do vértice na malha que a operação `subdivisao` entrega. */
import earcut from 'earcut';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mult = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const comprimento = (a) => Math.hypot(a[0], a[1], a[2]);
const chave = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);

/** Folga relativa abaixo da qual um trecho conta como de comprimento nulo e duas direções como opostas. */
const QUASE_ZERO = 1e-12;
/** Pontos na volta de uma ponta fechada: o perfil encolhe em quarto de elipse por estes passos até virar um ponto. */
export const PASSOS_DA_PONTA_FECHADA = 6;
/** Comprimento máximo de um trecho em múltiplos da menor aresta do perfil: acima dele o trecho é dividido, porque a
 *  face lateral comprida e estreita vira lasca para o `conferir-malha` (área / maior aresta² abaixo de 0,003). */
export const TRECHO_MAXIMO_EM_ARESTAS = 100;

export class ErroDoFriso extends TypeError {
  /** indice: o ponto da linha de entrada mais perto do defeito, para quem chama citar o nome dele. */
  constructor(motivo, indice = null) { super(`friso: ${motivo}`); this.motivo = motivo; this.indice = indice; }
}

/** Área com sinal do perfil [u, v]: positiva no sentido anti-horário. */
export function areaDoPerfil(perfil) {
  let s = 0;
  for (let k = 0; k < perfil.length; k++) { const [u0, v0] = perfil[k]; const [u1, v1] = perfil[(k + 1) % perfil.length]; s += u0 * v1 - u1 * v0; }
  return s / 2;
}

/* Arestas de uma lista de faces, na ordem em que aparecem varrendo as faces: a mesma de `subdivisao.js`. */
function indiceDasArestas(F) {
  const indice = new Map();
  for (const f of F) for (let k = 0; k < f.length; k++) { const c = chave(f[k], f[(k + 1) % f.length]); if (!indice.has(c)) indice.set(c, indice.size); }
  return indice;
}

/**
 * cadeiaRefinada(faces, nVertices, niveis, cadeia) -> { cadeia, faces, vertices }
 *   faces: as faces da gaiola por índice; nVertices: o número de vértices da gaiola; cadeia: índices em sequência ao
 *   longo das arestas (repetir o primeiro no fim fecha a volta). Devolve a cadeia no nível pedido, as faces desse nível
 *   e o número de vértices dele. Par da cadeia que não é aresta grita com o índice do par.
 */
export function cadeiaRefinada(faces, nVertices, niveis, cadeia) {
  let F = faces; let nV = nVertices; let c = [...cadeia];
  const arestas0 = indiceDasArestas(F);
  for (let k = 0; k + 1 < c.length; k++) if (c[k] === c[k + 1] || !arestas0.has(chave(c[k], c[k + 1]))) throw new ErroDoFriso(`os pontos ${k} e ${k + 1} da linha não formam aresta da gaiola`, k);
  for (let n = 0; n < niveis; n++) {
    const indice = n === 0 ? arestas0 : indiceDasArestas(F);
    const nE = indice.size;
    const iE = (a, b) => nV + indice.get(chave(a, b));
    const nova = [c[0]];
    for (let k = 0; k + 1 < c.length; k++) nova.push(iE(c[k], c[k + 1]), c[k + 1]);
    const Fn = [];
    F.forEach((f, fi) => {
      for (let k = 0; k < f.length; k++) {
        const v = f[k], prox = f[(k + 1) % f.length], ant = f[(k - 1 + f.length) % f.length];
        Fn.push([v, iE(v, prox), nV + nE + fi, iE(ant, v)]);
      }
    });
    nV = nV + nE + F.length; F = Fn; c = nova;
  }
  return { cadeia: c, faces: F, vertices: nV };
}

/**
 * perfilDaAba({ espessura, raio, largura, angulo, segmentosPorQuarto }) -> [[w, v], ...]
 *   O perfil em L da aba que dobra a borda de uma chapa de espessura `espessura`, em metro e graus. A chapa chega ao
 *   ponto (w = 0, v = 0) da face de fora, com a face de dentro em v = -espessura, e dobra para dentro (v negativo) num
 *   arco de raio `raio` na face de dentro, `raio + espessura` na de fora, que gira `angulo` graus; depois a perna reta
 *   de comprimento `largura` segue na direção em que o arco acabou. w cresce para além da borda (para o lado livre).
 *   O arco tem `segmentosPorQuarto` segmentos a cada 90 graus (pelo menos um), e as duas faces da dobra usam o mesmo
 *   número deles. Grita com ErroDoFriso no valor inválido e na aba que volta por baixo da chapa (w < 0).
 */
export const ANGULO_MAXIMO_DA_ABA = 180;
const PASSOS_DO_QUARTO_DA_ABA = 4;
export function perfilDaAba({ espessura, raio, largura, angulo, segmentosPorQuarto = PASSOS_DO_QUARTO_DA_ABA }) {
  const finito = (x) => typeof x === 'number' && Number.isFinite(x);
  if (!finito(espessura) || !(espessura > 0)) throw new ErroDoFriso(`a espessura da chapa precisa ser maior que zero, e veio ${espessura}`);
  if (!finito(raio) || !(raio > 0)) throw new ErroDoFriso(`o raio da dobra precisa ser maior que zero, e veio ${raio}`);
  if (!finito(largura) || !(largura > 0)) throw new ErroDoFriso(`a largura da aba precisa ser maior que zero, e veio ${largura}`);
  if (!finito(angulo) || !(angulo > 0) || !(angulo < ANGULO_MAXIMO_DA_ABA)) throw new ErroDoFriso(`o ângulo da aba precisa ficar entre 0 e ${ANGULO_MAXIMO_DA_ABA} graus, e veio ${angulo}`);
  const ri = raio; const ro = raio + espessura; const alfa = (angulo * Math.PI) / 180;
  const n = Math.max(1, Math.ceil((segmentosPorQuarto * alfa) / (Math.PI / 2) - 1e-9));
  const arco = (r, k) => { const t = (alfa * k) / n; return [r * Math.sin(t), -ro + r * Math.cos(t)]; };
  const perna = [largura * Math.cos(alfa), -largura * Math.sin(alfa)];
  const fora = Array.from({ length: n + 1 }, (_, k) => arco(ro, k));
  const dentro = Array.from({ length: n + 1 }, (_, k) => arco(ri, k));
  const perfil = [...fora, [fora[n][0] + perna[0], fora[n][1] + perna[1]], [dentro[n][0] + perna[0], dentro[n][1] + perna[1]], ...dentro.reverse()];
  /* a face de dentro começa em -espessura, e o arredondamento não deve tirá-la de lá */
  perfil[perfil.length - 1] = [0, -espessura];
  const menorW = Math.min(...perfil.map((p) => p[0]));
  if (menorW < -1e-12) throw new ErroDoFriso(`a aba de ${angulo} graus com perna de ${largura} passa ${Number((-menorW).toPrecision(3))} por baixo da chapa, além da borda onde a dobra começa: reduza o ângulo ou a largura`);
  return perfil;
}

/**
 * tampaDaAba(perfil) -> [[índices], ...]
 *   As tampas de uma ponta aberta da aba como quadriláteros, uma escada entre a face de fora e a de dentro da dobra e da
 *   perna, em vez do leque do earcut, cujo vértice de valência 9 o conferir-malha marca como polo. Os índices são os do
 *   perfil de `perfilDaAba`.
 */
export function tampaDaAba(perfil) {
  const n = (perfil.length - 4) / 2;
  const quadros = [];
  for (let k = 0; k < n; k++) quadros.push([k, k + 1, 2 * n + 2 - k, 2 * n + 3 - k]);
  quadros.push([n, n + 1, n + 2, n + 3]);
  return quadros;
}

/**
 * ladoDaBorda(faces, cadeia) -> 1 | -1
 *   `faces`: as faces da superfície que tocam a cadeia, cada uma a lista de ids de vértice no sentido em que a normal
 *   dela aponta para fora; `cadeia`: ids em sequência ao longo de arestas (a volta repete o primeiro no fim). Devolve o
 *   sinal de u do lado livre da borda: +1 quando a chapa fica à direita de quem segue a cadeia (o lado livre fica à
 *   esquerda, onde u cresce), -1 quando fica à esquerda. Grita com ErroDoFriso, com o índice do par, no trecho que não
 *   é borda livre (nenhuma face, ou mais de uma, o tem) e no que troca de lado.
 */
export function ladoDaBorda(faces, cadeia) {
  const dirigidas = new Set(); const contagem = new Map();
  for (const f of faces) for (let k = 0; k < f.length; k++) {
    const a = f[k], b = f[(k + 1) % f.length];
    dirigidas.add(`${a}>${b}`);
    contagem.set(chave(a, b), (contagem.get(chave(a, b)) ?? 0) + 1);
  }
  let lado = 0;
  for (let k = 0; k + 1 < cadeia.length; k++) {
    const a = cadeia[k], b = cadeia[k + 1];
    const n = contagem.get(chave(a, b)) ?? 0;
    if (n !== 1) throw new ErroDoFriso(`este trecho da linha não é borda livre da chapa: ${n === 0 ? 'nenhuma face o tem' : `${n} faces o têm`}`, k);
    const aqui = dirigidas.has(`${a}>${b}`) ? -1 : 1;
    if (lado !== 0 && aqui !== lado) throw new ErroDoFriso('a chapa passa de um lado da linha ao outro neste trecho', k);
    lado = aqui;
  }
  return lado;
}

/* As estações da varredura: os pontos da linha, os pontos que dividem os trechos longos e os da volta de cada ponta
   fechada, cada uma com posição, normal, escala do perfil e o índice do ponto de entrada mais perto. */
function estacoesDaLinha({ pontos, normais, fechada, pontas, fechamento, trechoMaximo }) {
  const n = pontos.length;
  const nTrechos = fechada ? n : n - 1;
  const comprimentos = [];
  for (let k = 0; k < nTrechos; k++) comprimentos.push(comprimento(sub(pontos[(k + 1) % n], pontos[k])));
  const total = comprimentos.reduce((s, x) => s + x, 0);
  for (let k = 0; k < nTrechos; k++) if (!(comprimentos[k] > QUASE_ZERO * Math.max(1, total))) throw new ErroDoFriso(`os pontos ${k} e ${(k + 1) % n} da linha coincidem`, k);
  const acumulado = [0]; for (let k = 0; k < nTrechos; k++) acumulado.push(acumulado[k] + comprimentos[k]);
  /* as pontas fechadas: a distância de cada uma ao longo da linha em que o perfil encolhe */
  const fechadas = fechada ? [] : [['inicio', pontas[0]], ['fim', pontas[1]]].filter(([, tipo]) => tipo === 'fechada').map(([lado]) => lado);
  if (fechadas.length && !(fechamento * fechadas.length < total)) {
    throw new ErroDoFriso(`o fechamento ${fechamento} ${fechadas.length === 2 ? 'nas duas pontas passa da metade' : 'passa'} do comprimento da linha, ${Number(total.toPrecision(4))}`, fechadas[0] === 'inicio' ? 0 : n - 1);
  }
  const distanciaDaPonta = (s, lado) => (lado === 'inicio' ? s : total - s);
  const naVolta = (s) => fechadas.some((lado) => distanciaDaPonta(s, lado) < fechamento);
  /* posições (comprimento de arco) das estações a acrescentar: a volta de cada ponta fechada e a divisão dos trechos
     longos fora dela */
  const extras = [];
  for (const lado of fechadas) {
    for (let j = 1; j <= PASSOS_DA_PONTA_FECHADA; j++) {
      const d = fechamento * (1 - Math.cos((Math.PI / 2) * (j / PASSOS_DA_PONTA_FECHADA)));
      extras.push(lado === 'inicio' ? d : total - d);
    }
  }
  for (let k = 0; k < nTrechos; k++) {
    const partes = Math.ceil(comprimentos[k] / trechoMaximo);
    for (let j = 1; j < partes; j++) { const s = acumulado[k] + (comprimentos[k] * j) / partes; if (!naVolta(s)) extras.push(s); }
  }
  extras.sort((x, y) => x - y);
  const escala = (s) => {
    let f = 1;
    for (const lado of fechadas) {
      const d = distanciaDaPonta(s, lado);
      if (d < fechamento) { const c = 1 - d / fechamento; f = Math.min(f, Math.sqrt(Math.max(0, 1 - c * c))); }
    }
    return f;
  };
  const estacoes = [];
  let e = 0;
  for (let k = 0; k < n; k++) {
    estacoes.push({ p: [...pontos[k]], normal: [...normais[k]], s: acumulado[k], origem: k, escala: escala(acumulado[k]) });
    if (k === nTrechos) break;
    const a = pontos[k], b = pontos[(k + 1) % n], na = normais[k], nb = normais[(k + 1) % n];
    while (e < extras.length && extras[e] <= acumulado[k]) e++;
    for (; e < extras.length && extras[e] < acumulado[k + 1]; e++) {
      const t = (extras[e] - acumulado[k]) / comprimentos[k];
      if (!(t > 1e-6 && t < 1 - 1e-6)) continue;
      estacoes.push({ p: soma(a, mult(sub(b, a), t)), normal: soma(mult(na, 1 - t), mult(nb, t)), s: extras[e], origem: t < 0.5 ? k : (k + 1) % n, escala: escala(extras[e]) });
    }
  }
  return estacoes;
}

/**
 * varrerPerfil({ pontos, normais, perfil, fechada, pontas, fechamento, trechoMaximo })
 *   -> { vertices, faces, partes: { lateral, pontas }, estacoes, comprimento }
 *   pontos e normais: listas de [x, y, z] do mesmo tamanho (a linha fechada não repete o primeiro ponto);
 *   perfil: [u, v] de um polígono simples; pontas: [inicio, fim], cada uma 'aberta' (tampa plana) ou 'fechada' (o perfil
 *   encolhe em quarto de elipse ao longo de `fechamento` até virar um ponto na linha); trechoMaximo: comprimento acima do
 *   qual um trecho é dividido (o padrão é TRECHO_MAXIMO_EM_ARESTAS vezes a menor aresta do perfil); tampa: os polígonos
 *   das tampas das pontas abertas, cada um a lista de índices do perfil, no lugar da triangulação (a aba usa quadriláteros).
 *   Grita com ErroDoFriso, com o índice do ponto, no trecho nulo, na normal paralela à linha, na volta para trás e no
 *   recuo da esquadria que não cabe no trecho.
 */
export function varrerPerfil({ pontos, normais, perfil, fechada = false, pontas = ['aberta', 'aberta'], fechamento = null, trechoMaximo = null, tampa = null }) {
  if (!Array.isArray(pontos) || pontos.length < (fechada ? 3 : 2)) throw new ErroDoFriso(`a linha ${fechada ? 'fechada' : 'aberta'} precisa de ${fechada ? 3 : 2} pontos distintos ou mais`);
  if (!Array.isArray(normais) || normais.length !== pontos.length) throw new ErroDoFriso('é preciso uma normal por ponto da linha');
  if (!Array.isArray(perfil) || perfil.length < 3) throw new ErroDoFriso('o perfil precisa de 3 pontos [u, v] ou mais');
  const area = areaDoPerfil(perfil);
  if (!(Math.abs(area) > 0)) throw new ErroDoFriso('o perfil tem área nula');
  const P2 = area > 0 ? perfil.map((p) => [...p]) : [...perfil].reverse().map((p) => [...p]);
  const np = P2.length;
  let menorAresta = Infinity;
  for (let k = 0; k < np; k++) menorAresta = Math.min(menorAresta, Math.hypot(P2[(k + 1) % np][0] - P2[k][0], P2[(k + 1) % np][1] - P2[k][1]));
  const largura = Math.max(...P2.map((p) => Math.abs(p[0]))) * 2;
  const estacoes = estacoesDaLinha({ pontos, normais, fechada, pontas, fechamento: fechamento ?? largura, trechoMaximo: trechoMaximo ?? TRECHO_MAXIMO_EM_ARESTAS * menorAresta });
  const m = estacoes.length;

  /* o referencial de cada estação: tangente bissetora, normal projetada, lado, e a esquadria */
  const quadros = estacoes.map((e, j) => {
    const anterior = fechada || j > 0 ? estacoes[(j - 1 + m) % m] : null;
    const seguinte = fechada || j < m - 1 ? estacoes[(j + 1) % m] : null;
    const tA = anterior ? mult(sub(e.p, anterior.p), 1 / comprimento(sub(e.p, anterior.p))) : null;
    const tS = seguinte ? mult(sub(seguinte.p, e.p), 1 / comprimento(sub(seguinte.p, e.p))) : null;
    let T; let K = null; let estica = 1; let tanMeio = 0;
    if (tA && tS) {
      const b = soma(tA, tS); const lb = comprimento(b);
      if (!(lb > 1e-6)) throw new ErroDoFriso('a linha volta para trás sobre si', e.origem);
      T = mult(b, 1 / lb);
      const d = sub(tS, tA); const ld = comprimento(d);
      if (ld > 1e-12) { K = mult(d, 1 / ld); const c = lb / 2; estica = 1 / c; tanMeio = (ld / 2) / c; }
    } else T = tA ?? tS;
    const nn = e.normal; const ln = comprimento(nn);
    if (!(ln > 0)) throw new ErroDoFriso('a normal no ponto é nula', e.origem);
    const N0 = sub(mult(nn, 1 / ln), mult(T, dot(nn, T) / ln));
    const lN = comprimento(N0);
    if (!(lN > 1e-6)) throw new ErroDoFriso('a normal no ponto é paralela à linha, e o perfil não tem lado', e.origem);
    const N = mult(N0, 1 / lN);
    const B = cruz(N, T);
    return { T, N, B, K, estica, tanMeio, tA, tS };
  });
  /* o deslocamento de cada ponto do perfil em cada estação, antes da esquadria (para o recuo) e depois */
  const deslocamentos = estacoes.map((e, j) => {
    const q = quadros[j];
    return P2.map(([u, v]) => {
      let d = soma(mult(q.B, u * e.escala), mult(q.N, v * e.escala));
      if (q.K) d = soma(d, mult(q.K, dot(d, q.K) * (q.estica - 1)));
      return d;
    });
  });
  /* o recuo: ao longo de cada trecho, cada ponto do perfil precisa andar para a frente; se a esquadria de uma ponta o
     leva além da esquadria da outra, a face lateral se dobra sobre si */
  const nTrechos = fechada ? m : m - 1;
  for (let j = 0; j < nTrechos; j++) {
    const a = estacoes[j], b = estacoes[(j + 1) % m];
    const eixo = sub(b.p, a.p); const L = comprimento(eixo); const t = mult(eixo, 1 / L);
    for (let k = 0; k < np; k++) {
      const avanco = L + dot(deslocamentos[(j + 1) % m][k], t) - dot(deslocamentos[j][k], t);
      if (!(avanco > 1e-3 * L)) {
        const pior = quadros[j].tanMeio >= quadros[(j + 1) % m].tanMeio ? a : b;
        throw new ErroDoFriso(`a curva é fechada demais para a largura do perfil: no trecho de ${Number(L.toPrecision(3))} o lado de dentro da esquadria recua ${Number((L - avanco).toPrecision(3))} e a face lateral se dobraria; abra a curva ou estreite o perfil`, pior.origem);
      }
    }
  }

  const vertices = []; const anel = [];
  estacoes.forEach((e, j) => {
    if (e.escala === 0) { anel.push(vertices.length); vertices.push([...e.p]); return; }
    anel.push(vertices.length);
    for (const d of deslocamentos[j]) vertices.push(soma(e.p, d));
  });
  const ponto = (j, k) => (estacoes[j].escala === 0 ? anel[j] : anel[j] + k);
  const faces = []; const lateral = []; const tampas = [];
  for (let j = 0; j < nTrechos; j++) {
    const j2 = (j + 1) % m;
    for (let k = 0; k < np; k++) {
      const k2 = (k + 1) % np;
      const f = [ponto(j, k), ponto(j, k2), ponto(j2, k2), ponto(j2, k)];
      const unicos = f.filter((x, i) => f.indexOf(x) === i);
      lateral.push(faces.length); faces.push(unicos);
    }
  }
  if (!fechada) {
    const giro = (a, b, c) => (P2[b][0] - P2[a][0]) * (P2[c][1] - P2[a][1]) - (P2[b][1] - P2[a][1]) * (P2[c][0] - P2[a][0]);
    const triangulos = [];
    if (tampa) {
      /* os polígonos declarados no sentido do perfil de entrada; no perfil invertido os índices andam ao contrário */
      const mapa = (k) => (area > 0 ? k : np - 1 - k);
      for (const poligono of tampa) {
        const ids = poligono.map(mapa);
        let sinal = 0;
        for (let k = 0; k < ids.length; k++) { const q = P2[ids[k]], r = P2[ids[(k + 1) % ids.length]]; sinal += q[0] * r[1] - r[0] * q[1]; }
        triangulos.push(sinal > 0 ? ids : [...ids].reverse());
      }
    } else if (P2.every((_, k) => giro(k, (k + 1) % np, (k + 2) % np) > 0)) {
      /* perfil convexo: a tampa em zigue-zague de um lado ao outro, que dá a cada canto no máximo duas diagonais; o leque
         de um canto só (ou o do earcut) deixa um vértice de valência alta, que o conferir-malha marca como polo */
      for (let a = 0, b = np - 1, lado = true; b - a >= 2; lado = !lado) {
        if (lado) { triangulos.push([a, a + 1, b]); a += 1; } else { triangulos.push([a, b - 1, b]); b -= 1; }
      }
    } else {
      const tri = earcut(P2.flat());
      for (let k = 0; k < tri.length; k += 3) { const [a, b, c] = [tri[k], tri[k + 1], tri[k + 2]]; triangulos.push(giro(a, b, c) > 0 ? [a, b, c] : [a, c, b]); }
    }
    /* a tampa do início olha para trás da linha (horária em u, v), a do fim para a frente (anti-horária) */
    if (tampa) {
      if (estacoes[0].escala !== 0) for (const ids of triangulos) { tampas.push(faces.length); faces.push([...ids].reverse().map((k) => anel[0] + k)); }
      if (estacoes[m - 1].escala !== 0) for (const ids of triangulos) { tampas.push(faces.length); faces.push(ids.map((k) => anel[m - 1] + k)); }
    } else {
      if (estacoes[0].escala !== 0) for (const [a, b, c] of triangulos) { tampas.push(faces.length); faces.push([anel[0] + a, anel[0] + c, anel[0] + b]); }
      if (estacoes[m - 1].escala !== 0) for (const [a, b, c] of triangulos) { tampas.push(faces.length); faces.push([anel[m - 1] + a, anel[m - 1] + b, anel[m - 1] + c]); }
    }
  }
  const total = estacoes[m - 1].s + (fechada ? comprimento(sub(estacoes[0].p, estacoes[m - 1].p)) : 0);
  return { vertices, faces, partes: { lateral, pontas: tampas }, estacoes: m, comprimento: total };
}
