/* razao.test.js — a razão interseção/união entre dois contornos, sem alinhar, alinhada por um ponto declarado e pela melhor translação. */
import { describe, expect, it } from 'vitest';
import { desenhar, razaoInterseccaoUniao, ErroDeDesenho } from '../src/index.js';
import { carrinho } from './carrinho.js';

const retangulo = (h0, v0, h1, v1) => [[h0, v0], [h1, v0], [h1, v1], [h0, v1]];
const comoContorno = (anel, pedacos = [anel]) => ({ formato: 'mecanifica.contornos@1', silhueta: { contornoMm: anel, pedacos: pedacos.map((contornoMm) => ({ contornoMm })) }, regioes: {} });

describe('a razão interseção/união', () => {
  it('é 1 para a mesma forma e 0 para formas sem encontro', async () => {
    const a = [retangulo(0, 0, 100, 50)];
    const igual = await razaoInterseccaoUniao(a, a);
    expect(igual.semAlinhar.iou).toBe(1);
    expect(igual.melhorTranslacao.iou).toBe(1);
    expect(igual.porPonto).toBeNull();
    const longe = await razaoInterseccaoUniao(a, [retangulo(1000, 1000, 1100, 1050)]);
    expect(longe.semAlinhar.iou).toBe(0);
    expect(longe.melhorTranslacao.iou).toBe(1);
    expect(longe.melhorTranslacao.deslocamento[0]).toBeCloseTo(-1000, 2);
    expect(longe.melhorTranslacao.deslocamento[1]).toBeCloseTo(-1000, 2);
  });

  it('dá os números conhecidos de dois retângulos deslocados: interseção 4000, união 6000', async () => {
    const r = await razaoInterseccaoUniao([retangulo(0, 0, 100, 50)], [retangulo(20, 0, 120, 50)], { alinharPor: { a: [0, 0], b: [20, 0] } });
    expect(r.semAlinhar.iou).toBeCloseTo(4000 / 6000, 6);
    expect(r.porPonto.iou).toBe(1);
    expect(r.porPonto.deslocamento).toEqual([-20, 0]);
    expect(r.melhorTranslacao.iou).toBe(1);
    expect(r.melhorTranslacao.deslocamento[0]).toBeCloseTo(-20, 2);
    expect(r.areaA).toBe(5000);
    expect(r.areaB).toBe(5000);
  });

  it('o ponto declarado errado dá a razão do alinhamento errado, e a melhor translação a separa do erro de forma', async () => {
    /* Mesma forma de 100 por 50 e outra de 100 por 40: a melhor razão possível é 40/50 = 0,8, com a menor dentro da maior. */
    const a = [retangulo(0, 0, 100, 50)]; const b = [retangulo(300, 300, 400, 340)];
    const r = await razaoInterseccaoUniao(a, b, { alinharPor: { a: [0, 0], b: [300, 300] } });
    expect(r.porPonto.iou).toBeCloseTo(0.8, 6);
    expect(r.melhorTranslacao.iou).toBeCloseTo(0.8, 6);
    const torto = await razaoInterseccaoUniao(a, b, { alinharPor: { a: [0, 0], b: [300, 280] } });
    /* A menor desce 20 mm: a interseção é 100 por 30, a união 5000 + 4000 - 3000. */
    expect(torto.porPonto.iou).toBeCloseTo(3000 / 6000, 6);
    expect(torto.melhorTranslacao.iou).toBeCloseTo(0.8, 6);
  });

  it('acha a translação de uma forma em L entre as duas posições possíveis do encaixe', async () => {
    const L = (dh, dv) => [[dh, dv], [dh + 100, dv], [dh + 100, dv + 30], [dh + 30, dv + 30], [dh + 30, dv + 100], [dh, dv + 100]];
    const r = await razaoInterseccaoUniao([L(0, 0)], [L(517, -233)]);
    expect(r.semAlinhar.iou).toBe(0);
    expect(r.melhorTranslacao.iou).toBeCloseTo(1, 6);
    expect(r.melhorTranslacao.deslocamento[0]).toBeCloseTo(-517, 2);
    expect(r.melhorTranslacao.deslocamento[1]).toBeCloseTo(233, 2);
  });

  it('é determinística: a mesma entrada dá o mesmo resultado', async () => {
    const a = [retangulo(0, 0, 100, 50)]; const b = [[[10, 5], [95, 0], [120, 40], [20, 60]]];
    expect(JSON.stringify(await razaoInterseccaoUniao(a, b))).toBe(JSON.stringify(await razaoInterseccaoUniao(a, b)));
  });

  it('lê arquivos de contornos: a silhueta inteira com todos os pedaços, uma região pelo nome, e o desenho contra a cópia deslocada dele', async () => {
    const { contornos } = await desenhar(carrinho());
    const igual = await razaoInterseccaoUniao(contornos, contornos);
    expect(igual.semAlinhar.iou).toBe(1);
    const roda = await razaoInterseccaoUniao(contornos, contornos, { parteA: 'roda', parteB: 'roda' });
    expect(roda.semAlinhar.iou).toBe(1);
    const mover = (anel) => anel.map(([h, v]) => [Math.round((h + 123.4) * 1000) / 1000, Math.round((v - 45.6) * 1000) / 1000]);
    const deslocado = { ...contornos, silhueta: { ...contornos.silhueta, pedacos: contornos.silhueta.pedacos.map((p) => ({ ...p, contornoMm: mover(p.contornoMm) })), contornoMm: mover(contornos.silhueta.contornoMm) } };
    const r = await razaoInterseccaoUniao(contornos, deslocado, { alinharPor: { a: [0, 0], b: [123.4, -45.6] } });
    expect(r.semAlinhar.iou).toBeLessThan(0.7);
    expect(r.porPonto.iou).toBeCloseTo(1, 6);
    expect(r.melhorTranslacao.iou).toBeCloseTo(1, 4);
    expect(r.melhorTranslacao.deslocamento[0]).toBeCloseTo(-123.4, 1);
    expect(r.melhorTranslacao.deslocamento[1]).toBeCloseTo(45.6, 1);
  });

  it('um pedaço a mais na silhueta conta: sem o pedaço da caçamba a razão cai para a fração da área', async () => {
    const { contornos } = await desenhar(carrinho());
    const [grande, pequeno] = contornos.silhueta.pedacos;
    const so = comoContorno(grande.contornoMm);
    const r = await razaoInterseccaoUniao(contornos, so);
    expect(r.semAlinhar.iou).toBeCloseTo(grande.areaMm2 / (grande.areaMm2 + pequeno.areaMm2), 2);
  });

  it('recusa entrada ilegível dizendo o que corrigir', async () => {
    await expect(razaoInterseccaoUniao({ formato: 'outro' }, [retangulo(0, 0, 1, 1)])).rejects.toThrow(ErroDeDesenho);
    await expect(razaoInterseccaoUniao({ formato: 'outro' }, [retangulo(0, 0, 1, 1)])).rejects.toThrow(/o primeiro contorno: deve ser um arquivo "formato": "mecanifica.contornos@1" ou uma lista de anéis/);
    const { contornos } = await desenhar(carrinho());
    await expect(razaoInterseccaoUniao(contornos, contornos, { parteB: 'banco' })).rejects.toThrow(/o segundo contorno: não há a região "banco"; as regiões são "braco", "cacamba", "pe", "roda"/);
    await expect(razaoInterseccaoUniao([[[0, 0], [1, 1]]], [retangulo(0, 0, 1, 1)])).rejects.toThrow(/cada anel com 3 ou mais pontos/);
    await expect(razaoInterseccaoUniao([retangulo(0, 0, 1, 1)], [retangulo(0, 0, 1, 1)], { alinharPor: { a: [0, 0] } })).rejects.toThrow(/"alinharPor" deve ser/);
  });
});
