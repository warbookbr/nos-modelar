/* Prova catálogo global confinado às raízes explicitamente resolvidas. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público, exercitado pelo contrato.
import { derivarCatalogoMontagens, ErroCatalogoMontagens } from '../../src/autoria/derivar-catalogo-montagens.js';
// @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));
async function raiz(id: string) {
  const dado = ler('./fixtures/montagens-persistidas/v3-separacao-direcional.json');
  dado.id = id;
  return resolverMontagemPersistida(dado, { carregarPeca: async () => ler('./fixtures/pecas-resolvidas/bloco-gabarito.json') }) as any;
}

describe('derivarCatalogoMontagens', () => {
  it('indexa somente usos e relações das raízes informadas', async () => {
    const catalogo = derivarCatalogoMontagens([await raiz('z'), await raiz('a')]);
    expect(catalogo.raizes).toEqual([{ id: 'a' }, { id: 'z' }]);
    expect(catalogo.usos).toHaveLength(1);
    expect(catalogo.usos[0].instancias.map((item: any) => item.raiz.id)).toEqual(['a', 'a', 'z', 'z']);
    expect(catalogo.relacoes.map((item: any) => item.raiz.id)).toEqual(['a', 'z']);
    expect(catalogo.limitacoes).toContain('uso-fora-do-catalogo-nao-verificado');
  });

  it('recusa raiz duplicada sem mutar a entrada', async () => {
    const unica = await raiz('igual');
    const entrada = [unica, unica];
    expect(() => derivarCatalogoMontagens(entrada)).toThrow(ErroCatalogoMontagens);
    expect(entrada).toEqual([unica, unica]);
  });
});
