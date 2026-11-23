/* carro-quadrado/lataria/receita/acabamentos.js — abas estampadas dos 4 arcos de roda (Bloco 5A), borrachas/plásticos dos vidros (5B) e retrovisores (5C). */
import { m } from './chapa.js';

/* interpola x(z, y) da pele externa da chapa a partir de TABELA.secoes (em mm) */
function xPeleLateral(T, z, y) {
  const zs = T.estacoes;
  let i0 = 0;
  for (let i = 0; i < zs.length - 1; i += 1) {
    if (z <= zs[i] && z >= zs[i + 1]) { i0 = i; break; }
  }
  const zA = zs[i0];
  const zB = zs[i0 + 1];
  const tz = zA === zB ? 0 : Math.max(0, Math.min(1, (zA - z) / (zA - zB)));
  const xEmSecao = (sec) => {
    for (let j = 0; j < 4; j += 1) {
      const [x0, y0] = sec[j];
      const [x1, y1] = sec[j + 1];
      if (y <= y1 || j === 3) {
        const ty = y1 === y0 ? 0 : Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
        return x0 + (x1 - x0) * ty;
      }
    }
    return sec[0][0];
  };
  const xA = xEmSecao(T.secoes[String(zA)]);
  const xB = xEmSecao(T.secoes[String(zB)]);
  return xA + (xB - xA) * tz;
}

/* gera uma aba estampada circular fechada (sólido manifold) ao redor de um arco de roda no lado +x */
function passoAbaArco(T, id, zC, yC, R) {
  const SEG = 28;
  /* seção transversal de 6 pontos [dr, dxRelativo] em mm:
     0 = borda externa enterrada na chapa, 1 = dobra/ombro externo, 2 = crista saliente da aba,
     3 = quina da boca do arco, 4 = dobra interna para dentro da caixa de roda, 5 = fechamento traseiro oculto */
  const N_PROF = 6;
  const verts = [];
  const faces = [];

  for (let s = 0; s <= SEG; s += 1) {
    const t = s / SEG;
    const ang = -0.06 + (Math.PI + 0.12) * t; // leve extensão abaixo do centro até y = 258
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    /* relevo pleno (+14 mm) no topo e ombros do arco, afinando suavemente nas pontas inferiores junto aos para-choques/soleira */
    const sinPos = Math.max(0.05, Math.sin(Math.max(0.05, Math.min(Math.PI - 0.05, ang))));
    const fade = Math.pow(sinPos, 0.45);
    const perfil = [
      [38, -4.0],
      [27, 4.5 * fade],
      [13, 14.0 * fade],
      [0.5, 11.5 * fade],
      [-1.0, -18.0],
      [20, -16.0],
    ];
    for (let k = 0; k < N_PROF; k += 1) {
      const r = R + perfil[k][0];
      const z = zC + r * cos;
      const y = Math.max(258, yC + r * sin);
      const x = xPeleLateral(T, z, y) + perfil[k][1];
      verts.push([m(x), m(y), m(z)]);
    }
  }

  const idx = (s, k) => s * N_PROF + k;
  for (let s = 0; s < SEG; s += 1) {
    for (let k = 0; k < N_PROF; k += 1) {
      const kNext = (k + 1) % N_PROF;
      faces.push([idx(s, k), idx(s + 1, k), idx(s + 1, kNext), idx(s, kNext)]);
    }
  }
  /* tampas nas duas pontas (s = 0 e s = SEG) */
  faces.push([idx(0, 0), idx(0, 5), idx(0, 4), idx(0, 3), idx(0, 2), idx(0, 1)]);
  faces.push([idx(SEG, 0), idx(SEG, 1), idx(SEG, 2), idx(SEG, 3), idx(SEG, 4), idx(SEG, 5)]);

  return ['subdivisao', { origemId: id, niveis: 1, vertices: verts, faces, liso: 35 }];
}

export function passosAcabamentos(T, proxId) {
  const passos = [];
  const emitirArcoPar = (arco) => {
    const id = proxId();
    const o = { op: 'subdivisao', id };
    passos.push(passoAbaArco(T, id, arco.z, arco.y, arco.raio));
    const idE = proxId();
    passos.push(['espelha', { eixo: 'x', origemId: idE, derivaDe: o, sel: { origem: o } }]);
    passos.push(['parte', { nome: 'arcosEstampados', material: 'lataria', sel: { origem: o } }]);
    passos.push(['parte', { nome: 'arcosEstampados', material: 'lataria', sel: { origem: { op: 'espelha', id: idE, de: o } } }]);
  };

  emitirArcoPar(T.arcos.dianteiro);
  emitirArcoPar(T.arcos.traseiro);

  /* plásticos específicos das janelas das portas: coluna vertical do quebra-vento (ventarola) + triângulo plástico base do retrovisor */
  /* a janela da porta sobe em tumblehome de x = 772 (em y = 956) até x = 626 (em y = 1312) */
  const xVidroPorta = (y) => 772 - ((y - 956) / (1312 - 956)) * (772 - 626);
  for (const [sinal, partePorta] of [[1, 'portaDireita'], [-1, 'portaEsquerda']]) {
    /* 1. Coluna vertical fina do quebra-vento (z = 440..456, y = 956..1132) acompanhando o tumblehome do vidro */
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
