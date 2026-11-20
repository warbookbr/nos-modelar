/* Testes de referencia-grade.mjs: leitura de dimensões PNG/JPEG, conversão
   pixel↔milímetro (normal e espelhada) e geração de SVG com grade calibrada e recorte. */
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { criarConversor, gerarGradeSvg, lerDimensoesImagem } from './referencia-grade.mjs';

/* Constrói um PNG RGB mínimo válido em memória (sem dependência externa). */
function criarPngMinimo(largura, altura) {
  const crcTabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTabela[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1) c = crcTabela[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(dados.length, 0);
    const corpo = Buffer.concat([t, dados]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo), 0);
    return Buffer.concat([len, corpo, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const linha = Buffer.alloc(1 + largura * 3, 240);
  linha[0] = 0;
  const bruto = Buffer.concat(Array.from({ length: altura }, () => linha));
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, bloco('IHDR', ihdr), bloco('IDAT', deflateSync(bruto)), bloco('IEND', Buffer.alloc(0))]);
}

/* Constrói um cabeçalho JPEG mínimo com SOF0 para testar o parser de dimensões. */
function criarJpegCabecalho(largura, altura) {
  const sof = Buffer.alloc(11);
  sof[0] = 0xff; sof[1] = 0xc0;
  sof.writeUInt16BE(9, 2);
  sof[4] = 8;
  sof.writeUInt16BE(altura, 5);
  sof.writeUInt16BE(largura, 7);
  sof[9] = 3; sof[10] = 1;
  return Buffer.concat([Buffer.from([0xff, 0xd8]), sof, Buffer.from(new Array(20).fill(0)), Buffer.from([0xff, 0xd9])]);
}

describe('referencia-grade', () => {
  it('lê dimensões de PNG e JPEG sem dependência externa', () => {
    const png = criarPngMinimo(400, 200);
    expect(lerDimensoesImagem(png)).toEqual({ largura: 400, altura: 200, mime: 'image/png' });

    const jpg = criarJpegCabecalho(2400, 1792);
    expect(lerDimensoesImagem(jpg)).toEqual({ largura: 2400, altura: 1792, mime: 'image/jpeg' });
  });

  it('mapeia pixel e milímetro com erro abaixo de 0,5 mm, com e sem espelhamento', () => {
    const conv = criarConversor({
      caixa: [100, 200, 1100, 700],
      eixoH: [-2000, 2000],
      eixoV: [0, 1000],
      espelharX: false,
      larguraImg: 1200,
      alturaImg: 800,
    });
    expect(conv.mmParaPx([-2000, 1000])).toEqual([100, 200]);
    expect(conv.mmParaPx([2000, 0])).toEqual([1100, 700]);
    expect(conv.mmParaPx([0, 500])).toEqual([600, 450]);

    const volta = conv.pxParaMm([350, 450]);
    expect(volta[0]).toBeCloseTo(-1000, 6);
    expect(volta[1]).toBeCloseTo(500, 6);

    const esp = criarConversor({
      caixa: [100, 200, 1000, 700],
      eixoH: [-2000, 2000],
      eixoV: [0, 1000],
      espelharX: true,
      larguraImg: 1200,
      alturaImg: 800,
    });
    /* caixa [100..1000] numa imagem de 1200 px espelha para [200..1100] */
    expect(esp.caixaExibida).toEqual([200, 200, 1100, 700]);
    expect(esp.mmParaPx([-2000, 0])).toEqual([200, 700]);
    expect(esp.mmParaPx([2000, 1000])).toEqual([1100, 200]);
  });

  it('gera SVG válido com imagem embutida, linhas de grade, rótulos e recorte ampliado', () => {
    const png = criarPngMinimo(400, 200);
    const { svg } = gerarGradeSvg({
      imagemBuf: png,
      caixa: [40, 20, 360, 180],
      eixoH: [-1000, 1000],
      eixoV: [0, 1000],
      passoMm: 500,
      passoMenorMm: 250,
      rotuloH: 'z',
      rotuloV: 'y',
    });
    expect(svg).toContain('<svg ');
    expect(svg).toContain('data:image/png;base64,');
    expect(svg).toContain('>-500</text>');
    expect(svg).toContain('>500</text>');

    const recorte = gerarGradeSvg({
      imagemBuf: png,
      caixa: [40, 20, 360, 180],
      eixoH: [-1000, 1000],
      eixoV: [0, 1000],
      passoMm: 100,
      recorteMm: [0, 500, 1000, 1000],
    });
    expect(recorte.svg).toContain('>700</text>');
    expect(recorte.svg).not.toContain('>-800</text>');
  });
});
