/* montar-sem-relato.test.js — `montarOpcoes` com `relato: false` não calcula o relato de contatos e devolve o mesmo neutro, as
 * mesmas partes e o resto do painel iguais aos do padrão, que continua trazendo o relato. O espião conta as chamadas do relato. */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/contatos.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, relatoDeContatos: vi.fn(original.relatoDeContatos) };
});

const { relatoDeContatos } = await import('../src/contatos.js');
const { EXEMPLO, hashDoNeutro, montarOpcoes } = await import('../../../tools/modelar/esboco-nucleo.mjs');

describe('montarOpcoes sem o relato de contatos', () => {
  it('com relato: false não chama o relato, deixa contatos em null e o resto do painel sai igual ao do padrão', () => {
    const esboco = JSON.parse(EXEMPLO);
    relatoDeContatos.mockClear();
    const comRelato = montarOpcoes(esboco, { nome: 'n' });
    const chamadasDoPadrao = relatoDeContatos.mock.calls.length;
    expect(chamadasDoPadrao).toBe(comRelato.paineis.length);
    expect(comRelato.paineis.length).toBeGreaterThan(0);
    for (const p of comRelato.paineis) expect(p.contatos).toEqual(expect.objectContaining({ naoDeclaradas: expect.any(Array), faltam: expect.any(Array) }));

    relatoDeContatos.mockClear();
    const semRelato = montarOpcoes(esboco, { nome: 'n', relato: false });
    expect(relatoDeContatos).not.toHaveBeenCalled();
    expect(semRelato.recusas).toEqual([]);
    expect(semRelato.paineis.length).toBe(comRelato.paineis.length);
    semRelato.paineis.forEach((p, i) => {
      const q = comRelato.paineis[i];
      expect(p.contatos).toBeNull();
      expect(hashDoNeutro(p.neutro)).toBe(hashDoNeutro(q.neutro));
      expect(p.partes).toEqual(q.partes);
      const { contatos: _a, ...restoSem } = p;
      const { contatos: _b, ...restoCom } = q;
      expect(restoSem).toEqual(restoCom);
    });
    const { paineis: _c, ...envoltoSem } = semRelato;
    const { paineis: _d, ...envoltoCom } = comRelato;
    expect(envoltoSem).toEqual(envoltoCom);
  });
});
