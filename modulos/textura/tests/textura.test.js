// Testes do gerador de textura: determinismo, tile contínuo, veio, tábuas, liso e recusas.
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { ErroDeTextura, gerarTextura, texturaParaPng } from '../src/index.js';

const hash = (t) => createHash('sha256').update(t.rgba).digest('hex');
const madeira = { tipo: 'madeira', cor: [95, 48, 30], desgaste: 0.3, veio: 1 };

// Diferença média absoluta entre duas colunas (ou linhas) de pixels, no canal de luminância aproximada.
function diferenca(t, a, b, coluna) {
  const { largura: W, altura: H, rgba } = t;
  let soma = 0;
  const n = coluna ? H : W;
  for (let k = 0; k < n; k += 1) {
    const pa = coluna ? k * W + a : a * W + k;
    const pb = coluna ? k * W + b : b * W + k;
    for (let c = 0; c < 3; c += 1) soma += Math.abs(rgba[pa * 4 + c] - rgba[pb * 4 + c]);
  }
  return soma / (n * 3);
}

function mediaInterna(t, coluna) {
  const n = t.largura;
  let soma = 0;
  for (let k = 1; k < n; k += 1) soma += diferenca(t, k - 1, k, coluna);
  return soma / (n - 1);
}

describe('gerarTextura', () => {
  it('devolve um tile RGBA sRGB opaco de 0,5 m para madeira', () => {
    const t = gerarTextura(madeira, { px: 128 });
    expect(t.largura).toBe(128);
    expect(t.altura).toBe(128);
    expect(t.metrosPorTile).toBe(0.5);
    expect(t.rgba).toBeInstanceOf(Uint8ClampedArray);
    expect(t.rgba.length).toBe(128 * 128 * 4);
    for (let p = 3; p < t.rgba.length; p += 4) expect(t.rgba[p]).toBe(255);
  });

  it('é determinístico e a semente muda a imagem', () => {
    const a = gerarTextura(madeira, { px: 128, semente: 3 });
    const b = gerarTextura(madeira, { px: 128, semente: 3 });
    const c = gerarTextura(madeira, { px: 128, semente: 4 });
    expect(hash(a)).toBe(hash(b));
    expect(hash(a)).not.toBe(hash(c));
  });

  it('a média de cor fica perto da cor pedida', () => {
    const t = gerarTextura({ ...madeira, desgaste: 0 }, { px: 128 });
    const m = [0, 0, 0];
    for (let p = 0; p < t.rgba.length; p += 4) for (let c = 0; c < 3; c += 1) m[c] += t.rgba[p + c];
    const n = t.rgba.length / 4;
    m.forEach((v, c) => expect(Math.abs(v / n - madeira.cor[c])).toBeLessThan(22));
  });

  it('é contínuo na emenda, com e sem tábuas e com desgaste', () => {
    for (const material of [madeira, { ...madeira, desgaste: 0.6, veio: 3 }, { ...madeira, tabuas: 4, borda: 0.5 }]) {
      const t = gerarTextura(material, { px: 128 });
      const lateral = diferenca(t, 127, 0, true);
      const vertical = diferenca(t, 127, 0, false);
      // a emenda se parece com um par de pixels vizinhos qualquer (tolerância de 2x e um piso de 4 níveis)
      expect(lateral).toBeLessThan(Math.max(4, 2 * mediaInterna(t, true)));
      expect(vertical).toBeLessThan(Math.max(4, 2 * mediaInterna(t, false)));
    }
  });

  it('veio maior aumenta o contraste e desgaste maior muda a imagem', () => {
    const desvio = (t) => {
      let s = 0;
      let s2 = 0;
      const n = t.rgba.length / 4;
      for (let p = 0; p < t.rgba.length; p += 4) {
        s += t.rgba[p];
        s2 += t.rgba[p] ** 2;
      }
      return Math.sqrt(s2 / n - (s / n) ** 2);
    };
    const v1 = gerarTextura({ ...madeira, desgaste: 0, veio: 1 }, { px: 128 });
    const v3 = gerarTextura({ ...madeira, desgaste: 0, veio: 3 }, { px: 128 });
    expect(desvio(v3)).toBeGreaterThan(desvio(v1) * 1.5);
    const d6 = gerarTextura({ ...madeira, desgaste: 0.6 }, { px: 128 });
    expect(hash(d6)).not.toBe(hash(v1));
  });

  it('tábuas deixam juntas escuras ao longo do veio', () => {
    const t = gerarTextura({ ...madeira, desgaste: 0, tabuas: 4 }, { px: 256 });
    const linha = (y) => {
      let s = 0;
      for (let x = 0; x < 256; x += 1) s += t.rgba[(y * 256 + x) * 4];
      return s / 256;
    };
    // junta entre a primeira e a segunda tábua em y = 64; compara com o meio da tábua
    expect(Math.min(linha(63), linha(64))).toBeLessThan(linha(32) * 0.9);
  });

  it('liso é uma cor lisa com variação leve', () => {
    const t = gerarTextura({ tipo: 'liso', cor: [200, 40, 40], desgaste: 0.2 }, { px: 64 });
    expect(Math.abs(t.rgba[0] - 200)).toBeLessThan(30);
    expect(t.metrosPorTile).toBe(0.5);
  });

  it('recusa tipo desconhecido e entradas inválidas', () => {
    expect(() => gerarTextura({ tipo: 'vidro', cor: [1, 2, 3] })).toThrow(/desconhecido/);
    expect(() => gerarTextura({ tipo: 'toString', cor: [1, 2, 3] })).toThrow(/desconhecido/);
    expect(() => gerarTextura({ tipo: 'madeira' })).toThrow(/cor/);
    expect(() => gerarTextura({ ...madeira, desgaste: 2 })).toThrow(/desgaste/);
    expect(() => gerarTextura({ tipo: 'metal', cor: [1, 2, 3], acabamento: 'x' })).toThrow(/acabamento/);
    expect(() => gerarTextura({ tipo: 'tecido', cor: [1, 2, 3], rasgos: 3 })).toThrow(/rasgos/);
    expect(() => gerarTextura(madeira, { px: 3 })).toThrow(/px/);
  });
});

describe('texturaParaPng', () => {
  it('devolve um PNG que volta com os mesmos pixels, sempre com os mesmos bytes', () => {
    const t = gerarTextura(madeira, { px: 64 });
    const a = texturaParaPng(t);
    const b = texturaParaPng(t);
    expect(a).toBeInstanceOf(Uint8Array);
    expect(createHash('sha256').update(a).digest('hex')).toBe(createHash('sha256').update(b).digest('hex'));
    const lido = PNG.sync.read(Buffer.from(a));
    expect(lido.width).toBe(64);
    expect(Buffer.compare(lido.data, Buffer.from(t.rgba))).toBe(0);
  });
});
