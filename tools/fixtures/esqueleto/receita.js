/* receita.js — a peça de bolas e bastões da fixture do esqueleto, na pose zero. Lê o esqueleto resolvido que
 * `npm run esqueleto -- --proporcoes=tools/fixtures/esqueleto/proporcoes.json --escrever` grava em esqueleto.json. */
import esqueleto from './esqueleto.json' with { type: 'json' };
import { receitaDoEsqueleto } from '../../../src/autoria/esqueleto-de-bolas.js';

export default receitaDoEsqueleto(esqueleto, { pose: 'zero' });
