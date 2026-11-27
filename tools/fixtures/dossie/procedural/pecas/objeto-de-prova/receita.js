/* receita de fixture do dossiê: duas partes, uma com sólido modificado e unido. */
export const PLANO = {
  objeto: 'caixa de prova com tampa',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'largura da caixa', milimetros: 200 },
  partes: [
    { nome: 'caixa', forma: 'caixa aberta de parede fina', tecnica: 'cubo menos cubo menor' },
    { nome: 'tampa', forma: 'placa que cobre a caixa' },
  ],
  criteriosDeReprovacao: ['parede mais fina que 2 mm', 'tampa que não cobre a caixa'],
};
const o = (op, id) => ({ origem: { op, id } });
export default {
  PLANO,
  PASSOS: [
    ['cubo', { origemId: 1, larg: 0.2, alt: 0.1, prof: 0.2 }],
    ['cubo', { origemId: 2, larg: 0.196, alt: 0.1, prof: 0.196 }],
    ['transladar', { d: [0, 0.002, 0], sel: o('cubo', 2) }],
    ['subtrair', { origemId: 3, solidos: [o('cubo', 1), o('cubo', 2)] }],
    ['cubo', { origemId: 4, larg: 0.2, alt: 0.004, prof: 0.2 }],
    ['parte', { nome: 'caixa', sel: o('subtrair', 3) }],
    ['parte', { nome: 'tampa', sel: o('cubo', 4) }],
    ['material', { usa: 'madeira', sel: { grupo: 'caixa' } }],
    ['liso', { angulo: 40, sel: { grupo: 'tampa' } }],
  ],
};
