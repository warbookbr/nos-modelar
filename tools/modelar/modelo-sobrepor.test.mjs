/* Testes de modelo-sobrepor.mjs: projeção ortográfica 3D nas quatro vistas,
   medida de desvio contra prancha com erro < 2 mm, SVG individual, sobreposição
   sobre imagem calibrada e quadro 2×2. */
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  comoCLI,
  extrairContornoVista3D,
  gerarQuadroModeloSvg,
  gerarSobreposicaoModeloSvg,
  medirDesvioModeloContraPrancha,
} from './modelo-sobrepor.mjs';
import { extrairGeometriaDaPrancha } from './prancha/prancha-sobrepor.mjs';

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
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dados.length, 0);
    const corpo = Buffer.concat([t, dados]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(corpo), 0);
    return Buffer.concat([len, corpo, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const linha = Buffer.alloc(1 + largura * 3, 240);
  linha[0] = 0;
  const bruto = Buffer.concat(Array.from({ length: altura }, () => linha));
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, bloco('IHDR', ihdr), bloco('IDAT', deflateSync(bruto)), bloco('IEND', Buffer.alloc(0))]);
}

/* Constrói uma malha de caixa em metros: x em [xMin, xMax], y em [yMin, yMax], z em [zMin, zMax]. */
function criarMalhaCaixaMetros({ xMin, xMax, yMin, yMax, zMin, zMax }) {
  const posicoes = [
    xMin, yMin, zMin, // 0
    xMax, yMin, zMin, // 1
    xMax, yMax, zMin, // 2
    xMin, yMax, zMin, // 3
    xMin, yMin, zMax, // 4
    xMax, yMin, zMax, // 5
    xMax, yMax, zMax, // 6
    xMin, yMax, zMax, // 7
  ];
  const indices = [
    0, 2, 1, 0, 3, 2, // trás (zMin)
    4, 5, 6, 4, 6, 7, // frente (zMax)
    0, 1, 5, 0, 5, 4, // base (yMin)
    3, 7, 6, 3, 6, 2, // topo (yMax)
    0, 4, 7, 0, 7, 3, // esquerda (xMin)
    1, 2, 6, 1, 6, 5, // direita (xMax)
  ];
  return { nome: 'caixa-teste', posicoes, indices };
}

function criarSpecCaixa(vista, pts) {
  return {
    titulo: `Teste ${vista}`,
    escala: 0.25,
    tela: { largura: 1000, altura: 700 },
    limites: { zMin: -1000, zMax: 1000, yMax: 1000, xMax: 600 },
    vistas: { [vista]: { x: 100, y: 100, leitura: 'projecao', rotulo: vista.toUpperCase() } },
    envelope: { comprimento: 2000, largura: 1200, altura: 1000 },
    autoria: {
      versao: 'mecanifica.prancha-autoria@1',
      estado: 'pronta',
      modo: 'parcial',
      confianca: 'alta',
      intencao: 'fixture sintética para modelo:sobrepor',
      procedencias: [{ id: 'f', tipo: 'medidas-declaradas', evidencia: 'caixa 2000 x 1200 x 1000' }],
      incertezas: [],
    },
    camadas: [
      { vista, contorno: true, nome: 'silhueta', tipo: 'poli', fechado: true, pts },
    ],
  };
}

const SPEC_LATERAL = criarSpecCaixa('lateral', [[-1000, 0], [1000, 0], [1000, 1000], [-1000, 1000]]);
const SPEC_FRONTAL = criarSpecCaixa('frontal', [[-600, 0], [600, 0], [600, 1000], [-600, 1000]]);
const SPEC_TRASEIRA = criarSpecCaixa('traseira', [[-600, 0], [600, 0], [600, 1000], [-600, 1000]]);
const SPEC_PLANTA = criarSpecCaixa('planta', [[-1000, -600], [1000, -600], [1000, 600], [-1000, 600]]);

describe('modelo-sobrepor', () => {
  it('projeta as quatro vistas ortográficas em mm e mede desvio zero na caixa exata', () => {
    const malha = criarMalhaCaixaMetros({
      xMin: -0.6, xMax: 0.6,
      yMin: 0, yMax: 1.0,
      zMin: -1.0, zMax: 1.0,
    });

    for (const [vista, spec] of [
      ['lateral', SPEC_LATERAL],
      ['frontal', SPEC_FRONTAL],
      ['traseira', SPEC_TRASEIRA],
      ['planta', SPEC_PLANTA],
    ]) {
      const geo = extrairGeometriaDaPrancha(spec, vista);
      const proj = extrairContornoVista3D(malha, vista);
      const desvio = medirDesvioModeloContraPrancha(geo, proj, 20);
      expect(desvio.medianaMm).toBeLessThan(0.1);
      expect(desvio.maxMm).toBeLessThan(0.1);
    }
  });

  it('mede deslocamento conhecido de 20 mm na malha 3D com erro < 2 mm', () => {
    /* Caixa 20 mm mais baixa no topo (yMax = 980 mm em vez de 1000 mm) */
    const malha = criarMalhaCaixaMetros({
      xMin: -0.6, xMax: 0.6,
      yMin: 0, yMax: 0.98,
      zMin: -1.0, zMax: 1.0,
    });
    const geoLat = extrairGeometriaDaPrancha(SPEC_LATERAL, 'lateral');
    const projLat = extrairContornoVista3D(malha, 'lateral');
    const desvioLat = medirDesvioModeloContraPrancha(geoLat, projLat, 10);

    expect(Math.abs(desvioLat.maxMm - 20)).toBeLessThan(2);
    expect(Math.abs(desvioLat.p95Mm - 20)).toBeLessThan(2);
    expect(projLat.envelopeMm.vMax).toBeCloseTo(980, 3);
  });

  it('gera SVG individual (contra prancha e sobre imagem calibrada) e quadro 2×2', () => {
    const malha = criarMalhaCaixaMetros({
      xMin: -0.58, xMax: 0.58,
      yMin: 0, yMax: 0.98,
      zMin: -1.0, zMax: 1.0,
    });

    const sobrePrancha = gerarSobreposicaoModeloSvg({
      spec: SPEC_LATERAL,
      vista: 'lateral',
      malha,
    });
    expect(sobrePrancha.svg).toContain('data-origem="prancha"');
    expect(sobrePrancha.svg).toContain('data-origem="modelo-3d"');
    expect(Math.abs(sobrePrancha.desvio.maxMm - 20)).toBeLessThan(2);

    const png = criarPngMinimo(600, 400);
    const sobreImagem = gerarSobreposicaoModeloSvg({
      spec: SPEC_FRONTAL,
      vista: 'frontal',
      imagemBuf: png,
      caixa: [50, 40, 550, 340],
      modo: 'escala-rigida',
      malha,
    });
    expect(sobreImagem.svg).toContain('<image ');
    expect(sobreImagem.svg).toContain('data-origem="modelo-3d"');
    expect(sobreImagem.mapeador.modo).toBe('escala-rigida');

    const quadro = gerarQuadroModeloSvg([
      { spec: SPEC_LATERAL, vista: 'lateral', malha },
      { spec: SPEC_FRONTAL, vista: 'frontal', malha },
      { spec: SPEC_TRASEIRA, vista: 'traseira', malha },
      { spec: SPEC_PLANTA, vista: 'planta', malha },
    ]);
    expect(quadro.vistas.length).toBe(4);
    expect(quadro.svg).toContain('data-vista="lateral"');
    expect(quadro.svg).toContain('data-vista="frontal"');
    expect(quadro.svg).toContain('data-vista="traseira"');
    expect(quadro.svg).toContain('data-vista="planta"');
  });

  it('responde a --ajuda com código de saída 0', async () => {
    const codigo = await comoCLI(['--ajuda']);
    expect(codigo).toBe(0);
  });
});
