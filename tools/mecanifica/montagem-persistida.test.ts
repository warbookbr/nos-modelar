import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
import { ErroMontagemPersistida, lerMontagemPersistida, VERSAO_ATUAL, VERSOES_SUPORTADAS } from '../../src/autoria/ler-montagem-persistida.js';

const base = (instancias: any[] = []) => ({ formato: 'mecanifica.montagem', versao: 1, id: 'm1', instancias });
const instancia = (id: string, tipo = 'peca', ref = 'p1', pose: any = undefined) => ({ id, alvo: { tipo, ref }, ...(pose === undefined ? {} : { pose }) });
const esperaErro = (dado: any, codigo: string, caminho: string) => {
  try { lerMontagemPersistida(dado); throw new Error('não falhou'); } catch (erro) {
    expect(erro).toBeInstanceOf(ErroMontagemPersistida);
    expect(erro).toMatchObject({ codigo, caminho });
  }
};

describe('montagem persistida v1', () => {
  it('lê o mínimo, explicita identidade e ordena por identidade', () => {
    const resultado = lerMontagemPersistida(base([instancia('b'), instancia('a', 'montagem', 'm2')]));
    expect(resultado.instancias.map((x: any) => x.id)).toEqual(['a', 'b']);
    expect(resultado.instancias[0].pose).toEqual({ rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] });
  });

  it('mantém instâncias da mesma referência independentes e não muta nem compartilha entrada', () => {
    const rotacao = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const deslocamento = [2, 0, 0];
    const entrada = base([
      instancia('b', 'peca', 'p', { rotacao, deslocamento }),
      instancia('a', 'peca', 'p', { rotacao: rotacao.map((linha) => linha.slice()), deslocamento: [0, 1, 0] }),
    ]);
    const antes = JSON.stringify(entrada);
    const resultado = lerMontagemPersistida(entrada);
    expect(JSON.stringify(entrada)).toBe(antes);
    expect(resultado.instancias[0].alvo.ref).toBe('p');
    expect(resultado.instancias[1].alvo.ref).toBe('p');
    expect(resultado.instancias[0].pose.deslocamento).toEqual([0, 1, 0]);
    expect(resultado.instancias[1].pose.deslocamento).toEqual([2, 0, 0]);
    expect(resultado.instancias[0].pose.deslocamento).not.toBe(resultado.instancias[1].pose.deslocamento);
    expect(resultado.instancias[0].pose.rotacao).not.toBe(resultado.instancias[1].pose.rotacao);
    expect(resultado.instancias[0].pose.rotacao[0]).not.toBe(resultado.instancias[1].pose.rotacao[0]);
    expect(resultado.instancias[1].pose.rotacao).not.toBe(rotacao);
    expect(resultado.instancias[1].pose.rotacao[0]).not.toBe(rotacao[0]);
    expect(resultado.instancias[1].pose.deslocamento).not.toBe(deslocamento);
  });

  it('recusa todas as estruturas fora do contrato com erro estruturado', () => {
    esperaErro({ ...base(), formato: 'outro' }, 'formato-desconhecido', 'formato');
    esperaErro({ ...base(), versao: 3 }, 'versao-nao-suportada', 'versao');
    esperaErro({ ...base(), id: '' }, 'id-invalido', 'id');
    esperaErro(base([instancia('a'), instancia('a')]), 'instancia-duplicada', 'instancias[1].id');
    esperaErro(base([instancia('a', 'outro')]), 'tipo-alvo-nao-suportado', 'instancias[0].alvo.tipo');
    esperaErro(base([instancia('a', 'peca', '')]), 'alvo-invalido', 'instancias[0].alvo.ref');
    esperaErro(base([{ id: 'a' }]), 'alvo-invalido', 'instancias[0].alvo');
    esperaErro({ ...base(), extra: true }, 'chave-desconhecida', '$');
    esperaErro(base([{ ...instancia('a'), extra: true }]), 'chave-desconhecida', 'instancias[0]');
    esperaErro(base([{ ...instancia('a'), alvo: { tipo: 'peca', ref: 'p', extra: true } }]), 'chave-desconhecida', 'instancias[0].alvo');
    esperaErro(base([instancia('a', 'peca', 'p', { escala: 2 })]), 'chave-desconhecida', 'instancias[0].pose');
    esperaErro(base([instancia('a', 'peca', 'p', { deslocamento: [0, Infinity, 0] })]), 'pose-invalida', 'instancias[0].pose');
    esperaErro(base([instancia('a', 'peca', 'p', { rotacao: [[1, 0], [0, 1, 0], [0, 0, 1]] })]), 'pose-invalida', 'instancias[0].pose');
    esperaErro(base([instancia('a', 'peca', 'p', { rotacao: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]] })]), 'pose-invalida', 'instancias[0].pose');
  });

  it('é determinístico em leituras repetidas e ordena por code units', () => {
    const a = base(['a2', 'a10', 'A', 'a'].map((id) => instancia(id)));
    const b = base(a.instancias.slice().reverse());
    expect(lerMontagemPersistida(a).instancias.map((x: any) => x.id)).toEqual(['A', 'a', 'a10', 'a2']);
    expect(lerMontagemPersistida(a)).toEqual(lerMontagemPersistida(b));
    expect(lerMontagemPersistida(a)).toEqual(lerMontagemPersistida(a));
  });
});

const faixa = (nominal = 0.01) => ({ nominal, toleranciaFabricacao: { menos: 0.001, mais: 0.002 } });
const relacaoCilindrica = (id = 'encaixe') => ({
  id, tipo: 'encaixaCilindrico',
  referencia: { caminho: ['pino'], porta: 'piloto' },
  movel: { caminho: ['luva'], porta: 'cavidade' },
  especificacao: { folgaRadial: faixa(), toleranciaNumerica: 0.000001 },
});
const relacaoAnular = (id = 'assentamento') => ({
  id, tipo: 'assentaAnular',
  referencia: { caminho: ['aro'], porta: 'recebe' },
  movel: { caminho: ['pneu'], porta: 'ocupa' },
  especificacao: { sobreposicaoRadial: faixa(), sobreposicaoAxial: faixa(0.02), toleranciaNumerica: 0.000001 },
});
const baseV2 = (relacoes: any[] = []) => ({ ...base(), versao: VERSAO_ATUAL, relacoes });

describe('montagem persistida v2 — leitura e validação estrutural', () => {
  it('expõe as versões suportadas sem compartilhar coleção mutável', () => {
    expect(VERSOES_SUPORTADAS).toEqual([1, 2]);
    expect(Object.isFrozen(VERSOES_SUPORTADAS)).toBe(true);
  });

  it('mantém v1 compatível e recusa relacoes adicionada à v1', () => {
    const v1 = lerMontagemPersistida(base());
    expect(v1).toEqual({ formato: 'mecanifica.montagem', versao: 1, id: 'm1', instancias: [] });
    esperaErro({ ...base(), relacoes: [] }, 'chave-desconhecida', '$');
  });

  it('aceita v2 mínima com relacoes vazias', () => {
    expect(lerMontagemPersistida(baseV2())).toEqual({
      formato: 'mecanifica.montagem', versao: 2, id: 'm1', instancias: [], relacoes: [],
    });
  });

  it('normaliza e copia uma relação de cada tipo', () => {
    const entrada = baseV2([relacaoAnular(), relacaoCilindrica()]);
    const antes = JSON.stringify(entrada);
    const resultado = lerMontagemPersistida(entrada);
    expect(resultado.relacoes.map((relacao: any) => relacao.id)).toEqual(['assentamento', 'encaixe']);
    expect(resultado.relacoes[0]).toEqual(relacaoAnular());
    expect(resultado.relacoes[1]).toEqual(relacaoCilindrica());
    expect(JSON.stringify(entrada)).toBe(antes);
    expect(resultado.relacoes[0]).not.toBe(entrada.relacoes[0]);
    expect(resultado.relacoes[0].referencia.caminho).not.toBe(entrada.relacoes[0].referencia.caminho);
    expect(resultado.relacoes[0].especificacao.sobreposicaoRadial).not.toBe(entrada.relacoes[0].especificacao.sobreposicaoRadial);
  });

  it('ordena relações por code units e leituras equivalentes são determinísticas', () => {
    const a = baseV2([relacaoCilindrica('a2'), relacaoAnular('A'), relacaoCilindrica('a10'), relacaoAnular('a')]);
    const b = { ...a, relacoes: a.relacoes.slice().reverse() };
    expect(lerMontagemPersistida(a).relacoes.map((relacao: any) => relacao.id)).toEqual(['A', 'a', 'a10', 'a2']);
    expect(lerMontagemPersistida(a)).toEqual(lerMontagemPersistida(b));
  });

  it('recusa relações e especificações fora do contrato v2', () => {
    const esperaV2 = (relacao: any, codigo: string, caminho: string) => esperaErro(baseV2([relacao]), codigo, caminho);
    esperaErro({ ...baseV2(), relacoes: undefined }, 'estrutura-invalida', 'relacoes');
    esperaErro({ ...baseV2(), relacoes: {} }, 'estrutura-invalida', 'relacoes');
    esperaErro(baseV2([relacaoCilindrica(), relacaoCilindrica()]), 'relacao-duplicada', 'relacoes[1].id');
    esperaV2({ ...relacaoCilindrica(), tipo: 'outro' }, 'tipo-relacao-nao-suportado', 'relacoes[0].tipo');
    esperaV2({ ...relacaoCilindrica(), poseCanonica: {} }, 'chave-desconhecida', 'relacoes[0]');
    esperaV2({ ...relacaoCilindrica(), referencia: [] }, 'endpoint-invalido', 'relacoes[0].referencia');
    esperaV2({ ...relacaoCilindrica(), referencia: { caminho: [], porta: 'p' } }, 'endpoint-invalido', 'relacoes[0].referencia.caminho');
    esperaV2({ ...relacaoCilindrica(), referencia: { caminho: [''], porta: 'p' } }, 'endpoint-invalido', 'relacoes[0].referencia.caminho[0]');
    esperaV2({ ...relacaoCilindrica(), referencia: { caminho: ['p', 2], porta: 'p' } }, 'endpoint-invalido', 'relacoes[0].referencia.caminho[1]');
    esperaV2({ ...relacaoCilindrica(), referencia: { caminho: ['p'], porta: '' } }, 'endpoint-invalido', 'relacoes[0].referencia.porta');
    esperaV2({ ...relacaoCilindrica(), movel: { caminho: ['p'], porta: 'x', extra: true } }, 'chave-desconhecida', 'relacoes[0].movel');
    esperaV2({ ...relacaoCilindrica(), especificacao: { folgaRadial: { min: 0, max: 1 }, toleranciaNumerica: 0 } }, 'chave-desconhecida', 'relacoes[0].especificacao.folgaRadial');
    esperaV2({ ...relacaoCilindrica(), especificacao: { toleranciaNumerica: 0 } }, 'especificacao-invalida', 'relacoes[0].especificacao.folgaRadial');
    esperaV2({ ...relacaoCilindrica(), especificacao: { folgaRadial: faixa(), toleranciaNumerica: -1 } }, 'especificacao-invalida', 'relacoes[0].especificacao.toleranciaNumerica');
    esperaV2({ ...relacaoCilindrica(), especificacao: { folgaRadial: faixa(), toleranciaNumerica: Infinity } }, 'especificacao-invalida', 'relacoes[0].especificacao.toleranciaNumerica');
    esperaV2({ ...relacaoCilindrica(), especificacao: { folgaRadial: faixa(), toleranciaNumerica: NaN } }, 'especificacao-invalida', 'relacoes[0].especificacao.toleranciaNumerica');
    esperaV2({ ...relacaoCilindrica(), especificacao: { folgaRadial: faixa(0), toleranciaNumerica: 0 } }, 'especificacao-invalida', 'relacoes[0].especificacao.folgaRadial');
    esperaV2({ ...relacaoAnular(), especificacao: { ...relacaoAnular().especificacao, sobreposicaoAxial: { nominal: 0, toleranciaFabricacao: { menos: 0, mais: 0, extra: 1 } } } }, 'chave-desconhecida', 'relacoes[0].especificacao.sobreposicaoAxial.toleranciaFabricacao');
  });
});
