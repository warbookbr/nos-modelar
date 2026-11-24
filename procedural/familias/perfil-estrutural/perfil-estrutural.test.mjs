/* perfil-estrutural.test.mjs — a família `perfil-estrutural`: cada perfil da tabela sai num pedaço só; a área da seção do
 * IPE, do HE A e do UPN bate com a massa por metro da tabela da ArcelorMittal (aço a 7850 kg/m³) até 2 %; o corte a 45° deixa
 * o lado de cima mais comprido; e a tabela recusa a série e o tamanho que não existem. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { HEA, IPE, SERIES, UPN, parametrosDoPerfil } from './tabela.js';
import { geometriaDoPerfil } from './geometria.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('perfil-estrutural');
const executar = (parametros) => executarReceita({ meta: { nome: 'perfil' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'p', parametros)]; } }, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
const area = (pts) => Math.abs(pts.reduce((s, [x, z], i) => { const [x2, z2] = pts[(i + 1) % pts.length]; return s + x * z2 - x2 * z; }, 0)) / 2;

/* massa por metro (kg/m) da tabela da ArcelorMittal, para conferir a seção */
const MASSA = { IPE: { 80: 6.0, 200: 22.4, 400: 66.3, 600: 122 }, HEA: { 100: 16.7, 200: 42.3, 300: 88.3, 600: 178 }, UPN: { 50: 5.6, 200: 25.3, 300: 46.2, 400: 71.8 } };

describe('família perfil-estrutural', () => {
  it('cada tamanho de cada série sai num pedaço só, sem órfão', () => {
    for (const [serie, tabela] of Object.entries(SERIES)) for (const tamanho of Object.keys(tabela)) {
      const n = executar(parametrosDoPerfil(serie, tamanho, { comprimento: 300 }));
      expect((n.orfaos ?? []).map((o) => o.motivo), `${serie} ${tamanho}`).toEqual([]);
      expect(pedacosDaMalha(n), `${serie} ${tamanho}`).toBe(1);
    }
  });

  it('a área da seção bate com a massa por metro da tabela até 2 %', () => {
    for (const [serie, massas] of Object.entries(MASSA)) for (const [tamanho, kgm] of Object.entries(massas)) {
      const g = geometriaDoPerfil({ ...parametrosDoPerfil(serie, tamanho, { comprimento: 1000 }) });
      const esperada = (kgm / 7850) * 1e6;
      expect(Math.abs(area(g.secao) / esperada - 1), `${serie} ${tamanho}: ${area(g.secao).toFixed(0)} mm² contra ${esperada.toFixed(0)}`).toBeLessThan(0.02);
    }
  });

  it('o corte a 45° nas duas pontas deixa o lado de cima mais comprido em meia altura de cada lado', () => {
    const n = executar(parametrosDoPerfil('HEA', 200, { comprimento: 1000, corte: 2 }));
    expect(pedacosDaMalha(n)).toBe(1);
    let emCima = [Infinity, -Infinity]; let emBaixo = [Infinity, -Infinity];
    for (const p of n.V.values()) {
      const [y, z] = [p[1] * 1000, p[2] * 1000];
      if (Math.abs(z - 95) < 1e-6) emCima = [Math.min(emCima[0], y), Math.max(emCima[1], y)];
      if (Math.abs(z + 95) < 1e-6) emBaixo = [Math.min(emBaixo[0], y), Math.max(emBaixo[1], y)];
    }
    expect(emCima[0]).toBeCloseTo(-95, 6); expect(emCima[1]).toBeCloseTo(1095, 6);
    expect(emBaixo[0]).toBeCloseTo(95, 6); expect(emBaixo[1]).toBeCloseTo(905, 6);
  });

  it('a tabela recusa a série e o tamanho que não existem, dizendo os aceitos', () => {
    expect(() => parametrosDoPerfil('HEB', 200)).toThrow(/'HEB' não existe; aceitas: IPE, HEA, UPN, ALUMINIO/);
    expect(() => parametrosDoPerfil('IPE', 210)).toThrow(/IPE 210 não existe; aceitos: 80/);
    expect(Object.keys(IPE)).toHaveLength(18); expect(Object.keys(HEA)).toHaveLength(19); expect(Object.keys(UPN)).toHaveLength(18);
  });
});
