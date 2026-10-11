/* composicoes.js — as composições da família `roda-pneu`: a roda de disco e as duas raiadas, cada uma com a banda lisa ou com
   relevo.

   Quatro partes em torno do eixo x, com a origem no centro do pneu como no componente `roda` do esboço: o pneu (uma revolução
   da seção da banda), o aro (o barril, um tubo que a banda abraça), o cubo (uma revolução, de onde saem o furo central e os
   furos de fixação, cortados por `subtrair`) e o disco (a chapa da roda de disco, ou os raios das raiadas). O cubo é uma parte
   à parte porque as portas `eixo` e `furos-de-fixacao` saem dele, e a conferência da porta mede o raio sobre os vértices da
   parte de onde ela sai, numa faixa de 10 mm em torno do plano: com os raios ou a chapa na mesma parte, uma roda pequena (ou
   uma raiada de flanges) teria vértices de raio maior dentro da faixa e a porta nunca bateria.

   Tudo chega pronto em metro pelo `derivar`; a composição só substitui valores. A seção do pneu tem sempre dez pontos: o
   friso do lado de dentro (-x) é o trecho entre o quarto e o sexto, e sem friso esses três pontos ficam sobre a banda, de modo
   que uma só composição serve ao pneu liso e ao de friso. O relevo (garras ou sulcos) é a repetição radial de uma ferramenta
   que a banda subtrai, com a contagem no `total` do `arranja`, como os furos de fixação; por isso há duas composições de banda,
   a lisa e a sulcada.

   A roda raiada troca a chapa por raios feitos pela estrutura de barras. A estrutura não tem `origemId` nem é repetida por
   `arranja`, e a composição v1 só substitui valores; por isso há uma composição por número de raios (de 3 a 32, o que cabe
   nos 64 nós da extensão, dois por raio) e por perfil de raio (tubo ou maciço), geradas aqui, e cada nó chega como um
   parâmetro de posição que o `derivar` calcula. A raiada de um plano (`tipo` 1) tem o cubo liso e todos os raios no plano do
   disco; a de duas flanges (`tipo` 2, só com número par de raios) tem o cubo estreito com uma flange em cada ponta, os raios
   saem alternados de uma flange e da outra e chegam ao plano do meio do aro. A estrutura é o PRIMEIRO passo geométrico: os raios
   são então a única malha que existe quando a parte `disco` os nomeia (`sel.tudo`), e nenhuma caixa de região precisa separar
   raios de cubo, de aro ou de pneu. O custo é que cada passo depois dela relê a malha dos raios. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const MINIMO_DE_RAIOS = 3;
export const MAXIMO_DE_RAIOS = 32;
/* Peso do aço em kg/m³, a densidade que a estrutura de barras usa para dar a massa dos raios. */
export const DENSIDADE_DO_ACO = 7850;
/* Lados do tubo redondo do raio. Dezesseis bastam para a seção de um raio fino, e a análise de topologia da aprovação
   compara cada vértice com cada aresta do mesmo corpo, de modo que o custo cresce com o quadrado da malha dos raios, que o
   cruzamento junta num corpo só. */
export const LADOS_DO_RAIO = 16;
export const LADOS_DA_RODA = 96;
export const LADOS_DO_FURO = 24;

/** O id da composição: o cubo (`tipo` 0, 1 ou 2), o perfil e o número de raios das raiadas, e a banda lisa ou sulcada. */
export function idDaRoda({ tipo, raios = 0, maciço = false, sulcada = false }) {
  const banda = sulcada ? 'sulcada' : 'lisa';
  if (tipo === 0) return `roda-pneu.disco-${banda}`;
  return `roda-pneu.${tipo === 1 ? 'raiada' : 'flanges'}-${maciço ? 'macico' : 'tubo'}-${raios}-${banda}`;
}

const p = (nome) => ({ parametro: nome });

/* os parâmetros escalares (metro), por grupo, e os inteiros */
const DA_BANDA = [
  'raioDoAssento', 'raioDoBojo', 'raioDoOmbro', 'raioDoPneu', 'raioDoFriso', 'inicioDaLargura', 'meiaLargura', 'inicioDoAro',
  'meiaLarguraDoAro', 'inicioDaBandaEsquerda', 'fimDoFriso', 'fimDoTalude', 'fimDaBanda', 'raioInternoDoAro',
];
const DO_CUBO = ['raioDoFuroCentral', 'raioDoCubo', 'inicioDoCubo', 'fimDoCubo'];
const DAS_FLANGES = ['raioDaFlange', 'inicioDoMiolo', 'fimDoMiolo'];
const DOS_FUROS = [
  'raioDoCirculoDeFuros', 'raioDoFuro', 'inicioDaFerramenta', 'fimDaFerramenta', 'passoAngular', 'inicioDaPortaDoPneu',
  'inicioDaPortaDoEixo', 'profundidadeDosFuros', 'diametroDoFuro', 'raioExternoDoEixo',
];
const DA_CHAPA = ['raioInternoDaChapa', 'raioDaChapa', 'inicioDaChapa', 'fimDaChapa'];
const DO_RELEVO = ['larguraDaFerramentaDoSulco', 'alturaDaFerramentaDoSulco', 'larguraDoPrismaDoSulco', 'baseDaFerramentaDoSulco', 'passoDoSulco'];

/** Os escalares (metro) que o `derivar` entrega a cada composição, por forma de cubo e por banda. Exportado para o `derivar`. */
export function escalaresDaRoda({ tipo, sulcada }) {
  return [
    ...DA_BANDA, ...DO_CUBO, ...(tipo === 2 ? DAS_FLANGES : []), ...DOS_FUROS, ...(tipo === 0 ? DA_CHAPA : []),
    ...(tipo > 0 ? ['diametroDoRaio'] : []), ...(sulcada ? DO_RELEVO : []),
  ];
}

const PNEU = { op: 'lathe', id: 1 };
const ARO = { op: 'lathe', id: 2 };
const BASE_DO_CUBO = { op: 'lathe', id: 3 };
const FERRAMENTA = { op: 'lathe', id: 4 };
const FUROS = { op: 'arranja', id: 5, de: FERRAMENTA };
const CUBO = { op: 'subtrair', id: 6 };
const BASE_DO_PNEU = { op: 'lathe', id: 7 };
const SULCO = { op: 'cubo', id: 8 };
const SULCOS = { op: 'arranja', id: 9, de: SULCO };
const PNEU_SULCADO = { op: 'subtrair', id: 10 };
const CHAPA = { op: 'lathe', id: 11 };

const parteDe = (id, nome, origem) => ({ id: `parte-${id}`, operacao: 'parte', argumentos: { nome, sel: { origem } } });
const materialDe = (id, usa, origem) => ({ id: `material-${id}`, operacao: 'material', argumentos: { usa, sel: { origem } } });
const solidoDe = (id, origem) => ({ id: `solido-${id}`, operacao: 'solido', argumentos: { sel: { origem } } });

/* as três portas, as mesmas em todas as variantes: o anel do assento no pneu, o anel do furo central e o círculo de furos no cubo */
function portasDaRoda(pneu) {
  return [
    {
      id: 'porta-assento', operacao: 'publicarPorta',
      argumentos: {
        id: 'assento-do-pneu', de: pneu,
        interface: {
          forma: 'anel', papel: 'ocupa', eixo: [-1, 0, 0], centro: [p('inicioDaLargura'), 0, 0],
          raioInterno: p('raioDoAssento'), raioExterno: p('raioDoFriso'), inicio: p('inicioDaPortaDoPneu'), fim: 0,
        },
      },
    },
    {
      id: 'porta-eixo', operacao: 'publicarPorta',
      argumentos: {
        id: 'eixo', de: CUBO,
        interface: {
          forma: 'anel', papel: 'recebe', eixo: [-1, 0, 0], centro: [p('inicioDoCubo'), 0, 0],
          raioInterno: p('raioDoFuroCentral'), raioExterno: p('raioExternoDoEixo'), inicio: p('inicioDaPortaDoEixo'), fim: 0,
        },
      },
    },
    {
      id: 'porta-furos', operacao: 'publicarPorta',
      argumentos: {
        id: 'furos-de-fixacao', de: CUBO,
        interface: {
          forma: 'padraoFuros', papel: 'recebe',
          plano: { ponto: [p('inicioDoCubo'), 0, 0], normal: [-1, 0, 0] },
          diametro: p('diametroDoFuro'),
          padrao: { tipo: 'circular', centro: [p('inicioDoCubo'), 0, 0], raio: p('raioDoCirculoDeFuros'), quantidade: p('furos'), anguloInicial: 270 },
          profundidade: p('profundidadeDosFuros'),
        },
      },
    },
  ];
}

/* a seção do pneu, dez pontos [raio, x]: o assento, o bojo e o ombro de um lado, o friso (ou três pontos sobre a banda), o
   ombro chanfrado do outro lado e o assento de volta */
const PERFIL_DO_PNEU = [
  [p('raioDoAssento'), p('inicioDoAro')], [p('raioDoBojo'), p('inicioDaLargura')], [p('raioDoOmbro'), p('inicioDaLargura')],
  [p('raioDoFriso'), p('inicioDaBandaEsquerda')], [p('raioDoFriso'), p('fimDoFriso')], [p('raioDoPneu'), p('fimDoTalude')],
  [p('raioDoPneu'), p('fimDaBanda')], [p('raioDoOmbro'), p('meiaLargura')], [p('raioDoBojo'), p('meiaLargura')],
  [p('raioDoAssento'), p('meiaLarguraDoAro')], [p('raioDoAssento'), p('inicioDoAro')],
];

function nosDoPneu(sulcada) {
  const revolucao = (origemId) => ({
    id: sulcada ? 'revolucao-pneu-base' : 'revolucao-pneu', operacao: 'lathe',
    argumentos: { origemId, eixo: 'x', lados: p('ladosDaRoda'), perfil: PERFIL_DO_PNEU },
  });
  if (!sulcada) return [revolucao(1)];
  /* o relevo: uma ferramenta em +y (o prisma da garra ou do sulco, atravessando a banda de lado a lado) repetida em volta
     do eixo, subtraída da banda */
  return [
    revolucao(7),
    {
      id: 'prisma-do-sulco', operacao: 'cubo',
      argumentos: { origemId: 8, larg: p('larguraDaFerramentaDoSulco'), alt: p('alturaDaFerramentaDoSulco'), prof: p('larguraDoPrismaDoSulco'), em: [0, p('baseDaFerramentaDoSulco'), 0] },
    },
    {
      id: 'repeticao-dos-sulcos', operacao: 'arranja',
      argumentos: { modo: 'radial', total: p('sulcos'), eixo: 'x', graus: p('passoDoSulco'), pivo: [0, 0, 0], origemId: 9, derivaDe: SULCO, sel: { origem: SULCO } },
    },
    { id: 'corte-dos-sulcos', operacao: 'subtrair', argumentos: { origemId: 10, solidos: [{ origem: BASE_DO_PNEU }, { origem: SULCO }, { origem: SULCOS }] } },
  ];
}

const NO_DO_ARO = {
  id: 'revolucao-aro', operacao: 'lathe',
  argumentos: {
    origemId: 2, eixo: 'x', lados: p('ladosDaRoda'),
    perfil: [
      [p('raioInternoDoAro'), p('inicioDoAro')], [p('raioDoAssento'), p('inicioDoAro')], [p('raioDoAssento'), p('meiaLarguraDoAro')],
      [p('raioInternoDoAro'), p('meiaLarguraDoAro')], [p('raioInternoDoAro'), p('inicioDoAro')],
    ],
  },
};

/* o cubo: um anel liso (rodas de disco e raiada de um plano) ou um tubo com uma flange em cada ponta (raiada de flanges) */
function nosDoCubo(tipo) {
  const perfil = tipo === 2
    ? [
      [p('raioDoFuroCentral'), p('inicioDoCubo')], [p('raioDaFlange'), p('inicioDoCubo')], [p('raioDaFlange'), p('inicioDoMiolo')],
      [p('raioDoCubo'), p('inicioDoMiolo')], [p('raioDoCubo'), p('fimDoMiolo')], [p('raioDaFlange'), p('fimDoMiolo')],
      [p('raioDaFlange'), p('fimDoCubo')], [p('raioDoFuroCentral'), p('fimDoCubo')], [p('raioDoFuroCentral'), p('inicioDoCubo')],
    ]
    : [
      [p('raioDoFuroCentral'), p('inicioDoCubo')], [p('raioDoCubo'), p('inicioDoCubo')], [p('raioDoCubo'), p('fimDoCubo')],
      [p('raioDoFuroCentral'), p('fimDoCubo')], [p('raioDoFuroCentral'), p('inicioDoCubo')],
    ];
  return [
    { id: 'revolucao-cubo', operacao: 'lathe', argumentos: { origemId: 3, eixo: 'x', lados: p('ladosDaRoda'), perfil } },
    {
      id: 'revolucao-furo', operacao: 'lathe',
      argumentos: {
        origemId: 4, eixo: 'x', lados: p('ladosDoFuro'), em: [0, p('raioDoCirculoDeFuros'), 0],
        perfil: [[0, p('inicioDaFerramenta')], [p('raioDoFuro'), p('inicioDaFerramenta')], [p('raioDoFuro'), p('fimDaFerramenta')], [0, p('fimDaFerramenta')]],
      },
    },
    {
      id: 'repeticao-furos', operacao: 'arranja',
      argumentos: { modo: 'radial', total: p('furos'), eixo: 'x', graus: p('passoAngular'), pivo: [0, 0, 0], origemId: 5, derivaDe: FERRAMENTA, sel: { origem: FERRAMENTA } },
    },
    { id: 'corte-dos-furos', operacao: 'subtrair', argumentos: { origemId: 6, solidos: [{ origem: BASE_DO_CUBO }, { origem: FERRAMENTA }, { origem: FUROS }] } },
  ];
}

/* a chapa da roda de disco: um anel entre o meio da parede do cubo e o meio da parede do aro, centrado no desvio */
const NO_DA_CHAPA = {
  id: 'revolucao-chapa', operacao: 'lathe',
  argumentos: {
    origemId: 11, eixo: 'x', lados: p('ladosDaRoda'),
    perfil: [
      [p('raioInternoDaChapa'), p('inicioDaChapa')], [p('raioDaChapa'), p('inicioDaChapa')], [p('raioDaChapa'), p('fimDaChapa')],
      [p('raioInternoDaChapa'), p('fimDaChapa')], [p('raioInternoDaChapa'), p('inicioDaChapa')],
    ],
  },
};

export const nomeDoNoDoCubo = (k) => `noDoCubo${k}`;
export const nomeDoNoDoAro = (k) => `noDoAro${k}`;

function parametrosDa({ tipo, raios, maciço, sulcada }) {
  const parametros = Object.fromEntries(escalaresDaRoda({ tipo, sulcada }).map((nome) => [nome, { tipo: 'numero' }]));
  parametros.furos = { tipo: 'inteiro' };
  parametros.ladosDaRoda = { tipo: 'inteiro', padrao: LADOS_DA_RODA };
  parametros.ladosDoFuro = { tipo: 'inteiro', padrao: LADOS_DO_FURO };
  parametros.materialDoPneu = { tipo: 'texto', padrao: 'borracha' };
  parametros.materialDoMetal = { tipo: 'texto', padrao: 'aco' };
  if (sulcada) parametros.sulcos = { tipo: 'inteiro' };
  if (tipo > 0) {
    parametros.ladosDoRaio = { tipo: 'inteiro', padrao: LADOS_DO_RAIO };
    if (!maciço) parametros.paredeDoRaio = { tipo: 'numero' };
    for (let k = 0; k < raios; k++) {
      parametros[nomeDoNoDoCubo(k)] = { tipo: 'vetor3' };
      parametros[nomeDoNoDoAro(k)] = { tipo: 'vetor3' };
    }
  }
  return parametros;
}

/* os raios: o primeiro passo geométrico, nomeados `disco` pela seleção da peça inteira, que neste momento só tem eles */
function nosDosRaios({ raios, maciço }) {
  const indices = Array.from({ length: raios }, (_, k) => k);
  const perfil = { tipo: 'tubo-redondo', diametro: p('diametroDoRaio'), lados: p('ladosDoRaio') };
  if (!maciço) perfil.parede = p('paredeDoRaio');
  const todos = { tudo: true };
  return [
    {
      id: 'raios', operacao: 'estruturaDeBarras',
      argumentos: {
        unidade: 'm', densidade: DENSIDADE_DO_ACO, perfil,
        nos: [
          ...indices.map((k) => ({ nome: `cubo-${k}`, posicao: p(nomeDoNoDoCubo(k)) })),
          ...indices.map((k) => ({ nome: `aro-${k}`, posicao: p(nomeDoNoDoAro(k)) })),
        ],
        barras: indices.map((k) => ({ nome: `raio-${k}`, de: `cubo-${k}`, para: `aro-${k}` })),
      },
    },
    { id: 'parte-raios', operacao: 'parte', argumentos: { nome: 'disco', sel: todos } },
    { id: 'material-raios', operacao: 'material', argumentos: { usa: p('materialDoMetal'), sel: todos } },
    { id: 'solido-raios', operacao: 'solido', argumentos: { sel: todos } },
  ];
}

function comporRoda({ tipo, raios = 0, maciço = false, sulcada = false }) {
  const pneu = sulcada ? PNEU_SULCADO : PNEU;
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: idDaRoda({ tipo, raios, maciço, sulcada }),
    versao: '2.0.0',
    parametros: parametrosDa({ tipo, raios, maciço, sulcada }),
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] },
    nos: [
      ...(tipo > 0 ? nosDosRaios({ raios, maciço }) : []),
      ...nosDoCubo(tipo),
      ...nosDoPneu(sulcada),
      NO_DO_ARO,
      ...(tipo === 0 ? [NO_DA_CHAPA] : []),
      parteDe('pneu', 'pneu', pneu), materialDe('pneu', p('materialDoPneu'), pneu), solidoDe('pneu', pneu),
      parteDe('aro', 'aro', ARO), materialDe('aro', p('materialDoMetal'), ARO), solidoDe('aro', ARO),
      parteDe('cubo', 'cubo', CUBO), materialDe('cubo', p('materialDoMetal'), CUBO), solidoDe('cubo', CUBO),
      ...(tipo === 0 ? [parteDe('chapa', 'disco', CHAPA), materialDe('chapa', p('materialDoMetal'), CHAPA), solidoDe('chapa', CHAPA)] : []),
      ...portasDaRoda(pneu),
    ],
  });
}

const RAIOS = (de, ate, passo = 1) => Array.from({ length: Math.floor((ate - de) / passo) + 1 }, (_, k) => de + k * passo);
const COMBINACOES = [
  ...[false, true].map((sulcada) => ({ tipo: 0, sulcada })),
  ...[false, true].flatMap((sulcada) => [false, true].flatMap((maciço) => [
    ...RAIOS(MINIMO_DE_RAIOS, MAXIMO_DE_RAIOS).map((raios) => ({ tipo: 1, raios, maciço, sulcada })),
    ...RAIOS(MINIMO_DE_RAIOS + 1, MAXIMO_DE_RAIOS, 2).map((raios) => ({ tipo: 2, raios, maciço, sulcada })),
  ])),
];

export const COMPOSICOES = Object.freeze(COMBINACOES.map(comporRoda));
