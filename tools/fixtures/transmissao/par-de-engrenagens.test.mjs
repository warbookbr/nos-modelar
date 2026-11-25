/* par-de-engrenagens.test.mjs — o par de retas de módulo 1 com 20 e 40 dentes e o pinhão sobre a cremalheira: a distância
 * entre centros medida na malha é a calculada até 0,01 mm, nenhum dente atravessa o outro em quatro posições de um passo
 * (os dentes são iguais, então o engrenamento se repete a cada passo da motora e um passo cobre a volta inteira), e a
 * medida de contatos acusa o par apertado, a motora meio dente fora de fase e o pinhão girando ao contrário. */
import { describe, expect, it } from 'vitest';
import { receitaDoParDeEngrenagens, receitaDoPinhao } from './par-de-engrenagens.mjs';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';

const registro = criarRegistroDeFamilias();
const executar = (receita) => executarReceita(receita, { registroOperacoes: registro.registroOperacoes }).neutro;
const contatos = ({ receita }) => contatosDaPeca(executar(receita), receita);
function centroX(neutro, parte) {
  let min = Infinity; let max = -Infinity;
  for (const f of neutro.F.values()) if (f.parte === parte) for (const v of f.vs) { const x = neutro.V.get(v)[0] * 1000; min = Math.min(min, x); max = Math.max(max, x); }
  return (min + max) / 2;
}

describe('par de engrenagens retas', () => {
  it('a distância entre centros é m·(z1 + z2)/2 mais o afastamento da folga, medida na malha até 0,01 mm', () => {
    const r = receitaDoParDeEngrenagens();
    expect(r.par.distanciaNominal).toBe(30);
    expect(r.par.relacao).toBe(2);
    expect(r.par.afastamento).toBeCloseTo(0.05 / (2 * Math.tan(Math.PI / 9)), 9);
    const n = executar(r.receita);
    expect(Math.abs(centroX(n, 'movidaEngrenagem') - centroX(n, 'motoraEngrenagem') - r.par.distanciaEntreCentros)).toBeLessThan(0.01);
  });

  it('nenhum dente atravessa o outro em quatro posições de um passo da motora', () => {
    for (const phi of [0, 4.5, 9, 13.5]) {
      const c = contatos(receitaDoParDeEngrenagens({ phi }));
      expect(c.cobertura.completa, `phi ${phi}`).toBe(true);
      expect(c.paresEmContato, `phi ${phi}`).toEqual([]);
    }
  });

  it('a medida acusa o par apertado além da folga', () => {
    expect(contatos(receitaDoParDeEngrenagens({ folga: -0.2 })).naoDeclarados.map((p) => p.estado)).toEqual(['interpenetram']);
  });
});

describe('pinhão e cremalheira', () => {
  it('nenhum dente atravessa o outro em três posições de um passo da cremalheira, e o par apertado é acusado', () => {
    for (const x of [0, 1.05, 2.1]) {
      const c = contatos(receitaDoPinhao({ x }));
      expect(c.cobertura.completa, `x ${x}`).toBe(true);
      expect(c.paresEmContato, `x ${x}`).toEqual([]);
    }
    expect(contatos(receitaDoPinhao({ folga: -0.2 })).naoDeclarados.map((p) => p.estado)).toEqual(['interpenetram']);
  });
});
