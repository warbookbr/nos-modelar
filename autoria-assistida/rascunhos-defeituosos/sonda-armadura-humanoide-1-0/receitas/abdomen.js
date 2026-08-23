/* Abdômen segmentado original: três lâminas articuláveis e faixa central emissiva. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'proteger e conectar visualmente tórax e pelve sem apagar a segmentação',
  familia: 'blindagem abdominal segmentada',
  invariantes: ['a faixa emissiva permanece central', 'as três lâminas permanecem distinguíveis'],
  criteriosVisuais: ['leitura vertical contínua', 'sobreposição de placas intencional'],
});
export const PARAMS = {};
export const TOPO = { forma: 'laminas-segmentadas', eixoFrente: 'z-positivo' };
export const MATERIAIS = {
  grafite: { cor: '#1d252e', aspereza: 0.48, metalicidade: 0.52 },
  cobalto: { cor: '#245da8', aspereza: 0.31, metalicidade: 0.66 },
  emissivo: { cor: '#b8f0ff', emissivo: 0.90, aspereza: 0.18, metalicidade: 0.06 },
};

const LAMINA_SUPERIOR = 6301;
const LAMINA_CENTRAL = 6302;
const LAMINA_INFERIOR = 6303;
const FAIXA = 6304;
const DETALHE_ESQUERDO = 6305;
const DETALHE_DIREITO = 6306;

export const ALIASES = [
  ['laminaSuperior', { origem: { op: 'chamferBox', id: LAMINA_SUPERIOR } }],
  ['laminaCentral', { origem: { op: 'chamferBox', id: LAMINA_CENTRAL } }],
  ['laminaInferior', { origem: { op: 'chamferBox', id: LAMINA_INFERIOR } }],
  ['faixaInteira', { origem: { op: 'chamferBox', id: FAIXA } }],
  ['detalheEsquerdo', { origem: { op: 'chamferBox', id: DETALHE_ESQUERDO } }],
  ['detalheDireito', { origem: { op: 'chamferBox', id: DETALHE_DIREITO } }],
];

export const PASSOS = [
  ['chamferBox', { origemId: LAMINA_SUPERIOR, larg: 0.58, alt: 0.136, prof: 0.27, chanfro: 0.035, em: [0, 0.16, 0.34] }],
  ['parte', { nome: 'laminaAbdominalSuperior', sel: { alias: 'laminaSuperior' } }],
  ['material', { usa: 'grafite', sel: { alias: 'laminaSuperior' } }],
  ['chamferBox', { origemId: LAMINA_CENTRAL, larg: 0.53, alt: 0.128, prof: 0.29, chanfro: 0.032, em: [0, 0, 0.37] }],
  ['parte', { nome: 'laminaAbdominalCentral', sel: { alias: 'laminaCentral' } }],
  ['material', { usa: 'grafite', sel: { alias: 'laminaCentral' } }],
  ['chamferBox', { origemId: LAMINA_INFERIOR, larg: 0.47, alt: 0.128, prof: 0.31, chanfro: 0.030, em: [0, -0.16, 0.34] }],
  ['parte', { nome: 'laminaAbdominalInferior', sel: { alias: 'laminaInferior' } }],
  ['material', { usa: 'grafite', sel: { alias: 'laminaInferior' } }],
  ['chamferBox', { origemId: FAIXA, larg: 0.075, alt: 0.408, prof: 0.035, chanfro: 0.012, em: [0, 0, 0.535] }],
  ['parte', { nome: 'faixaEmissivaAbdomen', sel: { alias: 'faixaInteira' } }],
  ['material', { usa: 'emissivo', sel: { alias: 'faixaInteira' } }],
  ['chamferBox', { origemId: DETALHE_ESQUERDO, larg: 0.10, alt: 0.224, prof: 0.035, chanfro: 0.014, em: [-0.285, 0, 0.535] }],
  ['parte', { nome: 'placaLateralEsquerda', sel: { alias: 'detalheEsquerdo' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'detalheEsquerdo' } }],
  ['chamferBox', { origemId: DETALHE_DIREITO, larg: 0.10, alt: 0.224, prof: 0.035, chanfro: 0.014, em: [0.285, 0, 0.535] }],
  ['parte', { nome: 'placaLateralDireita', sel: { alias: 'detalheDireito' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'detalheDireito' } }],
  ['solido', { sel: { tudo: true } }],
];

export const meta = { nome: 'abdomen', tipo: 'objeto', desc: 'abdômen segmentado humanoide original' };
