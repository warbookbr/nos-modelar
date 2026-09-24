/* fresta-e-porta-ocupada.test.js — duas coisas que a montagem deixava passar
   em silêncio: fresta entre faces apoiadas e duas partes na mesma porta. */
import { describe, expect, it } from 'vitest';
import { validarAssentamentoAnular } from './interfaces-montagem.js';
import { lerPosicoes } from './posicao-por-porta.js';

/* Portas já no mundo: a de baixo recebe na face de cima, em y = 0; a de cima
   ocupa uma faixa que começa `altura` acima dessa face. */
function portas(altura) {
  const anel = (id, papel, y, inicio, fim) => ({
    id, forma: 'anel', papel, eixo: [0, 1, 0], centro: [0, y, 0],
    raioInterno: papel === 'recebe' ? 0 : 0.08, raioExterno: 0.09, inicio, fim,
  });
  return new Map([
    ['base.assento', anel('base.assento', 'recebe', 0, -0.005, 0)],
    ['anel.apoio', anel('anel.apoio', 'ocupa', altura, 0, 0.005)],
  ]);
}

const faixa = (nominal) => ({ nominal, toleranciaFabricacao: { menos: 0, mais: 0 } });
const declaracao = (extra = {}) => ({
  id: 'anelNaBase', tipo: 'assentaAnular', referencia: 'base.assento', movel: 'anel.apoio',
  sobreposicaoRadial: faixa(0.01), sobreposicaoAxial: faixa(0), toleranciaNumerica: 1e-6, ...extra,
});

describe('fresta no assentamento', () => {
  it('faces encostadas passam', () => {
    expect(validarAssentamentoAnular(declaracao(), portas(0)).satisfeita).toBe(true);
  });

  it('reprova fresta que ninguém declarou', () => {
    const resultado = validarAssentamentoAnular(declaracao(), portas(0.002));
    expect(resultado.satisfeita).toBe(false);
    expect(resultado.diagnosticos.map((d) => d.codigo)).toContain('fresta-fora');
  });

  it('aceita a fresta quando ela está declarada, e só dentro da faixa', () => {
    const comFresta = declaracao({ separacaoAxial: { nominal: 0.002, toleranciaFabricacao: { menos: 0.0005, mais: 0.0005 } } });
    expect(validarAssentamentoAnular(comFresta, portas(0.002)).satisfeita).toBe(true);
    expect(validarAssentamentoAnular(comFresta, portas(0)).satisfeita).toBe(false);
    expect(validarAssentamentoAnular(comFresta, portas(0.004)).satisfeita).toBe(false);
  });
});

describe('porta ocupada', () => {
  const instancias = ['chassi', 'rodaA', 'rodaB'].map((id) => ({ id, alvo: { tipo: 'peca', ref: 'x' } }));
  const posicao = (id, instancia, porta) => ({
    id, instancia, porta: 'cubo', em: { instancia: 'chassi', porta }, unidade: 'mm', afastamento: 0,
  });

  it('recusa duas partes na mesma porta e nomeia as duas', () => {
    expect(() => lerPosicoes([posicao('a', 'rodaA', 'cuboEsquerdo'), posicao('b', 'rodaB', 'cuboEsquerdo')], instancias, new Set()))
      .toThrow(/já recebe 'rodaA'; 'rodaB'/);
  });

  it('portas diferentes do mesmo vizinho passam', () => {
    expect(lerPosicoes([posicao('a', 'rodaA', 'cuboEsquerdo'), posicao('b', 'rodaB', 'cuboDireito')], instancias, new Set()))
      .toHaveLength(2);
  });
});
