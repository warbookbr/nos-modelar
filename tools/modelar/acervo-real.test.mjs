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
   (82 s antes deles, na mesma máquina local que mediu 160 s depois); o teto foi a 260 s, a mesma razão. Em 2026-11-06 as duas
   lanternas passaram a ser vãos na quina pela mesma operação, com a limpeza fina em todos, e o furgão foi a 305 s no CI; o perfil
   local deu 67 dos 99 s de uma execução nas sete aberturas, 41 deles na booleana da chapa inteira (o item do backlog "Booleana
   de um vão sem percorrer a chapa inteira"). O teto foi a 450 s, e o prazo do teste a 600 s. Em 2026-11-07 a booleana de cada vão passou a ver só a vizinhança dele
   (plano `2026-11-06-abertura-so-na-vizinhanca.md`): as sete aberturas caíram de 51 s para 3,7 s no perfil local, as duas execuções
   mais a conta do furgão, de 194 s para 86 s na máquina local, e o teto de 305 s medido no CI vira cerca de 136 s; o teto voltou a 230 s,
   1,7 vez isso, e o prazo do teste, 400 s. Na etapa 8, ainda em 2026-11-07, entraram mais quatro vãos (as luzes de canto e os
   piscas laterais), e a vizinhança deles não recorta (`vizinhanca.motivo` no registro: borda com uma volta só nas luzes de canto,
   que dobram a quina, e banda de 96 mm nos piscas), então os quatro voltam à booleana da chapa inteira; o furgão foi a 245 s no
   CI, e o teto vai a 420 s, 1,7 vez isso, com o prazo do teste em 600 s, até a vizinhança cobrir esses dois casos (item do backlog).
   Em 2026-11-09 a janela da cabine em dois vidros trouxe quatro vãos grandes, e nenhum recorta (a banda liga vértices a 690 mm
   nos dois maiores, e a borda sai com quatro voltas nos dois que encostam no vão vizinho); com os quatro da lanterna, oito vãos
   vão à booleana da chapa inteira, 140 dos 207 s de uma execução local, e o furgão foi a 506 s no CI. O teto vai a 860 s e o
   prazo a 1.000 s até o plano `docs/modelar/planos/encerrados/2026-11-09-abertura-na-vizinhanca-de-todo-vao.md` fazer os oito recortarem. Com ele, os 19 vãos
   recortam, e uma execução local caiu de 207 s para 77 s; pela mesma razão da máquina local para o CI (207 s para 506 s nas
   duas execuções), o furgão ficaria em cerca de 190 s no CI. Medido no CI em 2026-11-12, levou 104 s numa execução da bateria e
   188 s na seguinte, com a receita igual (a execução local foi de 83 s nas duas): a máquina do CI varia quase o dobro de uma
   execução para outra, e o teto é 1,7 vez a maior medida, 320 s, com o prazo do teste em 600 s. 
   TETO PELA RAZÃO, DESDE 2026-11-12. O teto em segundos reprovava ao acaso: no mesmo dia, com a receita igual, o furgão levou
   no CI 119, 139, 154 e 184 s por execução, e a última passou dos 320 s das duas. Nessas quatro rodadas a soma das outras
   peças, medida na mesma máquina e na mesma rodada, foi de 13,8, 15,3, 18,1 e 20,2 s, e a razão entre o furgão e essa soma
   ficou em 8,7, 9,1, 8,5 e 9,1. O teto da peça pesada passa a ser essa razão, 15, cerca de 1,7 vez a medida, e a máquina
   lenta deixa de reprovar; o prazo do teste, 900 s, é o que resta de teto absoluto. A regressão da peça continua aparecendo,
   porque quem a deixa mais lenta não deixa as outras. Quando a receita da peça mudar de custo de propósito, a razão é medida
   de novo no CI e anotada aqui. */
const PECAS_PESADAS = { 'furgao-realista': 15 };

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
    const somaDosComuns = comuns.reduce((soma, [, s]) => soma + s, 0);
    for (const [alvo, s] of custos.filter(([a]) => a in PECAS_PESADAS)) {
      const razao = s / somaDosComuns;
      console.log(`${alvo}: ${s.toFixed(0)} s nas duas execuções, ${razao.toFixed(1)} vez(es) a soma das outras peças (${somaDosComuns.toFixed(0)} s); teto ${PECAS_PESADAS[alvo]}`);
      expect(razao, `${alvo} levou ${s.toFixed(0)} s nas duas execuções, ${razao.toFixed(1)} vez(es) a soma das outras peças na mesma máquina (${somaDosComuns.toFixed(0)} s), acima da razão de ${PECAS_PESADAS[alvo]}`).toBeLessThan(PECAS_PESADAS[alvo]);
    }
  }, 900_000);
});
