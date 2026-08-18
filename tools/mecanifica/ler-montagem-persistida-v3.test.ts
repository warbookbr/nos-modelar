/* Prova o contrato estrutural v3 sem alterar a leitura fechada de v1/v2. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — leitor JavaScript público, exercitado pelo contrato.
import { ErroMontagemPersistida, VERSOES_SUPORTADAS, lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';

const json = (nome: string) => JSON.parse(readFileSync(new URL(`./fixtures/montagens-persistidas/${nome}.json`, import.meta.url), 'utf8'));

function recusar(dado: any, codigo = 'especificacao-invalida') {
  try {
    lerMontagemPersistida(dado);
    throw new Error('não falhou');
  } catch (erro) {
    expect(erro).toBeInstanceOf(ErroMontagemPersistida);
    expect(erro).toMatchObject({ codigo });
  }
}

describe('montagem persistida v3 — contrato estrutural R00', () => {
  it('mantém 1/2 suportadas e lê relação direcional somente na v3', () => {
    const bruto = json('v3-separacao-direcional');
    const lido = lerMontagemPersistida(bruto);

    expect(VERSOES_SUPORTADAS).toEqual([1, 2, 3, 4]);
    expect(lido).toMatchObject({
      versao: 3,
      id: 'gabarito-separacao-direcional',
      relacoes: [{
        id: 'vaoEntreBlocos',
        tipo: 'mantemSeparacaoDirecional',
        referencia: { caminho: ['referencia'], parte: 'superficie' },
        movel: { caminho: ['movel'] },
        especificacao: { eixo: [0, 2, 0], separacaoMinima: 0.02, toleranciaNumerica: 0.000001 },
      }],
    });
    recusar({ ...bruto, versao: 2 }, 'tipo-relacao-nao-suportado');
  });

  it('preserva leitura v1/v2 e não inventa relação na v1', () => {
    expect(lerMontagemPersistida(json('subconjunto-freio'))).not.toHaveProperty('relacoes');
    expect(lerMontagemPersistida(json('v2-relacoes-reais'))).toMatchObject({ versao: 2, relacoes: expect.any(Array) });
  });

  it.each([
    [{ eixo: [0, 0, 0] }, 'relacoes[0].especificacao.eixo'],
    [{ eixo: [0, Infinity, 0] }, 'relacoes[0].especificacao.eixo'],
    [{ separacaoMinima: -1 }, 'relacoes[0].especificacao.separacaoMinima'],
    [{ toleranciaNumerica: -1 }, 'relacoes[0].especificacao.toleranciaNumerica'],
  ])('recusa especificação direcional inválida: %j', (mudanca, caminho) => {
    const dado = json('v3-separacao-direcional');
    Object.assign(dado.relacoes[0].especificacao, mudanca);
    try {
      lerMontagemPersistida(dado);
      throw new Error('não falhou');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroMontagemPersistida);
      expect(erro).toMatchObject({ codigo: 'especificacao-invalida', caminho });
    }
  });

  it('recusa parte vazia e chave de endpoint desconhecida', () => {
    const vazia = json('v3-separacao-direcional');
    vazia.relacoes[0].referencia.parte = '';
    recusar(vazia, 'endpoint-invalido');

    const extra = json('v3-separacao-direcional');
    extra.relacoes[0].movel.porta = 'atalho-posicional';
    recusar(extra, 'chave-desconhecida');
  });

  it('ordena canonicamente sem mutar a autoria', () => {
    const dado = json('v3-separacao-direcional');
    dado.instancias.reverse();
    const antes = JSON.stringify(dado);
    const lido = lerMontagemPersistida(dado);

    expect(lido.instancias.map((item: any) => item.id)).toEqual(['movel', 'referencia']);
    expect(JSON.stringify(dado)).toBe(antes);
  });
});
