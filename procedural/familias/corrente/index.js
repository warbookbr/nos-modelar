/* index.js — a família `corrente`: a corrente de rolos simples da ISO 606, série B, fechada em volta de duas rodas
   dentadas, com rolos, pinos e placas internas e externas. A disposição (elos e distância exata) está em `geometria.js`,
   e `transmissaoPorCorrente` (`transmissao.js`) põe as duas rodas e a corrente juntas. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const CORRENTE = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
