/* imagens-da-peca.test.js — a imagem da peça precisa ter endereço no navegador.
 *
 * O caso guardado é o da página que funciona em desenvolvimento e quebra no
 * endereço publicado. O servidor de desenvolvimento serve qualquer arquivo do
 * repositório; o pacote publicado só carrega o que foi emitido na construção.
 * Enquanto a foto morava em `public/`, isso era resolvido por acidente. Dentro
 * da pasta da peça, é resolvido por declaração — e este teste guarda a forma da
 * chave, que é o que liga `PLANO.referencias` ao endereço servido.
 */
import { describe, expect, it } from 'vitest';
import { imagensDaPeca, urlDaReferencia } from './imagens-da-peca.js';

const ENTRADAS = {
  '../../../prototipos/procedural/v3/pecas/bicicleta-quadro/referencias/lateral.png': '/assets/lateral-a1b2.png',
  '../../../prototipos/procedural/v3/pecas/bicicleta-quadro/referencias/sobreposicao.jpg': '/assets/sobre-c3d4.jpg',
  '../../../prototipos/procedural/v3/pecas/outra-peca/referencias/frontal.png': '/assets/frontal-e5f6.png',
  '../../../prototipos/procedural/v3/pecas/solta.png': '/assets/solta.png',
};

describe('imagens da pasta da peça', () => {
  it('a chave é o caminho como a receita declara, a partir da pasta da peça', () => {
    expect(urlDaReferencia('bicicleta-quadro', 'referencias/sobreposicao.jpg', ENTRADAS))
      .toBe('/assets/sobre-c3d4.jpg');
    expect(urlDaReferencia('bicicleta-quadro', 'referencias/lateral.png', ENTRADAS))
      .toBe('/assets/lateral-a1b2.png');
  });

  it('cada peça enxerga só as imagens dela', () => {
    expect([...imagensDaPeca('bicicleta-quadro', ENTRADAS).keys()].sort())
      .toEqual(['referencias/lateral.png', 'referencias/sobreposicao.jpg']);
    expect([...imagensDaPeca('outra-peca', ENTRADAS).keys()]).toEqual(['referencias/frontal.png']);
  });

  it('devolve null em silêncio para peça sem pasta e para referência que não existe', () => {
    /* Referência ausente já reprova em `guarda:acervo`; a bancada não emite um
       segundo veredito sobre o mesmo arquivo. */
    expect(urlDaReferencia('peca-de-arquivo', 'referencias/x.png', ENTRADAS)).toBe(null);
    expect(urlDaReferencia('bicicleta-quadro', 'referencias/nao-existe.png', ENTRADAS)).toBe(null);
    expect(imagensDaPeca('peca-de-arquivo', ENTRADAS).size).toBe(0);
  });

  it('imagem solta fora de uma pasta de peça não entra no índice', () => {
    expect(urlDaReferencia('solta.png', '', ENTRADAS)).toBe(null);
    expect(imagensDaPeca('solta.png', ENTRADAS).size).toBe(0);
  });

  it('o acervo de verdade publica a sobreposição da bicicleta', () => {
    /* Sem passar entradas, o glob real do Vite responde — é o que prova que o
       arquivo foi emitido, e não apenas que a função sabe indexar. */
    expect(urlDaReferencia('bicicleta-quadro', 'referencias/sobreposicao.jpg')).toBeTruthy();
  });
});
