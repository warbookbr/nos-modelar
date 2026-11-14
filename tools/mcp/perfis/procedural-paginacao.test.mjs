/* procedural-paginacao.test.mjs — os códigos de saída, a projeção em resumo ou completo, o controle de paginação e o limite padrão das
   ferramentas MCP procedurais, com um serviço de descoberta de mentira que devolve o que o teste quer projetar. A revisão das verificações
   (2026-11-13) mudou 16 linhas de `procedural.mjs` sem que nenhum teste reprovasse: os testes de `procedural.test.mjs` conferem a lista de
   ferramentas e o formato da resposta pelo servidor, e não o que o controle de paginação diz. */
import { describe, expect, it, vi } from 'vitest';
import { criarFerramentasProcedurais } from './procedural.mjs';

const operacao = (n, extra = {}) => ({
  id: `op.${n}`, nome: `op${n}`, versao: '1', categoria: 'c', artefatos: { entra: [], sai: [] }, interfaces: [], requisitos: [], custo: 1, efeitos: [], identidade: 'i',
  descricaoLonga: 'só no completo', ...extra,
});
const servicoDe = (resposta = {}) => ({
  buscar: vi.fn(() => resposta.buscar),
  descrever: vi.fn(() => resposta.descrever),
  combinar: vi.fn(() => resposta.combinar),
  validarComposicao: vi.fn(() => resposta.validar),
  analisarLacuna: vi.fn(() => resposta.lacuna),
  diagnosticarExtensao: vi.fn(() => resposta.extensao),
});
const pegar = (servico, nome) => criarFerramentasProcedurais(servico).find((f) => f.nome === nome);
const plano = (cadeias, descartes) => ({ cadeias: Array.from({ length: cadeias }, (_, k) => ({ k })), descartes: Array.from({ length: descartes }, (_, k) => ({ d: k })) });
const ARTEFATOS = { entra: [], sai: ['mecanifica.malha-poligonal@1'] };

describe('os códigos de saída', () => {
  it('a chamada que passa sai com ok e código 0, e leva o resultado do serviço', () => {
    const r = pegar(servicoDe({ descrever: { encontrada: false } }), 'descrever_capacidade').executar({ identificador: 'x' });
    expect(r).toEqual({ ok: true, codigo: 0, resultado: { encontrada: false } });
  });

  it('a entrada fora do schema sai com código 1 e o erro entrada_recusada, sem chamar o serviço', () => {
    const servico = servicoDe();
    const r = pegar(servico, 'descrever_capacidade').executar({ identificador: '' });
    expect(r).toEqual({ ok: false, codigo: 1, erro: { codigo: 'entrada_recusada', mensagem: 'A entrada não atende ao schema da ferramenta.', acao: 'Corrija os campos conforme o schema anunciado em tools/list.' } });
    expect(servico.descrever).not.toHaveBeenCalled();
    expect(pegar(servico, 'descrever_capacidade').executar({ identificador: 'x', extra: 1 }).codigo).toBe(1);
  });

  it('o serviço que lança sai com código 1, o código, a mensagem e a ação do erro, e avisa na saída de erro', () => {
    const servico = servicoDe();
    const escreve = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      servico.descrever.mockImplementation(() => { throw Object.assign(new Error('não deu'), { codigo: 'meu_codigo', acao: 'faça isto' }); });
      expect(pegar(servico, 'descrever_capacidade').executar({ identificador: 'x' })).toEqual({ ok: false, codigo: 1, erro: { codigo: 'meu_codigo', mensagem: 'não deu', acao: 'faça isto' } });
      servico.descrever.mockImplementation(() => { throw new TypeError('quebrou'); });
      const r = pegar(servico, 'descrever_capacidade').executar({ identificador: 'x' });
      expect(r).toMatchObject({ ok: false, codigo: 1, erro: { codigo: 'operacao_recusada', mensagem: 'quebrou' } });
      expect(r.erro.acao).toMatch(/^Revise o campo indicado/);
      expect(escreve).toHaveBeenCalledWith('modelar-mcp: descrever_capacidade: falha controlada (TypeError).\n');
    } finally { escreve.mockRestore(); }
  });
});

describe('buscar_capacidades: projeção e controle', () => {
  const busca = (extra = {}) => ({ operacoes: [operacao(1, { uso: { formato: 'u' } }), operacao(2)], total: 2, retornadas: 2, ...extra });

  it('o resumo tira o que só o completo traz, e o uso só entra quando existe', () => {
    const r = pegar(servicoDe({ buscar: busca() }), 'buscar_capacidades').executar({ texto: 'x' }).resultado;
    expect(r.operacoes[0]).not.toHaveProperty('descricaoLonga');
    expect(r.operacoes[0]).toHaveProperty('uso', { formato: 'u' });
    expect(r.operacoes[1]).not.toHaveProperty('uso');
    expect(Object.keys(r.operacoes[0]).sort()).toEqual(['artefatos', 'categoria', 'custo', 'efeitos', 'id', 'identidade', 'interfaces', 'nome', 'requisitos', 'uso', 'versao']);
    expect(r.controle).toEqual({ limite: 8, retornadas: 2, total: 2, truncado: false, detalhe: 'resumo' });
  });

  it('o completo devolve a operação inteira', () => {
    const r = pegar(servicoDe({ buscar: busca() }), 'buscar_capacidades').executar({ texto: 'x', detalhe: 'completo', limite: 64 }).resultado;
    expect(r.operacoes[0]).toHaveProperty('descricaoLonga', 'só no completo');
    expect(r.controle).toMatchObject({ detalhe: 'completo', limite: 64 });
  });

  it('truncado é total maior que o retornado, e igual não trunca; o que o serviço disse sobre truncado vale mais', () => {
    const t = (extra) => pegar(servicoDe({ buscar: busca(extra) }), 'buscar_capacidades').executar({ texto: 'x' }).resultado.controle;
    expect(t({ total: 5, retornadas: 2 }).truncado).toBe(true);
    expect(t({ total: 2, retornadas: 2 }).truncado).toBe(false);
    expect(t({ total: 5, retornadas: 2, truncado: false }).truncado).toBe(false);
    expect(t({ total: 2, retornadas: 2, truncado: true }).truncado).toBe(true);
    const sem = pegar(servicoDe({ buscar: { operacoes: [operacao(1)] } }), 'buscar_capacidades').executar({ texto: 'x' }).resultado.controle;
    expect(sem).toMatchObject({ total: 1, retornadas: 1, truncado: false });
  });

  it('a consulta vai ao serviço com o limite, e o cursor só vai quando veio', () => {
    const servico = servicoDe({ buscar: busca() });
    const f = pegar(servico, 'buscar_capacidades');
    f.executar({ texto: 'x' });
    expect(servico.buscar).toHaveBeenLastCalledWith({ texto: 'x', limite: 8 });
    expect(Object.hasOwn(servico.buscar.mock.lastCall[0], 'cursor')).toBe(false);
    f.executar({ produz: 'p', limite: 3, cursor: 'c1' });
    expect(servico.buscar).toHaveBeenLastCalledWith({ produz: 'p', limite: 3, cursor: 'c1' });
  });
});

describe('combinar_capacidades: o plano limitado', () => {
  const combinar = (cadeias, descartes, entrada = {}) => {
    const servico = servicoDe({ combinar: plano(cadeias, descartes) });
    const r = pegar(servico, 'combinar_capacidades').executar({ artefatos: ARTEFATOS, ...entrada }).resultado;
    return { r, servico };
  };

  it('no resumo, as cadeias vêm primeiro e os descartes ocupam o que sobra do limite, com a conta dos omitidos', () => {
    const { r } = combinar(3, 5, { limite: 4 });
    expect(r.cadeias).toHaveLength(3);
    expect(r.descartes).toEqual([{ d: 0 }]);
    expect(r.controle).toEqual({ limite: 4, retornadas: 4, total: 8, truncado: true, detalhe: 'resumo' });
    expect(r.descartesOmitidos).toBe(4);
  });

  it('com as cadeias enchendo o limite, nenhum descarte vem e todos contam como omitidos', () => {
    const { r } = combinar(10, 2, { limite: 4 });
    expect(r.cadeias).toHaveLength(4);
    expect(r.descartes).toEqual([]);
    expect(r.descartesOmitidos).toBe(2);
    expect(r.controle).toMatchObject({ retornadas: 4, total: 12, truncado: true });
  });

  it('sem descarte sobrando não há descartesOmitidos, e o limite padrão é 8', () => {
    const { r } = combinar(2, 3, { limite: 10 });
    expect(r.descartes).toHaveLength(3);
    expect(r).not.toHaveProperty('descartesOmitidos');
    expect(r.controle).toMatchObject({ truncado: false, retornadas: 5, total: 5 });
    const padrao = combinar(2, 20).r;
    expect(padrao.descartes).toHaveLength(6);
    expect(padrao.controle).toMatchObject({ limite: 8, retornadas: 8, total: 22 });
    expect(padrao.descartesOmitidos).toBe(14);
  });

  it('no completo, todos os descartes vêm, sem contagem de omitidos', () => {
    const { r } = combinar(3, 5, { limite: 4, detalhe: 'completo' });
    expect(r.cadeias).toHaveLength(3);
    expect(r.descartes).toHaveLength(5);
    expect(r).not.toHaveProperty('descartesOmitidos');
    expect(r.controle).toEqual({ limite: 4, retornadas: 8, total: 8, truncado: false, detalhe: 'completo' });
  });

  it('o plano sem cadeias nem descartes sai vazio, e a consulta vai ao serviço sem limite nem detalhe', () => {
    const servico = servicoDe({ combinar: {} });
    const r = pegar(servico, 'combinar_capacidades').executar({ artefatos: ARTEFATOS, maxCadeias: 2 }).resultado;
    expect(r).toMatchObject({ cadeias: [], descartes: [], controle: { total: 0, retornadas: 0, truncado: false } });
    expect(servico.combinar).toHaveBeenCalledWith({ artefatos: ARTEFATOS, maxCadeias: 2 });
  });
});

describe('analisar_lacuna: o plano da classificação segue o mesmo limite', () => {
  const lacuna = { id: 'l', objetivo: 'o', artefatos: ARTEFATOS };

  it('o resultado sem plano passa como veio, e o serviço recebe a lacuna sem limite nem detalhe', () => {
    const servico = servicoDe({ lacuna: { classificacao: { classificacao: 'operacao-nativa' } } });
    const r = pegar(servico, 'analisar_lacuna').executar({ ...lacuna, limite: 3, detalhe: 'completo' }).resultado;
    expect(r).toEqual({ classificacao: { classificacao: 'operacao-nativa' } });
    expect(servico.analisarLacuna).toHaveBeenCalledWith(lacuna);
  });

  it('o plano da classificação é projetado com o limite pedido, e com o limite padrão de 8 quando não vem', () => {
    const servico = servicoDe({ lacuna: { classificacao: { classificacao: 'composicao', plano: plano(3, 12) }, outro: 1 } });
    const f = pegar(servico, 'analisar_lacuna');
    const pedido = f.executar({ ...lacuna, limite: 5 }).resultado;
    expect(pedido.outro).toBe(1);
    expect(pedido.classificacao.plano.controle).toEqual({ limite: 5, retornadas: 5, total: 15, truncado: true, detalhe: 'resumo' });
    expect(pedido.classificacao.plano.descartesOmitidos).toBe(10);
    const padrao = f.executar(lacuna).resultado.classificacao.plano;
    expect(padrao.controle).toEqual({ limite: 8, retornadas: 8, total: 15, truncado: true, detalhe: 'resumo' });
    expect(padrao.descartesOmitidos).toBe(7);
    const completo = f.executar({ ...lacuna, detalhe: 'completo' }).resultado.classificacao.plano;
    expect(completo.descartes).toHaveLength(12);
    expect(completo).not.toHaveProperty('descartesOmitidos');
  });
});

describe('diagnosticar_extensao e validar_composicao', () => {
  it('a extensão ausente ganha o código, a ação e o próximo passo, e a presente passa como veio', () => {
    const ausente = pegar(servicoDe({ extensao: { estado: 'ausente', capacidade: 'x' } }), 'diagnosticar_extensao').executar({ capacidade: 'x' }).resultado;
    expect(ausente).toMatchObject({ estado: 'ausente', codigo: 'extensao_ausente', executavel: false, proximoPasso: { ferramenta: 'analisar_lacuna' } });
    expect(ausente.acao).toMatch(/^Não instale nem promova código/);
    const presente = pegar(servicoDe({ extensao: { estado: 'registrada', capacidade: 'x' } }), 'diagnosticar_extensao').executar({ capacidade: 'x' }).resultado;
    expect(presente).toEqual({ estado: 'registrada', capacidade: 'x' });
  });

  it('a composição validada passa como veio', () => {
    const composicao = { formato: 'f', id: 'mecanifica.composicao.x', versao: '1', nos: [] };
    const servico = servicoDe({ validar: { valida: true, passos: [] } });
    const entrada = { composicoes: [composicao], id: composicao.id };
    expect(pegar(servico, 'validar_composicao').executar(entrada).resultado).toEqual({ valida: true, passos: [] });
    expect(servico.validarComposicao).toHaveBeenCalledWith(entrada);
  });
});
