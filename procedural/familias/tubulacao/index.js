/* index.js — a família `tubulacao`: o trecho reto, a curva e o tampão ocos, por diâmetro externo e parede. A rede inteira,
   do traçado às peças, sai de `rede.js`, que lê o traçado (`tracado.js`) e põe cada peça pelo `instanciaDeFamilia`. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const TUBULACAO = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
