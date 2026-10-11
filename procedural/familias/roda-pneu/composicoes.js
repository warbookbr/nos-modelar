/* composicoes.js — a composição da família `roda-pneu` na variante de disco.

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
   leva o disco para fora (+x), como o ET das rodas reais. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const ID_RODA_DE_DISCO = 'roda-pneu.disco';

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

export const COMPOSICOES = Object.freeze([
  Object.freeze({
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
    ],
  }),
]);
