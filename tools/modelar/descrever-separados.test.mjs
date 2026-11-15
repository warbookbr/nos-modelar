/* descrever-separados.test.mjs — `separados` da receita no `descrever`: a peça com a folga pedida passa, e a que fica abaixo dela, ou se toca, reprova citando o par, a distância medida e a folga. */
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';

const MOTIVO = 'o pneu não pode roçar a lâmina';
const cubo = (id, nome, em = [0, 0, 0]) => [
  ['cubo', { origemId: id, larg: 0.01, alt: 0.01, prof: 0.01 }],
  ...(em.some((c) => c !== 0) ? [['transladar', { d: em, sel: { origem: { op: 'cubo', id } } }]] : []),
  ['parte', { nome, sel: { origem: { op: 'cubo', id } } }],
];
const receita = (vaoMm, folgaMm) => ({
  meta: { nome: 'dois-cubos-separados' },
  PASSOS: [...cubo(1, 'a'), ...cubo(2, 'b', [0.01 + vaoMm / 1000, 0, 0])],
  separados: [{ par: ['a', 'b'], folgaMinima: folgaMm / 1000, motivo: MOTIVO }],
});
const descrever = (modulo) => descreverPecaReutilizavel({ peca: 'tools/fixtures/separados/receita', modulo });

describe('separados no descrever', () => {
  it('a folga cumprida não reprova por causa do par', async () => {
    const r = await descrever(receita(5, 3));
    expect(r.stderr).not.toMatch(/SEM A FOLGA MÍNIMA/);
    expect(r.resultado.contatos.separadosReprovados).toEqual([]);
  });

  it('a folga curta reprova citando o par, a distância medida e a folga pedida', async () => {
    const r = await descrever(receita(2, 3));
    expect(r.ok).toBe(false);
    expect(r.stderr).toMatch(/1 PAR\(ES\) DE `separados` SEM A FOLGA MÍNIMA/);
    expect(r.stderr).toMatch(/a ↔ b: distância medida 2\.00 mm, folga pedida 3\.00 mm/);
  });

  it('o toque reprova dizendo que as partes se tocam', async () => {
    const r = await descrever(receita(0, 3));
    expect(r.ok).toBe(false);
    expect(r.stderr).toMatch(/a ↔ b: se tocam, folga pedida 3\.00 mm/);
  });
});
