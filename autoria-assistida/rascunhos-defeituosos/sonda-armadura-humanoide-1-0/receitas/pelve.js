/* Pelve blindada original: placas de quadril, proteção central e sinalização baixa. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'distribuir visualmente o tronco para os dois membros inferiores',
  familia: 'blindagem pélvica bilateral',
  invariantes: ['as placas de quadril permanecem bilaterais', 'a proteção central permanece no plano mediano'],
  criteriosVisuais: ['cinto forma linha estrutural contínua', 'quadris equilibram a largura do tórax'],
});
export const PARAMS = {};
export const TOPO = { forma: 'placas-de-quadril', eixoFrente: 'z-positivo' };
export const MATERIAIS = {
  grafite: { cor: '#1c242d', aspereza: 0.49, metalicidade: 0.52 },
  cobalto: { cor: '#245da8', aspereza: 0.31, metalicidade: 0.67 },
  emissivo: { cor: '#b8f0ff', emissivo: 0.88, aspereza: 0.18, metalicidade: 0.06 },
};

const QUADRIL_ESQUERDO = 6401;
const QUADRIL_DIREITO = 6402;
const PROTECAO_CENTRAL = 6403;
const CINTO = 6404;
const LUZ_ESQUERDA = 6405;
const LUZ_DIREITA = 6406;

export const ALIASES = [
  ['quadrilEsquerdo', { origem: { op: 'chamferBox', id: QUADRIL_ESQUERDO } }],
  ['quadrilDireito', { origem: { op: 'chamferBox', id: QUADRIL_DIREITO } }],
  ['protecaoCentral', { origem: { op: 'chamferBox', id: PROTECAO_CENTRAL } }],
  ['cintoInteiro', { origem: { op: 'chamferBox', id: CINTO } }],
  ['luzEsquerda', { origem: { op: 'chamferBox', id: LUZ_ESQUERDA } }],
  ['luzDireita', { origem: { op: 'chamferBox', id: LUZ_DIREITA } }],
];

export const PASSOS = [
  ['chamferBox', { origemId: QUADRIL_ESQUERDO, larg: 0.36, alt: 0.30, prof: 0.34, chanfro: 0.045, em: [-0.35, 0, 0.10] }],
  ['parte', { nome: 'placaQuadrilEsquerda', sel: { alias: 'quadrilEsquerdo' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'quadrilEsquerdo' } }],
  ['chamferBox', { origemId: QUADRIL_DIREITO, larg: 0.36, alt: 0.30, prof: 0.34, chanfro: 0.045, em: [0.35, 0, 0.10] }],
  ['parte', { nome: 'placaQuadrilDireita', sel: { alias: 'quadrilDireito' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'quadrilDireito' } }],
  ['chamferBox', { origemId: PROTECAO_CENTRAL, larg: 0.40, alt: 0.34, prof: 0.36, chanfro: 0.050, em: [0, -0.05, 0.17] }],
  ['parte', { nome: 'protecaoCentralGrafite', sel: { alias: 'protecaoCentral' } }],
  ['material', { usa: 'grafite', sel: { alias: 'protecaoCentral' } }],
  ['chamferBox', { origemId: CINTO, larg: 0.82, alt: 0.12, prof: 0.25, chanfro: 0.025, em: [0, 0.20, 0.02] }],
  ['parte', { nome: 'cintoGrafite', sel: { alias: 'cintoInteiro' } }],
  ['material', { usa: 'grafite', sel: { alias: 'cintoInteiro' } }],
  ['chamferBox', { origemId: LUZ_ESQUERDA, larg: 0.045, alt: 0.18, prof: 0.022, chanfro: 0.008, em: [-0.50, 0, 0.285] }],
  ['parte', { nome: 'sinalEmissivoEsquerdo', sel: { alias: 'luzEsquerda' } }],
  ['material', { usa: 'emissivo', sel: { alias: 'luzEsquerda' } }],
  ['chamferBox', { origemId: LUZ_DIREITA, larg: 0.045, alt: 0.18, prof: 0.022, chanfro: 0.008, em: [0.50, 0, 0.285] }],
  ['parte', { nome: 'sinalEmissivoDireito', sel: { alias: 'luzDireita' } }],
  ['material', { usa: 'emissivo', sel: { alias: 'luzDireita' } }],
  ['solido', { sel: { tudo: true } }],
];

export const meta = { nome: 'pelve', tipo: 'objeto', desc: 'pelve humanoide original com placas de quadril' };
