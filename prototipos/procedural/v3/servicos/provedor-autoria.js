/* Adaptador N1 da descoberta procedural para o contrato de provedores.
   Ele só planeja: não executa receita, não registra lacuna e não escreve. */

import { FORMATO_PROVEDOR_AUTORIA } from '../../../../src/autoria/contrato-autoria-3d.js';
import { criarServicoDescobertaProcedural } from './descoberta.js';

export const ID_PROVEDOR_PROCEDURAL = 'procedural-dimensional';

function diagnostico(codigo, campo, causa, impacto, proximoPasso) {
  return { codigo, campo, causa, impacto, proximoPasso };
}

export function criarProvedorProceduralAutoria({ servico = criarServicoDescobertaProcedural() } = {}) {
  if (!servico || typeof servico.combinar !== 'function' || typeof servico.analisarLacuna !== 'function') {
    throw new TypeError('provedor procedural: serviço de descoberta inválido.');
  }
  return Object.freeze({
    manifesto: Object.freeze({
      formato: FORMATO_PROVEDOR_AUTORIA, id: ID_PROVEDOR_PROCEDURAL, versao: '1.0.0',
      familias: ['*'], etapas: ['decomposicao', 'integracao', 'superficie'],
      classes: ['procedural'], efeitos: ['leitura', 'planejamento'],
    }),
    planejar({ objetivo, necessidade }) {
      if (!necessidade?.artefatos?.sai?.length) return {
        estado: 'bloqueada', custo: 0, plano: null, lacuna: null,
        diagnosticos: [diagnostico(
          'saida-nao-declarada', `necessidades.${necessidade?.id ?? 'desconhecida'}.artefatos.sai`,
          'a necessidade procedural não declara produto esperado.',
          'a descoberta não tem um alvo contratual para buscar.', 'declare o tipo de artefato esperado antes de consultar o catálogo.',
        )],
      };
      const consulta = {
        artefatos: necessidade.artefatos, interfaces: necessidade.interfaces,
        requisitos: necessidade.requisitos,
      };
      const plano = servico.combinar(consulta);
      if (plano.cadeias?.length) return {
        estado: 'coberta', custo: plano.cadeias[0].custo,
        plano: { formato: 'mecanifica.plano-provedor-procedural@1', cadeia: plano.cadeias[0], consulta },
        lacuna: null, diagnosticos: [],
      };
      const analise = servico.analisarLacuna({
        id: `${objetivo.id}-${necessidade.id}`, objetivo: objetivo.intencao,
        artefatos: necessidade.artefatos, interfaces: necessidade.interfaces,
        requisitos: necessidade.requisitos,
        candidatas: [...new Set((plano.descartes ?? []).map(({ operacao }) => operacao.nome))].sort(),
        recorrencia: 1,
      });
      return {
        estado: 'nao-coberta', custo: 0, plano: null, lacuna: analise,
        diagnosticos: [diagnostico(
          'lacuna-procedural', `necessidades.${necessidade.id}`, 'o catálogo atual não encontrou cadeia compatível.',
          'a operação não pode ser inventada nem presumida.', 'preserve a classificação e execute prova mínima antes de ampliar o motor.',
        )],
      };
    },
  });
}
