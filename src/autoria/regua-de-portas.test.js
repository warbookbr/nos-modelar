/* regua-de-portas.test.js — a conta das portas que o núcleo e o gate de contato do esboço dividem. */
import { describe, expect, it } from 'vitest';
import {
  CLASSES_DE_AJUSTE as CLASSES_DO_NUCLEO,
  TABELA_CLASSES_AJUSTE_V1 as TABELA_DO_NUCLEO,
  obterFolgaPorClasseAjuste as folgaDoNucleo,
  validarAssentamentoPlano,
} from './interfaces-montagem.js';
import {
  CLASSES_DE_AJUSTE,
  TABELA_CLASSES_AJUSTE_V1,
  medirAjusteDeEixoEmFuro,
  medirAssentamentoDePlanos,
  medirCoaxialidade,
  obterFolgaPorClasseAjuste,
} from './regua-de-portas.js';

describe('regua-de-portas', () => {
  it('o núcleo reexporta a mesma tabela, as mesmas classes e a mesma função', () => {
    expect(TABELA_DO_NUCLEO).toBe(TABELA_CLASSES_AJUSTE_V1);
    expect(CLASSES_DO_NUCLEO).toBe(CLASSES_DE_AJUSTE);
    expect(folgaDoNucleo).toBe(obterFolgaPorClasseAjuste);
  });

  it('a coaxialidade mede o paralelismo e a distância entre as retas, e não a posição ao longo do eixo', () => {
    const furo = { eixo: [1, 0, 0], centro: [0, 0, 0] };
    expect(medirCoaxialidade(furo, { eixo: [-1, 0, 0], centro: [50, 0, 0] })).toEqual({ alinhamento: 1, descentro: 0 });
    expect(medirCoaxialidade(furo, { eixo: [1, 0, 0], centro: [50, 3, 4] }).descentro).toBeCloseTo(5, 12);
  });

  it('o eixo no furo confere a folga diametral contra a faixa da classe do diâmetro nominal do furo', () => {
    const furo = { eixo: [0, 1, 0], centro: [0, 0, 0], diametro: 26.02 };
    const eixo = { eixo: [0, 1, 0], centro: [0, 5, 0], diametro: 26 };
    const dentro = medirAjusteDeEixoEmFuro({ furo, eixo, classe: 'folgado', tolerancia: 0.001 });
    expect(dentro.satisfeita).toBe(true);
    expect(dentro.folgaDiametral).toBeCloseTo(0.02, 12);
    expect(dentro.especificacao).toMatchObject({ min: 0.007, max: 0.041, nominalMm: 26.02 });
    expect(dentro.interferenciaRadialMaxima).toBe(0);
    const fora = medirAjusteDeEixoEmFuro({ furo: { ...furo, diametro: 28 }, eixo, classe: 'folgado', tolerancia: 0.001 });
    expect(fora.satisfeita).toBe(false);
    expect(fora.diagnosticos).toEqual([{ codigo: 'folga-fora-da-classe', classe: 'folgado', observado: 2, minimo: 0.007, maximo: 0.041, tolerancia: 0.001 }]);
    const aperto = medirAjusteDeEixoEmFuro({ furo: { ...furo, diametro: 25.98 }, eixo, classe: 'interferencia', tolerancia: 0.001 });
    expect(aperto.satisfeita).toBe(true);
    expect(aperto.interferenciaRadialMaxima).toBeCloseTo(0.0175, 12);
    expect(medirAjusteDeEixoEmFuro({ furo, eixo: { ...eixo, eixo: [1, 0, 0] }, classe: 'folgado', tolerancia: 0.001 }).diagnosticos[0].codigo).toBe('eixos-divergentes');
  });

  it('o assentamento de planos da régua é o mesmo que validarAssentamentoPlano devolve', () => {
    const referencia = { normal: [0, 1, 0], ponto: [0, 20, 0], extensao: [200, 100], referencia: [1, 0, 0] };
    const movel = { normal: [0, -1, 0], ponto: [30, 20, 0], extensao: [100, 60] };
    const direto = medirAssentamentoDePlanos(referencia, movel, 1e-6, { minimo: 0, maximo: 0 });
    expect(direto.diagnosticos).toEqual([]);
    expect(direto.separacao).toBe(0);
    expect(direto.descentro).toBe(30);
    expect(direto.extrapolacaoApoio).toBeCloseTo(-20, 12);

    const mapa = new Map([
      ['a', { id: 'a', forma: 'plano', papel: 'recebe', ...referencia }],
      ['b', { id: 'b', forma: 'plano', papel: 'apoia', ...movel }],
    ]);
    const pelaFuncaoDoNucleo = validarAssentamentoPlano({ id: 'x', tipo: 'assentaPlano', referencia: 'a', movel: 'b', tolerancia: 1e-6 }, mapa);
    expect(pelaFuncaoDoNucleo.satisfeita).toBe(true);
    expect(pelaFuncaoDoNucleo.medidas).toMatchObject({ alinhamento: direto.alinhamento, separacao: direto.separacao, descentro: direto.descentro, extrapolacaoApoio: direto.extrapolacaoApoio });

    const desalinhado = medirAssentamentoDePlanos(referencia, { ...movel, normal: [0, -0.9, 0.43588989435406733], ponto: [0, 23, 0], extensao: [300, 60] }, 1e-6, { minimo: 0, maximo: 0 });
    expect(desalinhado.diagnosticos.map((d) => d.codigo).sort()).toEqual(['contato-fora', 'extrapolacao-de-apoio', 'normais-nao-opostas']);
  });
});
