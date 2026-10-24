/* ondulacao-rede.test.mjs — a leitura de ondulação da chapa lateral montada por rede de curvas
 *
 * O gate da fatia 2 do plano da carroceria por rede de curvas: a chapa de uns 1000 × 600 mm de `procedural/nucleo/fixtures/gaiola-por-rede-prova.js`
 * (19 curvas, 10 retalhos, a janela em gota, o arco de roda e a coluna inclinada) sai sem falha de ondulação fora de `junto` e sem face virada,
 * lisa e com a moldura de 10 mm como `friso` sobre a curva da janela, e com a face de 60 mm. O alisamento do miolo é o que tira o calombo de
 * 0,4 mm que o preenchimento de Coons deixa junto de uma curva compartilhada com a face de 40 mm, e a leitura o acusa sem ele. Os números da
 * gaiola e da malha estão em `procedural/nucleo/gaiola-por-rede-prova.test.mjs`. Nenhum número vem de referência externa. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ondulacaoDaReceita } from './ondulacao-da-superficie.mjs';
import { receita, receitaComMoldura } from '../../procedural/nucleo/fixtures/gaiola-por-rede-prova.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (rec) => ondulacaoDaReceita(rec).superficies[0];
const limpa = (s) => {
  expect(s.falhas).toEqual([]);
  expect(s.facesViradas).toBe(0);
};

describe('ondulação da chapa por rede de curvas', () => {
  it('a chapa de 40 mm sai sem falha fora de `junto` e sem face virada, com o desvio máximo abaixo de 0,3 mm', () => {
    const s = ler(receita({}));
    limpa(s);
    expect(s.desvioMm.maximo).toBeLessThan(0.3);
    /* o que sobra em junto é a feição declarada: o vinco, a borda ou o canto */
    for (const j of s.junto) expect(j.distanciaDaFeicaoMm).toBeLessThanOrEqual(j.espacamentoMm);
  });

  it('com a face de 60 mm a leitura também passa', () => {
    limpa(ler(receita({ passo: 60 })));
  });

  it('a chapa com a espessura de 1,5 mm e a moldura de 10 mm sobre a curva da janela sai igual', () => {
    const s = ler(receitaComMoldura({}, 2));
    limpa(s);
    expect(s.desvioMm.maximo).toBeLessThan(0.3);
  });

  it('sem o alisamento do miolo a leitura acusa o calombo que o preenchimento de Coons deixa junto da curva compartilhada', () => {
    const s = ler(receita({ extra: { liso: false } }));
    expect(s.facesViradas).toBe(0);
    expect(s.falhas.map((f) => f.tipo)).toEqual(['calombo']);
    expect(s.falhas[0].amplitudeMm).toBeGreaterThan(0.3);
    expect(s.falhas[0].amplitudeMm).toBeLessThan(0.6);
  });

  it('pela linha de comando, a receita da chapa passa e dá a mesma saída', () => {
    const r = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), 'procedural/nucleo/fixtures/gaiola-por-rede-prova.js'], { cwd: join(AQUI, '../..'), encoding: 'utf8' });
    expect(r.status).toBe(0);
    const saida = JSON.parse(r.stdout);
    expect(saida.falhas).toBe(0);
    expect(JSON.stringify(saida.superficies[0])).toBe(JSON.stringify(ler(receita({}))));
  });
});
