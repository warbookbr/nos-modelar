/* RODA DIANTEIRA DA MECANIFICA — pneu, aro e tampa central paramétricos,
   pensados para compor com `freio-disco`, nunca para duplicar seu `cubo`.

   Convenção compartilhada com o freio:
   - X é o eixo da roda; +X aponta para FORA do carro;
   - Y e Z formam o plano radial; [0, 0, 0] é o centro do cubo;
   - o pneu envolve o conjunto, o aro deixa o centro aberto e a tampa central
     ocupa somente a face externa. Assim a bancada pode isolar cada parte e a
     apresentação pode tornar a roda fantasma sem apagar o freio.

   A peça é deliberadamente uma roda de leitura, não uma cópia de catálogo:
   primeiro prova a composição entre ativos independentes. O cubo, os
   prisioneiros e a manga de eixo continuam pertencendo aos seus próprios
   sistemas, com uma única fonte de verdade para cada identidade física.

   Bancada:
     npm run bancada -- roda-dianteira --vistas=direita,frontal,superior --projecao=ortografica --estrito
     npm run bancada -- roda-dianteira --selecionadas=aro,tampaCentral --modo=contexto --focar
     npm run descrever -- roda-dianteira
*/
import { executar, colisaoDe } from '../motor/oficina.js';

/* Medidas independentes, em metros. O pneu de raio 0,340 deixa uma margem
   clara em volta do disco de raio 0,140 e do aro de raio 0,245. */
const MEDIDAS = {
  pneuRaioInterno: 0.220,
  pneuRaioOmbro: 0.305,
  pneuRaioExterno: 0.340,
  pneuMeiaLargura: 0.110,
  pneuCoroaMeiaLargura: 0.075,
  /* Ciclo 5 (Curva e filete v1): raio de concordância do OMBRO do pneu — a
     passagem do flanco (lateral) pra banda de rodagem era uma quina de 135°
     (vinco); a alça de curva do perfil (o 3º elemento do ponto do `lathe`)
     arredonda os dois cantos simétricos (o ponto 1 e o ponto 5 do perfil
     abaixo) por um arco tangente aos dois segmentos adjacentes. */
  pneuOmbroConcordancia: 0.020,

  aroRaioInterno: 0.080,
  aroRaioBase: 0.215,
  aroRaioExterno: 0.245,
  aroMeiaLargura: 0.095,
  aroOmbroMeiaLargura: 0.073,

  tampaRaio: 0.078,
  tampaEspessura: 0.020,
  tampaFaceExternaX: 0.095,
};

/* Derivadas declaradas: a tampa fica sempre encostada na face externa do aro
   em vez de guardar uma segunda medida de posição. */
const DERIVADAS = {
  pneuMeiaLarguraNeg: '= -pneuMeiaLargura',
  pneuCoroaMeiaLarguraNeg: '= -pneuCoroaMeiaLargura',
  aroMeiaLarguraNeg: '= -aroMeiaLargura',
  aroOmbroMeiaLarguraNeg: '= -aroOmbroMeiaLargura',
  tampaX: '= aroMeiaLargura',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

export const TOPO = {
  ladosPneu: 40,
  ladosAro: 32,
  ladosTampa: 20,
  /* discretização da concordância do ombro (Ciclo 5) — TOPO porque muda a
     CONTAGEM de vértices/faces do pneu (cada corner arredondado vira
     segmentosCurva+1 pontos em vez de 1). segmentosCurva:3 troca os DOIS
     cantos do ombro por 4 pontos cada (em vez de 1), custo medido no relato. */
  pneuOmbroSegmentos: 3,
};

export const MATERIAIS = {
  borracha: { cor: '#16191b', aspereza: 0.96 },
  ligaAro: { cor: '#9ba5ab', aspereza: 0.28, metalness: 0.76 },
  tampaMetal: { cor: '#c8d1d3', aspereza: 0.18, metalness: 0.88 },
};

/* IDs de ORIGEM são identidades estruturais escolhidas pelo autor. Eles não
   dependem da posição do passo, nem chegam ao conteúdo apresentado ao cliente. */
const PNEU = 401;
const ARO = 402;
const TAMPA_CENTRAL = 403;

const latheInteiro = (id) => ({ origem: { op: 'lathe', id } });
const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });

export const ALIASES = [
  ['pneuInteiro', latheInteiro(PNEU)],
  ['aroInteiro', latheInteiro(ARO)],
  ['tampaCentralInteira', cilindroInteiro(TAMPA_CENTRAL)],
  /* Porta preparada para a composição: é a abertura axial que continua livre
     para o cubo e para o disco. O núcleo ainda não publica uma porta de volume;
     este alias é a superfície interna do aro, estável para seleções visuais. */
  ['aroAbertura', { origem: { op: 'lathe', id: ARO, faixa: 5 } }],
  /* as faixas curvas do aro: os dois ombros cônicos, a banda cilíndrica e o
     furo interno. Ficam de fora as faixas 0 e 4, os anéis planos das laterais. */
  ['aroBarrilInteiro', { unir: [1, 2, 3, 5].map((faixa) => (
    { origem: { op: 'lathe', id: ARO, faixa } }
  )) }],
];

const PIVO_EIXO = [0, 0, 0];
const paraEixoX = (op, id) => ['rotaciona', {
  eixo: 'z', graus: -90, pivo: PIVO_EIXO, sel: { origem: { op, id } },
}];

export const PASSOS = [
  /* Perfil fechado no plano raio×eixo. O último anel repete o primeiro para
     desenhar a parede interna do pneu; a costura fica dentro da cavidade, onde
     não interfere na leitura externa nem na inspeção por parte. */
  ['lathe', { origemId: PNEU, lados: 'ladosPneu', segmentosCurva: 'pneuOmbroSegmentos', perfil: [
    ['pneuRaioInterno', 'pneuMeiaLarguraNeg'],
    /* os dois pontos do OMBRO (flanco -> banda de rodagem) ganham a alça de
       curva (Ciclo 5): sem ela, a quina de 135° aqui é o vinco que o gate
       apontou. */
    ['pneuRaioOmbro', 'pneuMeiaLarguraNeg', 'pneuOmbroConcordancia'],
    ['pneuRaioExterno', 'pneuCoroaMeiaLarguraNeg'],
    ['pneuRaioExterno', 0],
    ['pneuRaioExterno', 'pneuCoroaMeiaLargura'],
    ['pneuRaioOmbro', 'pneuMeiaLargura', 'pneuOmbroConcordancia'],
    ['pneuRaioInterno', 'pneuMeiaLargura'],
    ['pneuRaioInterno', 'pneuMeiaLarguraNeg'],
  ] }],
  paraEixoX('lathe', PNEU),
  ['parte', { nome: 'pneu', sel: { alias: 'pneuInteiro' } }],

  /* O aro é outro perfil oco: a abertura central é intencional, pois o cubo
     vem do freio e não pode ser copiado aqui. */
  ['lathe', { origemId: ARO, lados: 'ladosAro', perfil: [
    ['aroRaioInterno', 'aroMeiaLarguraNeg'],
    ['aroRaioBase', 'aroMeiaLarguraNeg'],
    ['aroRaioExterno', 'aroOmbroMeiaLarguraNeg'],
    ['aroRaioExterno', 'aroOmbroMeiaLargura'],
    ['aroRaioBase', 'aroMeiaLargura'],
    ['aroRaioInterno', 'aroMeiaLargura'],
    ['aroRaioInterno', 'aroMeiaLarguraNeg'],
  ] }],
  paraEixoX('lathe', ARO),
  ['parte', { nome: 'aro', sel: { alias: 'aroInteiro' } }],

  /* A tampa nasce no eixo Y e é girada para X, como o disco. Sua base começa
     exatamente na face externa declarada do aro. */
  ['cilindro', { origemId: TAMPA_CENTRAL, raio: 'tampaRaio', altura: 'tampaEspessura', lados: 'ladosTampa' }],
  paraEixoX('cilindro', TAMPA_CENTRAL),
  ['transladar', { d: ['tampaX', 0, 0], sel: { alias: 'tampaCentralInteira' } }],
  ['parte', { nome: 'tampaCentral', sel: { alias: 'tampaCentralInteira' } }],

  ['liso', { sel: { alias: 'pneuInteiro' } }],
  /* Só as faixas REVOLVIDAS do aro. As faixas 0 e 4 do perfil são anéis planos
     (mesmo X, raios diferentes): elas são chatas de verdade, e suavizar a normal
     nelas inclina os cantos contra a faixa cônica vizinha, o que desenha um
     leque de raios saindo do centro. Isso ficou invisível enquanto o adaptador
     ignorava `liso`; quando ele passou a ler a marca, o defeito apareceu numa
     peça que a aplicação põe em cena. Superfície plana não pede suavização. */
  ['liso', { sel: { alias: 'aroBarrilInteiro' } }],
  ['liso', { sel: { origem: { op: 'cilindro', id: TAMPA_CENTRAL } } }],

  /* A abertura não é uma seleção visual genérica: ela oferece uma cavidade
     cilíndrica declarada para o piloto do cubo. As medidas continuam locais à
     roda; a montagem informa a escala e a pose já existente, sem mover nada. */
  ['publicarPorta', {
    nome: 'cavidadeDoCubo',
    de: { op: 'lathe', id: ARO, faixa: 5 },
    interface: {
      forma: 'cilindro', papel: 'interna', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0],
      raio: 'aroRaioInterno', inicio: 'aroMeiaLarguraNeg', fim: 'aroMeiaLargura',
    },
  }],
  /* O pneu e o aro também declaram a faixa de assentamento entre si. Não é
     colisão de malha nem borracha simulada: são dois envelopes locais que a
     relação `assentaAnular` mede sem ocultar o alerta amplo entre as partes. */
  ['publicarPorta', {
    nome: 'assentoDoAroNoPneu',
    de: { op: 'lathe', id: PNEU, faixa: 0 },
    interface: {
      forma: 'anel', papel: 'recebe', parte: 'pneu', eixo: [1, 0, 0], centro: [0, 0, 0],
      raioInterno: 'pneuRaioInterno', raioExterno: 'aroRaioExterno', inicio: 'pneuMeiaLarguraNeg', fim: 'pneuMeiaLargura',
    },
  }],
  ['publicarPorta', {
    nome: 'assentoDoPneuNoAro',
    de: { op: 'lathe', id: ARO, faixa: 2 },
    interface: {
      forma: 'anel', papel: 'ocupa', parte: 'aro', eixo: [1, 0, 0], centro: [0, 0, 0],
      raioInterno: 'aroRaioBase', raioExterno: 'aroRaioExterno', inicio: 'aroOmbroMeiaLarguraNeg', fim: 'aroOmbroMeiaLargura',
    },
  }],

  ['material', { sel: { grupo: 'pneu' }, usa: 'borracha' }],
  ['material', { sel: { grupo: 'aro' }, usa: 'ligaAro' }],
  ['material', { sel: { grupo: 'tampaCentral' }, usa: 'tampaMetal' }],

  ['solido', { sel: { grupo: 'pneu' } }],
  ['solido', { sel: { grupo: 'aro' } }],
];

export const meta = {
  nome: 'roda-dianteira',
  tipo: 'objeto',
  desc: 'roda dianteira paramétrica — pneu, aro oco e tampa central; compõe com freio-disco sem duplicar o cubo',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
