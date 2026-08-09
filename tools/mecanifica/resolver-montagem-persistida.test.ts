import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
import { ErroResolucaoMontagemPersistida, resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
// @ts-expect-error — leitor JavaScript, usado para verificar o erro estrutural preservado.
import { ErroMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';

const freio = JSON.parse(readFileSync(new URL('../../pecas-resolvidas/freio-disco.json', import.meta.url), 'utf8'));
const roda = JSON.parse(readFileSync(new URL('../../pecas-resolvidas/roda-dianteira.json', import.meta.url), 'utf8'));
const montagem = (instancias: any[]) => ({ formato: 'mecanifica.montagem', versao: 1, id: 'm1', instancias });
const instancia = (id: string, ref: string, pose: any = undefined, tipo = 'peca') => ({
  id, alvo: { tipo, ref }, ...(pose === undefined ? {} : { pose }),
});
const carregarDoMapa = (mapa: Record<string, any>, chamadas: string[]) => async (ref: string) => {
  chamadas.push(ref);
  return mapa[ref];
};
const esperaErro = async (acao: Promise<unknown>, codigo: string, caminho: string) => {
  try { await acao; throw new Error('não falhou'); } catch (erro) {
    expect(erro).toBeInstanceOf(ErroResolucaoMontagemPersistida);
    expect(erro).toMatchObject({ codigo, caminho });
  }
};

describe('resolvedor de montagem persistida — instâncias de peça', () => {
  it('resolve duas instâncias da mesma peça real uma vez, compartilhando definição e separando poses', async () => {
    const chamadas: string[] = [];
    const dado = montagem([
      instancia('b', 'freio-disco', { deslocamento: [2, 0, 0] }),
      instancia('a', 'freio-disco', { deslocamento: [0, 1, 0] }),
    ]);
    const resultado: any = await resolverMontagemPersistida(dado, { carregarPeca: carregarDoMapa({ 'freio-disco': freio }, chamadas) });
    expect(chamadas).toEqual(['freio-disco']);
    expect(resultado.instancias[0].id).toBe('a');
    expect(resultado.instancias[0].caminho).toEqual(['a']);
    expect(resultado.instancias[0].definicao).toBe(resultado.instancias[1].definicao);
    expect(resultado.instancias[0].definicao.neutro.V).toBeInstanceOf(Map);
    expect(resultado.instancias[0].definicao.neutro.F).toBeInstanceOf(Map);
    expect(resultado.instancias[0].definicao.neutro.portas).toBeInstanceOf(Map);
    expect(resultado.instancias[0].poseLocal).not.toBe(resultado.instancias[1].poseLocal);
    expect(resultado.instancias[0].poseLocal.deslocamento).not.toBe(resultado.instancias[1].poseLocal.deslocamento);
    expect(resultado.instancias[0].poseMundo).not.toBe(resultado.instancias[0].poseLocal);
  });

  it('resolve duas peças reais diferentes e preserva as referências', async () => {
    const chamadas: string[] = [];
    const resultado: any = await resolverMontagemPersistida(montagem([
      instancia('freio', 'freio-disco'), instancia('roda', 'roda-dianteira'),
    ]), { carregarPeca: carregarDoMapa({ 'freio-disco': freio, 'roda-dianteira': roda }, chamadas) });
    expect(chamadas).toEqual(['freio-disco', 'roda-dianteira']);
    expect(resultado.instancias.map((x: any) => x.alvo.ref)).toEqual(['freio-disco', 'roda-dianteira']);
    expect(resultado.instancias[0].definicao).not.toBe(resultado.instancias[1].definicao);
  });

  it('canonicaliza ordem e mantém resultado estruturalmente equivalente em resolução repetida', async () => {
    const carregar = async (ref: string) => ref === 'freio-disco' ? freio : roda;
    const a: any = await resolverMontagemPersistida(montagem([instancia('z', 'roda-dianteira'), instancia('a', 'freio-disco')]), { carregarPeca: carregar });
    const b: any = await resolverMontagemPersistida(montagem([instancia('a', 'freio-disco'), instancia('z', 'roda-dianteira')]), { carregarPeca: carregar });
    expect(a).toEqual(b);
  });

  it('não muta a montagem nem os artefatos brutos carregados', async () => {
    const dado = montagem([instancia('a', 'freio-disco', { deslocamento: [1, 2, 3] })]);
    const bruto = JSON.parse(JSON.stringify(freio));
    const dadoAntes = JSON.stringify(dado);
    const brutoAntes = JSON.stringify(bruto);
    await resolverMontagemPersistida(dado, { carregarPeca: async () => bruto });
    expect(JSON.stringify(dado)).toBe(dadoAntes);
    expect(JSON.stringify(bruto)).toBe(brutoAntes);
  });

  it('recusa carregador ausente antes da resolução', async () => {
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'freio-disco')])) as any, 'carregador-invalido', '$');
  });

  it('recusa referência inexistente ou rejeitada com o caminho canônico', async () => {
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'ausente')]), { carregarPeca: async () => undefined }), 'referencia-ausente', 'instancias[0].alvo.ref');
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'ausente')]), { carregarPeca: async () => { throw new Error('catálogo indisponível'); } }), 'referencia-ausente', 'instancias[0].alvo.ref');
  });

  it('recusa artefato de peça inválido', async () => {
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'ruim')]), { carregarPeca: async () => ({ formato: 'outro' }) }), 'peca-invalida', 'instancias[0].alvo.ref');
  });

  it('recusa alvo montagem antes de chamar o carregador', async () => {
    let chamadas = 0;
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'filha', undefined, 'montagem')]), { carregarPeca: async () => { chamadas += 1; return freio; } }), 'alvo-nao-suportado', 'instancias[0].alvo.ref');
    expect(chamadas).toBe(0);
  });

  it('preserva erro estrutural do leitor de montagem', async () => {
    await expect(resolverMontagemPersistida({ formato: 'outro' }, { carregarPeca: async () => freio })).rejects.toBeInstanceOf(ErroMontagemPersistida);
  });
});
