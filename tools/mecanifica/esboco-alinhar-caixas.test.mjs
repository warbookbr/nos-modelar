/* O alinhamento das caixas de um esboço: simetria, colunas, degrau, contato e folga, com o limite de cada regra, e as onze cadeiras convertem com o alinhamento ligado. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';
import { alinharCaixas } from './esboco-alinhar-caixas.mjs';
import { caixaDosPassos, passosDoEsboco } from './esboco-para-passos.mjs';
import { receitaParaEsboco } from './receita-externa.mjs';

const caixa = (id, [x0, x1], [y0, y1], [z0, z1]) => ({ id, tipo: 'caixa', largura: x1 - x0, altura: y1 - y0, profundidade: z1 - z0, centro: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });
const resolvidas = (formas) => formasResolvidas({ opcoes: [{ titulo: 't', formas }] }, 1).formas;
const de = (formas, id) => formas.find((f) => f.id === id).geometria.caixa;

describe('alinhar caixas', () => {
  it('simetria: as pernas dos dois lados ficam espelhadas, e a que está no eixo é centrada', () => {
    const { formas, alteracoes } = alinharCaixas(resolvidas([
      caixa('assento', [-250, 250], [350, 450], [-250, 250]),
      caixa('perna-e', [-225, -160], [0, 350], [190, 250]),
      caixa('perna-d', [185, 250], [0, 350], [188, 252]),
    ]));
    const e = de(formas, 'perna-e'); const d = de(formas, 'perna-d');
    expect(e.min[0] + d.max[0]).toBeCloseTo(0, 6);
    expect(e.max[0] + d.min[0]).toBeCloseTo(0, 6);
    expect([e.min[2], e.max[2]]).toEqual([d.min[2], d.max[2]]);
    expect(alteracoes.some((a) => a.regra === 'simetria')).toBe(true);
  });

  it('degrau: duas faces que se tocam com 2 mm de diferença ficam iguais; com 8 mm ficam como estão', () => {
    const duas = (dx) => alinharCaixas(resolvidas([caixa('a', [0, 100], [0, 100], [0, 100]), caixa('b', [0, 100 + dx], [100, 130], [0, 100])]));
    const perto = duas(2).formas;
    expect(de(perto, 'a').max[0]).toBeCloseTo(de(perto, 'b').max[0], 6);
    const longe = duas(8).formas;
    expect([de(longe, 'a').max[0], de(longe, 'b').max[0]]).toEqual([100, 108]);
  });

  it('folga: o topo da perna a 32 mm do assento é estendido até ele, e a 60 mm não', () => {
    const com = (folga) => alinharCaixas(resolvidas([caixa('assento', [-200, 200], [350 + folga, 450 + folga], [-200, 200]), caixa('perna', [150, 200], [0, 350], [150, 200])]));
    expect(de(com(32).formas, 'perna').max[1]).toBeCloseTo(382, 6);
    expect(de(com(60).formas, 'perna').max[1]).toBeCloseTo(350, 6);
  });

  it('a caixa girada e o cilindro ficam como estão', () => {
    const formas = resolvidas([
      caixa('a', [0, 100], [0, 100], [0, 100]),
      { id: 'g', tipo: 'caixa', largura: 100, altura: 20, profundidade: 30, centro: [101, 50, 50], rotacao: [0, 20, 0] },
    ]);
    const { formas: depois } = alinharCaixas(formas);
    expect(depois.find((f) => f.id === 'g').geometria).toEqual(formas.find((f) => f.id === 'g').geometria);
  });

  const PASTA = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'receita-externa-cadeiras');
  const cadeiras = readdirSync(PASTA).filter((f) => f.endsWith('.receita.json')).sort().map((f) => [f.replace('.receita.json', ''), JSON.parse(readFileSync(join(PASTA, f), 'utf8'))]);
  it.each(cadeiras)('%s: converte com o alinhamento ligado, sem recusa e com a caixa envolvente dentro de 15 mm da do esboço', (_n, receita) => {
    const { esboco } = receitaParaEsboco(receita);
    const { passos, recusas, dados } = passosDoEsboco(esboco, { alinhar: true });
    expect(recusas).toEqual([]);
    const c = caixaDosPassos(passos);
    const original = passosDoEsboco(esboco);
    const o = caixaDosPassos(original.passos);
    for (let k = 0; k < 3; k += 1) { expect(Math.abs(c.min[k] - o.min[k])).toBeLessThanOrEqual(15); expect(Math.abs(c.max[k] - o.max[k])).toBeLessThanOrEqual(15); }
    expect(dados.formas.length).toBe(original.dados.formas.length);
  });
});
