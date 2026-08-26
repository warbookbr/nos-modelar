/* Estatística P0-C: quatro respostas por item e bootstrap por objeto, não por apresentação. */
import { describe, expect, it } from 'vitest';
import { gerarCorpusP0 } from './gerar-corpus-p0.mjs';
import { analisarCalibracaoCriticoP0 } from './analisar-calibracao-critico.mjs';

function julgamentosDo(manifesto, decidir = ({ respostaConhecida }) => respostaConhecida) {
  return manifesto.itens.flatMap((item) => item.apresentacoes.map((_, indice) => ({
    item: item.id, decisaoSemantica: decidir(item, indice),
  })));
}

describe('análise de calibração do crítico P0', () => {
  it('mede unanimidade por item, escolhe baseline somente na calibração e reamostra objetos', () => {
    const manifesto = gerarCorpusP0();
    const analise = analisarCalibracaoCriticoP0(manifesto, julgamentosDo(manifesto), { origem: 'fixture-de-teste', reamostras: 200, semente: 19 });

    expect(analise.holdout).toMatchObject({ itens: 80, objetos: 20, repetibilidade: 1, acerto: 1, promocoesGrosseiras: 0 });
    expect(analise.baseline).toMatchObject({ escolhidoNaCalibracao: 'sempre-A', acertoHoldout: 0.5, diferencaAcertoHoldout: 0.5 });
    expect(analise.intervalos95).toMatchObject({ repetibilidade: { inferior: 1, superior: 1 }, diferencaAcerto: { inferior: 0.5, superior: 0.5 } });
    expect(analise.gates).toMatchObject({ repetibilidade: true, superaBaseline: true, zeroPromocaoGrosseira: true, execucaoIndependente: false, elegivelParaP0C: false });
    expect(analise.decisao).toBe('indeterminado');
  });

  it('reprova promoção unânime de defeito grosseiro mesmo com repetibilidade alta', () => {
    const manifesto = gerarCorpusP0();
    const analise = analisarCalibracaoCriticoP0(manifesto, julgamentosDo(manifesto, (item) => item.severidade === 'grosseiro' ? 'B' : item.respostaConhecida), { origem: 'critico-independente', reamostras: 200, semente: 19 });

    expect(analise.holdout).toMatchObject({ repetibilidade: 1, promocoesGrosseiras: 20 });
    expect(analise.gates).toMatchObject({ repetibilidade: true, zeroPromocaoGrosseira: false, execucaoIndependente: true, elegivelParaP0C: false });
    expect(analise.decisao).toBe('reprovar');
  });

  it('só torna o gate matemático elegível depois de uma origem independente declarada', () => {
    const manifesto = gerarCorpusP0();
    const analise = analisarCalibracaoCriticoP0(manifesto, julgamentosDo(manifesto), { origem: 'critico-independente', reamostras: 200, semente: 19 });

    expect(analise.gates).toMatchObject({ repetibilidade: true, superaBaseline: true, zeroPromocaoGrosseira: true, execucaoIndependente: true, elegivelParaP0C: true });
    expect(analise.decisao).toBe('aprovar-critico');
  });
});
