/* friso-contato.test.mjs — o contato declarado do gate da fatia 13 do plano da carroceria por subdivisão (e o da aba da fatia 25): na chapa
   curva com vão de `fixtures/friso-prova.js`, cada friso é um sólido próprio que entra na chapa, a receita nomeia as
   partes e declara os pares, e `contatosDaPeca` mede cada par como `interpenetram`, declarado, sem outro par em
   contato. Fica fora de `friso.test.mjs` porque a medida leva cerca de 5 s; está na lista dos testes lentos. */
import { describe, expect, it } from 'vitest';
import { nucleo } from './entrada.js';
import * as prova from './fixtures/friso-prova.js';
import * as provaDaAba from './fixtures/aba-prova.js';
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

  it('a moldura de largura variável em volta do vão interpenetra a chapa, com o contato declarado, e nada mais se toca', () => {
    const neutro = nucleo(prova.passosDaMoldura(), prova.pontos());
    expect(neutro.orfaos).toEqual([]);
    const c = contatosDaPeca(neutro, { contatos: prova.CONTATOS_DA_MOLDURA });
    expect(c.paresEmContato.map(({ par, estado, declarado }) => [par, estado, declarado])).toEqual([[['chapa', 'moldura'], 'interpenetram', true]]);
    expect(c.naoDeclarados).toEqual([]);
    expect(c.declaradosSemContato).toEqual([]);
    expect(c.cobertura.completa).toBe(true);
  }, 120_000);

  it('a aba da borda do vão encosta na chapa com o contato declarado, e nada mais se toca', () => {
    const { pontos, passos } = provaDaAba.passos();
    const neutro = nucleo(passos, pontos);
    expect(neutro.orfaos).toEqual([]);
    const c = contatosDaPeca(neutro, { contatos: provaDaAba.CONTATOS });
    /* a aba nasce na parede da borda da chapa, e a costura difere da parede por menos de 0,1 mm: a medida a vê como interpenetração */
    expect(c.paresEmContato.map(({ par, estado, declarado }) => [par, estado, declarado])).toEqual([[['aba', 'chapa'], 'interpenetram', true]]);
    expect(c.naoDeclarados).toEqual([]);
    expect(c.declaradosSemContato).toEqual([]);
    expect(c.cobertura.completa).toBe(true);
  }, 120_000);
});
