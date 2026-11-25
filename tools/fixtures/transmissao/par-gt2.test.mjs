/* par-gt2.test.mjs — o par GT2 de 20 e 80 dentes com a correia fechada: a correia tem número inteiro de dentes e a
 * distância entre centros sai da conta do comprimento primitivo, a polia movida fica nessa distância medida na malha, a
 * correia não toca nenhuma polia com a medida de contatos completa, e a mesma medida acusa a polia girada meio dente. */
import { describe, expect, it } from 'vitest';
import { receitaDoPar } from './par-gt2.mjs';
import { comprimentoPrimitivo, transmissaoDentada } from '../../../procedural/familias/polia-e-correia/correia.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';

const registro = criarRegistroDeFamilias();
const executar = (receita) => executarReceita(receita, { registroOperacoes: registro.registroOperacoes }).neutro;
function caixaDaParte(neutro, parte) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const f of neutro.F.values()) if (f.parte === parte) for (const v of f.vs) { const p = neutro.V.get(v); for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], p[k] * 1000); max[k] = Math.max(max[k], p[k] * 1000); } }
  return { min, max };
}

describe('par GT2 de 20 e 80 dentes com a correia', () => {
  const par = receitaDoPar(150);
  const neutro = executar(par.receita);

  it('a correia tem 201 dentes, 402 mm de comprimento primitivo e a distância que esse comprimento dá', () => {
    const t = par.transmissao;
    expect(t.dentesDaCorreia).toBe(201);
    expect(t.comprimento).toBe(402);
    expect(comprimentoPrimitivo(t.r1, t.r2, t.distanciaEntreCentros)).toBeCloseTo(402, 6);
    expect(t.distanciaEntreCentros).toBeCloseTo(149.7807, 3);
    expect(t.relacao).toBe(4);
  });

  it('as três partes saem sem órfão, e a polia movida está na distância calculada até 0,01 mm', () => {
    expect((neutro.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect([...new Set([...neutro.F.values()].map((f) => f.parte))].sort()).toEqual(['correia', 'motoraPolia', 'movidaPolia']);
    const motora = caixaDaParte(neutro, 'motoraPolia');
    const movida = caixaDaParte(neutro, 'movidaPolia');
    const centro = (c) => (c.min[0] + c.max[0]) / 2;
    expect(Math.abs(centro(movida) - centro(motora) - par.transmissao.distanciaEntreCentros)).toBeLessThan(0.01);
  });

  it('a correia não toca as polias, com a medida de contatos completa', () => {
    const c = contatosDaPeca(neutro, par.receita);
    expect(c.cobertura.completa).toBe(true);
    expect(c.paresEmContato).toEqual([]);
  });

  it('com a polia movida girada meio dente, a medida acusa a correia dentro dela', () => {
    const sonda = receitaDoPar(150, undefined, { desvioDoGiro: 2.25 });
    const c = contatosDaPeca(executar(sonda.receita), sonda.receita);
    expect(c.cobertura.completa).toBe(true);
    expect(c.naoDeclarados.map((p) => [...p.par].sort().join('+'))).toContain('correia+movidaPolia');
  });

  it('recusa a polia maior primeiro, correias diferentes e a distância que não cabe', () => {
    const completos = (perfil) => ({ ...Object.fromEntries(Object.entries(registro.obter('polia-e-correia').contrato.parametros).map(([n, d]) => [n, d.padrao])), ...registro.obter('polia-e-correia').contrato.perfis[perfil].parametros });
    expect(() => transmissaoDentada(completos('gt2-80'), completos('gt2-20'), 150)).toThrow(/menor/);
    expect(() => transmissaoDentada(completos('gt2-20'), completos('htd-5m'), 150)).toThrow(/mesma correia/);
    expect(() => transmissaoDentada(completos('gt2-20'), completos('gt2-80'), 20)).toThrow(/não passa da soma dos raios/);
  });
});

describe('correia dentada em polias grandes', () => {
  it('o par T5 de 24 e 150 dentes sai sem contato, com a face de dentro acima da flecha das cordas', () => {
    const par = receitaDoPar(600, ['t5', 't5'], { parametros2: { dentes: 150, flanges: 0, furo: 20, diametroDoCubo: 40 } });
    const c = contatosDaPeca(executar(par.receita), par.receita);
    expect(c.cobertura.completa).toBe(true);
    expect(c.paresEmContato).toEqual([]);
  });
});
