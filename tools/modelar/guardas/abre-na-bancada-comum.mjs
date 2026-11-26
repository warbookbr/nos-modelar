/* abre-na-bancada-comum.mjs — o acervo da bancada e a conferência de que cada peça vira cena Three.js pelo caminho da bancada,
 * repartida em fatias para os arquivos de teste `abre-na-bancada-pecas-<n>.test.mjs` rodarem em máquinas diferentes do CI (o
 * arquivo único levava 674 s no CI em 2026-11-26 e segurava uma parte inteira dos testes lentos; plano do processo e do CI). */
import { listarParaBancada } from '../../../src/bancada/acervo-receitas.js';
import { processarReceitaSessao } from '../../../src/bancada/sessao/carregar-sessao.js';

export const FATIAS_DAS_PECAS = 3;
export const acervo = listarParaBancada();
export const pecas = acervo.filter((entrada) => !entrada.emDados && !entrada.ensaio);
export const montagens = acervo.filter((entrada) => entrada.emDados && !entrada.ensaio);

/** As peças da fatia `n` (de 1 a FATIAS_DAS_PECAS), pela ordem do id: toda peça cai em exatamente uma fatia. */
export function pecasDaFatia(n, lista = pecas, total = FATIAS_DAS_PECAS) {
  return [...lista].sort((a, b) => a.id.localeCompare(b.id)).filter((_, i) => i % total === n - 1);
}

/** As peças da lista que não viram cena, com o motivo; a parte planejada sem passo fica de fora, porque a bancada não a desenha. */
export async function pecasQueNaoAbrem(lista) {
  const reprovadas = [];
  for (const entrada of lista) {
    const receita = await entrada.carregar();
    if (!Array.isArray(receita?.PASSOS) || receita.PASSOS.length === 0) continue;
    try {
      processarReceitaSessao(receita, { nome: entrada.id });
    } catch (erro) {
      reprovadas.push(`${entrada.id}: ${erro.message}`);
    }
  }
  return reprovadas;
}
