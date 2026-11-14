/* index.js — a família `peca-de-revolucao` carregada: o contrato `familia.json`, as composições e o `derivar`. O registro do
   produto (`procedural/familias/index.js`) importa `PECA_DE_REVOLUCAO` daqui. */
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import contrato from './familia.json' with { type: 'json' };
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const PECA_DE_REVOLUCAO = definirFamilia({ contrato, composicoes: COMPOSICOES, derivar });
