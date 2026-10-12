/* index.js — a família `superficie-aerodinamica` carregada: o contrato `familia.json`, as composições e o `derivar`. O registro do
   produto (`procedural/familias/index.js`) importa `SUPERFICIE_AERODINAMICA` daqui. */
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import contrato from './familia.json' with { type: 'json' };
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const SUPERFICIE_AERODINAMICA = definirFamilia({ contrato, composicoes: COMPOSICOES, derivar });
