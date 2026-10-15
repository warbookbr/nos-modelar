/* sessao.test.js — testes do motor de sessão ativa e sincronização em tempo real. */
import { describe, expect, it } from 'vitest';
import {
  criarEstadoSessaoInicial,
  normalizarChecklist,
  normalizarCriterios,
  validarPacoteSessao,
} from './estado-sessao.js';
import { processarReceitaSessao, processarPayloadSessao } from './carregar-sessao.js';
import { ARQUIVO_DA_SESSAO_ATIVA, arquivoDaSessaoNaUrl, criarSincronizadorSessao } from './sincronizador.js';

describe('Sessão Ativa (Humano + IA)', () => {
  const receitaTeste = {
    meta: { nome: 'Cubo de Ensaio' },
    PASSOS: [
      ['cubo', { origemId: 1, larg: 2, alt: 2, prof: 2 }],
      ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
    ],
  };

  it('cria o estado inicial desconectado', () => {
    const estado = criarEstadoSessaoInicial();
    expect(estado.status).toBe('desconectado');
    expect(estado.alvo.id).toBe('sessao-ativa');
    expect(Array.isArray(estado.referencias.pranchas)).toBe(true);
    expect(Array.isArray(estado.anotacoes)).toBe(true);
  });

  it('valida pacotes de sessão corretamente', () => {
    expect(() => validarPacoteSessao(null)).toThrow(TypeError);
    expect(() => validarPacoteSessao({})).toThrow(/ao menos uma receita/);
    expect(validarPacoteSessao({ receita: receitaTeste })).toEqual({ receita: receitaTeste });
  });

  it('normaliza checklist e critérios legados de texto antes de exibi-los', () => {
    expect(normalizarChecklist(['medir altura'])).toEqual([
      { descricao: 'medir altura', concluido: false },
    ]);
    expect(normalizarCriterios(['Sem faces órfãs'])).toEqual([
      { texto: 'Sem faces órfãs', status: 'pendente' },
    ]);
  });

  it('processa receita procedural e gera nós Three.js com estatísticas', () => {
    const modelo = processarReceitaSessao(receitaTeste);
    expect(modelo.tipo).toBe('peca');
    expect(modelo.rotulo).toBe('Cubo de Ensaio');
    expect(modelo.raiz).toBeDefined();
    expect(modelo.partes.has('corpo')).toBe(true);
    expect(modelo.medida.partes.has('corpo')).toBe(true);
    expect(modelo.estatisticas.facesNeutras).toBeGreaterThan(0);
  });

  it('sincronizador aplica payload e notifica listeners', () => {
    let atualizado = false;
    let estadoRecebido = null;
    let modeloRecebido = null;

    const sinc = criarSincronizadorSessao({
      aoAtualizar: (est, mod) => {
        atualizado = true;
        estadoRecebido = est;
        modeloRecebido = mod;
      },
    });

    sinc.definirPayload({
      alvo: { nome: 'Peça de Teste Live' },
      receita: receitaTeste,
      intencaoIA: {
        titulo: 'Modelando corpo básico',
        resumo: 'Passo 1 concluído',
        checklist: [{ id: 'c1', descricao: 'Criar cubo', concluido: true }],
      },
      parametros: { largura: 2 },
    });

    expect(atualizado).toBe(true);
    expect(estadoRecebido.status).toBe('conectado');
    expect(estadoRecebido.alvo.nome).toBe('Peça de Teste Live');
    expect(estadoRecebido.intencaoIA.checklist.length).toBe(1);
    expect(modeloRecebido.partes.has('corpo')).toBe(true);

    sinc.destruir();
  });

  it('permite envio de anotações 3D e gerais, edição, exclusão e parâmetros', () => {
    const sinc = criarSincronizadorSessao();
    sinc.definirPayload({ receita: receitaTeste });

    // 1. Anotação 3D vinculada
    const an3d = sinc.enviarAnotacao({
      posicao: [1, 2, 3],
      componente: 'corpo',
      texto: 'Ajustar canto superior',
    });

    // 2. Anotação geral desvinculada
    const anGeral = sinc.enviarAnotacao({
      texto: 'Melhorar proporção geral da máquina',
      componente: 'Geral',
      posicao: null,
    });

    expect(an3d.id).toBeDefined();
    expect(anGeral.id).toBeDefined();
    expect(sinc.obterEstado().anotacoes.length).toBe(2);

    // 3. Edição de anotação
    sinc.editarAnotacao(anGeral.id, 'Melhorar proporção geral e adicionar chanfros');
    expect(sinc.obterEstado().anotacoes.find((a) => a.id === anGeral.id).texto).toBe(
      'Melhorar proporção geral e adicionar chanfros'
    );
    expect(sinc.obterEstado().anotacoes.find((a) => a.id === anGeral.id).editadoEm).toBeDefined();

    // 4. Exclusão de anotação
    sinc.excluirAnotacao(an3d.id);
    expect(sinc.obterEstado().anotacoes.length).toBe(1);
    expect(sinc.obterEstado().anotacoes[0].id).toBe(anGeral.id);

    // 5. Parâmetros
    sinc.atualizarParametro('raio', 12.5);
    expect(sinc.obterEstado().parametros.raio).toBe(12.5);

    sinc.destruir();
  });
});

describe('o arquivo de sessão que a URL pede', () => {
  const receita = {
    meta: { nome: 'Cubo de Ensaio' },
    PASSOS: [
      ['cubo', { origemId: 1, larg: 2, alt: 2, prof: 2 }],
      ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
    ],
  };

  it('sem pedido vale a sessão ativa de sempre', () => {
    expect(arquivoDaSessaoNaUrl(null)).toBeNull();
    expect(arquivoDaSessaoNaUrl(undefined)).toBeNull();
    expect(ARQUIVO_DA_SESSAO_ATIVA).toBe('sessao-ativa.json');
  });

  it('aceita um .json relativo à aplicação', () => {
    expect(arquivoDaSessaoNaUrl('tools/bancadas/out/sessoes/aviao-motor-123-abc.json')).toBe('tools/bancadas/out/sessoes/aviao-motor-123-abc.json');
    expect(arquivoDaSessaoNaUrl('sessao-propria.json')).toBe('sessao-propria.json');
  });

  it.each(['', '../sessao-ativa.json', 'a/../b.json', '/etc/x.json', 'https://x.test/y.json', '//x.test/y.json', 'a//b.json', 'sessao.txt', 'a b.json', '.json'])(
    'recusa o pedido %j em vez de voltar em silêncio ao arquivo compartilhado, que mostraria a peça de outra captura',
    (pedido) => {
      expect(() => arquivoDaSessaoNaUrl(pedido)).toThrow(/parâmetro 'sessao'/);
    },
  );

  it('o polling lê o arquivo pedido, e o da sessão ativa quando nenhum é pedido', async () => {
    const pedidos = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      pedidos.push(String(url));
      return { ok: true, json: async () => ({ receita, alvo: { nome: 'x' } }) };
    };
    try {
      const propria = criarSincronizadorSessao({ arquivo: 'tools/bancadas/out/sessoes/uma.json', intervaloPolling: 1e9 });
      propria.iniciarPolling();
      const comum = criarSincronizadorSessao({ intervaloPolling: 1e9 });
      comum.iniciarPolling();
      await new Promise((resolver) => { setTimeout(resolver, 20); });
      propria.destruir();
      comum.destruir();
    } finally {
      globalThis.fetch = original;
    }
    expect(pedidos).toHaveLength(2);
    expect(pedidos[0]).toMatch(/tools\/bancadas\/out\/sessoes\/uma\.json$/);
    expect(pedidos[0]).not.toContain('sessao-ativa.json');
    expect(pedidos[1]).toMatch(/sessao-ativa\.json$/);
  });
});
