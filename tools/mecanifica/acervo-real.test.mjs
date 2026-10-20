/* O diagnóstico de parâmetros do acervo REAL, inteiro, uma vez.
 *
 * `parametros-peca.test.mjs` e `tools/mcp/perfis/parametros.test.mjs` provam o
 * encanamento da varredura num acervo reduzido (opção `raiz`), com custo
 * constante. O que sobra para este arquivo é conferir que NENHUMA receita do
 * acervo real deixou de carregar, de ser diagnosticada de forma estável ou de
 * entrar na conta, e dizer o que isso custa: o diagnóstico mede cada parâmetro
 * da TABELA reconstruindo a peça inteira, então o custo cresce com o acervo e
 * com o tamanho de cada peça. O custo por peça é impresso, do mais caro ao mais
 * barato, para a regressão aparecer em quem a causou.
 *
 * O teto cresce linearmente com o número de alvos (SEGUNDOS_POR_ALVO, 40 s, mais
 * de duas vezes a média medida) e não é um número fixo que cada peça nova
 * obrigue a subir. Medido em 2026-10-20 com 48 alvos: 755 s, 15,7 s por peça
 * (trator-pa 77 s, trator-sirene 68 s, caminhao-lixo 54 s; metade do acervo
 * fica abaixo de 15 s). Está em
 * `TESTES_LENTOS`: roda com `npm run test:lentos` quando algo que ele importa
 * muda, e sempre no `--completo` e no CI. */
import { describe, expect, it } from 'vitest';
import { alvosDoAcervo, parametrosReutilizavel } from './parametros-peca.mjs';

const SEGUNDOS_POR_ALVO = 40;

describe('acervo real, inteiro', () => {
  const alvos = alvosDoAcervo().map((a) => a.nome);

  it(`diagnostica os ${alvos.length} alvos, imprime o custo por peça e confere a conta`, async () => {
    const custos = [];
    const registros = [];
    for (const alvo of alvos) {
      const inicio = performance.now();
      const um = await parametrosReutilizavel({ alvo });
      custos.push([alvo, (performance.now() - inicio) / 1000]);
      expect(um.ok, `${alvo}: ${um.erro?.mensagem ?? ''}`).toBe(true);
      registros.push(um.resultado.registro);
    }
    const total = custos.reduce((soma, [, s]) => soma + s, 0);
    const linhas = [...custos].sort((a, b) => b[1] - a[1])
      .map(([alvo, s]) => `  ${s.toFixed(1).padStart(7)} s  ${alvo}`);
    console.log(`custo do diagnóstico do acervo real: ${total.toFixed(0)} s em ${alvos.length} alvos `
      + `(${(total / alvos.length).toFixed(1)} s por peça)\n${linhas.join('\n')}`);

    expect(registros.every((r) => r.carregou)).toBe(true);
    expect(registros.every((r) => r.determinismo?.estavel !== false)).toBe(true);
    /* A varredura de uma vez só dá a mesma conta que os alvos um a um já é
       provada no acervo reduzido; aqui basta a soma não ser vazia. */
    const declarados = registros.reduce((soma, r) => soma + r.totais.declarados, 0);
    expect(declarados).toBeGreaterThan(0);
    expect(total).toBeLessThan(SEGUNDOS_POR_ALVO * alvos.length);
  }, 40_000 * alvos.length + 60_000);
});
