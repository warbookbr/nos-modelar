/* roda-dentada.test.mjs — a família `roda-dentada`: cada corrente da tabela, de 9 a 80 dentes, sai num pedaço só e sem
 * órfão; o diâmetro de raiz é d − 2 ri da ISO 606; a roda de 80 dentes sai rápida; e a tabela recusa a corrente que não
 * existe e o dente que acaba em ponta. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { CORRENTES, parametrosDaRoda } from './tabela.js';
import { medidasDaRoda, vaoDoDente } from './geometria.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('roda-dentada');
const executar = (q) => executarReceita({ meta: { nome: 'roda' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'r', q)]; } }, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;

describe('família roda-dentada', () => {
  it('cada corrente, de 9 a 80 dentes, sai num pedaço só e sem órfão', () => {
    for (const corrente of Object.keys(CORRENTES)) for (const z of [9, 18, 40, 80]) {
      const n = executar(parametrosDaRoda(corrente, z));
      expect((n.orfaos ?? []).map((o) => o.motivo), `${corrente} ${z}`).toEqual([]);
      expect(pedacosDaMalha(n), `${corrente} ${z}`).toBe(1);
    }
  });

  it('o fundo do vão fica no diâmetro de raiz d − 2 ri, com ri = 0,505 d1', () => {
    const q = parametrosDaRoda('08B', 18);
    const { d } = medidasDaRoda(q);
    const fundo = Math.min(...vaoDoDente(q).map(([x, v]) => Math.hypot(x, v)));
    expect(2 * fundo).toBeCloseTo(d - 2 * 0.505 * 8.51, 6);
  });

  it('a roda de 80 dentes sai abaixo de dois segundos', () => {
    const t = performance.now();
    executar(parametrosDaRoda('06B', 80));
    expect((performance.now() - t) / 1000).toBeLessThan(2);
  });

  it('recusa a corrente que não existe, dizendo as aceitas', () => {
    expect(() => parametrosDaRoda('08A', 18)).toThrow(/'08A' não existe; aceitas: 06B, 08B/);
  });
});
