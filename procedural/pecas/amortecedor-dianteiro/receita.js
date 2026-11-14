/* amortecedor-dianteiro — conjunto McPherson de uma peça só, com oito partes: corpo, suporteInferior, pratoInferior, haste, coifa, mola,
 * pratoSuperior e coxim. O alvo está em `referencias/alvo.md`; a imagem de caráter fica em `referencias/locais/`, fora do git.
 *
 * REFERENCIAL. O eixo do amortecedor é a reta x = 0, z = 0, em y; o chão é y = 0 (a ponta de baixo da garra) e o topo do pino é y = 560.
 * A garra abre para +x (frente), com os braços em z = -25..-28 e +25..+28 e o fundo em x = -25..-28; a orelha do cabo de freio sai do
 * braço +z. Medidas em milímetro na TABELA; `derivar` calcula posições e perfis e `gerarPassos` converte para metro com `m()`, o único
 * lugar da conversão.
 *
 * A MOLA é um `loft` de seções circulares ao longo de uma hélice contínua e destra de 6 espiras: o motor não tem operação de hélice, e
 * `derivar` amostra a linha média e cada amostra vira uma seção. O fio assenta no plano do prato de baixo e acaba tocando o do prato de
 * cima; o passo sai da altura entre os dois assentos.
 *
 * Os coaxiais (corpo, haste, coifa e furos dos pratos) usam o mesmo número de lados, de modo que as faces encostadas coincidem em vez de
 * se cruzarem. */
import { furoPassante } from '../../nucleo/furo-passante.js';

export const TABELA = {
  lados: 48,
  altura_total: 560,
  /* corpo: tubo de 50 mm e 330 mm de comprimento, com a manga de 65 mm no meio, chanfrada nas bordas */
  corpo_y0: 30, corpo_comprimento: 330, corpo_raio: 25,
  manga_raio: 32.5, manga_comprimento: 60, manga_chanfro: 4,
  /* garra: perfil em U extrudado em y; braços em z, fundo em -x, furos de parafuso em z atravessando os dois braços */
  garra_altura: 120, garra_chapa: 3, garra_frente: 55, garra_furo_raio: 7, garra_furo_x: 38, garra_furos_y: [25, 80], garra_furo_lados: 24,
  /* orelha do cabo de freio: aba horizontal que sai do braço +z */
  orelha_y: 100, orelha_espessura: 3, orelha_x0: -22, orelha_x1: 8, orelha_alcance: 30, orelha_furo_raio: 4, orelha_encaixe: 1,
  /* pratos de mola: perfil estampado, medido a partir do plano do cubo */
  prato_chapa: 3, prato_cubo_ate: 46, prato_rampa: 10, prato_deslocamento: 2, prato_assento_de: 56, prato_assento_ate: 84,
  prato_borda_r: 87, prato_aba: 10, prato_aba_espessura: 3,
  /* haste cromada */
  haste_raio: 11,
  /* coifa de borracha: sanfona de revolução em torno da haste */
  coifa_raio_menor: 26, coifa_raio_maior: 33, coifa_dobras: 10,
  /* mola helicoidal de aço; os ajustes (mm) cobrem o que a faceta da seção de 12 lados e a ponta com polo deixam além do cálculo do encosto */
  mola_fio: 12, mola_diametro_medio: 140, mola_espiras: 6, mola_amostras_por_espira: 24, mola_lados: 12, mola_ajuste_assento: 0, mola_ajuste_topo: 0.0224,
  /* coxim: base triangular, três prisioneiros e pino central; a base assenta no plano de cima do prato superior e da haste */
  coxim_y0: 500, coxim_base: 12, coxim_raio_triangulo: 34, coxim_arredonda: 8,
  prisioneiro_raio: 4.5, prisioneiro_altura: 24, pino_raio: 8, pino_encaixe: 4,
};

const m = (mm) => mm / 1000;
const rad = (g) => (g * Math.PI) / 180;

/* o perfil estampado de um prato como [r, dy], com dy a partir do plano do cubo e para o lado do assento da mola */
function perfilDoPrato(T, raioFuro) {
  const t = T.prato_chapa;
  const topo = T.prato_rampa + t;
  const interno = T.prato_assento_de + T.prato_deslocamento;
  return [
    [raioFuro, 0], [T.prato_cubo_ate, 0], [T.prato_assento_de, T.prato_rampa], [T.prato_borda_r, T.prato_rampa],
    [T.prato_borda_r, T.prato_rampa + T.prato_aba], [T.prato_borda_r - T.prato_aba_espessura, T.prato_rampa + T.prato_aba],
    [T.prato_assento_ate, topo], [interno, topo], [T.prato_cubo_ate + T.prato_deslocamento, t], [raioFuro, t], [raioFuro, 0],
  ];
}

export function derivar(T = TABELA) {
  const corpoY1 = T.corpo_y0 + T.corpo_comprimento;
  const mangaCentro = T.corpo_y0 + T.corpo_comprimento / 2;
  const mangaY0 = mangaCentro - T.manga_comprimento / 2;
  const mangaY1 = mangaCentro + T.manga_comprimento / 2;
  const c = T.manga_chanfro;
  const corpo = [
    [0, T.corpo_y0], [T.corpo_raio, T.corpo_y0], [T.corpo_raio, mangaY0],
    [T.manga_raio - c, mangaY0], [T.manga_raio, mangaY0 + c], [T.manga_raio, mangaY1 - c], [T.manga_raio - c, mangaY1],
    [T.corpo_raio, mangaY1], [T.corpo_raio, corpoY1], [0, corpoY1],
  ];

  /* garra: o U e a orelha; o braço tem a espessura da chapa e a folga entre os braços é o diâmetro do tubo */
  const i = T.corpo_raio;
  const e = i + T.garra_chapa;
  const garraU = [[-e, -e], [T.garra_frente, -e], [T.garra_frente, -i], [-i, -i], [-i, i], [T.garra_frente, i], [T.garra_frente, e], [-e, e]];
  const orelha = {
    largura: T.orelha_x1 - T.orelha_x0,
    centro: [(T.orelha_x0 + T.orelha_x1) / 2, e - T.orelha_encaixe + (T.orelha_alcance + T.orelha_encaixe) / 2],
    profundidade: T.orelha_alcance + T.orelha_encaixe,
    furo: [(T.orelha_x0 + T.orelha_x1) / 2, e + T.orelha_alcance * 0.55],
  };

  /* pratos: o de baixo assenta o cubo na face de cima da manga; o de cima espelha o de baixo com o cubo sob a base do coxim */
  const cuboInferior = mangaY1;
  const assentoInferior = cuboInferior + T.prato_rampa + T.prato_chapa;
  const pratoInferior = perfilDoPrato(T, T.corpo_raio).map(([r, dy]) => [r, cuboInferior + dy]);
  const cuboSuperior = T.coxim_y0;
  const assentoSuperior = cuboSuperior - T.prato_rampa - T.prato_chapa;
  const pratoSuperior = perfilDoPrato(T, T.haste_raio).map(([r, dy]) => [r, cuboSuperior - dy]);

  /* haste: sai do topo do corpo e sobe até a base do coxim */
  const haste = [[0, corpoY1], [T.haste_raio, corpoY1], [T.haste_raio, T.coxim_y0], [0, T.coxim_y0]];

  /* coifa: do topo do corpo à face de baixo do cubo do prato superior; a face de dentro é a da haste */
  const coifaY1 = cuboSuperior - T.prato_chapa;
  const dy = (coifaY1 - corpoY1) / T.coifa_dobras;
  const coifa = [[T.haste_raio, corpoY1], [T.coifa_raio_menor, corpoY1]];
  for (let k = 0; k < T.coifa_dobras; k += 1) {
    coifa.push([T.coifa_raio_maior, corpoY1 + (k + 0.5) * dy], [T.coifa_raio_menor, corpoY1 + (k + 1) * dy]);
  }
  coifa.push([T.haste_raio, coifaY1], [T.haste_raio, corpoY1]);

  /* mola: hélice destra de raio médio e passo tirados da altura entre os dois assentos */
  const R = T.mola_diametro_medio / 2;
  const fio = T.mola_fio / 2;
  /* a seção é perpendicular à hélice, inclinada pelo ângulo do passo: o ponto mais baixo do fio fica fio*(1 - cos) abaixo do eixo
     do fio, e o de cima, o mesmo acima; a linha média sobe/desce essa diferença para o fio tocar os planos de assento */
  const total = T.mola_espiras * T.mola_amostras_por_espira;
  const passoAprox = (assentoSuperior - assentoInferior - 2 * fio) / T.mola_espiras;
  const inclinacao = Math.atan(passoAprox / (2 * Math.PI * R));
  const encosto = fio * (1 - Math.cos(inclinacao)) + T.mola_ajuste_assento;
  const yBaixo = assentoInferior + fio - encosto;
  const yCima = assentoSuperior - fio + encosto + T.mola_ajuste_topo;
  const passo = (yCima - yBaixo) / T.mola_espiras;
  const helice = [];
  for (let k = 0; k <= total; k += 1) {
    const volta = k / T.mola_amostras_por_espira;
    const a = 2 * Math.PI * volta;
    helice.push([R * Math.cos(a), yBaixo + passo * volta, -R * Math.sin(a)]);
  }

  /* coxim: o triângulo, os três prisioneiros nos vértices e o pino central */
  const prisioneiros = [90, 210, 330].map((g) => [T.coxim_raio_triangulo * Math.cos(rad(g)), T.coxim_raio_triangulo * Math.sin(rad(g))]);
  const triangulo = prisioneiros.map(([x, z]) => [x, z]);
  const baseTopo = T.coxim_y0 + T.coxim_base;
  const pino = { y0: baseTopo - T.pino_encaixe, y1: T.altura_total };
  const prisioneiroY0 = baseTopo - T.pino_encaixe;

  return {
    corpoY1, mangaY0, mangaY1, corpo, garraU, orelha, assentoInferior, assentoSuperior, pratoInferior, pratoSuperior, haste, coifa,
    helice, passo, triangulo, prisioneiros, baseTopo, pino, prisioneiroY0,
  };
}

const par = ([r, y]) => [m(r), m(y)];

/* o k-ésimo furo de parafuso da garra (k = 0 ou 1): o segundo fura o resultado do primeiro */
function furoDaGarra(k, T = TABELA) {
  return furoPassante({
    solido: { origem: k === 0 ? { op: 'unir', id: 4 } : { op: 'subtrair', id: 6 } },
    posicao: [T.garra_furo_x, T.garra_furos_y[k], 0], direcao: 'z', raio: T.garra_furo_raio,
    comprimento: 2 * (T.corpo_raio + T.garra_chapa) + 20, lados: T.garra_furo_lados,
    ids: k === 0 ? { cilindro: 5, subtrair: 6 } : { cilindro: 7, subtrair: 8 }, nome: k === 0 ? 'furoA' : 'furoB',
  });
}

export function gerarPassos(T = TABELA) {
  const d = derivar(T);
  const passos = [];
  const nova = (nome, op, id) => passos.push(['parte', { nome, sel: { origem: { op, id } } }]);
  const lados = T.lados;

  /* 1. corpo */
  passos.push(['lathe', { origemId: 1, perfil: d.corpo.map(par), lados }], ['liso', { sel: { origem: { op: 'lathe', id: 1 } } }]);
  nova('corpo', 'lathe', 1);

  /* 2. suporteInferior: U extrudado em y + orelha, unidos, com os dois furos de parafuso */
  passos.push(['extrusao', { origemId: 2, perfil: d.garraU.map(par), altura: m(T.garra_altura) }]);
  passos.push(['extrusao', {
    origemId: 3,
    perfil: { retangulo: { largura: m(d.orelha.largura), profundidade: m(d.orelha.profundidade), centro: par(d.orelha.centro) } },
    furos: [{ circulo: { raio: m(T.orelha_furo_raio), centro: par(d.orelha.furo) } }],
    altura: m(T.orelha_espessura), em: [0, m(T.orelha_y), 0],
  }]);
  passos.push(['unir', { origemId: 4, solidos: [{ origem: { op: 'extrusao', id: 2 } }, { origem: { op: 'extrusao', id: 3 } }] }]);
  const furo1 = furoDaGarra(0, T);
  const furo2 = furoDaGarra(1, T);
  passos.push(...furo1.passos, ...furo2.passos);
  passos.push(['parte', { nome: 'suporteInferior', sel: { origem: furo2.origem } }]);

  /* 3. pratoInferior */
  passos.push(['lathe', { origemId: 9, perfil: d.pratoInferior.map(par), lados }]);
  nova('pratoInferior', 'lathe', 9);

  /* 4. haste */
  passos.push(['lathe', { origemId: 10, perfil: d.haste.map(par), lados }]);
  nova('haste', 'lathe', 10);

  /* 5. coifa */
  passos.push(['lathe', { origemId: 11, perfil: d.coifa.map(par), lados }]);
  nova('coifa', 'lathe', 11);

  /* 6. mola: seções circulares ao longo da hélice, com um polo em cada ponta */
  const h = d.helice;
  const dirDa = (a, b) => {
    const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const n = Math.hypot(...v);
    return v.map((x) => x / n);
  };
  const t0 = dirDa(h[0], h[1]);
  const t1 = dirDa(h[h.length - 2], h[h.length - 1]);
  const polo = 0.5;
  const secoes = [
    { pos: h[0].map((x, k) => m(x - polo * t0[k])), raio: 0 },
    ...h.map((p) => ({ pos: p.map(m), raio: m(T.mola_fio / 2) })),
    { pos: h[h.length - 1].map((x, k) => m(x + polo * t1[k])), raio: 0 },
  ];
  passos.push(['loft', { origemId: 12, secoes, lados: T.mola_lados }]);
  nova('mola', 'loft', 12);

  /* 7. pratoSuperior */
  passos.push(['lathe', { origemId: 13, perfil: d.pratoSuperior.map(par), lados }]);
  nova('pratoSuperior', 'lathe', 13);

  /* 8. coxim: base triangular de cantos redondos, três prisioneiros e o pino central, unidos */
  passos.push(['extrusao', { origemId: 14, perfil: d.triangulo.map(par), deslocar: { para: 'fora', distancia: m(T.coxim_arredonda), canto: 'redondo' }, altura: m(T.coxim_base), em: [0, m(T.coxim_y0), 0] }]);
  const solidos = [{ origem: { op: 'extrusao', id: 14 } }];
  d.prisioneiros.forEach(([x, z], k) => {
    const y0 = d.prisioneiroY0;
    passos.push(['lathe', { origemId: 15 + k, perfil: [[0, y0], [T.prisioneiro_raio, y0], [T.prisioneiro_raio, y0 + T.prisioneiro_altura], [0, y0 + T.prisioneiro_altura]].map(par), lados: 16, em: [m(x), 0, m(z)] }]);
    solidos.push({ origem: { op: 'lathe', id: 15 + k } });
  });
  passos.push(['lathe', { origemId: 18, perfil: [[0, d.pino.y0], [T.pino_raio, d.pino.y0], [T.pino_raio, d.pino.y1], [0, d.pino.y1]].map(par), lados: 24 }]);
  solidos.push({ origem: { op: 'lathe', id: 18 } });
  passos.push(['unir', { origemId: 19, solidos }]);
  nova('coxim', 'unir', 19);

  /* materiais */
  passos.push(['material', { sel: { origem: { op: 'lathe', id: 1 } }, usa: 'acoDoCorpo' }]);
  passos.push(['material', { sel: { origem: furo2.origem }, usa: 'chapaEstampada' }]);
  passos.push(['material', { sel: { origem: { op: 'lathe', id: 9 } }, usa: 'chapaEstampada' }]);
  passos.push(['material', { sel: { origem: { op: 'lathe', id: 13 } }, usa: 'chapaEstampada' }]);
  passos.push(['material', { sel: { origem: { op: 'lathe', id: 10 } }, usa: 'cromo' }]);
  passos.push(['material', { sel: { origem: { op: 'lathe', id: 11 } }, usa: 'borracha' }]);
  passos.push(['material', { sel: { origem: { op: 'loft', id: 12 } }, usa: 'acoDaMola' }]);
  passos.push(['material', { sel: { origem: { op: 'unir', id: 19 } }, usa: 'chapaEstampada' }]);
  return passos;
}

/* os furos de parafuso da garra: os aliases dos dois cilindros, que o subtrair cita */
export const ALIASES = [...furoDaGarra(0).aliases, ...furoDaGarra(1).aliases];

export const CONTATOS = [
  { par: ['corpo', 'suporteInferior'], motivo: 'o tubo assenta no fundo do U e entre os dois braços, tangente a eles' },
  { par: ['corpo', 'pratoInferior'], motivo: 'o cubo do prato inferior assenta na face de cima da manga e abraça o tubo' },
  { par: ['pratoInferior', 'mola'], motivo: 'a primeira espira da mola assenta no plano de assento do prato inferior' },
  { par: ['mola', 'pratoSuperior'], motivo: 'a última espira da mola encosta no plano de assento do prato superior' },
  { par: ['corpo', 'haste'], motivo: 'a haste sai da tampa de cima do corpo, em y = 360' },
  { par: ['corpo', 'coifa'], motivo: 'a base da coifa assenta na tampa de cima do corpo' },
  { par: ['haste', 'coifa'], motivo: 'a coifa envolve a haste, com a face de dentro coincidente com a dela' },
  { par: ['coifa', 'pratoSuperior'], motivo: 'o topo da coifa encosta na face de baixo do cubo do prato superior' },
  { par: ['haste', 'pratoSuperior'], motivo: 'a haste atravessa o furo central do prato superior, face com face' },
  { par: ['haste', 'coxim'], motivo: 'o topo da haste encosta na base do coxim, em y = 500' },
  { par: ['pratoSuperior', 'coxim'], motivo: 'a face de cima do cubo do prato superior recebe a base do coxim' },
];

const receita = {
  meta: { nome: 'amortecedor-dianteiro', desc: 'conjunto de amortecedor dianteiro McPherson com mola helicoidal de 6 espiras, 560 mm, oito partes' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS: {
    acoDoCorpo: { tipo: 'metal', cor: '#8b8e92', aspereza: 0.45, metalicidade: 0.85 },
    chapaEstampada: { tipo: 'metal', cor: '#9a9da1', aspereza: 0.5, metalicidade: 0.8 },
    cromo: { tipo: 'metal', cor: '#d7dadd', aspereza: 0.12, metalicidade: 1, brilho: 0.9 },
    borracha: { tipo: 'liso', cor: '#0b0b0c', aspereza: 0.9, metalicidade: 0 },
    acoDaMola: { tipo: 'metal', cor: '#a9adb2', aspereza: 0.3, metalicidade: 0.9, brilho: 0.7 },
  },
  TOPO: { origem: 'ponta de baixo da garra em y = 0, eixo em x = 0 e z = 0; y para cima, a garra aberta para +x e a orelha do cabo para +z' },
  PLANO: {
    objeto: 'conjunto de amortecedor dianteiro McPherson com mola, peça inteira de 560 mm, em pé: eixo em y, garra de chapa em U embaixo aberta para +x, mola helicoidal entre os pratos e coxim com pino no topo',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'comprimento total, da ponta de baixo da garra ao topo do pino do coxim', milimetros: 560 },
    partes: [
      { nome: 'corpo', forma: 'tubo de 50 mm de diâmetro e 330 mm (y 30 a 360), tampado, com a manga de 65 mm e 60 mm de comprimento no meio, chanfrada', tecnica: 'lathe de perfil fechado no eixo, com o chanfro da manga no perfil e sombreamento liso' },
      { nome: 'suporteInferior', forma: 'garra de chapa de 3 mm em U, 120 mm de altura, aberta para +x, com dois furos de parafuso passantes pelos braços e a orelha lateral do cabo de freio, furada', tecnica: 'extrusao do perfil em U e da orelha, unir, e furoPassante em z para os dois furos dos braços' },
      { nome: 'pratoInferior', forma: 'prato de mola estampado, de chapa de 3 mm: cubo na manga, rampa, assento plano e aba de 10 mm, com furo central do diâmetro do tubo', tecnica: 'lathe de perfil fechado que não toca o eixo, com o cubo assentado no topo da manga' },
      { nome: 'haste', forma: 'haste cromada de 22 mm de diâmetro, de y 360 a 500, no eixo do corpo', tecnica: 'lathe de perfil fechado, mesmo número de lados do corpo' },
      { nome: 'coifa', forma: 'sanfona de borracha preta de 10 dobras em volta da haste, do topo do corpo ao prato superior, bem dentro da mola', tecnica: 'lathe de perfil em zigue-zague que acompanha a haste por dentro' },
      { nome: 'mola', forma: 'mola helicoidal de aço, fio de 12 mm, 140 mm de diâmetro médio, 6 espiras de uma hélice contínua e destra, de um prato ao outro', tecnica: 'loft de seções circulares amostradas ao longo da hélice, com um polo em cada ponta; o passo vem da altura entre os assentos' },
      { nome: 'pratoSuperior', forma: 'prato de cima estampado, espelho do inferior: cubo sob a base do coxim com furo da haste, assento plano para a mola e aba voltada para baixo', tecnica: 'lathe de perfil fechado, o mesmo perfil do prato inferior espelhado em y' },
      { nome: 'coxim', forma: 'base triangular de cantos redondos com um prisioneiro em cada vértice e o pino central que fecha os 560 mm', tecnica: 'extrusao do triângulo com deslocar redondo, três lathe de prisioneiro e um de pino, unidos por unir' },
    ],
    criteriosDeReprovacao: [
      'a mola não é uma hélice contínua de 6 espiras, ou atravessa a coifa ou os pratos',
      'a haste sai do eixo do corpo',
      'a garra inferior não tem os dois furos de parafuso',
      'duas partes se interpenetram fora dos encaixes',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const d = derivar(T);
    return [
      { nome: 'junta da haste com o corpo', entre: ['corpo', 'haste'], em: [0, d.corpoY1, 0], toleranciaMm: 1 },
      { nome: 'junta da haste com o coxim', entre: ['haste', 'coxim'], em: [0, T.coxim_y0, 0], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
