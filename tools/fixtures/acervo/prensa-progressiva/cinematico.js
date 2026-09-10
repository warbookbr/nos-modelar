/* cinematico.js — acionamento da prensa: excêntrico, volante de inércia, biela e martelo deslizante. */

export const receitaCinematico = {
  meta: {
    nome: 'Acionamento Cinemático da Prensa',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural',
  },
  PARAMS: {
    cursoMartelo: 0.25,
    raioVolante: 0.65,
    larguraMartelo: 1.8,
    profundidadeMartelo: 1.2,
    alturaMartelo: 0.35,
  },
  MATERIAIS: {
    eixoAco: { cor: '#94a3b8', metalicidade: 0.8, aspereza: 0.3 },
    volanteInercia: { cor: '#b91c1c', metalicidade: 0.6, aspereza: 0.35 },
    bielaAco: { cor: '#475569', metalicidade: 0.7, aspereza: 0.4 },
    marteloFundido: { cor: '#1e293b', metalicidade: 0.75, aspereza: 0.3 },
  },
  ALIASES: [
    ['eixoExcentrico_total', { unir: [
      { origem: { op: 'cilindro', id: 110 } },
      { origem: { op: 'cilindro', id: 110, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 110, tampa: 'topo' } },
    ]}],
    ['volanteInercia_total', { unir: [
      { origem: { op: 'cilindro', id: 120 } },
      { origem: { op: 'cilindro', id: 120, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 120, tampa: 'topo' } },
    ]}],
  ],
  PASSOS: [
    // 1. Eixo Excêntrico / Virabrequim
    ['cilindro', {
      origemId: 110,
      raio: 0.12,
      altura: 1.8,
      lados: 24,
    }],
    ['transladar', {
      d: [0, 2.85, 0],
      sel: { alias: 'eixoExcentrico_total' },
    }],
    ['parte', {
      nome: 'eixoExcentrico',
      sel: { alias: 'eixoExcentrico_total' },
    }],
    ['material', {
      usa: 'eixoAco',
      sel: { grupo: 'eixoExcentrico' },
    }],

    // 2. Volante de Inércia Lateral
    ['cilindro', {
      origemId: 120,
      raio: 0.65,
      altura: 0.22,
      lados: 32,
    }],
    ['transladar', {
      d: [0, 2.85, 1.0],
      sel: { alias: 'volanteInercia_total' },
    }],
    ['parte', {
      nome: 'volanteInercia',
      sel: { alias: 'volanteInercia_total' },
      pai: 'eixoExcentrico',
    }],
    ['material', {
      usa: 'volanteInercia',
      sel: { grupo: 'volanteInercia' },
    }],

    // 3. Biela de Articulação / Compressão
    ['cubo', {
      origemId: 130,
      larg: 0.25,
      alt: 0.85,
      prof: 0.2,
    }],
    ['transladar', {
      d: [0, 2.25, 0],
      sel: { origem: { op: 'cubo', id: 130 } },
    }],
    ['parte', {
      nome: 'bielaCompressao',
      sel: { origem: { op: 'cubo', id: 130 } },
      pai: 'eixoExcentrico',
    }],
    ['material', {
      usa: 'bielaAco',
      sel: { grupo: 'bielaCompressao' },
    }],

    // 4. Martelo / Cursor Deslizante (Placa Superior Móvel)
    ['cubo', {
      origemId: 140,
      larg: 1.8,
      alt: 0.35,
      prof: 1.2,
    }],
    ['transladar', {
      d: [0, 1.6, 0],
      sel: { origem: { op: 'cubo', id: 140 } },
    }],
    ['parte', {
      nome: 'marteloCursor',
      sel: { origem: { op: 'cubo', id: 140 } },
      pai: 'bielaCompressao',
    }],
    ['material', {
      usa: 'marteloFundido',
      sel: { grupo: 'marteloCursor' },
    }],

    // 5. Portas de Montagem da Ferramenta Superior
    ['publicarPorta', {
      id: 'portaFaceInferiorMartelo',
      rotulo: 'portaFaceInferiorMartelo',
      de: { op: 'cubo', id: 140, face: 'fundo' },
    }],
  ],
};
