/* Lote cego: o transporte não revela gabarito e exige cobertura completa. */
import { describe, expect, it } from 'vitest';
import { assinarJulgamentoCritico } from './contrato-julgamento-critico.mjs';
import { exportarLoteCritico, ingerirRespostasCritico } from './orquestrar-calibracao-critico.mjs';

const sha = (n) => `sha256:${n.toString(16).padStart(64, '0')}`;
function corpusValido() {
  const item = (n, tipo, severidade = 'normal') => ({ id: `i-${n}`, split: 'holdout', objeto: `o-${Math.floor(n / 4)}`, tipo, respostaConhecida: tipo === 'decisivo' ? 'A' : tipo, severidade, vista: 'lateral', pergunta: 'qual é melhor?', evidencias: [{ papel: 'A', arquivo: `a-${n}.png`, sha256: sha(n * 2) }, { papel: 'B', arquivo: `b-${n}.png`, sha256: sha(n * 2 + 1) }], apresentacoes: [{ ordem: ['A', 'B'] }, { ordem: ['B', 'A'] }, { ordem: ['A', 'B'] }, { ordem: ['B', 'A'] }] });
  const itens = [...Array.from({ length: 20 }, (_, n) => item(n, 'decisivo', 'grosseiro')), ...Array.from({ length: 20 }, (_, n) => item(n + 20, 'decisivo')), ...Array.from({ length: 20 }, (_, n) => item(n + 40, 'empate')), ...Array.from({ length: 20 }, (_, n) => item(n + 60, 'indeterminado'))];
  itens.push({ ...item(100, 'decisivo'), split: 'calibracao', objeto: 'o-calibracao' });
  return { formato: 'mecanifica.corpus-avaliacao-p0@1', estado: 'congelado', itens };
}
function resposta(apresentacao, lote) {
  const base = { formato: 'mecanifica.julgamento-critico@2', lote: lote.id, assinaturaLote: lote.assinatura, apresentacao: apresentacao.id, decisao: 'primeira', achados: [], confianca: 0.6, provedor: 'simulador', modelo: 'critico-de-teste', hashPrompt: sha(999) };
  return { ...base, assinaturaResposta: assinarJulgamentoCritico(base) };
}

describe('orquestrador de calibração crítica', () => {
  it('exporta o lote sem revelar o gabarito e exige cobertura de todas as apresentações', () => {
    const { lote, chavePrivada } = exportarLoteCritico(corpusValido());
    expect(lote.apresentacoes).toHaveLength(324);
    expect(JSON.stringify(lote)).not.toContain('respostaConhecida');
    expect(JSON.stringify(lote)).not.toMatch(/"papel"|"item"|"ordem"/);
    expect(() => ingerirRespostasCritico(lote, chavePrivada, lote.apresentacoes.slice(0, -1).map((apresentacao) => resposta(apresentacao, lote)))).toThrow(/cobertura/);
    const adulterada = resposta(lote.apresentacoes[0], lote);
    adulterada.apresentacao = 'p999';
    adulterada.assinaturaResposta = assinarJulgamentoCritico(adulterada);
    expect(() => ingerirRespostasCritico(lote, chavePrivada, [adulterada, ...lote.apresentacoes.slice(1).map((apresentacao) => resposta(apresentacao, lote))])).toThrow(/lote/);
    const resultado = ingerirRespostasCritico(lote, chavePrivada, lote.apresentacoes.map((apresentacao) => resposta(apresentacao, lote)));
    expect(resultado).toMatchObject({ respostas: 324 });
    expect(resultado.julgamentos[0]).toMatchObject({ item: 'i-0', decisaoSemantica: 'A' });
  });
});
