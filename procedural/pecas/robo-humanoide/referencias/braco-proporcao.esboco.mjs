/* braco-proporcao.esboco.mjs — as opções de proporção do braço direito do robô humanoide, em blocos sobre o esqueleto.
 *
 * O que está em disputa: quanto do braço é braço, antebraço e mão, e o diâmetro do disco do ombro. O que fica igual nas três opções:
 * o centro do ombro (x 250, y 1.435, do `../andaime.json`), o alcance de 750 mm do centro do ombro à ponta do dedo médio, a largura da
 * palma (90 mm), as seções dos blocos e a pose zero, com o braço pendente e a palma voltada para o corpo. A opção A são as medidas que
 * a pessoa fixou no `../ALINHAMENTO.md`; a B alonga o braço e encurta o antebraço; a C aumenta o disco do ombro e o antebraço e encurta
 * a mão. A vista frontal mostra os comprimentos e o disco, e a direita mostra a mão e o polegar.
 *
 * Cada bloco é um cubo ou um cilindro do núcleo, no lugar do volume do esqueleto, em milímetro. Os blocos vizinhos se encostam nas
 * juntas e não se atravessam. Rode `npm run esboco:nucleo -- procedural/pecas/robo-humanoide/referencias/braco-proporcao.esboco.mjs
 * --vistas frontal,direita`. Nada aqui vem de imagem. */

const X = 250;
const OMBRO_Y = 1435;
const RAIO_DO_COTOVELO = 38;
const MEIA_ALTURA_DO_PUNHO = 15;
const DEDOS = [['Indicador', 33], ['Medio', 11], ['Anelar', -11], ['Minimo', -33]];

export const OPCOES = [
  { titulo: 'A: medidas fixadas', nota: 'disco 110, braço 300, antebraço 260, mão 190', disco: 110, braco: 300, antebraco: 260, mao: 190 },
  { titulo: 'B: braço mais longo', nota: 'disco 110, braço 330, antebraço 230, mão 190', disco: 110, braco: 330, antebraco: 230, mao: 190 },
  { titulo: 'C: ombro maior, mão menor', nota: 'disco 135, braço 300, antebraço 275, mão 175', disco: 135, braco: 300, antebraco: 275, mao: 175 },
];

const cubo = (id, [larg, alt, prof], centro) => ({ id, op: 'cubo', args: { larg, alt, prof }, centro });

export function formasDaOpcao({ disco, braco, antebraco, mao }) {
  const cotovelo = OMBRO_Y - braco;
  const punho = cotovelo - antebraco;
  const nos = punho - (mao * 115) / 190;
  const falanges = [['proximal', 32, 20], ['media', 24, 19], ['distal', 19, 18]].map(([nome, c, l]) => [nome, (mao * c) / 190, l]);
  const entre = (a, b) => [(a + b) / 2, a - b];
  const [yBraco, altBraco] = entre(OMBRO_Y - disco / 2, cotovelo + RAIO_DO_COTOVELO);
  const [yAnte, altAnte] = entre(cotovelo - RAIO_DO_COTOVELO, punho + MEIA_ALTURA_DO_PUNHO);
  const [yPalma, altPalma] = entre(punho - MEIA_ALTURA_DO_PUNHO, nos);
  const formas = [
    { id: 'ombro', op: 'cilindro', args: { raio: disco / 2, altura: 50, lados: 32, eixo: 'x' }, centro: [X, OMBRO_Y, 0] },
    cubo('braco', [100, altBraco, 115], [X, yBraco, 0]),
    { id: 'cotovelo', op: 'cilindro', args: { raio: RAIO_DO_COTOVELO, altura: 90, lados: 32, eixo: 'x' }, centro: [X, cotovelo, 0] },
    cubo('antebraco', [85, altAnte, 95], [X, yAnte, 0]),
    { id: 'punho', op: 'cilindro', args: { raio: 32, altura: 2 * MEIA_ALTURA_DO_PUNHO, lados: 32, eixo: 'y' }, centro: [X, punho, 0] },
    cubo('palma', [28, altPalma, 90], [X, yPalma, 0]),
    cubo('polegarBase', [24, 40, 24], [X - 6, punho - 45, 57]),
    cubo('polegarProximal', [20, 32, 20], [X - 6, punho - 81, 62]),
    cubo('polegarDistal', [18, 19, 18], [X - 6, punho - 106.5, 62]),
  ];
  for (const [dedo, z] of DEDOS) {
    let y = nos;
    for (const [nome, comprimento, largura] of falanges) {
      formas.push(cubo(`${nome}${dedo}`, [largura - 2, comprimento, largura], [X, y - comprimento / 2, z]));
      y -= comprimento;
    }
  }
  return formas;
}

export default {
  formato: 'esboco-nucleo@1',
  vista: 'frontal',
  opcoes: OPCOES.map((o) => ({ titulo: o.titulo, nota: o.nota, formas: formasDaOpcao(o) })),
};
