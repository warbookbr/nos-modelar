/* O traço da silhueta de uma forma côncava ou recortada (`subtrai`) vai por cima de todas as faces dela. O desenho pintava cada face e logo depois as
   linhas dela, e as faces seguintes, com a borda de 0,8 px da cor do preenchimento, cobriam parte do traço de 2 px: o vinco do canto de
   dentro de um L, o contorno de um furo passante e a silhueta de um tanque em loft saíam falhados, o que o ramo da forma convexa, que pinta
   todas as faces e só depois as silhuetas, nunca teve. A linha que fica atrás de uma face de frente da mesma forma (a parede de dentro de
   um U vista de lado) o pintor escondia pela ordem, e agora sai pela profundidade (`oclusao-das-linhas.js`), de modo que continua sem linha. */
import { describe, expect, it } from 'vitest';
import { desenharEsboco, VISTAS_TODAS } from '../src/index.js';
import { semOQueOVolumeEsconde } from '../src/oclusao-das-linhas.js';

const OCULTAR = ['titulo', 'nota', 'escala', 'legendas'];
const VISTAS = ['isometrica', 'frontal', 'lateral', 'superior', 'inferior'];
const desenho = (esboco, vista) => desenharEsboco({ ...esboco, vista, ocultar: OCULTAR, ladosPorEscala: true });

/* A sequência do desenho: `F` é uma face pintada (traço de 0,8 px da cor do preenchimento) e `L` uma linha de silhueta ou de vinco (2 px, #111111). */
function sequencia(svg) {
  const saida = [];
  for (const [tag] of svg.matchAll(/<(?:path|line)\b[^>]*>/g)) {
    if (tag.startsWith('<path') && tag.includes('stroke-width="0.8"')) saida.push('F');
    else if (tag.startsWith('<line') && tag.includes('stroke="#111111" stroke-width="2"')) saida.push('L');
  }
  return saida.join('');
}
const linhasDoSvg = (svg) => [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="#111111" stroke-width="2"/g)].map((m) => m.slice(1, 5).map(Number));

const PERFIL_U = [[0, 0], [100, 0], [100, 100], [70, 100], [70, 30], [30, 30], [30, 100], [0, 100]];
const PERFIL_L = [[0, 0], [120, 0], [120, 30], [30, 30], [30, 110], [0, 110]];
const extrusao = (id, perfil, extra = {}) => ({ opcoes: [{ titulo: id, formas: [{ id, tipo: 'extrusao', perfil, comprimento: 40, eixo: 'z', centro: [0, 0, 0], cor: 'verde', ...extra }] }] });
/* a placa de 400 x 40 x 300 com um alojamento de 120 x 30 x 80 aberto na face de baixo, e o bloco de 200 x 120 x 80 com um furo passante de 60 mm */
const placa = { opcoes: [{ titulo: 'placa', formas: [
  { id: 'placa', tipo: 'caixa', largura: 400, altura: 40, profundidade: 300, centro: [0, 0, 0], cor: 'cinza', subtrai: ['alojamento'] },
  { id: 'alojamento', tipo: 'caixa', cortador: true, largura: 120, altura: 30, profundidade: 80, centro: [30, -5, 20] },
] }] };
const bloco = { opcoes: [{ titulo: 'bloco', formas: [
  { id: 'bloco', tipo: 'caixa', largura: 200, altura: 120, profundidade: 80, centro: [0, 0, 0], cor: 'laranja', subtrai: ['furo'] },
  { id: 'furo', tipo: 'cilindro', cortador: true, diametro: 60, comprimento: 200, eixo: 'z', centro: [10, 5, 0] },
] }] };

/* nenhuma face é pintada depois da primeira linha: a linha não tem face da mesma forma por cima */
const linhasPorCima = (seq) => seq.lastIndexOf('F') < seq.indexOf('L');
/* as vistas em que o desenho tem linha de face (a de frente de uma extrusão só tem a tampa, que leva o contorno dela), e a ordem de cada uma */
function conferir(nome, esboco) {
  let comLinha = 0;
  for (const vista of VISTAS) {
    const seq = sequencia(desenho(esboco, vista).svg);
    if (!seq.includes('L')) continue;
    comLinha++;
    expect(linhasPorCima(seq), `${nome}, vista ${vista}: ${seq.slice(0, 90)}`).toBe(true);
  }
  expect(comLinha, `${nome}: vistas com linha`).toBeGreaterThanOrEqual(3);
}

describe('o traço vai depois de todas as faces da forma', () => {
  it('forma recortada por subtrai: o alojamento da placa e o furo passante do bloco', () => {
    conferir('placa', placa);
    conferir('bloco', bloco);
  });

  it('forma côncava sem recorte: o L e o U em extrusão', () => {
    conferir('L', extrusao('l', PERFIL_L));
    conferir('U', extrusao('u', PERFIL_U));
  });

  it('o mesmo esboço dá o mesmo SVG, byte a byte', () => {
    for (const esboco of [placa, bloco, extrusao('u', PERFIL_U), extrusao('l', PERFIL_L)]) {
      for (const vista of VISTAS) expect(desenho(esboco, vista).svg).toBe(desenho(esboco, vista).svg);
    }
  });
});

describe('a linha atrás de uma face de frente da mesma forma continua escondida', () => {
  it('a parede de dentro do U, vista de lado, fica atrás do braço da frente e não tem linha: só o retângulo da silhueta', () => {
    /* de lado (olho em +x) o braço do x = 100 cobre o U inteiro, e a parede de dentro do braço do x = 30, que também olha para +x, está
       atrás dele: a linha do vinco dela com o piso do vão (y = 30) cairia no meio do retângulo */
    const { svg } = desenho(extrusao('u', PERFIL_U), 'lateral');
    const linhas = linhasDoSvg(svg);
    expect(linhas.length).toBeGreaterThanOrEqual(2);
    const xs = linhas.flatMap((l) => [l[0], l[2]]);
    const ys = linhas.flatMap((l) => [l[1], l[3]]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const naBorda = (x, y) => Math.abs(x - x0) < 0.6 || Math.abs(x - x1) < 0.6 || Math.abs(y - y0) < 0.6 || Math.abs(y - y1) < 0.6;
    for (const [ax, ay, bx, by] of linhas) {
      expect(naBorda(ax, ay) && naBorda(bx, by), `linha dentro do retângulo: ${ax},${ay} ${bx},${by}`).toBe(true);
      /* e a linha inteira corre sobre uma borda, e não só as pontas */
      expect(naBorda((ax + bx) / 2, (ay + by) / 2)).toBe(true);
    }
  });

  it('a mesma conta vale para o triângulo da malha e para o polígono do desenho das formas, e a tampa vazada (o anel) deixa ver pelo furo', () => {
    const V = VISTAS_TODAS.frontal;
    const olho = [0, 0, 1];
    /* uma placa quadrada de 100 x 100 em z = 10, com um furo quadrado de 40 x 40 no meio, e três linhas atrás dela (z = 0): uma sobre o corpo,
       uma atravessando o furo e uma fora da placa */
    const fora = [[-50, -50, 10], [50, -50, 10], [50, 50, 10], [-50, 50, 10]];
    const furo = [[-20, -20, 10], [-20, 20, 10], [20, 20, 10], [20, -20, 10]];
    const sobreOCorpo = [[-45, 35, 0], [45, 35, 0]];
    const peloFuro = [[-45, 0, 0], [45, 0, 0]];
    const foraDaPlaca = [[-45, 80, 0], [45, 80, 0]];
    const linhas = [sobreOCorpo, peloFuro, foraDaPlaca];
    const visiveis = semOQueOVolumeEsconde(linhas, [{ pts: fora, furos: [furo] }], V, olho);
    expect(visiveis.filter(([a]) => a[1] === 35)).toHaveLength(0);
    expect(visiveis.filter(([a]) => a[1] === 80)).toHaveLength(1);
    const pelo = visiveis.filter(([a]) => a[1] === 0).map(([a, b]) => [Math.min(a[0], b[0]), Math.max(a[0], b[0])]);
    expect(pelo).toHaveLength(1);
    /* só o trecho do furo (x de -20 a 20) se vê, com a fronteira dentro de 1 mm quando refinada */
    const refinado = semOQueOVolumeEsconde([peloFuro], [{ pts: fora, furos: [furo] }], V, olho, { refinar: true });
    expect(refinado).toHaveLength(1);
    expect(Math.min(refinado[0][0][0], refinado[0][1][0])).toBeCloseTo(-20, 0);
    expect(Math.max(refinado[0][0][0], refinado[0][1][0])).toBeCloseTo(20, 0);
    /* sem furo a linha do meio some inteira, e o triângulo da malha dá o mesmo que o polígono da mesma face */
    const quadrado = [{ pts: fora }];
    expect(semOQueOVolumeEsconde([peloFuro], quadrado, V, olho)).toHaveLength(0);
    const vertices = fora;
    const comoMalha = semOQueOVolumeEsconde([peloFuro, foraDaPlaca], [{ ids: [0, 1, 2] }, { ids: [0, 2, 3] }], V, olho, { vertices });
    const comoPoligono = semOQueOVolumeEsconde([peloFuro, foraDaPlaca], quadrado, V, olho);
    expect(comoMalha).toEqual(comoPoligono);
  });

  it('a linha na mesma profundidade da face, sobre a borda dela, não some, e a que está à frente dela fica', () => {
    const V = VISTAS_TODAS.frontal;
    const olho = [0, 0, 1];
    const face = { pts: [[0, 0, 10], [100, 0, 10], [100, 100, 10], [0, 100, 10]] };
    const naBorda = [[0, 0, 10], [100, 0, 10]];
    const noMeioNaFace = [[10, 50, 10], [90, 50, 10]];
    const aFrente = [[10, 60, 25], [90, 60, 25]];
    const atras = [[10, 70, 0], [90, 70, 0]];
    expect(semOQueOVolumeEsconde([naBorda, noMeioNaFace, aFrente, atras], [face], V, olho)).toEqual([naBorda, noMeioNaFace, aFrente]);
  });
});
