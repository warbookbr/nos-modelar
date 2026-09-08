/* mancal-guia.js — Mancal de deslizamento para guia linear/rotativa.
 *
 * Componente mecânico composto por:
 * 1. Base retangular usinada com apoio em y=0.
 * 2. Alojamento cilíndrico central soldado/fundido sobre a base.
 * 3. Bucha cilíndrica de bronze autolubrificante concêntrica, saliente no topo.
 */

export const meta = {
  nome: 'Mancal Guia com Bucha',
  versao: '1.0.0',
  autor: 'Antigravity AI',
};

export const INTENCAO = {
  funcao: 'sustentar e guiar eixo rotativo com bucha de bronze',
  familia: 'mancal de deslizamento',
  eixosLocais: { x: 'largura', y: 'altura', z: 'profundidade' },
  invariantes: [
    'alojamento centralizado na base',
    'base plana apoiada em y=0',
    'bucha coaxial com alojamento',
  ],
  criteriosVisuais: [
    'alojamento vertical cilindrico',
    'bucha sobressalente no topo',
    'geometria simetrica',
  ],
};

export const PARAMS = {
  baseLarg: 0.100,
  baseAlt: 0.015,
  baseProf: 0.050,
  alojRaio: 0.024,
  alojAlt: 0.040,
  buchaRaio: 0.016,
  buchaAlt: 0.046,
};

export const MATERIAIS = {
  aco: { cor: '#4a5568', metalicidade: 0.8, aspereza: 0.35 },
  bronze: { cor: '#d97706', metalicidade: 0.9, aspereza: 0.25 },
};

export const ALIASES = [
  ['alojamentoCompleto', {
    unir: [
      { origem: { op: 'cilindro', id: 2 } },
      { origem: { op: 'cilindro', id: 2, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 2, tampa: 'fundo' } },
    ],
  }],
  ['buchaCompleta', {
    unir: [
      { origem: { op: 'cilindro', id: 3 } },
      { origem: { op: 'cilindro', id: 3, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 3, tampa: 'fundo' } },
    ],
  }],
];

export const PASSOS = [
  // 1. Base retangular em aço apoiada em y=0
  ['cubo', { origemId: 1, larg: 0.100, alt: 0.015, prof: 0.050, em: [0, 0, 0] }],
  ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 1 } } }],
  ['material', { usa: 'aco', sel: { grupo: 'base' } }],

  // 2. Alojamento cilíndrico central montado sobre a base em y=0.015
  ['cilindro', { origemId: 2, raio: 0.024, altura: 0.040, lados: 16, em: [0, 0.015, 0], eixo: 'y' }],
  ['parte', { nome: 'alojamento', sel: { alias: 'alojamentoCompleto' }, pai: 'base' }],
  ['material', { usa: 'aco', sel: { grupo: 'alojamento' } }],

  // 3. Bucha cilíndrica de bronze coaxial montada a partir de y=0.015 com altura 0.046 (sobressai 6 mm no topo)
  ['cilindro', { origemId: 3, raio: 0.016, altura: 0.046, lados: 16, em: [0, 0.015, 0], eixo: 'y' }],
  ['parte', { nome: 'bucha', sel: { alias: 'buchaCompleta' }, pai: 'alojamento' }],
  ['material', { usa: 'bronze', sel: { grupo: 'bucha' } }],
];

/* Mancal montado: a bucha assentada dentro do alojamento, e o alojamento
   apoiado na base. Os tres se tocam por construcao, sem atravessar. */
export const contatos = [
  { par: ['alojamento', 'base'], motivo: 'o alojamento apoia sobre a face da base' },
  { par: ['alojamento', 'bucha'], motivo: 'a bucha assenta dentro do alojamento' },
  { par: ['base', 'bucha'], motivo: 'a bucha encosta na base no fundo do alojamento' },
];

export const receitaMancalGuia = {
  meta,
  contatos,
  INTENCAO,
  PARAMS,
  MATERIAIS,
  ALIASES,
  PASSOS,
};

export default receitaMancalGuia;
