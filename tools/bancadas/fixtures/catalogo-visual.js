/* catalogo-visual.js — fixtures mínimas do harness privado.
 *
 * Nenhuma destas receitas é publicação ou exemplo de produto. Elas existem
 * somente para provar que a bancada, o adaptador e os gates visuais continuam
 * funcionando quando o catálogo homologado está vazio.
 */

const publicar = (nome, de) => ['publicarPorta', { nome, de }];
const parte = (nome, origem, pai) => ['parte', {
  nome, sel: { origem }, ...(pai ? { pai } : {}),
}];

export const visual = {
  meta: { nome: 'Fixture visual' },
  PASSOS: [
    ['cubo', { origemId: 100, larg: 1.2, alt: 0.25, prof: 0.8 }],
    parte('base', { op: 'cubo', id: 100 }),
    ['cubo', { origemId: 101, larg: 0.55, alt: 0.55, prof: 0.55 }],
    ['transladar', { d: [0, 0.4, 0], sel: { origem: { op: 'cubo', id: 101 } } }],
    parte('tampa', { op: 'cubo', id: 101 }),
  ],
};

export const hierarquia = {
  meta: { nome: 'Fixture de hierarquia' },
  PASSOS: [
    ['cubo', { origemId: 110, larg: 1.2, alt: 0.2, prof: 0.8 }],
    parte('pinca', { op: 'cubo', id: 110 }),
    ['cubo', { origemId: 111, larg: 0.25, alt: 0.12, prof: 0.35 }],
    ['transladar', { d: [-0.25, 0.2, 0], sel: { origem: { op: 'cubo', id: 111 } } }],
    parte('pastilhaInterna', { op: 'cubo', id: 111 }, 'pinca'),
    ['cubo', { origemId: 112, larg: 0.25, alt: 0.12, prof: 0.35 }],
    ['transladar', { d: [0.25, 0.2, 0], sel: { origem: { op: 'cubo', id: 112 } } }],
    parte('pistao', { op: 'cubo', id: 112 }, 'pinca'),
  ],
};

export const portas = {
  meta: { nome: 'Fixture de portas' },
  PASSOS: [
    ['chamferBox', { origemId: 400, larg: 2, alt: 0.2, prof: 1, chanfro: 0.04 }],
    parte('base', { op: 'chamferBox', id: 400 }),
    publicar('basePrincipal', { op: 'chamferBox', id: 400 }),
    publicar('bordaDaBase', { op: 'chamferBox', id: 400, aresta: 3 }),
    ['plano', { origemId: 402, largura: 1.6, profundidade: 0.7, seg: 2 }],
    parte('superficie', { op: 'plano', id: 402 }),
    publicar('superficieDoLeito', { op: 'plano', id: 402 }),
    publicar('faixaDoLeito', { op: 'plano', id: 402, faixa: 'ultima' }),
    ['transladar', { d: [0, 0.35, 0], sel: { origem: { op: 'plano', id: 402 } } }],
    ['esfera', { origemId: 401, raio: 0.25, aneis: 4, lados: 8 }],
    parte('volume', { op: 'esfera', id: 401 }),
    publicar('baseDoVolume', { op: 'esfera', id: 401, faixa: 'ultima' }),
    ['cilindro', { origemId: 404, raio: 0.1, altura: 0.7, lados: 8 }],
    parte('cilindro', { op: 'cilindro', id: 404 }),
    ['publicarPorta', {
      id: 'baseDoCilindro', rotulo: 'Base do cilindro',
      de: { op: 'cilindro', id: 404, tampa: 'fundo' },
    }],
    publicar('topoDoCilindro', { op: 'cilindro', id: 404, tampa: 'topo' }),
    ['cone', { origemId: 405, raio: 0.18, altura: 0.3, lados: 8 }],
    parte('cone', { op: 'cone', id: 405 }),
    publicar('baseDoCone', { op: 'cone', id: 405, tampa: 'fundo' }),
  ],
};

export const semPortas = {
  meta: { nome: 'Fixture sem portas' },
  PASSOS: [
    ['cubo', { origemId: 120, larg: 1.1, alt: 0.7, prof: 0.8 }],
    parte('carcaca', { op: 'cubo', id: 120 }),
    ['cubo', { origemId: 121, larg: 0.5, alt: 0.08, prof: 0.4 }],
    ['transladar', { d: [0, 0.4, 0], sel: { origem: { op: 'cubo', id: 121 } } }],
    parte('anteparo', { op: 'cubo', id: 121 }),
  ],
};
