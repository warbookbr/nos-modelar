/* Testes do leitor de referência: decodificação PNG sem dependência, calibração
   por rodas, simplificação e comparação de silhueta. A prancha real não vive no
   repositório, então os casos montam a imagem em memória. */
import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  lerPng, acharPaineis, envelope, suavizarSerie, calibrarPorRodas,
  paraMilimetros, simplificar, compararSilhuetas,
} from './prancha-referencia.mjs';

/* PNG cinza de 8 bits, sem filtro, escrito à mão para não depender de nada. */
function escreverPng(largura, altura, pinta) {
  const bruto = Buffer.alloc(altura * (largura + 1), 0);
  for (let y = 0; y < altura; y += 1) {
    bruto[y * (largura + 1)] = 0;
    for (let x = 0; x < largura; x += 1) bruto[y * (largura + 1) + 1 + x] = pinta(x, y) ? 0 : 255;
  }
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo, 'ascii');
    const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
    const corpo = Buffer.concat([t, dados]);
    let c = ~0;
    for (const b of corpo) {
      c ^= b;
      for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    const crc = Buffer.alloc(4); crc.writeUInt32BE((~c) >>> 0);
    return Buffer.concat([tam, corpo, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr), bloco('IDAT', deflateSync(bruto)), bloco('IEND', Buffer.alloc(0)),
  ]);
  const p = join(mkdtempSync(join(tmpdir(), 'prancha-')), 'ref.png');
  writeFileSync(p, png);
  return p;
}

/* Lateral sintética: caixa de carroceria com teto em y = 30 e assoalho em y = 70,
   mais duas rodas de raio 15 centradas em y = 65, que descem até o solo em y = 80.
   Sem linha de chão desenhada — prancha de verdade também não tem, e desenhá-la
   fundia as duas manchas de contato numa só.
   Entre-eixos de 100 px vale 2000 mm, logo 20 mm/px e altura de 1000 mm. */
const LARG = 200; const ALT = 100;
const arquivo = escreverPng(LARG, ALT, (x, y) => {
  const noCorpo = x >= 10 && x <= 190;
  if (noCorpo && (y === 30 || y === 70)) return true;
  if ((x === 10 || x === 190) && y >= 30 && y <= 70) return true;
  for (const cx of [40, 140]) {
    const d = Math.hypot(x - cx, y - 65);
    if (d > 13 && d < 15.5) return true;
  }
  return false;
});

describe('lerPng', () => {
  it('decodifica sem navegador e sem dependência', () => {
    const img = lerPng(arquivo);
    expect(img.largura).toBe(LARG);
    expect(img.altura).toBe(ALT);
    expect(img.lum).toHaveLength(LARG * ALT);
  });

  it('acha o painel com tinta', () => {
    const { colunas, linhas } = acharPaineis(lerPng(arquivo));
    expect(colunas[0][0]).toBeGreaterThanOrEqual(10);
    expect(colunas[0][1]).toBeLessThanOrEqual(190);
    expect(linhas[0][0]).toBeLessThanOrEqual(30);
  });
});

describe('calibração por rodas', () => {
  const img = lerPng(arquivo);
  const ret = { x0: 10, x1: 190, y0: 25, y1: 85 };

  it('deriva a escala a partir do entre-eixos conhecido', () => {
    const cal = calibrarPorRodas(envelope(img, ret), ret, { entreEixos: 2000 });
    expect(cal.mmPorPx).toBeCloseTo(20, 1);
    expect(cal.centrosPx[0]).toBeCloseTo(40, 0);
    expect(cal.centrosPx[1]).toBeCloseTo(140, 0);
  });

  it('reporta resíduo contra medidas declaradas independentes', () => {
    const cal = calibrarPorRodas(envelope(img, ret), ret, { entreEixos: 2000, altura: 1000, comprimento: 3600 });
    expect(cal.residuo.altura.medido).toBeCloseTo(1000, -2);
    expect(cal.residuo.comprimento.medido).toBeCloseTo(3600, -2);
    expect(Math.abs(cal.residuo.altura.erroRelativo)).toBeLessThan(0.05);
  });

  it('recusa calibração cuja medida independente contradiz a escala', () => {
    expect(() => calibrarPorRodas(envelope(img, ret), ret, { entreEixos: 2000, altura: 1600 }))
      .toThrow(/calibração insuficiente/);
  });

  it('mede o resíduo contra a tinta, não contra o recorte com folga', () => {
    const justo = calibrarPorRodas(envelope(img, { x0: 10, x1: 190, y0: 30, y1: 80 }), ret, { entreEixos: 2000, altura: 1000 });
    const folgado = calibrarPorRodas(envelope(img, { x0: 0, x1: 199, y0: 0, y1: 99 }), ret, { entreEixos: 2000, altura: 1000 });
    expect(folgado.residuo.altura.medido).toBe(justo.residuo.altura.medido);
  });

  it('recusa quando não encontra duas rodas', () => {
    const semRodas = { topo: [10, 10], base: [20, 20], x0: 0 };
    expect(() => calibrarPorRodas(semRodas, ret, { entreEixos: 2000 })).toThrow(/roda/);
  });
});

describe('envelope e suavização', () => {
  it('mediana preserva degrau e remove tremor de um pixel', () => {
    const comTremor = [10, 10, 11, 10, 10, 40, 40, 41, 40];
    const liso = suavizarSerie(comTremor, { janela: 3 });
    expect(liso.slice(0, 4)).toEqual([10, 10, 10, 10]);
    expect(liso[liso.length - 1]).toBe(40);
  });

  it('converte para milímetro com z crescendo para a frente', () => {
    const img2 = lerPng(arquivo);
    const ret = { x0: 10, x1: 190, y0: 25, y1: 85 };
    const env = envelope(img2, ret);
    const cal = calibrarPorRodas(env, ret, { entreEixos: 2000 });
    const pts = paraMilimetros(env, cal, { qual: 'topo' });
    expect(pts[0][0]).toBeLessThan(0);
    expect(pts[pts.length - 1][0]).toBeGreaterThan(0);
    for (const [, y] of pts) expect(y).toBeGreaterThan(0);
  });
});

describe('simplificar', () => {
  it('reduz uma reta densa a dois pontos', () => {
    const densa = Array.from({ length: 200 }, (_, i) => [i * 10, 500]);
    expect(simplificar(densa)).toHaveLength(2);
  });

  it('preserva um vértice acima da tolerância', () => {
    const v = [[0, 0], [500, 300], [1000, 0]];
    expect(simplificar(v, { tolerancia: 6 })).toHaveLength(3);
  });
});

describe('compararSilhuetas', () => {
  const reta = [[-1000, 500], [1000, 500]];

  it('dá zero para silhuetas idênticas', () => {
    const c = compararSilhuetas(reta, [[-1000, 500], [0, 500], [1000, 500]]);
    expect(c.desvioAbsMedio).toBe(0);
    expect(c.desvioMaximo).toBe(0);
  });

  it('mede deslocamento constante com sinal', () => {
    const c = compararSilhuetas(reta, [[-1000, 560], [1000, 560]]);
    expect(c.desvioMedio).toBeCloseTo(60, 0);
    expect(c.rms).toBeCloseTo(60, 0);
  });

  it('aponta onde está o pior desvio', () => {
    const c = compararSilhuetas(reta, [[-1000, 500], [0, 700], [1000, 500]]);
    expect(c.desvioMaximo).toBeCloseTo(200, 0);
    expect(Math.abs(c.zDoPior)).toBeLessThan(60);
  });

  it('declara a cobertura quando a comparação parcial é autorizada', () => {
    const c = compararSilhuetas(reta, [[-200, 500], [200, 500]], { minCobertura: 0.1 });
    expect(c.faixaZ).toEqual([-200, 200]);
    expect(c.cobertura.referencia).toBeCloseTo(0.2, 3);
  });

  it('recusa comparação que omitiria a maior parte da silhueta', () => {
    expect(() => compararSilhuetas(reta, [[-200, 500], [200, 500]])).toThrow(/cobertura insuficiente/);
  });

  it('recusa silhuetas que não se sobrepõem', () => {
    expect(() => compararSilhuetas(reta, [[5000, 500], [6000, 500]])).toThrow(/sobrepõem/);
  });
});
