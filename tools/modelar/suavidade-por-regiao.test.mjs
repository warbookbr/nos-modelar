/* suavidade-por-regiao.test.mjs — o índice de suavidade nas chapas de calibração do reflexo (`tools/fixtures/reflexo-calibracao/`): a lisa
 * (um arco de raio constante) dá perto de zero, as onduladas de 0,25, 0,5 e 1 mm de amplitude declarada sobem nessa ordem, a mesma
 * ondulada medida com a grade de 10 e de 5 mm dá o mesmo índice dentro de 10% (a normalização por área), e a emenda (o vinco) não entra. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { CHAPAS, chapaDeCalibracao } from '../fixtures/reflexo-calibracao/chapas.mjs';
import { lerEntradaDeMedida } from './entrada-de-medida.mjs';
import { suavidadePorRegiao } from './suavidade-por-regiao.mjs';

const neutroDe = async (nome) => (await lerEntradaDeMedida(`tools/fixtures/reflexo-calibracao/${nome}`, { montagem: false })).executar().neutro;
const maior = (json) => Math.max(...json.regioes.map((r) => r.indice));

describe('suavidade por região', () => {
  it('dá um número por região, a lisa perto de zero e as onduladas em ordem de amplitude', async () => {
    const lisa = suavidadePorRegiao(await neutroDe('lisa'), { lado: '+z' });
    expect(lisa.json.regioes.map((r) => r.regiao)).toEqual(['direita', 'esquerda']);
    expect(maior(lisa.json)).toBeLessThan(0.05);
    expect(lisa.tabela).toMatch(/direita/);
    const onduladas = Object.entries(CHAPAS).filter(([, c]) => c.defeito.tipo === 'ondulacao').sort(([, a], [, b]) => a.defeito.amplitudeMm - b.defeito.amplitudeMm);
    expect(onduladas.length).toBeGreaterThanOrEqual(3);
    const indices = [];
    for (const [nome] of onduladas) indices.push(maior(suavidadePorRegiao(await neutroDe(nome), { lado: '+z' }).json));
    expect(indices[0]).toBeGreaterThan(100 * maior(lisa.json));
    for (let k = 1; k < indices.length; k++) expect(indices[k]).toBeGreaterThan(indices[k - 1] * 1.5);
  });

  it('não depende da densidade da malha: a grade de 5 mm dá o índice da de 10 mm dentro de 10%', async () => {
    const de = (passoMm) => executarReceita(chapaDeCalibracao('ondulada-050', { passoMm })).neutro;
    const dez = maior(suavidadePorRegiao(de(10), { lado: '+z' }).json);
    const cinco = maior(suavidadePorRegiao(de(5), { lado: '+z' }).json);
    expect(Math.abs(cinco - dez) / dez).toBeLessThan(0.1);
  });

  it('a emenda não entra no índice da região, e recusa raio e grupo inválidos', async () => {
    const neutro = await neutroDe('vinco');
    expect(maior(suavidadePorRegiao(neutro, { lado: '+z' }).json)).toBeLessThan(0.05);
    expect(() => suavidadePorRegiao(neutro, { raioMm: -1 })).toThrow(/--raio/);
    expect(() => suavidadePorRegiao(neutro, { por: 'cor' })).toThrow(/--por/);
  });
});
