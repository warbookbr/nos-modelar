/* corpo-de-secao-variavel.js — o corpo fechado cuja seção (superelipse) muda ao longo de um eixo, com sulcos e tampas
 *
 * FICHA corpoDeSecaoVariavel
 * serve: gaiola de um corpo sólido cuja seção é uma superelipse de centro, semieixos e expoente dados em estações ao longo de um eixo,
 *   interpolados entre elas, com uma lista de sulcos (posição, largura, profundidade, perfil) que estreitam a seção, e as duas pontas tampadas.
 * quando: cabo, pino, alça, haste, nervura ou qualquer corpo de seção oval que engrossa, afina, desvia ou tem gomos; a seção em cada plano
 *   é escrita por estação e por sulco, não por laço. Devolve o que gaiolaPorLacos devolve, e o passo vai a `subdivisao` (com niveis, a
 *   superfície sai lisa). Para uma chapa de espessura constante use chapaDeContorno.
 * unidades: `em`, centros, semieixos, larguras e profundidades em mm; `pontos` sai em metro, para pôr em TOPO.
 * campos:
 *   nome: prefixo dos pontos (texto), como em gaiolaPorLacos.
 *   eixo: 'x', 'y' ou 'z', o eixo do corpo; o ponto [u, v] da seção são os outros dois eixos na ordem x, y, z.
 *   estacoes: [{ em, centro: [u, v], semieixos: [a, b], expoente? }] em crescente; a seção em `em`: a é o semieixo em u e b em v. Entre
 *     duas estações cada número é interpolado; o corpo vai da primeira à última, e as duas são as tampas.
 *   expoente: o expoente da superelipse (padrão 2, a elipse); 4 dá a seção quase retangular de cantos redondos.
 *   interpolacao: 'suave' (padrão, Hermite monótono, sem passar dos valores das estações) ou 'linear'.
 *   passo: a distância entre planos, em mm (padrão 2,5, o mínimo de gaiolaPorLacos); os planos das estações e dos sulcos entram sempre.
 *   sulcos: [{ em, largura, profundidade, perfil? }] a posição do centro do sulco, a largura total e quanto os dois semieixos recuam no
 *     centro. perfil 'arredondado' (padrão): recuo em meio cosseno, 0 nas bordas; 'fundoPlano': recuo pleno na metade central da
 *     largura e meio cosseno nas duas bordas. Os planos entram em passos a partir do centro, dentro da largura.
 *   pontosPorQuarto: pontos de cada um dos quatro trechos da seção, com as duas pontas (padrão 5, uma seção de 16 pontos).
 * devolve: { pontos, pontosMm, alvosMm, passo, nomeDe, lacos, trechos, avisos, corpo }, o de gaiolaPorLacos mais `corpo`: { planos } com a
 *   posição, em mm, de cada plano gerado, e os trechos 'a', 'b', 'c' e 'd', a volta da seção a partir do semieixo em +v.
 * exemplo:
 *   corpoDeSecaoVariavel({ nome: 'h', eixo: 'x', passo: 5, expoente: 2.4,
 *     estacoes: [{ em: 0, centro: [0, 0], semieixos: [10, 14] }, { em: 60, centro: [0, 4], semieixos: [12, 16] }, { em: 100, centro: [0, 6], semieixos: [8, 10] }],
 *     sulcos: [{ em: 30, largura: 8, profundidade: 3 }, { em: 75, largura: 8, profundidade: 2, perfil: 'fundoPlano' }] })
 * peça: procedural/pecas/kukri/receita.js (o cabo: bico, gomos entre sulcos e guarda alargada).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. A seção em cada plano é a superelipse de centro (cu, cv) e semieixos (a, b):
 * [cu + a sgn(sen t) |sen t|^(2/e), cv + b sgn(cos t) |cos t|^(2/e)], em quatro trechos de `pontosPorQuarto` pontos, a, b, c e d, que a
 * gaiolaPorLacos tampa com a escada entre b e d. O recuo de um sulco em um plano é a soma máxima dos perfis dos sulcos que o cobrem; ele tira o
 * mesmo valor dos dois semieixos. Os planos são o conjunto das estações, dos sulcos (o centro e os passos para os dois lados, dentro da
 * largura) e da grade de `passo` a partir da primeira estação, e a grade perde o ponto que cai a menos de `passo` de outro plano.
 *
 * AS RECUSAS. Menos de duas estações, estações fora de ordem ou a menos do mínimo entre planos (2,5 mm) uma da outra, semieixo ou
 * expoente não positivo, passo menor que o mínimo, sulco fora do corpo, largura ou profundidade não positiva e sulco que leva um semieixo a
 * zero ou menos (a recusa diz o plano e o semieixo que sobra) são recusados com o valor recebido e o limite. */
import { gaiolaPorLacos, DISTANCIA_MINIMA_ENTRE_PLANOS_MM } from './gaiola-por-lacos.js';

const EIXOS = { x: 0, y: 1, z: 2 };
const falha = (texto) => { throw new RangeError(`corpoDeSecaoVariavel: ${texto}`); };
const br = (x, casas = 2) => String(Number(Number(x).toFixed(casas))).replace('.', ',');
const numero = (x) => typeof x === 'number' && Number.isFinite(x);
const positivo = (x) => numero(x) && x > 0;
const par = (p) => Array.isArray(p) && p.length === 2 && numero(p[0]) && numero(p[1]);
const arredonda = (x) => Math.round(x * 1e4) / 1e4;

/* Hermite monótono por partes: sem passar dos valores das estações, tangente nula nos extremos locais */
function suave(xs, ys, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 0;
  while (xs[i + 1] < x) i++;
  const sec = (k) => (ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]);
  const tang = (k) => {
    if (k === 0) return sec(0);
    if (k === n - 1) return sec(n - 2);
    const a = sec(k - 1); const b = sec(k);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };
  const h = xs[i + 1] - xs[i]; const t = (x - xs[i]) / h;
  return (2 * t ** 3 - 3 * t ** 2 + 1) * ys[i] + (t ** 3 - 2 * t ** 2 + t) * h * tang(i) + (-2 * t ** 3 + 3 * t ** 2) * ys[i + 1] + (t ** 3 - t ** 2) * h * tang(i + 1);
}
function linear(xs, ys, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 0;
  while (xs[i + 1] < x) i++;
  return ys[i] + ((ys[i + 1] - ys[i]) * (x - xs[i])) / (xs[i + 1] - xs[i]);
}

/* o recuo de um sulco a `u` mm do centro, de 0 a `profundidade` */
function recuoDoSulco(s, u) {
  const meia = s.largura / 2;
  const a = Math.abs(u) / meia;
  if (a >= 1) return 0;
  if (s.perfil === 'fundoPlano') return a <= 0.5 ? s.profundidade : s.profundidade * (0.5 + 0.5 * Math.cos(Math.PI * (a - 0.5) * 2));
  return s.profundidade * (0.5 + 0.5 * Math.cos(Math.PI * a));
}

export function corpoDeSecaoVariavel(o = {}) {
  const prefixo = o.nome ?? 'corpo';
  if (typeof prefixo !== 'string' || !prefixo) falha('nome é o prefixo dos pontos, texto não vazio');
  if (!(o.eixo in EIXOS)) falha(`eixo é 'x', 'y' ou 'z', e veio ${JSON.stringify(o.eixo)}`);
  const minimo = DISTANCIA_MINIMA_ENTRE_PLANOS_MM;
  const passo = o.passo ?? minimo;
  if (!numero(passo) || passo < minimo) falha(`passo é número em mm de ${br(minimo)} para cima (o mínimo entre planos de gaiolaPorLacos), e veio ${JSON.stringify(o.passo)}`);
  const expoentePadrao = o.expoente ?? 2;
  if (!positivo(expoentePadrao)) falha(`expoente é número positivo, e veio ${JSON.stringify(o.expoente)}`);
  const interpolacao = o.interpolacao ?? 'suave';
  if (!['suave', 'linear'].includes(interpolacao)) falha(`interpolacao é 'suave' ou 'linear', e veio ${JSON.stringify(o.interpolacao)}`);
  const q = o.pontosPorQuarto ?? 5;
  if (!(Number.isInteger(q) && q >= 3)) falha(`pontosPorQuarto é inteiro de 3 para cima, e veio ${JSON.stringify(o.pontosPorQuarto)}`);
  if (!Array.isArray(o.estacoes) || o.estacoes.length < 2) falha('estacoes é a lista de ao menos duas { em, centro, semieixos }');
  const E = o.estacoes;
  E.forEach((e, i) => {
    const onde = `estacoes[${i}]`;
    if (!e || !numero(e.em) || !par(e.centro) || !par(e.semieixos) || !(e.semieixos[0] > 0 && e.semieixos[1] > 0)) falha(`${onde} é { em, centro: [u, v], semieixos: [a, b] } com semieixos positivos, e veio ${JSON.stringify(e)}`);
    if (e.expoente != null && !positivo(e.expoente)) falha(`${onde}.expoente é número positivo, e veio ${JSON.stringify(e.expoente)}`);
    if (i > 0 && e.em - E[i - 1].em < minimo - 1e-9) falha(`${onde}.em = ${br(e.em)} fica a ${br(e.em - E[i - 1].em)} mm da estação anterior, e o mínimo entre planos é ${br(minimo)} mm, em ordem crescente`);
  });
  const sulcos = (o.sulcos ?? []).map((s, i) => {
    const onde = `sulcos[${i}]`;
    if (!s || !numero(s.em) || !positivo(s.largura) || !positivo(s.profundidade)) falha(`${onde} é { em, largura, profundidade } com largura e profundidade positivas em mm, e veio ${JSON.stringify(s)}`);
    if (s.perfil != null && !['arredondado', 'fundoPlano'].includes(s.perfil)) falha(`${onde}.perfil é 'arredondado' ou 'fundoPlano', e veio ${JSON.stringify(s.perfil)}`);
    if (s.em < E[0].em || s.em > E[E.length - 1].em) falha(`${onde}.em = ${br(s.em)} fica fora do corpo (${br(E[0].em)} a ${br(E[E.length - 1].em)} mm)`);
    return { em: s.em, largura: s.largura, profundidade: s.profundidade, perfil: s.perfil ?? 'arredondado' };
  });
  if (o.sulcos != null && !Array.isArray(o.sulcos)) falha('sulcos é uma lista de { em, largura, profundidade, perfil? }');

  /* os planos: estações, sulcos, grade */
  const planos = E.map((e) => arredonda(e.em));
  const longe = (x) => planos.every((p) => Math.abs(p - x) >= minimo - 1e-9);
  for (const s of sulcos) {
    for (let k = -Math.floor((s.largura / 2 - 1e-9) / passo); k * passo < s.largura / 2 - 1e-9; k++) {
      const x = arredonda(s.em + k * passo);
      if (x > E[0].em && x < E[E.length - 1].em && longe(x)) planos.push(x);
    }
  }
  for (let x = arredonda(E[0].em + passo); x < E[E.length - 1].em - 1e-9; x = arredonda(x + passo)) {
    if (planos.every((p) => Math.abs(p - x) >= passo - 1e-9)) planos.push(x);
  }
  planos.sort((a, b) => a - b);

  const interpola = interpolacao === 'suave' ? suave : linear;
  const xs = E.map((e) => e.em);
  const serie = (f) => E.map(f);
  const cu = serie((e) => e.centro[0]); const cv = serie((e) => e.centro[1]);
  const au = serie((e) => e.semieixos[0]); const av = serie((e) => e.semieixos[1]);
  const ex = serie((e) => e.expoente ?? expoentePadrao);
  const secao = (x) => {
    const recuo = sulcos.reduce((m, s) => Math.max(m, recuoDoSulco(s, x - s.em)), 0);
    const a = interpola(xs, au, x) - recuo; const b = interpola(xs, av, x) - recuo;
    if (!(a > 0 && b > 0)) falha(`o sulco recua ${br(recuo)} mm no plano ${br(x)} e o semieixo da seção, ${br(Math.min(interpola(xs, au, x), interpola(xs, av, x)))} mm, não sobra: reduza a profundidade ou engrosse a seção ali`);
    return { cu: interpola(xs, cu, x), cv: interpola(xs, cv, x), a, b, p: interpola(xs, ex, x) };
  };
  const anel = (x) => {
    const { cu: u0, cv: v0, a, b, p } = secao(x);
    const total = 4 * (q - 1);
    const ponto = (k) => {
      const th = (2 * Math.PI * k) / total;
      const c = Math.cos(th); const s = Math.sin(th);
      return [u0 + a * Math.sign(s) * Math.abs(s) ** (2 / p), v0 + b * Math.sign(c) * Math.abs(c) ** (2 / p)];
    };
    const trecho = (k0) => Array.from({ length: q }, (_, i) => ponto((k0 + i) % total));
    return { a: trecho(0), b: trecho(q - 1), c: trecho(2 * (q - 1)), d: trecho(3 * (q - 1)) };
  };
  const g = gaiolaPorLacos({
    nome: prefixo, eixo: o.eixo, tampa: { de: 'a', ate: 'c' },
    trechos: ['a', 'b', 'c', 'd'].map((nome) => ({ nome, pontos: q })),
    lacos: planos.map((x) => ({ em: x, trechos: anel(x) })),
  });
  return { ...g, corpo: { planos } };
}
