/* extensoes-nativas.test.mjs — R07: SDK confinado, prova e ausência explícita. */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES, criarRegistroComExtensoes, diagnosticarExtensaoAusente, nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
import { MANIFESTO } from '../../prototipos/procedural/v3/extensoes/prisma-triangular/manifesto.js';
import { implementar } from '../../prototipos/procedural/v3/extensoes/prisma-triangular/implementacao.js';
import { PASSOS } from '../../prototipos/procedural/v3/extensoes/prisma-triangular/fixture.js';
describe('SDK de extensões nativas — R07', () => {
  const completo = () => criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [{ manifesto: MANIFESTO, implementacao: implementar }] });
  it('executa a extensão por contexto limitado, de modo determinístico e com topologia finita', () => {
    const registro = completo(), a = nucleo(PASSOS, {}, {}, {}, null, [], { registroOperacoes: registro }), b = nucleo(PASSOS, {}, {}, {}, null, [], { registroOperacoes: registro });
    expect(a.orfaos).toEqual([]); expect(a.V.size).toBe(6); expect(a.F.size).toBe(5); expect([...a.V]).toEqual([...b.V]); expect([...a.F.values()].map((f) => f.vs)).toEqual([...b.F.values()].map((f) => f.vs));
  });
  it('funciona como operação registrada numa composição e a ausência vira diagnóstico sem estado parcial', async () => {
    const { FORMATO_COMPOSICAO_PROCEDURAL, criarRegistroComposicoes, expandirComposicao } = await import('../../prototipos/procedural/v3/motor/oficina.js');
    const registro = completo();
    const composicoes = criarRegistroComposicoes({ resolverOperacao: registro.resolver, composicoes: [{ formato: FORMATO_COMPOSICAO_PROCEDURAL, id: 'mecanifica.composicao.prova-extensao', versao: '1.0.0', parametros: {}, artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1'] }, nos: [{ id: 'prisma', operacao: 'prismaTriangular', argumentos: { raio: 0.5, altura: 1 } }] }] });
    expect(nucleo(expandirComposicao(composicoes, 'mecanifica.composicao.prova-extensao').passos, {}, {}, {}, null, [], { registroOperacoes: registro }).orfaos).toEqual([]);
    const ausente = diagnosticarExtensaoAusente(REGISTRO_OPERACOES, 'prismaTriangular');
    expect(ausente).toMatchObject({ estado: 'ausente', capacidade: 'prismaTriangular' });
    const tentativa = nucleo(PASSOS); expect(tentativa.orfaos).toHaveLength(1); expect(tentativa.V.size).toBe(0); expect(tentativa.F.size).toBe(0);
  });
});
