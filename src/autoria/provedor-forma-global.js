/* Provedor N2: cobre planejamento de alvo, andaime e blocagem porque há um
   serviço puro correspondente. Crítica e aceite continuam fora deste manifesto. */

import { FORMATO_PROVEDOR_AUTORIA } from './contrato-autoria-3d.js';
import {
  FORMATO_ALVO_FORMA_GLOBAL, FORMATO_ANDAIME_GLOBAL, FORMATO_BLOCAGEM_GLOBAL,
} from './forma-global.js';

export const ID_PROVEDOR_FORMA_GLOBAL = 'forma-global-nativa';

const POR_ETAPA = Object.freeze({
  alvo: { contrato: FORMATO_ALVO_FORMA_GLOBAL, saida: 'alvo medido com silhuetas, landmarks, rejeições e orçamento', custo: 1 },
  andaime: { contrato: FORMATO_ANDAIME_GLOBAL, saida: 'andaime inteiro com envelope, landmarks e volumes semânticos', custo: 2 },
  blocagem: { contrato: FORMATO_BLOCAGEM_GLOBAL, saida: 'blocagem neutra derivada, vistas e gate G01', custo: 3 },
});

export function criarProvedorFormaGlobal() {
  return Object.freeze({
    manifesto: Object.freeze({
      formato: FORMATO_PROVEDOR_AUTORIA, id: ID_PROVEDOR_FORMA_GLOBAL, versao: '1.0.0',
      familias: ['*'], etapas: ['alvo', 'andaime', 'blocagem'], classes: ['referencia', 'forma-global'],
      efeitos: ['leitura', 'planejamento', 'compilacao', 'validacao'],
    }),
    planejar({ objetivo, necessidade }) {
      const etapa = POR_ETAPA[necessidade.etapa];
      if (!etapa) return {
        estado: 'nao-coberta', custo: 0, plano: null,
        lacuna: { classe: necessidade.classe, etapa: necessidade.etapa, motivo: 'o provedor N2 cobre somente alvo, andaime e blocagem' },
        diagnosticos: [],
      };
      return {
        estado: 'coberta', custo: etapa.custo,
        plano: {
          formato: 'mecanifica.plano-provedor-forma-global@1', objetivo: objetivo.id,
          necessidade: necessidade.id, etapa: necessidade.etapa, contrato: etapa.contrato,
          saida: etapa.saida, bloqueios: ['g01-reprovado', 'critica-ausente', 'decisao-usuario-ausente'],
        },
        lacuna: null, diagnosticos: [],
      };
    },
  });
}
