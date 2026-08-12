import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error — leitor JavaScript, usado para verificar recusas estruturais.
import { ErroMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
// @ts-expect-error — resolvedor JavaScript, exercitado pelo contrato público.
import { ErroResolucaoMontagemPersistida, resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';

const json = (nome: string) => JSON.parse(readFileSync(new URL(`./fixtures/montagens-persistidas/${nome}.json`, import.meta.url), 'utf8'));
const peca = (nome: string) => JSON.parse(readFileSync(new URL(`../../pecas-resolvidas/${nome}.json`, import.meta.url), 'utf8'));
const carregar = (montagens: Record<string, any> = {}) => ({
  carregarPeca: async (ref: string) => ({ 'freio-disco': peca('freio-disco'), 'roda-dianteira': peca('roda-dianteira') }[ref]),
  carregarMontagem: async (ref: string) => montagens[ref],
});
const falha = async (acao: Promise<unknown>, tipo: any, codigo: string) => {
  try { await acao; throw new Error('não falhou'); } catch (erro) {
    expect(erro).toBeInstanceOf(tipo);
    expect(erro).toMatchObject({ codigo });
    return erro as any;
  }
};

describe('provas A-F da montagem persistida v2', () => {
  it('A — mantém fixture v1 compatível e sem relações inventadas', async () => {
    const resultado: any = await resolverMontagemPersistida(json('subconjunto-freio'), carregar());
    expect(resultado.relacoes).toBeUndefined();
    expect(resultado.instancias[0].caminho).toEqual(['freio']);
  });

  it('B/C/D — resolve relações reais, endpoints recursivos e estados mecânicos', async () => {
    const dado = json('v2-relacoes-reais');
    const resultado: any = await resolverMontagemPersistida(dado, carregar({ 'subconjunto-freio': json('subconjunto-freio') }));
    const cilindrica = resultado.relacoes.find((r: any) => r.tipo === 'encaixaCilindrico');
    const anular = resultado.relacoes.find((r: any) => r.tipo === 'assentaAnular');
    expect(cilindrica.satisfeita).toBe(true);
    expect(anular.satisfeita).toBe(true);
    expect(cilindrica.referencia.instancia).toBe(resultado.instancias[0].montagem.instancias[0]);
    expect(cilindrica.referencia.caminho).toEqual(['conjunto-freio', 'freio']);
    expect(anular.medidas).toMatchObject({ disponiveis: true, sobreposicaoRadial: expect.any(Number), sobreposicaoAxial: expect.any(Number) });
    expect(JSON.stringify(resultado)).not.toMatch(/referencia\.|movel\./);
  });

  it('E — recusa estrutura inválida fail-closed com código e caminho', async () => {
    const base = json('v2-relacoes-reais');
    const real = carregar({ 'subconjunto-freio': json('subconjunto-freio') });
    await falha(resolverMontagemPersistida({ ...base, versao: 99 }, carregar()), ErroMontagemPersistida, 'versao-nao-suportada');
    await falha(resolverMontagemPersistida({ ...base, relacoes: [base.relacoes[0], base.relacoes[0]] }, carregar()), ErroMontagemPersistida, 'relacao-duplicada');
    await falha(resolverMontagemPersistida({ ...base, relacoes: [{ ...base.relacoes[0], tipo: 'desconhecida' }] }, carregar()), ErroMontagemPersistida, 'tipo-relacao-nao-suportado');
    await falha(resolverMontagemPersistida({ ...base, relacoes: [{ ...base.relacoes[0], referencia: { ...base.relacoes[0].referencia, caminho: ['ausente'] } }] }, real), ErroResolucaoMontagemPersistida, 'endpoint-caminho-inexistente');
    await falha(resolverMontagemPersistida({ ...base, relacoes: [{ ...base.relacoes[0], referencia: { caminho: ['conjunto-freio'], porta: 'pilotoDaRoda' } }] }, carregar({ 'subconjunto-freio': json('subconjunto-freio') })), ErroResolucaoMontagemPersistida, 'endpoint-nao-e-peca');
    await falha(resolverMontagemPersistida({ ...base, relacoes: [{ ...base.relacoes[0], referencia: { ...base.relacoes[0].referencia, porta: 'ausente' } }] }, real), ErroResolucaoMontagemPersistida, 'porta-ausente');
    const especificacao = structuredClone(base);
    especificacao.relacoes[0].especificacao.folgaRadial.nominal = -1;
    await falha(resolverMontagemPersistida(especificacao, carregar()), ErroMontagemPersistida, 'especificacao-invalida');
    const naoFinita = structuredClone(base);
    naoFinita.relacoes[0].especificacao.toleranciaNumerica = Infinity;
    await falha(resolverMontagemPersistida(naoFinita, carregar()), ErroMontagemPersistida, 'especificacao-invalida');
  });

  it('F — mantém determinismo, não mutação e isolamento entre relações', async () => {
    const dado = json('v2-relacoes-isolamento');
    const antes = JSON.stringify(dado);
    const a: any = await resolverMontagemPersistida(dado, carregar());
    const b: any = await resolverMontagemPersistida(dado, carregar());
    expect(a).toEqual(b);
    expect(a.relacoes.map((r: any) => r.satisfeita)).toEqual([false, true]);
    expect(a.relacoes[0].diagnosticos.length).toBeGreaterThan(0);
    expect(JSON.stringify(dado)).toBe(antes);
    expect(JSON.stringify(a)).not.toMatch(/alertaGlobal|contatoLocal|previa/);
    expect(a.relacoes[0].medidas).not.toBe(a.relacoes[1].medidas);
  });
});
