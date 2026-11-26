/* abre-na-bancada-pecas-2.test.mjs — a fatia 2 de 3 das peças do acervo vira cena pelo caminho da bancada (abre-na-bancada-comum.mjs). */
import { describe, expect, it } from 'vitest';
import { FATIAS_DAS_PECAS, pecasDaFatia, pecasQueNaoAbrem } from './abre-na-bancada-comum.mjs';

describe('o acervo abre na bancada, peças da fatia 2', () => {
  it('cada peça da fatia vira cena por processarReceitaSessao, o caminho da bancada', async () => {
    expect(FATIAS_DAS_PECAS).toBe(3);
    const reprovadas = await pecasQueNaoAbrem(pecasDaFatia(2));
    expect(reprovadas, `peças que não abrem na bancada:\n${reprovadas.join('\n')}`).toEqual([]);
  }, 900_000);
});
