/* `--zoom-forma <id|padrão>`: o desenho é reenquadrado na forma (ou nas formas do padrão) com uma margem em mm e rasterizado
   na resolução cheia, em vez de ampliar pixels: a escala sobe, as facetas das curvas acompanham a escala, o que cai fora do
   quadro não é desenhado e o que o corta é recortado no quadro. Medido em px por mm. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
import { desenharEsboco, ErroDeEsboco, validarEsboco } from '../src/index.js';
import { lerArgumentos, vistasArquivo, unidadeArquivo } from '../../../tools/mecanifica/esboco.mjs';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 40, altura: 40, profundidade: 40, centro, ...extra });
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], ...extra });
const cena = () => [caixa('longe', [-800, 0, 0]), caixa('a', [0, 0, 0]), caixa('g.1', [300, 0, 0]), caixa('g.2', [400, 0, 0]), caixa('fim', [900, 0, 0])];
const caminhos = (svg) => (svg.match(/<path /g) ?? []).length;

describe('--zoom-forma: reenquadra e re-renderiza', () => {
  it('a janela é a caixa da forma mais a margem, e a escala é a que cabe no painel (medida exata)', () => {
    const inteiro = desenharEsboco(esboco(cena(), { vista: 'frontal' }));
    const zoom = desenharEsboco(esboco(cena(), { vista: 'frontal', enquadrar: { formas: 'a', margem: 10 } }));
    /* janela de 40 + 2 x 10 = 60 mm de lado; a colunas do painel dão (620 - 340) / 60 px por mm */
    expect(zoom.escala).toBeCloseTo(280 / 60, 9);
    expect(zoom.escala).toBeGreaterThan(inteiro.escala * 10);
    /* o quadro da imagem é o mesmo: o ganho é de detalhe vetorial, não de pixels ampliados */
    expect([zoom.largura, zoom.altura]).toEqual([inteiro.largura, inteiro.altura]);
  });

  it('só o que cruza a janela é desenhado, e o que a corta é recortado no quadro', () => {
    const inteiro = desenharEsboco(esboco(cena(), { vista: 'frontal' }));
    const zoom = desenharEsboco(esboco(cena(), { vista: 'frontal', enquadrar: { formas: 'a', margem: 10 } }));
    expect(caminhos(zoom.svg)).toBeLessThan(caminhos(inteiro.svg));
    expect(zoom.svg).toContain('clip-path');
    expect(inteiro.svg).not.toContain('clip-path');
    const largo = desenharEsboco(esboco(cena(), { vista: 'frontal', enquadrar: { formas: 'a', margem: 400 } }));
    expect(caminhos(largo.svg)).toBeGreaterThan(caminhos(zoom.svg));
  });

  it('um padrão enquadra o conjunto das formas que casam', () => {
    const zoom = desenharEsboco(esboco(cena(), { vista: 'frontal', enquadrar: { formas: 'g.*', margem: 10 } }));
    /* g.1 e g.2 vão de x=280 a 420: 140 + 20 = 160 mm de largura */
    expect(zoom.escala).toBeCloseTo(280 / 160, 9);
  });

  it('funciona nas quatro vistas', () => {
    /* formas espalhadas nos três eixos: em cada vista duas delas ficam longe de `a` na tela */
    const espalhada = [caixa('a', [0, 0, 0]), caixa('b', [-800, -800, -800]), caixa('c', [900, 900, 900]), caixa('d', [-800, 900, -800])];
    for (const vista of ['isometrica', 'frontal', 'lateral', 'superior']) {
      const inteiro = desenharEsboco(esboco(espalhada, { vista }));
      const zoom = desenharEsboco(esboco(espalhada, { vista, enquadrar: { formas: 'a', margem: 10 } }));
      expect(zoom.escala, vista).toBeGreaterThan(inteiro.escala * 3);
    }
  });

  it('as facetas das curvas acompanham a escala do zoom', () => {
    const formas = [{ id: 'furo', tipo: 'cilindro', diametro: 20, comprimento: 30, eixo: 'z', centro: [0, 0, 0] }, caixa('muro', [1500, 0, 0], { largura: 1000 })];
    const lados = (e) => validarEsboco(e).opcoes[0].formas.find((r) => r.id === 'furo').prisma.perfil.length;
    const inteiro = lados(esboco(formas, { vista: 'frontal', ladosPorEscala: true }));
    const zoom = lados(esboco(formas, { vista: 'frontal', ladosPorEscala: true, enquadrar: { formas: 'furo', margem: 5 } }));
    expect(zoom).toBeGreaterThan(inteiro * 2);
  });

  it('junto do corte: o quadro é o da forma já cortada, e a superfície de corte aparece', () => {
    const formas = [{ id: 'cubo', tipo: 'anel', diametroExterno: 60, diametroInterno: 20, espessura: 40, eixo: 'x', centro: [0, 0, 0] }, { id: 'eixo', tipo: 'cilindro', diametro: 20, comprimento: 400, eixo: 'x', centro: [0, 0, 0] }];
    const base = { vista: 'frontal', corte: { eixo: 'z', valor: 0 } };
    const inteiro = desenharEsboco(esboco(formas, base));
    const zoom = desenharEsboco(esboco(formas, { ...base, enquadrar: { formas: 'cubo', margem: 5 } }));
    expect(zoom.svg).toContain('class="corte"');
    /* o cubo cortado ocupa 40 x 60 mm: com 5 mm de margem a janela é 50 x 70 */
    expect(zoom.escala).toBeCloseTo(Math.min(280 / 50, 520 / 70), 6);
    expect(zoom.escala).toBeGreaterThan(inteiro.escala * 2);
  });

  it('o id da instância, o id de forma e o padrão valem; o que não existe diz o que corrigir', () => {
    const formas = [caixa('roda.pneu', [0, 0, 0], { daInstancia: { id: 'roda', principal: true } }), caixa('roda.aro', [100, 0, 0], { daInstancia: { id: 'roda', principal: false } }), caixa('outra', [900, 0, 0])];
    const e = (q) => esboco(formas, { vista: 'frontal', enquadrar: { formas: q, margem: 0 } });
    expect(desenharEsboco(e('roda')).escala).toBeCloseTo(280 / 140, 9);
    expect(desenharEsboco(e('roda.pneu')).escala).toBeCloseTo(280 / 40, 9);
    expect(() => desenharEsboco(e('rodda'))).toThrow(/"rodda" não é uma forma.*roda/);
    expect(() => desenharEsboco(esboco(formas, { enquadrar: { formas: 'roda', margem: -1 } }))).toThrow(ErroDeEsboco);
  });

  it('sem enquadrar o desenho é o de sempre', () => {
    const a = desenharEsboco(esboco(cena(), { vista: 'lateral' }));
    expect(a.svg).not.toContain('clip-path');
    expect(desenharEsboco(esboco(cena(), { vista: 'lateral' })).svg).toBe(a.svg);
  });
});

describe('--zoom-forma na linha de comando', () => {
  it('lê --zoom-forma e --margem', () => {
    const a = lerArgumentos(['m.esboco.json', '--unidade', 'u', '--zoom-forma', 'garfoE.*', '--margem', '25']);
    expect(a.valor('--zoom-forma')).toBe('garfoE.*');
    expect(a.valor('--margem')).toBe('25');
  });

  it('grava a vista reenquadrada com o mesmo quadro de pixels, em quatro vistas, e junto do corte', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'zoom-'));
    const arq = join(pasta, 'z.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco(cena().map((f) => ({ ...f, unidade: 'u' })))));
    const normal = await unidadeArquivo(arq, 'u', { largura: 700 });
    const zoom = await unidadeArquivo(arq, 'u', { largura: 700, zoomForma: { formas: 'a', margem: 10 } });
    expect(zoom.destinos).toHaveLength(4);
    expect(zoom.destinos[0]).toMatch(/-unidade-u-zoom-a-isometrica\.png$/);
    zoom.destinos.forEach((d, i) => {
      const a = PNG.sync.read(readFileSync(d)); const b = PNG.sync.read(readFileSync(normal.destinos[i]));
      expect([a.width, a.height]).toEqual([b.width, b.height]);
    });
    const comCorte = await vistasArquivo(arq, { vista: 'frontal', corte: { eixo: 'z', valor: 0 }, zoomForma: { formas: 'g.*', margem: 20 } });
    expect(comCorte.destinos[0]).toMatch(/z-corte-z0-zoom-g\.todas-frontal\.png$/);
    expect(comCorte.svgs[0]).toContain('clip-path');
    expect(comCorte.svgs[0]).toContain('class="corte"');
  });

  it('o zoom entra no hash: outro zoom no mesmo nome não é reaproveitado', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'zoom-'));
    const arq = join(pasta, 'z.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco(cena().map((f) => ({ ...f, unidade: 'u' })))));
    await vistasArquivo(arq, { unidade: 'u', vista: 'frontal', zoomForma: { formas: 'a', margem: 10 } });
    expect((await vistasArquivo(arq, { unidade: 'u', vista: 'frontal', zoomForma: { formas: 'a', margem: 10 } })).reaproveitadas).toEqual([true]);
    expect((await vistasArquivo(arq, { unidade: 'u', vista: 'frontal', zoomForma: { formas: 'a', margem: 30 } })).reaproveitadas).toEqual([false]);
  });
});
