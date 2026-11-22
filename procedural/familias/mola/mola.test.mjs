/* mola.test.mjs — a família `mola`: as três formas saem com as partes certas e sem órfão, a compressão ocupa o comprimento
 * livre com as pontas encostadas, e as restrições recusam o fio grosso demais e a compressão sem folga entre as espiras. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { geometriaDaMola, ENCOSTADO } from './geometria.js';

const registro = criarRegistroDeFamilias();
const MOLA = registro.obter('mola');
const executar = (parametros) => executarReceita(
  { meta: { nome: 'mola' }, get CHAMADAS_COMPOSICOES() { return [chamar(MOLA, 'mola', parametros)]; } },
  { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes },
).neutro;

function caixa(neutro) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const f of neutro.F.values()) for (const v of f.vs) { const p = neutro.V.get(v); for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], p[k] * 1000); max[k] = Math.max(max[k], p[k] * 1000); } }
  return { min, max };
}
const partes = (neutro) => [...new Set([...neutro.F.values()].map((f) => f.parte))].sort();

describe('família mola', () => {
  it('cada perfil sai sem órfão e com as partes da forma', () => {
    const esperado = { compressao: ['espiras'], tracao: ['espiras', 'ganchos'], torcao: ['bracos', 'espiras'] };
    for (const [perfil, lista] of Object.entries(esperado)) {
      const n = executar({ perfil });
      expect((n.orfaos ?? []).map((o) => o.motivo), perfil).toEqual([]);
      expect(partes(n), perfil).toEqual(lista);
    }
  });

  it('a compressão vai de y 0 ao comprimento livre, no diâmetro externo', () => {
    const c = caixa(executar({ perfil: 'compressao', comprimentoLivre: 60 }));
    expect(c.min[1]).toBeCloseTo(0, 1);
    expect(c.max[1]).toBeCloseTo(60, 1);
    expect(c.max[0] - c.min[0]).toBeCloseTo(20, 0);
  });

  it('a compressão tem a volta de cada ponta encostada e o passo do meio maior que 1,1 fio', () => {
    const g = geometriaDaMola({ forma: 1, diametroDoFio: 2, diametroExterno: 20, comprimentoLivre: 50, espiras: 8, comprimentoDoBraco: 30 });
    expect(g.helice.pontas).toEqual({ voltas: 1, passo: ENCOSTADO * 2 });
    expect(g.helice.passo).toBeGreaterThan(2.2);
    expect(g.helice.altura).toBeCloseTo(48, 9);
  });

  it('recusa o fio grosso demais para a espira e a compressão sem folga', () => {
    expect(() => chamar(MOLA, 'mola', { diametroDoFio: 5, diametroExterno: 20 })).toThrow(/fio-cabe-na-espira/);
    expect(() => chamar(MOLA, 'mola', { forma: 1, espiras: 30, comprimentoLivre: 40 })).toThrow(/compressao-com-folga-entre-espiras/);
    expect(() => chamar(MOLA, 'mola', { forma: 2, espiras: 30, comprimentoLivre: 40 })).not.toThrow();
  });
});
