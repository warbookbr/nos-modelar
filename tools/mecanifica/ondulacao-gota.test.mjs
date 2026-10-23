/* ondulacao-gota.test.mjs — a leitura de ondulação das chapas com anel no vão real: a gota estreita e o vão aberto pelas colunas que terminam e começam
 *
 * O gate da correção da fatia 1 do plano da gaiola que segue as feições: numa chapa de uns 1000 × 500 mm com uma gota de 450 mm, de 230 mm de altura na
 * estação larga e 10 mm na ponta (procedural/nucleo/fixtures/gaiola-gota-prova.js), o anel com recuo diferente em cada lado e o anel de recuo 0 saem sem falha de
 * ondulação fora de `junto` e sem face virada, com a moldura lisa e com a moldura em relevo de 10 mm; o mesmo vale para a metade de chapa com o vão que as colunas que
 * terminam e começam deixam. A cota exata nos pontos do anel, que dobra a superfície, sai acusada. Os números dos anéis estão em
 * `procedural/nucleo/gaiola-aneis-gota.test.mjs`. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ondulacaoDaReceita } from './ondulacao-da-superficie.mjs';
import { gota, montagem, receita } from '../../procedural/nucleo/fixtures/gaiola-gota-prova.js';
import { receita as receitaDoVidro } from '../../procedural/nucleo/fixtures/gaiola-borda-livre-prova.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (rec) => ondulacaoDaReceita(rec).superficies[0];
const limpa = (s) => {
  expect(s.falhas).toEqual([]);
  expect(s.facesViradas).toBe(0);
};

describe('ondulação da gota com o anel no vão real', () => {
  it('o vão maior que a abertura, com um recuo para cada lado, sai sem falha e sem face virada, lisa e com a moldura em relevo', () => {
    for (const relevo of [false, true]) {
      const s = ler(receita(gota({ modo: 'dentro', relevo })));
      limpa(s);
      expect(s.desvioMm.maximo).toBeLessThan(1);
    }
  });

  it('o anel de recuo 0, com a abertura na própria borda do vão afilado em ponta, sai sem falha e sem face virada, lisa e com a moldura em relevo', () => {
    for (const relevo of [false, true]) {
      const s = ler(receita(gota({ modo: 'fora', relevo })));
      limpa(s);
      expect(s.desvioMm.maximo).toBeLessThan(0.7);
      /* o que sobra em junto é a feição que a receita declarou: a borda da abertura e a moldura */
      for (const j of s.junto) expect(j.distanciaDaFeicaoMm).toBeLessThanOrEqual(j.espacamentoMm);
    }
  });

  it('a metade de chapa com o vão aberto pelas colunas que terminam e começam sai sem falha e sem face virada, lisa e com a moldura em relevo', () => {
    const estacoes = Array.from({ length: 17 }, (_, e) => ({ estacao: `e${e}` }));
    const aneis = [{ nome: 'v', vao: 'vidro', recuo: 0, voltas: 3, largura: 10 }];
    limpa(ler(receitaDoVidro({ aneis })));
    const relevo = receitaDoVidro({
      aneis: [{ ...aneis[0], relevo: [0, 10, 0] }],
      vincos: [{ nome: 'molduraDeDentro', anel: 'v', volta: 1, nitidez: 'viva' }, { nome: 'molduraDeFora', anel: 'v', volta: 3, nitidez: 'viva' }],
      medidas: [...estacoes, { anel: 'v', volta: 2, peso: 50 }],
    });
    limpa(ler(relevo));
  });

  it('a cota exata nos pontos do anel dobra a superfície junto da faixa, e a ferramenta acusa a face virada', () => {
    const opcoes = gota({ modo: 'fora' });
    const sem = montagem({});
    const exata = ler(receita({ ...opcoes, medidas: [...sem.estacoesDaChapa.map((estacao) => ({ estacao })), { anel: 'g', exata: true }] }));
    expect(exata.falhas.length).toBeGreaterThan(0);
    expect(exata.falhas.some((f) => f.tipo === 'faceVirada' || f.tipo === 'emenda')).toBe(true);
  });

  it('pela linha de comando, a receita da gota com a moldura passa e dá a mesma saída', () => {
    const r = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), 'procedural/nucleo/fixtures/gaiola-gota-prova.js'], { cwd: join(AQUI, '../..'), encoding: 'utf8' });
    expect(r.status).toBe(0);
    const saida = JSON.parse(r.stdout);
    expect(saida.falhas).toBe(0);
    expect(JSON.stringify(saida.superficies[0])).toBe(JSON.stringify(ler(receita(gota({ relevo: true })))));
  });
});
