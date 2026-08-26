/* Corpus sintético P0: estímulos rastreáveis para calibrar crítico, não modelos de produto. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { gerarCorpusP0 } from './gerar-corpus-p0.mjs';
import { validarCorpusAvaliacaoP0 } from './validar-corpus-avaliacao.mjs';
import { exportarLoteCritico } from './orquestrar-calibracao-critico.mjs';

const raiz = resolve(import.meta.dirname, '..', '..');
const pasta = resolve(raiz, 'autoria-assistida/avaliacao/corpus-p0');
const sha256 = (arquivo) => `sha256:${createHash('sha256').update(readFileSync(arquivo)).digest('hex')}`;

describe('gerador do corpus sintético P0', () => {
  it('produz 20 objetos holdout, calibração separada e 80 comparações balanceadas', () => {
    const manifesto = gerarCorpusP0();
    expect(validarCorpusAvaliacaoP0(manifesto)).toMatchObject({ prontoParaCritico: true, itensHoldout: 80, objetosHoldout: 20, defeitosGrosseiros: 20 });
    expect(manifesto.itens.filter(({ split }) => split === 'calibracao')).toHaveLength(20);
    expect(new Set(manifesto.itens.filter(({ split }) => split === 'holdout').map(({ objeto }) => objeto)).size).toBe(20);
    const hashesHoldout = new Set(manifesto.itens.filter(({ split }) => split === 'holdout').flatMap(({ evidencias }) => evidencias.map(({ sha256: impressao }) => impressao)));
    const hashesCalibracao = manifesto.itens.filter(({ split }) => split === 'calibracao').flatMap(({ evidencias }) => evidencias.map(({ sha256: impressao }) => impressao));
    expect(hashesCalibracao.every((impressao) => !hashesHoldout.has(impressao))).toBe(true);
    const lote = exportarLoteCritico(manifesto);
    expect(lote.apresentacoes).toHaveLength(400);
    expect(JSON.stringify(lote)).not.toContain('respostaConhecida');
    for (const item of manifesto.itens) for (const evidencia of item.evidencias) {
      const arquivo = resolve(pasta, evidencia.arquivo);
      expect(existsSync(arquivo)).toBe(true);
      expect(sha256(arquivo)).toBe(evidencia.sha256);
    }
  });
});
