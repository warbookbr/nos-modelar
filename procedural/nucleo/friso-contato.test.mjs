/* friso-contato.test.mjs — o contato declarado do gate da fatia 13 do plano da carroceria por subdivisão: na chapa
   curva com vão de `fixtures/friso-prova.js`, cada friso é um sólido próprio que entra na chapa, a receita nomeia as
   partes e declara os pares, e `contatosDaPeca` mede cada par como `interpenetram`, declarado, sem outro par em
   contato. Fica fora de `friso.test.mjs` porque a medida leva cerca de 5 s; está na lista dos testes lentos. */
import { describe, expect, it } from 'vitest';
import { nucleo } from './entrada.js';
import * as prova from './fixtures/friso-prova.js';
import { contatosDaPeca } from '../../src/autoria/contatos-da-peca.js';

describe('gate da fatia 13: o contato declarado do friso com a chapa', () => {
  it('cada friso interpenetra a chapa, com o contato declarado, e nada mais se toca', () => {
    const neutro = nucleo(prova.passos(), prova.pontos());
    expect(neutro.orfaos).toEqual([]);
    const c = contatosDaPeca(neutro, { contatos: prova.CONTATOS });
    expect(c.paresEmContato.map(({ par, estado, declarado }) => [par, estado, declarado])).toEqual([
      [['aba', 'chapa'], 'interpenetram', true], [['chapa', 'nervura'], 'interpenetram', true], [['chapa', 'voltaDoVao'], 'interpenetram', true],
    ]);
    expect(c.naoDeclarados).toEqual([]);
    expect(c.declaradosSemContato).toEqual([]);
    expect(c.cobertura.completa).toBe(true);
  }, 120_000);
});
