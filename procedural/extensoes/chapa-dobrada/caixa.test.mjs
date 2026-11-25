/* caixa.test.mjs — a caixa de chapa: sai num pedaço só, com as abas para cima ou para baixo; a área do planificado é a da
 * base mais a de cada aba aberta, conferida contra a área planificada que a própria `chapaDobrada` dá para a seção da aba,
 * até 0,5 %; o alívio deixa os cantos abertos; e a caixa recusa as bordas que deixariam a ponta de uma aba rente à base. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { criarRegistroDeFamilias } from '../../familias/index.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { geometriaDaCaixaDeChapa, passosDaCaixaDeChapa } from './caixa.js';
import { medidasDaChapa } from './chapa.js';

const registro = criarRegistroDeFamilias();
const CAIXA = { largura: 200, profundidade: 120, espessura: 1.5, raioInterno: 2, alturaDaAba: 40 };

describe('caixa de chapa', () => {
  for (const sentido of [1, -1]) it(`sai num pedaço só, sem órfão, com as abas para ${sentido > 0 ? 'cima' : 'baixo'}`, () => {
    const { passos } = passosDaCaixaDeChapa({ ...CAIXA, sentido });
    const n = executarReceita({ meta: { nome: 'caixa' }, PASSOS: passos }, { registroOperacoes: registro.registroOperacoes }).neutro;
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect(pedacosDaMalha(n)).toBe(1);
    const ys = [...n.V.values()].map((v) => v[1] * 1000);
    expect(sentido > 0 ? Math.max(...ys) : -Math.min(...ys)).toBeCloseTo(40 + 2 + 1.5 / 2 + 0.75 - 0.75, 6);
  });

  it('a área do planificado confere com a área planificada da chapaDobrada de cada aba, até 0,5 %', () => {
    const g = geometriaDaCaixaDeChapa(CAIXA);
    const abas = g.abas.reduce((s, a) => s + medidasDaChapa(a.chapa).areaPlanificada - a.larguraDaAba * g.sobreposicao, 0);
    expect(Math.abs(g.areaDoPlanificado / (200 * 120 + abas) - 1)).toBeLessThan(0.005);
  });

  it('o alívio encurta cada aba nas duas pontas, e os cantos ficam abertos', () => {
    const g = geometriaDaCaixaDeChapa(CAIXA);
    expect(g.alivio).toBeCloseTo(2 + 1.5 + 0.5, 9);
    expect(g.abas.find((a) => a.nome === 'frente').larguraDaAba).toBeCloseTo(200 - 2 * 4, 9);
  });

  it('recusa as bordas incompletas, apontando a chapaDobrada para o U e o L', () => {
    expect(() => geometriaDaCaixaDeChapa({ ...CAIXA, bordas: ['frente', 'tras'] })).toThrow(/aceito: as quatro bordas.*chapaDobrada/);
  });
});
