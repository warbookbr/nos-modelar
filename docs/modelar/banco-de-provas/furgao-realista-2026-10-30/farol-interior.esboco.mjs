/* farol-interior.esboco.mjs — opções do interior do farol dianteiro do furgão realista, para a pessoa escolher em 2026-11-07.
 *
 * Em disputa: o que fica atrás da lente transparente, o arranjo de refletor e lâmpada. Igual em todas: o contorno do farol
 * esquerdo da TABELA (`farol_perfil`, o trapézio de 545 por 240 mm, levado a x 0 na ponta de dentro e y 0 na base), o fundo
 * escuro do conjunto, de 20 mm, e o pisca na ponta de fora (x de 450 a 545), com o refletor pequeno dele. A lente fica de fora
 * de todas, porque é a mesma e esconderia a diferença; na peça ela fica na frente, transparente. Vista frontal, em mm, com z
 * para quem olha. */

const FAROL = [[0, 0], [545, 0], [545, 240], [30, 240]];
const PISCA_X = 497;
const MEIO_Y = 120;

/** Concha de refletor: a seção de uma parábola rasa com 3 mm de parede, aberta para +z, de raio `r` e fundura `d`. */
function refletor(id, r, d, x, y) {
  const fora = [0, 0.25, 0.5, 0.75, 1].map((t) => [r * t, d * t * t]);
  const dentro = [...fora].reverse().map(([rr, yy]) => [Math.max(0, rr - 3), Math.min(d, yy + 3)]);
  return { id, op: 'lathe', args: { perfil: [...fora, ...dentro], eixo: 'z', lados: 32 }, centro: [x, y, d / 2] };
}

const lampada = (id, x, y, z, raio = 12) => ({ id, op: 'esfera', args: { raio, aneis: 8, lados: 16 }, centro: [x, y, z] });

const comum = () => [
  { id: 'fundo', op: 'extrusao', args: { perfil: FAROL.map(([u, v]) => [u, -v]), eixo: 'z', altura: 20 }, centro: [272.5, MEIO_Y, -10] },
  refletor('refletorPisca', 40, 30, PISCA_X, MEIO_Y),
  lampada('lampadaPisca', PISCA_X, MEIO_Y, 12, 8),
];

export default {
  formato: 'esboco-nucleo@1',
  vista: 'frontal',
  rotulos: true,
  opcoes: [
    {
      titulo: 'A: um refletor grande',
      nota: 'Uma concha só, de 220 mm, com a lâmpada no meio, como o farol clássico de furgão.',
      formas: [...comum(), refletor('refletor', 110, 55, 225, MEIO_Y), lampada('lampada', 225, MEIO_Y, 22, 16)],
    },
    {
      titulo: 'B: dois refletores redondos',
      nota: 'Duas conchas de 190 mm lado a lado, farol baixo e alto, cada uma com a sua lâmpada.',
      formas: [
        ...comum(),
        refletor('refletorBaixo', 95, 48, 115, MEIO_Y), lampada('lampadaBaixo', 115, MEIO_Y, 19, 14),
        refletor('refletorAlto', 95, 48, 330, MEIO_Y), lampada('lampadaAlto', 330, MEIO_Y, 19, 14),
      ],
    },
    {
      titulo: 'C: projetor e faixa de luz',
      nota: 'Um projetor redondo com a lente de vidro na frente e uma faixa fina de luz de rodagem ao longo do topo.',
      formas: [
        ...comum(),
        { id: 'projetor', op: 'cilindro', args: { raio: 60, altura: 40, eixo: 'z', lados: 32 }, centro: [300, 105, 20] },
        { ...lampada('lenteProjetor', 300, 105, 52, 42), contato: { projetor: 'atravessa' } },
        refletor('refletorBaixo', 70, 36, 110, 105), lampada('lampada', 110, 105, 22, 12),
        { id: 'faixaDeLuz', op: 'cubo', args: { larg: 400, alt: 14, prof: 10 }, centro: [240, 212, 5] },
      ],
    },
  ],
};
