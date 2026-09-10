/* estado-sessao.js — modelo canônico do estado de trabalho compartilhado entre IA e operador. */

const STATUS_CRITERIO = new Set(['pendente', 'aprovado', 'reprovado']);

export function normalizarChecklist(valor = []) {
  return (Array.isArray(valor) ? valor : []).flatMap((item) => {
    if (typeof item === 'string' && item.trim()) {
      return [{ descricao: item.trim(), concluido: false }];
    }
    if (item && typeof item.descricao === 'string' && item.descricao.trim()) {
      return [{ descricao: item.descricao.trim(), concluido: Boolean(item.concluido) }];
    }
    return [];
  });
}

export function normalizarCriterios(valor = []) {
  return (Array.isArray(valor) ? valor : []).flatMap((item) => {
    if (typeof item === 'string' && item.trim()) {
      return [{ texto: item.trim(), status: 'pendente' }];
    }
    if (item && typeof item.texto === 'string' && item.texto.trim()) {
      return [{
        texto: item.texto.trim(),
        status: STATUS_CRITERIO.has(item.status) ? item.status : 'pendente',
      }];
    }
    return [];
  });
}

export function criarEstadoSessaoInicial() {
  return {
    status: 'desconectado', // 'desconectado' | 'conectado' | 'sincronizando' | 'erro'
    modo: 'sessao', // 'sessao' | 'catalogo'
    alvo: {
      id: 'sessao-ativa',
      tipo: 'peca', // 'peca' | 'montagem'
      nome: 'Sessão Ativa de Modelagem',
      versao: '1.0.0',
      atualizadoEm: new Date().toISOString(),
    },
    receita: null,
    montagem: null,
    referencias: {
      pranchas: [],
      imagens: [],
      criterios: [],
    },
    intencaoIA: {
      titulo: 'Aguardando alvo da IA',
      resumo: 'Nenhum ciclo de modelagem ativo no momento.',
      checklist: [],
    },
    parametros: {},
    anotacoes: [],
    ultimaAtualizacao: Date.now(),
  };
}

export function validarPacoteSessao(dados) {
  if (!dados || typeof dados !== 'object') {
    throw new TypeError('sessão: pacote precisa ser um objeto.');
  }
  if (!dados.receita && !dados.montagem && !dados.alvo) {
    throw new Error('sessão: pacote precisa conter ao menos uma receita, montagem ou metadados de alvo.');
  }
  return dados;
}
