/* Fixture de teste: as duas composições da família `tubo-de-prova`, uma barra maciça e um tubo de parede. Quem a usa é
   `procedural/familias/familias.test.js` e `src/autoria/chamar-familia.test.js`; mudar qualquer arquivo desta pasta muda
   o que esses testes provam. Ela fica em `tools/fixtures` e não em `procedural/familias` para o registro do produto só
   conter famílias reais. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../procedural/nucleo/entrada.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';

export const ID_BARRA = 'prova.barra-macica';
export const ID_TUBO = 'prova.tubo-de-parede';

const parametro = (nome) => ({ parametro: nome });
const PARAMETROS = {
  origem: { tipo: 'inteiro' },
  raio: { tipo: 'numero' },
  comprimento: { tipo: 'numero' },
  parte: { tipo: 'texto' },
  material: { tipo: 'texto' },
  lados: { tipo: 'inteiro', padrao: 24 },
};
const nos = (perfil) => [
  { id: 'revolucao', operacao: 'lathe', argumentos: { origemId: parametro('origem'), perfil, lados: parametro('lados') } },
  { id: 'identidade', operacao: 'parte', argumentos: { nome: parametro('parte'), sel: { origem: { op: 'lathe', id: parametro('origem') } } } },
  { id: 'aparencia', operacao: 'material', argumentos: { usa: parametro('material'), sel: { origem: { op: 'lathe', id: parametro('origem') } } } },
  { id: 'casca-solida', operacao: 'solido', argumentos: { sel: { origem: { op: 'lathe', id: parametro('origem') } } } },
];

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_BARRA, versao: '1.0.0', parametros: PARAMETROS, artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: nos([[0, 0], [parametro('raio'), 0], [parametro('raio'), parametro('comprimento')], [0, parametro('comprimento')]]),
  }),
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_TUBO, versao: '1.0.0',
    parametros: { ...PARAMETROS, raioInterno: { tipo: 'numero' } }, artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: nos([
      [parametro('raioInterno'), 0], [parametro('raio'), 0], [parametro('raio'), parametro('comprimento')],
      [parametro('raioInterno'), parametro('comprimento')], [parametro('raioInterno'), 0],
    ]),
  }),
]);
