/* Junta visual reutilizável em cotovelos e joelhos; eixo local X. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'marcar um pivô visual reutilizável entre dois segmentos de membro',
  familia: 'junta circular compartilhada',
  eixosLocais: {
    x: 'eixo nominal de articulação; positivo à direita',
    y: 'vertical no estado neutro; positivo em direção à cabeça',
    z: 'profundidade; positivo em direção à frente',
  },
  invariantes: ['o eixo cilíndrico permanece em x', 'a mesma definição serve cotovelos e joelhos'],
  criteriosVisuais: ['pivô circular legível nas laterais', 'escala compatível com os quatro consumidores'],
});
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  juntaGrafite: { cor: '#252a31', aspereza: 0.48, metalicidade: 0.58 },
  aroCobalto: { cor: '#1857ad', aspereza: 0.30, metalicidade: 0.72 },
};
export const PASSOS = [
  ['cilindro', { origemId: 6101, raio: 0.095, altura: 0.19, lados: 20, eixo: 'x' }],
  ['cilindro', { origemId: 6102, raio: 0.070, altura: 0.205, lados: 20, eixo: 'x' }],
  ['parte', { nome: 'juntaCircularCompleta', sel: { tudo: true } }],
  ['material', { usa: 'juntaGrafite', sel: { grupo: 'juntaCircularCompleta' } }],
  ['liso', { sel: { grupo: 'juntaCircularCompleta' } }],
  ['solido', { sel: { grupo: 'juntaCircularCompleta' } }],
];
export const meta = { nome: 'junta-articulada', tipo: 'objeto', desc: 'junta circular visual reutilizável' };
