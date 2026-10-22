/* caixa-de-prova.mjs — a forma simétrica em x, desenhada por código, com que se prova que o pacote cego sai simétrico: uma
   caixa oca de chapa sem espessura, com duas janelas na frente e duas atrás, uma de cada lado do plano x = 0, e, atrás de
   cada janela, placas pequenas inclinadas. A placa se vê de fora só por raios que passam pela janela, num cone estreito; o
   raio pela normal dela e contra ela bate na parede. Assim o recorte por visibilidade decide cada placa pelas direções de
   observador que caem nesse cone, e um conjunto de direções que não é simétrico em x deixa uma placa de um lado e tira a
   espelhada. Em metro, y para cima e frente em +z. */

export const CAIXA = [0, 0.6, -0.1, 0.5, -0.1, 1.1];

const X = [-0.5, -0.3, -0.2, 0.2, 0.3, 0.5];
const Y = [0, 0.15, 0.25, 0.4];
const PROFUNDIDADE = 1.0;
const JANELA = { x: [0.2, 0.3], y: [0.15, 0.25] };

/** As placas atrás de uma janela: centro (x, y), distância à parede, inclinação em graus em volta de y e lado. */
const PLACAS = [
  { x: 0.215, y: 0.165, d: 0.22, giro: 45, lado: 0.03 },
  { x: 0.245, y: 0.21, d: 0.3, giro: 50, lado: 0.03 },
  { x: 0.28, y: 0.17, d: 0.26, giro: 40, lado: 0.025 },
  { x: 0.225, y: 0.235, d: 0.34, giro: 55, lado: 0.03 },
  { x: 0.27, y: 0.235, d: 0.2, giro: 60, lado: 0.025 },
  { x: 0.255, y: 0.19, d: 0.4, giro: 35, lado: 0.035 },
];

/** A malha em OBJ: a caixa com as quatro janelas, as placas atrás de cada uma e as imagens espelhadas em x. O leitor de OBJ
    triangula cada quadrilátero em leque a partir do primeiro canto; a placa espelhada começa no espelho do mesmo canto, e a
    triangulação sai espelhada também. Com diagonalTrocada, a placa espelhada começa no canto seguinte e é triangulada pela
    outra diagonal: a superfície continua simétrica, e só os triângulos não. */
export function obj({ diagonalTrocada = false } = {}) {
  const V = [];
  const F = [];
  const quad = (a, b, c, d) => {
    const k = V.length;
    V.push(a, b, c, d);
    F.push([k + 1, k + 2, k + 3, k + 4]);
  };
  // fundo, teto e laterais
  quad([-0.5, 0, 0], [0.5, 0, 0], [0.5, 0, PROFUNDIDADE], [-0.5, 0, PROFUNDIDADE]);
  quad([-0.5, 0.4, 0], [-0.5, 0.4, PROFUNDIDADE], [0.5, 0.4, PROFUNDIDADE], [0.5, 0.4, 0]);
  quad([0.5, 0, 0], [0.5, 0.4, 0], [0.5, 0.4, PROFUNDIDADE], [0.5, 0, PROFUNDIDADE]);
  quad([-0.5, 0, 0], [-0.5, 0, PROFUNDIDADE], [-0.5, 0.4, PROFUNDIDADE], [-0.5, 0.4, 0]);
  // frente (z = PROFUNDIDADE) e traseira (z = 0), em grade, sem as células das janelas
  for (let i = 0; i + 1 < X.length; i++) for (let j = 0; j + 1 < Y.length; j++) {
    const janela = Math.abs(X[i] + X[i + 1]) / 2 > JANELA.x[0] && Math.abs(X[i] + X[i + 1]) / 2 < JANELA.x[1]
      && (Y[j] + Y[j + 1]) / 2 > JANELA.y[0] && (Y[j] + Y[j + 1]) / 2 < JANELA.y[1];
    if (janela) continue;
    quad([X[i], Y[j], PROFUNDIDADE], [X[i + 1], Y[j], PROFUNDIDADE], [X[i + 1], Y[j + 1], PROFUNDIDADE], [X[i], Y[j + 1], PROFUNDIDADE]);
    quad([X[i], Y[j], 0], [X[i], Y[j + 1], 0], [X[i + 1], Y[j + 1], 0], [X[i + 1], Y[j], 0]);
  }
  // as placas, atrás de cada janela da frente e da traseira, dos dois lados de x = 0
  for (const sx of [1, -1]) for (const frente of [true, false]) for (const p of PLACAS) {
    const z = frente ? PROFUNDIDADE - p.d : p.d;
    const g = (p.giro * Math.PI) / 180;
    // a placa gira em volta de y: a normal sai da direção da parede para o lado de fora (x) da caixa
    const u = [Math.cos(g) * sx, 0, (frente ? -1 : 1) * Math.sin(g)];
    const h = p.lado / 2;
    const c = [sx * p.x, p.y, z];
    const pt = (a, b) => [c[0] + a * u[0], c[1] + b, c[2] + a * u[2]];
    const cantos = [pt(-h, -h), pt(h, -h), pt(h, h), pt(-h, h)];
    // a imagem espelhada em x inverte o sentido da face, para que a normal também seja a espelhada
    const [c0, c1, c2, c3] = cantos;
    quad(...(sx > 0 ? cantos : diagonalTrocada ? [c3, c2, c1, c0] : [c0, c3, c2, c1]));
  }
  return [...V.map((v) => `v ${v.join(' ')}`), ...F.map((f) => `f ${f.join(' ')}`)].join('\n') + '\n';
}
