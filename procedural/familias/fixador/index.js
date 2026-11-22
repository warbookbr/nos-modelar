/* index.js — a família `fixador`: parafuso de cabeça sextavada, allen ou abaulada, porca sextavada e arruela lisa, de M3 a
   M24 pela tabela ISO de rosca grossa, com a rosca cosmética como opção. `chamar(FIXADOR, id, parametros)` devolve a peça. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const FIXADOR = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
