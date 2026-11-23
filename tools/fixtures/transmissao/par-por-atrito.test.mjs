/* par-por-atrito.test.mjs — as correias sem dentes: a em V assenta no canal pela largura de referência da ISO 4183 com a
 * seção da DIN 2215, uma volta por canal, e a lisa sobre a face; nenhuma toca a polia, com a medida de contatos completa, e
 * a mesma medida acusa a correia em V quando a polia movida sai da altura do canal. */
import { describe, expect, it } from 'vitest';
import { receitaDoParPorAtrito } from './par-por-atrito.mjs';
import { transmissaoPorAtrito, SECOES_DA_CORREIA_V } from '../../../procedural/familias/polia-e-correia/correia.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';

const registro = criarRegistroDeFamilias();
const medir = (r) => { const n = executarReceita(r.receita, { registroOperacoes: registro.registroOperacoes }).neutro; return { n, c: contatosDaPeca(n, r.receita) }; };
const PARES = [
  ['V da seção A, canais de 38 graus', ['v-a', 'v-a'], 300, [{}, { diametro: 200 }], 1],
  ['V da seção A, canal de 34 graus na menor', ['v-a', 'v-a'], 300, [{ diametro: 100 }, { diametro: 200 }], 1],
  ['V dupla da seção B', ['v-b-dupla', 'v-b-dupla'], 400, [{ diametro: 140 }, {}], 2],
  ['lisa', ['lisa', 'lisa'], 250, [{}, { diametro: 160 }], 1],
];

describe('correias por atrito', () => {
  for (const [nome, perfis, distancia, extra, voltas] of PARES) {
    it(`${nome}: ${voltas} volta(s) de correia, sem órfão e sem contato`, () => {
      const r = receitaDoParPorAtrito(perfis, distancia, extra);
      const { n, c } = medir(r);
      expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
      expect(r.receita.PASSOS.filter(([op]) => op === 'friso')).toHaveLength(voltas);
      expect(c.cobertura.completa).toBe(true);
      expect(c.paresEmContato).toEqual([]);
    });
  }

  it('a seção A tem a largura de referência de 11 mm na altura do diâmetro de referência, ou acima dela no canal de 34 graus', () => {
    const r = receitaDoParPorAtrito(['v-a', 'v-a'], 300, [{}, { diametro: 200 }]);
    const s = SECOES_DA_CORREIA_V[2];
    const [[, topo]] = r.secao.pontos;
    const larguraNoZero = s.topo - (topo - 0) * ((s.topo - s.base) / s.altura);
    expect(larguraNoZero).toBeLessThanOrEqual(11 + 1e-9);
    expect(larguraNoZero).toBeGreaterThan(10.5);
  });

  it('com a polia movida 3 mm acima, a medida acusa a correia em V dentro dela', () => {
    const r = receitaDoParPorAtrito(['v-a', 'v-a'], 300, [{}, { diametro: 200 }], { deslocarCorreia: 3 });
    expect(medir(r).c.naoDeclarados.map((p) => [...p.par].sort().join('+'))).toContain('correia+movidaPolia');
  });

  it('recusa polias de tipos diferentes e seções diferentes', () => {
    const completos = (perfil, extra = {}) => ({ ...Object.fromEntries(Object.entries(registro.obter('polia-e-correia').contrato.parametros).map(([k, d]) => [k, d.padrao])), ...registro.obter('polia-e-correia').contrato.perfis[perfil].parametros, ...extra });
    expect(() => transmissaoPorAtrito(completos('v-a'), completos('lisa'), 300)).toThrow(/as duas polias/);
    expect(() => transmissaoPorAtrito(completos('v-a'), completos('v-b-dupla'), 400)).toThrow(/mesma seção/);
  });
});
