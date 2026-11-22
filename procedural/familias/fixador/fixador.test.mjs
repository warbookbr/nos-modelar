/* fixador.test.mjs — a família `fixador`: cada perfil sai sem órfão e com as partes certas, as medidas seguem a tabela ISO,
 * a rosca cosmética chega ao diâmetro nominal sem passar dele, e o parafuso M8 cabe no furo da porca e da arruela M8. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { medidasIso, TABELA_ISO } from './tabela.js';
import { geometriaDoFixador } from './geometria.js';
import { validarMalha } from '../../../modulos/exportador-cad/src/validar-malha.js';

const registro = criarRegistroDeFamilias();
const FIXADOR = registro.obter('fixador');
const executar = (parametros) => executarReceita(
  { meta: { nome: 'fixador' }, get CHAMADAS_COMPOSICOES() { return [chamar(FIXADOR, 'fixador', parametros)]; } },
  { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes },
).neutro;
const partes = (n) => [...new Set([...n.F.values()].map((f) => f.parte))].sort();
/* o maior afastamento do eixo y, em mm, dos vértices de uma parte, dentro de uma faixa de y */
function raioMaximo(n, parte, de = -Infinity, ate = Infinity) {
  let r = 0;
  for (const f of n.F.values()) {
    if (f.parte !== parte) continue;
    for (const v of f.vs) { const p = n.V.get(v).map((x) => x * 1000); if (p[1] >= de && p[1] <= ate) r = Math.max(r, Math.hypot(p[0], p[2])); }
  }
  return r;
}

describe('família fixador', () => {
  it('cada perfil sai sem órfão e com as partes da peça', () => {
    const esperado = {
      'parafuso-sextavado-m8x30': ['cabeca', 'haste', 'rosca'], 'parafuso-allen-m6x40': ['cabeca', 'haste', 'rosca'],
      'parafuso-abaulado-m5x12': ['cabeca', 'haste', 'rosca'], 'porca-m8': ['porca'], 'arruela-m8': ['arruela'],
    };
    for (const [perfil, lista] of Object.entries(esperado)) {
      const n = executar({ perfil });
      expect((n.orfaos ?? []).map((o) => o.motivo), perfil).toEqual([]);
      expect(partes(n), perfil).toEqual(lista);
    }
    expect(partes(executar({ rosca: 0 }))).toEqual(['cabeca', 'haste']);
  });

  it('a rosca chega ao diâmetro nominal, a menos de um centésimo de passo, e o núcleo fica no diâmetro menor', () => {
    for (const d of [3, 8, 24]) {
      const n = executar({ diametroNominal: d, comprimento: 3 * d });
      const P = medidasIso(d).passo;
      /* o perfil fica no plano perpendicular à hélice, que se inclina com o passo: a ponta passa uns micrômetros do raio */
      expect(raioMaximo(n, 'rosca'), `M${d}`).toBeLessThanOrEqual(d / 2 + 0.01 * P);
      expect(raioMaximo(n, 'rosca'), `M${d}`).toBeGreaterThan(d / 2 - 0.1 * P);
      expect(raioMaximo(n, 'haste', -3 * d, -3 * d + P), `M${d}`).toBeCloseTo(d / 2 - 0.6134 * P, 6);
    }
  });

  it('as medidas são as da tabela ISO, e o diâmetro fora dela escala a linha de baixo com o passo dela', () => {
    expect(geometriaDoFixador({ peca: 2, cabeca: 1, diametroNominal: 8, comprimento: 30, rosca: 1 })).toMatchObject({ chave: 13, altura: 6.8 });
    const m7 = medidasIso(7);
    expect(m7.passo).toBe(TABELA_ISO.find((l) => l.d === 6).passo);
    expect(m7.chave).toBeCloseTo(10 * 7 / 6, 9);
    expect(m7.padrao).toBe(false);
  });

  it('o parafuso M8 passa pelo furo da arruela e da porca M8 sem atravessá-las', () => {
    const parafuso = executar({ perfil: 'parafuso-sextavado-m8x30' });
    const porca = executar({ perfil: 'porca-m8' });
    const arruela = executar({ perfil: 'arruela-m8' });
    const furoDaPorca = Math.min(...[...porca.V.values()].map((p) => Math.hypot(p[0], p[2]) * 1000));
    const furoDaArruela = Math.min(...[...arruela.V.values()].map((p) => Math.hypot(p[0], p[2]) * 1000));
    const rosca = raioMaximo(parafuso, 'rosca');
    expect(rosca).toBeLessThanOrEqual(furoDaPorca / Math.cos(Math.PI / 32) + 1e-6);
    expect(rosca).toBeLessThan(furoDaArruela);
  });

  it('a rosca fundida dá um corpo só, que passa na validação do STEP a 0,01 mm, nas três cabeças', () => {
    const corpos = (n) => {
      const pai = new Map([...n.V.keys()].map((v) => [v, v]));
      const raiz = (x) => { while (pai.get(x) !== x) x = pai.get(x); return x; };
      for (const f of n.F.values()) for (const v of f.vs) pai.set(raiz(v), raiz(f.vs[0]));
      return new Set([...n.F.values()].flatMap((f) => f.vs).map(raiz)).size;
    };
    for (const cabeca of [1, 2, 3]) {
      const n = executar({ cabeca, diametroNominal: 8, comprimento: 30, rosca: 2 });
      expect((n.orfaos ?? []).map((o) => o.motivo), `cabeça ${cabeca}`).toEqual([]);
      expect(partes(n), `cabeça ${cabeca}`).toEqual(['parafuso']);
      expect(corpos(n), `cabeça ${cabeca}`).toBe(1);
      expect(() => validarMalha(n, { tolerancia: 0.00001 }), `cabeça ${cabeca}`).not.toThrow();
    }
  });

  it('recusa a haste mais curta que 1,5 vez a bitola, só no parafuso', () => {
    expect(() => chamar(FIXADOR, 'f', { peca: 1, diametroNominal: 20, comprimento: 20 })).toThrow(/haste-mais-longa-que-a-bitola/);
    expect(() => chamar(FIXADOR, 'f', { peca: 2, diametroNominal: 20, comprimento: 20 })).not.toThrow();
  });
});
