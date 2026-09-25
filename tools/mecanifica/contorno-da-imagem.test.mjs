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

  it('separa o ombro da coluna, que têm o mesmo cinza', async () => {
    const { resultado: { regioes: r } } = await contornosDaImagem(imagem, regioes);
    expect(r.ombro.areaMm2).toBeGreaterThan(5000);
    expect(r.braco.areaMm2).toBeGreaterThan(r.ombro.areaMm2);
  }, 60000);
});
