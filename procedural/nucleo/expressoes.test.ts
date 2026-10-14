/* expressoes.test.ts — contrato da aritmética fechada de PARAMS/TOPO (O-5). */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — motor em JavaScript exercitado pela interface pública.
import { criarResolverNumerico } from './expressoes.js';
// @ts-expect-error — integração do resolvedor com o núcleo.
import { nucleo } from './entrada.js';

describe('expressões da Oficina', () => {
  it('calcula precedência, parênteses e nomes sem executar JavaScript', () => {
    const { num } = criarResolverNumerico({ raio: 0.14, folga: 0.002, metade: '=raio / 2' });
    expect(num('=raio + folga * 2')).toBeCloseTo(0.144, 12);
    expect(num('=(raio + folga) / 2')).toBeCloseTo(0.071, 12);
    expect(num('=-(metade + folga)')).toBeCloseTo(-0.072, 12);
  });

  it('atan e atan2 dão o ângulo em graus, e o nome de parâmetro igual ao da função continua valendo sem parênteses', () => {
    const { num } = criarResolverNumerico({ dy: 1, dx: -1, atan: 3, inclinacao: '=atan(dy / 1)' });
    expect(num('=atan(1)')).toBeCloseTo(45, 12);
    expect(num('=atan2(dy, dx)')).toBeCloseTo(135, 12);
    expect(num('=atan2(-1, -1)')).toBeCloseTo(-135, 12);
    expect(num('=2 * atan2(0, 1) + atan')).toBe(3);
    expect(num('inclinacao')).toBeCloseTo(45, 12);
  });

  it('sin, cos e tan recebem o ângulo em graus, e sqrt dá a raiz', () => {
    const { num } = criarResolverNumerico({ ang: 30, r: 110 });
    expect(num('=sin(ang)')).toBeCloseTo(0.5, 12);
    expect(num('=cos(60)')).toBeCloseTo(0.5, 12);
    expect(num('=tan(45)')).toBeCloseTo(1, 12);
    expect(num('=sqrt(r * r - 66 * 66)')).toBeCloseTo(88, 12);
    expect(num('=atan2(sin(ang), cos(ang))')).toBeCloseTo(30, 12);
  });

  it('min e max dão o menor e o maior de dois ou mais valores, e aceitam parâmetros, expressões e negativos', () => {
    const { num } = criarResolverNumerico({ a: 3, b: -7, c: '=a*2', menor: '=min(a, b)', grande: '=max(a, b, c, 5)' });
    expect(num('=min(a, b)')).toBe(-7);
    expect(num('=max(a, b)')).toBe(3);
    expect(num('=min(c, 10, a + 1)')).toBe(4);
    expect(num('=max(-1, -2)')).toBe(-1);
    expect(num('=min(4, 4)')).toBe(4);
    expect(num('menor')).toBe(-7);
    expect(num('grande')).toBe(6);
    /* o menor de dois é o que a conta pela raiz do quadrado da diferença dava, sem a raiz */
    expect(num('=min(a, c)')).toBe(num('=(a + c - sqrt((a - c) * (a - c))) / 2'));
    expect(num('=2 * max(a, 1) + min(a, 1)')).toBe(7);
  });

  it('min e max recusam menos de dois argumentos, e um parâmetro com o nome da função continua valendo sem parênteses', () => {
    const { num } = criarResolverNumerico({ a: 1, min: 9, max: 2 });
    expect(() => num('=min(a)')).toThrow(/'min' recebe 2 ou mais argumento\(s\), não 1/);
    expect(() => num('=max(a')).toThrow(/faltou '\)'/);
    expect(num('=min + max')).toBe(11);
    expect(num('=max(min, max)')).toBe(9);
  });

  it('recusa função fora da lista e número errado de argumentos', () => {
    const { num } = criarResolverNumerico({ a: 1 });
    expect(() => num('=asin(a)')).toThrow(/função 'asin' não existe.*atan, atan2, sin, cos, tan, sqrt, min, max/);
    expect(() => num('=sqrt(0 - a)')).toThrow(/sqrt de -1, que é negativo/);
    expect(() => num('=atan2(a)')).toThrow(/'atan2' recebe 2 argumento/);
    expect(() => num('=atan(a, a)')).toThrow(/'atan' recebe 1 argumento/);
    expect(() => num('=atan(a')).toThrow(/faltou '\)'/);
  });

  it('recusa símbolo, nome ausente, ciclo e resultado não-finito', () => {
    expect(() => criarResolverNumerico({ raio: 1 }).num('=raio.constructor')).toThrow(/símbolo/);
    expect(() => criarResolverNumerico({}).num('=ausente + 1')).toThrow(/não existe/);
    expect(() => criarResolverNumerico({ a: '=b + 1', b: '=a + 1' }).num('a')).toThrow(/ciclo.*a -> b -> a/);
    expect(() => criarResolverNumerico({ a: 1 }).num('=a / 0')).toThrow(/não-finito/);
  });

  it('o núcleo aceita expressão em argumento numérico sem mudar o contrato de nomes', () => {
    const neutro = nucleo([['cubo', { larg: '=raio * 2', alt: 'altura', prof: '=raio + 0.1', origemId: 1 }]], {
      raio: 0.25,
      altura: '=raio * 4',
    });
    expect(neutro.V.get(0)).toEqual([-0.25, 0, -0.175]);
    expect([...neutro.V.values()]).toContainEqual([0.25, 1, -0.175]);
  });
});
