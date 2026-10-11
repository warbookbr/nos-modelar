/* composicoes.js — as composições da família `roda-pneu`: a variante de disco e a variante raiada.

   Três peças em torno do eixo x, com a origem no centro do pneu como no componente `roda` do esboço: o pneu (uma
   revolução de seção abaulada, com os ombros chanfrados), o aro (o barril, um tubo de parede fina que o talão do pneu
   abraça) e o disco (a revolução do cubo e da chapa, de onde saem o furo central e os furos de fixação, cortados por
   `subtrair`). Tudo chega pronto em metro pelo `derivar`; a composição só substitui valores, e por isso cada posição em
   x vem em duas, a negativa e a positiva.

   O número de furos de fixação é o `total` do `arranja` radial, de modo que uma só composição serve a qualquer
   contagem; a porta `furos-de-fixacao` descreve o mesmo círculo pelo gerador circular da interface, com o primeiro furo
   em +y (270 graus no referencial que a interface monta para a normal -x, onde 0 grau aponta para -z e 90 graus para -y). As três portas são `assento-do-pneu` (anel
   do pneu na face +x), `eixo` (anel do furo central na face de montagem do cubo, a que encosta no cubo do veículo) e
   `furos-de-fixacao` (o círculo de furos nessa mesma face). A face de montagem é a de dentro (-x) e o desvio positivo
   leva o disco para fora (+x), como o ET das rodas reais.

   A variante raiada troca a chapa do disco por raios feitos pela estrutura de barras. O pneu, o aro, as três portas e o
   cubo com o furo central e os furos de fixação são os mesmos; o cubo vira um anel de espessura inteira (da face de
   dentro à face de fora) e cada raio é uma barra de tubo redondo, ou de barra redonda maciça, que vai de um nó no cubo
   a um nó na parede interna do aro, no plano do meio do cubo. A estrutura não tem `origemId` nem é repetida por
   `arranja`, e a composição v1 só substitui valores; por isso há uma composição por número de raios (de 3 a 32, o que
   cabe nos 64 nós da extensão, dois por raio) e por perfil (tubo ou maciço), geradas aqui, e cada nó chega como um
   parâmetro de posição que o `derivar` calcula. Os raios e o cubo formam a parte `disco`, como a chapa e o cubo da
   variante de disco, e o crítico e a conferência com o esboço leem as mesmas três partes: pneu, aro e disco. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const ID_RODA_DE_DISCO = 'roda-pneu.disco';
export const MINIMO_DE_RAIOS = 3;
export const MAXIMO_DE_RAIOS = 32;
/* Peso do aço em kg/m³, a densidade que a estrutura de barras usa para dar a massa dos raios. */
export const DENSIDADE_DO_ACO = 7850;
/* Lados do tubo redondo do raio. Dezesseis bastam para a seção de um raio fino, e a análise de topologia da aprovação
   compara cada vértice com cada aresta do mesmo corpo, de modo que o custo cresce com o quadrado da malha dos raios, que o
   cruzamento junta num corpo só. */
export const LADOS_DO_RAIO = 16;
export const idDaRodaRaiada = (raios, maciço) => `roda-pneu.raiada-${maciço ? 'macico' : 'tubo'}-${raios}`;

const p = (nome) => ({ parametro: nome });
const numeros = [
  'raioDoPneu', 'raioDoOmbro', 'raioDoBojo', 'raioDoAssento', 'inicioDaLargura', 'meiaLargura', 'inicioDaBanda',
  'meiaLarguraDaBanda', 'inicioDoAro', 'meiaLarguraDoAro', 'raioInternoDoAro', 'raioDoFuroCentral', 'raioDoCubo',
  'raioDoCirculoDeFuros', 'raioDoFuro', 'inicioDoCubo', 'inicioDaChapa', 'fimDaChapa', 'inicioDaFerramenta',
  'fimDaFerramenta', 'passoAngular', 'inicioDaPortaDoPneu', 'inicioDaPortaDoEixo', 'profundidadeDosFuros', 'diametroDoFuro',
  'raioDaChapa',
];
const PARAMETROS = Object.fromEntries(numeros.map((nome) => [nome, { tipo: 'numero' }]));
PARAMETROS.furos = { tipo: 'inteiro' };
PARAMETROS.ladosDaRoda = { tipo: 'inteiro', padrao: 96 };
PARAMETROS.ladosDoFuro = { tipo: 'inteiro', padrao: 24 };
PARAMETROS.materialDoPneu = { tipo: 'texto', padrao: 'borracha' };
PARAMETROS.materialDoMetal = { tipo: 'texto', padrao: 'aco' };

const PNEU = { op: 'lathe', id: 1 };
const ARO = { op: 'lathe', id: 2 };
const BASE_DO_DISCO = { op: 'lathe', id: 3 };
const FERRAMENTA = { op: 'lathe', id: 4 };
const FUROS = { op: 'arranja', id: 5, de: FERRAMENTA };
const DISCO = { op: 'subtrair', id: 6 };

const parteDe = (id, nome, origem) => ({ id: `parte-${id}`, operacao: 'parte', argumentos: { nome, sel: { origem } } });
const materialDe = (id, usa, origem) => ({ id: `material-${id}`, operacao: 'material', argumentos: { usa, sel: { origem } } });
const solidoDe = (id, origem) => ({ id: `solido-${id}`, operacao: 'solido', argumentos: { sel: { origem } } });

/* as três portas, as mesmas nas duas variantes: o anel do assento no pneu, o anel do furo central e o círculo de furos no cubo */
const PORTAS_DA_RODA = [
  {
    id: 'porta-assento', operacao: 'publicarPorta',
    argumentos: {
      id: 'assento-do-pneu', de: PNEU,
      interface: {
        forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [p('meiaLargura'), 0, 0],
        raioInterno: p('raioDoAssento'), raioExterno: p('raioDoPneu'), inicio: p('inicioDaPortaDoPneu'), fim: 0,
      },
    },
  },
  {
    id: 'porta-eixo', operacao: 'publicarPorta',
    argumentos: {
      id: 'eixo', de: DISCO,
      interface: {
        forma: 'anel', papel: 'recebe', eixo: [-1, 0, 0], centro: [p('inicioDoCubo'), 0, 0],
        raioInterno: p('raioDoFuroCentral'), raioExterno: p('raioDoCubo'), inicio: p('inicioDaPortaDoEixo'), fim: 0,
      },
    },
  },
  {
    id: 'porta-furos', operacao: 'publicarPorta',
    argumentos: {
      id: 'furos-de-fixacao', de: DISCO,
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

const RODA_DE_DISCO = Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_RODA_DE_DISCO,
    versao: '1.0.0',
    parametros: PARAMETROS,
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] },
    nos: [
      /* o pneu: assento, bojo no flanco, ombro chanfrado e banda; o perfil é [raio, posição em x] */
      {
        id: 'revolucao-pneu', operacao: 'lathe',
        argumentos: {
          origemId: 1, eixo: 'x', lados: p('ladosDaRoda'),
          perfil: [
            [p('raioDoAssento'), p('inicioDoAro')], [p('raioDoBojo'), p('inicioDaLargura')], [p('raioDoOmbro'), p('inicioDaLargura')],
            [p('raioDoPneu'), p('inicioDaBanda')], [p('raioDoPneu'), p('meiaLarguraDaBanda')], [p('raioDoOmbro'), p('meiaLargura')],
            [p('raioDoBojo'), p('meiaLargura')], [p('raioDoAssento'), p('meiaLarguraDoAro')], [p('raioDoAssento'), p('inicioDoAro')],
          ],
        },
      },
      /* o aro: o barril, de parede fina, na largura do talão */
      {
        id: 'revolucao-aro', operacao: 'lathe',
        argumentos: {
          origemId: 2, eixo: 'x', lados: p('ladosDaRoda'),
          perfil: [
            [p('raioInternoDoAro'), p('inicioDoAro')], [p('raioDoAssento'), p('inicioDoAro')], [p('raioDoAssento'), p('meiaLarguraDoAro')],
            [p('raioInternoDoAro'), p('meiaLarguraDoAro')], [p('raioInternoDoAro'), p('inicioDoAro')],
          ],
        },
      },
      /* o disco antes dos furos: o cubo (mais espesso, saliente para dentro) e a chapa até o barril, com o furo central */
      {
        id: 'revolucao-disco', operacao: 'lathe',
        argumentos: {
          origemId: 3, eixo: 'x', lados: p('ladosDaRoda'),
          perfil: [
            [p('raioDoFuroCentral'), p('inicioDoCubo')], [p('raioDoCubo'), p('inicioDoCubo')], [p('raioDoCubo'), p('inicioDaChapa')],
            [p('raioDaChapa'), p('inicioDaChapa')], [p('raioDaChapa'), p('fimDaChapa')], [p('raioDoFuroCentral'), p('fimDaChapa')],
            [p('raioDoFuroCentral'), p('inicioDoCubo')],
          ],
        },
      },
      /* a ferramenta de um furo de fixação, em +y no círculo de furos, e a repetição radial */
      {
        id: 'revolucao-furo', operacao: 'lathe',
        argumentos: {
          origemId: 4, eixo: 'x', lados: p('ladosDoFuro'), em: [0, p('raioDoCirculoDeFuros'), 0],
          perfil: [
            [0, p('inicioDaFerramenta')], [p('raioDoFuro'), p('inicioDaFerramenta')], [p('raioDoFuro'), p('fimDaFerramenta')],
            [0, p('fimDaFerramenta')],
          ],
        },
      },
      {
        id: 'repeticao-furos', operacao: 'arranja',
        argumentos: {
          modo: 'radial', total: p('furos'), eixo: 'x', graus: p('passoAngular'), pivo: [0, 0, 0],
          origemId: 5, derivaDe: FERRAMENTA, sel: { origem: FERRAMENTA },
        },
      },
      {
        id: 'corte-dos-furos', operacao: 'subtrair',
        argumentos: { origemId: 6, solidos: [{ origem: BASE_DO_DISCO }, { origem: FERRAMENTA }, { origem: FUROS }] },
      },
      parteDe('pneu', 'pneu', PNEU), materialDe('pneu', p('materialDoPneu'), PNEU), solidoDe('pneu', PNEU),
      parteDe('aro', 'aro', ARO), materialDe('aro', p('materialDoMetal'), ARO), solidoDe('aro', ARO),
      parteDe('disco', 'disco', DISCO), materialDe('disco', p('materialDoMetal'), DISCO), solidoDe('disco', DISCO),
      ...PORTAS_DA_RODA,
    ],
  });

/* ---------- a variante raiada ---------- */

/* Os parâmetros da composição raiada que vêm do `derivar` em valor escalar: os mesmos nomes da variante de disco, menos os
   da chapa, mais o diâmetro e a parede do raio. */
const ESCALARES_DA_RAIADA = [
  'raioDoPneu', 'raioDoOmbro', 'raioDoBojo', 'raioDoAssento', 'inicioDaLargura', 'meiaLargura', 'inicioDaBanda',
  'meiaLarguraDaBanda', 'inicioDoAro', 'meiaLarguraDoAro', 'raioInternoDoAro', 'raioDoFuroCentral', 'raioDoCubo',
  'raioDoCirculoDeFuros', 'raioDoFuro', 'inicioDoCubo', 'fimDaChapa', 'inicioDaFerramenta', 'fimDaFerramenta', 'passoAngular',
  'inicioDaPortaDoPneu', 'inicioDaPortaDoEixo', 'profundidadeDosFuros', 'diametroDoFuro', 'diametroDoRaio',
];
export const ARGUMENTOS_ESCALARES_DA_RAIADA = Object.freeze([...ESCALARES_DA_RAIADA]);
export const nomeDoNoDoCubo = (k) => `noDoCubo${k}`;
export const nomeDoNoDoAro = (k) => `noDoAro${k}`;

function comporRodaRaiada(raios, maciço) {
  const parametrosDaRaiada = Object.fromEntries(ESCALARES_DA_RAIADA.map((nome) => [nome, { tipo: 'numero' }]));
  if (!maciço) parametrosDaRaiada.paredeDoRaio = { tipo: 'numero' };
  parametrosDaRaiada.furos = { tipo: 'inteiro' };
  parametrosDaRaiada.regiaoDosRaiosMinima = { tipo: 'vetor3' };
  parametrosDaRaiada.regiaoDosRaiosMaxima = { tipo: 'vetor3' };
  parametrosDaRaiada.ladosDaRoda = { tipo: 'inteiro', padrao: 96 };
  parametrosDaRaiada.ladosDoFuro = { tipo: 'inteiro', padrao: 24 };
  parametrosDaRaiada.ladosDoRaio = { tipo: 'inteiro', padrao: LADOS_DO_RAIO };
  parametrosDaRaiada.materialDoPneu = { tipo: 'texto', padrao: 'borracha' };
  parametrosDaRaiada.materialDoMetal = { tipo: 'texto', padrao: 'aco' };
  const indices = Array.from({ length: raios }, (_, k) => k);
  for (const k of indices) {
    parametrosDaRaiada[nomeDoNoDoCubo(k)] = { tipo: 'vetor3' };
    parametrosDaRaiada[nomeDoNoDoAro(k)] = { tipo: 'vetor3' };
  }
  const perfil = { tipo: 'tubo-redondo', diametro: p('diametroDoRaio'), lados: p('ladosDoRaio') };
  if (!maciço) perfil.parede = p('paredeDoRaio');
  /* as faces dos raios são as únicas que cabem inteiras nesta caixa: a laje do plano da flange, mais fina que o cubo, o aro e o
     pneu, que passam dela em x */
  const dosRaios = { regiao: { min: p('regiaoDosRaiosMinima'), max: p('regiaoDosRaiosMaxima') } };
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: idDaRodaRaiada(raios, maciço),
    versao: '1.0.0',
    parametros: parametrosDaRaiada,
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] },
    nos: [
      /* o cubo: um anel de espessura inteira, com o furo central, e os furos de fixação */
      {
        id: 'revolucao-cubo', operacao: 'lathe',
        argumentos: {
          origemId: 3, eixo: 'x', lados: p('ladosDaRoda'),
          perfil: [
            [p('raioDoFuroCentral'), p('inicioDoCubo')], [p('raioDoCubo'), p('inicioDoCubo')], [p('raioDoCubo'), p('fimDaChapa')],
            [p('raioDoFuroCentral'), p('fimDaChapa')], [p('raioDoFuroCentral'), p('inicioDoCubo')],
          ],
        },
      },
      {
        id: 'revolucao-furo', operacao: 'lathe',
        argumentos: {
          origemId: 4, eixo: 'x', lados: p('ladosDoFuro'), em: [0, p('raioDoCirculoDeFuros'), 0],
          perfil: [
            [0, p('inicioDaFerramenta')], [p('raioDoFuro'), p('inicioDaFerramenta')], [p('raioDoFuro'), p('fimDaFerramenta')],
            [0, p('fimDaFerramenta')],
          ],
        },
      },
      {
        id: 'repeticao-furos', operacao: 'arranja',
        argumentos: {
          modo: 'radial', total: p('furos'), eixo: 'x', graus: p('passoAngular'), pivo: [0, 0, 0],
          origemId: 5, derivaDe: FERRAMENTA, sel: { origem: FERRAMENTA },
        },
      },
      {
        id: 'corte-dos-furos', operacao: 'subtrair',
        argumentos: { origemId: 6, solidos: [{ origem: BASE_DO_DISCO }, { origem: FERRAMENTA }, { origem: FUROS }] },
      },
      {
        id: 'revolucao-pneu', operacao: 'lathe',
        argumentos: {
          origemId: 1, eixo: 'x', lados: p('ladosDaRoda'),
          perfil: [
            [p('raioDoAssento'), p('inicioDoAro')], [p('raioDoBojo'), p('inicioDaLargura')], [p('raioDoOmbro'), p('inicioDaLargura')],
            [p('raioDoPneu'), p('inicioDaBanda')], [p('raioDoPneu'), p('meiaLarguraDaBanda')], [p('raioDoOmbro'), p('meiaLargura')],
            [p('raioDoBojo'), p('meiaLargura')], [p('raioDoAssento'), p('meiaLarguraDoAro')], [p('raioDoAssento'), p('inicioDoAro')],
          ],
        },
      },
      {
        id: 'revolucao-aro', operacao: 'lathe',
        argumentos: {
          origemId: 2, eixo: 'x', lados: p('ladosDaRoda'),
          perfil: [
            [p('raioInternoDoAro'), p('inicioDoAro')], [p('raioDoAssento'), p('inicioDoAro')], [p('raioDoAssento'), p('meiaLarguraDoAro')],
            [p('raioInternoDoAro'), p('meiaLarguraDoAro')], [p('raioInternoDoAro'), p('inicioDoAro')],
          ],
        },
      },
      parteDe('pneu', 'pneu', PNEU), materialDe('pneu', p('materialDoPneu'), PNEU), solidoDe('pneu', PNEU),
      parteDe('aro', 'aro', ARO), materialDe('aro', p('materialDoMetal'), ARO), solidoDe('aro', ARO),
      parteDe('disco', 'disco', DISCO), materialDe('disco', p('materialDoMetal'), DISCO), solidoDe('disco', DISCO),
      ...PORTAS_DA_RODA,
      /* os raios por último: a estrutura não tem origem, a malha dela é a maior da peça e cada passo depois dela relê a peça
         inteira; ela entra na parte `disco` pela caixa, com o cubo furado que já é dessa parte */
      {
        id: 'raios',
        operacao: 'estruturaDeBarras',
        argumentos: {
          unidade: 'm',
          densidade: DENSIDADE_DO_ACO,
          perfil,
          nos: [
            ...indices.map((k) => ({ nome: `cubo-${k}`, posicao: p(nomeDoNoDoCubo(k)) })),
            ...indices.map((k) => ({ nome: `aro-${k}`, posicao: p(nomeDoNoDoAro(k)) })),
          ],
          barras: indices.map((k) => ({ nome: `raio-${k}`, de: `cubo-${k}`, para: `aro-${k}` })),
        },
      },
      { id: 'parte-raios', operacao: 'parte', argumentos: { nome: 'disco', sel: dosRaios } },
      { id: 'material-raios', operacao: 'material', argumentos: { usa: p('materialDoMetal'), sel: dosRaios } },
      { id: 'solido-raios', operacao: 'solido', argumentos: { sel: dosRaios } },
    ],
  });
}

export const COMPOSICOES = Object.freeze([
  RODA_DE_DISCO,
  ...[false, true].flatMap((maciço) => Array.from({ length: MAXIMO_DE_RAIOS - MINIMO_DE_RAIOS + 1 }, (_, k) => comporRodaRaiada(MINIMO_DE_RAIOS + k, maciço))),
]);
