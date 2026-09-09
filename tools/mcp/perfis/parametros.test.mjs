/* As duas ferramentas da varredura vistas pela porta MCP.
 *
 * Um agente que fala com o Mecanifica por MCP não roda `npm run`. Se a porta
 * não anunciar estas duas, ele continua alterando número no escuro — que é o
 * desperdício que elas cortam. Este arquivo prova que ela anuncia, que elas
 * respondem, e que não escrevem nada. */
import { describe, expect, it } from 'vitest';
import { criarFerramentasParametros } from './parametros.mjs';

const ferramentas = criarFerramentasParametros();
const pegar = (nome) => ferramentas.find((f) => f.nome === nome);

async function chamar(nome, entrada) {
  const f = pegar(nome);
  const executado = await f.executar(entrada);
  return { executado, estruturado: f.estruturar(executado), conteudo: f.conteudo(executado) };
}

describe('porta MCP da varredura', () => {
  it('anuncia as duas como somente leitura', () => {
    expect(ferramentas.map((f) => f.nome)).toEqual(['diagnosticar_parametros', 'varrer_parametros']);
    for (const f of ferramentas) {
      expect(f.anotacoes).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      expect(f.inputSchema).toBeDefined();
      expect(f.outputSchema).toBeDefined();
    }
    /* A descrição precisa dizer que o custo existe: um agente que leia só
       "encontra o melhor valor" vai acreditar no melhor número. */
    expect(pegar('varrer_parametros').descricao).toMatch(/QUEBRA|pioraram|custo/);
    expect(pegar('diagnosticar_parametros').descricao).toMatch(/ANTES de alterar/);
  });

  it('diagnostica um alvo e o acervo, com a mesma resposta da CLI', async () => {
    const um = await chamar('diagnosticar_parametros', { alvo: 'cadeira-de-madeira' });
    expect(um.estruturado.ok).toBe(true);
    expect(um.estruturado.resultado.totais).toEqual({ declarados: 21, vivos: 13, inertes: 8 });
    expect(um.estruturado.resultado.vivos).toContain('perna.secaoTopo');
    expect(um.conteudo[0].text).toContain('PARÂMETROS DE cadeira-de-madeira');

    const todos = await chamar('diagnosticar_parametros', { acervo: true });
    expect(todos.estruturado.resultado.totais).toEqual({ declarados: 267, vivos: 122, inertes: 145 });
  }, 90_000);

  it('varre sensibilidade e devolve onde olhar', async () => {
    const r = await chamar('varrer_parametros', { alvo: 'cadeira-de-madeira', criterio: 'menor-folga' });
    expect(r.estruturado.ok).toBe(true);
    expect(r.estruturado.resultado.movem).toEqual(['perna.secaoTopo']);
    expect(r.estruturado.resultado.variantes).toBe(42);
    expect(r.estruturado.resultado.ondeOlhar.length).toBeGreaterThan(0);
    expect(r.conteudo[0].text).toContain('nada foi aplicado');
  }, 90_000);

  it('no lote, entrega o custo junto do número — não só o número', async () => {
    const r = await chamar('varrer_parametros', {
      alvo: 'cadeira-de-madeira',
      criterio: 'folga:saiaLateral,saiaTraseira',
      livres: ['perna.secaoTopo:0.04..0.08:11', 'saia.esp:0.02..0.05:11'],
      objetivo: 'minimizar',
    });
    const primeiro = r.estruturado.resultado.candidatos[0];
    expect(primeiro.valor).toBeCloseTo(0, 1);
    expect(primeiro.custo.pioradas).toBeGreaterThan(5);
  }, 120_000);

  it('recusa entrada ambígua com ação, em vez de escolher sozinha', async () => {
    const semAlvo = await chamar('diagnosticar_parametros', {});
    expect(semAlvo.estruturado.ok).toBe(false);
    expect(semAlvo.estruturado.erro.acao).toContain('acervo:true');

    const semValor = await chamar('varrer_parametros', {
      alvo: 'cadeira-de-madeira',
      livres: ['perna.secaoTopo:0.04..0.05:3'],
      objetivo: 'alvo',
    });
    expect(semValor.estruturado.ok).toBe(false);
    expect(semValor.estruturado.erro.codigo).toBe('objetivo_incompleto');
  }, 60_000);

  it('rejeita campo desconhecido no schema em vez de ignorar em silêncio', () => {
    const schema = pegar('varrer_parametros').inputSchema;
    expect(schema.safeParse({ alvo: 'x', criterioo: 'menor-folga' }).success).toBe(false);
    expect(schema.safeParse({ alvo: 'x', delta: 1.5 }).success).toBe(false);
    expect(schema.safeParse({ alvo: 'x', livres: ['a:0..1:3'], objetivo: 'maximizar' }).success).toBe(true);
  });
});

describe('a estrutura não pode mentir onde o texto acerta', () => {
  it('devolve os números NA UNIDADE anunciada, não em metros crus', async () => {
    /* Achado ao chamar a porta como agente: `unidade: "mm"` ao lado de
       0.014142135623730944 metros. Quem lê o texto acerta; quem lê a estrutura
       erra por mil, e erra com confiança porque o campo promete milímetro. */
    const r = await chamar('varrer_parametros', {
      alvo: 'cadeira-de-madeira',
      criterio: 'folga:saiaLateral,saiaTraseira',
    });
    expect(r.estruturado.resultado.unidade).toBe('mm');
    expect(r.estruturado.resultado.base).toBeCloseTo(14.14, 1);
    expect(r.conteudo[0].text).toContain('14.14 mm');
  }, 90_000);

  it('critério que conta pares não é convertido', async () => {
    const r = await chamar('varrer_parametros', {
      alvo: 'cadeira-de-madeira',
      criterio: 'interpenetracoes',
    });
    expect(r.estruturado.resultado.unidade).toBe('par(es)');
    expect(r.estruturado.resultado.base).toBe(4);
  }, 90_000);

  it('honra `mostrar` na estrutura, não só no texto', async () => {
    const r = await chamar('varrer_parametros', {
      alvo: 'cadeira-de-madeira',
      criterio: 'menor-folga',
      livres: ['perna.secaoTopo:0.036..0.05:8'],
      objetivo: 'maximizar',
      mostrar: 3,
    });
    expect(r.estruturado.resultado.candidatos).toHaveLength(3);
  }, 90_000);
});
