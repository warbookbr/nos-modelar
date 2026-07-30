/* expressoes.test.ts — contrato da aritmética fechada de PARAMS/TOPO (O-5). */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — motor em JavaScript exercitado pela interface pública.
import { criarResolverNumerico } from '../../prototipos/fps/v3/motor/expressoes.js';
// @ts-expect-error — integração do resolvedor com o núcleo.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';

describe('expressões da Oficina', () => {
  it('calcula precedência, parênteses e nomes sem executar JavaScript', () => {
    const { num } = criarResolverNumerico({ raio: 0.14, folga: 0.002, metade: '=raio / 2' });
    expect(num('=raio + folga * 2')).toBeCloseTo(0.144, 12);
    expect(num('=(raio + folga) / 2')).toBeCloseTo(0.071, 12);
    expect(num('=-(metade + folga)')).toBeCloseTo(-0.072, 12);
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
