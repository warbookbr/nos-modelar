/* macaneta.esboco.mjs — três formas da maçaneta de porta do furgão, em mm, na bancada neutra. O apoio é um pedaço plano de
 * porta de 420 mm (z, a frente em +z) por 300 mm (y): a chapa de fora, de 24 mm (exagerada para o rebaixo aparecer), com o
 * rebaixo aberto nela, e o fundo de 20 mm atrás. A face de fora da chapa está em x 0. Em todas as opções fica igual: o apoio
 * com o rebaixo de 210 x 70 mm e a alça presa ao fundo do rebaixo por dois pés de 18 mm.
 * (a) alça horizontal de 180 x 40 mm, 12 mm acima da chapa; (b) alça vertical de 40 x 180 mm, no rebaixo de 70 x 210 mm, para as
 * portas traseiras; (c) a alça de (a) com uma moldura de 270 x 130 mm em volta do rebaixo, 6 mm acima da chapa. */

/** Retângulo de z por y, centrado, no perfil da extrusão em x, onde [u, v] vai a (y = -u, z = v). */
const rect = (z, y) => [[-y / 2, -z / 2], [-y / 2, z / 2], [y / 2, z / 2], [y / 2, -z / 2]];

function apoio(rebaixoZ, rebaixoY) {
  return [
    { id: 'chapa', rotulo: 'chapa da porta com o rebaixo', op: 'extrusao', args: { eixo: 'x', altura: 24, perfil: rect(420, 300), furos: [rect(rebaixoZ, rebaixoY)] }, centro: [-12, 0, 0] },
    { id: 'fundo', rotulo: 'fundo atrás da chapa', op: 'cubo', args: { larg: 20, alt: 300, prof: 420 }, encosta: { id: 'chapa', lado: '-x' } },
  ];
}

const pe = (id, dy, dz) => ({ id, rotulo: 'pé da alça', op: 'cubo', args: { larg: 18, alt: dy === 0 ? 24 : 20, prof: dy === 0 ? 20 : 24 },
  encosta: { id: 'fundo', lado: '+x' }, desloca: [0, dy, dz] });

const horizontal = () => [
  apoio(210, 70),
  pe('pe1', 0, 70), pe('pe2', 0, -70),
  { id: 'alca', rotulo: 'alça preta', op: 'chamferBox', args: { larg: 18, alt: 40, prof: 180, chanfro: 6 }, encosta: { id: 'pe1', lado: '+x' }, desloca: [0, 0, -70] },
].flat();

const vertical = () => [
  apoio(70, 210),
  pe('pe1', 70, 0), pe('pe2', -70, 0),
  { id: 'alca', rotulo: 'alça preta', op: 'chamferBox', args: { larg: 18, alt: 180, prof: 40, chanfro: 6 }, encosta: { id: 'pe1', lado: '+x' }, desloca: [0, -70, 0] },
].flat();

export default {
  formato: 'esboco-nucleo@1',
  opcoes: [
    { titulo: '(a) alça horizontal rente à porta', nota: 'Alça de 180 x 40 mm no rebaixo de 210 x 70 mm da chapa.', formas: horizontal() },
    { titulo: '(b) alça vertical, para as portas traseiras', nota: 'A mesma alça em pé, 40 x 180 mm, no rebaixo de 70 x 210 mm.', formas: vertical() },
    { titulo: '(c) alça com moldura em volta', nota: 'Como a (a), e uma moldura de 270 x 130 mm em volta do rebaixo, 6 mm acima da chapa.',
      formas: [...horizontal(),
        { id: 'moldura', rotulo: 'moldura', op: 'extrusao', args: { eixo: 'x', altura: 6, perfil: rect(270, 130), furos: [rect(222, 82)] }, encosta: { id: 'chapa', lado: '+x' } }] },
  ],
};
