/* grade-dianteira.esboco.mjs — três contornos de grade para a frente do fastback genérico (2026-11-14), vistos de frente. Em
 * disputa: o contorno da grade de cima e a relação dela com a entrada de baixo. Igual nas três: a frente de 1900 mm, a boca do
 * capô em y 820, os faróis afilados, os faróis de neblina e o lábio de baixo. Nenhuma opção tem o hexágono largo da referência. */
import { COR, esboco, laminas, placa, ret } from './tracos-comum.mjs';

const BASE = [
  placa('frente', ret(-950, 250, 950, 820), { raio: 80, saida: 40, z0: -40, cor: COR.lataria }),
  placa('capo', [[-900, 820], [900, 820], [820, 960], [-820, 960]], { raio: 30, saida: 40, z0: -70, cor: COR.lataria }),
  placa('farol', [[520, 700], [900, 730], [900, 800], [560, 770]], { raio: 14, saida: 6, cor: COR.claro, espelha: true }),
  placa('neblina', ret(640, 330, 860, 420), { raio: 20, saida: 6, cor: COR.escuro, espelha: true }),
  placa('labio', ret(-930, 215, 930, 250), { raio: 10, saida: 70, z0: -40, cor: COR.escuro }),
];

const OPCOES = [
  { titulo: '1: trapézio baixo', nota: 'Uma boca só, mais larga em cima (1.040 mm) que embaixo (860), de cantos redondos, entre os faróis; entrada de baixo fina e separada.',
    formas: [
      placa('grade', [[-430, 520], [430, 520], [520, 720], [-520, 720]], { raio: 34, saida: 6, cor: COR.escuro }),
      laminas('laminas', 400, 560, 40, 4),
      placa('entrada', ret(-520, 320, 520, 400), { raio: 24, saida: 6, cor: COR.escuro }),
    ] },
  { titulo: '2: oval largo', nota: 'Um retângulo de pontas redondas, de 1.100 por 170 mm, com lâminas deitadas; entrada de baixo da mesma largura.',
    formas: [
      placa('grade', ret(-550, 545, 550, 715), { raio: 80, saida: 6, cor: COR.escuro }),
      laminas('laminas', 470, 590, 40, 3),
      placa('entrada', ret(-550, 320, 550, 420), { raio: 45, saida: 6, cor: COR.escuro }),
    ] },
  { titulo: '3: fenda e boca baixa', nota: 'Entre os faróis só uma fenda de 60 mm; a boca principal fica embaixo, no para-choque, mais larga na base (1.160 mm) que no topo (900).',
    formas: [
      placa('fenda', ret(-470, 700, 470, 760), { raio: 22, saida: 6, cor: COR.escuro }),
      placa('grade', [[-580, 310], [580, 310], [450, 600], [-450, 600]], { raio: 34, saida: 6, cor: COR.escuro }),
      laminas('laminas', 430, 360, 55, 4),
    ] },
];

export default esboco(BASE, OPCOES);
