/* vistas-para-critica.test.mjs — o prefixo que apaga as imagens velhas pega só
   as da peça pedida. */
import { describe, expect, it } from 'vitest';
import { prefixoDaPeca, vistasRepetidas } from './vistas-para-critica.mjs';

describe('imagens antigas da peça', () => {
  it('o prefixo é o nome que a bancada dá às capturas da peça', () => {
    expect(prefixoDaPeca('braco-robotico/ombro')).toBe('bancada-braco-robotico-ombro-');
    expect('bancada-braco-robotico-ombro-traseira-orto.png'.startsWith(prefixoDaPeca('braco-robotico/ombro'))).toBe(true);
    expect('bancada-braco-robotico-ombro-x-traseira.png'.startsWith(prefixoDaPeca('braco-robotico/ombr'))).toBe(false);
  });
});

describe('vistas repetidas', () => {
  it('acusa duas vistas com o mesmo conteúdo e deixa passar as diferentes', () => {
    const conteudo = { 'a-direita.png': 'x', 'a-isometrica.png': 'x', 'a-frontal.png': 'y' };
    const ler = (arquivo) => Buffer.from(conteudo[arquivo]);
    expect(vistasRepetidas(Object.keys(conteudo), ler)).toEqual([['a-direita.png', 'a-isometrica.png']]);
    expect(vistasRepetidas(['a-direita.png', 'a-frontal.png'], ler)).toEqual([]);
  });
});
