/* catalogo-pecas.test.ts — catálogo vazio é estado válido; IDs e carregadores
 * continuam sendo contratos explícitos quando uma peça voltar a ser publicada.
 */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo JavaScript puro do contrato de bancada.
import { CATALOGO_HOMOLOGADO, entradaDoCatalogo, idsDoCatalogo, validarCatalogo } from '../../src/bancada/catalogo-pecas.js';

describe('catálogo explícito', () => {
  it('aceita publicação vazia sem inventar peça padrão', () => {
    expect(CATALOGO_HOMOLOGADO).toEqual([]);
    expect(idsDoCatalogo(CATALOGO_HOMOLOGADO)).toEqual([]);
  });

  it('exige IDs únicos e carregadores explícitos', () => {
    const carregar = async () => ({ PASSOS: [] });
    const catalogo = validarCatalogo([{ id: 'fixture', carregar }]);
    expect(entradaDoCatalogo(catalogo, 'fixture').carregar).toBe(carregar);
    expect(() => validarCatalogo([{ id: 'x', carregar }, { id: 'x', carregar }])).toThrow(/duplicado/);
    expect(() => validarCatalogo([{ id: 'x' } as any])).toThrow(/carregador/);
  });

  it('recusa ID que não foi publicado', () => {
    expect(() => entradaDoCatalogo([], 'ausente')).toThrow(/não está publicada/);
  });
});
