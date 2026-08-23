/* Cabeça modular original: casco facetado, visor contínuo e luz de leitura. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'encerrar a silhueta humanoide com casco, visor e orientação frontal inequívoca',
  familia: 'casco tecnológico facetado',
  invariantes: ['o visor permanece na face z positiva', 'a faixa emissiva permanece centrada'],
  criteriosVisuais: ['volume de cabeça proporcional ao tórax', 'laterais cobalto visíveis sem dominar o visor'],
});
export const PARAMS = { lados: 12 };
export const TOPO = { forma: 'casco-loft-com-visor', eixoFrente: 'z-positivo' };
export const MATERIAIS = {
  grafite: { cor: '#1b222b', aspereza: 0.42, metalicidade: 0.58 },
  cobalto: { cor: '#245da8', aspereza: 0.30, metalicidade: 0.68 },
  visor: { cor: '#081724', aspereza: 0.12, metalicidade: 0.18, mistura: 'transparente', opacidade: 0.84 },
  emissivo: { cor: '#9feaff', emissivo: 0.92, aspereza: 0.18, metalicidade: 0.08 },
};

const CASCO = 6101;
const VISOR = 6102;
const LUZ = 6103;
const LATERAL_ESQUERDA = 6104;
const LATERAL_DIREITA = 6105;
const CENTRO_Y = 0;

function contorno(meiaLargura, piso, teto) {
  const centro = (piso + teto) / 2;
  const meiaAltura = (teto - piso) / 2;
  return Array.from({ length: 12 }, (_, indice) => {
    const angulo = indice * Math.PI * 2 / 12;
    const yFisico = centro - Math.sin(angulo) * meiaAltura;
    const frente = yFisico > centro ? 0.92 : 1;
    return [Math.cos(angulo) * meiaLargura * frente, CENTRO_Y - yFisico];
  });
}

export const ALIASES = [
  ['cascoInteiro', { origem: { op: 'loft', id: CASCO } }],
  ['visorInteiro', { origem: { op: 'chamferBox', id: VISOR } }],
  ['linhaLuminosa', { origem: { op: 'chamferBox', id: LUZ } }],
  ['placaLateralEsquerda', { origem: { op: 'chamferBox', id: LATERAL_ESQUERDA } }],
  ['placaLateralDireita', { origem: { op: 'chamferBox', id: LATERAL_DIREITA } }],
];

export const PASSOS = [
  ['loft', {
    origemId: CASCO,
    lados: 'lados',
    orientacao: [1, 0, 0],
    secoes: [
      { pos: [0, CENTRO_Y, -0.34], raio: 0 },
      { pos: [0, CENTRO_Y, -0.29], contorno: contorno(0.22, -0.30, 0.28) },
      { pos: [0, CENTRO_Y, -0.14], contorno: contorno(0.32, -0.35, 0.37) },
      { pos: [0, CENTRO_Y, 0.08], contorno: contorno(0.34, -0.37, 0.40) },
      { pos: [0, CENTRO_Y, 0.25], contorno: contorno(0.29, -0.31, 0.34) },
      { pos: [0, CENTRO_Y, 0.34], raio: 0 },
    ],
  }],
  ['parte', { nome: 'cascoGrafite', sel: { alias: 'cascoInteiro' } }],
  ['material', { usa: 'grafite', sel: { alias: 'cascoInteiro' } }],
  ['liso', { sel: { alias: 'cascoInteiro' } }],
  ['chamferBox', { origemId: VISOR, larg: 0.40, alt: 0.13, prof: 0.055, chanfro: 0.022, em: [0, 0.02, 0.325] }],
  ['parte', { nome: 'visorFrontal', sel: { alias: 'visorInteiro' } }],
  ['material', { usa: 'visor', sel: { alias: 'visorInteiro' } }],
  ['chamferBox', { origemId: LUZ, larg: 0.30, alt: 0.018, prof: 0.020, chanfro: 0.006, em: [0, 0.055, 0.359] }],
  ['parte', { nome: 'faixaEmissiva', sel: { alias: 'linhaLuminosa' } }],
  ['material', { usa: 'emissivo', sel: { alias: 'linhaLuminosa' } }],
  ['chamferBox', { origemId: LATERAL_ESQUERDA, larg: 0.055, alt: 0.19, prof: 0.13, chanfro: 0.018, em: [-0.325, -0.01, 0.02] }],
  ['parte', { nome: 'placaCobaltoEsquerda', sel: { alias: 'placaLateralEsquerda' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'placaLateralEsquerda' } }],
  ['chamferBox', { origemId: LATERAL_DIREITA, larg: 0.055, alt: 0.19, prof: 0.13, chanfro: 0.018, em: [0.325, -0.01, 0.02] }],
  ['parte', { nome: 'placaCobaltoDireita', sel: { alias: 'placaLateralDireita' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'placaLateralDireita' } }],
  ['solido', { sel: { tudo: true } }],
];

export const meta = { nome: 'capacete', tipo: 'objeto', desc: 'capacete humanoide original com visor e leitura emissiva' };
