/* carro-quadrado/lataria/receita/acabamentos.js — abas estampadas dos 4 arcos de roda (Bloco 5A), borrachas/plásticos dos vidros (5B) e retrovisores (5C). */
import { conformarNaChapa } from '../../../../../nucleo/conformar-na-chapa.js';
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

/* gera uma aba estampada larga e suave ao redor de um arco de roda no lado +x via conformarNaChapa (perfil 2D livre + modulação) */
function passoAbaArco(T, id, zC, yC, R) {
  const SEG = 24;
  const rCentro = R + 24;
  const trilho = [];
  for (let s = 0; s <= SEG; s += 1) {
    const t = s / SEG;
    const ang = -0.05 + (Math.PI + 0.10) * t;
    const z = zC + rCentro * Math.cos(ang);
    const y = Math.max(258, yC + rCentro * Math.sin(ang));
    trilho.push([y, z]);
  }

  /* amostrador analítico da pele externa da lateral com normal suavizada por diferenças finitas */
  const malha = ([y, z]) => {
    const x = xPeleLateral(T, z, y);
    const dxdy = (xPeleLateral(T, z, y + 4) - xPeleLateral(T, z, y - 4)) / 8;
    const dxdz = (xPeleLateral(T, z + 4, y) - xPeleLateral(T, z - 4, y)) / 8;
    return { ponto: [x, y, z], normal: [1, -dxdy, -dxdz] };
  };

  /* perfil 2D [su (normal +x), sv (radial para dentro do arco)] em mm:
     faixa larga de 58 mm, transição suave na borda externa, ombro pleno (+12.5 mm) e aba interna (-16 mm) */
  const perfil = [
    [-2.5, -34],
    [4.5, -18],
    [12.5, 2],
    [10.5, 22],
    [-16.0, 24],
    [-14.0, -2],
  ];

  const res = conformarNaChapa({
    malha,
    vista: 'x',
    sentido: '+',
    trilho,
    perfil,
    modulacao: [[0, 0.35], [0.16, 1], [0.84, 1], [1, 0.35]],
    amostragemMm: 35,
    niveis: 1,
    origemId: id,
    nome: `arco_${id}`,
    parte: false,
  });

  /* converte a gaiola nomeada para vértices/faces inline (compatível com passosAcabamentos sem TOPO externo) */
  const nomesV = Object.keys(res.pontos);
  const mapaV = new Map(nomesV.map((nome, idx) => [nome, idx]));
  const vertices = nomesV.map((nome) => res.pontos[nome].map(m));
  const faces = res.gaiola.faces.map((f) => f.map((nome) => mapaV.get(nome)));
  return ['subdivisao', { origemId: id, niveis: 1, vertices, faces, liso: 35 }];
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
