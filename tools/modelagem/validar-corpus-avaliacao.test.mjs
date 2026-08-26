/* O corpus P0 só fica elegível após cobertura, isolamento e quatro julgamentos cegos. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarCorpusAvaliacaoP0 } from './validar-corpus-avaliacao.mjs';

const raiz = resolve(import.meta.dirname, '..', '..');
const hash = (n) => `sha256:${n.toString(16).padStart(64, '0')}`;
function item(n, tipo, severidade = 'normal') {
  return {
    id: `item-${n}`, split: 'holdout', objeto: `objeto-${Math.floor(n / 4)}`, tipo,
    respostaConhecida: tipo === 'decisivo' ? 'A' : tipo === 'empate' ? 'empate' : 'indeterminado', severidade,
    vista: 'lateral-direita', pergunta: 'Qual alternativa respeita melhor a referência desta vista?',
    evidencias: [{ papel: 'A', arquivo: `evidencias/${n}-a.png`, sha256: hash(n * 2) }, { papel: 'B', arquivo: `evidencias/${n}-b.png`, sha256: hash(n * 2 + 1) }],
    apresentacoes: [{ ordem: ['A', 'B'] }, { ordem: ['B', 'A'] }, { ordem: ['A', 'B'] }, { ordem: ['B', 'A'] }],
  };
}
function corpusCongelado() {
  const itens = [
    ...Array.from({ length: 20 }, (_, n) => item(n, 'decisivo', 'grosseiro')),
    ...Array.from({ length: 20 }, (_, n) => item(n + 20, 'decisivo')),
    ...Array.from({ length: 20 }, (_, n) => item(n + 40, 'empate')),
    ...Array.from({ length: 20 }, (_, n) => item(n + 60, 'indeterminado')),
    { ...item(100, 'decisivo'), split: 'calibracao', objeto: 'objeto-calibracao' },
  ];
  return { formato: 'mecanifica.corpus-avaliacao-p0@1', estado: 'congelado', itens };
}

describe('validador do corpus de avaliação P0', () => {
  it('mantém o manifesto atual honesto enquanto os controles não existem', () => {
    const manifesto = JSON.parse(readFileSync(resolve(raiz, 'autoria-assistida/avaliacao/corpus-p0/manifesto.json'), 'utf8'));
    expect(validarCorpusAvaliacaoP0(manifesto)).toMatchObject({ prontoParaCritico: false, estado: 'pendente-de-coleta' });
  });

  it('aceita somente holdout balanceado por objeto e repetido nas duas ordens', () => {
    expect(validarCorpusAvaliacaoP0(corpusCongelado())).toMatchObject({
      prontoParaCritico: true, itensHoldout: 80, objetosHoldout: 20, defeitosGrosseiros: 20,
    });
  });

  it('recusa vazamento de objeto, balanço insuficiente e apresentação não cega', () => {
    const vazado = corpusCongelado();
    vazado.itens[0].split = 'calibracao';
    expect(() => validarCorpusAvaliacaoP0(vazado)).toThrow(/holdout|calibracao|80/);
    const ordemErrada = corpusCongelado();
    ordemErrada.itens[0].apresentacoes[3] = { ordem: ['A', 'B'] };
    expect(() => validarCorpusAvaliacaoP0(ordemErrada)).toThrow(/duas vezes/);
    const semCalibracao = corpusCongelado();
    semCalibracao.itens = semCalibracao.itens.filter(({ split }) => split !== 'calibracao');
    expect(() => validarCorpusAvaliacaoP0(semCalibracao)).toThrow(/calibracao/);
  });
});
