/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/fps/v3/pecas/` são exemplos. Elas existem para
 * exercitar e provar capacidades do núcleo, e nada mais. Nenhuma é referência de
 * engenharia, componente aprovado ou ponto de partida de produto.
 *
 * Medidas e proporções foram escolhidas para fazer uma capacidade passar ou
 * falhar, não para descrever um componente real. Esta geometria pode mudar ou
 * ser removida a qualquer momento, sem aviso e sem migração.
 *
 * O que este repositório sustenta é o núcleo e as capacidades provadas — nunca
 * a geometria daqui. Ver "Peças são exemplos" no README.md.
 */
/* _mancal-de-mesa.js — mancal de mesa simplificado para a homologação do
   fluxo de modelagem por IA. A receita fixa X como eixo do conjunto, Y como
   vertical e Z como profundidade. Base, bucha e eixo são partes isoláveis; a
   folga é declarada por duas interfaces cilíndricas, não inferida da imagem. */
import { executar, colisaoDe, nucleo } from '../motor/oficina.js';

export const TOPO = {
  ladosDeRevolucao: 32,
  ladosDosFuros: 20,
};

const MEDIDAS = {
  peLargura: 0.160,
  peEspessura: 0.012,
  peProfundidade: 0.080,
  fixacaoEsquerdaX: -0.060,
  fixacaoDireitaX: 0.060,
  fixacaoEsquerdaZ: -0.025,
  fixacaoDireitaZ: 0.025,
  fixacaoRaio: 0.006,

  centroBuchaY: 0.055,
  pedestalLargura: 0.032,
  pedestalAltura: 0.055,
  pedestalProfundidade: 0.036,
  alojamentoComprimento: 0.030,
  alojamentoRaioInterno: 0.0224,
  alojamentoRaioExterno: 0.030,

  buchaComprimento: 0.050,
  buchaDiametroExterno: 0.044,
  buchaDiametroInterno: 0.0204,

  eixoComprimento: 0.120,
  eixoDiametro: 0.020,
  folgaDiametralNominal: 0.0004,
  toleranciaNumerica: 0.000001,
};

const DERIVADAS = {
  peTopoY: '= peEspessura',
  alojamentoMeioComprimento: '= alojamentoComprimento / 2',
  alojamentoInicioX: '= -alojamentoMeioComprimento',
  alojamentoFimX: '= alojamentoMeioComprimento',
  buchaRaioExterno: '= buchaDiametroExterno / 2',
  buchaRaioInterno: '= buchaDiametroInterno / 2',
  buchaMeioComprimento: '= buchaComprimento / 2',
  buchaInicioX: '= -buchaMeioComprimento',
  buchaFimX: '= buchaMeioComprimento',
  eixoRaio: '= eixoDiametro / 2',
  eixoMeioComprimento: '= eixoComprimento / 2',
  eixoInicioX: '= -eixoMeioComprimento',
  eixoFimX: '= eixoMeioComprimento',
  folgaRadialNominal: '= folgaDiametralNominal / 2',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

export const MATERIAIS = {
  ferroFundido: { cor: '#48545b', aspereza: 0.78 },
  bronzeDaBucha: { cor: '#b87932', aspereza: 0.42 },
  acoDoEixo: { cor: '#aeb9c0', aspereza: 0.25 },
};

/* IDs de origem pertencem à autoria e continuam estáveis quando a ordem dos
   passos muda. Nenhuma seleção abaixo cita face numérica ou posição de passo. */
const PE = 1200;
const FUROS_DE_FIXACAO = 1201;
const PEDESTAL = 1210;
const ALOJAMENTO = 1220;
const BUCHA = 1230;
const EIXO = 1240;

const ORIGEM_PE = { op: 'cubo', id: PE };
const ORIGEM_ALOJAMENTO = { op: 'lathe', id: ALOJAMENTO };
const ORIGEM_BUCHA = { op: 'lathe', id: BUCHA };
const ORIGEM_EIXO = { op: 'cilindro', id: EIXO };

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });

export const ALIASES = [
  ['eixoInteiro', cilindroInteiro(EIXO)],
];

const girarParaEixoX = (op, id) => ['rotaciona', {
  eixo: 'z',
  graus: -90,
  pivo: [0, 0, 0],
  sel: { origem: { op, id } },
}];

export const PASSOS = [
  /* Pé nominal de 160 × 12 × 80 mm. A parte é atribuída antes do corte:
     bordas, paredes e saídas criadas pelos furos herdam a identidade `base`. */
  ['cubo', {
    origemId: PE,
    larg: 'peLargura',
    alt: 'peEspessura',
    prof: 'peProfundidade',
  }],
  ['parte', { nome: 'base', sel: { origem: ORIGEM_PE } }],
  ['furo', {
    origemId: FUROS_DE_FIXACAO,
    de: { ...ORIGEM_PE, face: 'topo' },
    saida: { ...ORIGEM_PE, face: 'fundo' },
    /* Furos em diagonal simétrica: a vista superior os separa do eixo e do
       pedestal, sem alterar o envelope nem a posição dos demais volumes. */
    centros: [
      ['fixacaoEsquerdaX', 'peTopoY', 'fixacaoEsquerdaZ'],
      ['fixacaoDireitaX', 'peTopoY', 'fixacaoDireitaZ'],
    ],
    raio: 'fixacaoRaio',
    lados: 'ladosDosFuros',
    orientacao: [0, 0, 1],
  }],

  /* O pedestal atravessa o pé e encontra o alojamento. A pequena sobreposição
     entre volumes da mesma parte evita que a base pareça uma pilha desconexa. */
  ['cubo', {
    origemId: PEDESTAL,
    larg: 'pedestalLargura',
    alt: 'pedestalAltura',
    prof: 'pedestalProfundidade',
  }],
  ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: PEDESTAL } } }],

  /* Anel de alojamento curto: deixa 10 mm da bucha salientes em cada lado. */
  ['lathe', { origemId: ALOJAMENTO, lados: 'ladosDeRevolucao', perfil: [
    ['alojamentoRaioInterno', 'alojamentoInicioX'],
    ['alojamentoRaioExterno', 'alojamentoInicioX'],
    ['alojamentoRaioExterno', 'alojamentoFimX'],
    ['alojamentoRaioInterno', 'alojamentoFimX'],
    ['alojamentoRaioInterno', 'alojamentoInicioX'],
  ] }],
  girarParaEixoX('lathe', ALOJAMENTO),
  ['transladar', { d: [0, 'centroBuchaY', 0], sel: { origem: ORIGEM_ALOJAMENTO } }],
  ['parte', { nome: 'base', sel: { origem: ORIGEM_ALOJAMENTO } }],

  /* A bucha é uma superfície de revolução fechada e realmente vazada. */
  ['lathe', { origemId: BUCHA, lados: 'ladosDeRevolucao', perfil: [
    ['buchaRaioInterno', 'buchaInicioX'],
    ['buchaRaioExterno', 'buchaInicioX'],
    ['buchaRaioExterno', 'buchaFimX'],
    ['buchaRaioInterno', 'buchaFimX'],
    ['buchaRaioInterno', 'buchaInicioX'],
  ] }],
  girarParaEixoX('lathe', BUCHA),
  ['transladar', { d: [0, 'centroBuchaY', 0], sel: { origem: ORIGEM_BUCHA } }],
  ['parte', { nome: 'bucha', sel: { origem: ORIGEM_BUCHA } }],

  /* O eixo nasce ao longo de Y, gira para X e é centralizado na bucha. */
  ['cilindro', {
    origemId: EIXO,
    raio: 'eixoRaio',
    altura: 'eixoComprimento',
    lados: 'ladosDeRevolucao',
  }],
  girarParaEixoX('cilindro', EIXO),
  ['transladar', {
    d: ['eixoInicioX', 'centroBuchaY', 0],
    sel: { alias: 'eixoInteiro' },
  }],
  ['parte', { nome: 'eixo', sel: { alias: 'eixoInteiro' } }],

  /* As duas portas descrevem o mesmo quadro. A diferença dos raios é 0,2 mm
     radial, portanto 0,4 mm diametral, exatamente o alvo declarado. */
  ['publicarPorta', {
    id: 'cavidadeDaBucha',
    rotulo: 'Cavidade cilíndrica da bucha',
    de: { ...ORIGEM_BUCHA, faixa: 3 },
    interface: {
      forma: 'cilindro',
      papel: 'interna',
      eixo: [1, 0, 0],
      referencia: [0, 1, 0],
      centro: [0, 'centroBuchaY', 0],
      raio: 'buchaRaioInterno',
      inicio: 'buchaInicioX',
      fim: 'buchaFimX',
    },
  }],
  ['publicarPorta', {
    id: 'superficieDoEixo',
    rotulo: 'Superfície cilíndrica do eixo',
    de: ORIGEM_EIXO,
    interface: {
      forma: 'cilindro',
      papel: 'externa',
      eixo: [1, 0, 0],
      referencia: [0, 1, 0],
      centro: [0, 'centroBuchaY', 0],
      raio: 'eixoRaio',
      inicio: 'eixoInicioX',
      fim: 'eixoFimX',
    },
  }],

  ['liso', { sel: { origem: ORIGEM_ALOJAMENTO } }],
  ['liso', { sel: { origem: ORIGEM_BUCHA } }],
  ['liso', { sel: { origem: ORIGEM_EIXO } }],

  ['material', { sel: { grupo: 'base' }, usa: 'ferroFundido' }],
  ['material', { sel: { grupo: 'bucha' }, usa: 'bronzeDaBucha' }],
  ['material', { sel: { grupo: 'eixo' }, usa: 'acoDoEixo' }],

  ['solido', { sel: { grupo: 'base' } }],
  ['solido', { sel: { grupo: 'bucha' } }],
  ['solido', { sel: { grupo: 'eixo' } }],
];

/* Relação read-only para reproduzir o diagnóstico da folga. Ela cita apenas
   a instância e as portas semânticas; não desloca geometria nem guarda pose de
   runtime. O eixo externo é a referência exigida pelo contrato cilíndrico. */
export const RELACAO_EIXO_NA_BUCHA = {
  id: 'eixoNaBucha',
  tipo: 'encaixaCilindrico',
  referencia: 'mancal.superficieDoEixo',
  movel: 'mancal.cavidadeDaBucha',
  folgaRadial: {
    nominal: 0.0002,
    toleranciaFabricacao: { menos: 0, mais: 0 },
  },
  toleranciaNumerica: 0.000001,
  poseCanonica: { referenciaAxial: 'centro', movelAxial: 'centro', giro: 0 },
};

export function montarMancalParaInspecao() {
  return {
    instancias: [{
      id: 'mancal',
      neutro: nucleo(PASSOS, PARAMS, TOPO, MATERIAIS, null, ALIASES),
    }],
    relacao: RELACAO_EIXO_NA_BUCHA,
  };
}

export const meta = {
  /* Os dois perfis de lathe repetem o primeiro ponto no fim, dizendo "a seção
     dá a volta e fecha". O núcleo passou a soldar esse caso, então a costura
     que existia aqui — anéis coincidentes, colados no espaço e separados na
     topologia — deixou de existir. */
  fechada: true,
  nome: '_mancal-de-mesa',
  tipo: 'objeto',
  desc: 'mancal de mesa didático — base com dois furos passantes, bucha oca e eixo concêntrico com folga diametral nominal de 0,4 mm',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
