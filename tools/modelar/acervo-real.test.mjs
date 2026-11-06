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

/* PEÇA PESADA COM TETO PRÓPRIO. O teto por alvo supõe peças parecidas, e em 2026-11-03 o furgão realista, com as rodas e o forro
   da etapa 4 (187 mil faces), passou a levar sozinho 84 s das duas execuções no CI, quase todos na medida de contato do
   descrever, contra 19 s das outras 43 peças juntas; com ele dentro da conta comum, o teto de 88 s reprovava ou passava
   conforme a máquina (87 s e 102 s em duas rodadas seguidas). A peça listada aqui sai da conta comum e tem o teto dela, cerca
   de 1,7 vez o medido, para a regressão dela continuar aparecendo sem esconder a das outras. Em 2026-11-05 os faróis e a grade
   passaram a ser três vãos pela `aberturaPorContorno`, cada um uma booleana sobre a chapa inteira, e o furgão foi a 152 s no CI
   (82 s antes deles, na mesma máquina local que mediu 160 s depois); o teto foi a 260 s, a mesma razão. */
const PECAS_PESADAS = { 'furgao-realista': 260 };

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
    const comuns = custos.filter(([alvo]) => !(alvo in PECAS_PESADAS));
    expect(comuns.reduce((soma, [, s]) => soma + s, 0)).toBeLessThan(SEGUNDOS_POR_ALVO * comuns.length);
    for (const [alvo, s] of custos.filter(([a]) => a in PECAS_PESADAS)) {
      expect(s, `${alvo} levou ${s.toFixed(0)} s nas duas execuções, acima do teto próprio de ${PECAS_PESADAS[alvo]} s`).toBeLessThan(PECAS_PESADAS[alvo]);
    }
  }, 420_000);
});
