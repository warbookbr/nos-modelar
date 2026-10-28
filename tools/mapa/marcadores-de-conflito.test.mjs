/* marcadores-de-conflito.test.mjs — nenhum arquivo rastreado guarda marcador de conflito de junção.
   Em 2026-10-28 uma junção deixou o plano ativo com os marcadores e o planos:check passou, porque nenhum gate lia o texto procurando
   por eles; só a leitura de quem juntava os achou. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ABRE = '<'.repeat(7);
const FECHA = '>'.repeat(7);

describe('marcadores de conflito', () => {
  it('nenhum arquivo de texto rastreado tem linha que abre ou fecha um conflito de junção', () => {
    const arquivos = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, encoding: 'utf8' }).split('\0').filter(Boolean);
    const achados = [];
    for (const arquivo of arquivos) {
      let texto;
      try { texto = readFileSync(join(RAIZ, arquivo), 'utf8'); } catch { continue; }
      if (texto.includes('\0')) continue;
      texto.split('\n').forEach((linha, i) => {
        if (linha.startsWith(`${ABRE} `) || linha.startsWith(`${FECHA} `)) achados.push(`${arquivo}:${i + 1}`);
      });
    }
    expect(achados, `marcador de conflito de junção em: ${achados.join(', ')}`).toEqual([]);
  });
});
