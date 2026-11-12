/* receita-de-prova.js — a receita de prova da contagem de faces finas da medição da rodada.
 *
 * Uma chapa de 200 x 200 mm. Com `espessura` de 0,2 mm, as quatro faces de borda têm área / maior aresta² de 0,001, abaixo do limite de
 * face fina (0,003); com 20 mm elas são faces comuns. `lataria` declara a peça como chapa de lataria. ELA NÃO É CONTEÚDO: mora em
 * `tools/fixtures/`, fora do acervo publicado. */
const m = (mm) => mm / 1000;

export function receitaDaChapa({ espessura = 20, lataria = false } = {}) {
  return {
    meta: { nome: 'faces-finas/chapa', desc: 'chapa de prova da contagem de faces finas' },
    TOPO: { origem: 'centro do fundo da chapa, no chão; y para cima' },
    PLANO: {
      objeto: 'chapa quadrada de prova, para contar as faces finas da malha na medição da rodada',
      referencias: ['../../refina-forma-global/andaime.json'],
      escala: { medida: 'lado da chapa', milimetros: 200 },
      partes: [{ nome: 'chapa', forma: 'caixa quadrada de 200 mm de lado, apoiada no chão', tecnica: 'caixa' }],
      criteriosDeReprovacao: ['a chapa tem outra largura que a de 200 mm que o plano declara'],
      ...(lataria ? { lataria: { partes: ['chapa'] } } : {}),
    },
    PASSOS: [
      ['cubo', { origemId: 1, larg: m(200), alt: m(espessura), prof: m(200) }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'cubo', id: 1 } } }],
    ],
  };
}
