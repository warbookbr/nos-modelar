/* elos-opcoes.esboco.mjs — o braço de prova de duas juntas, com o mesmo mecanismo nas três opções (base redonda, ombro em garfo
   com o NEMA 23 e a planetária de 5:1 de um lado e o rolamento do outro, NEMA 17 no primeiro elo com polias GT2 de 20 e 80
   dentes até o cotovelo, garra como volume), e só o formato dos elos muda. Medidas do catálogo da mecatrônica, em mm; o braço
   esticado na horizontal, no plano xy, com o ombro em x = 0 e o cotovelo a 150 mm. */
const Y = 140;
const mecanismo = () => [
  { id: 'base', op: 'cilindro', args: { raio: 90, altura: 50, eixo: 'y', lados: 48 }, centro: [0, 25, 0] },
  { id: 'garfoFrente', op: 'chamferBox', args: { larg: 70, alt: 115, prof: 12, chanfro: 3 }, centro: [0, 107, 45] },
  { id: 'garfoTras', op: 'chamferBox', args: { larg: 70, alt: 115, prof: 12, chanfro: 3 }, centro: [0, 107, -45] },
  { id: 'planetaria', op: 'cubo', args: { larg: 57, alt: 57, prof: 55 }, centro: [0, Y - 28.5, 78.5] },
  { id: 'motorOmbro', op: 'cubo', args: { larg: 57, alt: 57, prof: 76 }, centro: [0, Y - 28.5, 144] },
  { id: 'rolamento', op: 'cilindro', args: { raio: 14, altura: 7, eixo: 'z', lados: 32 }, centro: [0, Y, -54.5] },
  { id: 'motorCotovelo', op: 'cubo', args: { larg: 42.3, alt: 42.3, prof: 40 }, centro: [80, Y - 21, -47] },
  { id: 'poliaPequena', op: 'cilindro', args: { raio: 6.4, altura: 8, eixo: 'z', lados: 24 }, centro: [80, Y, -22] },
  { id: 'poliaGrande', op: 'cilindro', args: { raio: 25.5, altura: 8, eixo: 'z', lados: 48 }, centro: [150, Y, -22] },
  { id: 'correiaCima', op: 'cubo', args: { larg: 72, alt: 1.5, prof: 6 }, centro: [115, Y + 16, -22] },
  { id: 'correiaBaixo', op: 'cubo', args: { larg: 72, alt: 1.5, prof: 6 }, centro: [115, Y - 17.5, -22] },
  { id: 'garra', op: 'chamferBox', args: { larg: 40, alt: 45, prof: 40, chanfro: 4 }, centro: [322, Y - 4, 0] },
];
export default {
  vista: 'isometrica',
  rotulos: false,
  opcoes: [
    { titulo: 'A: caixas retas de cantos chanfrados', formas: [...mecanismo(),
      { id: 'elo1', op: 'chamferBox', args: { larg: 200, alt: 46, prof: 44, chanfro: 6 }, centro: [75, Y, 0] },
      { id: 'elo2', op: 'chamferBox', args: { larg: 175, alt: 36, prof: 32, chanfro: 5 }, centro: [222, Y, 0] }] },
    { titulo: 'B: tubos redondos com discos nas juntas', formas: [...mecanismo(),
      { id: 'disco1', op: 'cilindro', args: { raio: 32, altura: 44, eixo: 'z', lados: 48 }, centro: [0, Y, 0] },
      { id: 'elo1', op: 'cilindro', args: { raio: 20, altura: 150, eixo: 'x', lados: 40 }, centro: [75, Y, 0] },
      { id: 'disco2', op: 'cilindro', args: { raio: 30, altura: 36, eixo: 'z', lados: 48 }, centro: [150, Y, 0] },
      { id: 'elo2', op: 'cilindro', args: { raio: 15, altura: 160, eixo: 'x', lados: 40 }, centro: [222, Y, 0] }] },
    { titulo: 'C: perfil em U aberto, correia à mostra', formas: [...mecanismo(),
      { id: 'elo1Frente', op: 'chamferBox', args: { larg: 200, alt: 50, prof: 6, chanfro: 2 }, centro: [75, Y, 19] },
      { id: 'elo1Fundo', op: 'chamferBox', args: { larg: 200, alt: 6, prof: 44, chanfro: 2 }, centro: [75, Y - 28, 0] },
      { id: 'elo2Frente', op: 'chamferBox', args: { larg: 175, alt: 38, prof: 5, chanfro: 2 }, centro: [222, Y, 15] },
      { id: 'elo2Tras', op: 'chamferBox', args: { larg: 175, alt: 38, prof: 5, chanfro: 2 }, centro: [222, Y, -15] }] },
  ],
};
