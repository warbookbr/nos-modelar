/* contorno-da-imagem.test.mjs — o contorno sai da imagem, igual nas duas
   execuções, separa partes do mesmo cinza e recusa semente fora da parte. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { contornosDaImagem } from './contorno-da-imagem.mjs';

const pasta = new URL('../../procedural/pecas/braco-robotico/referencias/', import.meta.url);
const imagem = readFileSync(new URL('lateral.png', pasta));
const regioes = JSON.parse(readFileSync(new URL('lateral.regioes.json', pasta), 'utf8'));

describe('contorno da imagem', () => {
  it('é igual nas duas execuções e bate com o arquivo gravado', async () => {
    const { resultado: a } = await contornosDaImagem(imagem, regioes);
    const { resultado: b } = await contornosDaImagem(imagem, regioes);
    expect(a).toEqual(b);
    expect(a).toEqual(JSON.parse(readFileSync(new URL('lateral.contornos.json', pasta), 'utf8')));
  }, 60000);

  it('recusa ponto fora da silhueta e semente mal escrita', async () => {
    await expect(contornosDaImagem(imagem, { ...regioes, regioes: { fundo: [20, 20] } })).rejects.toThrow(/fora da silhueta/);
    await expect(contornosDaImagem(imagem, { ...regioes, regioes: { a: [380] } })).rejects.toThrow(/semente inválida/);
  }, 60000);

  it('guarda em milímetro todos os pedaços de uma parte, com o maior igual ao contorno de sempre', async () => {
    const frontal = readFileSync(new URL('frontal.png', pasta));
    const config = JSON.parse(readFileSync(new URL('frontal.regioes.json', pasta), 'utf8'));
    const { resultado: { regioes: r } } = await contornosDaImagem(frontal, config);
    /* A carcaça do punho aparece de frente dos dois lados do antebraço. */
    const carcaca = r.carcacaPunho;
    expect(carcaca.pedacos).toHaveLength(2);
    expect(carcaca.pedacos[0].areaMm2).toBeGreaterThanOrEqual(carcaca.pedacos[1].areaMm2);
    expect(carcaca.pedacos[0].contornoMm).toEqual(carcaca.contornoMm);
    expect(carcaca.pedacos[0].areaMm2).toBe(carcaca.areaMm2);
    const xs = carcaca.pedacos.map((p) => p.contornoMm.map(([x]) => x));
    expect(Math.max(...xs[0]) < Math.min(...xs[1]) || Math.max(...xs[1]) < Math.min(...xs[0])).toBe(true);
    for (const parte of Object.values(r)) expect(parte.pedacos.length).toBeGreaterThanOrEqual(1);
  }, 60000);

  it('separa o ombro da coluna, que têm o mesmo cinza', async () => {
    const { resultado: { regioes: r } } = await contornosDaImagem(imagem, regioes);
    expect(r.ombro.areaMm2).toBeGreaterThan(5000);
    expect(r.braco.areaMm2).toBeGreaterThan(r.ombro.areaMm2);
  }, 60000);

  /* A frontal do avião: a asa de ponta a ponta com o corpo escuro no meio, que é
     parte fora do modelo. Sem ele a asa fica em dois pedaços, e a silhueta guardava
     só o maior: a ponta da asa saía do contorno e a largura do avião ia de 12.800
     a 10.778 mm. Aqui a asa vai de x = 10 a 141 px, com 10 mm por pixel. */
  it('guarda a silhueta em todos os pedaços em que a parte fora do modelo a deixa, o maior primeiro', async () => {
    const png = new PNG({ width: 170, height: 60 });
    for (let y = 0; y < 60; y += 1) for (let x = 0; x < 170; x += 1) {
      const asa = x >= 10 && x < 141 && y >= 20 && y < 40;
      const corpo = x >= 70 && x < 90 && y >= 12 && y < 48;
      const v = !(asa || corpo) ? 250 : (corpo ? 90 : (x === 69 || x === 90 ? 110 : 150));
      const o = (y * 170 + x) * 4;
      png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
    }
    const config = {
      ancoras: [{ nome: 'esquerda', px: [10, 30], mm: [-650, 100] }, { nome: 'direita', px: [140, 30], mm: [650, 100] }],
      limiar: 225,
      foraDoModelo: ['corpo'],
      regioes: { asa: [[[20, 30], [60, 30]], [[100, 30], [135, 30]]], corpo: [80, 30] },
    };
    const { resultado: { silhueta } } = await contornosDaImagem(PNG.sync.write(png), config);
    expect(silhueta.pedacos).toHaveLength(2);
    expect(silhueta.pedacos[0].areaMm2).toBeGreaterThan(silhueta.pedacos[1].areaMm2);
    /* Os campos de sempre são os do maior pedaço. */
    expect(silhueta.contornoMm).toEqual(silhueta.pedacos[0].contornoMm);
    expect(silhueta.linhaDeForaMm).toEqual(silhueta.linhasDeForaMm[0]);
    expect(silhueta.linhasDeForaMm).toHaveLength(2);
    const zs = (aneis) => aneis.flat().map(([z]) => z);
    const uniao = zs(silhueta.pedacos.map((p) => p.contornoMm));
    /* Só o maior pedaço acaba antes do corpo escuro; a união vai até a ponta da asa. */
    expect(Math.max(...zs([silhueta.contornoMm]))).toBeLessThan(0);
    expect(Math.min(...uniao)).toBeCloseTo(-650, -1);
    expect(Math.max(...uniao)).toBeGreaterThan(600);
  }, 60000);
});
