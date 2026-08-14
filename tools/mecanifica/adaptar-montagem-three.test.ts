/* Prova que a visualização de montagem deriva somente da árvore resolvida. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — adaptador visual JavaScript, exercitado pelo contrato.
import { adaptarMontagemThree } from '../../src/autoria/adaptar-montagem-three.js';
// @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));

describe('adaptarMontagemThree', () => {
  it('preserva pose mundo e caminho semântico sem expor UUID como identidade', async () => {
    const montagem = ler('./fixtures/montagens-persistidas/v3-separacao-direcional.json');
    const peca = ler('./fixtures/pecas-resolvidas/bloco-gabarito.json');
    const resolvida: any = await resolverMontagemPersistida(montagem, { carregarPeca: async () => peca });
    const visual = adaptarMontagemThree(resolvida);
    const movel: any = visual.instancias.get(JSON.stringify(['movel']));

    expect(movel.visual.raiz.matrixWorld.elements.slice(12, 15)).toEqual([0, 1.02, 0]);
    expect(movel.visual.raiz.userData.caminho).toEqual(['movel']);
    expect(JSON.stringify(movel.visual.raiz.userData)).not.toContain('uuid');
    expect(visual.raiz.userData).toEqual({ tipo: 'montagem-resolvida', id: 'gabarito-separacao-direcional' });
  });

  it('recusa entrada que não seja árvore resolvida', () => {
    expect(() => adaptarMontagemThree({ id: 'incompleta' })).toThrow('montagem resolvida');
  });
});
