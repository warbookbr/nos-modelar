/* cinematico.js — conjunto do atuador hidraulico: camisa do cilindro, haste cromada, sapata e mesa movel da prensa hidraulica. */

export const receitaCinematico = {
  meta: {
    nome: 'Cinemático e Atuador da Prensa Hidráulica H-Frame',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural AI',
  },
  PARAMS: {
    cursoPistao: 0.25,
    diametroCamisa: 0.13,
    diametroHaste: 0.06,
  },
  MATERIAIS: {
    acoEstrutural: { cor: '#2b2f36', metalicidade: 0.82, aspereza: 0.38 },
    acoCromado: { cor: '#d8dce2', metalicidade: 0.95, aspereza: 0.10 },
    acoUsinado: { cor: '#8c949e', metalicidade: 0.88, aspereza: 0.24 },
  },
  ALIASES: [
    ['camisaCilindro_total', { unir: [
      { origem: { op: 'cilindro', id: 201 } },
      { origem: { op: 'cilindro', id: 201, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 201, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 202 } },
      { origem: { op: 'cilindro', id: 202, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 202, tampa: 'fundo' } },
    ]}],
    ['hastePistao_total', { unir: [
      { origem: { op: 'cilindro', id: 211 } },
      { origem: { op: 'cilindro', id: 211, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 211, tampa: 'fundo' } },
    ]}],
    ['sapataPistao_total', { unir: [
      { origem: { op: 'cilindro', id: 221 } },
      { origem: { op: 'cilindro', id: 221, tampa: 'topo' } },
      { origem: { op: 'cilindro', id: 221, tampa: 'fundo' } },
    ]}],
    ['mesaAjustavel_total', { unir: [
      { origem: { op: 'cubo', id: 231 } },
      { origem: { op: 'cubo', id: 232 } },
      { origem: { op: 'cubo', id: 233 } },
      { origem: { op: 'cubo', id: 234 } },
    ]}],
  ],
  PASSOS: [
    // --- 1. CAMISA DO CILINDRO HIDRÁULICO E FLANGE SUPERIOR ---
    // Corpo principal do cilindro mestre (y de 1.48 a 1.88)
    ['cilindro', { origemId: 201, raio: 0.065, altura: 0.40, lados: 24, eixo: 'y', em: [0, 1.48, 0] }],
    // Flange de reforço do cabeçote do cilindro (y de 1.88 a 1.91)
    ['cilindro', { origemId: 202, raio: 0.075, altura: 0.03, lados: 24, eixo: 'y', em: [0, 1.88, 0] }],

    // --- 2. HASTE MÓVEL DO PISTÃO (AÇO CROMADO) ---
    // Haste polida espelhada (y de 1.20 a 1.50, entrando 0.02 m dentro do cilindro)
    ['cilindro', { origemId: 211, raio: 0.03, altura: 0.30, lados: 24, eixo: 'y', em: [0, 1.20, 0] }],

    // --- 3. SAPATA DE PRENSAGEM / NARIZ DO PISTÃO ---
    // Flange de acoplamento da matriz superior (y de 1.17 a 1.20)
    ['cilindro', { origemId: 221, raio: 0.045, altura: 0.03, lados: 24, eixo: 'y', em: [0, 1.17, 0] }],

    // --- 4. MESA DE TRABALHO AJUSTÁVEL (REPousA SOBRE OS PINOS EM Y=0.565) ---
    // Viga frontal transversal da mesa (y de 0.565 a 0.685)
    ['cubo', { origemId: 231, larg: 0.68, alt: 0.12, prof: 0.03, em: [0, 0.565, 0.075] }],
    // Viga traseira transversal da mesa (y de 0.565 a 0.685)
    ['cubo', { origemId: 232, larg: 0.68, alt: 0.12, prof: 0.03, em: [0, 0.565, -0.075] }],
    // Placa de fechamento e guia lateral esquerda
    ['cubo', { origemId: 233, larg: 0.02, alt: 0.12, prof: 0.15, em: [-0.28, 0.565, 0] }],
    // Placa de fechamento e guia lateral direita
    ['cubo', { origemId: 234, larg: 0.02, alt: 0.12, prof: 0.15, em: [0.28, 0.565, 0] }],

    // --- 5. NOMEAÇÃO SEMÂNTICA DAS PARTES ---
    ['parte', { nome: 'camisaCilindro', sel: { alias: 'camisaCilindro_total' } }],
    ['parte', { nome: 'hastePistao', sel: { alias: 'hastePistao_total' }, pai: 'camisaCilindro' }],
    ['parte', { nome: 'sapataPistao', sel: { alias: 'sapataPistao_total' }, pai: 'hastePistao' }],
    ['parte', { nome: 'mesaAjustavel', sel: { alias: 'mesaAjustavel_total' } }],

    // --- 6. ATRIBUIÇÃO DE MATERIAIS ---
    ['material', { usa: 'acoEstrutural', sel: { grupo: 'camisaCilindro' } }],
    ['material', { usa: 'acoCromado', sel: { grupo: 'hastePistao' } }],
    ['material', { usa: 'acoUsinado', sel: { grupo: 'sapataPistao' } }],
    ['material', { usa: 'acoEstrutural', sel: { grupo: 'mesaAjustavel' } }],
  ],
};

export default receitaCinematico;
