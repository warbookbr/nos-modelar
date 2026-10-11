/* index.js — a família `roda-pneu` carregada: o contrato `familia.json`, as composições e o `derivar`. O registro do produto
   (`procedural/familias/index.js`) importa `RODA_PNEU` daqui. */
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import contrato from './familia.json' with { type: 'json' };
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const RODA_PNEU = definirFamilia({ contrato, composicoes: COMPOSICOES, derivar });
