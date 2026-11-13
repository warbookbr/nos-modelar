/* contorno-exato.js — o contorno 2D guardado como retas e arcos, e não como pontos (protótipo do estudo do método, plano
   "forma exata antes da malha", fatia 3).

   `curva2d.js` lê o mesmo vocabulário de trechos e devolve só a lista de pontos: o centro e o raio de cada arco se perdem ali.
   Este arquivo lê {inicio, trechos} com `reto`, `arco` ({por, ate} ou {centro, angulo}) e `arcoTangente`, e guarda cada trecho
   como segmento exato:
     {tipo: 'reta', a, b}                       de a até b;
     {tipo: 'arco', c, r, a0, giro}             centro c, raio r, ângulo inicial a0 e giro com sinal (positivo anti-horário).
   O laço é fechado e o material fica à esquerda de quem o percorre: o contorno de fora é anti-horário e o de um furo, horário.
   Um reto implícito fecha o laço quando o último trecho não volta ao início, como em `curva2d.js`.

   O RECUO. `nivelDoLaco(laco, recuos)` desloca cada segmento para dentro do material pela distância dele (uma por segmento)
   e refaz os cantos pela interseção dos dois vizinhos: reta com reta, reta com círculo, círculo com círculo. O recuo de uma reta
   é uma reta paralela e o de um arco é um arco de mesmo centro, então o resultado continua exato. O canto escolhido é a interseção
   mais perto do canto original. Onde dois segmentos se encontram em tangência, os dois recuos precisam ser iguais.

   NÃO COBRE: `spline` e `concordancia` (recusadas com o nome do trecho); o segmento que some quando o recuo passa do tamanho
   dele (recusado, sem refazer a topologia do contorno); o recuo que faz o contorno tocar a si mesmo longe do canto (quem chama
   confere com `diagnosticarContorno`, de `contorno.js`, sobre os pontos da amostra). */

const EPS = 1e-12;
const VOLTA = 2 * Math.PI;

export class ErroDeFormaExata extends Error {
  constructor(onde, detalhe) {
    super(`${onde}: ${detalhe}`);
    this.name = 'ErroDeFormaExata';
    this.onde = onde;
    this.detalhe = detalhe;
  }
}

const ehNumero = (x) => typeof x === 'number' && Number.isFinite(x);
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const cruz = (a, b) => a[0] * b[1] - a[1] * b[0];
const fmt = (x) => String(Number(x.toPrecision(6)));
const pt = (p) => `[${fmt(p[0])}, ${fmt(p[1])}]`;

function pontoDe(valor, onde) {
  if (!Array.isArray(valor) || valor.length !== 2 || !ehNumero(valor[0]) || !ehNumero(valor[1])) throw new ErroDeFormaExata(onde, `o ponto precisa ser [u, v] com números finitos (veio ${JSON.stringify(valor)})`);
  return [valor[0], valor[1]];
}

/* o giro de a0 até a1 no sentido pedido, em (0, 2π] de módulo */
function giroNoSentido(a0, a1, sentido) {
  let g = a1 - a0;
  if (sentido > 0) { while (g <= 1e-15) g += VOLTA; while (g > VOLTA) g -= VOLTA; }
  else { while (g >= -1e-15) g -= VOLTA; while (g < -VOLTA) g += VOLTA; }
  return g;
}

/** O ponto inicial, o final, e a direção unitária de percurso no início e no fim do segmento. */
export function pontasDoSegmento(s) {
  if (s.tipo === 'reta') {
    const d = dist(s.a, s.b);
    const t = [(s.b[0] - s.a[0]) / d, (s.b[1] - s.a[1]) / d];
    return { ini: s.a, fim: s.b, tIni: t, tFim: t };
  }
  const sinal = Math.sign(s.giro);
  const em = (a) => [s.c[0] + s.r * Math.cos(a), s.c[1] + s.r * Math.sin(a)];
  const tg = (a) => [-Math.sin(a) * sinal, Math.cos(a) * sinal];
  return { ini: em(s.a0), fim: em(s.a0 + s.giro), tIni: tg(s.a0), tFim: tg(s.a0 + s.giro) };
}

export function comprimentoDoSegmento(s) {
  return s.tipo === 'reta' ? dist(s.a, s.b) : s.r * Math.abs(s.giro);
}

function arcoPorTres(P0, M, P1, onde) {
  const b = [M[0] - P0[0], M[1] - P0[1]], c = [P1[0] - P0[0], P1[1] - P0[1]];
  const d = 2 * cruz(b, c);
  if (Math.abs(d) < 1e-9 * Math.hypot(...b) * Math.hypot(...c)) throw new ErroDeFormaExata(onde, `os três pontos ${pt(P0)}, ${pt(M)} e ${pt(P1)} são colineares; escreva {reto}`);
  const q1 = b[0] * b[0] + b[1] * b[1], q2 = c[0] * c[0] + c[1] * c[1];
  const centro = [P0[0] + (c[1] * q1 - b[1] * q2) / d, P0[1] + (b[0] * q2 - c[0] * q1) / d];
  const sentido = Math.sign(cruz(b, [P1[0] - M[0], P1[1] - M[1]]));
  const a0 = Math.atan2(P0[1] - centro[1], P0[0] - centro[0]), a1 = Math.atan2(P1[1] - centro[1], P1[0] - centro[0]);
  return { tipo: 'arco', c: centro, r: dist(centro, P0), a0, giro: giroNoSentido(a0, a1, sentido) };
}

/** O laço exato de um contorno por trechos, escrito em sentido anti-horário. */
export function lacoExatoPorTrechos(contorno, { onde = 'contorno' } = {}) {
  if (!contorno || typeof contorno !== 'object' || !Array.isArray(contorno.trechos) || contorno.trechos.length < 1) throw new ErroDeFormaExata(onde, 'precisa ser {inicio: [u, v], trechos: [...]} com ao menos um trecho');
  const inicio = pontoDe(contorno.inicio, `${onde}.inicio`);
  const segmentos = [];
  let atual = inicio, tangente = null;
  contorno.trechos.forEach((trecho, k) => {
    const campo = `${onde}.trechos[${k}]`;
    const chaves = trecho && typeof trecho === 'object' ? Object.keys(trecho) : [];
    if (chaves.length !== 1) throw new ErroDeFormaExata(campo, `o trecho precisa ser um objeto de uma chave (veio ${JSON.stringify(trecho)})`);
    const tipo = chaves[0], corpo = trecho[tipo];
    let s;
    if (tipo === 'reto') {
      const ate = pontoDe(corpo, `${campo}.reto`);
      if (dist(atual, ate) < EPS) throw new ErroDeFormaExata(campo, `o reto até ${pt(ate)} tem comprimento zero`);
      s = { tipo: 'reta', a: atual, b: ate };
    } else if (tipo === 'arco' && corpo && 'por' in corpo) {
      s = arcoPorTres(atual, pontoDe(corpo.por, `${campo}.arco.por`), pontoDe(corpo.ate, `${campo}.arco.ate`), campo);
      s.fim = [corpo.ate[0], corpo.ate[1]];
    } else if (tipo === 'arco' && corpo && 'centro' in corpo) {
      const c = pontoDe(corpo.centro, `${campo}.arco.centro`);
      if (!ehNumero(corpo.angulo) || !(Math.abs(corpo.angulo) > 0 && Math.abs(corpo.angulo) < 360)) throw new ErroDeFormaExata(`${campo}.arco.angulo`, `precisa ter módulo entre 0 e 360 graus (veio ${corpo.angulo})`);
      const r = dist(c, atual);
      if (r < EPS) throw new ErroDeFormaExata(campo, 'o centro coincide com o ponto atual');
      s = { tipo: 'arco', c, r, a0: Math.atan2(atual[1] - c[1], atual[0] - c[0]), giro: (corpo.angulo * Math.PI) / 180 };
    } else if (tipo === 'arcoTangente') {
      const Q = pontoDe(corpo, `${campo}.arcoTangente`);
      if (!tangente) throw new ErroDeFormaExata(campo, 'não há trecho anterior para dar a tangente');
      const d = [Q[0] - atual[0], Q[1] - atual[1]];
      const n = [-tangente[1], tangente[0]];
      const dn = d[0] * n[0] + d[1] * n[1];
      const comp = Math.hypot(...d);
      if (Math.abs(dn) < 1e-9 * comp) throw new ErroDeFormaExata(campo, `o ponto ${pt(Q)} está sobre a reta da tangente; escreva {reto}`);
      const rs = (comp * comp) / (2 * dn);
      const c = [atual[0] + n[0] * rs, atual[1] + n[1] * rs];
      const a0 = Math.atan2(atual[1] - c[1], atual[0] - c[0]), a1 = Math.atan2(Q[1] - c[1], Q[0] - c[0]);
      s = { tipo: 'arco', c, r: Math.abs(rs), a0, giro: giroNoSentido(a0, a1, Math.sign(rs)), fim: Q };
    } else {
      throw new ErroDeFormaExata(campo, `o protótipo da forma exata lê reto, arco e arcoTangente; "${tipo}" fica fora (a spline não tem recuo exato em reta e arco, e a concordância não foi levada)`);
    }
    s.trecho = k;
    const p = pontasDoSegmento(s);
    atual = s.fim ?? p.fim;
    delete s.fim;
    tangente = p.tFim;
    segmentos.push(s);
  });
  if (dist(atual, inicio) > 1e-9 * (1 + Math.hypot(...inicio))) segmentos.push({ tipo: 'reta', a: atual, b: inicio, trecho: contorno.trechos.length, fecho: true });
  if (segmentos.length < 2) throw new ErroDeFormaExata(onde, 'um trecho só não delimita área');
  const laco = { segmentos };
  const area = areaDoNivel(nivelDoLaco(laco, segmentos.map(() => 0), { onde }));
  if (!(area > 0)) throw new ErroDeFormaExata(onde, `o contorno precisa ser anti-horário (área ${fmt(area)})`);
  return laco;
}

/** O laço de um círculo inteiro: anti-horário para um contorno de fora, horário (`furo: true`) para um furo. */
export function lacoDoCirculo(centro, raio, { furo = false } = {}) {
  const c = pontoDe(centro, 'circulo.centro');
  if (!ehNumero(raio) || !(raio > 0)) throw new ErroDeFormaExata('circulo.raio', `precisa ser maior que zero (veio ${raio})`);
  return { segmentos: [{ tipo: 'arco', c, r: raio, a0: 0, giro: furo ? -VOLTA : VOLTA, trecho: 0, inteiro: true }] };
}

/* ---- recuo e cantos ---- */

/* a portadora do segmento recuado de n para o lado do material (a esquerda do percurso) */
function portadora(s, n, onde) {
  if (s.tipo === 'reta') {
    const d = dist(s.a, s.b);
    const t = [(s.b[0] - s.a[0]) / d, (s.b[1] - s.a[1]) / d];
    return { tipo: 'reta', p: [s.a[0] - t[1] * n, s.a[1] + t[0] * n], t };
  }
  const r = s.giro > 0 ? s.r - n : s.r + n;
  if (!(r > 1e-9 * s.r)) throw new ErroDeFormaExata(onde, `o recuo de ${fmt(n)} passa do raio ${fmt(s.r)} do arco do trecho ${s.trecho}, e o arco some; o limite é o raio`);
  return { tipo: 'arco', c: s.c, r, sentido: Math.sign(s.giro) };
}

function intersecoes(A, B) {
  if (A.tipo === 'reta' && B.tipo === 'reta') {
    const den = cruz(A.t, B.t);
    if (Math.abs(den) < 1e-12) return [];
    const w = [B.p[0] - A.p[0], B.p[1] - A.p[1]];
    const k = cruz(w, B.t) / den;
    return [[A.p[0] + A.t[0] * k, A.p[1] + A.t[1] * k]];
  }
  if (A.tipo === 'reta' || B.tipo === 'reta') {
    const R = A.tipo === 'reta' ? A : B, C = A.tipo === 'reta' ? B : A;
    const w = [R.p[0] - C.c[0], R.p[1] - C.c[1]];
    const b = w[0] * R.t[0] + w[1] * R.t[1];
    const disc = b * b - (w[0] * w[0] + w[1] * w[1] - C.r * C.r);
    if (disc < 0) return [];
    const q = Math.sqrt(disc);
    return [-b - q, -b + q].map((k) => [R.p[0] + R.t[0] * k, R.p[1] + R.t[1] * k]);
  }
  const d = dist(A.c, B.c);
  if (d < 1e-15 || d > A.r + B.r || d < Math.abs(A.r - B.r)) return [];
  const a = (A.r * A.r - B.r * B.r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, A.r * A.r - a * a));
  const u = [(B.c[0] - A.c[0]) / d, (B.c[1] - A.c[1]) / d];
  const m = [A.c[0] + u[0] * a, A.c[1] + u[1] * a];
  return [[m[0] - u[1] * h, m[1] + u[0] * h], [m[0] + u[1] * h, m[1] - u[0] * h]];
}

/** O laço num nível: cada segmento recuado de `recuos[i]` e aparado nos cantos. Devolve { segmentos: [{tipo, de, ate, ...}] }, com `de` e `ate` exatos. */
export function nivelDoLaco(laco, recuos, { onde = 'nível' } = {}) {
  const S = laco.segmentos, m = S.length;
  if (m === 1 && S[0].inteiro) {
    const p = portadora(S[0], recuos[0], onde);
    return { segmentos: [{ tipo: 'arco', c: p.c, r: p.r, a0: 0, giro: S[0].giro, inteiro: true, trecho: 0 }] };
  }
  const port = S.map((s, i) => portadora(s, recuos[i], onde));
  const pontas = S.map(pontasDoSegmento);
  /* o canto j fica entre o segmento j-1 e o segmento j */
  const cantos = S.map((_, j) => {
    const i = (j - 1 + m) % m;
    const V = pontas[j].ini, t1 = pontas[i].tFim, t2 = pontas[j].tIni;
    const tangente = Math.abs(cruz(t1, t2)) < 1e-9 && t1[0] * t2[0] + t1[1] * t2[1] > 0;
    if (tangente) {
      if (Math.abs(recuos[i] - recuos[j]) > 1e-12 * (1 + Math.abs(recuos[i]))) {
        throw new ErroDeFormaExata(onde, `os trechos ${S[i].trecho} e ${S[j].trecho} se encontram em tangência em ${pt(V)} com recuos diferentes (${fmt(recuos[i])} e ${fmt(recuos[j])}); a borda só muda num canto vivo do contorno`);
      }
      return [V[0] - t2[1] * recuos[j], V[1] + t2[0] * recuos[j]];
    }
    const cand = intersecoes(port[i], port[j]);
    if (!cand.length) throw new ErroDeFormaExata(onde, `com os recuos ${fmt(recuos[i])} e ${fmt(recuos[j])} os trechos ${S[i].trecho} e ${S[j].trecho} deixam de se encontrar perto de ${pt(V)}`);
    return cand.reduce((a, b) => (dist(b, V) < dist(a, V) ? b : a));
  });
  const segmentos = S.map((s, i) => {
    const de = cantos[i], ate = cantos[(i + 1) % m];
    if (s.tipo === 'reta') {
      const t = port[i].t;
      const avanco = (ate[0] - de[0]) * t[0] + (ate[1] - de[1]) * t[1];
      if (!(avanco > 1e-9 * dist(s.a, s.b))) throw new ErroDeFormaExata(onde, `o trecho ${s.trecho} (reto de ${fmt(dist(s.a, s.b))}) some com os recuos pedidos: sobra ${fmt(avanco)}; diminua a largura da borda dos vizinhos`);
      return { tipo: 'reta', de, ate, trecho: s.trecho };
    }
    const c = s.c, r = port[i].r;
    const a0 = Math.atan2(de[1] - c[1], de[0] - c[0]), a1 = Math.atan2(ate[1] - c[1], ate[0] - c[0]);
    const giro = giroNoSentido(a0, a1, Math.sign(s.giro));
    if (Math.abs(giro) > Math.abs(s.giro) + Math.PI) throw new ErroDeFormaExata(onde, `o trecho ${s.trecho} (arco de raio ${fmt(s.r)}) some com os recuos pedidos; diminua a largura da borda dos vizinhos`);
    return { tipo: 'arco', de, ate, c, r, a0, giro, trecho: s.trecho };
  });
  return { segmentos };
}

/** A área com sinal do nível, exata: o polígono dos cantos mais o segmento circular de cada arco. */
export function areaDoNivel(nivel) {
  const S = nivel.segmentos;
  if (S.length === 1 && S[0].inteiro) return Math.sign(S[0].giro) * Math.PI * S[0].r * S[0].r;
  let soma = 0;
  for (const s of S) {
    soma += (s.de[0] * s.ate[1] - s.ate[0] * s.de[1]) / 2;
    if (s.tipo === 'arco') soma += (s.r * s.r * (s.giro - Math.sin(s.giro))) / 2;
  }
  return soma;
}

/** Quantas divisões cada segmento do laço recebe, iguais em todos os níveis: a reta pelo `passo`, o arco pelo `passo` e pelo `desvio` da corda no maior raio; o círculo inteiro com `lados` declarados usa esse número. */
export function divisoesDoLaco(laco, { passo, desvio, recuoMaximo = 0 }) {
  return laco.segmentos.map((s) => {
    if (s.tipo === 'reta') return Math.max(1, Math.ceil(dist(s.a, s.b) / passo - 1e-9));
    if (s.inteiro && laco.lados) return laco.lados;
    const r = s.r + recuoMaximo;
    const angulo = 2 * Math.acos(Math.max(-1, 1 - desvio / r));
    const n = Math.max(Math.ceil(Math.abs(s.giro) / angulo - 1e-9), Math.ceil((r * Math.abs(s.giro)) / passo - 1e-9), 1);
    return s.inteiro ? Math.max(8, n) : n;
  });
}

/** Os pontos do nível, em ciclo: de cada segmento, o ponto de partida e os intermediários (o de chegada é a partida do seguinte). */
export function amostrarNivel(nivel, divisoes) {
  const pontos = [];
  nivel.segmentos.forEach((s, i) => {
    const n = divisoes[i];
    for (let k = 0; k < n; k++) {
      if (s.tipo === 'reta') {
        if (k === 0) pontos.push([s.de[0], s.de[1]]);
        else { const f = k / n; pontos.push([s.de[0] + (s.ate[0] - s.de[0]) * f, s.de[1] + (s.ate[1] - s.de[1]) * f]); }
      } else if (k === 0 && !s.inteiro) pontos.push([s.de[0], s.de[1]]);
      else { const a = s.a0 + (s.giro * k) / n; pontos.push([s.c[0] + s.r * Math.cos(a), s.c[1] + s.r * Math.sin(a)]); }
    }
  });
  return pontos;
}
