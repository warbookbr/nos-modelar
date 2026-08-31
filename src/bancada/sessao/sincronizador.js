/* sincronizador.js — gerenciador de sincronização em tempo real para a Sessão Ativa. */
import { criarEstadoSessaoInicial, validarPacoteSessao } from './estado-sessao.js';
import { processarPayloadSessao } from './carregar-sessao.js';

export function criarSincronizadorSessao({
  aoAtualizar = () => {},
  aoMudarStatus = () => {},
  aoErro = () => {},
  intervaloPolling = 1500,
} = {}) {
  let estado = criarEstadoSessaoInicial();
  let modeloAtual = null;
  let timerPolling = null;
  let canalBroadcast = null;
  let hashUltimoPayload = null;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      canalBroadcast = new BroadcastChannel('mecanifica-sessao-ativa');
      canalBroadcast.onmessage = (evento) => {
        if (evento.data?.tipo === 'ATUALIZAR_SESSAO' && evento.data.payload) {
          aplicarPayload(evento.data.payload, { fonte: 'broadcast' });
        } else if (evento.data?.tipo === 'NOVA_ANOTACAO' && evento.data.payload) {
          const existe = estado.anotacoes.some((a) => a.id === evento.data.payload.id);
          if (!existe) {
            estado.anotacoes = [...estado.anotacoes, evento.data.payload];
            aoAtualizar(estado, modeloAtual, { fonte: 'broadcast' });
          }
        } else if (evento.data?.tipo === 'EDITAR_ANOTACAO' && evento.data.payload) {
          const { id, texto } = evento.data.payload;
          estado.anotacoes = estado.anotacoes.map((a) => (
            a.id === id ? { ...a, texto, editadoEm: new Date().toISOString() } : a
          ));
          aoAtualizar(estado, modeloAtual, { fonte: 'broadcast' });
        } else if (evento.data?.tipo === 'EXCLUIR_ANOTACAO' && evento.data.payload) {
          const { id } = evento.data.payload;
          estado.anotacoes = estado.anotacoes.filter((a) => a.id !== id);
          aoAtualizar(estado, modeloAtual, { fonte: 'broadcast' });
        }
      };
    }
  } catch (erro) {
    console.warn('BroadcastChannel não disponível:', erro);
  }

  function calcularHash(obj) {
    try {
      return JSON.stringify(obj);
    } catch {
      return null;
    }
  }

  function aplicarPayload(payload, { fonte = 'manual' } = {}) {
    try {
      validarPacoteSessao(payload);
      const hashAtual = calcularHash(payload);
      if (hashAtual && hashAtual === hashUltimoPayload) {
        return; // Sem mudanças
      }

      hashUltimoPayload = hashAtual;
      estado.status = 'sincronizando';
      aoMudarStatus(estado.status);

      // Processa a geometria procedural
      const novoModelo = processarPayloadSessao(payload);

      // Atualiza o estado
      estado = {
        ...estado,
        status: 'conectado',
        alvo: {
          ...estado.alvo,
          ...(payload.alvo ?? {}),
          atualizadoEm: new Date().toISOString(),
        },
        receita: payload.receita ?? null,
        montagem: payload.montagem ?? null,
        referencias: {
          ...estado.referencias,
          ...(payload.referencias ?? {}),
        },
        intencaoIA: {
          ...estado.intencaoIA,
          ...(payload.intencaoIA ?? {}),
        },
        parametros: {
          ...estado.parametros,
          ...(payload.parametros ?? {}),
        },
        anotacoes: payload.anotacoes ?? estado.anotacoes,
        ultimaAtualizacao: Date.now(),
      };

      modeloAtual = novoModelo;
      aoAtualizar(estado, modeloAtual, { fonte });
      aoMudarStatus(estado.status);
    } catch (erro) {
      estado.status = 'erro';
      aoMudarStatus(estado.status);
      aoErro(erro);
    }
  }

  async function consultarArquivoSessao() {
    try {
      /* Caminho ANCORADO na base da aplicação, não no diretório da página.
         O harness dos gates vive em tools/bancadas/, então './' apontava para
         tools/bancadas/sessao-ativa.json (404) e a sessão ativa nunca subia na
         revisão headless — a peça em trabalho era invisível para o agente. */
      const resposta = await fetch(`${import.meta.env?.BASE_URL ?? './'}sessao-ativa.json`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!resposta.ok) {
        if (estado.status === 'desconectado') {
          // Normal se o arquivo ainda não existir
          return;
        }
      }
      const dados = await resposta.json();
      aplicarPayload(dados, { fonte: 'arquivo' });
    } catch {
      // Falha silenciosa no polling contínuo para não poluir console
    }
  }

  function iniciarPolling() {
    if (timerPolling) return;
    consultarArquivoSessao();
    timerPolling = setInterval(consultarArquivoSessao, intervaloPolling);
  }

  function pararPolling() {
    if (timerPolling) {
      clearInterval(timerPolling);
      timerPolling = null;
    }
  }

  function enviarAnotacao(anotacao) {
    const nova = {
      id: `anotacao-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      autor: 'Operador',
      ...anotacao,
    };
    estado.anotacoes = [...estado.anotacoes, nova];
    aoAtualizar(estado, modeloAtual, { fonte: 'anotacao' });

    if (canalBroadcast) {
      canalBroadcast.postMessage({
        tipo: 'NOVA_ANOTACAO',
        payload: nova,
      });
    }
    return nova;
  }

  function editarAnotacao(id, novoTexto) {
    if (!id || typeof novoTexto !== 'string') return;
    const textoLimpo = novoTexto.trim();
    if (!textoLimpo) return;

    estado.anotacoes = estado.anotacoes.map((an) => (
      an.id === id ? { ...an, texto: textoLimpo, editadoEm: new Date().toISOString() } : an
    ));
    aoAtualizar(estado, modeloAtual, { fonte: 'anotacao_editada' });

    if (canalBroadcast) {
      canalBroadcast.postMessage({
        tipo: 'EDITAR_ANOTACAO',
        payload: { id, texto: textoLimpo },
      });
    }
  }

  function excluirAnotacao(id) {
    if (!id) return;
    estado.anotacoes = estado.anotacoes.filter((an) => an.id !== id);
    aoAtualizar(estado, modeloAtual, { fonte: 'anotacao_excluida' });

    if (canalBroadcast) {
      canalBroadcast.postMessage({
        tipo: 'EXCLUIR_ANOTACAO',
        payload: { id },
      });
    }
  }

  function atualizarParametro(chave, valor) {
    estado.parametros = {
      ...estado.parametros,
      [chave]: valor,
    };
    aoAtualizar(estado, modeloAtual, { fonte: 'parametro', chave, valor });

    if (canalBroadcast) {
      canalBroadcast.postMessage({
        tipo: 'PARAMETRO_ALTERADO',
        chave,
        valor,
      });
    }
  }

  // API exposta globalmente para integração com IA / MCP / DevTools
  const api = {
    obterEstado: () => ({ ...estado }),
    obterModelo: () => modeloAtual,
    definirPayload: (payload) => aplicarPayload(payload, { fonte: 'api' }),
    atualizarParametro,
    enviarAnotacao,
    editarAnotacao,
    excluirAnotacao,
    iniciarPolling,
    pararPolling,
    destruir: () => {
      pararPolling();
      if (canalBroadcast) canalBroadcast.close();
    },
  };

  if (typeof window !== 'undefined') {
    window.__mecanificaSessao = api;
  }

  return api;
}
