/* contorno-da-imagem.test.mjs — o contorno sai da imagem, igual nas duas
   execuções, separa partes do mesmo cinza e recusa semente fora da parte. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
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
});
