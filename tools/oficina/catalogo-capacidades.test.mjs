/* catálogo-capacidades.test.mjs — R05: descoberta deriva do registro, sem tabela paralela. */
import { describe, expect, it } from 'vitest';
import { OPS, REGISTRO_OPERACOES } from '../../prototipos/procedural/v3/motor/oficina.js';
import { buscarCapacidades, catalogoDeCapacidades, explicarCapacidade, hipergrafoDeCapacidades } from '../../prototipos/procedural/v3/motor/catalogo.js';

describe('catálogo de capacidades — R05', () => {
  const catalogo = catalogoDeCapacidades(REGISTRO_OPERACOES);

  it('deriva as 32 operações do registro, em ordem e com assinatura reproduzível', () => {
    expect(catalogo.operacoes.map(({ nome }) => nome).sort()).toEqual(Object.keys(OPS).sort());
    expect(catalogo.assinatura).toBe(REGISTRO_OPERACOES.assinatura);
    expect(catalogoDeCapacidades(REGISTRO_OPERACOES)).toEqual(catalogo);
  });

  it('busca por efeito, artefato e identidade sem executar receita', () => {
    expect(buscarCapacidades(catalogo, { efeito: 'publica-porta' }).operacoes.map(({ nome }) => nome)).toEqual(['publicarPorta']);
    expect(buscarCapacidades(catalogo, { produz: 'mecanifica.parte@1' }).operacoes.map(({ nome }) => nome)).toEqual(['parte']);
    expect(buscarCapacidades(catalogo, { identidade: 'cria-por-passo' }).total).toBe(9);
  });

  it('explica ausência com candidatas e não inventa capacidade', () => {
    expect(explicarCapacidade(catalogo, 'cubo')).toMatchObject({ encontrada: true, operacao: { id: 'mecanifica.operacao.cubo' } });
    expect(explicarCapacidade(catalogo, 'colisao-global')).toMatchObject({ encontrada: false, diagnostico: 'capacidade não registrada', candidatas: [] });
  });

  it('representa contratos como hipergrafo, sem afirmar DAG onde a malha se preserva', () => {
    const grafo = hipergrafoDeCapacidades(catalogo);
    expect(grafo.nos).toContainEqual({ id: 'artefato:mecanifica.malha-poligonal@1', tipo: 'artefato', artefato: 'mecanifica.malha-poligonal@1' });
    expect(grafo.hiperarestas.find(({ operacao }) => operacao === 'mecanifica.operacao.transladar')).toEqual({
      id: 'contrato:mecanifica.operacao.transladar', operacao: 'mecanifica.operacao.transladar',
      entra: ['artefato:mecanifica.malha-poligonal@1'], sai: ['artefato:mecanifica.malha-poligonal@1'],
    });
  });
});
