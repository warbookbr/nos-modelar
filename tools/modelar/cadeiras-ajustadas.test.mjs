/* Os ajustes das onze cadeiras (`<id>.ajustes.json` ao lado de cada receita): cada arquivo aplica sem erro, a conversão não recusa forma, a caixa envolvente
   muda no máximo 15 mm por eixo em relação à do alinhamento sozinho, e os ajustes não criam peça atravessada nem passante que antes não havia. */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { caixaDosPassos, passosDoEsboco } from './esboco-para-passos.mjs';
import { receitaParaEsboco } from './receita-externa.mjs';
import { contatosDasCaixas } from './vistas-de-passos.mjs';

const PASTA = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'receita-externa-cadeiras');
const cadeiras = readdirSync(PASTA).filter((f) => f.endsWith('.receita.json')).sort().map((f) => f.replace('.receita.json', ''));

describe('ajustes das cadeiras', () => {
  it('cada cadeira tem o arquivo de ajustes, que é uma lista', () => {
    for (const id of cadeiras) {
      const arq = join(PASTA, `${id}.ajustes.json`);
      expect(existsSync(arq), id).toBe(true);
      expect(Array.isArray(JSON.parse(readFileSync(arq, 'utf8'))), id).toBe(true);
    }
  });

  it.each(cadeiras)('%s: os ajustes aplicam, sem recusa, sem mudar a caixa envolvente além de 15 mm e sem criar atravessamento', (id) => {
    const { esboco } = receitaParaEsboco(JSON.parse(readFileSync(join(PASTA, `${id}.receita.json`), 'utf8')));
    const ajustes = JSON.parse(readFileSync(join(PASTA, `${id}.ajustes.json`), 'utf8'));
    const antes = passosDoEsboco(esboco, { alinhar: true });
    const depois = passosDoEsboco(esboco, { alinhar: true, ajustes });
    expect(depois.recusas).toEqual([]);
    const a = caixaDosPassos(antes.passos); const d = caixaDosPassos(depois.passos);
    for (let k = 0; k < 3; k += 1) { expect(Math.abs(d.min[k] - a.min[k])).toBeLessThanOrEqual(15); expect(Math.abs(d.max[k] - a.max[k])).toBeLessThanOrEqual(15); }
    const ca = contatosDasCaixas(antes.dados.formas); const cd = contatosDasCaixas(depois.dados.formas);
    expect(cd.passantes.length).toBeLessThanOrEqual(ca.passantes.length);
    expect(cd.embutidos.length + cd.passantes.length).toBeLessThanOrEqual(ca.embutidos.length + ca.passantes.length);
    for (const aj of ajustes) expect(typeof aj.motivo, `${id}: ajuste sem motivo`).toBe('string');
  });
});
