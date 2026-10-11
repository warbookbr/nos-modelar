/* suporte.js — a receita de prova do refinamento da forma global.
 *
 * Um suporte pequeno que refina `andaime.json`: a sapata refina o volume `sapata`, a coluna refina `coluna-central`, e o
 * assento do topo da coluna é a porta que o andaime declara. Cada pasta ao lado (`ok`, `parte-fora`, `porta-movida`,
 * `parte-sem-volume`) é uma receita de uma linha que chama esta função com um defeito diferente, para o teste provar que
 * a mesma receita passa inteira e é recusada com a parte deslocada, a porta movida ou uma parte sem volume.
 *
 * ELA NÃO É CONTEÚDO. Mora em `tools/fixtures/`, fora do acervo publicado; `guarda:acervo` não a varre. */

const m = (mm) => mm / 1000;

export function receitaDoSuporte({
  sapataEmX = 0, portaY = 200, vinculo = { sapata: 'sapata', coluna: 'coluna-central' }, tolerancia = { envelope: 2, porta: 0.5 },
  /* `alvo: true` liga o G01 sobre a malha (REFINA.alvo) e `razoes` declara RAZOES, as duas para o veredito conferir a forma */
  alvo = false, razoes = null,
} = {}) {
  return {
    meta: { nome: 'refina-forma-global/suporte', desc: 'suporte de prova do refinamento da forma global' },
    PLANO: {
      objeto: 'suporte com sapata quadrada e coluna central redonda, para provar o refinamento do andaime',
      referencias: ['../andaime.json'],
      escala: { medida: 'lado da sapata', milimetros: 200 },
      partes: [
        { nome: 'sapata', forma: 'caixa quadrada de 200 mm de lado e 20 mm de altura, apoiada no chão', tecnica: 'caixa' },
        { nome: 'coluna', forma: 'cilindro de 80 mm de diâmetro e 180 mm de altura, sobre o centro da sapata', tecnica: 'cilindro' },
      ],
      criteriosDeReprovacao: [
        'a sapata ou a coluna saem do volume que o andaime reservou para elas',
        'o assento do topo da coluna fora do lugar que o andaime declarou',
      ],
    },
    REFINA: { andaime: '../andaime.json', ...(alvo ? { alvo: '../alvo.json' } : {}), partes: vinculo, tolerancia },
    ...(razoes ? { RAZOES: razoes } : {}),
    contatos: [{ par: ['coluna', 'sapata'], motivo: 'a coluna nasce sobre o centro da sapata, apoiada no topo dela' }],
    PASSOS: [
      ['cubo', { origemId: 1, larg: m(200), alt: m(20), prof: m(200), em: [m(sapataEmX), 0, 0] }],
      ['parte', { nome: 'sapata', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cilindro', { origemId: 2, raio: m(40), altura: m(180), lados: 32, em: [0, m(20), 0] }],
      ['parte', { nome: 'coluna', sel: { origem: { op: 'cilindro', id: 2 } } }],
      ['parte', { nome: 'coluna', sel: { origem: { op: 'cilindro', id: 2, tampa: 'topo' } } }],
      ['parte', { nome: 'coluna', sel: { origem: { op: 'cilindro', id: 2, tampa: 'fundo' } } }],
      ['publicarPorta', {
        nome: 'assento', de: { op: 'cilindro', id: 2, tampa: 'topo' },
        interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, m(portaY), 0], raioInterno: 0, raioExterno: m(40), inicio: -m(5), fim: 0 },
      }],
    ],
  };
}
