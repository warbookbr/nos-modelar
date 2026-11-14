/* custo-de-importar-receita.test.mjs — nenhuma receita do acervo leva mais que o teto para ser importada e ter os passos gerados.
 *
 * O PROBLEMA QUE ELE PEGA. Importar qualquer uma das cinco etapas do sedã levava 9 a 10 s, e quatro testes que percorrem o acervo (`material-da-receita.acervo`,
 * `mapa-da-receita`, `descrever-partes-materiais`, `vao-entre-partes`) passaram do teto de 10 s só por isso. Nenhum gate acusou: o custo de uma importação lenta aparece como
 * o teste dos outros que ficou lento, sem a receita no recado. Este teste mede cada receita num processo novo (`medir-importar-receita.mjs`) e reprova dizendo a peça e o tempo.
 *
 * O TETO. Medido em 2026-11-12, com a máquina livre (carga 1 em 4 núcleos), depois das correções nas ferramentas gerais (a grade do ponto mais próximo na
 * malha, o registro das composições das famílias, a triangulação do triângulo), as 101 receitas importam em 7,7 s no total: a mais lenta, a primeira etapa do sedã
 * que carrega o esboço comum, leva 4,2 s (5,5 s num processo só dela), as outras quatro etapas, que reusam o módulo carregado, 0,1 s, e depois delas vêm as asas do avião (1,4 s), o
 * furgão (1,0 s) e a caçamba do carrinho (0,5 s); as demais levam menos de 0,15 s. O teto é 12 s por receita, 3 vezes o medido: a máquina do CI varia de 2 a 3 vezes, e o teto reprova a
 * volta ao custo de antes (9 a 10 s por etapa do sedã, 13 s a primeira numa máquina lenta) só com a máquina lenta, mas pega qualquer receita que passe a gerar a lataria, o sedã inteiro ou uma
 * varredura na importação sem a receita dela saber. Quem sobe o teto precisa de medida nova, escrita aqui. */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO } from './resolver-caminho-receita.mjs';
import { pecasDoAcervo } from './guardas/guarda-acervo.mjs';

export const TETO_EM_SEGUNDOS = 12;

/** Toda `receita.js` das peças do acervo, em ordem de caminho (as partes de um objeto ficam juntas, e o módulo comum de um objeto é pago pela primeira). */
function receitasDoAcervo(pasta = join(REPO, 'procedural/pecas'), achadas = []) {
  for (const entrada of readdirSync(pasta, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) { if (entrada.name !== 'node_modules') receitasDoAcervo(caminho, achadas); } else if (entrada.name === 'receita.js') achadas.push(caminho);
  }
  return achadas;
}

describe('custo de importar a receita e gerar os passos', () => {
  it(`nenhuma receita do acervo passa de ${TETO_EM_SEGUNDOS} s`, () => {
    const receitas = receitasDoAcervo();
    /* O piso segue o tamanho lido do acervo (`pecasDoAcervo`, as pastas com `receita.js`, `montagem.js` ou `index.js`), e não um número escrito à mão que o
       acervo ultrapassa ou deixa para trás: a varredura achou ao menos quatro de cada cinco peças, e não zero. */
    expect(receitas.length).toBeGreaterThan(0);
    expect(receitas.length).toBeGreaterThanOrEqual(Math.ceil(0.8 * pecasDoAcervo().length));
    const r = spawnSync(process.execPath, [join(REPO, 'tools/modelar/medir-importar-receita.mjs'), ...receitas], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: REPO });
    expect(r.status, r.stderr).toBe(0);
    const medidas = r.stdout.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    expect(medidas.length).toBe(receitas.length);
    const falhas = medidas.filter((m) => m.erro);
    expect(falhas.map((m) => `${relative(REPO, m.receita)}: ${m.erro}`), 'receita que não importa').toEqual([]);
    const lentas = [...medidas].sort((a, b) => b.segundos - a.segundos);
    console.log(`importar a receita e gerar os passos, as 8 mais lentas de ${medidas.length}:\n${lentas.slice(0, 8).map((m) => `  ${m.segundos.toFixed(2).padStart(6)} s  ${relative(join(REPO, 'procedural/pecas'), m.receita)}`).join('\n')}`);
    const acima = lentas.filter((m) => m.segundos > TETO_EM_SEGUNDOS);
    const mensagem = acima.map((m) => `a receita ${relative(join(REPO, 'procedural/pecas'), m.receita)} levou ${m.segundos.toFixed(1)} s para importar e gerar os passos, e o teto é ${TETO_EM_SEGUNDOS} s: `
      + 'procure o que ela (ou o módulo que ela importa) executa na importação, com `node --cpu-prof -e "import(\'./<receita>\')"`, e leve o custo para a ferramenta geral ou para quem pede o dado').join('\n');
    expect(acima.map((m) => relative(REPO, m.receita)), mensagem).toEqual([]);
  }, 300_000);
});
