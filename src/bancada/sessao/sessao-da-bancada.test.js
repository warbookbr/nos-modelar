/* sessao-da-bancada.test.js — a peça escolhida à mão não é trocada pela sessão: a entrega espera como oferta e só carrega quando aceita; sem peça, a bancada espera a sessão. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarRegistroDeEventos } from './registro-de-eventos.js';
import { executarReceita } from '../../autoria/executar-receita.js';
import { PAYLOAD_DE_DEMONSTRACAO, criarSessaoDaBancada } from './sessao-da-bancada.js';

function montar(extras = {}) {
  const estado = criarEstadoCentral(estadoInicialDaBancada({ visao: 'solida' }));
  let ganchos = null;
  const sincronizador = { definirPayload: vi.fn(), iniciarPolling: vi.fn() };
  const cena = {
    modelo: null, controlador: null,
    aplicarModelo: vi.fn((modelo) => { cena.modelo = modelo; }),
    esquecerColocacao: vi.fn(), salvarEstadoNaUrl: vi.fn(),
  };
  const imagemNaCena = {
    trocarDePeca: vi.fn(), restaurarDaPeca: vi.fn(async () => {}), oferecerSobreposicaoDaPeca: vi.fn(async () => {}),
    painel: { renderizar: vi.fn() }, gerenciador: { sincronizarComSessao: vi.fn() },
  };
  const mostrarErro = vi.fn();
  const sessao = criarSessaoDaBancada({
    estado,
    cena,
    edicao: { esquecerHistorico: vi.fn() },
    imagemNaCena,
    anotacoes3D: { sincronizarAnotacoes: vi.fn() },
    registroDeEventos: criarRegistroDeEventos(),
    avisar: vi.fn(),
    mostrarErro,
    arquivoDaSessao: null,
    criarSincronizador: (opcoes) => { ganchos = opcoes; return sincronizador; },
    ...extras,
  });
  return { mostrarErro, estado, sessao, sincronizador, cena, imagemNaCena, ganchos: () => ganchos };
}

const MODELO = { nome: 'peca-da-sessao', rotulo: 'peça-da-sessão' };

describe('sessão da bancada', () => {
  it('a entrega da sessão chega à cena enquanto ninguém escolheu peça', async () => {
    const { ganchos, cena, estado } = montar();
    await ganchos().aoAtualizar({ anotacoes: [] }, MODELO, { fonte: 'arquivo' });
    expect(cena.aplicarModelo).toHaveBeenCalledWith(MODELO, { preservarCamera: false });
    expect(estado.obter('anotacoes')).toEqual({ lista: [] });
  });

  it('depois de abrir do acervo, a entrega do arquivo espera como oferta e carrega quando aceita', async () => {
    const { ganchos, sessao, cena, estado, sincronizador } = montar();
    await sessao.abrirDoAcervo({ id: 'furgao', carregar: async () => ({ PASSOS: [] }) });
    expect(estado.obter('idNaUrl')).toBe('furgao');
    expect(sincronizador.definirPayload).toHaveBeenCalledWith({ alvo: { nome: 'furgao' }, receita: { PASSOS: [] } });

    await ganchos().aoAtualizar({ anotacoes: [] }, MODELO, { fonte: 'arquivo' });
    expect(cena.aplicarModelo).not.toHaveBeenCalled();
    expect(estado.obter('ofertaDaSessao')).toEqual({ emEspera: true, nome: 'Peça da sessão' });

    await sessao.aceitarEntrega();
    expect(cena.aplicarModelo).toHaveBeenCalledWith(MODELO, { preservarCamera: false });
    expect(estado.obter('ofertaDaSessao')).toEqual({ emEspera: false, nome: '' });
  });

  it('o status da sessão vai para o estado uma vez por mudança', () => {
    const { ganchos, estado } = montar();
    const avisos = vi.fn();
    estado.assinar(['sessao'], avisos);
    ganchos().aoMudarStatus('conectado');
    ganchos().aoMudarStatus('conectado');
    expect(estado.obter('sessao')).toBe('conectado');
    expect(avisos).toHaveBeenCalledTimes(1);
  });

  it('sem peça pedida a bancada espera a sessão; a demonstração carrega o pacote fixo', async () => {
    const { sessao, estado, sincronizador } = montar();
    await sessao.abrirInicial({ pecaPedida: null, catalogo: [], acervo: [] });
    expect(estado.ler()).toMatchObject({ aguardandoModelo: true, catalogoVazio: true });
    expect(sincronizador.iniciarPolling).toHaveBeenCalledTimes(1);
    sessao.carregarDemonstracao();
    expect(sincronizador.definirPayload).toHaveBeenCalledWith(PAYLOAD_DE_DEMONSTRACAO);
  });

  it('peça pedida que não existe diz o nome recebido e onde procurou, em vez de abrir vazia', async () => {
    const { sessao, mostrarErro } = montar();
    await sessao.abrirInicial({ pecaPedida: 'empilhadera', catalogo: [], acervo: [{ id: 'empilhadeira' }, { id: 'trator' }] });
    const texto = mostrarErro.mock.calls[0][0];
    expect(texto).toContain("'empilhadera'");
    expect(texto).toContain('acervo de receitas');
    expect(texto).toContain('2 entradas');
    expect(texto).toContain('catálogo homologado: 0 entradas');
    expect(texto).toContain('empilhadeira');
  });

  it('a peça do acervo abre pelo cache da execução e a tela diz de onde veio e quanto custou', async () => {
    const RECEITA = { PASSOS: [['cilindro', { origemId: 10, raio: 1, altura: 1, lados: 16 }], ['parte', { nome: 'corpo', sel: { origem: { op: 'cilindro', id: 10 } } }]] };
    const executarDoAcervo = vi.fn(async () => ({ neutro: executarReceita(RECEITA).neutro, origem: 'cache', ms: 42 }));
    const { sessao, estado } = montar({ executarDoAcervo });
    await sessao.abrirDoAcervo({ id: 'p', caminho: '../../procedural/pecas/p.js', carregar: async () => RECEITA });
    expect(executarDoAcervo).toHaveBeenCalledTimes(1);
    expect(estado.obter('execucao')).toMatchObject({ id: 'p', origem: 'cache', texto: 'do cache, 42 ms' });
  });
});
