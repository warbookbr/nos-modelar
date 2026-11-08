// Testes dos mapas de relevo e de aspereza: determinismo, tile sem emenda, escala em metros, normal unitária e recusas.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ErroDeTextura, gerarMapaDeFlocos, gerarMapasDoRelevo, metrosPorTileDoRelevo, TIPOS_DE_RELEVO, texturaParaPng,
} from '../src/index.js';

const hash = (rgba) => createHash('sha256').update(rgba).digest('hex');
const PX = 96;
const padrao = { prismas: 6, bandaDeRodagem: 30, letras: 12, granulado: 0.4 };
const relevo = (tipo, extra = {}) => ({ tipo, escala: padrao[tipo], intensidade: 0.6, ...extra });

/* diferença média entre duas colunas de uma altura (Float32) */
function saltoDaColuna(h, px, a, b) {
  let s = 0;
  for (let j = 0; j < px; j += 1) s += Math.abs(h[j * px + a] - h[j * px + b]);
  return s / px;
}
function saltoDaLinha(h, px, a, b) {
  let s = 0;
  for (let i = 0; i < px; i += 1) s += Math.abs(h[a * px + i] - h[b * px + i]);
  return s / px;
}

describe('gerarMapasDoRelevo', () => {
  for (const tipo of TIPOS_DE_RELEVO) {
    const PX = tipo === 'letras' ? 288 : 96;
    describe(tipo, () => {
      it('é determinístico byte a byte e a semente só muda o que é sorteado', () => {
        const a = gerarMapasDoRelevo(relevo(tipo), { px: PX, semente: 3 });
        const b = gerarMapasDoRelevo(relevo(tipo), { px: PX, semente: 3 });
        expect(hash(a.normal)).toBe(hash(b.normal));
        expect(hash(a.aspereza)).toBe(hash(b.aspereza));
        const c = gerarMapasDoRelevo(relevo(tipo), { px: PX, semente: 4 });
        if (tipo === 'granulado') expect(hash(c.normal)).not.toBe(hash(a.normal));
        else expect(hash(c.normal)).toBe(hash(a.normal));
      });

      it('não tem emenda: a costura do tile salta como o interior', () => {
        const { relevo: h } = gerarMapasDoRelevo(relevo(tipo), { px: PX });
        let colunas = 0;
        let linhas = 0;
        for (let k = 1; k < PX; k += 1) { colunas += saltoDaColuna(h, PX, k - 1, k); linhas += saltoDaLinha(h, PX, k - 1, k); }
        const interiorX = colunas / (PX - 1);
        const interiorY = linhas / (PX - 1);
        expect(interiorX).toBeGreaterThan(0);
        expect(saltoDaColuna(h, PX, PX - 1, 0)).toBeLessThan(interiorX * 2.5 + 1e-4);
        expect(saltoDaLinha(h, PX, PX - 1, 0)).toBeLessThan(interiorY * 2.5 + 1e-4);
      });

      it('a normal é unitária, aponta para fora e o mapa de aspereza é um fator de 0 a 1', () => {
        const m = gerarMapasDoRelevo(relevo(tipo), { px: PX });
        expect(m.normal.length).toBe(PX * PX * 4);
        let inclinada = 0;
        for (let p = 0; p < PX * PX; p += 1) {
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
        expect(inclinada).toBeGreaterThan(PX * PX * 0.02);
      });

      it('a intensidade 0 dá superfície lisa e a maior intensidade inclina mais', () => {
        const media = (i) => {
          const m = gerarMapasDoRelevo(relevo(tipo, { intensidade: i }), { px: PX });
          let s = 0;
          for (let p = 0; p < PX * PX; p += 1) s += 255 - m.normal[p * 4 + 2];
          return s / (PX * PX);
        };
        expect(media(0)).toBeLessThan(130 - 128 + 1);
        expect(media(1)).toBeGreaterThan(media(0.3));
      });
    });
  }

  it('a escala é em metros e o tile guarda períodos inteiros', () => {
    expect(metrosPorTileDoRelevo('prismas', 6)).toBeCloseTo(0.024, 9);
    expect(metrosPorTileDoRelevo('bandaDeRodagem', 30)).toBeCloseTo(0.12, 9);
    expect(metrosPorTileDoRelevo('granulado', 0.4)).toBeCloseTo(0.0064, 9);
    expect(metrosPorTileDoRelevo('letras', 12)).toBeCloseTo((72 * 12) / 7000, 9);
    expect(gerarMapasDoRelevo(relevo('prismas', { escala: 10 }), { px: PX }).metrosPorTile).toBeCloseTo(0.04, 9);
  });

  it('o prisma repete a cada quarto do tile', () => {
    const { relevo: h } = gerarMapasDoRelevo(relevo('prismas'), { px: PX });
    for (let k = 0; k < 8; k += 1) expect(h[k * PX + 5]).toBeCloseTo(h[k * PX + 5 + PX / 4], 6);
  });

  it('a banda tem sulcos: parte do tile está no fundo e parte no topo', () => {
    const { relevo: h } = gerarMapasDoRelevo(relevo('bandaDeRodagem'), { px: PX });
    const fundo = h.filter((v) => v < 0.1).length / h.length;
    const topo = h.filter((v) => v > 0.9).length / h.length;
    expect(fundo).toBeGreaterThan(0.1);
    expect(topo).toBeGreaterThan(0.3);
  });

  it('as letras são baixo-relevo: o fundo é o topo e os traços afundam', () => {
    const { relevo: h } = gerarMapasDoRelevo(relevo('letras'), { px: 288 });
    const fundo = h.filter((v) => v < 0.5).length / h.length;
    expect(fundo).toBeGreaterThan(0.1);
    expect(fundo).toBeLessThan(0.5);
    expect(h.filter((v) => v > 0.95).length / h.length).toBeGreaterThan(0.3);
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
  });
});

describe('gerarMapaDeFlocos', () => {
  it('é determinístico, a semente muda a imagem e o tile não tem emenda', () => {
    const a = gerarMapaDeFlocos(0.7, { px: PX, semente: 2 });
    const b = gerarMapaDeFlocos(0.7, { px: PX, semente: 2 });
    const c = gerarMapaDeFlocos(0.7, { px: PX, semente: 3 });
    expect(hash(a.aspereza)).toBe(hash(b.aspereza));
    expect(hash(a.aspereza)).not.toBe(hash(c.aspereza));
    expect(a.metrosPorTile).toBeCloseTo(0.04, 9);
    /* ruído por texel: a costura não é diferente de qualquer outro par de colunas */
    const g = new Float32Array(PX * PX);
    for (let p = 0; p < g.length; p += 1) g[p] = a.aspereza[p * 4 + 1] / 255;
    let interior = 0;
    for (let k = 1; k < PX; k += 1) interior += saltoDaColuna(g, PX, k - 1, k);
    expect(saltoDaColuna(g, PX, PX - 1, 0)).toBeLessThan((interior / (PX - 1)) * 2.5 + 1e-4);
  });

  it('flocos 0 deixa a aspereza inteira e mais flocos baixam o fator em mais pontos', () => {
    const media = (f) => {
      const m = gerarMapaDeFlocos(f, { px: PX });
      let s = 0;
      for (let p = 0; p < PX * PX; p += 1) s += m.aspereza[p * 4 + 1];
      return s / (PX * PX);
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
