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
      let ruim = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (!Number.isFinite(d[i] + d[i + 1] + d[i + 2]) || Math.min(d[i], d[i + 1], d[i + 2]) < 0 || d[i + 3] !== 1) ruim += 1;
      }
      expect(ruim).toBe(0);
    }
  });

  it('estúdio escuro: parede quase preta, chão cinza escuro e faixas de luz muito mais claras que o fundo', () => {
    const d = pixelsDoAmbiente('estudio');
    let maximo = 0;
    for (let y = 0; y < ALTURA_DO_AMBIENTE; y++) for (let x = 0; x < LARGURA_DO_AMBIENTE; x++) maximo = Math.max(maximo, luma(d, x, y));
    expect(maximo).toBeGreaterThan(3);
    const parede = luma(d, 0, ALTURA_DO_AMBIENTE * 0.65 | 0);
    const chao = luma(d, 0, ALTURA_DO_AMBIENTE * 0.15 | 0);
    expect(parede).toBeLessThan(0.03);
    expect(chao).toBeGreaterThan(parede);
    expect(chao).toBeLessThan(0.2);
    /* neutro: a diferença entre canais é pequena */
    const i = ((ALTURA_DO_AMBIENTE * 0.15 | 0) * LARGURA_DO_AMBIENTE) * 4;
    expect(d[i]).toBe(d[i + 2]);
  });

  it('céu aberto: o zênite é mais azul que o horizonte, e o chão é claro', () => {
    const d = pixelsDoAmbiente('ceu');
    const px = (y) => { const i = (y * LARGURA_DO_AMBIENTE + 200) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const zenite = px(ALTURA_DO_AMBIENTE - 1);
    const horizonte = px(ALTURA_DO_AMBIENTE / 2 + 1);
    expect(zenite[2] - zenite[0]).toBeGreaterThan(horizonte[2] - horizonte[0]);
    expect(luma(d, 200, 0)).toBeGreaterThan(0.3);
  });

  it('recusa um ambiente que não gera imagem', () => {
    expect(() => pixelsDoAmbiente('nenhum')).toThrow(/Aceitos: estudio, ceu/);
  });
});
