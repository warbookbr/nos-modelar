import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
import { ErroResolucaoMontagemPersistida, resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
// @ts-expect-error — leitor JavaScript, usado para verificar o erro estrutural preservado.
import { ErroMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
// @ts-expect-error — matemática neutra JavaScript, usada para a prova numérica.
import { comporTransformacoesRigidas } from '../../src/autoria/transformacao-rigida.js';

const freio = JSON.parse(readFileSync(new URL('../../pecas-resolvidas/freio-disco.json', import.meta.url), 'utf8'));
const roda = JSON.parse(readFileSync(new URL('../../pecas-resolvidas/roda-dianteira.json', import.meta.url), 'utf8'));
const montagem = (instancias: any[], id = 'm1') => ({ formato: 'mecanifica.montagem', versao: 1, id, instancias });
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
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'freio-disco')])) as any, 'carregador-invalido', 'instancias[0].alvo.ref');
  });

  it('recusa referência inexistente ou rejeitada com o caminho canônico', async () => {
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'ausente')]), { carregarPeca: async () => undefined }), 'referencia-ausente', 'instancias[0].alvo.ref');
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'ausente')]), { carregarPeca: async () => { throw new Error('catálogo indisponível'); } }), 'referencia-ausente', 'instancias[0].alvo.ref');
  });

  it('recusa artefato de peça inválido', async () => {
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'ruim')]), { carregarPeca: async () => ({ formato: 'outro' }) }), 'peca-invalida', 'instancias[0].alvo.ref');
  });

  it('recusa carregador de montagem ausente sem chamar o carregador de peça', async () => {
    let chamadas = 0;
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'filha', undefined, 'montagem')]), { carregarPeca: async () => { chamadas += 1; return freio; } }), 'carregador-invalido', 'instancias[0].alvo.ref');
    expect(chamadas).toBe(0);
  });

  it('preserva erro estrutural do leitor de montagem', async () => {
    await expect(resolverMontagemPersistida({ formato: 'outro' }, { carregarPeca: async () => freio })).rejects.toBeInstanceOf(ErroMontagemPersistida);
  });

  it('resolve montagem filha realista com IDs e estrutura recursiva', async () => {
    const filha = montagem([instancia('freio', 'freio-disco')], 'filha');
    const raiz = montagem([instancia('conjunto', 'filha', undefined, 'montagem')], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, {
      carregarPeca: async () => freio,
      carregarMontagem: async () => filha,
    });
    expect(resultado).toMatchObject({ id: 'raiz', instancias: [{ id: 'conjunto', caminho: ['conjunto'], alvo: { tipo: 'montagem', ref: 'filha' } }] });
    expect(resultado.instancias[0].montagem).toMatchObject({ id: 'filha', instancias: [{ id: 'freio', caminho: ['conjunto', 'freio'], alvo: { tipo: 'peca', ref: 'freio-disco' } }] });
  });

  it('compõe poses não triviais de raiz, filha e peça', async () => {
    const rotacaoY = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];
    const rotacaoZ = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
    const filha = montagem([instancia('freio', 'freio-disco', { rotacao: rotacaoZ, deslocamento: [1, 2, 3] })], 'filha');
    const raiz = montagem([instancia('conjunto', 'filha', undefined, 'montagem')], 'raiz');
    const resultado: any = await resolverMontagemPersistida({ ...raiz, instancias: [{ ...raiz.instancias[0], pose: { rotacao: rotacaoY, deslocamento: [10, 0, 0] } }] }, {
      carregarPeca: async () => freio,
      carregarMontagem: async () => filha,
    });
    const esperado = comporTransformacoesRigidas(
      { escala: 1, rotacao: rotacaoY, deslocamento: [10, 0, 0] },
      { escala: 1, rotacao: rotacaoZ, deslocamento: [1, 2, 3] },
    );
    const peca = resultado.instancias[0].montagem.instancias[0];
    expect(peca.caminho).toEqual(['conjunto', 'freio']);
    expect(peca.poseMundo).toEqual({ rotacao: esperado.rotacao, deslocamento: esperado.deslocamento });
    expect(peca.poseMundo).toEqual({ rotacao: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], deslocamento: [13, 2, -1] });
  });

  it('cacheia montagem e peça, mas cria ocorrências independentes em dois ramos', async () => {
    const chamadasMontagem: string[] = [];
    const chamadasPeca: string[] = [];
    const filha = montagem([instancia('freio', 'freio-disco')], 'filha');
    const raiz = montagem([
      instancia('conjuntoA', 'filha', { deslocamento: [1, 0, 0] }, 'montagem'),
      instancia('conjuntoB', 'filha', { deslocamento: [5, 0, 0] }, 'montagem'),
    ], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, {
      carregarPeca: async (ref: string) => { chamadasPeca.push(ref); return freio; },
      carregarMontagem: async (ref: string) => { chamadasMontagem.push(ref); return filha; },
    });
    expect(chamadasMontagem).toEqual(['filha']);
    expect(chamadasPeca).toEqual(['freio-disco']);
    const a = resultado.instancias[0].montagem.instancias[0];
    const b = resultado.instancias[1].montagem.instancias[0];
    expect(a.definicao).toBe(b.definicao);
    expect(a.montagem).toBeUndefined();
    expect(a.caminho).toEqual(['conjuntoA', 'freio']);
    expect(b.caminho).toEqual(['conjuntoB', 'freio']);
    expect(a.poseMundo.deslocamento).toEqual([1, 0, 0]);
    expect(b.poseMundo.deslocamento).toEqual([5, 0, 0]);
    expect(resultado.instancias[0].montagem).not.toBe(resultado.instancias[1].montagem);
  });

  it('aceita reuso não cíclico da mesma montagem em ramos irmãos', async () => {
    const filha = montagem([], 'filha');
    const raiz = montagem([instancia('a', 'filha', undefined, 'montagem'), instancia('b', 'filha', undefined, 'montagem')], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, { carregarMontagem: async () => filha });
    expect(resultado.instancias).toHaveLength(2);
    expect(resultado.instancias[0].montagem.id).toBe('filha');
    expect(resultado.instancias[1].montagem.id).toBe('filha');
  });

  it('recusa ciclo direto com trilha semântica', async () => {
    const a = montagem([instancia('volta', 'A', undefined, 'montagem')], 'A');
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'A', undefined, 'montagem')], 'raiz'), {
      carregarMontagem: async () => a,
    }), 'ciclo', 'instancias[0].alvo.ref');
    try {
      await resolverMontagemPersistida(montagem([instancia('a', 'A', undefined, 'montagem')], 'raiz'), { carregarMontagem: async () => a });
    } catch (erro: any) {
      expect(erro.trilha).toEqual(['a', 'volta']);
      expect(erro.message).toContain('A -> A');
    }
  });

  it('recusa ciclo indireto com sequência de referências', async () => {
    const a = montagem([instancia('b', 'B', undefined, 'montagem')], 'A');
    const b = montagem([instancia('a', 'A', undefined, 'montagem')], 'B');
    try {
      await resolverMontagemPersistida(montagem([instancia('a', 'A', undefined, 'montagem')], 'raiz'), { carregarMontagem: async (ref: string) => ref === 'A' ? a : b });
      throw new Error('não falhou');
    } catch (erro: any) {
      expect(erro).toBeInstanceOf(ErroResolucaoMontagemPersistida);
      expect(erro.codigo).toBe('ciclo');
      expect(erro.trilha).toEqual(['a', 'b', 'a']);
      expect(erro.message).toContain('A -> B -> A');
    }
  });

  it('recusa montagem filha ausente ou inválida', async () => {
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'ausente', undefined, 'montagem')]), { carregarMontagem: async () => undefined }), 'referencia-ausente', 'instancias[0].alvo.ref');
    await esperaErro(resolverMontagemPersistida(montagem([instancia('a', 'ruim', undefined, 'montagem')]), { carregarMontagem: async () => ({ formato: 'outro' }) }), 'montagem-invalida', 'instancias[0].alvo.ref');
  });

  it('não devolve composição parcial quando uma falha é profunda', async () => {
    const filha = montagem([instancia('boa', 'freio-disco'), instancia('ruim', 'ausente')], 'filha');
    await esperaErro(resolverMontagemPersistida(montagem([instancia('conjunto', 'filha', undefined, 'montagem')]), { carregarPeca: async (ref: string) => ref === 'freio-disco' ? freio : undefined, carregarMontagem: async () => filha }), 'referencia-ausente', 'instancias[1].alvo.ref');
  });

  it('não muta raiz, filhas brutas ou peças brutas', async () => {
    const filha = montagem([instancia('freio', 'freio-disco', { deslocamento: [1, 0, 0] })], 'filha');
    const raiz = montagem([instancia('conjunto', 'filha', { deslocamento: [2, 0, 0] }, 'montagem')], 'raiz');
    const filhaBruta = JSON.parse(JSON.stringify(filha));
    const raizAntes = JSON.stringify(raiz);
    const filhaAntes = JSON.stringify(filhaBruta);
    const pecaBruta = JSON.parse(JSON.stringify(freio));
    const pecaAntes = JSON.stringify(pecaBruta);
    await resolverMontagemPersistida(raiz, { carregarPeca: async () => pecaBruta, carregarMontagem: async () => filhaBruta });
    expect(JSON.stringify(raiz)).toBe(raizAntes);
    expect(JSON.stringify(filhaBruta)).toBe(filhaAntes);
    expect(JSON.stringify(pecaBruta)).toBe(pecaAntes);
  });
});
