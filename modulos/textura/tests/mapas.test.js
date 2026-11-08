// Testes dos mapas de relevo e de aspereza: determinismo, tile sem emenda, escala em metros, normal unitária, banda centrada e simétrica, letras numa linha e recusas.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ErroDeTextura, gerarMapaDeFlocos, gerarMapasDoRelevo, medidasPadraoDoRelevo, metrosPorTileDoRelevo, TIPOS_DE_RELEVO, texturaParaPng,
} from '../src/index.js';

const hash = (rgba) => createHash('sha256').update(rgba).digest('hex');
const padrao = { prismas: 6, bandaDeRodagem: 15, letras: 12, granulado: 0.4 };
const relevo = (tipo, extra = {}) => ({ tipo, escala: padrao[tipo], intensidade: 0.6, ...extra });
const pxDe = (tipo) => (tipo === 'letras' ? 512 : 96);

/* diferença média entre duas colunas / linhas de um campo largura x altura */
function saltoDaColuna(h, w, alt, a, b) {
  let s = 0;
  for (let j = 0; j < alt; j += 1) s += Math.abs(h[j * w + a] - h[j * w + b]);
  return s / alt;
}
function saltoDaLinha(h, w, a, b) {
  let s = 0;
  for (let i = 0; i < w; i += 1) s += Math.abs(h[a * w + i] - h[b * w + i]);
  return s / w;
}

describe('gerarMapasDoRelevo', () => {
  for (const tipo of TIPOS_DE_RELEVO) {
    describe(tipo, () => {
      const px = pxDe(tipo);

      it('é determinístico byte a byte e a semente só muda o que é sorteado', () => {
        const a = gerarMapasDoRelevo(relevo(tipo), { px, semente: 3 });
        const b = gerarMapasDoRelevo(relevo(tipo), { px, semente: 3 });
        expect(hash(a.normal)).toBe(hash(b.normal));
        expect(hash(a.aspereza)).toBe(hash(b.aspereza));
        const c = gerarMapasDoRelevo(relevo(tipo), { px, semente: 4 });
        if (tipo === 'granulado') expect(hash(c.normal)).not.toBe(hash(a.normal));
        else expect(hash(c.normal)).toBe(hash(a.normal));
      });

      it('não tem emenda: a costura do tile salta como o interior', () => {
        const { relevo: h, largura, altura } = gerarMapasDoRelevo(relevo(tipo), { px });
        let colunas = 0;
        let linhas = 0;
        for (let k = 1; k < largura; k += 1) colunas += saltoDaColuna(h, largura, altura, k - 1, k);
        for (let k = 1; k < altura; k += 1) linhas += saltoDaLinha(h, largura, k - 1, k);
        const interiorX = colunas / (largura - 1);
        const interiorY = linhas / (altura - 1);
        expect(interiorX).toBeGreaterThan(0);
        expect(saltoDaColuna(h, largura, altura, largura - 1, 0)).toBeLessThan(interiorX * 2.5 + 1e-4);
        expect(saltoDaLinha(h, largura, altura - 1, 0)).toBeLessThan(interiorY * 2.5 + 1e-4);
      });

      it('a normal é unitária, aponta para fora e o mapa de aspereza é um fator de 0 a 1', () => {
        const m = gerarMapasDoRelevo(relevo(tipo), { px });
        const n = m.largura * m.altura;
        expect(m.normal.length).toBe(n * 4);
        let inclinada = 0;
        for (let p = 0; p < n; p += 1) {
          const x = (m.normal[p * 4] / 255) * 2 - 1;
          const y = (m.normal[p * 4 + 1] / 255) * 2 - 1;
          const z = (m.normal[p * 4 + 2] / 255) * 2 - 1;
          expect(Math.hypot(x, y, z)).toBeGreaterThan(0.97);
          expect(Math.hypot(x, y, z)).toBeLessThan(1.03);
          expect(z).toBeGreaterThan(0);
          if (z < 0.98) inclinada += 1;
          expect(m.aspereza[p * 4]).toBe(255);
          expect(m.aspereza[p * 4 + 2]).toBe(255);
        }
        expect(inclinada).toBeGreaterThan(n * (tipo === 'letras' ? 0.005 : 0.02));
      });

      it('a intensidade 0 dá superfície lisa e a maior intensidade inclina mais', () => {
        const media = (i) => {
          const m = gerarMapasDoRelevo(relevo(tipo, { intensidade: i }), { px });
          let s = 0;
          for (let p = 0; p < m.largura * m.altura; p += 1) s += 255 - m.normal[p * 4 + 2];
          return s / (m.largura * m.altura);
        };
        expect(media(0)).toBeLessThan(1);
        expect(media(1)).toBeGreaterThan(media(0.3));
      });
    });
  }

  it('a escala é em metros', () => {
    expect(metrosPorTileDoRelevo('prismas', 6)).toBeCloseTo(0.024, 9);
    expect(metrosPorTileDoRelevo('granulado', 0.4)).toBeCloseTo(0.0064, 9);
    expect(metrosPorTileDoRelevo('bandaDeRodagem', 15)).toBeCloseTo(0.075, 9);
    expect(metrosPorTileDoRelevo('bandaDeRodagem', 15, { larguraM: 0.08, comprimentoM: 0.08 })).toBeCloseTo(0.08, 9);
    const letras = medidasPadraoDoRelevo('letras', 12);
    expect(letras.larguraM).toBeCloseTo((7 * 12 * 2.5) / 7000, 9);
    expect(gerarMapasDoRelevo(relevo('prismas', { escala: 10 }), { px: 96 }).metrosPorTile).toBeCloseTo(0.04, 9);
    const banda = gerarMapasDoRelevo(relevo('bandaDeRodagem'), { px: 96, larguraM: 0.08, comprimentoM: 0.08 });
    expect(banda.metrosPorTile).toBeCloseTo(0.08, 9);
    expect(banda.metrosPorTileV).toBeCloseTo(0.08, 9);
  });

  it('o prisma repete a cada quarto do tile', () => {
    const { relevo: h } = gerarMapasDoRelevo(relevo('prismas'), { px: 96 });
    for (let k = 0; k < 8; k += 1) expect(h[k * 96 + 5]).toBeCloseTo(h[k * 96 + 5 + 24], 6);
  });

  for (const desenho of ['costelas', 'v']) {
    describe(`banda de rodagem, desenho ${desenho}`, () => {
      const px = 192;
      const m = gerarMapasDoRelevo(relevo('bandaDeRodagem', { desenho }), { px, larguraM: 0.08, comprimentoM: 0.08 });

      it('é simétrica em torno do meio: a linha j e a linha px-1-j são iguais', () => {
        for (let j = 0; j < px / 2; j += 1) {
          for (let i = 0; i < px; i += 1) expect(m.relevo[j * px + i]).toBeCloseTo(m.relevo[(px - 1 - j) * px + i], 6);
        }
      });

      it('tem sulcos e topos', () => {
        const fundo = m.relevo.filter((v) => v < 0.1).length / m.relevo.length;
        const topo = m.relevo.filter((v) => v > 0.9).length / m.relevo.length;
        expect(fundo).toBeGreaterThan(0.05);
        expect(topo).toBeGreaterThan(0.4);
      });
    });
  }

  it('as costelas têm sulcos retos em volta, simétricos em torno do meio, e o meio é costela', () => {
    const px = 192;
    const { relevo: h } = gerarMapasDoRelevo(relevo('bandaDeRodagem', { desenho: 'costelas' }), { px, larguraM: 0.08 });
    /* a média de cada linha: os 4 sulcos retos são os mínimos longitudinais */
    const linha = Array.from({ length: px }, (_, j) => {
      let s = 0;
      for (let i = 0; i < px; i += 1) s += h[j * px + i];
      return s / px;
    });
    /* os pixels de sulco agrupados em trechos contíguos; o centro de cada trecho é o centro do sulco */
    const trechos = [];
    for (let j = 0; j < px; j += 1) {
      if (linha[j] >= 0.35) continue;
      const ultimo = trechos[trechos.length - 1];
      if (ultimo && j - ultimo[ultimo.length - 1] <= 1) ultimo.push(j); else trechos.push([j]);
    }
    const centros = trechos.map((t) => (t[0] + t[t.length - 1]) / 2);
    expect(centros.length).toBe(4);
    for (let k = 0; k < 4; k += 1) expect(Math.abs(centros[k] + centros[3 - k] - (px - 1))).toBeLessThanOrEqual(1);
    /* o meio da banda não tem sulco: a costela central é contínua */
    expect(linha[px / 2 - 1]).toBeGreaterThan(0.8);
    expect(linha[px / 2]).toBeGreaterThan(0.8);
  });

  it('o direcional e as costelas dão imagens diferentes', () => {
    const a = gerarMapasDoRelevo(relevo('bandaDeRodagem', { desenho: 'costelas' }), { px: 96, larguraM: 0.08 });
    const b = gerarMapasDoRelevo(relevo('bandaDeRodagem', { desenho: 'v' }), { px: 96, larguraM: 0.08 });
    expect(hash(a.normal)).not.toBe(hash(b.normal));
  });

  it('as letras são uma linha de texto centrada: fundo plano em volta e traços afundados só no meio', () => {
    const m = gerarMapasDoRelevo(relevo('letras'), { px: 1024, comprimentoM: 0.22, larguraM: 0.04 });
    expect(m.altura).toBe(Math.round((1024 * 0.04) / 0.22));
    expect(m.metrosPorTile).toBeCloseTo(0.22, 9);
    expect(m.metrosPorTileV).toBeCloseTo(0.04, 9);
    let somaX = 0; let somaY = 0; let n = 0; let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
    for (let j = 0; j < m.altura; j += 1) {
      for (let i = 0; i < m.largura; i += 1) {
        if (m.relevo[j * m.largura + i] < 0.5) {
          somaX += i; somaY += j; n += 1;
          minX = Math.min(minX, i); maxX = Math.max(maxX, i); minY = Math.min(minY, j); maxY = Math.max(maxY, j);
        }
      }
    }
    expect(n).toBeGreaterThan(100);
    /* centrado no tile nos dois sentidos, a menos de uma célula de letra */
    expect(Math.abs(somaX / n - m.largura / 2)).toBeLessThan(m.largura * 0.03);
    expect(Math.abs(somaY / n - m.altura / 2)).toBeLessThan(m.altura * 0.06);
    /* o texto ocupa a altura da letra (12 mm de 40 mm) e menos de metade do comprimento; as margens ficam planas */
    expect((maxY - minY) / m.altura).toBeGreaterThan(0.2);
    expect((maxY - minY) / m.altura).toBeLessThan(0.4);
    expect(minX / m.largura).toBeGreaterThan(0.15);
    expect(maxX / m.largura).toBeLessThan(0.85);
  });

  it('o PNG da normal sai pelo mesmo caminho da cor', () => {
    const m = gerarMapasDoRelevo(relevo('prismas'), { px: 32 });
    const png = texturaParaPng({ largura: m.largura, altura: m.altura, rgba: m.normal });
    expect(Array.from(png.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('recusa entrada inválida', () => {
    expect(() => gerarMapasDoRelevo(null)).toThrow(ErroDeTextura);
    expect(() => gerarMapasDoRelevo({ tipo: 'bolhas', escala: 1, intensidade: 0.5 })).toThrow(/desconhecido/);
    expect(() => gerarMapasDoRelevo(relevo('prismas', { intensidade: 2 }))).toThrow(/intensidade/);
    expect(() => gerarMapasDoRelevo(relevo('prismas'), { px: 8 })).toThrow(/px/);
    expect(() => gerarMapasDoRelevo(relevo('bandaDeRodagem', { desenho: 'espinha' }))).toThrow(/desenho/);
  });
});

describe('gerarMapaDeFlocos', () => {
  it('é determinístico, a semente muda a imagem e o tile não tem emenda', () => {
    const PX = 96;
    const a = gerarMapaDeFlocos(0.7, { px: PX, semente: 2 });
    const b = gerarMapaDeFlocos(0.7, { px: PX, semente: 2 });
    const c = gerarMapaDeFlocos(0.7, { px: PX, semente: 3 });
    expect(hash(a.aspereza)).toBe(hash(b.aspereza));
    expect(hash(a.aspereza)).not.toBe(hash(c.aspereza));
    expect(a.metrosPorTile).toBeCloseTo(0.04, 9);
    const g = new Float32Array(PX * PX);
    for (let p = 0; p < g.length; p += 1) g[p] = a.aspereza[p * 4 + 1] / 255;
    let interior = 0;
    for (let k = 1; k < PX; k += 1) interior += saltoDaColuna(g, PX, PX, k - 1, k);
    expect(saltoDaColuna(g, PX, PX, PX - 1, 0)).toBeLessThan((interior / (PX - 1)) * 2.5 + 1e-4);
  });

  it('flocos 0 deixa a aspereza inteira e mais flocos baixam o fator em mais pontos', () => {
    const media = (f) => {
      const m = gerarMapaDeFlocos(f, { px: 96 });
      let s = 0;
      for (let p = 0; p < 96 * 96; p += 1) s += m.aspereza[p * 4 + 1];
      return s / (96 * 96);
    };
    expect(media(0)).toBe(255);
    expect(media(1)).toBeLessThan(media(0.4));
    expect(media(0.4)).toBeLessThan(255);
    expect(media(1)).toBeGreaterThan(150);
  });

  it('recusa flocos fora da faixa', () => {
    expect(() => gerarMapaDeFlocos(1.5)).toThrow(/flocos/);
  });
});
