/* ferramentas.js — estampo progressivo: porta-matriz, estações de punção e placa extratora. */

export const receitaFerramentas = {
  meta: {
    nome: 'Estampo Progressivo de 4 Estágios',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural',
  },
  PARAMS: {
    passoEstampo: 0.35,
    larguraTira: 0.5,
    espessuraMatriz: 0.18,
    alturaPuncao: 0.38,
  },
  MATERIAIS: {
    baseMatriz: { cor: '#475569', metalicidade: 0.65, aspereza: 0.35 },
    guiasTira: { cor: '#64748b', metalicidade: 0.7, aspereza: 0.3 },
    puncoesAco: { cor: '#e2e8f0', metalicidade: 0.9, aspereza: 0.12 },
    puncaoDobra: { cor: '#f59e0b', metalicidade: 0.75, aspereza: 0.25 },
    placaExtratora: { cor: '#334155', metalicidade: 0.6, aspereza: 0.4 },
  },
  ALIASES: [
    ['puncaoPiloto1_total', { unir: [
      { origem: { op: 'cilindro', id: 230 } },
      { origem: { op: 'cilindro', id: 230, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 230, tampa: 'topo' } },
    ]}],
    ['puncaoPiloto2_total', { unir: [
      { origem: { op: 'cilindro', id: 235 } },
      { origem: { op: 'cilindro', id: 235, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: 235, tampa: 'topo' } },
    ]}],
  ],
  PASSOS: [
    // 1. Base Inferior da Matriz (Fixada na mesa)
    ['cubo', {
      origemId: 210,
      larg: 1.6,
      alt: 0.18,
      prof: 0.8,
    }],
    ['transladar', {
      d: [0, 0.49, 0],
      sel: { origem: { op: 'cubo', id: 210 } },
    }],
    ['parte', {
      nome: 'basePortaMatriz',
      sel: { origem: { op: 'cubo', id: 210 } },
    }],
    ['material', {
      usa: 'baseMatriz',
      sel: { grupo: 'basePortaMatriz' },
    }],

    // 2. Guias Laterais da Tira Metálica
    ['cubo', {
      origemId: 220,
      larg: 1.6,
      alt: 0.06,
      prof: 0.1,
    }],
    ['transladar', {
      d: [0, 0.61, 0.32],
      sel: { origem: { op: 'cubo', id: 220 } },
    }],
    ['parte', {
      nome: 'guiaTiraSuperior',
      sel: { origem: { op: 'cubo', id: 220 } },
      pai: 'basePortaMatriz',
    }],
    ['material', {
      usa: 'guiasTira',
      sel: { grupo: 'guiaTiraSuperior' },
    }],

    ['cubo', {
      origemId: 225,
      larg: 1.6,
      alt: 0.06,
      prof: 0.1,
    }],
    ['transladar', {
      d: [0, 0.61, -0.32],
      sel: { origem: { op: 'cubo', id: 225 } },
    }],
    ['parte', {
      nome: 'guiaTiraInferior',
      sel: { origem: { op: 'cubo', id: 225 } },
      pai: 'basePortaMatriz',
    }],
    ['material', {
      usa: 'guiasTira',
      sel: { grupo: 'guiaTiraInferior' },
    }],

    // 3. Estação 1: Punções de Furo Piloto (Cilíndricos)
    ['cilindro', {
      origemId: 230,
      raio: 0.04,
      altura: 0.38,
      lados: 16,
    }],
    ['transladar', {
      d: [-0.525, 1.2, 0.12],
      sel: { alias: 'puncaoPiloto1_total' },
    }],
    ['parte', {
      nome: 'puncaoPiloto1',
      sel: { alias: 'puncaoPiloto1_total' },
    }],
    ['material', {
      usa: 'puncoesAco',
      sel: { grupo: 'puncaoPiloto1' },
    }],

    ['cilindro', {
      origemId: 235,
      raio: 0.04,
      altura: 0.38,
      lados: 16,
    }],
    ['transladar', {
      d: [-0.525, 1.2, -0.12],
      sel: { alias: 'puncaoPiloto2_total' },
    }],
    ['parte', {
      nome: 'puncaoPiloto2',
      sel: { alias: 'puncaoPiloto2_total' },
    }],
    ['material', {
      usa: 'puncoesAco',
      sel: { grupo: 'puncaoPiloto2' },
    }],

    // 4. Estação 2: Punções de Desponte / Recorte de Borda
    ['cubo', {
      origemId: 240,
      larg: 0.18,
      alt: 0.38,
      prof: 0.12,
    }],
    ['transladar', {
      d: [-0.175, 1.2, 0.18],
      sel: { origem: { op: 'cubo', id: 240 } },
    }],
    ['parte', {
      nome: 'puncaoDesponteDir',
      sel: { origem: { op: 'cubo', id: 240 } },
    }],
    ['material', {
      usa: 'puncoesAco',
      sel: { grupo: 'puncaoDesponteDir' },
    }],

    ['cubo', {
      origemId: 245,
      larg: 0.18,
      alt: 0.38,
      prof: 0.12,
    }],
    ['transladar', {
      d: [-0.175, 1.2, -0.18],
      sel: { origem: { op: 'cubo', id: 245 } },
    }],
    ['parte', {
      nome: 'puncaoDesponteEsq',
      sel: { origem: { op: 'cubo', id: 245 } },
    }],
    ['material', {
      usa: 'puncoesAco',
      sel: { grupo: 'puncaoDesponteEsq' },
    }],

    // 5. Estação 3: Punção de Dobra / Conformação em V
    ['cubo', {
      origemId: 250,
      larg: 0.22,
      alt: 0.38,
      prof: 0.28,
    }],
    ['transladar', {
      d: [0.175, 1.2, 0],
      sel: { origem: { op: 'cubo', id: 250 } },
    }],
    ['parte', {
      nome: 'puncaoDobraV',
      sel: { origem: { op: 'cubo', id: 250 } },
    }],
    ['material', {
      usa: 'puncaoDobra',
      sel: { grupo: 'puncaoDobraV' },
    }],

    // 6. Estação 4: Punção / Lâmina de Corte Final
    ['cubo', {
      origemId: 260,
      larg: 0.12,
      alt: 0.38,
      prof: 0.34,
    }],
    ['transladar', {
      d: [0.525, 1.2, 0],
      sel: { origem: { op: 'cubo', id: 260 } },
    }],
    ['parte', {
      nome: 'puncaoCorteFinal',
      sel: { origem: { op: 'cubo', id: 260 } },
    }],
    ['material', {
      usa: 'puncoesAco',
      sel: { grupo: 'puncaoCorteFinal' },
    }],

    // 7. Placa Extratora Superior
    ['cubo', {
      origemId: 270,
      larg: 1.4,
      alt: 0.08,
      prof: 0.65,
    }],
    ['transladar', {
      d: [0, 0.85, 0],
      sel: { origem: { op: 'cubo', id: 270 } },
    }],
    ['parte', {
      nome: 'placaExtratora',
      sel: { origem: { op: 'cubo', id: 270 } },
    }],
    ['material', {
      usa: 'placaExtratora',
      sel: { grupo: 'placaExtratora' },
    }],

    // 8. Portas de Entrada e Saída
    ['publicarPorta', {
      id: 'portaAlimentacaoTira',
      rotulo: 'portaAlimentacaoTira',
      de: { op: 'cubo', id: 210, face: 'esquerda' },
    }],
    ['publicarPorta', {
      id: 'portaDescargaPecas',
      rotulo: 'portaDescargaPecas',
      de: { op: 'cubo', id: 210, face: 'direita' },
    }],
  ],
};
