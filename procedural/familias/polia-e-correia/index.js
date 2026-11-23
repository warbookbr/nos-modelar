/* index.js — a família `polia-e-correia`: polia dentada (GT2, HTD 3M, HTD 5M e T5), em V (Z, A e B, de um a quatro canais)
   e lisa, com cubo e furo. `chamar(POLIA_E_CORREIA, id, parametros)` devolve a polia numa peça só, com a porta do eixo. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const POLIA_E_CORREIA = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
