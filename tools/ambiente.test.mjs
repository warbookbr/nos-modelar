/* ambiente.test.mjs — o nome novo vale, o antigo vale com um aviso só por nome, e o vazio conta como ausente. */
import { describe, expect, it } from 'vitest';
import { doAmbiente } from './ambiente.mjs';

describe('doAmbiente', () => {
  it('lê o nome novo antes do antigo, e o antigo avisa uma vez', () => {
    const avisos = [];
    const avisar = (t) => avisos.push(t);
    expect(doAmbiente('TESTE_A', { MODELAR_TESTE_A: 'novo', MECANIFICA_TESTE_A: 'velho' }, { avisar })).toBe('novo');
    expect(doAmbiente('TESTE_A', { MECANIFICA_TESTE_A: 'velho' }, { avisar })).toBe('velho');
    expect(doAmbiente('TESTE_A', { MECANIFICA_TESTE_A: 'velho' }, { avisar })).toBe('velho');
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/MODELAR_TESTE_A/);
  });

  it('o vazio conta como ausente', () => {
    expect(doAmbiente('TESTE_B', { MODELAR_TESTE_B: '', MECANIFICA_TESTE_B: 'x' }, { avisar: () => {} })).toBe('x');
    expect(doAmbiente('TESTE_B', {}, { avisar: () => {} })).toBeUndefined();
  });
});
