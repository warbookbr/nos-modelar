/* silhueta-pedida.test.mjs — a malha de um corpo de `lacosPelasVistas` contra o que foi pedido, faixa por faixa de altura: a gaiola
   sem subdivisão dá desvio zero, e deslocada dá o deslocamento. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gaiolaPorLacos } from '../../procedural/nucleo/gaiola-por-lacos.js';
import { lacosPelasVistas } from '../../procedural/nucleo/lacos-pelas-vistas.js';
import { executar, secao, silhuetaPedida } from './silhueta-pedida.mjs';

/* as faces da gaiola, em mm, sem subdivisão e deslocadas de d */
function facesDaGaiola(vistas, d = [0, 0, 0]) {
  const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas(vistas);
  const g = gaiolaPorLacos({ nome: 'corpo', eixo: 'y', ...lacos });
  const ponto = (v) => g.pontosMm[typeof v === 'number' ? g.passo.vertices[v] : v];
  return g.passo.faces.map((f) => ({ pts: f.map((v) => ponto(v).map((c, k) => c + d[k])) }));
}

const CAIXA = { lado: [[0, 0], [600, 0], [600, 500], [0, 500]], perfil: [[0, 300], [500, 300]], planta: [[-300, 0], [300, 0], [300, 600], [-300, 600]], estacoes: [0, 250, 500] };
/* o corpo do teste de laços, com uma estação a mais em 380, a quina do perfil: entre duas estações a gaiola é a reta entre os laços,
   e sem ela a meia largura ficaria 11,5 mm aquém do perfil ali */
const CORPO = {
  lado: [[0, 0], [600, 0], [640, 300], [560, 500], [0, 500]], perfil: [[0, 480], [380, 500], [500, 420]],
  planta: [[-500, 0], [500, 0], [500, 440], [300, 600], [0, 640], [-300, 600], [-500, 440]], estacoes: [0, 150, 300, 380, 400, 480, 500],
};

describe('silhuetaPedida', () => {
  it('a caixa sem subdivisão dá desvio zero em todas as faixas e medidas', () => {
    const r = silhuetaPedida(facesDaGaiola(CAIXA), CAIXA);
    expect(r.faixas.length).toBeGreaterThan(40);
    for (const f of r.faixas) for (const m of f.medidas) expect(Math.abs(m.desvio)).toBeLessThan(1e-6);
    /* o plano da tampa de baixo não corta face nenhuma: a faixa fica sem malha, e é dita */
    expect(r.semMalha).toEqual([0]);
  });

  it('o corpo dos laços sem subdivisão dá zero, e deslocado 7 mm dá 7', () => {
    expect(Math.abs(silhuetaPedida(facesDaGaiola(CORPO), CORPO).pior.desvio)).toBeLessThan(0.01);
    const lateral = silhuetaPedida(facesDaGaiola(CORPO, [7, 0, 0]), CORPO);
    expect(Math.abs(lateral.pior.desvio)).toBeCloseTo(7, 0);
    expect(lateral.piorPorMedida['meia largura à direita'].desvio).toBeCloseTo(7, 1);
    expect(lateral.piorPorMedida['meia largura à esquerda'].desvio).toBeCloseTo(-7, 1);
    const comprimento = silhuetaPedida(facesDaGaiola(CORPO, [0, 0, 7]), CORPO);
    expect(Math.abs(Math.abs(comprimento.pior.desvio) - 7)).toBeLessThan(0.5);
    /* para o maior comprimento a ponta do início fica para dentro e a do fim para fora */
    expect(comprimento.piorPorMedida['início no centro'].desvio).toBeCloseTo(-7, 1);
    expect(comprimento.piorPorMedida['fim no centro'].desvio).toBeGreaterThan(6.5);
  });

  it('a seção corta cada face que atravessa o plano uma vez e devolve [l, c]', () => {
    const quadrado = [{ pts: [[0, 0, 0], [10, 0, 0], [10, 10, 5], [0, 10, 5]] }];
    expect(secao(quadrado, 'y', 5)).toEqual([[[10, 2.5], [0, 2.5]]]);
    expect(secao(quadrado, 'y', 20)).toEqual([]);
    expect(() => silhuetaPedida(quadrado, CAIXA, { eixo: 'w' })).toThrow('eixo é x, y ou z');
    expect(() => silhuetaPedida(quadrado, CAIXA, { laterais: [1] })).toThrow('frações da meia largura');
  });

  it('pela linha de comando lê o esboço, a parte e as vistas exportadas, e grava o JSON', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'silhueta-pedida-'));
    const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas(CAIXA);
    const g = gaiolaPorLacos({ nome: 'caixa', eixo: 'y', ...lacos });
    const esboco = { opcoes: [{ titulo: 'caixa', passos: [['subdivisao', { origemId: 1, ...g.passo, niveis: 1 }], ['parte', { nome: 'caixa', sel: { origem: { op: 'subdivisao', id: 1 } } }]], topo: g.pontosMm }] };
    const arquivo = join(pasta, 'caixa.esboco.mjs');
    writeFileSync(arquivo, `export const VISTAS = ${JSON.stringify(CAIXA)};\nexport default ${JSON.stringify(esboco)};\n`);
    const saida = join(pasta, 'medida.json');
    const r = await executar(['--esboco', arquivo, '--parte', 'caixa', '--vistas', 'VISTAS', '--passo', '50', '--saida', saida]);
    expect(r.stderr).toBe('');
    expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/^caixa contra VISTAS/);
    const json = JSON.parse(readFileSync(saida, 'utf8'));
    expect(json.parte).toBe('caixa');
    expect(json.faixas.length).toBeGreaterThan(5);
    /* a subdivisão arredonda a caixa: a malha fica para dentro do pedido */
    expect(json.pior.desvio).toBeLessThan(0);
    const errado = await executar(['--esboco', arquivo, '--parte', 'caixa', '--vistas', 'OUTRAS']);
    expect(errado.codigo).toBe(2);
    expect(errado.stderr).toContain('exporta VISTAS');
    const semParte = await executar(['--esboco', arquivo, '--parte', 'tampa', '--vistas', 'VISTAS']);
    expect(semParte.stderr).toContain('a parte "tampa" não existe');
  });
});
