import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
import { ErroMontagemPersistida, lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';

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
    esperaErro({ ...base(), versao: 2 }, 'versao-nao-suportada', 'versao');
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
