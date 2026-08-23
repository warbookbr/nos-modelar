/* Torso blindado original: envelope por loft, placas sobrepostas e núcleo luminoso. */
import { PERFIL_AUTORIA_ARMADURA } from '../perfil-autoria.js';
import { criarIntencaoArmadura } from '../familias/intencao.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_ARMADURA;
export const INTENCAO = criarIntencaoArmadura({
  funcao: 'definir a massa central da armadura e orientar cabeça, braços e abdômen',
  familia: 'casco de tronco com placas sobrepostas',
  invariantes: ['o núcleo emissivo permanece frontal e central', 'ombros permanecem bilateralmente equilibrados'],
  criteriosVisuais: ['silhueta torácica domina sem esmagar os membros', 'gargalo e abdômen leem como transições'],
});
export const PARAMS = { lados: 12 };
export const TOPO = { forma: 'envelope-loft-com-placas', eixoFrente: 'z-positivo' };
export const MATERIAIS = {
  grafite: { cor: '#303943', aspereza: 0.44, metalicidade: 0.56 },
  cobalto: { cor: '#245da8', aspereza: 0.30, metalicidade: 0.68 },
  emissivo: { cor: '#b8f0ff', emissivo: 0.96, aspereza: 0.16, metalicidade: 0.07 },
};

const ENVELOPE = 6201;
const PEITORAL = 6202;
const OMBRO_ESQUERDO = 6203;
const OMBRO_DIREITO = 6204;
const NUCLEO = 6205;
const GARGALO = 6206;
const CENTRO_Y = 0;

function contorno(meiaLargura, piso, teto) {
  const centro = (piso + teto) / 2;
  const meiaAltura = (teto - piso) / 2;
  return Array.from({ length: 12 }, (_, indice) => {
    const angulo = indice * Math.PI * 2 / 12;
    const yFisico = centro - Math.sin(angulo) * meiaAltura;
    const peito = yFisico > centro ? 0.91 : 1;
    return [Math.cos(angulo) * meiaLargura * peito, CENTRO_Y - yFisico];
  });
}

export const ALIASES = [
  ['envelopeInteiro', { origem: { op: 'loft', id: ENVELOPE } }],
  ['peitoralInteiro', { origem: { op: 'chamferBox', id: PEITORAL } }],
  ['ombroEsquerdo', { origem: { op: 'chamferBox', id: OMBRO_ESQUERDO } }],
  ['ombroDireito', { origem: { op: 'chamferBox', id: OMBRO_DIREITO } }],
  ['nucleoInteiro', { unir: [
    { origem: { op: 'cilindro', id: NUCLEO } },
    { origem: { op: 'cilindro', id: NUCLEO, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: NUCLEO, tampa: 'topo' } },
  ] }],
  ['gargaloInteiro', { origem: { op: 'chamferBox', id: GARGALO } }],
];

export const PASSOS = [
  ['loft', {
    origemId: ENVELOPE,
    lados: 'lados',
    orientacao: [1, 0, 0],
    secoes: [
      { pos: [0, CENTRO_Y, -0.38], raio: 0 },
      { pos: [0, CENTRO_Y, -0.31], contorno: contorno(0.50, -0.36, 0.315) },
      { pos: [0, CENTRO_Y, -0.10], contorno: contorno(0.66, -0.387, 0.351) },
      { pos: [0, CENTRO_Y, 0.17], contorno: contorno(0.70, -0.3825, 0.3285) },
      { pos: [0, CENTRO_Y, 0.38], contorno: contorno(0.60, -0.351, 0.279) },
      { pos: [0, CENTRO_Y, 0.46], raio: 0 },
    ],
  }],
  ['parte', { nome: 'cascoToraxGrafite', sel: { alias: 'envelopeInteiro' } }],
  ['material', { usa: 'grafite', sel: { alias: 'envelopeInteiro' } }],
  ['liso', { sel: { alias: 'envelopeInteiro' } }],
  ['chamferBox', { origemId: PEITORAL, larg: 0.54, alt: 0.216, prof: 0.12, chanfro: 0.035, em: [0, 0.0675, 0.445] }],
  ['parte', { nome: 'placaPeitoralCobalto', sel: { alias: 'peitoralInteiro' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'peitoralInteiro' } }],
  ['chamferBox', { origemId: OMBRO_ESQUERDO, larg: 0.32, alt: 0.0855, prof: 0.29, chanfro: 0.040, em: [-0.60, 0.261, 0.10] }],
  ['parte', { nome: 'placaOmbroEsquerda', sel: { alias: 'ombroEsquerdo' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'ombroEsquerdo' } }],
  ['chamferBox', { origemId: OMBRO_DIREITO, larg: 0.32, alt: 0.0855, prof: 0.29, chanfro: 0.040, em: [0.60, 0.261, 0.10] }],
  ['parte', { nome: 'placaOmbroDireita', sel: { alias: 'ombroDireito' } }],
  ['material', { usa: 'cobalto', sel: { alias: 'ombroDireito' } }],
  ['cilindro', { origemId: NUCLEO, raio: 0.115, altura: 0.055, lados: 16, eixo: 'z', em: [0, 0.0675, 0.525] }],
  ['parte', { nome: 'nucleoEmissivo', sel: { alias: 'nucleoInteiro' } }],
  ['material', { usa: 'emissivo', sel: { alias: 'nucleoInteiro' } }],
  ['chamferBox', { origemId: GARGALO, larg: 0.28, alt: 0.0765, prof: 0.20, chanfro: 0.028, em: [0, 0.342, -0.02] }],
  ['parte', { nome: 'colarGrafite', sel: { alias: 'gargaloInteiro' } }],
  ['material', { usa: 'grafite', sel: { alias: 'gargaloInteiro' } }],
  ['solido', { sel: { tudo: true } }],
];

export const meta = { nome: 'torax', tipo: 'objeto', desc: 'torso humanoide original com placas azuis e núcleo luminoso' };
