import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error — módulo neutro JavaScript, exercitado pelo contrato público.
import { ErroResolucaoMontagemPersistida, resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
// @ts-expect-error — leitor JavaScript, usado para verificar erros estruturais preservados.
import { ErroMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
// @ts-expect-error — matemática neutra JavaScript, usada para conferir a pose composta.
import { comporTransformacoesRigidas } from '../../src/autoria/transformacao-rigida.js';

const lerJson = (nome: string) => JSON.parse(readFileSync(new URL(`./fixtures/montagens-persistidas/${nome}.json`, import.meta.url), 'utf8'));
const lerPeca = (nome: string) => JSON.parse(readFileSync(new URL(`../../pecas-resolvidas/${nome}.json`, import.meta.url), 'utf8'));
const ids = (valor: any) => valor.instancias.map((instancia: any) => instancia.id);

const criarCarregadores = (pecas: Record<string, any>, montagens: Record<string, any>, chamadas: { peca: string[]; montagem: string[] }) => ({
  carregarPeca: async (ref: string) => { chamadas.peca.push(ref); return pecas[ref]; },
  carregarMontagem: async (ref: string) => { chamadas.montagem.push(ref); return montagens[ref]; },
});

async function esperarFalha(acao: Promise<unknown>, tipo: any, codigo: string, caminho: string) {
  try { await acao; throw new Error('não falhou'); } catch (erro) {
    expect(erro).toBeInstanceOf(tipo);
    expect(erro).toMatchObject({ codigo, caminho });
    return erro as any;
  }
}

describe('provas integradas da montagem persistida v1', () => {
  it('Prova A — duas instâncias persistidas da mesma peça real', async () => {
    const dado = lerJson('duas-instancias-freio');
    const peca = lerPeca('freio-disco');
    const dadoAntes = JSON.stringify(dado);
    const pecaAntes = JSON.stringify(peca);
    const chamadas = { peca: [], montagem: [] };
    const carregadores = criarCarregadores({ 'freio-disco': peca }, {}, chamadas);
    const a: any = await resolverMontagemPersistida(dado, carregadores);
    const b: any = await resolverMontagemPersistida(dado, carregadores);
    expect(ids(a)).toEqual(['freio-direito', 'freio-esquerdo']);
    expect(a.instancias[0].alvo.ref).toBe(a.instancias[1].alvo.ref);
    expect(a.instancias[0].definicao).toBe(a.instancias[1].definicao);
    expect(a.instancias[0].poseLocal).not.toBe(a.instancias[1].poseLocal);
    expect(a.instancias[0].poseMundo).not.toBe(a.instancias[1].poseMundo);
    expect(a).toEqual(b);
    expect(chamadas.peca).toEqual(['freio-disco', 'freio-disco']);
    expect(JSON.stringify(dado)).toBe(dadoAntes);
    expect(JSON.stringify(peca)).toBe(pecaAntes);
  });

  it('Prova B — duas peças persistidas preservam referências sem autoria geométrica', async () => {
    const dado = lerJson('duas-pecas');
    const chamadas = { peca: [], montagem: [] };
    const resultado: any = await resolverMontagemPersistida(dado, criarCarregadores({
      'freio-disco': lerPeca('freio-disco'), 'roda-dianteira': lerPeca('roda-dianteira'),
    }, {}, chamadas));
    expect(ids(resultado)).toEqual(['freio', 'roda']);
    expect(resultado.instancias.map((x: any) => x.alvo.ref)).toEqual(['freio-disco', 'roda-dianteira']);
    expect(resultado.instancias[0].definicao).not.toBe(resultado.instancias[1].definicao);
    expect(Object.keys(dado).sort()).toEqual(['formato', 'id', 'instancias', 'versao']);
    expect(dado.instancias.every((x: any) => Object.keys(x).every((chave) => ['id', 'alvo', 'pose'].includes(chave)))).toBe(true);
    expect(JSON.stringify(dado)).not.toContain('vertices');
    expect(JSON.stringify(dado)).not.toContain('faces');
  });

  it('Prova C — montagem filha persistida, caminho semântico e pose composta', async () => {
    const raiz = lerJson('raiz-com-subconjunto');
    const filha = lerJson('subconjunto-freio');
    const filhaAntes = JSON.stringify(filha);
    const rotacaoY = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];
    const rotacaoZ = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
    const esperado = comporTransformacoesRigidas(
      { escala: 1, rotacao: rotacaoY, deslocamento: [10, 0, 0] },
      { escala: 1, rotacao: rotacaoZ, deslocamento: [1, 2, 3] },
    );
    const fabricar = () => {
      const chamadas = { peca: [], montagem: [] };
      return { chamadas, carregadores: criarCarregadores({ 'freio-disco': lerPeca('freio-disco') }, { 'subconjunto-freio': filha }, chamadas) };
    };
    const primeiro = fabricar();
    const a: any = await resolverMontagemPersistida(raiz, primeiro.carregadores);
    const segundo = fabricar();
    const b: any = await resolverMontagemPersistida(raiz, segundo.carregadores);
    const peca = a.instancias[0].montagem.instancias[0];
    expect(a.id).toBe('raiz-com-subconjunto');
    expect(peca.caminho).toEqual(['conjunto', 'freio']);
    expect(peca.poseMundo).toEqual({ rotacao: esperado.rotacao, deslocamento: esperado.deslocamento });
    expect(peca.poseMundo).toEqual({ rotacao: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], deslocamento: [13, 2, -1] });
    expect(a).toEqual(b);
    expect(JSON.stringify(filha)).toBe(filhaAntes);
  });

  it('Prova D — recusas persistidas: estrutura, referência, pose e ciclo', async () => {
    const peca = lerPeca('freio-disco');
    const base = lerJson('duas-instancias-freio');
    const versao = { ...base, versao: 2 };
    const duplicada = { ...base, instancias: [base.instancias[0], { ...base.instancias[1], id: base.instancias[0].id }] };
    const ausente = { ...base, instancias: [{ ...base.instancias[0], alvo: { tipo: 'peca', ref: 'nao-existe' } }] };
    const malformada = { ...base, instancias: [{ ...base.instancias[0], pose: { deslocamento: [0, Infinity, 0] } }] };
    const montar = (dado: any) => resolverMontagemPersistida(dado, { carregarPeca: async (ref: string) => ref === 'freio-disco' ? peca : undefined, carregarMontagem: async (ref: string) => lerJson(ref) });
    await esperarFalha(montar(versao), ErroMontagemPersistida, 'versao-nao-suportada', 'versao');
    await esperarFalha(montar(duplicada), ErroMontagemPersistida, 'instancia-duplicada', 'instancias[1].id');
    await esperarFalha(montar(ausente), ErroResolucaoMontagemPersistida, 'referencia-ausente', 'instancias[0].alvo.ref');
    await esperarFalha(montar(malformada), ErroMontagemPersistida, 'pose-invalida', 'instancias[0].pose');
    const raizDoCiclo = {
      ...base,
      id: 'raiz-do-ciclo',
      instancias: [{ id: 'entra-ciclo', alvo: { tipo: 'montagem', ref: 'ciclo-a' } }],
    };
    const ciclo = await esperarFalha(montar(raizDoCiclo), ErroResolucaoMontagemPersistida, 'ciclo', 'instancias[0].alvo.ref');
    expect(ciclo.trilha).toEqual(['entra-ciclo', 'para-b', 'para-a']);
    expect(ciclo.message).toContain('ciclo-a -> ciclo-b -> ciclo-a');
  });
});
