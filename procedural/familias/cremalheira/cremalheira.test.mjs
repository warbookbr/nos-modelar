/* cremalheira.test.mjs — a família `cremalheira`: cada perfil sai numa parte só e sem órfão, a barra tem dentes × passo
 * de comprimento, a cabeça 1 módulo acima e o pé 1,25 módulo abaixo da linha primitiva, e o vão tem meio passo de largura
 * na linha primitiva (ISO 53). */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { geometriaDaCremalheira } from './geometria.js';

const registro = criarRegistroDeFamilias();
const CREMALHEIRA = registro.obter('cremalheira');
const executar = (parametros) => executarReceita(
  { meta: { nome: 'cremalheira' }, get CHAMADAS_COMPOSICOES() { return [chamar(CREMALHEIRA, 'cremalheira', parametros)]; } },
  { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes },
).neutro;

describe('família cremalheira', () => {
  it('cada perfil sai numa malha de um pedaço só, sem lasca solta', () => {
    for (const perfil of Object.keys(CREMALHEIRA.contrato.perfis)) expect(pedacosDaMalha(executar({ perfil })), perfil).toBe(1);
  });

  it('cada perfil sai numa parte só, sem órfão', () => {
    for (const perfil of Object.keys(CREMALHEIRA.contrato.perfis)) {
      const n = executar({ perfil });
      expect((n.orfaos ?? []).map((o) => o.motivo), perfil).toEqual([]);
      expect([...new Set([...n.F.values()].map((f) => f.parte))], perfil).toEqual(['cremalheira']);
    }
  });

  it('a de módulo 2 com 20 dentes tem 20 passos de comprimento, cabeça a 2 mm e pé a 2,5 mm da linha primitiva', () => {
    const n = executar({ perfil: 'm2-20' });
    const xs = []; const zs = [];
    for (const p of n.V.values()) { xs.push(p[0] * 1000); zs.push(p[2] * 1000); }
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(20 * 2 * Math.PI, 4);
    expect(Math.max(...zs)).toBeCloseTo(2, 4);
    const g = geometriaDaCremalheira({ modulo: 2, dentes: 20, largura: 20, alturaDaBase: 15 });
    expect(Math.min(...zs)).toBeCloseTo(-2.5 - 15, 4);
    expect(g.pe).toBe(-2.5);
  });

  it('o vão tem meio passo de largura na linha primitiva', () => {
    const g = geometriaDaCremalheira({ modulo: 3, dentes: 10, largura: 10, alturaDaBase: 5 });
    const [[x0, z0], [x1, z1]] = g.vao;
    const xNoPrimitivo = x0 + ((0 - z0) / (z1 - z0)) * (x1 - x0);
    expect(2 * xNoPrimitivo).toBeCloseTo((Math.PI * 3) / 2, 9);
  });
});
