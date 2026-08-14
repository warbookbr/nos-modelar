/* Prova o contexto JSON puro derivado de uma montagem persistida resolvida. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público, exercitado pelo contrato.
import { ErroConsultaContextoMontagem, descreverMontagemResolvida } from '../../src/autoria/descrever-montagem-resolvida.js';
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

  it('reduz por caminho e preserva ancestrais e relações tocadas', async () => {
    const contexto: any = descreverMontagemResolvida(await resolverReal(), { caminho: ['conjunto-freio'] });

    expect(contexto.instancias.map((item: any) => item.caminho.join('/'))).toEqual([
      'conjunto-freio',
      'conjunto-freio/freio',
    ]);
    expect(contexto.relacoes.map((item: any) => item.id)).toEqual(['rodaNoFreio']);
    expect(contexto.consulta).toMatchObject({
      caminho: ['conjunto-freio'],
      profundidade: null,
      incluirRelacionados: false,
      instanciasOmitidas: 1,
      relacoesOmitidas: 1,
    });
  });

  it('inclui somente endpoint externo e sua trilha quando solicitado', async () => {
    const contexto: any = descreverMontagemResolvida(await resolverReal(), {
      caminho: ['conjunto-freio'],
      incluirRelacionados: true,
    });

    expect(contexto.instancias.map((item: any) => item.caminho.join('/'))).toEqual([
      'conjunto-freio',
      'conjunto-freio/freio',
      'roda',
    ]);
    expect(contexto.consulta.incluidasPorRelacao).toEqual([['roda']]);
    expect(contexto.relacoes.map((item: any) => item.id)).toEqual(['rodaNoFreio']);
  });

  it('aplica profundidade a partir da raiz sem expandir relacionados', async () => {
    const contexto: any = descreverMontagemResolvida(await resolverReal(), { profundidade: 1 });

    expect(contexto.instancias.map((item: any) => item.caminho.join('/'))).toEqual(['conjunto-freio', 'roda']);
    expect(contexto.relacoes.map((item: any) => item.id)).toEqual(['aroNoPneu', 'rodaNoFreio']);
  });

  it.each([
    [{ caminho: ['ausente'] }, 'caminho-ausente', 'caminho'],
    [{ caminho: 'roda' }, 'caminho-invalido', 'caminho'],
    [{ profundidade: -1 }, 'profundidade-invalida', 'profundidade'],
    [{ incluirRelacionados: 'sim' }, 'incluir-relacionados-invalido', 'incluirRelacionados'],
    [{ surpresa: true }, 'opcao-desconhecida', 'surpresa'],
    [null, 'opcoes-invalidas', '$opcoes'],
  ])('recusa consulta inválida com código, campo e ação: %j', async (opcoes, codigo, campo) => {
    const resolvida = await resolverReal();
    try {
      descreverMontagemResolvida(resolvida, opcoes);
      throw new Error('não falhou');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroConsultaContextoMontagem);
      expect(erro).toMatchObject({ codigo, campo, acao: expect.any(String) });
    }
  });
});
