/* contorno-da-imagem.test.mjs — o contorno sai da imagem, igual nas duas
   execuções, e recusa ponto fora de parte ou duas partes na mesma região. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contornosDaImagem } from './contorno-da-imagem.mjs';

const pasta = new URL('../../procedural/pecas/braco-robotico/referencias/', import.meta.url);
const imagem = readFileSync(new URL('lateral.png', pasta));
const regioes = JSON.parse(readFileSync(new URL('lateral.regioes.json', pasta), 'utf8'));

describe('contorno da imagem', () => {
  it('é igual nas duas execuções e bate com o arquivo gravado', async () => {
    const a = await contornosDaImagem(imagem, regioes);
    const b = await contornosDaImagem(imagem, regioes);
    expect(a).toEqual(b);
    expect(a).toEqual(JSON.parse(readFileSync(new URL('lateral.contornos.json', pasta), 'utf8')));
  }, 60000);

  it('recusa ponto fora da silhueta e duas partes na mesma região', async () => {
    await expect(contornosDaImagem(imagem, { ...regioes, regioes: { fundo: [20, 20] } })).rejects.toThrow(/fora da silhueta/);
    await expect(contornosDaImagem(imagem, { ...regioes, regioes: { a: [380, 250], b: [381, 260] } })).rejects.toThrow(/mesma região/);
  }, 60000);
});
