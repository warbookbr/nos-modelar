/* Testes de prancha-sobrepor.mjs: extração limpa só da geometria (sem título/legenda),
   modos escala-rigida e proporcao-foto, quadro 2×2 e medida de desvio contra contorno. */
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  criarMapeadorSobrepor,
  extrairGeometriaDaPrancha,
  gerarQuadroSobreposicaoSvg,
  gerarSobreposicaoSvg,
  medirDesvioContorno,
} from './prancha-sobrepor.mjs';

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
  ihdr[8] = 8; ihdr[9] = 2;
  const linha = Buffer.alloc(1 + largura * 3, 240);
  linha[0] = 0;
  const bruto = Buffer.concat(Array.from({ length: altura }, () => linha));
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, bloco('IHDR', ihdr), bloco('IDAT', deflateSync(bruto)), bloco('IEND', Buffer.alloc(0))]);
}

const SPEC_CAIXA = {
  titulo: 'TÍTULO QUE NÃO PODE DESLOCAR A CAIXA',
  subtitulo: 'subtítulo longo',
  escala: 0.3,
  tela: { largura: 1000, altura: 600 },
  limites: { zMin: -1000, zMax: 1000, yMax: 1000, xMax: 500 },
  vistas: { lateral: { x: 100, y: 120, leitura: 'projecao', rotulo: 'LATERAL' } },
  envelope: { comprimento: 2000, altura: 1000 },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    modo: 'parcial',
    confianca: 'alta',
    intencao: 'fixture sintética 2000 x 1000 mm',
    procedencias: [{ id: 'f', tipo: 'medidas-declaradas', evidencia: 'caixa 2000 x 1000' }],
    incertezas: [],
  },
  camadas: [
    { vista: 'lateral', contorno: true, nome: 'corpo', tipo: 'poli', fechado: true, pts: [[-1000, 0], [1000, 0], [1000, 1000], [-1000, 1000]] },
    { vista: 'lateral', classe: 'vidro', nome: 'janela', tipo: 'poli', fechado: true, pts: [[-400, 500], [400, 500], [400, 850], [-400, 850]] },
  ],
  cotas: [{ vista: 'lateral', de: [-1000, 0], ate: [1000, 0], desloca: [0, 80], texto: '2.000' }],
  legenda: { x: 100, y: 520, itens: [['#000', 'legenda longe']], notas: [] },
};

describe('prancha-sobrepor', () => {
  it('extrai somente as camadas geométricas e ignora título, cotas e legenda na caixa', () => {
    const geo = extrairGeometriaDaPrancha(SPEC_CAIXA);
    expect(geo.vista).toBe('lateral');
    expect(geo.camadas.length).toBe(2);
    expect(geo.envelopeMm).toEqual({ uMin: -1000, uMax: 1000, vMin: 0, vMax: 1000 });
  });

  it('separa escala-rigida (proporção da tabela) de proporcao-foto (caixa exata da foto)', () => {
    const geo = extrairGeometriaDaPrancha(SPEC_CAIXA);
    /* Foto com razão 2.5 (1000×400 px) contra prancha de razão 2.0 (2000×1000 mm) */
    const rigida = criarMapeadorSobrepor({
      envelopeMm: geo.envelopeMm, caixa: [100, 100, 1100, 500],
      larguraImg: 1200, alturaImg: 600, modo: 'escala-rigida',
    });
    expect(rigida.razaoFoto).toBeCloseTo(2.5, 4);
    expect(rigida.razaoPrancha).toBeCloseTo(2.0, 4);
    expect(rigida.desvioRazaoPct).toBeCloseTo(25, 1);

    const foto = criarMapeadorSobrepor({
      envelopeMm: geo.envelopeMm, caixa: [100, 100, 1100, 500],
      larguraImg: 1200, alturaImg: 600, modo: 'proporcao-foto',
    });
    expect(foto.mmParaPx([-1000, 1000])).toEqual([100, 100]);
    expect(foto.mmParaPx([1000, 0])).toEqual([1100, 500]);
  });

  it('gera SVG individual e quadro 2×2 sem título/legenda da prancha', () => {
    const png = criarPngMinimo(600, 400);
    const { svg } = gerarSobreposicaoSvg({
      spec: SPEC_CAIXA, imagemBuf: png, caixa: [50, 50, 550, 300], modo: 'proporcao-foto',
    });
    expect(svg).toContain('data-camada="corpo"');
    expect(svg).toContain('data-camada="janela"');
    expect(svg).not.toContain('TÍTULO QUE NÃO PODE DESLOCAR');

    const quadro = gerarQuadroSobreposicaoSvg([
      { spec: SPEC_CAIXA, imagemBuf: png, caixa: [50, 50, 550, 300] },
      { spec: SPEC_CAIXA, imagemBuf: png, caixa: [50, 50, 550, 300] },
    ]);
    expect(quadro.vistas.length).toBe(2);
    expect(quadro.svg).toContain('<svg ');
  });

  it('mede desvio conhecido contra contorno de referência com erro abaixo de 2 mm', () => {
    const ref = [[-1000, 0], [1000, 0], [1000, 1000], [-1000, 1000], [-1000, 0]];
    /* Polilinha deslocada exatamente 15 mm para cima no topo */
    const pranchaPts = [[-500, 1015], [0, 1015], [500, 1015]];
    const m = medirDesvioContorno(pranchaPts, ref);
    expect(m.medianaMm).toBeCloseTo(15, 1);
    expect(m.maxMm).toBeCloseTo(15, 1);
    expect(Math.abs(m.maxMm - 15)).toBeLessThan(2);
  });
});
