/* derivar-roteiro-revalidacao.js — transforma impacto local em ações explícitas. */

import { derivarImpactoMontagem } from './derivar-impacto-montagem.js';

function acaoDaRelacao(relacao) {
  return relacao.satisfeita
    ? 'Reexecute a relação após alterar o alvo; o estado atual é somente baseline.'
    : 'Corrija ou justifique a relação reprovada antes de aceitar a alteração.';
}

function item(relacao, alcance) {
  return {
    alcance,
    relacao: {
      montagem: relacao.montagem,
      id: relacao.id,
      tipo: relacao.tipo,
      referencia: relacao.referencia,
      movel: relacao.movel,
    },
    revalidacao: {
      executavel: true,
      resultadoAtual: relacao.satisfeita === true ? 'satisfeita' : 'reprovada',
      acao: acaoDaRelacao(relacao),
    },
  };
}

/**
 * Não revalida nem altera autoria: comunica o que precisa ser repetido depois
 * de uma alteração e quais limites continuam pendentes fora da raiz recebida.
 */
export function derivarRoteiroRevalidacao(montagemResolvida, alvo) {
  const impacto = derivarImpactoMontagem(montagemResolvida, alvo);
  const itens = [
    ...impacto.relacoesDiretas.map((relacao) => item(relacao, 'direta')),
    ...impacto.relacoesIndiretas.map((relacao) => item(relacao, 'indireta')),
  ];
  return {
    formato: 'mecanifica.roteiro-revalidacao',
    versao: 1,
    alvo: impacto.alvo,
    montagensARevalidar: impacto.montagensARevalidar,
    itens,
    pendencias: impacto.limitacoes.map((codigo) => ({
      codigo,
      executavel: false,
      acao: codigo === 'uso-global-fora-da-raiz-nao-verificado'
        ? 'Forneça raízes adicionais a um catálogo explícito antes de concluir impacto global.'
        : 'Declare uma relação validável; dependência interna de porta não é inferida.',
    })),
    limitacoes: [
      'roteiro-nao-executa-validacao-nem-altera-autoria',
      'resultado-atual-nao-prova-resultado-depois-da-alteracao',
    ],
  };
}
