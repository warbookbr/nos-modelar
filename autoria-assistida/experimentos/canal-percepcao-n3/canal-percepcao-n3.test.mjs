/* Calibração reprodutível entre controles sadios e históricos reprovados. */
import { describe, expect, it } from 'vitest';
import { DIAGNOSTICOS_C1, montarCorpusN3, montarResultadoC1 } from './gerar-evidencias.mjs';

describe('corpus de calibração N3', () => {
  it('mantém o lado sadio regular e todos os históricos reprovados irregulares', () => {
    const corpus = montarCorpusN3();
    const saudaveis = corpus.filter((item) => item.vereditoHumano === 'sadio-por-construcao');
    const reprovados = corpus.filter((item) => item.vereditoHumano !== 'sadio-por-construcao');
    expect(saudaveis.every((item) => item.analise.leitura === 'regular-no-canal-c1')).toBe(true);
    expect(reprovados.every((item) => item.analise.leitura === 'irregular-no-canal-c1')).toBe(true);
    expect(reprovados.map((item) => item.id)).toEqual(expect.arrayContaining(['quarto-dianteiro', 'r2b', 'cupe-livre-corpo']));
  });

  it('exige imagens individuais e não se autoaprova por métrica', () => {
    const resultado = montarResultadoC1(montarCorpusN3());
    expect(DIAGNOSTICOS_C1).toHaveLength(6);
    expect(DIAGNOSTICOS_C1.filter(({ tipo }) => tipo === 'zebra')).toHaveLength(4);
    expect(resultado.gateMetricas.passa).toBe(true);
    expect(resultado.gate).toMatchObject({ passa: false, motivo: expect.stringMatching(/inspeção individual/) });
  });

  it('só aceita uma inspeção vinculada às imagens exatas', () => {
    const corpus = montarCorpusN3();
    const arquivos = DIAGNOSTICOS_C1.map((diagnostico) => ({ caso: 'controle', ...diagnostico, arquivo: 'x.png', sha256: 'a'.repeat(64) }));
    const pendente = montarResultadoC1(corpus, arquivos, { estado: 'aprovada', impressaoManifesto: 'manifesto-antigo' });
    const aprovado = montarResultadoC1(corpus, arquivos, { estado: 'aprovada', impressaoManifesto: pendente.protocoloInspecao.impressaoManifesto });
    expect(pendente.gate.passa).toBe(false);
    expect(aprovado.gate.passa).toBe(true);
  });
});
