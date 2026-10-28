/* `soCamada: true`: a camada das formas sem montar o SVG, para quem mede só a silhueta (`tools/modelar/esboco-silhueta.mjs`).

   O SVG (título, legendas, rótulos, linhas de centro, barra de escala e o traço de cada forma) é a parte do desenho que a máscara da
   silhueta não lê, e passava de um quinto do custo de uma bateria de silhuetas. A prova é a igualdade: com e sem `soCamada`, em toda
   vista, no modo de colunas e no de lista, com legendas e sem, com duas opções lado a lado, a camada é a mesma (profundidade
   incluída) e o quadro tem a mesma escala e o mesmo tamanho. A única diferença é `svg` e `svgSobreCamada`, que saem vazios. O padrão
   (`soCamada` omitido) segue entregando o SVG inteiro. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { desenharEsboco, VISTAS } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { desenharBlocagem } from '../src/desenho-da-blocagem.js';

const ler = (nome) => JSON.parse(readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), 'utf8'));
const moto = ler('moto-parametros.esboco.json');
const mancal = ler('mancal-eixo.esboco.json');
const casa = ler('casa.esboco.json');

describe('a camada sem montar o SVG', () => {
  /* [nome, esboço, o que muda no esboço, as vistas]: a moto (a mais lenta) só em duas vistas, e as variantes em formas pequenas */
  const todas = Object.keys(VISTAS);
  const casos = [
    ['moto, colunas', moto, {}, ['isometrica', 'lateral']],
    ['moto, lista', moto, { legendas: 'lista' }, ['frontal']],
    ['mancal, sem legendas e sem linhas de centro', mancal, { ocultar: ['legendas', 'linhasCentro'] }, todas],
    ['mancal, com linhas de centro', mancal, { linhasCentro: true }, todas],
    ['mancal, prévia', mancal, { previa: true }, ['isometrica']],
    ['casa, com os lados por escala', casa, { ladosPorEscala: true }, todas],
  ];
  for (const [nome, base, extra, vistas] of casos) {
    for (const vista of vistas) {
      it(`${nome}, ${vista}: a mesma camada e o mesmo quadro, e o SVG vazio`, () => {
        const esboco = { ...expandirEsboco(base), vista, ...extra };
        const completo = desenharEsboco(esboco, { camada: true, perfilDosTracos: false });
        const so = desenharEsboco(esboco, { camada: true, perfilDosTracos: false, soCamada: true });
        expect(so.camada).toEqual(completo.camada);
        expect([so.largura, so.altura, so.escala]).toEqual([completo.largura, completo.altura, completo.escala]);
        expect(completo.svg.length).toBeGreaterThan(1000);
        expect(so.svg).toBe('');
        expect(so.svgSobreCamada).toBe('');
      });
    }
  }

  it('duas opções lado a lado têm a mesma camada, e o padrão segue com o SVG', () => {
    const e = expandirEsboco(mancal);
    const duas = { ...e, opcoes: [e.opcoes[0], { ...e.opcoes[0], titulo: 'segunda' }], vista: 'lateral' };
    const completo = desenharEsboco(duas, { camada: true });
    const so = desenharEsboco(duas, { camada: true, soCamada: true });
    expect(so.camada).toEqual(completo.camada);
    expect(so.largura).toBe(completo.largura);
    expect(so.svg).toBe('');
    const padrao = desenharEsboco(duas, { camada: true });
    expect(padrao.svg).toBe(completo.svg);
    expect(padrao.svgSobreCamada).toBe(completo.svgSobreCamada);
  });

  it('sem `camada`, `soCamada` não muda nada: o SVG sai inteiro', () => {
    const esboco = expandirEsboco(casa);
    expect(desenharEsboco(esboco, { soCamada: true }).svg).toBe(desenharEsboco(esboco).svg);
  });
});

describe('a camada da blocagem sem montar o SVG', () => {
  it('a mesma camada, o mesmo quadro e os mesmos paineis, e o SVG vazio, em toda vista', () => {
    /* a caixa de 100 x 60 x 40 mm, 12 triângulos vistos de fora, num só volume, e um segundo painel com título e nota */
    const vertices = [];
    for (const sz of [-1, 1]) for (const sy of [-1, 1]) for (const sx of [-1, 1]) vertices.push([sx * 50, sy * 30, sz * 20]);
    const quad = (a, b, c, d) => [[a, b, c], [a, c, d]];
    const triangulos = [...quad(1, 0, 2, 3), ...quad(4, 5, 7, 6), ...quad(0, 1, 5, 4), ...quad(2, 6, 7, 3), ...quad(0, 4, 6, 2), ...quad(1, 3, 7, 5)];
    const painel = { malha: { vertices, faces: triangulos.map((t) => ({ vertices: t, volume: 'v' })) }, volumes: [{ id: 'v', cor: '#999999' }] };
    for (const vista of Object.keys(VISTAS)) {
      const entrada = { vista, paineis: [painel, { ...painel, titulo: 'segundo', nota: 'uma nota' }] };
      const completo = desenharBlocagem(entrada, { camada: true, perfilDosTracos: false });
      const so = desenharBlocagem(entrada, { camada: true, perfilDosTracos: false, soCamada: true });
      expect(so.camada).toEqual(completo.camada);
      expect([so.largura, so.altura, so.escala]).toEqual([completo.largura, completo.altura, completo.escala]);
      expect(so.paineis).toEqual(completo.paineis);
      expect(completo.svg.length).toBeGreaterThan(500);
      expect(so.svg).toBe('');
      expect(so.svgSobreCamada).toBe('');
    }
    expect(desenharBlocagem({ vista: 'frontal', paineis: [painel] }, { soCamada: true }).svg.length).toBeGreaterThan(500);
  });
});
