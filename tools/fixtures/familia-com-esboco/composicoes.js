/* Fixture de teste: a composição da família `roda-com-esboco`, uma roda de eixo em x com pneu, disco e dois cubos, cada um
   uma revolução, e duas portas (o assento do pneu e o cubo da direita). Quem a usa é `src/autoria/familia-esboco.test.js` e
   `tools/mecanifica/familia-com-esboco.test.mjs`; mudar qualquer arquivo desta pasta muda o que eles provam. Ela fica em
   `tools/fixtures` e não em `procedural/familias` para o registro do produto só conter famílias reais. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../procedural/nucleo/entrada.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const ID_RODA = 'prova.roda-com-esboco';

const parametro = (nome) => ({ parametro: nome });
const PARAMETROS = Object.fromEntries([
  'raioDoPneu', 'raioDoAro', 'inicioDoPneu', 'meiaLargura', 'inicioDoDisco', 'meiaEspessuraDoDisco', 'raioDoCubo',
  'inicioDoCuboE', 'fimDoCubo', 'raioDoAssento', 'profundidadeDoAssento', 'profundidadeDoCubo',
].map((nome) => [nome, { tipo: 'numero' }]));
PARAMETROS.lados = { tipo: 'inteiro', padrao: 128 };

/* uma revolução em torno de x: o perfil é [raio, posição em x] */
const revolucao = (id, perfil) => ({ id: `revolucao-n${id}`, operacao: 'lathe', argumentos: { origemId: id, eixo: 'x', perfil, lados: parametro('lados') } });
const identidade = (id, nome) => ({ id: `parte-${id}`, operacao: 'parte', argumentos: { nome, sel: { origem: { op: 'lathe', id } } } });
const solido = (id) => ({ id: `solido-n${id}`, operacao: 'solido', argumentos: { sel: { origem: { op: 'lathe', id } } } });

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_RODA, versao: '1.0.0', parametros: PARAMETROS,
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] },
    nos: [
      revolucao(1, [
        [parametro('raioDoAro'), parametro('inicioDoPneu')], [parametro('raioDoPneu'), parametro('inicioDoPneu')],
        [parametro('raioDoPneu'), parametro('meiaLargura')], [parametro('raioDoAro'), parametro('meiaLargura')],
        [parametro('raioDoAro'), parametro('inicioDoPneu')],
      ]),
      identidade(1, 'pneu'), solido(1),
      revolucao(2, [
        [0, parametro('inicioDoDisco')], [parametro('raioDoAro'), parametro('inicioDoDisco')],
        [parametro('raioDoAro'), parametro('meiaEspessuraDoDisco')], [0, parametro('meiaEspessuraDoDisco')],
      ]),
      identidade(2, 'disco'), solido(2),
      revolucao(3, [
        [0, parametro('inicioDoCuboE')], [parametro('raioDoCubo'), parametro('inicioDoCuboE')],
        [parametro('raioDoCubo'), parametro('inicioDoDisco')], [0, parametro('inicioDoDisco')],
      ]),
      identidade(3, 'cuboE'), solido(3),
      revolucao(4, [
        [0, parametro('meiaEspessuraDoDisco')], [parametro('raioDoCubo'), parametro('meiaEspessuraDoDisco')],
        [parametro('raioDoCubo'), parametro('fimDoCubo')], [0, parametro('fimDoCubo')],
      ]),
      identidade(4, 'cuboD'), solido(4),
      {
        id: 'porta-assento', operacao: 'publicarPorta',
        argumentos: {
          id: 'assento-do-pneu', de: { op: 'lathe', id: 1 },
          interface: {
            forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [parametro('meiaLargura'), 0, 0],
            raioInterno: parametro('raioDoAro'), raioExterno: parametro('raioDoAssento'), inicio: parametro('profundidadeDoAssento'), fim: 0,
          },
        },
      },
      {
        id: 'porta-cubo', operacao: 'publicarPorta',
        argumentos: {
          id: 'cubo-externo', de: { op: 'lathe', id: 4 },
          interface: {
            forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], centro: [parametro('fimDoCubo'), 0, 0],
            raio: parametro('raioDoCubo'), inicio: parametro('profundidadeDoCubo'), fim: 0,
          },
        },
      },
    ],
  }),
]);
