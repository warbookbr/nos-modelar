/* Abajur de mesa: base, haste, soquete e cúpula são revoluções geradas pela família `peca-de-revolucao` (perfis abajur-base, abajur-haste,
   abajur-soquete e abajur-cupula); a armação é arame de cilindros finos (aro de revolução, duas alças, três raios em Y e o botão), que
   não é parte de revolução e fica aqui. Y para cima, chão em y 0, eixo do abajur em x 0 e z 0. */
import { chamar, criarRegistroDeFamilias } from '../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';

export const TABELA = {
  base_raio: 75, base_altura: 30, base_degrau_raio: 58, base_degrau_y: 12, base_raio_borda: 4,
  haste_raio: 6,
  soquete_raio: 15, soquete_altura: 50, soquete_y: 330,
  cupula_raio_baixo: 140, cupula_raio_cima: 115, cupula_altura: 190, cupula_y: 255, cupula_parede: 2,
  arame_raio: 1.5, aro_y_acima_do_pe: 42, alca_folga_topo: 15, botao_raio: 7.5, botao_altura: 15,
  lados: 48, lados_arame: 8,
};

const GRAUS = Math.PI / 180;

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* As quatro partes de revolução: a família dá o perfil de cada uma; a TABELA em mm vira os parâmetros dela. */
export function chamadasDeRevolucao(T) {
  const f = familias().obter('peca-de-revolucao');
  const comum = { lados: T.lados, anguloLiso: ANGULO_LISO };
  return [
    chamar(f, 'base', { perfil: 'abajur-base', ...comum, origem: ID.base, baseRaio: T.base_raio, baseAltura: T.base_altura, baseDegrauRaio: T.base_degrau_raio, baseDegrauAltura: T.base_degrau_y, baseRaioBorda: T.base_raio_borda }),
    chamar(f, 'haste', { perfil: 'abajur-haste', ...comum, origem: ID.haste, cilindroRaio: T.haste_raio, cilindroY0: T.base_altura, cilindroAltura: T.soquete_y - T.base_altura }),
    chamar(f, 'soquete', { perfil: 'abajur-soquete', ...comum, origem: ID.soquete, cilindroRaio: T.soquete_raio, cilindroY0: T.soquete_y, cilindroAltura: T.soquete_altura }),
    chamar(f, 'cupula', { perfil: 'abajur-cupula', ...comum, origem: ID.cupula, cupulaRaioBaixo: T.cupula_raio_baixo, cupulaRaioCima: T.cupula_raio_cima, cupulaAltura: T.cupula_altura, cupulaY: T.cupula_y, parede: T.cupula_parede }),
  ];
}
const MATERIAL_DA_PARTE = { base: 'metal', haste: 'metal', soquete: 'metal', cupula: 'linho' };

/* A armação: aro, botão (revoluções de seção pequena) e hastes retas entre dois pontos [x, y, z]. */
export function derivar(T) {
  const topo = T.cupula_y + T.cupula_altura;
  const yRaios = topo - T.arame_raio;
  const yAro = T.soquete_y + T.aro_y_acima_do_pe;
  const ra = T.arame_raio;
  const rAro = T.soquete_raio + ra;
  const yBotaoBaixo = yRaios - T.botao_altura / 2;
  const aro = [[T.soquete_raio, yAro - ra], [T.soquete_raio + 2 * ra, yAro - ra], [T.soquete_raio + 2 * ra, yAro + ra], [T.soquete_raio, yAro + ra]];
  const botao = [[0, yBotaoBaixo], [T.botao_raio, yBotaoBaixo], [T.botao_raio, yBotaoBaixo + T.botao_altura], [0, yBotaoBaixo + T.botao_altura]];
  /* Alças: sobem retas por fora do soquete (no raio do centro do aro, encostadas na parede) até passar do topo dele, e dali
     seguem inclinadas até a base do botão, nos dois lados em x. */
  const yCotovelo = T.soquete_y + T.soquete_altura + T.alca_folga_topo;
  const subidas = [-1, 1].map((s) => ({ de: [s * rAro, yAro, 0], para: [s * rAro, yCotovelo, 0] }));
  const alcas = [-1, 1].map((s) => ({ de: [s * rAro, yCotovelo, 0], para: [s * T.botao_raio * 0.5, yBotaoBaixo + 1, 0] }));
  /* Raios em Y: do botão ao aro de cima da cúpula, a 120 graus um do outro, o primeiro para +z. */
  const rFim = T.cupula_raio_cima - T.cupula_parede / 2;
  const raios = [0, 120, 240].map((g) => ({ giroY: -90 + g, comprimento: rFim, y: yRaios }));
  return { aro, botao, subidas, alcas, raios, yAro };
}

const m = (mm) => mm / 1000;
const ID = { base: 1, haste: 2, soquete: 3, cupula: 4, aro: 5, botao: 6, alca: 10, subida: 12, raio: 20, armacao: 40 };
const ANGULO_LISO = 30;

/* O cilindro inteiro é a lateral e as duas tampas; só a origem leva as laterais. Um alias por haste de arame. */
const HASTES = [ID.alca, ID.alca + 1, ID.subida, ID.subida + 1, ID.raio, ID.raio + 1, ID.raio + 2];
const aliasDe = (id) => `haste${id}`;
export const ALIASES = HASTES.map((id) => [aliasDe(id), { unir: [
  { origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } },
] }]);

export function gerarPassos(T) {
  const D = derivar(T);
  const P = [];
  const perfilM = (perfil) => perfil.map(([r, y]) => [m(r), m(y)]);
  const { passos: revolucoes } = expandirChamadasDeComposicao(familias().registroComposicoes, chamadasDeRevolucao(T));
  P.push(...revolucoes.flatMap((passo) => (passo[0] === 'parte' ? [passo, ['material', { sel: passo[1].sel, usa: MATERIAL_DA_PARTE[passo[1].nome] }]] : [passo])));

  /* Armação: o aro e o botão giram; alças e raios são cilindros finos girados até a direção. Uma parte, vários passos. */
  const arm = [];
  P.push(['lathe', { origemId: ID.aro, lados: T.lados, perfil: perfilM(D.aro), furos: [] }]);
  arm.push({ origem: { op: 'lathe', id: ID.aro } });
  P.push(['lathe', { origemId: ID.botao, lados: T.lados_arame * 2, perfil: perfilM(D.botao) }]);
  arm.push({ origem: { op: 'lathe', id: ID.botao } });
  [...D.alcas.map((a, i) => [a, ID.alca + i]), ...D.subidas.map((a, i) => [a, ID.subida + i])].forEach(([a, id]) => {
    const [x0, y0] = a.de; const [x1, y1] = a.para;
    const dx = x1 - x0; const dy = y1 - y0;
    P.push(['cilindro', { origemId: id, raio: m(T.arame_raio), altura: m(Math.hypot(dx, dy)), lados: T.lados_arame, em: [m(x0), m(y0), 0] }]);
    P.push(['rotaciona', { eixo: 'z', graus: Math.atan2(-dx, dy) / GRAUS, pivo: [m(x0), m(y0), 0], sel: { origem: { op: 'cilindro', id } } }]);
    arm.push({ alias: aliasDe(id) });
  });
  D.raios.forEach((r, i) => {
    const id = ID.raio + i;
    P.push(['cilindro', { origemId: id, eixo: 'x', raio: m(T.arame_raio), altura: m(r.comprimento), lados: T.lados_arame, em: [0, m(r.y), 0] }]);
    P.push(['rotaciona', { eixo: 'y', graus: r.giroY, pivo: [0, m(r.y), 0], sel: { origem: { op: 'cilindro', id } } }]);
    arm.push({ alias: aliasDe(id) });
  });
  /* Um sólido só: o arame fundido, sem face interna onde as hastes se cruzam. */
  const selArm = { origem: { op: 'unir', id: ID.armacao } };
  P.push(['unir', { origemId: ID.armacao, solidos: arm }]);
  P.push(['parte', { nome: 'armacao', sel: selArm }], ['material', { sel: selArm, usa: 'metal' }]);
  return P;
}

export const CONTATOS = [
  { par: ['base', 'haste'], motivo: 'a haste nasce em y 30, na face de cima do degrau superior da base, e sobe do centro' },
  { par: ['haste', 'soquete'], motivo: 'o topo da haste, em y 330, é a face de baixo do soquete' },
  { par: ['soquete', 'armacao'], motivo: 'o aro de arame abraça o soquete: o raio interno do aro é o raio do soquete' },
  { par: ['armacao', 'cupula'], motivo: 'os três raios terminam na parede do aro de cima da cúpula, a 114 mm do eixo, entre os raios 113 e 115 da parede' },
];

export const MATERIAIS = {
  metal: { cor: '#b9bcc0', metalicidade: 0.85, aspereza: 0.35 },
  linho: { cor: '#e3d7bf', metalicidade: 0, aspereza: 0.95 },
};

const receita = {
  meta: { nome: 'abajur-de-mesa', desc: 'abajur de mesa de 450 mm: base de dois degraus, haste, soquete, armação de arame e cúpula tronco-cônica de linho' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'o eixo do abajur em x 0 e z 0; chão em y 0; y para cima; um dos raios da armação aponta para +z' },
  PLANO: {
    objeto: 'abajur de mesa de 450 mm: base de metal de dois degraus, haste fina, soquete, armação de arame e cúpula cônica de linho aberta em cima e embaixo',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da peça', milimetros: 450 },
    familiaProcedural: 'peca-de-revolucao',
    partes: [
      { nome: 'base', forma: 'disco de 150 mm de diâmetro e 30 mm de altura em dois degraus de bordas arredondadas', tecnica: 'família peca-de-revolucao, perfil abajur-base: lathe com cantos chanfrados e liso' },
      { nome: 'haste', forma: 'tubo de 12 mm de diâmetro do centro da base, de y 30 a y 330', tecnica: 'família peca-de-revolucao, perfil abajur-haste: lathe de perfil retangular' },
      { nome: 'soquete', forma: 'cilindro de 30 mm de diâmetro e 50 mm de altura, de y 330 a y 380', tecnica: 'família peca-de-revolucao, perfil abajur-soquete: lathe de perfil retangular' },
      { nome: 'armacao', forma: 'arame de 3 mm: aro em volta do soquete, duas alças até o botão de 15 mm, três raios em Y a 120 graus até o aro de cima da cúpula', tecnica: 'lathe para aro e botão, cilindros finos girados para alças e raios' },
      { nome: 'cupula', forma: 'tronco de cone aberto, 280 mm embaixo, 230 mm em cima, 190 mm de altura, parede de 2 mm, borda de baixo em y 255', tecnica: 'família peca-de-revolucao, perfil abajur-cupula: lathe da casca (contorno de fora, o de dentro deslocado pela parede) com liso' },
    ],
    criteriosDeReprovacao: ['cúpula maciça ou fechada', 'armação ausente ou com raios soltos da cúpula', 'haste fora do eixo', 'cúpula sem a conicidade (mais larga embaixo)'],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'topo da cúpula', parte: 'cupula', medida: 'maximo', em: [T.cupula_raio_baixo, T.cupula_y + T.cupula_altura, T.cupula_raio_baixo], toleranciaMm: 1 },
      { nome: 'borda de baixo da cúpula', parte: 'cupula', medida: 'minimo', em: [-T.cupula_raio_baixo, T.cupula_y, -T.cupula_raio_baixo], toleranciaMm: 1 },
      { nome: 'junta da haste na base', entre: ['base', 'haste'], em: [0, T.base_altura, 0], toleranciaMm: 1 },
      { nome: 'topo do soquete', parte: 'soquete', medida: 'maximo', em: [T.soquete_raio, T.soquete_y + T.soquete_altura, T.soquete_raio], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
