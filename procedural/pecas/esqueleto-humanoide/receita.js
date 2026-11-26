/* receita.js — a peça de bolas e bastões do esqueleto humanoide, na pose zero. Lê o esqueleto resolvido que
 * `npm run esqueleto -- --proporcoes=procedural/pecas/esqueleto-humanoide/proporcoes.json --escrever` grava em esqueleto.json.
 * Plano 2026-11-26-esqueleto-de-proporcao, fatia 3. A TABELA tem só a pose; as medidas moram em proporcoes.json. */
import esqueleto from './esqueleto.json' with { type: 'json' };
import { cadeiaDoEsqueleto, receitaDoEsqueleto } from '../../../src/autoria/esqueleto-de-bolas.js';

export const { TABELA, derivar, gerarPassos } = cadeiaDoEsqueleto(esqueleto, { pose: 'zero' });

export default receitaDoEsqueleto(esqueleto, { pose: 'zero' });
