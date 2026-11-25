/* index.js — a família `cremalheira`: a cremalheira reta pelo perfil de referência da ISO 53, que engrena com a engrenagem
   reta de mesmo módulo. `chamar(CREMALHEIRA, id, parametros)` devolve a cremalheira numa peça só. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const CREMALHEIRA = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
