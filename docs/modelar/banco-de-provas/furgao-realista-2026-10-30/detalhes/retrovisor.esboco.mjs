/* retrovisor.esboco.mjs — três formas do retrovisor externo do furgão (lado direito, +x), em mm, na bancada neutra.
 * O apoio é um pedaço plano de porta (face de fora em x 0, frente do furgão em +z). Em todas as opções fica igual: o apoio, o
 * braço preso na frente da janela (z +300, y 0 = canto de baixo da janela) e a carcaça de plástico preto de 230 x 380 mm, com a
 * face de metal espelhado na traseira (-z), recuada da borda da carcaça para a moldura aparecer.
 * (a) a recomendada; (b) com um espelho convexo menor, separado, embaixo; (c) o braço longo em dois tubos. */
const PORTA = { id: 'porta', rotulo: 'porta (apoio)', op: 'cubo', args: { larg: 30, alt: 700, prof: 800 }, centro: [-15, 0, 0] };

/** A carcaça + a face de metal do espelho grande, a partir do que ela encosta (`apoio`), deslocada `dy` em y. */
function espelhoGrande(apoio, dy) {
  return [
    { id: 'carcaca', rotulo: 'carcaça (plástico preto)', op: 'chamferBox', args: { larg: 230, alt: 380, prof: 70, chanfro: 12 },
      encosta: { id: apoio, lado: '+x' }, desloca: [0, dy, 0] },
    { id: 'espelho', rotulo: 'face (metal espelhado)', op: 'cubo', args: { larg: 206, alt: 356, prof: 8 }, encosta: { id: 'carcaca', lado: '-z' } },
  ];
}

const braco = (id, y, larg = 80) => ({ id, rotulo: 'braço (plástico preto)', op: 'cubo', args: { larg, alt: 50, prof: 70 },
  encosta: { id: 'porta', lado: '+x' }, desloca: [0, y, 300] });

const tubo = (id, y) => ({ id, rotulo: 'tubo do braço', op: 'cilindro', args: { raio: 15, altura: 230, eixo: 'x' },
  encosta: { id: 'porta', lado: '+x' }, desloca: [0, y, 300] });

export default {
  formato: 'esboco-nucleo@1',
  opcoes: [
    { titulo: '(a) espelho grande retangular em pé', nota: 'Carcaça 230 x 380 mm, braço curto de 80 mm no canto de baixo da frente da janela.',
      formas: [PORTA, braco('braco', 0), ...espelhoGrande('braco', 110)] },

    { titulo: '(b) com espelho convexo menor embaixo', nota: 'Como a (a), e embaixo, separado por 30 mm, um segundo conjunto de 150 x 150 mm com face convexa redonda, em braço próprio.',
      formas: [PORTA, braco('braco', 0), ...espelhoGrande('braco', 110),
        braco('braco2', -185, 80),
        { id: 'carcaca2', rotulo: 'carcaça do convexo', op: 'chamferBox', args: { larg: 150, alt: 150, prof: 55, chanfro: 10 }, encosta: { id: 'braco2', lado: '+x' } },
        { id: 'convexo', rotulo: 'face convexa (metal)', op: 'lathe', args: { eixo: 'z', lados: 32, perfil: [[0, 0], [62, 0], [58, 5], [40, 9], [0, 11]] },
          rotacao: [0, 180, 0], encosta: { id: 'carcaca2', lado: '-z' } }] },

    { titulo: '(c) braço longo em dois tubos', nota: 'Como a (a), mas a carcaça fica a 230 mm da porta, presa por dois tubos de 30 mm, um em cima do outro.',
      formas: [PORTA, tubo('tubo1', 0), tubo('tubo2', 150), ...espelhoGrande('tubo1', 110)] },
  ],
};
