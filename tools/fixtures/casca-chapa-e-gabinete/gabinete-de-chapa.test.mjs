/* gabinete-de-chapa.test.mjs — o gabinete de chapa: a base e a tampa saem cada uma num pedaço só, e a tampa só encosta na
 * base, com as abas por fora das da base e sem entrar no canto delas. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { pedacosDaMalha } from '../transmissao/pedacos.mjs';
import { receitaDoGabineteDeChapa } from './gabinete-de-chapa.mjs';

const registro = criarRegistroDeFamilias();

describe('gabinete de chapa', () => {
  it('a base e a tampa saem num pedaço cada, e a tampa só encosta na base', () => {
    const { receita } = receitaDoGabineteDeChapa();
    const n = executarReceita(receita, { registroOperacoes: registro.registroOperacoes }).neutro;
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    for (const parte of ['base', 'tampa']) expect(pedacosDaMalha({ V: n.V, F: new Map([...n.F].filter(([, f]) => f.parte === parte)) }), parte).toBe(1);
    const c = contatosDaPeca(n, receita);
    expect(c.paresEmContato.map((p) => `${p.par.join('+')}:${p.estado}`)).toEqual(['base+tampa:encostam']);
    expect(c.atravessados).toEqual([]);
  });
});
