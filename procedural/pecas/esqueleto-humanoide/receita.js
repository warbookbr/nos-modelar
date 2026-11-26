/* receita.js — a peça de bolas e bastões do esqueleto humanoide, na pose zero. Lê o esqueleto resolvido que
 * `npm run esqueleto -- --proporcoes=procedural/pecas/esqueleto-humanoide/proporcoes.json --escrever` grava em esqueleto.json.
 * Plano 2026-11-26-esqueleto-de-proporcao, fatia 3. A TABELA tem só a pose; as medidas moram em proporcoes.json. */
import esqueleto from './esqueleto.json' with { type: 'json' };
import { cadeiaDoEsqueleto, receitaDoEsqueleto } from '../../../src/autoria/esqueleto-de-bolas.js';

export const TABELA = {
  /* a pose do esqueleto: 'zero' (em pé) ou uma das declaradas em proporcoes.json (sentado, braco-erguido) */
  pose: 'zero',
};

const cadeia = cadeiaDoEsqueleto(esqueleto, TABELA);
export const derivar = cadeia.derivar;
export function gerarPassos(tabela) {
  return cadeia.gerarPassos(tabela);
}

const receita = receitaDoEsqueleto(esqueleto, TABELA);

/* o PLANO que a conta monta do esqueleto (uma parte por bola e por bastão), citado aqui para quem lê a receita achar as partes */
const PLANO = { ...receita.PLANO, partes: receita.PLANO.partes };
receita.PLANO = PLANO;

export default receita;
