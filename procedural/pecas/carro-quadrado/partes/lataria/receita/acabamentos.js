/* carro-quadrado/lataria/receita/acabamentos.js — acabamentos das portas (coluna do quebra-vento). Os arcos de roda são estampados na própria malha em chapa.js. */
import { m } from './chapa.js';

export function passosAcabamentos(_T, proxId) {
  const passos = [];

  /* coluna vertical fina do quebra-vento (ventarola) acompanhando o tumblehome do vidro da porta */
  const xVidroPorta = (y) => 772 - ((y - 956) / (1312 - 956)) * (772 - 626);
  for (const [sinal, partePorta] of [[1, 'portaDireita'], [-1, 'portaEsquerda']]) {
    const idQV = proxId();
    const y0 = 956; const y1 = 1132;
    const x0Out = xVidroPorta(y0) + 4; const x0In = xVidroPorta(y0) - 9;
    const x1Out = xVidroPorta(y1) + 4; const x1In = xVidroPorta(y1) - 9;
    const z0 = 440; const z1 = 456;
    const vQV = [
      [m(sinal * x0In), m(y0), m(z0)], [m(sinal * x0Out), m(y0), m(z0)], [m(sinal * x0Out), m(y0), m(z1)], [m(sinal * x0In), m(y0), m(z1)],
      [m(sinal * x1In), m(y1), m(z0)], [m(sinal * x1Out), m(y1), m(z0)], [m(sinal * x1Out), m(y1), m(z1)], [m(sinal * x1In), m(y1), m(z1)],
    ];
    const fBox = sinal > 0
      ? [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]]
      : [[3, 2, 1, 0], [4, 5, 6, 7], [1, 5, 4, 0], [2, 6, 5, 1], [3, 7, 6, 2], [0, 4, 7, 3]];
    passos.push(['subdivisao', { origemId: idQV, niveis: 0, vertices: vQV, faces: fBox }]);
    passos.push(['parte', { nome: partePorta, material: 'borrachaVidro', sel: { origem: { op: 'subdivisao', id: idQV } } }]);
  }

  return passos;
}
