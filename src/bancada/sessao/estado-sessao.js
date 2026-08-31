/* estado-sessao.js — modelo canônico do estado de trabalho compartilhado entre IA e operador. */

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
