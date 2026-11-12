#!/usr/bin/env node
/* medir-importar-receita.mjs — o tempo de importar cada receita e gerar os passos dela, num processo novo.
 *
 * Quem lê: `custo-de-importar-receita.test.mjs`, que roda isto num processo à parte (sem o transformador do vitest e sem módulo já carregado por outro teste) e reprova a
 * peça que passar do teto. O custo de importar uma receita entra em todo teste e toda ferramenta que percorre o acervo, e uma receita que gera os passos na importação
 * (o sedã levava 9 s para cada uma das cinco etapas, 6 s deles no corte da lataria em painéis) só aparecia como o teste que passou do teto de tempo.
 *
 * As receitas vão em ordem, no mesmo processo: o módulo comum que duas receitas importam (o esboço do sedã) é pago por quem o importa primeiro, como acontece num teste que
 * percorre o acervo. Cada receita é medida do `import` até ter `PASSOS` em mãos: o getter da receita (`get PASSOS()`) roda a geração, e a lista pronta custa zero.
 *
 *   node tools/modelar/medir-importar-receita.mjs <receita.js> [<receita.js> ...]
 *
 * Imprime uma linha JSON por receita, `{ "receita": <caminho>, "segundos": <n>, "passos": <n> }`, ou `{ "receita", "erro" }` quando a importação falhou. */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { receitaDoModulo } from './importar-receita.mjs';

for (const arquivo of process.argv.slice(2).map((a) => resolve(a))) {
  const inicio = performance.now();
  try {
    const modulo = await import(pathToFileURL(arquivo).href);
    const receita = receitaDoModulo(modulo);
    const passos = receita?.PASSOS ?? modulo.PASSOS ?? null;
    const segundos = (performance.now() - inicio) / 1000;
    console.log(JSON.stringify({ receita: arquivo, segundos, passos: Array.isArray(passos) ? passos.length : null }));
  } catch (erro) {
    console.log(JSON.stringify({ receita: arquivo, erro: String(erro?.message ?? erro).slice(0, 300) }));
  }
}
