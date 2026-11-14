/* invasao-tolerada.test.mjs — a lista das peças antigas toleradas só encolhe.
 *
 * A invasão de contato declarado reprova a peça nova e vira aviso nas 31 peças do acervo que já afundavam quando a régua entrou (2026-11-14). Peça que deixa de
 * invadir tem de sair da lista, e este teste a recusa se ficar: lista que não encolhe vira licença permanente.
 */
import { describe, expect, it } from 'vitest';
import { pecasToleradas } from './invasao-de-contato.js';
import { pecasDoAcervo } from '../../tools/modelar/guardas/guarda-acervo.mjs';
import { descreverPecaReutilizavel } from '../../tools/modelar/descrever-peca.mjs';

const lista = [...pecasToleradas().keys()];

describe('a lista das peças antigas toleradas', () => {
  it('tem só peças que existem no acervo, sem repetição e em ordem', () => {
    const acervo = new Set(pecasDoAcervo());
    expect(lista.filter((p) => !acervo.has(p))).toEqual([]);
    expect(new Set(lista).size).toBe(lista.length);
    expect([...lista].sort()).toEqual(lista);
  });

  it('a peça da lista só avisa, e a que está fora reprova, com a mesma geometria', async () => {
    const modulo = await import('../../tools/modelar/fixtures/invasao/haste-atravessa.js');
    const fora = await descreverPecaReutilizavel({ peca: 'haste-atravessa', modulo, estrito: true });
    expect(fora.codigo).toBe(1);
    expect(fora.stderr).toContain('INVADE A OUTRA');
    const dentro = await descreverPecaReutilizavel({ peca: lista[0], modulo, estrito: true });
    expect(dentro.stderr).not.toContain('INVADE A OUTRA');
    expect(dentro.stdout).toMatch(/aviso: peça antiga tolerada desde 2026-11-14/);
    expect(dentro.stdout).toContain('afunda');
    expect(dentro.stdout).toContain('invasaoMaxima');
  });

  describe.each(lista)('%s', (peca) => {
    it('ainda invade; se não invade mais, tire a peça de src/autoria/invasao-tolerada.json', async () => {
      const r = await descreverPecaReutilizavel({ peca, estrito: true });
      expect(r.stdout, `'${peca}' está na lista das antigas toleradas e já não invade nenhum contato declarado: tire-a de src/autoria/invasao-tolerada.json (a lista só encolhe).`)
        .toContain('peça antiga tolerada');
    }, 900_000);
  });
});
