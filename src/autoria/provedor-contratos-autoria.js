/* Provedor N1 do briefing: transforma o objetivo já validado em plano puro.
   Não alega validar prancha, forma, superfície, montagem, revisão ou promoção. */

import { FORMATO_OBJETIVO_AUTORIA, FORMATO_PROVEDOR_AUTORIA } from './contrato-autoria-3d.js';

export const ID_PROVEDOR_CONTRATOS_AUTORIA = 'contratos-autoria';

export function criarProvedorContratosAutoria() {
  return Object.freeze({
    manifesto: Object.freeze({
      formato: FORMATO_PROVEDOR_AUTORIA, id: ID_PROVEDOR_CONTRATOS_AUTORIA, versao: '1.0.0',
      familias: ['*'], etapas: ['briefing'], classes: ['objetivo'],
      efeitos: ['leitura', 'planejamento'],
    }),
    planejar({ objetivo, necessidade }) {
      return {
        estado: 'coberta', custo: 0,
        plano: {
          formato: 'mecanifica.plano-provedor-objetivo@1',
          contrato: FORMATO_OBJETIVO_AUTORIA, objetivo: objetivo.id,
          necessidade: necessidade.id,
          verificacoes: ['familia', 'intencao', 'referencias', 'rejeicoes', 'incertezas'],
        },
        lacuna: null, diagnosticos: [],
      };
    },
  });
}
