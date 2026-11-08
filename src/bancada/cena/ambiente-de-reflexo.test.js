/* ambiente-de-reflexo.test.js — o ambiente gerado é determinístico e tem o caráter pedido (estúdio e céu aberto). */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ALTURA_DO_AMBIENTE, AMBIENTES, AMBIENTE_PADRAO, LARGURA_DO_AMBIENTE, pixelsDoAmbiente } from './ambiente-de-reflexo.js';

const hash = (dados) => createHash('sha256').update(Buffer.from(dados.buffer)).digest('hex');
const luma = (d, x, y, w = LARGURA_DO_AMBIENTE) => { const i = (y * w + x) * 4; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; };

describe('o ambiente gerado', () => {
  it('o padrão é o estúdio, e o céu aberto é a segunda opção', () => {
    expect(AMBIENTE_PADRAO).toBe('estudio');
    expect(AMBIENTES).toEqual(['estudio', 'ceu', 'nenhum']);
  });

  it('dá os mesmos pixels em duas execuções, para cada ambiente', () => {
    for (const tipo of ['estudio', 'ceu']) {
      const a = pixelsDoAmbiente(tipo);
      const b = pixelsDoAmbiente(tipo);
      expect(a.length).toBe(LARGURA_DO_AMBIENTE * ALTURA_DO_AMBIENTE * 4);
      expect(hash(a)).toBe(hash(b));
    }
    expect(hash(pixelsDoAmbiente('estudio'))).not.toBe(hash(pixelsDoAmbiente('ceu')));
  });

  it('todo pixel é finito, opaco e não negativo', () => {
    for (const tipo of ['estudio', 'ceu']) {
      const d = pixelsDoAmbiente(tipo);
      for (let i = 0; i < d.length; i += 4) {
        expect(Number.isFinite(d[i] + d[i + 1] + d[i + 2])).toBe(true);
        expect(Math.min(d[i], d[i + 1], d[i + 2])).toBeGreaterThanOrEqual(0);
        expect(d[i + 3]).toBe(1);
      }
    }
  });

  it('estúdio: faixas de luz acima de 1 sobre um fundo neutro e um chão cinza mais escuro que a parede', () => {
    const d = pixelsDoAmbiente('estudio');
    let maximo = 0;
    for (let y = 0; y < ALTURA_DO_AMBIENTE; y++) for (let x = 0; x < LARGURA_DO_AMBIENTE; x++) maximo = Math.max(maximo, luma(d, x, y));
    expect(maximo).toBeGreaterThan(3);
    const parede = luma(d, 0, ALTURA_DO_AMBIENTE * 0.35 | 0);
    const chao = luma(d, 0, ALTURA_DO_AMBIENTE * 0.85 | 0);
    expect(chao).toBeLessThan(parede);
    expect(chao).toBeGreaterThan(0.05);
    /* neutro: a diferença entre canais é pequena */
    const i = ((ALTURA_DO_AMBIENTE * 0.85 | 0) * LARGURA_DO_AMBIENTE) * 4;
    expect(Math.abs(d[i] - d[i + 2])).toBeLessThan(0.05 * d[i] + 1e-6);
  });

  it('céu aberto: o zênite é mais azul que o horizonte, e o chão é claro', () => {
    const d = pixelsDoAmbiente('ceu');
    const px = (y) => { const i = (y * LARGURA_DO_AMBIENTE + 200) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const zenite = px(0);
    const horizonte = px(ALTURA_DO_AMBIENTE / 2 - 1);
    expect(zenite[2] - zenite[0]).toBeGreaterThan(horizonte[2] - horizonte[0]);
    expect(luma(d, 200, ALTURA_DO_AMBIENTE - 1)).toBeGreaterThan(0.3);
  });

  it('recusa um ambiente que não gera imagem', () => {
    expect(() => pixelsDoAmbiente('nenhum')).toThrow(/Aceitos: estudio, ceu/);
  });
});
