/* ondulacao-aneis.test.mjs — a leitura de ondulação da chapa com anéis de gaiola em volta de um vão e de um arco
 *
 * O gate da fatia 1 do plano da gaiola que segue as feições: a chapa curva da prova (procedural/nucleo/fixtures/gaiola-aneis-prova.js)
 * sai lisa na zona da costura, isto é, a ferramenta de ondulação não acusa falha fora de `junto`, com os anéis lisos e com a moldura
 * em relevo. As medidas do anel têm peso: com a cota exata nos pontos do anel a superfície ganha faces viradas junto dos cantos, e a
 * ferramenta acusa emendas. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ondulacaoDaReceita } from './ondulacao-da-superficie.mjs';
import { montagem, receita } from '../../procedural/nucleo/fixtures/gaiola-aneis-prova.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';
import { subdividirCatmullClark } from '../../procedural/nucleo/subdivisao.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (opcoes) => ondulacaoDaReceita(receita(opcoes)).superficies[0];

describe('ondulação da chapa com anéis', () => {
  it('sem os anéis, a chapa só com os vãos não tem falha, e é a referência do que os anéis não podem piorar', () => {
    const s = ler({ aneis: false });
    expect(s.falhas).toEqual([]);
    expect(s.desvioMm.maximo).toBeLessThan(0.15);
  });

  it('com os anéis lisos, a costura sai lisa: nenhuma falha, e o maior desvio fica abaixo do limiar', () => {
    const s = ler({});
    expect(s.falhas).toEqual([]);
    expect(s.junto).toEqual([]);
    expect(s.desvioMm.maximo).toBeLessThan(0.3);
    expect(s.desvioMm.p95).toBeLessThan(0.15);
    expect(s.vertices).toBe(8088);
  });

  it('com a moldura em relevo de 10 mm, nenhuma falha fora de junto, e o que sobra em junto é a moldura', () => {
    const s = ler({ relevo: true });
    expect(s.falhas).toEqual([]);
    expect(s.junto.length).toBeGreaterThan(0);
    for (const j of s.junto) expect(j.distanciaDaFeicaoMm).toBeLessThanOrEqual(j.espacamentoMm);
    /* o maior desvio, 0,32 mm, fica na moldura, que o vinco declara */
    expect(s.desvioMm.maximo).toBeLessThan(0.4);
  });

  it('a cota exata nos pontos do anel vira faces da superfície junto dos cantos, e a medida com peso não', () => {
    const viradas = (opcoes) => {
      const g = montagem(opcoes);
      const r = gaiolaDoPasso({ ...g.passo, borda: 'cantos' }, { vec: (p) => g.pontos[p], num: (x) => x });
      const s = subdividirCatmullClark({ ...r.gaiola, niveis: 2, borda: 'cantos', aoLimite: true });
      /* a chapa é quase horizontal: a face virada tem a área projetada em y negativa */
      const area = (f) => { let a = 0; for (let k = 0; k < f.length; k++) { const p = s.vertices[f[k]], q = s.vertices[f[(k + 1) % f.length]]; a += (p[2] - q[2]) * (p[0] + q[0]); } return a / 2; };
      return s.faces.filter((f) => area(f) < -2e-9).length;
    };
    expect(viradas({})).toBe(0);
    expect(viradas({ relevo: true })).toBe(0);
    expect(viradas({ medidasDosAneis: [{ anel: 'janela' }, { anel: 'arco' }] })).toBe(56);
    const exata = ler({ medidasDosAneis: [{ anel: 'janela' }, { anel: 'arco' }] });
    expect(exata.falhas.length).toBeGreaterThan(0);
    expect(exata.falhas.every((f) => f.tipo === 'emenda' && f.amplitudeMm < 0.15)).toBe(true);
  });

  it('pela linha de comando, a receita da prova passa com a moldura e dá a mesma saída', () => {
    const r = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), 'procedural/nucleo/fixtures/gaiola-aneis-prova.js'], { cwd: join(AQUI, '../..'), encoding: 'utf8' });
    expect(r.status).toBe(0);
    const saida = JSON.parse(r.stdout);
    expect(saida.falhas).toBe(0);
    expect(JSON.stringify(saida.superficies[0])).toBe(JSON.stringify(ler({ relevo: true })));
  });
});
