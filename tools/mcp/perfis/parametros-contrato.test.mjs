/* parametros-contrato.test.mjs — o schema de entrada, os códigos de saída, os padrões e a estrutura que as duas ferramentas MCP da varredura
   paramétrica devolvem, sem rodar a medida: as duas funções que medem (`parametrosReutilizavel` e `varrerReutilizavel`) são trocadas por duas
   que guardam o que receberam. A revisão das verificações (2026-11-13) mudou 14 linhas de `parametros.mjs` (os limites do schema, os padrões
   de `mostrar` e `delta`, os códigos de saída e a conversão de unidade) sem que nenhum teste reprovasse; `parametros.test.mjs` mede a medida
   inteira e só a lê pelo que ela devolve. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../modelar/parametros-peca.mjs', () => ({ parametrosReutilizavel: vi.fn() }));
vi.mock('../../modelar/varrer-peca.mjs', () => ({ varrerReutilizavel: vi.fn() }));

const { criarFerramentasParametros, diagnosticarParametrosEntrada, varrerParametrosEntrada } = await import('./parametros.mjs');
const { parametrosReutilizavel } = await import('../../modelar/parametros-peca.mjs');
const { varrerReutilizavel } = await import('../../modelar/varrer-peca.mjs');
const { ORCAMENTO_PADRAO } = await import('../../../src/autoria/varrer-parametros.js');

const ferramentas = criarFerramentasParametros();
const pegar = (nome) => ferramentas.find((f) => f.nome === nome);
const diagnosticar = pegar('diagnosticar_parametros');
const varrer = pegar('varrer_parametros');

const aceita = (schema, entrada) => schema.safeParse(entrada).success;

beforeEach(() => { vi.clearAllMocks(); });

describe('o schema de entrada de diagnosticar_parametros', () => {
  it('aceita textos de um caractere e a entrada vazia, e recusa texto vazio, tipo errado e campo a mais', () => {
    expect(aceita(diagnosticarParametrosEntrada, {})).toBe(true);
    expect(aceita(diagnosticarParametrosEntrada, { alvo: 'a', raiz: 'r', acervo: true, completo: false })).toBe(true);
    for (const ruim of [{ alvo: '' }, { raiz: '' }, { alvo: 3 }, { acervo: 'sim' }, { completo: 1 }, { extra: 1 }]) {
      expect(aceita(diagnosticarParametrosEntrada, ruim)).toBe(false);
    }
  });
});

describe('o schema de entrada de varrer_parametros', () => {
  it('o alvo é obrigatório e vale com um caractere', () => {
    expect(aceita(varrerParametrosEntrada, {})).toBe(false);
    expect(aceita(varrerParametrosEntrada, { alvo: '' })).toBe(false);
    expect(aceita(varrerParametrosEntrada, { alvo: 'a' })).toBe(true);
  });

  it('o critério e cada liberdade valem com um caractere, e vazios recusam', () => {
    expect(aceita(varrerParametrosEntrada, { alvo: 'a', criterio: 'c', livres: ['l'] })).toBe(true);
    expect(aceita(varrerParametrosEntrada, { alvo: 'a', criterio: '' })).toBe(false);
    expect(aceita(varrerParametrosEntrada, { alvo: 'a', livres: [''] })).toBe(false);
    expect(aceita(varrerParametrosEntrada, { alvo: 'a', livres: 'x' })).toBe(false);
  });

  it('delta fica estritamente entre 0 e 1', () => {
    for (const bom of [0.001, 0.1, 0.5, 0.999]) expect(aceita(varrerParametrosEntrada, { alvo: 'a', delta: bom })).toBe(true);
    for (const ruim of [0, 1, -0.1, 1.5, '0.1', NaN]) expect(aceita(varrerParametrosEntrada, { alvo: 'a', delta: ruim })).toBe(false);
  });

  it('orcamento e mostrar são inteiros de 1 para cima', () => {
    for (const campo of ['orcamento', 'mostrar']) {
      expect(aceita(varrerParametrosEntrada, { alvo: 'a', [campo]: 1 })).toBe(true);
      expect(aceita(varrerParametrosEntrada, { alvo: 'a', [campo]: 40 })).toBe(true);
      for (const ruim of [0, -1, 1.5, '2']) expect(aceita(varrerParametrosEntrada, { alvo: 'a', [campo]: ruim })).toBe(false);
    }
  });

  it('o objetivo é maximizar, minimizar ou alvo, o valorAlvo é número, e campo a mais recusa', () => {
    for (const bom of ['maximizar', 'minimizar', 'alvo']) expect(aceita(varrerParametrosEntrada, { alvo: 'a', objetivo: bom })).toBe(true);
    expect(aceita(varrerParametrosEntrada, { alvo: 'a', objetivo: 'otimizar' })).toBe(false);
    expect(aceita(varrerParametrosEntrada, { alvo: 'a', objetivo: 'alvo', valorAlvo: 0 })).toBe(true);
    expect(aceita(varrerParametrosEntrada, { alvo: 'a', valorAlvo: '0' })).toBe(false);
    expect(aceita(varrerParametrosEntrada, { alvo: 'a', extra: 1 })).toBe(false);
  });
});

describe('diagnosticar_parametros: padrões e códigos', () => {
  it('passa os padrões (sem alvo, sem acervo, sem completo, sem raiz) e devolve o código 0 na estrutura', async () => {
    parametrosReutilizavel.mockResolvedValue({ ok: true, codigo: 0, stdout: 'texto', resultado: { registro: { alvo: 'p', totais: { declarados: 3, vivos: 2, inertes: 1 }, parametros: [{ caminho: 'a', estado: 'vivo' }, { caminho: 'b', estado: 'inerte' }] } } });
    const executado = await diagnosticar.executar({});
    expect(parametrosReutilizavel).toHaveBeenCalledWith({ alvo: null, acervo: false, completo: false, raiz: null });
    expect(executado.ok).toBe(true);
    expect(diagnosticar.estruturar(executado)).toEqual({ ok: true, codigo: 0, resultado: { alvo: 'p', totais: { declarados: 3, vivos: 2, inertes: 1 }, vivos: ['a'], indiagnosticavel: null } });
    await diagnosticar.executar({ alvo: 'x', acervo: true, completo: true, raiz: 'r' });
    expect(parametrosReutilizavel).toHaveBeenLastCalledWith({ alvo: 'x', acervo: true, completo: true, raiz: 'r' });
  });

  it('o retrato do acervo sai por alvo, e a falha ganha a ação e o código que a medida deu', async () => {
    const retrato = { ok: true, codigo: 0, resultado: { totais: { declarados: 5, vivos: 3, inertes: 2 }, registros: [{ alvo: 'p', carregou: true, totais: { declarados: 5, vivos: 3, inertes: 2 } }] } };
    expect(diagnosticar.estruturar(retrato)).toEqual({ ok: true, codigo: 0, resultado: { totais: { declarados: 5, vivos: 3, inertes: 2 }, porAlvo: [{ alvo: 'p', carregou: true, declarados: 5, vivos: 3, inertes: 2 }] } });
    parametrosReutilizavel.mockResolvedValue({ ok: false, codigo: 3, erro: { codigo: 'sem_alvo', mensagem: 'não achei' } });
    const falha = await diagnosticar.executar({ alvo: 'x' });
    expect(falha).toMatchObject({ ok: false, codigo: 3, erro: { codigo: 'sem_alvo', mensagem: 'não achei', acao: 'Informe um alvo do acervo, ou acervo:true para o retrato inteiro.' } });
    expect(diagnosticar.estruturar(falha)).toBe(falha);
    parametrosReutilizavel.mockResolvedValue({ ok: false, codigo: 1 });
    expect((await diagnosticar.executar({})).erro).toEqual({ codigo: 'falha', mensagem: 'a ferramenta não concluiu.', acao: 'Informe um alvo do acervo, ou acervo:true para o retrato inteiro.' });
  });

  it('o texto da resposta é a saída padrão, depois a de erro, depois "sem saída."', () => {
    expect(diagnosticar.conteudo({ stdout: 'a', stderr: 'b' })).toEqual([{ type: 'text', text: 'a' }]);
    expect(diagnosticar.conteudo({ stdout: '', stderr: 'b' })).toEqual([{ type: 'text', text: 'b' }]);
    expect(diagnosticar.conteudo({ stdout: '', stderr: '' })).toEqual([{ type: 'text', text: 'sem saída.' }]);
  });
});

describe('varrer_parametros: padrões, códigos e unidade', () => {
  const medida = (extra = {}) => ({
    ok: true, codigo: 0, stdout: 't',
    resultado: {
      criterio: 'menor-folga', unidade: 'mm', escala: 1000, variantes: 4, base: { valor: 0.014 },
      efeitos: [{ caminho: 'a', move: true }, { caminho: 'b', move: false }],
      viaveis: Array.from({ length: 8 }, (_, k) => ({ valores: { a: k }, valor: k === 7 ? null : 0.001 * (k + 1), custo: { interpenetracoes: 0, pioradas: k } })),
      movidas: [{ nome: 'p1' }, { nome: 'p2' }],
      ...extra,
    },
  });

  it('o objetivo alvo sem valorAlvo sai com código 2 e o erro que diz o que fazer, sem medir', async () => {
    const r = await varrer.executar({ alvo: 'p', objetivo: 'alvo' });
    expect(r).toEqual({ ok: false, codigo: 2, stdout: '', stderr: '', erro: { codigo: 'objetivo_incompleto', mensagem: "objetivo 'alvo' precisa de valorAlvo.", acao: 'Informe valorAlvo, ou use objetivo maximizar/minimizar.' } });
    expect(varrerReutilizavel).not.toHaveBeenCalled();
    expect(varrer.estruturar(r)).toBe(r);
  });

  it('os padrões vão para a medida: critério menor-folga, delta 0,1, sem liberdades, sem objetivo, o orçamento padrão e 5 candidatos', async () => {
    varrerReutilizavel.mockResolvedValue(medida());
    const r = await varrer.executar({ alvo: 'p' });
    expect(varrerReutilizavel).toHaveBeenCalledWith({ alvo: 'p', criterio: 'menor-folga', delta: 0.1, liberdades: [], objetivo: null, orcamento: ORCAMENTO_PADRAO, mostrar: 5 });
    expect(r.mostrar).toBe(5);
    expect(varrer.estruturar(r).resultado.candidatos).toHaveLength(5);
  });

  it('o que o chamador pede vai como pediu, e o objetivo vira o modo da medida', async () => {
    varrerReutilizavel.mockResolvedValue(medida());
    await varrer.executar({ alvo: 'p', criterio: 'contatos', delta: 0.25, livres: ['a:0..1:3'], objetivo: 'minimizar', orcamento: 7, mostrar: 2 });
    expect(varrerReutilizavel).toHaveBeenLastCalledWith({ alvo: 'p', criterio: 'contatos', delta: 0.25, liberdades: ['a:0..1:3'], objetivo: { modo: 'minimizar' }, orcamento: 7, mostrar: 2 });
    await varrer.executar({ alvo: 'p', objetivo: 'alvo', valorAlvo: 0 });
    expect(varrerReutilizavel.mock.lastCall[0].objetivo).toEqual({ modo: 'alvo', alvo: 0 });
    await varrer.executar({ alvo: 'p', objetivo: 'maximizar' });
    expect(varrerReutilizavel.mock.lastCall[0].objetivo).toEqual({ modo: 'maximizar' });
  });

  it('a estrutura anuncia código 0, converte para a unidade anunciada e respeita mostrar', async () => {
    varrerReutilizavel.mockResolvedValue(medida());
    const dois = varrer.estruturar(await varrer.executar({ alvo: 'p', mostrar: 2 }));
    expect(dois.ok).toBe(true);
    expect(dois.codigo).toBe(0);
    expect(dois.resultado.base).toBeCloseTo(14, 9);
    expect(dois.resultado.candidatos).toEqual([
      { valores: { a: 0 }, valor: expect.closeTo(1, 9), custo: { interpenetracoes: 0, pioradas: 0 } },
      { valores: { a: 1 }, valor: expect.closeTo(2, 9), custo: { interpenetracoes: 0, pioradas: 1 } },
    ]);
    expect(dois.resultado.movem).toEqual(['a']);
    expect(dois.resultado.ondeOlhar).toEqual(['p1', 'p2']);
    expect(dois.resultado).toMatchObject({ criterio: 'menor-folga', unidade: 'mm', variantes: 4 });
  });

  it('a estrutura de um resultado que não passou por executar mostra 5 candidatos', () => {
    const r = varrer.estruturar(medida());
    expect(r.resultado.candidatos).toHaveLength(5);
  });

  it('o valor ausente fica null e não vira 0, na base e no candidato', async () => {
    varrerReutilizavel.mockResolvedValue(medida({ base: { valor: null }, viaveis: [{ valores: { a: 1 }, valor: null, custo: { interpenetracoes: 0, pioradas: 0 } }, { valores: { a: 2 }, valor: undefined, custo: { interpenetracoes: 0, pioradas: 0 } }] }));
    const r = varrer.estruturar(await varrer.executar({ alvo: 'p', mostrar: 9 }));
    expect(r.resultado.base).toBeNull();
    expect(r.resultado.candidatos.map((c) => c.valor)).toEqual([null, null]);
  });

  it('sem efeitos nem viáveis (o modo de sensibilidade e o de lote) os campos do outro modo ficam fora', async () => {
    varrerReutilizavel.mockResolvedValue(medida({ efeitos: undefined, viaveis: undefined }));
    const r = varrer.estruturar(await varrer.executar({ alvo: 'p' }));
    expect(r.resultado.movem).toBeUndefined();
    expect(r.resultado.candidatos).toBeUndefined();
  });

  it('a falha ganha a ação e o código da medida', async () => {
    varrerReutilizavel.mockResolvedValue({ ok: false, codigo: 4, erro: { codigo: 'x', mensagem: 'm' } });
    const f = await varrer.executar({ alvo: 'p' });
    expect(f).toMatchObject({ ok: false, codigo: 4, erro: { codigo: 'x', mensagem: 'm', acao: 'Confira alvo, critério e formato das liberdades (caminho:min..max:passos).' } });
    expect(varrer.estruturar(f)).toBe(f);
  });
});
