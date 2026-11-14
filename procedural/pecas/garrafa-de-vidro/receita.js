/* garrafa-de-vidro — garrafa de boca larga, sem tampa, uma parte (`garrafa`).
 * O alvo está em referencias/alvo.md. O corpo de revolução vem da família `peca-de-revolucao` (perfil `garrafa`): contorno de fora,
 * parede de dentro deslocada por ela e colar saliente. A rosca não é revolução pura e fica aqui, como um tubo helicoidal (`loft`)
 * unido ao corpo; a parte e o liso valem para a união, e não para o corpo sozinho.
 */
import { chamar, criarRegistroDeFamilias } from '../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';

export const TABELA = {
  /* Corpo e proporções, em mm. */
  altura: 160,
  raio_corpo: 37.5,
  parede: 2.5,
  raio_gargalo: 22.5, /* núcleo do gargalo; com 2,5 de parede o furo da boca fica com 40 de diâmetro */
  altura_corpo: 100, /* onde o cilindro acaba e o ombro começa */
  altura_gargalo: 122, /* onde o ombro chega ao gargalo */
  /* Fundo: cúpula para dentro e anel de apoio. */
  cupula: 10,
  raio_apoio_interno: 30,
  raio_apoio_externo: 37.5,
  /* Colar saliente. */
  colar_y: 128,
  colar_altura: 5,
  colar_raio: 26.5,
  /* Rosca: tubo helicoidal. */
  rosca_y0: 140,
  rosca_passo: 7,
  rosca_voltas: 2,
  rosca_raio_fio: 1.2,
  rosca_raio_centro: 23.1, /* crista em 24,3: diâmetro externo do gargalo com rosca = 48 */
  rosca_secoes_por_volta: 24,
  /* Acabamento. */
  raio_canto: 3,
  raio_boca: 0.8,
  lados: 48,
  segmentos_curva: 4,
  angulo_liso: 50,
};

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };
const m = (mm) => mm / 1000;

/* O corpo de revolução é da família `peca-de-revolucao` (perfil `garrafa`): contorno de fora, parede de dentro deslocada, colar só por fora. */
export function parametrosDoCorpo(T) {
  return {
    perfil: 'garrafa', garrafaAltura: T.altura, garrafaRaioCorpo: T.raio_corpo, parede: T.parede, garrafaRaioGargalo: T.raio_gargalo,
    garrafaAlturaCorpo: T.altura_corpo, garrafaAlturaGargalo: T.altura_gargalo, garrafaCupula: T.cupula,
    garrafaRaioApoioInterno: T.raio_apoio_interno, garrafaRaioApoioExterno: T.raio_apoio_externo,
    garrafaColarY: T.colar_y, garrafaColarAltura: T.colar_altura, garrafaColarRaio: T.colar_raio,
    raioCanto: T.raio_canto, raioBoca: T.raio_boca, lados: T.lados, segmentosCurva: T.segmentos_curva, anguloLiso: T.angulo_liso,
  };
}

/** Eixo da rosca: seções {pos, raio} de um tubo que dá voltas no gargalo, em mm. */
export function secoesDaRosca(T) {
  const n = T.rosca_voltas * T.rosca_secoes_por_volta;
  const s = [];
  for (let i = 0; i <= n; i++) {
    const ang = (i / T.rosca_secoes_por_volta) * 2 * Math.PI;
    s.push({
      pos: [T.rosca_raio_centro * Math.cos(ang), T.rosca_y0 + T.rosca_passo * (i / T.rosca_secoes_por_volta), T.rosca_raio_centro * Math.sin(ang)],
      raio: T.rosca_raio_fio,
    });
  }
  /* loft só fecha com a ponta em raio 0: o fio começa e termina afinando num ponto. */
  s[0] = { pos: s[0].pos, raio: 0 };
  s[s.length - 1] = { pos: s[s.length - 1].pos, raio: 0 };
  return s;
}

export function derivar(T = TABELA) {
  return { corpo: chamar(familias().obter('peca-de-revolucao'), 'corpo', parametrosDoCorpo(T)), rosca: secoesDaRosca(T) };
}

const ID = { corpo: 1, rosca: 2, garrafa: 3 };

export function gerarPassos(T = TABELA) {
  const D = derivar(T);
  const passos = [];
  /* a família publica o lathe, a parte e o liso do corpo; a parte e o liso passam a valer para a união com a rosca */
  const { passos: doCorpo } = expandirChamadasDeComposicao(familias().registroComposicoes, [D.corpo]);
  passos.push(doCorpo.find(([op]) => op === 'lathe'));
  passos.push(['loft', {
    origemId: ID.rosca,
    lados: 8,
    secoes: D.rosca.map((s) => ({ pos: s.pos.map(m), raio: m(s.raio) })),
  }]);
  passos.push(['unir', {
    origemId: ID.garrafa,
    solidos: [{ origem: { op: 'lathe', id: ID.corpo } }, { origem: { op: 'loft', id: ID.rosca } }],
  }]);
  const sel = { origem: { op: 'unir', id: ID.garrafa } };
  passos.push(['parte', { nome: 'garrafa', sel }]);
  passos.push(['material', { usa: 'vidro', sel }]);
  passos.push(['liso', { sel, angulo: T.angulo_liso }]);
  return passos;
}

export const CONTATOS = [];

export const MATERIAIS = { vidro: { cor: '#b9d8d0', aspereza: 0.05, metalicidade: 0 } };

const receita = {
  meta: { nome: 'garrafa-de-vidro', desc: 'garrafa de vidro de boca larga, oca, com cúpula no fundo, colar e rosca no gargalo' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro do fundo, no chão; y para cima, eixo da garrafa em y' },
  PLANO: {
    objeto: 'garrafa de vidro de boca larga sem tampa, 160 mm de altura, corpo de 75 mm de diâmetro, gargalo curto com rosca e colar, parede de 2,5 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da garrafa', milimetros: 160 },
    familiaProcedural: 'peca-de-revolucao',
    partes: [
      {
        nome: 'garrafa',
        forma: 'casca oca de revolução: corpo cilíndrico, ombro em curva até o gargalo, boca de 40 mm, colar saliente, duas voltas de rosca helicoidal, fundo com cúpula de 10 mm e anel de apoio',
        tecnica: 'família peca-de-revolucao, perfil garrafa: lathe da seção fechada (parede 2,5 deslocada do contorno de fora, colar só por fora), unido por unir a um loft helicoidal da rosca; liso com ângulo',
        dePerto: [
          { ponto: [0, 140, 24], oQue: 'rosca helicoidal e colar no gargalo' },
          { ponto: [0, 5, 20], oQue: 'cúpula do fundo e anel de apoio' },
        ],
      },
    ],
    criteriosDeReprovacao: [
      'garrafa maciça, sem a cavidade de parede 2,5 mm aberta pela boca',
      'gargalo sem rosca ou sem colar saliente abaixo dela',
      'fundo plano, sem a cúpula que sobe uns 10 mm no meio',
      'ombro em degrau em vez de curva contínua do corpo ao gargalo',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'topo da boca', parte: 'garrafa', medida: 'maximo', em: [T.raio_corpo, T.altura, T.raio_corpo], toleranciaMm: 0.5 },
      { nome: 'fundo no chão', parte: 'garrafa', medida: 'minimo', em: [-T.raio_corpo, 0, -T.raio_corpo], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
