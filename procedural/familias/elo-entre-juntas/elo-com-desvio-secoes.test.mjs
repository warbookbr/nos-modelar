/* elo-com-desvio-secoes.test.mjs — o elo curvo das três seções (elíptica, redonda e de cantos arredondados), em azimutes diferentes, sem órfão, lasca nem porta fora do lugar */
import { describe, expect, it } from 'vitest';
import { medirPonto } from '../../../tools/modelar/aprovacao-da-familia.mjs';
import { F, PADRAO } from './medidas-do-elo-com-desvio.mjs';

describe('elo entre juntas com desvio, as seções', () => {
  for (const [nome, parametros] of [
    ['a elíptica a 25°, para +z', { desvio: 25 }],
    ['a redonda a 45°, a 45° de azimute', { secao: 2, desvio: 45, azimute: 45 }],
    ['a de cantos arredondados a 30°, a −37° de azimute', { secao: 3, desvio: 30, azimute: -37 }],
  ]) it(`a seção ${nome} sai com a parte elo num pedaço só, sem órfão, sem lasca e com as portas no lugar`, () => {
    const r = medirPonto(F, { ...PADRAO, ...parametros }, nome, { montagem: 'nenhuma' });
    expect(r.problemas.map((p) => `${p.codigo}: ${p.mensagem}`)).toEqual([]);
    expect(r.estado).toBe('ok');
  });
});
