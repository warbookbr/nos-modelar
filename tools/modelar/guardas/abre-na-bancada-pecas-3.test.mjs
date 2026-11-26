/* abre-na-bancada-pecas-3.test.mjs — a fatia 3 de 3 das peças do acervo vira cena pelo caminho da bancada. As peças saíram do
   abre-na-bancada.test.mjs em três fatias, para rodarem em máquinas diferentes do CI (o arquivo único levava 674 s no CI em
   2026-11-26 e segurava uma parte inteira dos testes lentos). A conta da fatia se repete nos quatro arquivos, porque um módulo
   comum fora de teste não pode importar a bancada (bancada:fronteira:check), e o abre-na-bancada.test.mjs confere a cobertura. */
import { describe, expect, it } from 'vitest';
import { listarParaBancada } from '../../../src/bancada/acervo-receitas.js';
import { processarReceitaSessao } from '../../../src/bancada/sessao/carregar-sessao.js';

const acervo = listarParaBancada();
const pecas = acervo.filter((entrada) => !entrada.emDados && !entrada.ensaio);
/* as peças da fatia n de 3, pela ordem do id: toda peça cai em exatamente uma fatia (a mesma conta nos quatro arquivos) */
const pecasDaFatia = (n, total = 3) => [...pecas].sort((a, b) => a.id.localeCompare(b.id)).filter((_, i) => i % total === n - 1);

describe('o acervo abre na bancada, peças da fatia 3', () => {
  it('cada peça da fatia vira cena por processarReceitaSessao, o caminho da bancada', async () => {
    const reprovadas = [];
    for (const entrada of pecasDaFatia(3)) {
      const receita = await entrada.carregar();
      /* parte planejada que espera a etapa: tem plano e nenhum passo, e a bancada não a desenha */
      if (!Array.isArray(receita?.PASSOS) || receita.PASSOS.length === 0) continue;
      try {
        processarReceitaSessao(receita, { nome: entrada.id });
      } catch (erro) {
        reprovadas.push(`${entrada.id}: ${erro.message}`);
      }
    }
    expect(reprovadas, `peças que não abrem na bancada:\n${reprovadas.join('\n')}`).toEqual([]);
  }, 900_000);
});
