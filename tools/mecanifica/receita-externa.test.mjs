/* O tradutor da receita do externo: sete receitas reais (as do repositório projeto externo, já expandidas) viram esboço que o módulo valida e descreve,
   e o bloco de materiais volta igual ao que a receita tinha. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { descreverEsboco } from '../../modulos/esboco/src/descrever.js';
import { materiaisParaReceita, receitaParaEsboco } from './receita-externa.mjs';

const PASTA = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'receita-externa');
const receitas = readdirSync(PASTA).filter((f) => f.endsWith('.receita.json')).map((f) => [f.replace('.receita.json', ''), JSON.parse(readFileSync(join(PASTA, f), 'utf8'))]);

describe('receita do externo para esboço', () => {
  it('tem as sete receitas de prova', () => expect(receitas).toHaveLength(7));

  it.each(receitas)('%s: o esboço é válido e tem uma forma por peça traduzida', (_nome, receita) => {
    const { esboco, recusas } = receitaParaEsboco(receita);
    expect(esboco.opcoes[0].formas.length + recusas.filter((r) => r.motivo).length).toBe(receita.pecas.length);
    expect(() => descreverEsboco(esboco)).not.toThrow();
  });

  it.each(receitas)('%s: o bloco de materiais volta igual ao da receita', (_nome, receita) => {
    const { esboco } = receitaParaEsboco(receita);
    const volta = materiaisParaReceita(JSON.parse(JSON.stringify(esboco)));
    expect(volta.cores).toEqual(receita.cores ?? {});
    expect(volta.realista.materiais).toEqual(receita.realista?.materiais ?? {});
    for (const p of receita.pecas) if (volta.materialPorPeca[p.nome] !== undefined) expect(volta.materialPorPeca[p.nome]).toBe(p.material ?? receita.material);
  });

  it('o esboço recusa a forma que nomeia um material fora do bloco', () => {
    const { esboco } = receitaParaEsboco(receitas[0][1]);
    esboco.opcoes[0].formas[0].material = 'inexistente';
    expect(() => descreverEsboco(esboco)).toThrow(/não está no bloco "materiais"/);
  });
});
