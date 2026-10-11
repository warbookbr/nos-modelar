/* Fixture de teste: a família `bucha-de-prova`, um anel de revolução que publica a porta `assento` (anel que ocupa) na
   parede externa. `criarBucha({ erroDoRaioMm })` devolve a família com o raio da porta declarado errado por esse valor,
   para provar que a aprovação mecânica reprova a porta que não confere com a malha. Quem a usa é
   `tools/mecanifica/aprovacao-da-familia.test.mjs`; mudar qualquer arquivo desta pasta muda o que ele prova. */
import { readFileSync } from 'node:fs';
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../procedural/nucleo/entrada.js';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';
const MM = 0.001;
const parametro = (nome) => ({ parametro: nome });

export const ID_BUCHA = 'prova.bucha';

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_BUCHA,
    versao: '1.0.0',
    parametros: {
      origem: { tipo: 'inteiro' },
      raioInterno: { tipo: 'numero' },
      raioExterno: { tipo: 'numero' },
      raioDaPorta: { tipo: 'numero' },
      comprimento: { tipo: 'numero' },
      parte: { tipo: 'texto' },
      porta: { tipo: 'texto' },
      lados: { tipo: 'inteiro', padrao: 24 },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] },
    nos: [
      {
        id: 'revolucao',
        operacao: 'lathe',
        argumentos: {
          origemId: parametro('origem'),
          perfil: [
            [parametro('raioInterno'), 0],
            [parametro('raioExterno'), 0],
            [parametro('raioExterno'), parametro('comprimento')],
            [parametro('raioInterno'), parametro('comprimento')],
            [parametro('raioInterno'), 0],
          ],
          lados: parametro('lados'),
        },
      },
      { id: 'identidade', operacao: 'parte', argumentos: { nome: parametro('parte'), sel: { origem: { op: 'lathe', id: parametro('origem') } } } },
      {
        id: 'interface',
        operacao: 'publicarPorta',
        argumentos: {
          nome: parametro('porta'),
          de: { op: 'lathe', id: parametro('origem'), faixa: 1 },
          interface: {
            forma: 'anel',
            papel: 'ocupa',
            parte: parametro('parte'),
            eixo: [0, 1, 0],
            centro: [0, 0, 0],
            raioInterno: parametro('raioInterno'),
            raioExterno: parametro('raioDaPorta'),
            inicio: 0,
            fim: parametro('comprimento'),
          },
        },
      },
      { id: 'casca-solida', operacao: 'solido', argumentos: { sel: { origem: { op: 'lathe', id: parametro('origem') } } } },
    ],
  }),
]);

export function criarBucha({ erroDoRaioMm = 0 } = {}) {
  const derivar = ({ diametro, furo, comprimento, lados }) => ({
    composicao: ID_BUCHA,
    argumentos: {
      origem: 1,
      raioInterno: (furo / 2) * MM,
      raioExterno: (diametro / 2) * MM,
      raioDaPorta: (diametro / 2 + erroDoRaioMm) * MM,
      comprimento: comprimento * MM,
      parte: 'bucha',
      porta: 'assento',
      lados,
    },
  });
  return definirFamilia({
    contrato: JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8')),
    composicoes: COMPOSICOES,
    derivar,
  });
}
