/* executar-receita.test.ts — prova a fronteira pura sem carregar catálogo. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript puro da fronteira de autoria.
import { entradaDaReceita, executarReceita, validarReceita } from '../../src/autoria/executar-receita.js';
// @ts-expect-error — contratos procedurais JavaScript exercitados pela fronteira.
import { FORMATO_COMPOSICAO_PROCEDURAL, REGISTRO_OPERACOES, criarRegistroComposicoes } from '../../prototipos/procedural/v3/motor/oficina.js';

const receita = {
  PARAMS: { lado: 1 },
  PASSOS: [
    ['cubo', { origemId: 10, lado: 'lado' }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 10 } } }],
  ],
};

const composicao = {
  formato: FORMATO_COMPOSICAO_PROCEDURAL,
  id: 'mecanifica.composicao.fixture-cubo',
  versao: '1.0.0',
  parametros: { origem: { tipo: 'inteiro' }, lado: { tipo: 'numero' }, parte: { tipo: 'texto' } },
  artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1'] },
  nos: [
    { id: 'volume', operacao: 'cubo', argumentos: { origemId: { parametro: 'origem' }, lado: { parametro: 'lado' } } },
    { id: 'identidade', operacao: 'parte', argumentos: { nome: { parametro: 'parte' }, sel: { tudo: true } } },
  ],
};
const registroComposicoes = criarRegistroComposicoes({
  composicoes: [composicao],
  resolverOperacao: REGISTRO_OPERACOES.resolver,
});
const receitaComposta = {
  CHAMADAS_COMPOSICOES: [{
    id: 'corpo',
    composicao: composicao.id,
    argumentos: { origem: 20, lado: 2, parte: 'corpo-composto' },
  }],
};

describe('fronteira pura de receita', () => {
  it('executa uma receita entregue diretamente, sem nome ou caminho', () => {
    const { entrada, neutro } = executarReceita(receita);
    expect(entrada.PARAMS).toEqual({ lado: 1 });
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.F.size).toBe(6);
  });

  it('aplica parâmetros extras sem mutar a receita recebida', () => {
    const entrada = entradaDaReceita(receita, { paramsExtra: { lado: 2 } });
    expect(entrada.PARAMS).toEqual({ lado: 2 });
    expect(receita.PARAMS).toEqual({ lado: 1 });
  });

  it('expande composição pela porta oficial e preserva sua procedência', () => {
    const { entrada, neutro, expansao } = executarReceita(receitaComposta, { registroComposicoes });
    expect(entrada.COMPOSICAO).toMatchObject({ registro: registroComposicoes.assinatura });
    expect(entrada.PASSOS).toHaveLength(2);
    expect(expansao.procedencia.nos.map((no: any) => no.caminho)).toEqual([
      'receita:corpo/mecanifica.composicao.fixture-cubo/volume',
      'receita:corpo/mecanifica.composicao.fixture-cubo/identidade',
    ]);
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.F.size).toBe(6);
  });

  it('recusa composição sem registro, envelope ambíguo e orçamento excedido antes de executar', () => {
    expect(() => executarReceita(receitaComposta)).toThrow(/registroComposicoes/);
    expect(() => executarReceita({ ...receitaComposta, PASSOS: [] }, { registroComposicoes })).toThrow(/exatamente um envelope/);
    expect(() => executarReceita(receitaComposta, {
      registroComposicoes,
      orcamentoComposicoes: { maxPassos: 1 },
    })).toThrow(/orçamento excedido/);
  });

  it('recusa entrada sem envelope procedural', () => {
    expect(() => validarReceita({})).toThrow(/PASSOS/);
    expect(() => executarReceita(null as any)).toThrow(/objeto/);
  });
});
