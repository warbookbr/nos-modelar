/* Prova o contexto JSON puro derivado de uma montagem persistida resolvida. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público, exercitado pelo contrato.
import { descreverMontagemResolvida } from '../../src/autoria/descrever-montagem-resolvida.js';
// @ts-expect-error — resolvedor JavaScript público, usado para montar a entrada.
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';

const json = (nome: string) => JSON.parse(readFileSync(new URL(`./fixtures/montagens-persistidas/${nome}.json`, import.meta.url), 'utf8'));
const peca = (nome: string) => JSON.parse(readFileSync(new URL(`../../pecas-resolvidas/${nome}.json`, import.meta.url), 'utf8'));

async function resolverReal() {
  return resolverMontagemPersistida(json('v2-relacoes-reais'), {
    carregarPeca: async (ref: string) => peca(ref),
    carregarMontagem: async () => json('subconjunto-freio'),
  });
}

describe('descrição pura de montagem resolvida — R01', () => {
  it('projeta árvore, poses, caixas, partes, portas e relações em JSON', async () => {
    const resolvida: any = await resolverReal();
    const contexto: any = descreverMontagemResolvida(resolvida);
    const freio = contexto.instancias.find((item: any) => item.caminho.join('/') === 'conjunto-freio/freio');
    const conjunto = contexto.instancias.find((item: any) => item.caminho.join('/') === 'conjunto-freio');

    expect(contexto).toMatchObject({
      formato: 'mecanifica.contexto-montagem',
      versao: 1,
      raiz: { id: 'v2-relacoes-reais' },
      totais: { pecas: 2, montagens: 1, relacoesDeclaradas: 2, satisfeitas: 2, reprovadas: 0 },
    });
    expect(freio.geometria).toMatchObject({ vertices: expect.any(Number), faces: expect.any(Number) });
    expect(freio.geometria.partes).toContain('disco');
    expect(freio.portas).toContainEqual(expect.objectContaining({ id: 'pilotoDaRoda', interfaceDisponivel: true }));
    expect(freio.caixaMundo.min).toHaveLength(3);
    expect(conjunto.geometria).toBeNull();
    expect(conjunto.caixaMundo).toEqual(freio.caixaMundo);
    expect(contexto.relacoes[1].referencia.caminho).toEqual(['conjunto-freio', 'freio']);
  });

  it('não expõe malha, Map, definição nem referência de runtime', async () => {
    const contexto = descreverMontagemResolvida(await resolverReal());
    const texto = JSON.stringify(contexto);

    expect(texto).not.toMatch(/"[VF]":|"definicao":|"instancia":/);
    expect(texto).not.toContain('[object Map]');
    expect(JSON.parse(texto)).toEqual(contexto);
  });

  it('declara os eixos que ainda não foram verificados', async () => {
    const contexto: any = descreverMontagemResolvida(await resolverReal());

    expect(contexto.cobertura).toMatchObject({
      relacoesLocaisExecutadas: true,
      colisaoGlobalVerificada: false,
      dependenciasIndiretasVerificadas: false,
    });
    expect(contexto.cobertura.limitacoes).toContain('caixas-mundo-nao-provam-colisao-distancia-ou-folga');
  });

  it('é determinístico e não altera a árvore resolvida', async () => {
    const resolvida: any = await resolverReal();
    const antes = JSON.stringify(resolvida);
    const primeiro = descreverMontagemResolvida(resolvida);
    resolvida.instancias.reverse();
    resolvida.relacoes.reverse();
    resolvida.instancias.find((item: any) => item.montagem)?.montagem.instancias.reverse();
    const segundo = descreverMontagemResolvida(resolvida);

    expect(segundo).toEqual(primeiro);
    expect(JSON.stringify(descreverMontagemResolvida(await resolverReal()))).toBe(JSON.stringify(primeiro));
    resolvida.instancias.reverse();
    resolvida.relacoes.reverse();
    resolvida.instancias.find((item: any) => item.montagem)?.montagem.instancias.reverse();
    expect(JSON.stringify(resolvida)).toBe(antes);
  });

  it('recusa valor que não seja árvore resolvida', () => {
    expect(() => descreverMontagemResolvida(null)).toThrow('informe uma montagem resolvida');
  });
});
