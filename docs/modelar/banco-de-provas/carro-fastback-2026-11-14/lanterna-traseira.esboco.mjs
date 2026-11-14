/* lanterna-traseira.esboco.mjs — três lanternas para a traseira do fastback genérico (2026-11-14), vistas de trás, para a pessoa
 * escolher o traço que troca o da referência. Em disputa: o desenho da lanterna e do painel entre elas. Igual nas três: a traseira
 * de 1900 mm, a borda da tampa em y 1060, o para-choque abaixo de y 700, o difusor e o lugar da placa. Nenhuma opção tem três
 * barras verticais por lado nem o painel escuro de ponta a ponta, que são os traços da referência a trocar. */
import { COR, esboco, placa, ret } from './tracos-comum.mjs';

const BASE = [
  placa('traseira', ret(-950, 700, 950, 1060), { raio: 60, saida: 40, z0: -40, cor: COR.lataria }),
  placa('labio', ret(-900, 1060, 900, 1100), { raio: 15, saida: 70, z0: -40, cor: COR.lataria }),
  placa('parachoque', ret(-960, 330, 960, 700), { raio: 70, saida: 60, z0: -40, cor: COR.lataria }),
  placa('difusor', [[-700, 330], [700, 330], [620, 450], [-620, 450]], { raio: 20, saida: 8, z0: 20, cor: COR.escuro }),
  placa('placa', ret(-260, 520, 260, 650), { raio: 8, saida: 4, z0: 20, cor: COR.claro }),
];

const OPCOES = [
  { titulo: '1: faixa contínua', nota: 'Uma faixa de luz fina, de 50 mm, de um lado ao outro, logo abaixo do lábio, com as pontas mais altas onde dobra a quina.',
    formas: [
      placa('faixa', ret(-760, 960, 760, 1010), { raio: 20, saida: 8, cor: COR.lente }),
      placa('ponta', [[760, 930], [900, 950], [900, 1030], [760, 1010]], { raio: 14, saida: 9, cor: COR.lente, espelha: true }),
    ] },
  { titulo: '2: blocos horizontais', nota: 'Um bloco horizontal por lado, de 450 por 120 mm, com duas tiras de luz deitadas e a lataria entre os dois blocos.',
    formas: [
      placa('moldura', [[450, 890], [900, 905], [900, 1025], [450, 1010]], { raio: 28, saida: 6, cor: COR.escuro, espelha: true }),
      placa('tiraDeCima', [[475, 968], [878, 980], [878, 1008], [475, 996]], { raio: 10, saida: 4, z0: 6, cor: COR.lente, espelha: true }),
      placa('tiraDeBaixo', [[475, 908], [878, 920], [878, 948], [475, 936]], { raio: 10, saida: 4, z0: 6, cor: COR.lente, espelha: true }),
    ] },
  { titulo: '3: em L', nota: 'Um L por lado: o braço de cima corre 480 mm sob o lábio e a perna desce 185 mm pela quina; a lataria ocupa o meio.',
    formas: [
      placa('lanterna', [[420, 975], [900, 975], [900, 790], [820, 790], [820, 925], [420, 925]], { raio: 16, saida: 8, cor: COR.lente, espelha: true }),
    ] },
];

export default esboco(BASE, OPCOES);
