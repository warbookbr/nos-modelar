/* catálogo-capacidades.test.mjs — R05: descoberta deriva do registro, sem tabela paralela. */
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { OPS, REGISTRO_OPERACOES, nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
import { buscarCapacidades, catalogoDeCapacidades, explicarCapacidade, hipergrafoDeCapacidades } from '../../prototipos/procedural/v3/motor/catalogo.js';
import { sha256Hex } from '../../prototipos/procedural/v3/motor/sha256.js';

describe('catálogo de capacidades — R05', () => {
  const catalogo = catalogoDeCapacidades(REGISTRO_OPERACOES);

  it('deriva as 32 operações do registro, em ordem e com assinatura reproduzível', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(catalogo.operacoes.map(({ nome }) => nome).sort()).toEqual(Object.keys(OPS).sort());
    expect(catalogo.assinatura).toBe(REGISTRO_OPERACOES.assinatura);
    expect(catalogo.assinatura).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(catalogoDeCapacidades(REGISTRO_OPERACOES)).toEqual(catalogo);
  });

  it('publica contrato de uso e exemplo válido para cada operação sem inflar a descoberta', () => {
    const ajv = new Ajv2020({ strict: false });
    for (const registrada of REGISTRO_OPERACOES.listar()) {
      expect(catalogo.operacoes.find(({ id }) => id === registrada.id)?.uso).toMatchObject({
        intencao: expect.any(String), schema: registrada.uso.schemaArgumentos.$id,
      });
      const validar = ajv.compile(registrada.uso.schemaArgumentos);
      const argumentos = registrada.uso.exemplo.PASSOS.find(([nome]) => nome === registrada.nome)?.[1];
      expect(validar(argumentos), `${registrada.nome}: ${JSON.stringify(validar.errors)}`).toBe(true);
      const exemplo = registrada.uso.exemplo;
      expect(nucleo(exemplo.PASSOS, exemplo.PARAMS, exemplo.TOPO, exemplo.MATERIAIS, exemplo.ESQUELETO, exemplo.ALIASES).orfaos).toEqual([]);
    }
    expect(Buffer.byteLength(JSON.stringify(catalogo))).toBeLessThan(30_000);
    expect(Buffer.byteLength(JSON.stringify(hipergrafoDeCapacidades(catalogo)))).toBeLessThan(10_000);
  });

  it('busca por efeito, artefato e identidade sem executar receita', () => {
    expect(buscarCapacidades(catalogo, { efeito: 'publica-porta' }).operacoes).toMatchObject([{
      nome: 'publicarPorta', uso: { schema: 'mecanifica.argumentos.publicarPorta@1', obrigatorios: ['de'] },
    }]);
    expect(buscarCapacidades(catalogo, { produz: 'mecanifica.parte@1' }).operacoes.map(({ nome }) => nome)).toEqual(['parte']);
    expect(buscarCapacidades(catalogo, { identidade: 'cria-por-passo' }).total).toBe(9);
  });

  it('explica ausência com candidatas e não inventa capacidade', () => {
    expect(explicarCapacidade(catalogo, 'cubo')).toMatchObject({ encontrada: true, operacao: { id: 'mecanifica.operacao.cubo' } });
    expect(explicarCapacidade(catalogo, 'cubo', { registro: REGISTRO_OPERACOES })).toMatchObject({
      encontrada: true,
      operacao: { uso: { formato: 'mecanifica.uso-operacao@1', schemaArgumentos: { $id: 'mecanifica.argumentos.cubo@1' }, exemplo: { formato: 'mecanifica.exemplo-operacao@1' } } },
    });
    expect(explicarCapacidade(catalogo, 'colisao-global')).toMatchObject({ encontrada: false, diagnostico: 'capacidade não registrada', candidatas: [] });
  });

  it('busca também por intenção e pagina de modo estável sob orçamento explícito', () => {
    expect(buscarCapacidades(catalogo, { texto: 'revolucionar' }).operacoes.map(({ nome }) => nome)).toContain('lathe');
    const primeira = buscarCapacidades(catalogo, { limite: 3 });
    const segunda = buscarCapacidades(catalogo, { limite: 3, cursor: primeira.proximoCursor });
    expect(primeira).toMatchObject({ total: 32, retornadas: 3, truncado: true, omitidas: 29 });
    expect(segunda.operacoes.map(({ id }) => id)).not.toEqual(expect.arrayContaining(primeira.operacoes.map(({ id }) => id)));
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
