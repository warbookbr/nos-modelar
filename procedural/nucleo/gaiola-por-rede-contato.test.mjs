/* gaiola-por-rede-contato.test.mjs — o contato declarado da moldura de 10 mm com a chapa por rede de curvas
 *
 * A moldura é um `friso` sobre a linha da curva da janela, sólido próprio que entra 0,5 mm na chapa de 1,5 mm de espessura pela base do perfil. A
 * receita declara o par, e `contatosDaPeca` mede `interpenetram`, declarado, sem outro par em contato. Fica fora de `gaiola-por-rede-prova.test.mjs`
 * porque a medida leva alguns segundos; está na lista dos testes lentos. */
import { describe, expect, it } from 'vitest';
import { nucleo } from './entrada.js';
import { CONTATOS, receitaComMoldura } from './fixtures/gaiola-por-rede-prova.js';
import { contatosDaPeca } from '../../src/autoria/contatos-da-peca.js';

describe('o contato declarado da moldura com a chapa por rede de curvas', () => {
  it('a moldura interpenetra a chapa, com o contato declarado, e nada mais se toca', () => {
    const r = receitaComMoldura({}, 1);
    const neutro = nucleo(r.PASSOS, r.TOPO);
    expect(neutro.orfaos).toEqual([]);
    const c = contatosDaPeca(neutro, { contatos: CONTATOS });
    expect(c.paresEmContato.map(({ par, estado, declarado }) => [par, estado, declarado])).toEqual([[['chapa', 'moldura'], 'interpenetram', true]]);
    expect(c.naoDeclarados).toEqual([]);
    expect(c.declaradosSemContato).toEqual([]);
    expect(c.cobertura.completa).toBe(true);
  }, 120_000);
});
