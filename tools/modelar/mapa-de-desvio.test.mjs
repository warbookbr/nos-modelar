/* mapa-de-desvio.test.mjs — o mapa de desvio na chapa abaulada de prova: com o amassado declarado (1,2 mm de fundo e 80 mm de raio em
 * x 400 e y 300) ele mede a profundidade declarada com erro de até 10% e o lugar; na chapa lisa, o mesmo ajuste não acha desvio. A malha
 * entregue pela subdivisão tem o amassado um pouco mais raso que o declarado (1,09 mm, a diferença das duas chapas vértice a vértice), e o
 * teste confere as duas coisas: o erro contra o declarado (o gate do plano) e contra a malha (o do ajuste). */
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { AMASSADO } from '../blender/chapa-com-amassado-de-prova.mjs';
import { lerEntradaDeMedida } from './entrada-de-medida.mjs';
import { mapaDeDesvio } from './mapa-de-desvio.mjs';

const neutroDe = async (peca) => (await lerEntradaDeMedida(peca, { montagem: false })).executar().neutro;

describe('mapa de desvio', () => {
  it('dá a profundidade declarada do amassado, com o lugar, e a imagem traz a barra em mm', async () => {
    const { json, png } = mapaDeDesvio(await neutroDe('chapa-de-reflexo-de-prova'), { nome: 'chapa', lado: '+z', vista: 'frontal' });
    const declarado = AMASSADO.fundo * 1000;
    expect(Math.abs(-json.maximoParaDentro.mm - declarado) / declarado).toBeLessThanOrEqual(0.1);
    expect(Math.abs(-json.maximoParaDentro.mm - 1.09) / 1.09).toBeLessThan(0.02); /* a malha da subdivisão tem 1,09 mm */
    expect(Math.hypot(json.maximoParaDentro.ponto[0] - AMASSADO.x * 1000, json.maximoParaDentro.ponto[1] - AMASSADO.y * 1000)).toBeLessThan(25);
    expect(json.maximoParaFora.mm).toBeLessThan(0.1);
    expect(json.ajuste.verticesSemAjuste).toBe(0);
    const img = PNG.sync.read(png);
    expect([img.width, img.height]).toEqual([1280, 720]);
    let azuis = 0;
    for (let i = 0; i < img.width * img.height; i++) if (img.data[4 * i + 2] - img.data[4 * i] > 40) azuis++;
    expect(azuis).toBeGreaterThan(2000); /* o amassado pintado de azul, e a barra de cor */
  });

  it('na chapa lisa o desvio é só o resíduo do ajuste, abaixo de 0,02 mm', async () => {
    const { json } = mapaDeDesvio(await neutroDe('chapa-lisa-de-reflexo-de-prova'), { nome: 'lisa', lado: '+z', vista: 'frontal' });
    expect(Math.abs(json.maximoParaFora.mm)).toBeLessThan(0.02);
    expect(Math.abs(json.maximoParaDentro.mm)).toBeLessThan(0.02);
  });

  it('avisa das duas peles sem --lado e recusa raio e lado inválidos', async () => {
    const neutro = await neutroDe('chapa-lisa-de-reflexo-de-prova');
    expect(mapaDeDesvio(neutro, { vista: 'frontal' }).json.avisos.join(' ')).toMatch(/duas peles/);
    expect(() => mapaDeDesvio(neutro, { lado: '+w' })).toThrow(/--lado/);
    expect(() => mapaDeDesvio(neutro, { raioMm: 0 })).toThrow(/--raio/);
    expect(() => mapaDeDesvio(neutro, { vista: 'de-lado' })).toThrow(/--vista/);
    expect(readFileSync(new URL('./mapa-de-desvio.mjs', import.meta.url), 'utf8')).toContain('polinomial local robusto');
  });
});
