/* Família privada: quiralidade é parâmetro explícito, não escala negativa. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from './intencao.js';

export function criarReceitaMao(lado) {
  if (lado !== 'esquerda' && lado !== 'direita') throw new Error('lado da mão inválido');
  const sinal = lado === 'esquerda' ? -1 : 1;
  return {
    PERFIL_AUTORIA: PERFIL_AUTORIA_ARMADURA,
    INTENCAO: criarIntencaoArmadura({
      funcao: `encerrar o membro superior com uma mão blindada de lateralidade ${lado}`,
      familia: 'extremidade quiral de membro superior',
      invariantes: [`o polegar permanece no lado ${lado}`, 'a quiralidade não usa escala negativa'],
      criteriosVisuais: ['palma distinguível do protetor do polegar', 'lateralidade legível em vista frontal'],
    }),
    PARAMS: {},
    TOPO: {},
    ALIASES: [],
    MATERIAIS: {
      placaGrafite: { cor: '#333941', aspereza: 0.47, metalicidade: 0.54 },
      placaCobalto: { cor: '#174f9b', aspereza: 0.31, metalicidade: 0.70 },
    },
    PASSOS: [
      ['chamferBox', { origemId: 6501, larg: 0.20, alt: 0.21, prof: 0.14, chanfro: 0.035, em: [0, -0.105, 0] }],
      ['parte', { nome: `palma${lado === 'esquerda' ? 'Esquerda' : 'Direita'}`, sel: { origem: { op: 'chamferBox', id: 6501 } } }],
      ['material', { usa: 'placaGrafite', sel: { origem: { op: 'chamferBox', id: 6501 } } }],
      ['solido', { sel: { origem: { op: 'chamferBox', id: 6501 } } }],
      ['chamferBox', { origemId: 6502, larg: 0.075, alt: 0.14, prof: 0.080, chanfro: 0.020, em: [sinal * 0.125, -0.08, 0.015] }],
      ['parte', { nome: `protetorDoPolegar${lado === 'esquerda' ? 'Esquerdo' : 'Direito'}`, sel: { origem: { op: 'chamferBox', id: 6502 } } }],
      ['material', { usa: 'placaCobalto', sel: { origem: { op: 'chamferBox', id: 6502 } } }],
      ['solido', { sel: { origem: { op: 'chamferBox', id: 6502 } } }],
    ],
  };
}
