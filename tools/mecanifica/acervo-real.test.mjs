/* A varredura do acervo REAL, inteiro, uma vez.
 *
 * `parametros-peca.test.mjs` e `tools/mcp/perfis/parametros.test.mjs` provam o
 * encanamento do diagnóstico, as sondas inclusas, num acervo reduzido (opção
 * `raiz`), com custo constante. O que sobra para este arquivo é conferir que
 * NENHUMA receita do acervo real deixou de carregar, de executar duas vezes com
 * a mesma medida ou de entrar na conta dos parâmetros declarados.
 *
 * Ele roda sem as sondas. Medido em 2026-10-25 com 43 alvos: uma execução do
 * acervo inteiro leva 10 s (executar 8,7 s, descrever 1,2 s, forma 0,3 s,
 * importar 0,2 s), e o diagnóstico com sondas repete a execução cerca de 2 +
 * 1,5 × parâmetros vezes por peça, o que dava uns 1.100 s em que as sondas eram
 * 98% do custo e nenhuma asserção as olhava. O custo de uma execução por peça é
 * impresso, do mais caro ao mais barato, com os declarados, para a regressão
 * aparecer em quem a causou; o teto cresce com o número de alvos
 * (SEGUNDOS_POR_ALVO, quatro vezes a média medida das duas execuções). Está em
 * `TESTES_LENTOS`: roda com `npm run test:lentos` quando algo que ele importa
 * muda, e sempre no `--completo` e no CI. */
import { describe, expect, it } from 'vitest';
import { alvosDoAcervo, parametrosReutilizavel } from './parametros-peca.mjs';

const SEGUNDOS_POR_ALVO = 2;

describe('acervo real, inteiro', () => {
  const alvos = alvosDoAcervo().map((a) => a.nome);

  it(`carrega os ${alvos.length} alvos, executa cada um duas vezes igual e confere a conta`, async () => {
    const custos = [];
    const registros = [];
    for (const alvo of alvos) {
      const inicio = performance.now();
      const um = await parametrosReutilizavel({ alvo, sondar: false });
      expect(um.ok, `${alvo}: ${um.erro?.mensagem ?? ''}`).toBe(true);
      const registro = um.resultado.registro;
      custos.push([alvo, (performance.now() - inicio) / 1000, registro.totais.declarados]);
      registros.push(registro);
    }
    const total = custos.reduce((soma, [, s]) => soma + s, 0);
    const linhas = [...custos].sort((a, b) => b[1] - a[1])
      .map(([alvo, s, declarados]) => `  ${(s / 2).toFixed(2).padStart(6)} s  ${String(declarados).padStart(4)} declarados  ${alvo}`);
    console.log(`custo da varredura do acervo real: ${total.toFixed(0)} s em ${alvos.length} alvos, duas execuções cada\n${linhas.join('\n')}`);

    expect(registros.every((r) => r.carregou)).toBe(true);
    expect(registros.filter((r) => r.determinismo?.estavel === false).map((r) => r.alvo)).toEqual([]);
    const declarados = registros.reduce((soma, r) => soma + r.totais.declarados, 0);
    expect(declarados).toBeGreaterThan(0);
    expect(total).toBeLessThan(SEGUNDOS_POR_ALVO * alvos.length);
  }, 120_000);
});
