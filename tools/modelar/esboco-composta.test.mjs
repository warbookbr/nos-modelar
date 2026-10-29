/* esboco-composta.test.mjs — o `--composta` do esboço: uma imagem só com as quatro vistas sem legenda em grade 2x2, 1100 px
   de largura no total, cada quadrante igual ao desenho por pixel de `desenhoParaBuffer`, e a mesma saída para a mesma entrada. */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, describe, expect, it } from 'vitest';
import { desenharEsboco } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { compostaArquivo, desenhoParaBuffer, LARGURA_DA_COMPOSTA, OPCOES_DA_CAMADA, variante, VISTAS_DA_ANALISE } from './esboco.mjs';

const PASTA = mkdtempSync(join(tmpdir(), 'esboco-composta-'));
afterAll(() => rmSync(PASTA, { recursive: true, force: true }));

/* Um esboço pequeno de duas opções de forma: caixa e cilindro sobre ela, com as quatro vistas bem diferentes. */
const ARQUIVO = join(PASTA, 'mesa.esboco.json');
writeFileSync(ARQUIVO, `${JSON.stringify({
  opcoes: [{
    titulo: 'Mesa',
    formas: [
      { id: 'tampo', tipo: 'caixa', largura: 160, altura: 12, profundidade: 90, centro: [0, 70, 0], cor: 'cinza' },
      { id: 'perna', tipo: 'cilindro', diametro: 14, comprimento: 70, eixo: 'y', sobre: 'tampo', cor: 'azul' },
    ],
  }],
}, null, 2)}\n`);

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

describe('--composta', () => {
  it('grava uma imagem de 1100 px com as quatro vistas em quadrantes, cada uma igual ao desenho por pixel', async () => {
    const pasta = join(PASTA, 'uma');
    mkdirSync(pasta);
    const r = await compostaArquivo(ARQUIVO, { saida: pasta });
    expect(r.destino).toBe(join(pasta, 'mesa-composta.png'));
    expect(r.celula).toBe(LARGURA_DA_COMPOSTA / 2);
    const grade = PNG.sync.read(readFileSync(r.destino));
    expect(grade.width).toBe(LARGURA_DA_COMPOSTA);
    expect(grade.height).toBe(r.altura);

    const { chromium } = await import('playwright');
    const navegador = await chromium.launch();
    try {
      const expandido = expandirEsboco(JSON.parse(readFileSync(ARQUIVO, 'utf8')));
      const posicoes = [[0, 0], [1, 0], [0, 1], [1, 1]];
      let alturas = [0, 0];
      const vistas = [];
      for (const v of VISTAS_DA_ANALISE) {
        const d = desenharEsboco(variante({ ...expandido, ladosPorEscala: expandido.ladosPorEscala ?? true }, { vista: v, legendas: false, centros: false }), OPCOES_DA_CAMADA);
        const { png } = await desenhoParaBuffer(d, r.celula, navegador);
        vistas.push(PNG.sync.read(png));
      }
      vistas.forEach((img, i) => { alturas[posicoes[i][1]] = Math.max(alturas[posicoes[i][1]], img.height); });
      vistas.forEach((img, i) => {
        const [coluna, linha] = posicoes[i];
        const x0 = coluna * r.celula;
        const y0 = linha === 0 ? 0 : alturas[0];
        const dy = Math.floor((alturas[linha] - img.height) / 2);
        let difere = 0;
        let semAlfa = 0;
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const s = (y * img.width + x) * 4;
            const t = ((y0 + dy + y) * grade.width + x0 + x) * 4;
            if (img.data[s + 3] !== 255) semAlfa++;
            if (grade.data[t] !== img.data[s] || grade.data[t + 1] !== img.data[s + 1] || grade.data[t + 2] !== img.data[s + 2]) difere++;
          }
        }
        expect({ quadrante: VISTAS_DA_ANALISE[i], semAlfa, difere }).toEqual({ quadrante: VISTAS_DA_ANALISE[i], semAlfa: 0, difere: 0 });
      });
    } finally {
      await navegador.close();
    }
  }, 90_000);

  it('é determinística: o mesmo esboço gera a mesma imagem, byte a byte', async () => {
    const a = join(PASTA, 'det-a');
    const b = join(PASTA, 'det-b');
    mkdirSync(a);
    mkdirSync(b);
    const ra = await compostaArquivo(ARQUIVO, { saida: a });
    const rb = await compostaArquivo(ARQUIVO, { saida: b });
    expect(sha(readFileSync(ra.destino))).toBe(sha(readFileSync(rb.destino)));
  }, 90_000);

  it('a largura pedida muda o tamanho, e a metade de cada vista acompanha', async () => {
    const pasta = join(PASTA, 'estreita');
    mkdirSync(pasta);
    const r = await compostaArquivo(ARQUIVO, { largura: 800, saida: pasta });
    const grade = PNG.sync.read(readFileSync(r.destino));
    expect([grade.width, r.celula]).toEqual([800, 400]);
  }, 90_000);
});
