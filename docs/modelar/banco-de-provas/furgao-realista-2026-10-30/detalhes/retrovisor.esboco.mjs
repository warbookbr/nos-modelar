/* retrovisor.esboco.mjs — duas formas do retrovisor externo do furgão (lado direito, +x), em mm, na bancada neutra.
 * O apoio é um pedaço plano de porta (face de fora em x 0, frente do furgão em +z, y 0 = canto de baixo da janela). Em todas as
 * opções fica igual a estrutura: uma placa triangular em pé de 40 mm, presa à porta (260 mm de base e 560 mm de altura); um bloco de
 * junção na base; dois braços chatos e grossos (80 mm de largura e 52 de altura), um sobre o outro, com um vão retangular de 76 mm
 * entre eles; e a carcaça alta de cantos bem arredondados, de plástico preto, com 200 mm de largura e 110 de profundidade. O vidro
 * fica na traseira (-z) da mesma carcaça: um espelho plano grande em cima, com 2/3 da altura, uma faixa fina de carcaça e um
 * convexo menor embaixo. A lente do pisca preenche o canto de baixo de fora da carcaça.
 * (a) carcaça de 200 x 350 mm, a 275 mm da porta; (b) igual, com a carcaça mais curta (300 mm) e os braços mais curtos (a carcaça
 * a 200 mm da porta). */
const PORTA = { id: 'porta', rotulo: 'porta (apoio)', op: 'cubo', args: { larg: 30, alt: 760, prof: 600 }, centro: [-15, 20, 0] };

const Z0 = 24; // o eixo da estrutura em z, deslocado para a frente do centro da placa
const BASE_CARCACA = -110; // y da base da carcaça
const ALT_BRACO = 52;
const ALT_QUADRO = 180; // os dois braços e o vão: 52 + 76 + 52
const X_BLOCO = 75; // a face de fora do bloco de junção, em x

/** Uma opção: `dist` é a distância da face de dentro da carcaça à porta e `alt` a altura da carcaça. */
function retrovisor(dist, alt) {
  const yQuadro = BASE_CARCACA + 30; // o quadro nasce 30 mm acima da base da carcaça
  const grande = Math.round((alt - 28) * 0.66);
  const faixa = 8;
  const convexo = alt - 28 - grande - faixa;
  const braco = (id, yBase) => ({ id, rotulo: 'braço (plástico preto)', op: 'cubo', args: { larg: dist - X_BLOCO, alt: ALT_BRACO, prof: 80 },
    encosta: { id: 'junta', lado: '+x' }, desloca: [0, yBase + ALT_BRACO / 2 - (yQuadro + ALT_QUADRO / 2), 0] });
  return [
    PORTA,
    { id: 'placa', rotulo: 'placa triangular (plástico preto)', op: 'extrusao', args: { eixo: 'x', altura: 40, perfil: [[0, -100], [0, 160], [-560, 20]] },
      centro: [20, 20, 30] },
    { id: 'junta', rotulo: 'bloco de junção', op: 'cubo', args: { larg: X_BLOCO - 40, alt: ALT_QUADRO, prof: 80 },
      centro: [40 + (X_BLOCO - 40) / 2, yQuadro + ALT_QUADRO / 2, Z0] },
    braco('braco1', yQuadro),
    braco('braco2', yQuadro + ALT_QUADRO - ALT_BRACO),
    { id: 'carcaca', rotulo: 'carcaça (plástico preto)', op: 'extrusao',
      args: { eixo: 'z', altura: 110, perfil: { retangulo: { largura: 200, profundidade: alt, cantos: 42 } }, segmentosArco: 8 },
      centro: [dist + 100, BASE_CARCACA + alt / 2, Z0] },
    { id: 'plano', rotulo: 'espelho plano', op: 'chamferBox', args: { larg: 172, alt: grande, prof: 6, chanfro: 2 },
      encosta: { id: 'carcaca', lado: '-z' }, desloca: [0, alt / 2 - 14 - grande / 2, 0] },
    { id: 'convexo', rotulo: 'espelho convexo', op: 'chamferBox', args: { larg: 172, alt: convexo, prof: 10, chanfro: 4 },
      encosta: { id: 'carcaca', lado: '-z' }, desloca: [0, -alt / 2 + 14 + convexo / 2, 0] },
    { id: 'lente', rotulo: 'lente do pisca', op: 'chamferBox', args: { larg: 85, alt: 65, prof: 96, chanfro: 6 },
      centro: [dist + 200 - 42.5, BASE_CARCACA + 2.5, Z0], contato: { carcaca: 'atravessa' } },
  ];
}

export default {
  formato: 'esboco-nucleo@1',
  opcoes: [
    { titulo: '(a) carcaça de 200 x 350 mm a 275 mm da porta', nota: 'Quadro de dois braços de 200 mm e carcaça alta, com o plano em cima, o convexo embaixo e o pisca no canto.',
      formas: retrovisor(275, 350) },
    { titulo: '(b) carcaça de 300 mm a 200 mm da porta', nota: 'Igual, com a carcaça de 200 x 300 mm e os braços de 125 mm.',
      formas: retrovisor(200, 300) },
  ],
};
