/* alvo.mjs: o alvo do segundo ciclo de alta definição do sedã (fatia 4c do plano do núcleo para qualquer mecanismo). O trecho é o do
 * primeiro ciclo: o corpo de baixo do lado direito, da linha de cintura para baixo, do para-lama dianteiro à lateral traseira, mais a
 * faixa de cima do para-lama e a metade direita do capô, sem a tomada de ar. O alvo do primeiro ciclo está em `ciclo-1/alvo.mjs`.
 *
 * Os números de `T` são os do rascunho facetado (`../referencias/sedan-chassi-e-lataria.esboco.mjs`), salvo a planta entre os arcos de
 * roda. No rascunho o para-lama perde 73 mm de meia largura em 311 mm de comprimento (de z 871 a 560, e de z -800 a -560 atrás), o que
 * na chapa lisa deu as duas falhas de ondulação do primeiro ciclo (2,3 e 1,9 mm). Aqui a transição do para-lama para a porta foi
 * redesenhada, com o aceite de quem conduz o ciclo: a meia largura dos arcos é a do rascunho e a volta à largura da cabine leva cerca
 * de 600 mm, de modo que a frente da porta dianteira e o fim da porta traseira ainda carregam o resto do alargamento.
 *
 * Eixos do rascunho: x lateral (direita em +x), y altura com o chão em 0, z comprimento com a frente em +z. Tudo em mm. */

export const T = {
  chapa: 1,
  vao: 4,
  /* do rascunho */
  ladoTopo: [[2122, 970], [1879, 1000], [-1421, 1000], [-2087, 972]],
  ladoFundo: [[2122, 419], [-1581, 419], [-2087, 460]],
  meiaDaCabine: 860,
  roda: { raio: 364, zFrente: 1249, zTras: -1181, folgaDoArco: 40 },
  zFrente: 1990, zTras: -2000, xCapo: 760, zCapo: 690, zPortas: -45, zLateral: -760, ySoleira: 470,
  /* a borda de trás do capô, 52 mm à frente da linha do para-lama com a porta (no rascunho as duas ficam em z 690). É contorno: a linha de
     vão por curva que corre sobre a borda de uma faixa e acaba num canto de borda deixa uma ponte na pele de dentro, e o para-lama e a
     porta saem no mesmo pedaço (CICLO-2.md, atrito 1, em correção no núcleo). Com a borda adiante, a linha cruza a faixa e acaba em borda reta */
  zPeDoCapo: 742,
  /* a planta: as pontas e os arcos são do rascunho, e as duas transições para a porta são deste ciclo */
  planta: [[2122, 770], [2060, 852], [2000, 872], [1700, 926], [1421, 934], [1146, 933], [950, 922], [800, 904], [650, 884], [500, 868], [380, 861], [260, 860],
    [-250, 860], [-380, 863], [-500, 872], [-650, 889], [-800, 908], [-1000, 923], [-1237, 928], [-1650, 911], [-1925, 888], [-2087, 880]],
  /* a forma da chapa lisa, como no primeiro ciclo */
  yOmbro: 890,          /* a quina do ombro: acima dela a lateral é a da cabine, abaixo dela o para-lama alarga até a planta */
  yAlargado: 605,       /* a altura em que o alargamento do para-lama chega à planta; no primeiro ciclo era 700, com a seção em parábola */
  bojo: 6,              /* flecha da lateral na altura, em mm, com o máximo em y 710 */
  flechaDoCapo: 8,      /* flecha do topo na largura, em mm, com o máximo no meio do carro */
  raioDaCintura: 6,     /* raio pedido na quina do topo com a lateral (a linha de cintura, que na frente é o capô com o para-lama) */
  /* a quina do ombro é rasa (de 34 graus de dobra onde o para-lama mais alarga a zero nas portas). O raio dela é pedido pela distância do
     apoio, que fica constante: o raio é de 9 mm onde a dobra é maior e cresce à medida que a dobra some, e a quina morre sem acabar */
  apoioDoOmbro: 4,
  raioMinimoDoOmbro: 3,
  /* o lábio do arco de roda: a chapa vira para dentro em volta do arco */
  labio: { largura: 14, raio: 4, angulo: 90 },
};

/* A tabela é uma polilinha; o alvo passa pelos vértices dela com tangente contínua (a cúbica monótona de Fritsch e Carlson). */
function suave(tabela) {
  const t = [...tabela].sort((a, b) => a[0] - b[0]);
  const n = t.length;
  const h = []; const d = [];
  for (let i = 0; i + 1 < n; i++) { h.push(t[i + 1][0] - t[i][0]); d.push((t[i + 1][1] - t[i][1]) / h[i]); }
  const m = t.map((_, i) => {
    if (i === 0) return d[0];
    if (i === n - 1) return d[n - 2];
    if (d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * h[i] + h[i - 1]; const w2 = h[i] + 2 * h[i - 1];
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  });
  return (z) => {
    if (z <= t[0][0]) return t[0][1];
    if (z >= t[n - 1][0]) return t[n - 1][1];
    let i = 0; while (z > t[i + 1][0]) i++;
    const u = (z - t[i][0]) / h[i]; const u2 = u * u; const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * t[i][1] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * t[i + 1][1] + (u3 - u2) * h[i] * m[i + 1];
  };
}
export const yTopo = suave(T.ladoTopo);
export const yFundo = suave(T.ladoFundo);
export const meia = suave(T.planta);
export const R_ARCO = T.roda.raio + T.roda.folgaDoArco;

/** A altura do arco de roda em z (a borda de baixo da chapa dentro do arco), ou 0 fora dele. */
export function yDoArco(z) {
  for (const zc of [T.roda.zFrente, T.roda.zTras]) {
    const d = z - zc;
    if (Math.abs(d) < R_ARCO) { const y = T.roda.raio + Math.sqrt(R_ARCO * R_ARCO - d * d); if (y > yFundo(z)) return y; }
  }
  return 0;
}
/** A borda de baixo da chapa: o fundo do perfil lateral, ou o arco de roda onde ele passa acima do fundo. */
export const yDaBorda = (z) => Math.max(yFundo(z), yDoArco(z));
/** Os dois z em que cada arco encontra o fundo, e o z do centro: [[zDeTras, zCentro, zDaFrente], ...] do arco de trás e do da frente. */
export const ARCOS = [T.roda.zTras, T.roda.zFrente].map((zc) => { const m = Math.sqrt(R_ARCO ** 2 - (T.ladoFundo[0][1] - T.roda.raio) ** 2); return [zc - m, zc, zc + m]; });

/** O quanto o para-lama alarga em z, abaixo da altura `yAlargado`. */
export const alargamento = (z) => meia(z) - T.meiaDaCabine;
/** A lateral: a meia largura em (z, y). */
export function ladoX(z, y) {
  const t = Math.min(1, Math.max(0, (T.yOmbro - y) / (T.yOmbro - T.yAlargado)));
  const bojo = T.bojo * Math.max(0, 1 - ((y - 710) / 290) ** 2);
  /* a seção do alargado é uma cúbica, que chega à planta sem salto de curvatura (a parábola do primeiro ciclo dava calombo de 0,4 mm ali) */
  return T.meiaDaCabine + alargamento(z) * (1 - (1 - t) ** 3) + bojo;
}
/** A dobra do ombro em z, em graus: o ângulo entre a lateral de cima e a de baixo da quina. */
export const dobraDoOmbro = (z) => (Math.atan((3 * Math.max(0, alargamento(z))) / (T.yOmbro - T.yAlargado)) * 180) / Math.PI;
/** O topo da frente: a altura em (x, z), com a flecha na largura. */
export function topoY(x, z) {
  const xc = ladoX(z, yTopo(z));
  return yTopo(z) + T.flechaDoCapo * (1 - (x / xc) ** 2);
}

/* os painéis: o ponto visto de cada um, a cor e os pares de vizinhos que `npm run vao:partes` confere */
export const PAINEIS = [
  { nome: 'capo', eixo: 'y', ponto: [300, 1300] },
  { nome: 'paraLamaDir', eixo: 'x', ponto: [1850, 940], lado: '+' },
  { nome: 'portaDianteiraDir', eixo: 'x', ponto: [300, 700], lado: '+' },
  { nome: 'portaTraseiraDir', eixo: 'x', ponto: [-400, 700], lado: '+' },
  { nome: 'lateralTraseiraDir', eixo: 'x', ponto: [-1850, 940], lado: '+' },
  { nome: 'soleiraDir', eixo: 'x', ponto: [0, 445], lado: '+' },
];
export const CORES = { capo: '#d9483b', paraLamaDir: '#2e86c1', portaDianteiraDir: '#27ae60', portaTraseiraDir: '#f1c40f', lateralTraseiraDir: '#c0392b', soleiraDir: '#7f8c8d', labioDianteiro: '#1b4f72', labioTraseiro: '#7b241c' };
export const VIZINHOS = [['capo', 'paraLamaDir'], ['paraLamaDir', 'portaDianteiraDir'], ['portaDianteiraDir', 'portaTraseiraDir'], ['portaTraseiraDir', 'lateralTraseiraDir'],
  ['portaDianteiraDir', 'soleiraDir'], ['portaTraseiraDir', 'soleiraDir'], ['paraLamaDir', 'soleiraDir'], ['lateralTraseiraDir', 'soleiraDir']];
