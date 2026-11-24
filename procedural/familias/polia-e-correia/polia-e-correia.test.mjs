/* polia-e-correia.test.mjs — a família `polia-e-correia`: cada perfil sai numa parte só e sem órfão, a dentada tem o
 * externo e a raiz que o passo e os dentes pedem, a polia em V tem o fundo do canal na profundidade da seção, e as
 * restrições recusam o furo que não cabe e a seção de correia que a polia em V não tem. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { geometriaDaPolia } from './geometria.js';

const registro = criarRegistroDeFamilias();
const POLIA = registro.obter('polia-e-correia');
const executar = (parametros) => executarReceita(
  { meta: { nome: 'polia' }, get CHAMADAS_COMPOSICOES() { return [chamar(POLIA, 'polia', parametros)]; } },
  { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes },
).neutro;
const completos = (perfil) => ({ ...Object.fromEntries(Object.entries(POLIA.contrato.parametros).map(([n, d]) => [n, d.padrao])), ...POLIA.contrato.perfis[perfil].parametros });

/* raios (mm) dos vértices numa faixa de y, em mm */
function raios(neutro, y0, y1) {
  const r = [];
  for (const p of neutro.V.values()) { const y = p[1] * 1000; if (y > y0 && y < y1) r.push(Math.hypot(p[0], p[2]) * 1000); }
  return r;
}

describe('família polia-e-correia', () => {
  it('cada perfil sai numa malha de um pedaço só, sem lasca solta', () => {
    for (const perfil of Object.keys(POLIA.contrato.perfis)) expect(pedacosDaMalha(executar({ perfil })), perfil).toBe(1);
  });

  it('cada perfil sai numa parte só, sem órfão', () => {
    for (const perfil of Object.keys(POLIA.contrato.perfis)) {
      const n = executar({ perfil });
      expect((n.orfaos ?? []).map((o) => o.motivo), perfil).toEqual([]);
      expect([...new Set([...n.F.values()].map((f) => f.parte))], perfil).toEqual(['polia']);
    }
  });

  it('a GT2 de 20 dentes tem o externo e a raiz do passo de 2 mm, com o canal até a raiz', () => {
    const g = geometriaDaPolia(completos('gt2-20'));
    expect(g.diametroPrimitivo).toBeCloseTo(40 / Math.PI, 6);
    expect(g.diametroExterno).toBeCloseTo(40 / Math.PI - 0.508, 6);
    expect(g.diametroDaRaiz).toBeCloseTo(40 / Math.PI - 0.508 - 2 * 0.764, 6);
    const n = executar({ perfil: 'gt2-20' });
    /* os vértices da faixa ficam nas duas faces das flanges; as flanges passam do externo e ficam de fora */
    const naFaixa = raios(n, g.baseDoCanal - 0.01, g.baseDoCanal + g.alturaDoCanal + 0.01).filter((r) => r < g.diametroExterno / 2 + 0.01);
    expect(Math.max(...naFaixa)).toBeCloseTo(g.diametroExterno / 2, 1);
    expect(Math.min(...naFaixa.filter((r) => r > g.raioDoFuro + 0.01))).toBeCloseTo(g.diametroDaRaiz / 2, 2);
  });

  it('a polia em V da seção A de 120 mm segue a ISO 4183: externo b acima, fundo h abaixo e canal de 38 graus', () => {
    const g = geometriaDaPolia(completos('v-a'));
    expect(g.angulo).toBe(38);
    const n = executar({ perfil: 'v-a' });
    const fora = raios(n, 20, 40).filter((r) => r > g.raioDoCubo + 0.01);
    expect(Math.max(...fora)).toBeCloseTo(60 + 2.75, 3);
    expect(Math.min(...fora)).toBeCloseTo(60 - 8.7, 3);
    expect(geometriaDaPolia({ ...completos('v-a'), diametro: 100 }).angulo).toBe(34);
  });

  it('as restrições recusam o furo que não cabe e a seção 4 na polia em V', () => {
    expect(() => chamar(POLIA, 'p', { perfil: 'gt2-20', furo: 12, diametroDoCubo: 20 })).toThrow(/furo-cabe-na-dentada/);
    expect(() => chamar(POLIA, 'p', { perfil: 'v-a', diametro: 75, furo: 50, diametroDoCubo: 60 })).toThrow(/furo-cabe-na-v-e-na-lisa/);
    expect(() => chamar(POLIA, 'p', { perfil: 'v-a', correia: 4, diametro: 200 })).toThrow(/secao-da-v/);
    expect(() => chamar(POLIA, 'p', { perfil: 'v-a', diametro: 70 })).toThrow(/diametro-minimo-da-v/);
    expect(() => chamar(POLIA, 'p', { perfil: 'gt2-20', diametroDoCubo: 8 })).toThrow(/cubo-maior-que-o-furo/);
  });
});
