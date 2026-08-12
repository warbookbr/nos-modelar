import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
import { ErroResolucaoMontagemPersistida, resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
// @ts-expect-error — leitor JavaScript, usado para verificar o erro estrutural preservado.
import { ErroMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
// @ts-expect-error — matemática neutra JavaScript, usada para a prova numérica.
import { comporTransformacoesRigidas, identidadeTransformacaoRigida } from '../../src/autoria/transformacao-rigida.js';
// @ts-expect-error — interfaces públicas da montagem, usadas na comparação direta exigida pela rodada.
import { resolverPortasDeMontagem, validarEncaixeCilindrico, validarAssentamentoAnular } from '../../src/autoria/interfaces-montagem.js';
// @ts-expect-error — leitor neutro usado para montar a chamada direta do validador.
import { lerPecaResolvida } from '../../src/autoria/ler-peca-resolvida.js';

const freio = JSON.parse(readFileSync(new URL('../../pecas-resolvidas/freio-disco.json', import.meta.url), 'utf8'));
const roda = JSON.parse(readFileSync(new URL('../../pecas-resolvidas/roda-dianteira.json', import.meta.url), 'utf8'));
const montagem = (instancias: any[], id = 'm1') => ({ formato: 'mecanifica.montagem', versao: 1, id, instancias });
const instancia = (id: string, ref: string, pose: any = undefined, tipo = 'peca') => ({
  id, alvo: { tipo, ref }, ...(pose === undefined ? {} : { pose }),
});
const relacao = (referencia: string[], movel: string[], id = 'relacao') => ({
  id, tipo: 'encaixaCilindrico',
  referencia: { caminho: referencia, porta: 'pilotoDaRoda' },
  movel: { caminho: movel, porta: 'pilotoDaRoda' },
  especificacao: { folgaRadial: { nominal: 0, toleranciaFabricacao: { menos: 0, mais: 0 } }, toleranciaNumerica: 0 },
});
const relacaoReal = (referencia: string[], movel: string[], id = 'rodaNoFreio') => ({
  id, tipo: 'encaixaCilindrico',
  referencia: { caminho: referencia, porta: 'pilotoDaRoda' },
  movel: { caminho: movel, porta: 'cavidadeDoCubo' },
  especificacao: { folgaRadial: { nominal: 0.029, toleranciaFabricacao: { menos: 0.00005, mais: 0.00005 } }, toleranciaNumerica: 0.000001 },
});
const relacaoAnularReal = (caminho: string[], id = 'aroNoPneu') => ({
  id, tipo: 'assentaAnular',
  referencia: { caminho, porta: 'assentoDoAroNoPneu' },
  movel: { caminho, porta: 'assentoDoPneuNoAro' },
  especificacao: {
    sobreposicaoRadial: { nominal: 0.025, toleranciaFabricacao: { menos: 0.0000625, mais: 0.0000625 } },
    sobreposicaoAxial: { nominal: 0.146, toleranciaFabricacao: { menos: 0.0000625, mais: 0.0000625 } },
    toleranciaNumerica: 0.000001,
  },
});
const carregarDoMapa = (mapa: Record<string, any>, chamadas: string[]) => async (ref: string) => {
  chamadas.push(ref);
  return mapa[ref];
};
const esperaErro = async (acao: Promise<unknown>, codigo: string, caminho: string) => {
  try { await acao; throw new Error('não falhou'); } catch (erro) {
    expect(erro).toBeInstanceOf(ErroResolucaoMontagemPersistida);
    expect(erro).toMatchObject({ codigo, caminho });
    return erro as any;
  }
};

const v2 = (instancias: any[] = [], relacoes: any[] = [], id = 'v2') => ({ formato: 'mecanifica.montagem', versao: 2, id, instancias, relacoes });

describe('resolvedor de montagem persistida — instâncias de peça', () => {
  it('resolve v2 vazia sem chamar carregadores e devolve relacoes vazias', async () => {
    let chamadas = 0;
    const resultado: any = await resolverMontagemPersistida(v2(), {
      carregarPeca: async () => { chamadas += 1; return freio; },
      carregarMontagem: async () => { chamadas += 1; return v2(); },
    });
    expect(resultado).toEqual({ id: 'v2', instancias: [], relacoes: [] });
    expect(chamadas).toBe(0);
  });

  it('resolve relação direta e aponta endpoints por identidade para os nós da árvore', async () => {
    const raiz = v2([instancia('a', 'freio-disco'), instancia('b', 'freio-disco')], [relacao(['a'], ['b'])], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, { carregarPeca: async () => freio });
    const relacaoResolvida = resultado.relacoes[0];
    expect(relacaoResolvida).toMatchObject({
      id: 'relacao', tipo: 'encaixaCilindrico',
      referencia: { caminho: ['a'], porta: 'pilotoDaRoda', instancia: resultado.instancias[0] },
      movel: { caminho: ['b'], porta: 'pilotoDaRoda', instancia: resultado.instancias[1] },
      especificacao: raiz.relacoes[0].especificacao,
      satisfeita: expect.any(Boolean), medidas: expect.any(Object), diagnosticos: expect.any(Array),
    });
    expect(relacaoResolvida.referencia.instancia).toBe(resultado.instancias[0]);
    expect(relacaoResolvida.movel.instancia).toBe(resultado.instancias[1]);
    expect(relacaoResolvida.referencia).not.toEqual(expect.any(String));
  });

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

describe('resolvedor de montagem persistida — relações v2 sem execução mecânica', () => {
  it('resolve caminho recursivo raiz v2 -> montagem filha v1 -> peça', async () => {
    const filha = montagem([instancia('freio', 'freio-disco')], 'filha');
    const raiz = v2([
      instancia('conjunto', 'filha', undefined, 'montagem'),
      instancia('roda', 'freio-disco'),
    ], [relacao(['conjunto', 'freio'], ['roda'])], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, {
      carregarPeca: async () => freio,
      carregarMontagem: async () => filha,
    });
    const conjunto = resultado.instancias.find((instancia: any) => instancia.id === 'conjunto');
    const pecaFilha = conjunto.montagem.instancias[0];
    expect(resultado.relacoes[0].referencia.caminho).toEqual(['conjunto', 'freio']);
    expect(resultado.relacoes[0].referencia.instancia).toBe(pecaFilha);
    expect(resultado.relacoes[0].movel.instancia).toBe(resultado.instancias.find((instancia: any) => instancia.id === 'roda'));
    expect(pecaFilha.caminho).toEqual(['conjunto', 'freio']);
  });

  it('mantém relação declarada em filha v2 relativa à filha e mistura raiz v1 -> filha v2', async () => {
    const filha = v2([
      instancia('a', 'freio-disco'), instancia('b', 'freio-disco'),
    ], [relacao(['a'], ['b'], 'relacao-da-filha')], 'filha');
    const raiz = montagem([instancia('conjunto', 'filha', undefined, 'montagem')], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, {
      carregarPeca: async () => freio,
      carregarMontagem: async () => filha,
    });
    const conjunto = resultado.instancias[0];
    expect(resultado.relacoes).toBeUndefined();
    expect(conjunto.montagem.relacoes[0].id).toBe('relacao-da-filha');
    expect(conjunto.montagem.relacoes[0].referencia.caminho).toEqual(['a']);
    expect(conjunto.montagem.relacoes[0].referencia.instancia).toBe(conjunto.montagem.instancias[0]);
    expect(conjunto.montagem.relacoes[0].movel.instancia).toBe(conjunto.montagem.instancias[1]);
  });

  it('resolve v2 -> v2 sem promover relações da filha para a raiz', async () => {
    const neta = v2([instancia('p', 'freio-disco')], [], 'neta');
    const filha = v2([instancia('conjunto', 'neta', undefined, 'montagem')], [], 'filha');
    const raiz = v2([instancia('filha', 'filha', undefined, 'montagem')], [], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, {
      carregarPeca: async () => freio,
      carregarMontagem: async (ref: string) => ref === 'filha' ? filha : neta,
    });
    expect(resultado.relacoes).toEqual([]);
    expect(resultado.instancias[0].montagem.relacoes).toEqual([]);
    expect(resultado.instancias[0].montagem.instancias[0].montagem.relacoes).toEqual([]);
  });

  it('reutiliza montagem v2 em ramos irmãos com endpoints e poses independentes', async () => {
    const filha = v2([
      instancia('a', 'freio-disco'), instancia('b', 'freio-disco'),
    ], [relacao(['a'], ['b'], 'encaixe')], 'filha');
    const raiz = montagem([
      instancia('ramoA', 'filha', { deslocamento: [1, 0, 0] }, 'montagem'),
      instancia('ramoB', 'filha', { deslocamento: [5, 0, 0] }, 'montagem'),
    ], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, {
      carregarPeca: async () => freio,
      carregarMontagem: async () => filha,
    });
    const relacaoA = resultado.instancias[0].montagem.relacoes[0];
    const relacaoB = resultado.instancias[1].montagem.relacoes[0];
    expect(relacaoA.referencia.instancia).toBe(resultado.instancias[0].montagem.instancias[0]);
    expect(relacaoB.referencia.instancia).toBe(resultado.instancias[1].montagem.instancias[0]);
    expect(relacaoA.referencia.instancia).not.toBe(relacaoB.referencia.instancia);
    expect(relacaoA.referencia.instancia.poseMundo.deslocamento).toEqual([1, 0, 0]);
    expect(relacaoB.referencia.instancia.poseMundo.deslocamento).toEqual([5, 0, 0]);
    expect(relacaoA.referencia.instancia.definicao).toBe(relacaoB.referencia.instancia.definicao);
  });

  it('falha com caminho e trilha para endpoints semânticos inválidos', async () => {
    const carregar = { carregarPeca: async () => freio, carregarMontagem: async () => montagem([instancia('freio', 'freio-disco')], 'filha') };
    const falha = async (dado: any, codigo: string, caminho: string, trilha: string[]) => {
      const erro = await esperaErro(resolverMontagemPersistida(dado, carregar), codigo, caminho);
      expect(erro.trilha).toEqual(trilha);
    };
    await falha(v2([instancia('a', 'freio-disco')], [relacao(['ausente'], ['a'])]), 'endpoint-caminho-inexistente', 'relacoes[0].referencia.caminho[0]', ['ausente']);
    await falha(v2([instancia('conjunto', 'filha', undefined, 'montagem')], [relacao(['conjunto', 'ausente'], ['conjunto'])]), 'endpoint-caminho-inexistente', 'relacoes[0].referencia.caminho[1]', ['conjunto', 'ausente']);
    await falha(v2([instancia('a', 'freio-disco')], [relacao(['a', 'depois'], ['a'])]), 'endpoint-travessia-invalida', 'relacoes[0].referencia.caminho[0]', ['a']);
    await falha(v2([instancia('conjunto', 'filha', undefined, 'montagem')], [relacao(['conjunto'], ['conjunto'])]), 'endpoint-nao-e-peca', 'relacoes[0].referencia.caminho[0]', ['conjunto']);
    await falha(v2([instancia('a', 'freio-disco')], [relacao(['a'], ['a'])].map((valor) => ({ ...valor, referencia: { ...valor.referencia, porta: 'ausente' } }))), 'porta-ausente', 'relacoes[0].referencia.porta', ['a']);
  });

  it('preserva determinismo, não mutação e resultados mecânicos isolados', async () => {
    const raiz = v2([instancia('a', 'freio-disco'), instancia('b', 'freio-disco')], [relacao(['a'], ['b'])], 'raiz');
    const antes = JSON.stringify(raiz);
    const carregar = async () => freio;
    const primeiro: any = await resolverMontagemPersistida(raiz, { carregarPeca: carregar });
    const segundo: any = await resolverMontagemPersistida(raiz, { carregarPeca: carregar });
    expect(primeiro).toEqual(segundo);
    expect(JSON.stringify(raiz)).toBe(antes);
    expect(primeiro.relacoes[0]).toMatchObject({ satisfeita: expect.any(Boolean), medidas: expect.any(Object), diagnosticos: expect.any(Array) });
  });
});

describe('resolvedor de montagem persistida — rodada R03 cilíndrica', () => {
  const neutroFreio = lerPecaResolvida(freio);
  const neutroRoda = lerPecaResolvida(roda);
  const instanciaTecnica = (id: string, neutro: any, deslocamento = [0, 0, 0]) => ({
    id, neutro, escala: 1, rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento,
    referencial: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] },
  });

  it('valida relação real satisfeita e coincide com chamada direta do validador', async () => {
    const dado = v2([instancia('freio', 'freio-disco'), instancia('roda', 'roda-dianteira')], [relacaoReal(['freio'], ['roda'])]);
    const resultado: any = await resolverMontagemPersistida(dado, { carregarPeca: async (ref: string) => ref === 'freio-disco' ? freio : roda });
    const declaracao = { id: 'rodaNoFreio', tipo: 'encaixaCilindrico', referencia: 'freio.pilotoDaRoda', movel: 'roda.cavidadeDoCubo', folgaRadial: dado.relacoes[0].especificacao.folgaRadial, toleranciaNumerica: 0.000001 };
    const direto: any = validarEncaixeCilindrico(declaracao, resolverPortasDeMontagem([instanciaTecnica('freio', neutroFreio), instanciaTecnica('roda', neutroRoda)]));
    expect(resultado.relacoes[0].satisfeita).toBe(true);
    expect(resultado.relacoes[0].medidas).toEqual(direto.medidas);
    expect(resultado.relacoes[0].diagnosticos).toEqual(direto.diagnosticos);
  });

  it('retorna falso e diagnóstico para falha mecânica, sem lançar', async () => {
    const dado = v2([instancia('freio', 'freio-disco'), instancia('roda', 'roda-dianteira')], [relacaoReal(['freio'], ['roda'], 'falha')]);
    dado.relacoes[0].especificacao.folgaRadial.nominal = 0.003;
    const resultado: any = await resolverMontagemPersistida(dado, { carregarPeca: async (ref: string) => ref === 'freio-disco' ? freio : roda });
    expect(resultado.relacoes[0].satisfeita).toBe(false);
    expect(resultado.relacoes[0].diagnosticos).toEqual(expect.arrayContaining([expect.objectContaining({ codigo: 'folga-radial-fora' })]));
  });

  it('isola duas relações cilíndricas, uma satisfeita e outra falha', async () => {
    const dado = v2([instancia('freioA', 'freio-disco'), instancia('rodaA', 'roda-dianteira'), instancia('freioB', 'freio-disco'), instancia('rodaB', 'roda-dianteira')], [relacaoReal(['freioA'], ['rodaA'], 'passa'), relacaoReal(['freioB'], ['rodaB'], 'falha')]);
    dado.relacoes[1].especificacao.folgaRadial.nominal = 0.003;
    const resultado: any = await resolverMontagemPersistida(dado, { carregarPeca: async (ref: string) => ref === 'roda-dianteira' ? roda : freio });
    expect(resultado.relacoes.map((relacao: any) => relacao.satisfeita)).toEqual([false, true]);
  });

  it('usa poseMundo do endpoint filho e reage ao deslocamento do pai', async () => {
    const filha = montagem([instancia('roda', 'roda-dianteira')], 'filha');
    const base = v2([instancia('freio', 'freio-disco'), instancia('conjunto', 'filha', undefined, 'montagem')], [relacaoReal(['freio'], ['conjunto', 'roda'], 'mundo')]);
    const deslocada = { ...base, instancias: [base.instancias[0], { ...base.instancias[1], pose: { deslocamento: [1, 0, 0] } }] };
    const carregar = { carregarPeca: async (ref: string) => ref === 'roda-dianteira' ? roda : freio, carregarMontagem: async () => filha };
    const passou: any = await resolverMontagemPersistida(base, carregar);
    const falhou: any = await resolverMontagemPersistida(deslocada, carregar);
    expect(passou.relacoes[0].satisfeita).toBe(true);
    expect(falhou.relacoes[0].satisfeita).toBe(false);
    expect(falhou.relacoes[0].movel.instancia.poseMundo.deslocamento).toEqual([1, 0, 0]);
  });

});

describe('resolvedor de montagem persistida — rodada R04 anular', () => {
  const neutroRoda = lerPecaResolvida(roda);
  const instanciaTecnica = (id: string, neutro: any, deslocamento = [0, 0, 0]) => ({
    id, neutro, escala: 1, rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento,
    referencial: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] },
  });

  it('valida assentamento real roda/roda e coincide com chamada direta do validador', async () => {
    const dado = v2([instancia('roda', 'roda-dianteira')], [relacaoAnularReal(['roda'])]);
    const resultado: any = await resolverMontagemPersistida(dado, { carregarPeca: async () => roda });
    const relacaoPersistida = dado.relacoes[0];
    const declaracao = {
      id: 'aroNoPneu', tipo: 'assentaAnular', referencia: 'referencia.assentoDoAroNoPneu', movel: 'movel.assentoDoPneuNoAro',
      sobreposicaoRadial: relacaoPersistida.especificacao.sobreposicaoRadial,
      sobreposicaoAxial: relacaoPersistida.especificacao.sobreposicaoAxial,
      toleranciaNumerica: relacaoPersistida.especificacao.toleranciaNumerica,
    };
    const direto: any = validarAssentamentoAnular(declaracao, resolverPortasDeMontagem([instanciaTecnica('referencia', neutroRoda), instanciaTecnica('movel', neutroRoda)]));
    expect(resultado.relacoes[0].satisfeita).toBe(true);
    expect(resultado.relacoes[0].medidas).toEqual(direto.medidas);
    expect(resultado.relacoes[0].diagnosticos).toEqual(direto.diagnosticos);
    expect(resultado.relacoes[0].medidas).toMatchObject({ disponiveis: true, sobreposicaoRadial: expect.any(Number), sobreposicaoAxial: expect.any(Number) });
  });

  it('retorna falso e diagnóstico para assentamento fora da especificação, sem lançar', async () => {
    const dado = v2([instancia('roda', 'roda-dianteira')], [relacaoAnularReal(['roda'], 'falhaAnular')]);
    dado.relacoes[0].especificacao.sobreposicaoRadial.nominal = 0.001;
    const resultado: any = await resolverMontagemPersistida(dado, { carregarPeca: async () => roda });
    expect(resultado.relacoes[0].satisfeita).toBe(false);
    expect(resultado.relacoes[0].diagnosticos).toEqual(expect.arrayContaining([expect.objectContaining({ codigo: 'faixa-radial-fora' })]));
  });

  it('executa relação cilíndrica e anular sem misturar resultados e preserva ordem canônica', async () => {
    const dado = v2([instancia('freio', 'freio-disco'), instancia('roda', 'roda-dianteira')], [relacaoAnularReal(['roda'], 'zAnular'), relacaoReal(['freio'], ['roda'], 'aCilindrica')]);
    const resultado: any = await resolverMontagemPersistida(dado, { carregarPeca: async (ref: string) => ref === 'freio-disco' ? freio : roda });
    expect(resultado.relacoes.map((relacao: any) => [relacao.id, relacao.tipo])).toEqual([['aCilindrica', 'encaixaCilindrico'], ['zAnular', 'assentaAnular']]);
    expect(resultado.relacoes.every((relacao: any) => relacao.medidas && Array.isArray(relacao.diagnosticos))).toBe(true);
  });

  it('resolve caminho anular recursivo e mantém ocorrências reutilizadas independentes', async () => {
    const filha = v2([instancia('roda', 'roda-dianteira')], [relacaoAnularReal(['roda'])], 'filha');
    const raiz = v2([instancia('a', 'filha', { deslocamento: [0, 0, 0] }, 'montagem'), instancia('b', 'filha', { deslocamento: [1, 0, 0] }, 'montagem')], [], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, { carregarPeca: async () => roda, carregarMontagem: async () => filha });
    const relacaoA = resultado.instancias[0].montagem.relacoes[0];
    const relacaoB = resultado.instancias[1].montagem.relacoes[0];
    expect(relacaoA.referencia.instancia).toBe(resultado.instancias[0].montagem.instancias[0]);
    expect(relacaoB.referencia.instancia).toBe(resultado.instancias[1].montagem.instancias[0]);
    expect(relacaoA.referencia.instancia).not.toBe(relacaoB.referencia.instancia);
    expect(relacaoA.movel.instancia.poseMundo.deslocamento).toEqual([0, 0, 0]);
    expect(relacaoB.movel.instancia.poseMundo.deslocamento).toEqual([1, 0, 0]);
    expect(relacaoA.medidas).not.toBe(relacaoB.medidas);
  });

  it('resolve relação anular declarada na raiz contra peça dentro de montagem filha', async () => {
    const filha = montagem([instancia('roda', 'roda-dianteira')], 'filha');
    const raiz = v2([instancia('conjunto', 'filha', undefined, 'montagem')], [relacaoAnularReal(['conjunto', 'roda'], 'anularNaRaiz')], 'raiz');
    const resultado: any = await resolverMontagemPersistida(raiz, { carregarPeca: async () => roda, carregarMontagem: async () => filha });
    const peca = resultado.instancias[0].montagem.instancias[0];
    expect(resultado.relacoes[0].referencia.instancia).toBe(peca);
    expect(resultado.relacoes[0].movel.instancia).toBe(peca);
    expect(resultado.relacoes[0].satisfeita).toBe(true);
  });

  it('é determinístico, não muta autoria e não produz diagnóstico global ou prévia', async () => {
    const dado = v2([instancia('roda', 'roda-dianteira')], [relacaoAnularReal(['roda'])]);
    const antes = JSON.stringify(dado);
    const primeiro: any = await resolverMontagemPersistida(dado, { carregarPeca: async () => roda });
    const segundo: any = await resolverMontagemPersistida(dado, { carregarPeca: async () => roda });
    expect(primeiro).toEqual(segundo);
    expect(JSON.stringify(dado)).toBe(antes);
    expect(JSON.stringify(primeiro)).not.toMatch(/alertaGlobal|contatoLocal|previa/);
  });
});
