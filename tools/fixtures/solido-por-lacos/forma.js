/* forma.js — a forma da peça de teste do plano do sólido por laços: um L de ponta-cabeça fechado, feito de uma malha só por
 * subdivisão da gaiola que `gaiolaPorLacos` (procedural/nucleo/gaiola-por-lacos.js) monta a partir de um laço por plano x.
 *
 * A FORMA. Uma parte deitada de 190 mm de largura (x de -95 a 95) e 190 de altura (y de 20 a 210), que corre em z de -95 a
 * 125 e acaba numa saída redonda do diâmetro da largura, de eixo z a 115 mm do chão; por baixo da traseira, uma parte de pé
 * que desce até y = 0, com a frente 30 mm atrás da frente da parte deitada (o degrau do L). As quinas de trás e as da frente
 * do pé têm 75 mm de raio em planta, a seção da parte deitada tem cantos de 32 mm, que crescem até o círculo nos 45 mm antes
 * da saída, e a borda de cima da parede de trás tem 10 mm. O encontro de baixo, entre a frente do pé e a face de baixo da
 * parte deitada, é um quarto de elipse côncavo de 12 por 12 mm nos próprios pontos da gaiola.
 *
 * OS LAÇOS. Cada laço é o contorno da peça cortada pelo plano x, em trechos na ordem da volta: `tras` sobe a parede de trás,
 * os cinco trechos de `TABELA.topo` (de `borda` a `topo`) vão pelo topo até o começo da transição, com os pontos mais perto junto
 * da parede, `transicao` desce até a saída, `saida` desce pela face da saída, `baixo` volta pela face de baixo da parte deitada,
 * `encontro` desce a curva do encontro, `frente` desce a frente do pé e `fundo` volta pelo chão. Cada trecho sai daqui como
 * polilinha densa tirada das funções da forma, e o ajudante a reamostra no número de pontos da tabela. A tampa das paredes de
 * lado é a escada do `fundo` à `saida`, e por isso a cadeia de `tras` à `transicao` e a de `baixo` à `frente` têm o mesmo número
 * de pontos; nos dois planos de lado a `saida` tem comprimento zero e o ajudante a funde numa ponta. Os vincos vivos são a borda
 * da faixa do `fundo` (a borda de baixo) e a da `saida`.
 *
 * `planosDeCorte` e `lacoNoPlano` são da forma; a montagem é do ajudante. As opções em `TABELA.limites` e `TABELA.compensarCantos`
 * refazem os limites e a compensação que o plano lista; a tabela padrão é a forma de referência. Tudo em milímetro até os
 * pontos que saem, em metro. Nenhum dado vem de referência externa. */
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';

export const m = (mm) => mm / 1000;

export const TABELA = {
  /* Meia largura da parte deitada; a saída redonda tem este raio. */
  meiaLargura: 95,
  /* Altura do eixo da saída acima do chão: o topo fica a 210 mm e a face de baixo da parte deitada a 20. */
  alturaDoEixo: 115,
  /* Raio dos cantos da seção da parte deitada. */
  raioDosCantos: 32,
  /* Quanto a frente da parte de pé fica atrás da frente da parte deitada. */
  recuoDaFrente: 30,
  /* Quanto a parte deitada avança além do quadrado de 190 mm: a saída fica em z = 95 + 30. */
  alongamento: 30,
  /* Trecho antes da saída em que a seção passa de cantos de 32 mm a redonda. */
  transicaoDaSaida: 45,
  /* Quarto de elipse do encontro de baixo: avanço em z e subida em y. */
  avancoDoEncontro: 12,
  alturaDoEncontro: 12,
  /* Raios em planta das quinas de trás e das quinas da frente do pé, e da borda de cima da parede de trás. */
  raioDaTraseira: 75,
  raioDaFrenteDoPe: 75,
  raioDaQuinaDeTras: 10,
  /* Planos de corte por quarto de quina em planta e por quarto de canto da seção, e no trecho reto de trás. */
  estacoesDaQuina: 6,
  estacoesDoCanto: 4,
  estacoesDoReto: 3,
  /* Pontos de cada trecho do laço, com as duas pontas. O topo, de trás até o começo da transição, vai em cinco trechos que
     acabam nas frações `ate` dele, com os pontos mais perto junto da parede, onde o topo se curva para a borda de trás. A
     escada da tampa pede o mesmo número de pontos de tras, do topo e da transição (18, contando uma vez cada emenda) e de
     baixo, do encontro e da frente (18). */
  pontos: { tras: 5, transicao: 7, saida: 2, baixo: 11, encontro: 6, frente: 3, fundo: 5 },
  topo: [
    { nome: 'borda', ate: 0.015, pontos: 2 },
    { nome: 'quina', ate: 0.05, pontos: 2 },
    { nome: 'topoDeTras', ate: 0.12, pontos: 2 },
    { nome: 'topoDoMeio', ate: 0.45, pontos: 3 },
    { nome: 'topo', ate: 1, pontos: 3 },
  ],
  niveis: 2,
  /* Os limites. `distanciaMinimaEntrePlanos` tira o plano de corte a menos dessa distância do anterior (a forma de
     referência usa 2,5 mm; com 0 ficam todos e o ajudante recusa os planos próximos). `medidas` passa ao ajudante: null não põe
     cota, e 'todos' pede cota exata em todos os pontos, que o ajudante recusa. */
  limites: { distanciaMinimaEntrePlanos: 2.5, medidas: null },
  /* A compensação dos cantos da seção: com true, o ajudante move os pontos do topo e da transição nos laços dos cantos (|x| a
     partir de meiaLargura - raioDosCantos) para a superfície limite passar por eles, e o canto de 32 mm sai com 31,8 mm no
     corte; false deixa a gaiola como declarada, que fica a 0,43 mm do corpo feito à mão. */
  compensarCantos: false,
};

/* Funções da forma em (x, z), em milímetro. */
function funcoesDaForma(t) {
  const L = t.meiaLargura;
  const yE = t.alturaDoEixo;
  const zFace = L + t.alongamento;
  const zT = zFace - t.transicaoDaSaida;
  const zf0 = zFace - t.recuoDaFrente;
  const rcA = t.raioDosCantos;
  const rf = t.raioDaFrenteDoPe;
  const rq = t.raioDaTraseira;
  /* passagem suave de 0 a 1 ao longo da transição da saída */
  const S = (z) => (z <= zT ? 0 : z >= zFace ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * (z - zT)) / (zFace - zT)));
  /* meia largura da parte deitada em z: a traseira acompanha o arco das quinas em planta */
  const larg = (z) => (z >= -L + rq ? L : L - rq + Math.sqrt(Math.max(0, rq * rq - (z + L - rq) ** 2)));
  /* raio dos cantos da seção em z: cresce até o círculo na saída; na traseira parte do raio da borda de trás e cresce com a largura */
  const raioDaSecao = (z) => {
    const pre = rcA + (L - rcA) * S(z);
    const w = larg(z);
    if (w >= L - 1e-9) return pre;
    const u = Math.min(1, Math.max(0, (w - (L - rq)) / rq));
    return t.raioDaQuinaDeTras + (pre - t.raioDaQuinaDeTras) * u * u * (3 - 2 * u);
  };
  /* altura do topo da parte deitada em (x, z); a de baixo é a espelhada em torno do eixo */
  const yTopo = (x, z) => {
    const w = larg(z);
    const r = raioDaSecao(z);
    const c = w - r;
    const ax = Math.abs(x);
    return ax <= c ? yE + L : yE + L - r + Math.sqrt(Math.max(0, r * r - (ax - c) ** 2));
  };
  const yFundo = (x, z) => 2 * yE - yTopo(x, z);
  /* quinas em planta: atrás e na frente do pé */
  const zTras = (x) => { const ax = Math.abs(x); const c = L - rq; return ax > c ? -L + rq - Math.sqrt(Math.max(0, rq * rq - (ax - c) ** 2)) : -L; };
  const zFrente = (x) => { const ax = Math.abs(x); const c = L - rf; return ax > c ? zf0 - rf + Math.sqrt(Math.max(0, rf * rf - (ax - c) ** 2)) : zf0; };
  return { L, yE, zFace, zT, yTopo, yFundo, zTras, zFrente };
}

/** planosDeCorte(t) -> as posições x dos laços, de -meiaLargura a meiaLargura, em mm: pelo trecho reto de trás, pelos arcos das
 *  quinas em planta e pelos arcos dos cantos da seção, sem os que ficam a menos de `limites.distanciaMinimaEntrePlanos`. */
export function planosDeCorte(t) {
  const L = t.meiaLargura;
  const rq = t.raioDaTraseira;
  const rcA = t.raioDosCantos;
  const minimo = t.limites?.distanciaMinimaEntrePlanos ?? 2.5;
  const lista = [];
  for (let k = 0; k <= t.estacoesDoReto; k++) lista.push(((L - rq) * k) / t.estacoesDoReto);
  for (let k = 1; k <= t.estacoesDaQuina; k++) lista.push(L - rq + rq * Math.sin((Math.PI / 2) * (k / t.estacoesDaQuina)));
  for (let k = 0; k <= t.estacoesDoCanto; k++) lista.push(L - rcA + rcA * Math.sin((Math.PI / 2) * (k / t.estacoesDoCanto)));
  lista.sort((p, q) => p - q);
  const metade = [];
  for (const x of lista) {
    const ultimo = metade[metade.length - 1];
    if (!metade.length || (x - ultimo > minimo && x - ultimo > 1e-9)) metade.push(x);
    else if (Math.abs(x - L) < 1e-9) metade[metade.length - 1] = x;
  }
  metade[metade.length - 1] = L;
  return [...metade.slice(1).reverse().map((x) => -x), ...metade];
}

/* polilinha densa de uma curva em [z, y], virada para [y, z] (o ponto [u, v] do laço no eixo x) */
const DENSIDADE = 96;
function curva(f, a, b, n = DENSIDADE) {
  return Array.from({ length: n + 1 }, (_, k) => { const [z, y] = f(a + ((b - a) * k) / n); return [y, z]; });
}

/** lacoNoPlano(t, x) -> { em, trechos }: o contorno da peça no plano x, em [y, z] mm, nos trechos da volta, cada um uma
 *  polilinha densa que começa onde a anterior acaba. */
export function lacoNoPlano(t, x) {
  const { L, yE, zFace, zT, yTopo, yFundo, zTras, zFrente } = funcoesDaForma(t);
  const dz = t.avancoDoEncontro;
  const y0 = yE - L - t.alturaDoEncontro;
  const zr = zTras(x);
  const yp = yTopo(x, zr);
  const zfx = zFrente(x);
  const zEnc = zfx + dz;
  const yFim = yFundo(x, zEnc);
  const noTopo = (z) => [z, yTopo(x, z)];
  const noFundo = (z) => [z, yFundo(x, z)];
  return {
    em: x,
    trechos: {
      tras: curva((y) => [zr, y], 0, yp, 1),
      ...Object.fromEntries(t.topo.map((d, k) => [d.nome, curva(noTopo, zr + (k ? t.topo[k - 1].ate : 0) * (zT - zr), zr + d.ate * (zT - zr))])),
      transicao: curva(noTopo, zT, zFace),
      saida: curva((y) => [zFace, y], yTopo(x, zFace), yFundo(x, zFace), 1),
      baixo: curva(noFundo, zFace, zEnc),
      encontro: curva((th) => [zfx + dz * (1 - Math.cos(th)), y0 + (yFim - y0) * Math.sin(th)], Math.PI / 2, 0),
      frente: curva((y) => [zfx, y], y0, 0, 1),
      fundo: curva((z) => [z, 0], zfx, zr, 1),
    },
  };
}

/** argumentosDaGaiola(t) -> o que a peça de teste passa a `gaiolaPorLacos`. */
export function argumentosDaGaiola(t = TABELA) {
  const ordem = ['tras', ...t.topo.map((d) => d.nome), 'transicao', 'saida', 'baixo', 'encontro', 'frente', 'fundo'];
  const a = {
    nome: 'corpo',
    eixo: 'x',
    trechos: ordem.map((nome) => ({ nome, pontos: t.pontos[nome] ?? t.topo.find((d) => d.nome === nome).pontos })),
    lacos: planosDeCorte(t).map((x) => lacoNoPlano(t, x)),
    tampa: { de: 'fundo', ate: 'saida' },
    vincos: [
      { nome: 'bordaDeBaixo', trecho: 'fundo', nitidez: 'viva' },
      { nome: 'bordaDaSaida', trecho: 'saida', nitidez: 'viva' },
    ],
  };
  if (t.limites?.medidas != null) a.medidas = t.limites.medidas;
  if (t.compensarCantos) {
    a.compensar = {
      trechos: [...t.topo.map((d) => d.nome), 'transicao'],
      lacos: a.lacos.map((l, r) => (Math.abs(l.em) >= t.meiaLargura - t.raioDosCantos - 1e-9 ? `l${r}` : null)).filter(Boolean),
    };
  }
  return a;
}

/** derivar(t) -> { planos, ...a saída de gaiolaPorLacos }: a gaiola da peça de teste pela tabela. */
export function derivar(t = TABELA) {
  const args = argumentosDaGaiola(t);
  return { planos: args.lacos.map((l) => l.em), ...gaiolaPorLacos(args) };
}

export const PLANO = {
  objeto: 'peça de teste: sólido em L de ponta-cabeça fechado numa malha só por subdivisão de uma gaiola de laços',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'largura da parte deitada', milimetros: 190 },
  partes: [
    { nome: 'corpo', forma: 'L de ponta-cabeça de 190 mm de largura por 220 de comprimento, parte de pé recuada 30 mm, quinas de 75 em planta, cantos de 32 na seção e saída redonda de 190 mm', tecnica: 'subdivisão da gaiola de gaiolaPorLacos, um laço por plano x em doze trechos, com as paredes de lado tampadas em escada e vincos vivos na borda de baixo e na da saída' },
  ],
  criteriosDeReprovacao: [
    'emenda, faixa de sombra ou degrau entre a parte de pé e a parte deitada',
    'malha aberta, com aresta sem par ou vínculo não manifold',
    'ondulação ou calombo visível nas faces planas ou na transição para a saída redonda',
  ],
};
