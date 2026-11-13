/* kukri — faca de lâmina curva de desenho moderno, deitada, em duas partes: `lamina` e `cabo`. A lâmina é uma `chapaDeContorno` (o contorno da
 * foto, o chanfro do gume, a quina quebrada do dorso e o raio da quebra do dorso), o cabo é um `corpoDeSecaoVariavel` (estações de seção,
 * cinco sulcos entre gomos e a guarda alargada) e o furo do cordão é um `furoPassante` através do cabo subdividido.
 *
 * REFERENCIAL. x é o comprimento, de 0 na ponta do cabo a 430 na ponta da lâmina; y é a espessura e para cima, com o chão em
 * y = 0; z é a largura da lâmina, com o dorso para +z e o gume para -z. O cabo e a lâmina compartilham o eixo y do meio da chapa.
 * Medidas em milímetro; a malha sai em metro por `gerarPassos`.
 *
 * ORIGEM DOS NÚMEROS. Os contornos do dorso, do gume e da silhueta do cabo foram levantados de uma foto de estudo fora do
 * repositório (resumo em `referencias/alvo.md` e `referencias/contorno-derivado.json`). Nada da foto entra aqui, só as
 * coordenadas derivadas, e a gravação da foto não é modelada. */
import { chapaDeContorno } from '../../nucleo/chapa-de-contorno.js';
import { corpoDeSecaoVariavel } from '../../nucleo/corpo-de-secao-variavel.js';
import { furoPassante } from '../../nucleo/furo-passante.js';

export const TABELA = {
  /* o meio da chapa e do cabo, a altura do eixo sobre o chão */
  eixo_y: 14.5,
  /* LÂMINA: de x = lamina_base (a face que encosta no cabo) à ponta em x = comprimento */
  comprimento: 430,
  lamina_base: 140,
  espessura_dorso: 5,
  /* a quina do dorso: recuo em z, altura da quebra em y e fração da largura da lâmina que o recuo pode ocupar */
  quina_dorso_recuo: 0.8, quina_dorso_altura: 0.8, quina_dorso_fracao: 0.15,
  /* o chanfro do gume: largura máxima em z, fração da largura da lâmina que ele pode ocupar, e o degrau onde o gume começa */
  chanfro_largura: 16,
  chanfro_fracao: 0.42,
  degrau_x: 152,
  degrau_rampa: 3,
  /* a lâmina afina de espessura do dorso a afina_ponta de espessura na ponta, a partir de afina_de */
  afina_de: 340, afina_ponta: 0.6,
  passo_x: 5,
  /* os raios dos dois cantos do dorso, em mm: a quebra em ângulo (o arco de 6 mm de tangente de cada lado) e a curva suave do meio */
  quebra: [280, 57.2], quebra_raio: 24.5, dorso_meio: [355, 32.2], dorso_meio_raio: 300,
  /* contornos levantados da foto, [x, z] em mm: o dorso, da ponta à base, e o gume, da base à ponta */
  dorso: [[430, 1.2], [355, 32.2], [280, 57.2], [140, 34.5]],
  gume: [[140, 0.6], [152, 0.6], [154.5, 2.2], [160, 2.9], [170, 3.6], [180, 6], [190, 7.2], [200, 7.2], [210, 6.2], [220, 4.6], [230, 2.5], [240, 0.2], [250, -2.8], [260, -5.8], [270, -9], [280, -12.1], [290, -14.9], [300, -17.2], [310, -18.8], [320, -20], [330, -20.7], [340, -21], [350, -20.6], [360, -20], [370, -18.7], [380, -17], [390, -14.8], [400, -11.7], [410, -8.4], [420, -4.4], [430, 1.2]],
  /* CABO: de x = 0 (a ponta do bico) a x = cabo_frente (a frente, que faz de guarda) */
  cabo_frente: 140.0755,
  /* as estações da seção do cabo, [x, centro em z, semieixo em z, semieixo em y]: o bico curvado para o lado do gume, o cabo reto de centro
     em reta e a guarda, que alarga em z e achata em y até a frente */
  cabo_estacoes: [[2, -0.92, 4.48, 4.43], [4.5, -2.59, 8.44, 7.44], [10, -6, 15, 11], [18, -6.75, 22.25, 12.79], [24, -7.75, 25.25, 13.24], [27, -7.1, 25.4, 13.37], [30, -1.5, 20.5, 13.5],
    [33, 4.29, 15.29, 13.68], [40, 6.4, 14.4, 14], [50, 7.35, 15.15, 14], [57.5, 7.73, 15.24, 14], [60, 11.4, 16.5, 14], [70, 12.6, 16.58, 14], [95, 15.6, 16.77, 14], [107, 17.04, 16.86, 14],
    [120, 18.6, 16.95, 14], [127.5755, 19.62, 17, 14], [130.0755, 19.81, 17, 14.4], [132.5755, 20.11, 17.49, 13.68], [135.0755, 20.41, 18.52, 11.61], [137.5755, 20.71, 19.54, 8.18], [140.0755, 21.01, 20, 3.4]],
  oval_expoente: 2.4,
  /* os cinco sulcos entre gomos: o primeiro a 15 mm da frente, o passo entre eles, a largura e o quanto recuam os semieixos */
  gomo_primeiro: 125.0755, gomo_passo: 12.5, gomo_sulco: 5, gomo_largura: 7.5, gomos: 6,
  furo_x: 17, furo_z: -1, furo_raio: 2.6,
  niveis_cabo: 2,
};

/* ---------- lâmina e cabo ---------- */

export function lamina(T = TABELA) {
  const i = T.gume.findIndex((p) => p[0] === T.degrau_x);
  const ponta = T.dorso[0];
  return chapaDeContorno({
    nome: 'l', eixo: 'y', em: T.eixo_y, espessura: T.espessura_dorso, passo: T.passo_x, tampa: { de: 'base', ate: 'ponta' },
    trechos: [
      { nome: 'base', pontos: [T.dorso[T.dorso.length - 1], T.gume[0]], pontosNoTrecho: 3 },
      { nome: 'gumeLiso', pontos: T.gume.slice(0, i + 1) },
      { nome: 'gume', pontos: T.gume.slice(i), grupo: 'fio', chanfro: { recuoEm: 'v', largura: T.chanfro_largura, entrada: T.degrau_rampa, limite: { fracao: T.chanfro_fracao, contra: ['dorso'] } } },
      { nome: 'ponta', pontos: [ponta] },
      { nome: 'dorso', pontos: T.dorso, quinaQuebrada: { recuoEm: 'v', largura: T.quina_dorso_recuo, altura: T.quina_dorso_altura, limite: { fracao: T.quina_dorso_fracao, contra: ['gumeLiso', 'gume'] } } },
    ],
    raioDoCanto: [{ em: T.quebra, raio: T.quebra_raio }, { em: T.dorso_meio, raio: T.dorso_meio_raio }],
    afinar: { coordenada: 'u', de: T.afina_de, ate: T.comprimento, espessuraFinal: T.afina_ponta },
  });
}

export function cabo(T = TABELA) {
  return corpoDeSecaoVariavel({
    nome: 'c', eixo: 'x', expoente: T.oval_expoente,
    estacoes: T.cabo_estacoes.map(([em, zc, sz, sy]) => ({ em, centro: [T.eixo_y, zc], semieixos: [sy, sz] })),
    sulcos: Array.from({ length: T.gomos }, (_, k) => ({ em: T.gomo_primeiro - k * T.gomo_passo, largura: T.gomo_largura, profundidade: T.gomo_sulco })),
  });
}

export function derivar(T = TABELA) {
  return { lamina: lamina(T), cabo: cabo(T) };
}

/** O furo do cordão, em y, através do cabo (o passo 2) com o cilindro no passo 3 e a subtração no 4. */
export const furo = (T = TABELA) => furoPassante({
  solido: { origem: { op: 'subdivisao', id: 2 } }, posicao: [T.furo_x, T.eixo_y, T.furo_z], direcao: 'y', raio: T.furo_raio, comprimento: 40, ids: { cilindro: 3, subtrair: 4 },
});

export function gerarPassos(T = TABELA) {
  const { lamina, cabo } = derivar(T);
  const furoDoCabo = furo(T);
  return [
    ['subdivisao', { origemId: 1, ...lamina.passo, niveis: 0 }],
    ['parte', { nome: 'lamina', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ['subdivisao', { origemId: 2, ...cabo.passo, niveis: T.niveis_cabo }],
    ...furoDoCabo.passos,
    ['parte', { nome: 'cabo', sel: { origem: furoDoCabo.origem } }],
    ['material', { sel: { origem: { op: 'subdivisao', id: 1 } }, usa: 'laminaFosca' }],
    ['material', { sel: { origem: { op: 'subdivisao', id: 1, parte: 'fio' } }, usa: 'fio' }],
    ['material', { sel: { origem: furoDoCabo.origem }, usa: 'caboGranulado' }],
  ];
}

export const ALIASES = furo().aliases;

export const CONTATOS = [
  { par: ['lamina', 'cabo'], motivo: 'a base da lâmina, em x = 140, encosta na face da frente do cabo, que faz de guarda, sem vão nem degrau solto' },
];

const receita = {
  meta: { nome: 'kukri', desc: 'kukri de desenho moderno, 430 mm, lâmina curva com chanfro e cabo de cinco gomos com bico furado' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS: {
    laminaFosca: { tipo: 'liso', cor: '#111113', aspereza: 0.92, metalicidade: 0.04 },
    fio: { tipo: 'metal', cor: '#a9adb2', aspereza: 0.25, metalicidade: 0.9, brilho: 0.8 },
    caboGranulado: { tipo: 'liso', cor: '#060607', aspereza: 0.9, metalicidade: 0, relevo: { tipo: 'granulado', escala: 0.6, intensidade: 0.5 } },
  },
  get TOPO() { return { origem: 'ponta do cabo em x = 0; x para a ponta da lâmina, y para cima com o chão em 0, o gume para -z', ...derivar(this.PARAMS).lamina.pontos, ...derivar(this.PARAMS).cabo.pontos }; },
  PLANO: {
    objeto: 'kukri de desenho moderno, 430 mm de ponta a ponta, deitada: comprimento em x, largura da lâmina em z (dorso para +z, gume para -z) e espessura em y',
    referencias: [
      'referencias/alvo.md',
      'referencias/contorno-derivado.json',
    ],
    escala: { medida: 'comprimento total, da ponta do cabo à ponta da lâmina', milimetros: 430 },
    /* dispensa dada pela pessoa em 2026-11-13: a faca usa subdivisão no cabo e não tem chapa de carroceria */
    lataria: { dispensa: 'faca de mão: lâmina de chapa plana e cabo maciço, sem chapa de superfície livre em que amassado largo e raso possa aparecer; dispensa dada pela pessoa em 2026-11-13' },
    partes: [
      { nome: 'lamina', forma: 'chapa de 290 mm (x 140 a 430), 5 mm no dorso: quebra em ângulo do dorso em x 280, dorso até a ponta aguda, barriga larga perto da ponta, chanfro largo no gume, trecho sem fio e degrau junto ao cabo, quinas do dorso quebradas', tecnica: 'chapaDeContorno em cinco planos de y, contorno levantado da foto, com chanfro do gume, quina quebrada e raio da quebra do dorso, sem subdivisão para o chanfro ficar plano; o fio é um grupo de faces com material próprio' },
      { nome: 'cabo', forma: 'peça única de 140 mm (x 0 a 140), seção ovalada: frente alargada de guarda, cinco gomos com sulcos, bico curvado para o lado do gume e furo passante em y para cordão', tecnica: 'corpoDeSecaoVariavel em cortes de x com subdivisão de dois níveis, sulcos como estreitamento dos semieixos, furo por furoPassante (subtração de um cilindro e limpeza das lascas)' },
    ],
    criteriosDeReprovacao: [
      'a lâmina não tem a quebra em ângulo no dorso, ou a barriga não é mais larga perto da ponta do que junto ao cabo',
      'a lâmina tem espessura igual de cima a baixo, sem afinar até o fio, ou a linha do chanfro não acompanha a curva de baixo',
      'o cabo fica fora da proporção combinada, cerca de 140 mm para 290 mm de lâmina',
      'faltam os cinco gomos, o bico curvado na ponta ou o furo do cordão, ou a frente do cabo não alarga',
      'aparece vão ou degrau solto entre a lâmina e o cabo, ou uma parte atravessa a outra',
      'o cabo sai com quinas vivas, ou a lâmina e o cabo saem com o mesmo material',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'caixa da lâmina: ponta em x, face de cima em y e dorso na quebra em z', parte: 'lamina', medida: 'maximo', em: [T.comprimento, T.eixo_y + T.espessura_dorso / 2, T.quebra[1]], toleranciaMm: 1 },
      { nome: 'caixa da lâmina: gume mais fundo em z', parte: 'lamina', medida: 'minimo', em: [T.lamina_base, T.eixo_y - T.espessura_dorso / 2, -21], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
