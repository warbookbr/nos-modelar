/* coluna-sobre-disco — a peça de teste do plano dos limites do sólido por laços: um disco de eixo z (raio 78 mm, espessura 156 mm) e um
 * cilindro de 156 mm de diâmetro e eixo y que sobe dele, tangente às duas faces, com o topo plano a 477 mm do fundo do disco, chanfro
 * de 2 mm na borda do disco e no topo, e filete de raio nominal 12 mm no encontro. É uma malha só por subdivisão da gaiola que
 * `gaiolaPorLacos` monta de laços cortados ao longo do eixo do cilindro (a forma e os laços estão em `coluna-forma.js`). As duas
 * partes, o disco (`pe`) e o cilindro (`coluna`), saem dos grupos de faces da gaiola, cada um de uma faixa de laços: o disco vai do
 * fundo (y = -78) ao plano em que o disco acaba (y = 78), e o cilindro vai daí ao topo. As medidas estão em
 * `docs/modelar/banco-de-provas/limites-do-solido-por-lacos-2026-11-05/README.md`. */
import { TABELA, derivar } from './coluna-forma.js';

export { TABELA };

export function gerarPassos(T = TABELA) {
  const { passo } = derivar(T);
  return [
    ['subdivisao', { origemId: 1, ...passo, niveis: T.niveis }],
    ['parte', { nome: 'coluna', sel: { origem: { op: 'subdivisao', id: 1, parte: 'coluna' } } }],
    ['parte', { nome: 'pe', sel: { origem: { op: 'subdivisao', id: 1, parte: 'pe' } } }],
  ];
}

export const PLANO = {
  objeto: 'peça de teste: disco de eixo z e cilindro de eixo y que sobe dele, tangente às duas faces, numa malha só por subdivisão de uma gaiola de laços cortados ao longo do eixo do cilindro',
  referencias: ['referencias/alvo-da-coluna.md'],
  escala: { medida: 'diâmetro do cilindro, igual ao do disco', milimetros: 156 },
  partes: [
    { nome: 'pe', forma: 'disco de 156 mm de diâmetro e 156 mm de espessura, com chanfro de 2 mm nas duas faces, e o filete de 12 mm no encontro com o cilindro', tecnica: 'grupo da gaiola de gaiolaPorLacos: os laços do fundo do disco ao plano em que ele acaba' },
    { nome: 'coluna', forma: 'cilindro de 156 mm de diâmetro, topo plano a 477 mm do fundo do disco, chanfro de 2 mm no topo', tecnica: 'grupo da gaiola de gaiolaPorLacos: os laços do plano em que o disco acaba ao topo' },
  ],
  criteriosDeReprovacao: [
    'emenda, faixa de sombra ou degrau entre o disco e o cilindro',
    'malha aberta, com aresta sem par, vínculo não manifold, triângulo sem área ou lasca',
    'chanfro de 2 mm com mais de 0,5 mm de erro, ou filete do encontro a mais de 0,5 mm do declarado',
    'superfície que sai da face do disco ou da parede do cilindro mais de 0,5 mm',
  ],
};

export default {
  meta: { nome: 'coluna-sobre-disco', desc: 'disco e cilindro que sobe dele numa malha só por subdivisão da gaiola de laços cortados ao longo do eixo do cilindro' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro do disco; o eixo do disco é z, o cilindro sobe em y, z de 0 a 156', ...derivar(this.PARAMS).pontos }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
  PLANO,
};
