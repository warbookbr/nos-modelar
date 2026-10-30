/* sessao-da-bancada.test.js — a peça escolhida à mão não é trocada pela sessão: a entrega espera como oferta e só carrega quando aceita; sem peça, a bancada espera a sessão. */
import { describe, expect, it, vi } from 'vitest';
import { criarEstadoCentral, estadoInicialDaBancada } from '../estado/estado-central.js';
import { criarRegistroDeEventos } from './registro-de-eventos.js';
import { PAYLOAD_DE_DEMONSTRACAO, criarSessaoDaBancada } from './sessao-da-bancada.js';

function montar() {
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
  const sessao = criarSessaoDaBancada({
    estado,
    cena,
    edicao: { esquecerHistorico: vi.fn() },
    imagemNaCena,
    anotacoes3D: { sincronizarAnotacoes: vi.fn() },
    registroDeEventos: criarRegistroDeEventos(),
    avisar: vi.fn(),
    mostrarErro: vi.fn(),
    arquivoDaSessao: null,
    criarSincronizador: (opcoes) => { ganchos = opcoes; return sincronizador; },
  });
  return { estado, sessao, sincronizador, cena, imagemNaCena, ganchos: () => ganchos };
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
});
