/* corpo-por-fatias.js — o corpo liso que passa por contornos fechados livres dados em posições ao longo de um eixo, com as pontas tampadas
 *
 * FICHA corpoPorFatias
 * serve: gaiola de um corpo sólido dado por fatias: em cada posição ao longo de um eixo, um contorno fechado qualquer em mm (polígono simples, convexo
 *   ou não, com o número de pontos que a receita quiser, diferente de uma fatia a outra), ligados numa superfície que a `subdivisao` deixa lisa, com
 *   as duas pontas tampadas. A operação reamostra cada contorno no mesmo número de pontos, interpola as fatias (suave ou linear) e entrega a gaiola.
 * quando: casco, asa, fuselagem, frasco, carenagem, pá, qualquer corpo cuja seção muda de forma e de número de pontos ao longo do comprimento, e que o
 *   `loft` (24 seções, 1000 pontos, seção convexa, polo digitado) não cabe. Para a seção que é uma superelipse use corpoDeSecaoVariavel; para uma
 *   chapa de espessura constante, chapaDeContorno; para o sólido de seção constante que passa por um caminho, gaiolaVarrida.
 * unidades: `em` e os pontos dos contornos em mm; `pontos` sai em metro, para pôr em TOPO; espalhe `passo` no passo subdivisao.
 * campos:
 *   nome: prefixo dos pontos (texto), como em gaiolaPorLacos.
 *   eixo: 'x', 'y' ou 'z', o eixo do corpo; o ponto [u, v] do contorno são os outros dois eixos na ordem x, y, z.
 *   fatias: [{ nome?, em, contorno }] em crescente e a ao menos 2,5 mm uma da outra (padrão do nome: `f0`, `f1`, ...). O contorno é a lista dos pontos da
 *     volta, no sentido anti-horário em [u, v] (o ponto seguinte a 90 graus à esquerda; o horário é recusado com a área recebida), sem repetir o primeiro
 *     no fim; cada ponto é [u, v] ou { nome, ponto: [u, v] }. O PRIMEIRO PONTO é a âncora: todas as fatias começam no mesmo detalhe (o bordo de
 *     fuga, o fundo), senão o corpo torce. Um ponto com nome é um MARCO: o nome e a ordem dos marcos são os mesmos em todas as fatias, o ponto fica
 *     exato em todas elas, e a volta entre dois marcos é reamostrada com o mesmo número de pontos em toda fatia.
 *   pontos: quantos pontos tem a volta de cada plano, inteiro par de 8 para cima (padrão: o maior número de pontos de uma fatia, arredondado para par,
 *     entre 16 e 64). Tem de comportar os marcos e a âncora, um ponto cada ao menos.
 *   interpolacao: 'suave' (padrão, Hermite monótono por ponto, sem passar dos valores das fatias) ou 'linear'.
 *   passo: a distância entre planos, em mm (padrão: o maior entre 2,5 e um quadragésimo do comprimento do corpo); os planos das fatias entram sempre.
 *   tolerancia: quanto a volta reamostrada pode ficar do ponto dado, em mm (padrão 0,1); o ponto dado, sem nome, que fica mais longe sai em `avisos`.
 *   vivos: nomes de marcos ('inicio' é a âncora sem nome) cuja linha ao longo do corpo fica viva, sem arredondar: o bordo de fuga de uma asa.
 * devolve: { pontos, pontosMm, alvosMm, passo, nomeDe, lacos, trechos, avisos, corpo, pontoDe }: o de gaiolaPorLacos, mais `corpo`
 *   { planos, pontosPorVolta, fatias: [{ nome, em, laco, pontosDados, perdidos }], marcos: { nome: indice }, perdas } e `pontoDe(laco, i)`, o nome do
 *   ponto de índice i (ou de um marco) na volta do laço (nome ou posição). O passo leva os grupos `tampaInicio`, `tampaFim` e, para cada par de fatias
 *   seguidas, `entre_<a>_<b>` (que inclui a tampa, quando o par é o primeiro ou o último), citáveis por `parte` como origem do passo.
 * exemplo:
 *   corpoPorFatias({ nome: 'casco', eixo: 'x', passo: 10,
 *     fatias: [
 *       { em: 0, contorno: [{ nome: 'quilha', ponto: [0, -4] }, [5, -3], [6, 0], [4, 4], [0, 5], [-4, 4], [-6, 0], [-5, -3]] },
 *       { em: 80, contorno: [{ nome: 'quilha', ponto: [0, -12] }, [14, -8], [18, 0], [14, 10], [0, 14], [-14, 10], [-18, 0], [-14, -8]] },
 *       { em: 140, contorno: [{ nome: 'quilha', ponto: [0, -7] }, [8, -5], [10, 0], [7, 6], [0, 8], [-7, 6], [-10, 0], [-8, -5]] }],
 *     vivos: ['quilha'] })
 * peça: procedural/nucleo/corpo-por-fatias.test.mjs (o exemplo, o casco com quilha viva, medido pelas réguas de malha; a prova em peças reais está na fatia 7 do plano da forma exata).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. Cada contorno é partido nos marcos (a âncora, o primeiro ponto, é sempre um) em voltas, e cada volta é
 * reamostrada com pontos a distâncias iguais ao longo dela (e o vértice dado a menos de 0,45 do passo de um deles toma o lugar dele), no mesmo número em todas as fatias: o número de segmentos de cada volta é a parte
 * do perímetro que ela toma, em média nas fatias, do total `pontos` (o maior resto, no mínimo um). O ponto de mesmo índice liga as fatias. Os planos
 * são as fatias e a grade de `passo` a partir da primeira, sem os pontos da grade a menos de `passo` de outro plano; em cada plano a volta é a
 * interpolação ponto a ponto. A gaiolaPorLacos recebe a volta em N trechos de dois pontos, porque ela reamostra cada trecho com pontos a distâncias
 * iguais, e só o de dois pontos deixa os pontos desta operação onde estão; a tampa em escada liga o ponto de índice 1 + j ao de N - j (N = pontos).
 * O ponto de índice i de um laço se chama `${nome}_${laço}_p<i>_0`, que `pontoDe` devolve. O laço de um plano que não é fatia se chama `<eixo><em>` (o ponto decimal vira `_`).
 *
 * O QUE ESTA OPERAÇÃO TIRA. O `loft` tem 24 seções e mil pontos por forma, seção convexa e polo digitado para fechar a ponta: aqui as fatias são
 * quantas a receita der, o contorno tem os pontos que quiser e pode ser côncavo no meio do corpo (na ponta, só se a escada da tampa o cobre, o que a âncora decide e a recusa confere), a tampa sai do contorno e a
 * volta, de fatia a fatia, é reamostrada sem a receita escrever o contorno inteiro de novo em cada seção. O que fica: a gaiola pede 2,5 mm entre
 * planos, e o corpo não fecha em ponta de um ponto só (a última fatia é um contorno pequeno, de segmento médio de ao menos 0,05 mm; a razão entre os tamanhos de duas fatias não limita nada, medida de 2 a 400);
 * a superfície é lisa por subdivisão, e a quina só fica viva onde um marco está em `vivos`.
 *
 * AS RECUSAS. Cada uma diz a fatia, o valor recebido, o que se espera e o conserto. Menos de duas fatias; fatia sem `em` finito ou sem contorno de três pontos
 * ou mais; ponto que não é [u, v] finito; nome de ponto repetido; fatias fora de ordem, na mesma posição ou a menos de 2,5 mm uma da outra; ponto repetido
 * (o seguinte, ou o último igual ao primeiro, a menos de 1 µm); ponta que volta sobre si; contorno de área zero (os pontos em uma reta, ou um ponto só); contorno
 * horário; contorno que se cruza ou se toca; marcos diferentes de uma fatia a outra; `pontos` ímpar, abaixo de 8 ou sem lugar para os marcos; fatia cuja volta tem segmento médio
 * menor que SEGMENTO_MEDIO_MINIMO_MM (a ponta de um ponto só e a fatia minúscula); uma volta reamostrada ou interpolada que se cruza (pontos de menos, ou
 * fatias torcidas); a tampa em escada que não cobre o contorno (côncavo demais na ponta); a gaiola com face fina; `vivos` com marco que não existe. */
import { gaiolaPorLacos, DISTANCIA_MINIMA_ENTRE_PLANOS_MM } from './gaiola-por-lacos.js';

const EIXOS = { x: 0, y: 1, z: 2 };
const falha = (texto) => { throw new RangeError(`corpoPorFatias: ${texto}`); };
const br = (x, casas = 2) => String(Number(Number(x).toFixed(casas))).replace('.', ',');
const numero = (x) => typeof x === 'number' && Number.isFinite(x);
const par = (p) => Array.isArray(p) && p.length === 2 && numero(p[0]) && numero(p[1]);
const arredonda = (x) => Math.round(x * 1e4) / 1e4;
const citar = (x) => `'${x}'`;

/* dois pontos seguidos a menos disto (1 µm) são o mesmo ponto; dois lados que se aproximam disto se tocam */
export const TOLERANCIA_DE_PONTO_MM = 1e-3;
/* quanto a volta reamostrada pode ficar de um ponto dado antes de o aviso `pontoPerdido` sair */
export const TOLERANCIA_DA_REAMOSTRAGEM_MM = 0.1;
/* o segmento médio da volta (perímetro sobre pontos) abaixo do qual a gaiola não fecha a tampa sem faces de área zero. Medido com círculos de 24 e de 64
   pontos: raio 0,2 mm em 24 pontos (segmento 0,052 mm) fecha, e raio 0,3 em 64 (0,029), 0,1 em 24 (0,026) e 0,2 em 64 (0,020) não. A razão entre os
   tamanhos de duas fatias, por si, não deixou face fina: de 2 a 400, de 2,5 a 100 mm entre planos, concêntricas ou deslocadas, com 1 e 2 níveis. */
export const SEGMENTO_MEDIO_MINIMO_MM = 0.05;
/* um degrau da tampa de área negativa abaixo disto, em fração da área do contorno, é recusado: o ruído de ponto flutuante fica de fora */
const TOLERANCIA_DO_DEGRAU = 1e-9;
/* o giro, em graus, de um vértice dado a partir do qual ele é um canto: a reamostragem o guarda como ponto da volta, quando houver pontos bastantes */
export const ANGULO_DE_CANTO_PADRAO = 20;
export const PONTOS_MINIMOS_DA_VOLTA = 8;
export const PONTOS_PADRAO_MINIMO = 16;
export const PONTOS_PADRAO_MAXIMO = 64;

/* Hermite monótono por partes (cópia do de corpoDeSecaoVariavel, que não o exporta) */
function tangentes(xs, ys) {
  const n = xs.length;
  const sec = (k) => (ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]);
  return ys.map((_, k) => {
    if (k === 0) return sec(0);
    if (k === n - 1) return sec(n - 2);
    const a = sec(k - 1); const b = sec(k);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
}
function suave(xs, ys, tg, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 0;
  while (xs[i + 1] < x) i++;
  const h = xs[i + 1] - xs[i]; const t = (x - xs[i]) / h;
  return (2 * t ** 3 - 3 * t ** 2 + 1) * ys[i] + (t ** 3 - 2 * t ** 2 + t) * h * tg[i] + (-2 * t ** 3 + 3 * t ** 2) * ys[i + 1] + (t ** 3 - t ** 2) * h * tg[i + 1];
}
function linear(xs, ys, _tg, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 0;
  while (xs[i + 1] < x) i++;
  return ys[i] + ((ys[i + 1] - ys[i]) * (x - xs[i])) / (xs[i + 1] - xs[i]);
}

/* ---------- geometria 2D ---------- */
const areaComSinal = (c) => c.reduce((s, p, k) => { const q = c[(k + 1) % c.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2;
const perimetro = (c) => c.reduce((s, p, k) => { const q = c[(k + 1) % c.length]; return s + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);
function distanciaPontoSegmento(p, a, b) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const q = dx * dx + dy * dy;
  const t = q > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / q)) : 0;
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
}
const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function segmentosSeCruzam(a, b, c, d) {
  const d1 = cruz(a, b, c); const d2 = cruz(a, b, d); const d3 = cruz(c, d, a); const d4 = cruz(c, d, b);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)) && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
}
function distanciaSegmentoSegmento(a, b, c, d) {
  if (segmentosSeCruzam(a, b, c, d)) return 0;
  return Math.min(distanciaPontoSegmento(a, c, d), distanciaPontoSegmento(b, c, d), distanciaPontoSegmento(c, a, b), distanciaPontoSegmento(d, a, b));
}
/* o primeiro par de lados sem ponto em comum que se cruza ou se toca (a menos de TOLERANCIA_DE_PONTO_MM), ou null */
function primeiroToque(c) {
  const n = c.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (distanciaSegmentoSegmento(c[i], c[(i + 1) % n], c[j], c[(j + 1) % n]) <= TOLERANCIA_DE_PONTO_MM) return [i, j];
    }
  }
  return null;
}
/* o lado que volta sobre o anterior (ponta de ângulo zero): o produto vetorial nulo e o escalar negativo */
function primeiraPontaQueVolta(c) {
  const n = c.length;
  for (let i = 0; i < n; i++) {
    const a = c[(i + n - 1) % n]; const b = c[i]; const d = c[(i + 1) % n];
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const vx = d[0] - b[0]; const vy = d[1] - b[1];
    const lu = Math.hypot(ux, uy); const lv = Math.hypot(vx, vy);
    if (Math.abs(ux * vy - uy * vx) <= TOLERANCIA_DE_PONTO_MM * Math.max(lu, lv) && ux * vx + uy * vy < 0) return i;
  }
  return null;
}

/* ---------- a leitura das fatias ---------- */
function lerFatia(f, i, minimo) {
  const onde = `fatias[${i}]`;
  if (!f || typeof f !== 'object' || Array.isArray(f)) falha(`${onde} é { nome?, em, contorno }, e veio ${JSON.stringify(f)}`);
  if (!numero(f.em)) falha(`${onde}.em é a posição da fatia no eixo, número em mm, e veio ${JSON.stringify(f.em)}`);
  if (f.nome != null && (typeof f.nome !== 'string' || !f.nome)) falha(`${onde}.nome é texto não vazio, e veio ${JSON.stringify(f.nome)}`);
  const nome = f.nome ?? `f${i}`;
  const onde2 = `${onde} (${citar(nome)}, em ${br(f.em)} mm)`;
  if (!Array.isArray(f.contorno) || f.contorno.length < 3) falha(`${onde2}: contorno é a lista dos pontos da volta, três ou mais, e veio ${Array.isArray(f.contorno) ? `${f.contorno.length} ${f.contorno.length === 1 ? 'ponto' : 'pontos'}` : JSON.stringify(f.contorno)}; uma fatia de um ponto só não fecha o corpo em ponta, ponha uma fatia pequena de contorno de três pontos ou mais`);
  const pts = []; const nomes = [];
  f.contorno.forEach((p, k) => {
    const dado = Array.isArray(p) ? p : p?.ponto;
    if (!par(dado)) falha(`${onde2}: o ponto ${k} é [u, v] ou { nome, ponto: [u, v] } com números finitos em mm, e veio ${JSON.stringify(p)}`);
    if (!Array.isArray(p)) {
      if (typeof p.nome !== 'string' || !p.nome) falha(`${onde2}: o ponto ${k} tem nome ${JSON.stringify(p.nome)}; nome de marco é texto não vazio`);
      if (nomes.some((n) => n.nome === p.nome)) falha(`${onde2}: o nome de marco ${citar(p.nome)} aparece em dois pontos; cada marco tem nome único`);
      nomes.push({ nome: p.nome, k });
    }
    pts.push([dado[0], dado[1]]);
  });
  if (nomes.some((n) => n.nome === 'inicio' && n.k !== 0)) falha(`${onde2}: 'inicio' é o nome da âncora (o ponto 0) e só pode ser dado a ele`);
  return { nome, em: f.em, pts, nomes, onde: onde2 };
}

function conferirContorno(F) {
  const c = F.pts; const n = c.length;
  for (let k = 0; k < n; k++) {
    const q = c[(k + 1) % n];
    if (Math.hypot(q[0] - c[k][0], q[1] - c[k][1]) <= TOLERANCIA_DE_PONTO_MM) {
      falha(`${F.onde}: o ponto ${(k + 1) % n} repete o ponto ${k} (${br(Math.hypot(q[0] - c[k][0], q[1] - c[k][1]), 4)} mm, abaixo de ${br(TOLERANCIA_DE_PONTO_MM, 3)} mm)${(k + 1) % n === 0 ? '; o contorno não repete o primeiro ponto no fim, a volta fecha sozinha' : ''}; tire um dos dois, ou, para um canto vivo, use um marco`);
    }
  }
  const area = areaComSinal(c);
  if (Math.abs(area) <= 1e-9) falha(`${F.onde}: o contorno tem área ${br(area, 6)} mm², os pontos estão numa reta ou num ponto só; a fatia precisa de área, e a ponta que fecha em ponto é uma fatia pequena, de três pontos ou mais fora de uma reta`);
  const volta = primeiraPontaQueVolta(c);
  if (volta != null) falha(`${F.onde}: no ponto ${volta} o contorno volta sobre o lado anterior (ponta de ângulo zero), e a superfície se toca ali; tire o ponto ou abra a ponta`);
  if (area < 0) falha(`${F.onde}: o contorno é horário (área ${br(area)} mm², negativa em [u, v]); o corpo espera o sentido anti-horário, então dê os pontos na ordem inversa (conserto: contorno.reverse(), mantendo o primeiro ponto como âncora)`);
  const toque = primeiroToque(c);
  if (toque) falha(`${F.onde}: o lado ${toque[0]} (do ponto ${toque[0]} ao ${(toque[0] + 1) % n}) e o lado ${toque[1]} (do ponto ${toque[1]} ao ${(toque[1] + 1) % n}) se cruzam ou se tocam; o contorno é uma volta simples, sem cruzar nem encostar em si`);
}

/* o giro, em graus, do contorno no vértice k da polilinha (0 numa reta, 180 na ponta que volta) */
function giroEm(poli, k) {
  const a = Math.atan2(poli[k][1] - poli[k - 1][1], poli[k][0] - poli[k - 1][0]);
  const b = Math.atan2(poli[k + 1][1] - poli[k][1], poli[k + 1][0] - poli[k][0]);
  let d = Math.abs(b - a) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
}
/* os vértices interiores de uma volta em que o contorno gira mais que `limite` graus: { k, giro } */
const cantosDaVolta = (poli, limite) => poli.slice(1, -1).map((_, i) => ({ k: i + 1, giro: giroEm(poli, i + 1) })).filter((c) => c.giro > limite);

/* reamostra a polilinha aberta `poli` em `s` segmentos: devolve s pontos (sem o último, que é o marco seguinte). Os pontos caem a distâncias iguais
   ao longo dela, menos os cantos (giro acima de `limite` graus): cada canto é um ponto da volta, no índice mais perto do que a distância igual daria,
   e as amostras entre dois cantos ficam a distâncias iguais entre eles. Com mais cantos que amostras (s - 1), ficam os de maior giro. */
function reamostrarVolta(poli, s, limite) {
  const acc = [0];
  for (let k = 1; k < poli.length; k++) acc.push(acc[k - 1] + Math.hypot(poli[k][0] - poli[k - 1][0], poli[k][1] - poli[k - 1][1]));
  const total = acc[acc.length - 1];
  const passo = total / s;
  let cantos = cantosDaVolta(poli, limite);
  if (cantos.length > s - 1) cantos = [...cantos].sort((x, y) => y.giro - x.giro || x.k - y.k).slice(0, s - 1).sort((x, y) => x.k - y.k);
  const ancoras = [{ i: 0, a: 0 }];
  cantos.forEach((c, j) => {
    const ideal = Math.round(acc[c.k] / passo);
    const i = Math.min(Math.max(ideal, ancoras.at(-1).i + 1), s - (cantos.length - j));
    ancoras.push({ i, a: acc[c.k] });
  });
  ancoras.push({ i: s, a: total });
  const alvo = new Array(s).fill(0);
  for (let t = 0; t + 1 < ancoras.length; t++) {
    const p = ancoras[t]; const q = ancoras[t + 1];
    for (let i = p.i; i < q.i && i < s; i++) alvo[i] = p.a + ((q.a - p.a) * (i - p.i)) / (q.i - p.i);
  }
  const saida = [[...poli[0]]];
  let j = 0;
  for (let i = 1; i < s; i++) {
    while (j < acc.length - 2 && acc[j + 1] < alvo[i]) j++;
    const d = acc[j + 1] - acc[j];
    const t = d > 0 ? (alvo[i] - acc[j]) / d : 0;
    saida.push([poli[j][0] + (poli[j + 1][0] - poli[j][0]) * t, poli[j][1] + (poli[j + 1][1] - poli[j][1]) * t]);
  }
  return saida;
}

/* quantos segmentos cada volta recebe: o inteiro de cada uma, de no mínimo `minimos[k]` (1 se não couber), que soma N, pela fração média do perímetro (maior resto) */
function repartir(fracoes, N, minimos = fracoes.map(() => 1)) {
  const K = fracoes.length;
  const pisos = minimos.reduce((a, b) => a + b, 0) <= N ? minimos : fracoes.map(() => 1);
  const base = fracoes.map((f, k) => Math.max(pisos[k], Math.floor(f * N)));
  const resto = fracoes.map((f, k) => f * N - Math.floor(f * N) + k * 1e-12 * -1);
  let soma = base.reduce((a, b) => a + b, 0);
  while (soma < N) {
    let m = 0;
    for (let k = 1; k < K; k++) if (resto[k] > resto[m]) m = k;
    base[m] += 1; resto[m] = -1; soma += 1;
  }
  while (soma > N) {
    let m = -1;
    for (let k = 0; k < K; k++) if (base[k] > pisos[k] && (m < 0 || resto[k] < resto[m])) m = k;
    base[m] -= 1; resto[m] = 2; soma -= 1;
  }
  return base;
}

export function corpoPorFatias(o = {}) {
  const prefixo = o.nome ?? 'corpo';
  if (typeof prefixo !== 'string' || !prefixo) falha('nome é o prefixo dos pontos, texto não vazio');
  if (!(o.eixo in EIXOS)) falha(`eixo é 'x', 'y' ou 'z', e veio ${JSON.stringify(o.eixo)}`);
  const minimo = DISTANCIA_MINIMA_ENTRE_PLANOS_MM;
  if (!Array.isArray(o.fatias) || o.fatias.length < 2) falha(`fatias é a lista de ao menos duas { nome?, em, contorno }, e veio ${Array.isArray(o.fatias) ? `${o.fatias.length} fatia` : JSON.stringify(o.fatias)}`);
  const interpolacao = o.interpolacao ?? 'suave';
  if (!['suave', 'linear'].includes(interpolacao)) falha(`interpolacao é 'suave' ou 'linear', e veio ${JSON.stringify(o.interpolacao)}`);
  const tolerancia = o.tolerancia ?? TOLERANCIA_DA_REAMOSTRAGEM_MM;
  if (!(numero(tolerancia) && tolerancia > 0)) falha(`tolerancia é número positivo em mm, e veio ${JSON.stringify(o.tolerancia)}`);
  const anguloDeCanto = o.anguloDeCanto ?? ANGULO_DE_CANTO_PADRAO;
  if (!(numero(anguloDeCanto) && anguloDeCanto > 0 && anguloDeCanto < 180)) falha(`anguloDeCanto é o giro em graus, de 0 a 180 (exclusive), a partir do qual um vértice dado é um canto que a volta guarda, e veio ${JSON.stringify(o.anguloDeCanto)}`);
  if (o.vivos != null && !(Array.isArray(o.vivos) && o.vivos.every((v) => typeof v === 'string' && v))) falha(`vivos é a lista de nomes de marco, e veio ${JSON.stringify(o.vivos)}`);

  /* as fatias, na ordem e na distância */
  const F = o.fatias.map((f, i) => lerFatia(f, i, minimo));
  const nomesDeFatia = new Set();
  F.forEach((f, i) => {
    if (nomesDeFatia.has(f.nome)) falha(`o nome de fatia ${citar(f.nome)} aparece duas vezes (fatias[${i}]); cada fatia tem nome único`);
    nomesDeFatia.add(f.nome);
    if (i > 0) {
      const d = f.em - F[i - 1].em;
      if (!(d > 0)) falha(`${f.onde} vem depois de ${F[i - 1].onde} e não está à frente dela (${br(d)} mm); as fatias vêm em ordem crescente de em, sem repetir a posição`);
      if (d < minimo - 1e-9) falha(`${f.onde} fica a ${br(d)} mm da fatia anterior (${F[i - 1].onde}), abaixo do mínimo de ${br(minimo)} mm entre planos da gaiola, que ondula a superfície; afaste as fatias para ao menos ${br(minimo)} mm`);
    }
  });
  F.forEach(conferirContorno);

  /* os marcos: os mesmos, na mesma ordem, em toda fatia; o ponto 0 é sempre um (a âncora) */
  const marcosDe = (f) => {
    const lista = [{ nome: f.nomes.find((n) => n.k === 0)?.nome ?? 'inicio', k: 0 }];
    for (const n of f.nomes) if (n.k !== 0) lista.push({ nome: n.nome, k: n.k });
    return lista;
  };
  const M0 = marcosDe(F[0]).map((m) => m.nome);
  F.forEach((f) => {
    const m = marcosDe(f).map((x) => x.nome);
    if (m.length !== M0.length || m.some((x, k) => x !== M0[k])) falha(`${f.onde} tem os marcos [${m.join(', ')}], e ${F[0].onde} tem [${M0.join(', ')}]; os marcos têm os mesmos nomes na mesma ordem da volta em todas as fatias (o primeiro ponto é a âncora, 'inicio' se não tiver nome); nomeie o mesmo ponto em todas, ou em nenhuma`);
  });
  const K = M0.length;

  /* quantos pontos tem a volta */
  const maiorDado = Math.max(...F.map((f) => f.pts.length));
  const pontosPadrao = Math.min(PONTOS_PADRAO_MAXIMO, Math.max(PONTOS_PADRAO_MINIMO, maiorDado + (maiorDado % 2)));
  const N = o.pontos ?? pontosPadrao;
  if (!(Number.isInteger(N) && N % 2 === 0 && N >= PONTOS_MINIMOS_DA_VOLTA)) falha(`pontos é inteiro par de ${PONTOS_MINIMOS_DA_VOLTA} para cima, os pontos da volta de cada plano, e veio ${JSON.stringify(o.pontos)}`);
  if (N < K) falha(`pontos = ${N}, e o contorno tem ${K} marcos (${M0.join(', ')}), um ponto cada ao menos; ponha pontos de ${K + (K % 2)} para cima`);

  /* a reamostragem: as voltas entre marcos, com o mesmo número de segmentos em toda fatia */
  const voltasDe = F.map((f) => {
    const m = marcosDe(f);
    return m.map((x, a) => {
      const fim = a + 1 < m.length ? m[a + 1].k : f.pts.length;
      const poli = f.pts.slice(x.k, fim + 1 > f.pts.length ? f.pts.length : fim + 1);
      if (fim === f.pts.length) poli.push(f.pts[0]);
      return poli;
    });
  });
  const compr = (poli) => poli.slice(1).reduce((s, p, k) => s + Math.hypot(p[0] - poli[k][0], p[1] - poli[k][1]), 0);
  const fracoes = Array.from({ length: K }, (_, a) => F.reduce((s, _f, i) => s + compr(voltasDe[i][a]) / perimetro(F[i].pts), 0) / F.length);
  const cantosPorVolta = voltasDe.map((voltas) => voltas.map((poli) => cantosDaVolta(poli, anguloDeCanto).length));
  const minimos = Array.from({ length: K }, (_, a) => 1 + Math.max(...cantosPorVolta.map((c) => c[a])));
  const segmentos = repartir(fracoes, N, minimos);
  const inicioDe = []; segmentos.reduce((s, x) => { inicioDe.push(s); return s + x; }, 0);
  const marcos = Object.fromEntries(M0.map((nome, a) => [nome, inicioDe[a]]));
  const loops = voltasDe.map((voltas) => voltas.flatMap((poli, a) => reamostrarVolta(poli, segmentos[a], anguloDeCanto)));

  /* o ponto dado que a volta reamostrada deixa longe: o aviso, e nunca o silêncio */
  const avisos = [];
  const perdas = [];
  F.forEach((f, i) => {
    const nomeados = new Set(f.nomes.map((n) => n.k)); nomeados.add(0);
    const L = loops[i];
    const longe = [];
    f.pts.forEach((p, k) => {
      if (nomeados.has(k)) return;
      let d = Infinity;
      for (let q = 0; q < N; q++) d = Math.min(d, distanciaPontoSegmento(p, L[q], L[(q + 1) % N]));
      if (d > tolerancia) longe.push({ indice: k, ponto: p, distanciaMm: Number(d.toFixed(3)) });
    });
    perdas.push({ fatia: f.nome, perdidos: longe.length, pior: longe.reduce((m, x) => (!m || x.distanciaMm > m.distanciaMm ? x : m), null) });
    if (longe.length) {
      const pior = perdas[i].pior;
      avisos.push({
        ref: 'pontoPerdido', fatia: f.nome, quantos: longe.length, indice: pior.indice, distanciaMm: pior.distanciaMm,
        texto: `na fatia ${citar(f.nome)} (em ${br(f.em)} mm), ${longe.length} de ${f.pts.length} pontos dados ficam a mais de ${br(tolerancia)} mm da volta reamostrada em ${N} pontos, o pior o ponto ${pior.indice} (${br(pior.distanciaMm)} mm); suba pontos, ou nomeie esse ponto no contorno (um marco fica exato em todas as fatias)`,
      });
    }
  });

  /* o canto (giro acima de anguloDeCanto) que a volta não tem amostras para guardar: o aviso diz quantos pontos bastam */
  const bastam = () => {
    for (let n = N + 2; n <= 4096; n += 2) {
      const seg = repartir(fracoes, n, minimos);
      if (seg.every((x, a) => x >= minimos[a])) return n;
    }
    return null;
  };
  let pontosQueBastam;
  F.forEach((f, i) => {
    const faltam = cantosPorVolta[i].reduce((t, c, a) => t + Math.max(0, c - (segmentos[a] - 1)), 0);
    if (!faltam) return;
    pontosQueBastam ??= bastam();
    avisos.push({
      ref: 'cantoPerdido', fatia: f.nome, quantos: faltam, pontosQueBastam,
      texto: `na fatia ${citar(f.nome)} (em ${br(f.em)} mm), ${faltam} ${faltam === 1 ? 'canto' : 'cantos'} (giro acima de ${br(anguloDeCanto)} graus) ficam sem ponto na volta de ${N} pontos; ${pontosQueBastam ? `com pontos de ${pontosQueBastam} para cima todos cabem` : 'nenhum número de pontos até 4096 os guarda, então divida a volta com marcos nos cantos'}`,
    });
  });

  /* o tamanho: a volta com segmentos curtos demais não tem tampa que a gaiola feche */
  F.forEach((f) => {
    const medio = perimetro(f.pts) / N;
    if (medio < SEGMENTO_MEDIO_MINIMO_MM) {
      falha(`${f.onde} tem perímetro ${br(perimetro(f.pts), 3)} mm, e em ${N} pontos o segmento médio da volta fica em ${br(medio, 3)} mm, abaixo de ${br(SEGMENTO_MEDIO_MINIMO_MM)} mm: a tampa sai com faces de área zero; use uma fatia maior (a ponta fecha numa fatia pequena de perímetro ao menos ${br(SEGMENTO_MEDIO_MINIMO_MM * N)} mm, e não num ponto) ou menos pontos (mínimo ${PONTOS_MINIMOS_DA_VOLTA}, que dá ${br(perimetro(f.pts) / PONTOS_MINIMOS_DA_VOLTA, 3)} mm)`);
    }
  });

  /* os planos */
  const ems = F.map((f) => f.em);
  const comprimento = ems[ems.length - 1] - ems[0];
  const passo = o.passo ?? Math.max(minimo, arredonda(comprimento / 40));
  if (!(numero(passo) && passo >= minimo)) falha(`passo é número em mm de ${br(minimo)} para cima (o mínimo entre planos de gaiolaPorLacos), e veio ${JSON.stringify(o.passo)}`);
  const planos = ems.map(arredonda);
  for (let x = arredonda(ems[0] + passo); x < ems[ems.length - 1] - 1e-9; x = arredonda(x + passo)) {
    if (planos.every((p) => Math.abs(p - x) >= passo - 1e-9)) planos.push(x);
  }
  planos.sort((a, b) => a - b);

  /* a volta de cada plano: a interpolação ponto a ponto */
  const interpola = interpolacao === 'suave' ? suave : linear;
  const series = Array.from({ length: N }, (_, k) => [0, 1].map((c) => {
    const ys = loops.map((L) => L[k][c]);
    return { ys, tg: interpolacao === 'suave' ? tangentes(ems, ys) : null };
  }));
  const voltaEm = (x) => series.map((s) => [interpola(ems, s[0].ys, s[0].tg, x), interpola(ems, s[1].ys, s[1].tg, x)]);

  const nomeDoPlano = (x) => `${o.eixo}${String(arredonda(x)).replace('-', 'm').replace('.', '_')}`;
  const lacosDados = planos.map((x) => {
    const i = ems.findIndex((e) => Math.abs(arredonda(e) - x) <= 1e-9);
    return { em: x, fatia: i >= 0 ? i : null, nome: i >= 0 ? F[i].nome : nomeDoPlano(x) };
  });
  const usados = new Set();
  lacosDados.forEach((l) => {
    if (usados.has(l.nome)) falha(`o laço ${citar(l.nome)} (${o.eixo} = ${br(l.em)} mm) repete o nome de outro: o plano que não é fatia se chama ${citar(`${o.eixo}<em>`)}, e uma fatia tem esse nome; renomeie a fatia`);
    usados.add(l.nome);
  });
  const voltas = lacosDados.map((l) => (l.fatia != null ? loops[l.fatia] : voltaEm(l.em)));

  voltas.forEach((v, r) => {
    const l = lacosDados[r];
    const quem = l.fatia != null ? `a fatia ${citar(l.nome)} (em ${br(l.em)} mm) reamostrada em ${N} pontos` : `o plano em ${br(l.em)} mm, entre as fatias ${citar(F[Math.max(0, ems.findIndex((e) => e > l.em) - 1)].nome)} e ${citar(F[ems.findIndex((e) => e > l.em)].nome)}`;
    const area = areaComSinal(v);
    const toque = primeiroToque(v);
    if (area <= 0 || toque) {
      falha(`${quem} ${toque ? `se cruza (o lado ${toque[0]} e o ${toque[1]} se tocam)` : `fica com área ${br(area)} mm²`}; ${l.fatia != null ? `a volta tem pontos de menos para o contorno: suba pontos, ou nomeie o canto como marco` : 'o ponto de mesmo índice liga as fatias e o contorno torce no caminho: comece todas as fatias no mesmo detalhe (a âncora), nomeie os marcos que correspondem, ou ponha uma fatia entre elas'}`);
    }
  });

  /* os trechos da gaiola: um por segmento da volta, de dois pontos. A gaiola reamostra cada trecho com pontos a distâncias iguais, e só o trecho
     de dois pontos deixa os pontos desta operação (os marcos, os vértices que ficaram) onde estão; a tampa em escada liga 1 + j a N - j */
  const h = N / 2;
  const trechos = Array.from({ length: N }, (_, q) => ({ nome: `p${q}_`, de: q, ate: (q + 1) % N, pontos: 2 }));
  const trechoDe = (q) => q;

  /* a tampa em escada tem de cobrir o contorno nas duas pontas: cada degrau (o quadrilátero entre dois degraus seguidos) tem área
     positiva ou nula (nula é o degrau sobre um lado reto, que a gaiola resolve), nunca negativa. A soma
     das áreas com sinal dos degraus é a do contorno por identidade (a escada é uma telescópica da fórmula do cadarço), e por isso com nenhum
     negativo eles o cobrem uma vez, sem sobrar para fora */
  for (const [r, quem] of [[0, 'primeira'], [voltas.length - 1, 'última']]) {
    const v = voltas[r];
    const A = []; for (let q = 1; q <= h; q++) A.push(q);
    const B = [0]; for (let q = N - 1; q >= h + 1; q--) B.push(q);
    let ruim = null;
    for (let j = 0; j + 1 < A.length && ruim == null; j++) {
      if (areaComSinal([v[A[j]], v[A[j + 1]], v[B[j + 1]], v[B[j]]]) < -TOLERANCIA_DO_DEGRAU * Math.abs(areaComSinal(v))) ruim = j;
    }
    if (ruim != null) {
      falha(`a tampa da ${quem} fatia (${citar(lacosDados[r].nome)}, em ${br(lacosDados[r].em)} mm) não cobre o contorno: o degrau ${ruim} da escada, que liga o ponto ${1 + ruim} ao ${(N - ruim) % N} e o ${2 + ruim} ao ${N - ruim - 1}, sai do contorno; a ponta côncava demais não cabe em escada, então faça a fatia da ponta convexa ou mais simples, ou comece o contorno em outro ponto (a âncora decide onde a escada corta)`);
    }
  }

  /* a gaiola */
  const grupos = [
    { nome: 'tampaInicio', lacos: [lacosDados[0].nome, lacosDados[0].nome] },
    { nome: 'tampaFim', lacos: [lacosDados.at(-1).nome, lacosDados.at(-1).nome] },
    ...F.slice(1).map((f, i) => ({ nome: `entre_${F[i].nome}_${f.nome}`, lacos: [F[i].nome, f.nome] })),
  ];
  const vincos = [];
  for (const nomeDoMarco of o.vivos ?? []) {
    if (!(nomeDoMarco in marcos)) falha(`vivos cita o marco ${citar(nomeDoMarco)}, que o contorno não tem (os marcos são ${M0.map(citar).join(', ')}); o primeiro ponto é 'inicio' quando não tem nome`);
    const q = marcos[nomeDoMarco];
    const iDepois = trechoDe(q);
    const iAntes = (iDepois + trechos.length - 1) % trechos.length;
    vincos.push({ nome: `vivo_${nomeDoMarco}`, entre: [trechos[iAntes].nome, trechos[iDepois].nome], nitidez: 'viva' });
  }
  const g = gaiolaPorLacos({
    nome: prefixo, eixo: o.eixo,
    tampa: { de: trechos[trechoDe(0)].nome, ate: trechos[trechoDe(h)].nome },
    trechos: trechos.map((t) => ({ nome: t.nome, pontos: t.pontos })),
    lacos: lacosDados.map((l, r) => ({
      nome: l.nome, em: l.em,
      trechos: Object.fromEntries(trechos.map((t) => [t.nome, [voltas[r][t.de], voltas[r][t.ate]]])),
    })),
    grupos,
    ...(vincos.length ? { vincos } : {}),
  });
  const finas = g.avisos.filter((a) => a.ref === 'facesFinas');
  if (finas.length) falha(`a gaiola sai com ${finas[0].quantidade} ${finas[0].quantidade === 1 ? 'face fina' : 'faces finas'} (${finas[0].texto}); ponha uma fatia entre as de contorno muito diferente, afaste as fatias ou use menos pontos`);

  const pontoDe = (laco, i) => {
    const r = typeof laco === 'number' ? laco : lacosDados.findIndex((l) => l.nome === laco);
    if (!Number.isInteger(r) || r < 0 || r >= lacosDados.length) falha(`pontoDe: o laço é um nome (${lacosDados.slice(0, 4).map((l) => citar(l.nome)).join(', ')}${lacosDados.length > 4 ? ', ...' : ''}) ou a posição de 0 a ${lacosDados.length - 1}, e veio ${JSON.stringify(laco)}`);
    const q = typeof i === 'string' ? marcos[i] : i;
    if (!Number.isInteger(q) || q < 0 || q >= N) falha(`pontoDe: o ponto é um índice de 0 a ${N - 1} ou um marco (${M0.map(citar).join(', ')}), e veio ${JSON.stringify(i)}`);
    const t = trechos[trechoDe(q)];
    return `${prefixo}_${lacosDados[r].nome}_${t.nome}0`;
  };
  return {
    ...g,
    avisos: [...g.avisos, ...avisos],
    pontoDe,
    corpo: {
      planos, pontosPorVolta: N, marcos, perdas,
      fatias: F.map((f, i) => ({ nome: f.nome, em: f.em, laco: lacosDados.findIndex((l) => l.fatia === i), pontosDados: f.pts.length, perdidos: perdas[i].perdidos })),
    },
  };
}
