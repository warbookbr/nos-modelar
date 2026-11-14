/* tomadas-do-capo.esboco.mjs — três desenhos de capô para o fastback genérico (2026-11-14), vistos de cima com a frente do carro
 * para baixo: x é a largura e y corre da ponta do capô (0) ao pé do para-brisa (1300). Em disputa: quantas aberturas o capô tem
 * e onde. Igual nas três: o contorno do capô, o ressalto central entre dois vincos e o para-brisa. Nenhuma opção tem as duas
 * tomadas em cunha no terço da frente, que são o traço da referência a trocar. */
import { COR, esboco, placa, ret } from './tracos-comum.mjs';

const BASE = [
  placa('capo', [[-760, 0], [760, 0], [850, 1300], [-850, 1300]], { raio: 90, saida: 30, z0: -30, cor: COR.lataria }),
  placa('ressalto', [[-250, 60], [250, 60], [400, 1280], [-400, 1280]], { raio: 50, saida: 10, cor: '#bb433c' }),
  placa('parabrisa', ret(-800, 1320, 800, 1480), { raio: 30, saida: 10, z0: -30, cor: '#59636b' }),
];

const OPCOES = [
  { titulo: '1: capô liso', nota: 'Nenhuma abertura: só o ressalto central entre os dois vincos.', formas: [] },
  { titulo: '2: saída central', nota: 'Uma saída de ar só, no meio do ressalto, de 520 por 130 mm, mais larga atrás, com três lâminas.',
    formas: [
      placa('saida', [[-220, 620], [220, 620], [260, 750], [-260, 750]], { raio: 22, saida: 4, z0: 10, cor: COR.escuro }),
      { id: 'laminasDaSaida', op: 'cubo', args: { larg: 400, alt: 10, prof: 6 }, centro: [0, 652, 17], cor: COR.lamina, repete: { total: 3, d: [0, 33, 0] } },
    ] },
  { titulo: '3: duas fendas atrás', nota: 'Duas fendas finas, de 290 por 40 mm, fora do ressalto e junto do para-brisa, inclinadas com a borda do capô.',
    formas: [
      placa('fenda', [[470, 1040], [760, 1090], [760, 1130], [470, 1080]], { raio: 12, saida: 4, cor: COR.escuro, espelha: true }),
    ] },
];

export default esboco(BASE, OPCOES);
