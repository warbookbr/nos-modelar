/* reguas-de-texto.test.mjs — o negrito no meio da frase conta e o rótulo do começo da linha não; o nome de objeto conta no núcleo e
   não no teste dele; a contagem que sobe acima da base reprova, e arquivo novo nasce com zero. */
import { describe, expect, it } from 'vitest';
import { acimaDaBase, contar, negritoNoMeio, termosDeObjeto } from './reguas-de-texto.mjs';

describe('réguas de texto', () => {
  it('conta o negrito no meio da frase, e não o rótulo do começo da linha nem o código', () => {
    expect(negritoNoMeio('**Estado:** ativo\n- **termo** quer dizer isto\nUma frase com **ênfase** no meio.\n')).toBe(1);
    expect(negritoNoMeio('```\nfora **disto**\n```\nnem `**isto**` conta\n')).toBe(0);
  });

  it('conta o nome de objeto, com acento e plural', () => {
    expect(termosDeObjeto('// a lataria do carro e os veículos, o sedã e os furgões\nconst porta = 1;')).toBe(5);
  });

  it('separa as duas regras pelos arquivos, e deixa o teste do núcleo de fora', () => {
    const textos = { ['docs/modelar/usar/' + 'A.md']: 'com **x** aqui', 'procedural/nucleo/a.js': '// carro', 'procedural/nucleo/a.test.js': '// carro', 'src/b.js': '// carro' };
    expect(contar(Object.keys(textos), (a) => textos[a])).toEqual({ negrito: { ['docs/modelar/usar/' + 'A.md']: 1 }, dominio: { 'procedural/nucleo/a.js': 1 } });
  });

  it('reprova a conta que sobe e o arquivo novo com contagem, e aceita a que desce', () => {
    const base = { negrito: { 'a.md': 2 }, dominio: {} };
    expect(acimaDaBase({ negrito: { 'a.md': 1 }, dominio: {} }, base)).toEqual([]);
    expect(acimaDaBase({ negrito: { 'a.md': 3 }, dominio: { 'procedural/nucleo/n.js': 1 } }, base)).toEqual([
      { regra: 'negrito', arquivo: 'a.md', antes: 2, n: 3 }, { regra: 'dominio', arquivo: 'procedural/nucleo/n.js', antes: 0, n: 1 },
    ]);
  });
});
