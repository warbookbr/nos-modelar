/* composicoes-procedurais.test.mjs — R06: subgrafos declarativos e reutilizáveis. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ErroComposicaoProcedural, FORMATO_COMPOSICAO_PROCEDURAL, REGISTRO_OPERACOES, criarRegistroComposicoes, expandirChamadasDeComposicao, expandirComposicao, nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

const MESH = 'mecanifica.malha-poligonal@1';
const composicao = (id, parametros, nos) => ({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros, artefatos: { entra: [], sai: [MESH] }, nos });
const registro = () => criarRegistroComposicoes({ resolverOperacao: REGISTRO_OPERACOES.resolver, composicoes: [
  composicao('mecanifica.composicao.base-quadrada', { origem: { tipo: 'inteiro' }, lado: { tipo: 'numero' } }, [
    { id: 'bloco', operacao: 'cubo', argumentos: { origemId: { parametro: 'origem' }, lado: { parametro: 'lado' } } },
  ]),
  composicao('mecanifica.composicao.pino-circular', { origem: { tipo: 'inteiro' }, raio: { tipo: 'numero' }, altura: { tipo: 'numero' } }, [
    { id: 'pino', operacao: 'cilindro', argumentos: { origemId: { parametro: 'origem' }, raio: { parametro: 'raio' }, altura: { parametro: 'altura' }, lados: 8 } },
  ]),
  composicao('mecanifica.composicao.suporte-simples', { origemBase: { tipo: 'inteiro' }, origemPino: { tipo: 'inteiro' }, lado: { tipo: 'numero' }, raio: { tipo: 'numero' } }, [
    { id: 'base', composicao: 'mecanifica.composicao.base-quadrada', argumentos: { origem: { parametro: 'origemBase' }, lado: { parametro: 'lado' } } },
    { id: 'pino', composicao: 'mecanifica.composicao.pino-circular', argumentos: { origem: { parametro: 'origemPino' }, raio: { parametro: 'raio' }, altura: { parametro: 'lado' } } },
  ]),
] });

describe('composições procedurais — R06', () => {
  it('mantém o serviço puro fora de Three.js, MCP e filesystem', () => {
    const fonte = readFileSync(new URL('../../prototipos/procedural/v3/motor/composicoes.js', import.meta.url), 'utf8');
    expect(fonte).not.toMatch(/from ['"](?:three|node:fs|node:path|@modelcontextprotocol)/);
  });

  it('expande três composições reutilizadas por duas receitas sem mudar a identidade externa', () => {
    const r = registro();
    const receitaA = expandirChamadasDeComposicao(r, [
      { id: 'base-a', composicao: 'mecanifica.composicao.base-quadrada', argumentos: { origem: 101, lado: 1 } },
      { id: 'pino-a', composicao: 'mecanifica.composicao.pino-circular', argumentos: { origem: 102, raio: 0.2, altura: 1 } },
      { id: 'suporte-a', composicao: 'mecanifica.composicao.suporte-simples', argumentos: { origemBase: 103, origemPino: 104, lado: 0.5, raio: 0.1 } },
    ]);
    const receitaB = expandirChamadasDeComposicao(r, [
      { id: 'base-b', composicao: 'mecanifica.composicao.base-quadrada', argumentos: { origem: 201, lado: 2 } },
      { id: 'pino-b', composicao: 'mecanifica.composicao.pino-circular', argumentos: { origem: 202, raio: 0.3, altura: 2 } },
      { id: 'suporte-b', composicao: 'mecanifica.composicao.suporte-simples', argumentos: { origemBase: 203, origemPino: 204, lado: 0.8, raio: 0.15 } },
    ]);
    expect(receitaA.passos).toHaveLength(4); expect(receitaB.passos).toHaveLength(4);
    expect(receitaA.passos.map(([, args]) => args.origemId)).toEqual([101, 102, 103, 104]);
    expect(receitaB.passos.map(([, args]) => args.origemId)).toEqual([201, 202, 203, 204]);
    expect(receitaA.procedencia.nos.map(({ caminho }) => caminho)).toContain('receita:suporte-a/mecanifica.composicao.suporte-simples/base/bloco');
    expect(nucleo(receitaA.passos, {}, {}).orfaos).toEqual([]);
    expect(nucleo(receitaB.passos, {}, {}).orfaos).toEqual([]);
  });

  it('assina a mesma configuração independentemente da ordem de entrada', () => {
    const original = registro();
    const invertido = criarRegistroComposicoes({ resolverOperacao: REGISTRO_OPERACOES.resolver, composicoes: [...original.listar()].reverse() });
    expect(invertido.assinatura).toBe(original.assinatura);
  });

  it('recusa ciclo, tipo incompatível e orçamento antes de devolver passos', () => {
    const op = REGISTRO_OPERACOES.resolver;
    expect(() => criarRegistroComposicoes({ resolverOperacao: op, composicoes: [
      composicao('mecanifica.composicao.a', {}, [{ id: 'b', composicao: 'mecanifica.composicao.b', argumentos: {} }]),
      composicao('mecanifica.composicao.b', {}, [{ id: 'a', composicao: 'mecanifica.composicao.a', argumentos: {} }]),
    ] })).toThrow(/ciclo de composições/);
    expect(() => criarRegistroComposicoes({ resolverOperacao: op, composicoes: [{
      formato: FORMATO_COMPOSICAO_PROCEDURAL, id: 'mecanifica.composicao.invalida', versao: '1.0.0', parametros: {}, artefatos: { entra: [], sai: [MESH] },
      nos: [{ id: 'mover', operacao: 'transladar', argumentos: { d: [1, 0, 0] } }],
    }] })).toThrow(/artefato\(s\) indisponível/);
    expect(() => expandirComposicao(registro(), 'mecanifica.composicao.suporte-simples', { origemBase: 1, origemPino: 2, lado: 1, raio: 0.1 }, { orcamento: { maxPassos: 1, maxProfundidade: 4 } })).toThrow(ErroComposicaoProcedural);
  });
});
