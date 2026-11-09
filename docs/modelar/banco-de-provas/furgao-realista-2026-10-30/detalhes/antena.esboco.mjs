/* antena.esboco.mjs — duas formas da antena do teto do furgão, em mm, na bancada neutra. O apoio é um pedaço de teto curvo
 * (360 mm de largura em x, 300 em z, 20 de espessura, raio de 1.800 mm na seção, frente do furgão em +z), e a antena fica no meio
 * (x 0), com a ponta da frente do pé a uns 60 mm da borda da frente do pedaço, onde fica logo acima do para-brisa. Em todas as
 * opções ficam iguais o teto e o pé: baixo, oval e em gota, de 120 x 60 mm, que sobe para trás até 35 mm no ponto mais alto, de onde
 * sai a haste, que afina de 8 mm na base para 4 mm na ponta.
 * (a) haste de 400 mm, inclinada 20 graus para trás; (b) haste de 300 mm, quase em pé, inclinada 10 graus. */
const RAIO_DO_TETO = 1800;
const LARGURA_DO_TETO = 360;
const ESPESSURA_DO_TETO = 20;
const PASSOS = 20;

/** O perfil do teto em [x, -y] (no eixo z o perfil [u, v] vai a (x, -y)): o arco de cima e o de baixo, o pico do arco em y 0. */
function perfilDoTeto() {
  const alto = []; const baixo = [];
  for (let i = 0; i <= PASSOS; i += 1) {
    const x = -LARGURA_DO_TETO / 2 + (LARGURA_DO_TETO * i) / PASSOS;
    const y = Math.sqrt(RAIO_DO_TETO ** 2 - x * x) - RAIO_DO_TETO;
    alto.push([x, -y]); baixo.push([x, -(y - ESPESSURA_DO_TETO)]);
  }
  return [...alto, ...baixo.reverse()];
}

const TETO = { id: 'teto', rotulo: 'teto curvo (apoio)', op: 'extrusao', args: { eixo: 'z', altura: 300, perfil: perfilDoTeto() }, centro: [0, -10, 0] };

/* O pé: um loft ao longo de z, da ponta baixa da frente (+z) à traseira alta (-z). Cada seção é uma superelipse de fundo achatado,
 * com a largura em x e a altura em y; no loft com `orientacao` [1, 0, 0] o ponto [u, v] vai a (x, y). */
const LADOS = 24;
const secao = (z, largura, altura) => {
  const pontos = [];
  for (let k = 0; k < LADOS; k += 1) {
    const t = (2 * Math.PI * k) / LADOS;
    const c = Math.cos(t); const s = Math.sin(t);
    const x = (largura / 2) * Math.sign(c) * Math.abs(c) ** (2 / 3);
    const y = altura / 2 + (altura / 2) * Math.sign(s) * Math.abs(s) ** (2 / 3);
    pontos.push([x, y]);
  }
  return { pos: [0, 0, z], contorno: pontos };
};
/* [z, largura, altura]: a gota é fina na frente, larga atrás do meio e se fecha na traseira; o alto (35 mm) fica em z -45 */
const ESTACOES = [[60, 10, 6], [45, 26, 9], [30, 42, 14], [15, 52, 20], [0, 58, 26], [-15, 60, 31], [-30, 58, 34], [-45, 54, 35], [-55, 40, 30]];
const pe = { id: 'base', rotulo: 'pé em gota', op: 'loft',
  args: { lados: LADOS, orientacao: [1, 0, 0], secoes: [{ pos: [0, 0, 62], raio: 0 }, ...ESTACOES.map(([z, l, a]) => secao(z, l, a)), { pos: [0, 0, -60], raio: 0 }] },
  encosta: { id: 'teto', lado: '+y' }, desloca: [0, 0, 30] };

/** A haste de 8 mm na base e 4 mm na ponta, com `altura`, que nasce no alto do pé e se inclina `graus` para trás pelo pé dela. */
const haste = (altura, graus) => ({ id: 'haste', rotulo: 'haste preta', op: 'lathe',
  args: { eixo: 'y', lados: 16, perfil: [[0, 0], [4, 0], [2, altura], [0, altura]] },
  sobre: 'base', desloca: [0, -3, -46], contato: { base: 'atravessa' }, rotacao: { eixo: 'x', graus: -graus, pivo: 'haste.-y' } });

export default {
  formato: 'esboco-nucleo@1',
  opcoes: [
    { titulo: '(a) haste de 400 mm inclinada 20 graus', nota: 'Pé em gota de 120 x 60 mm e 35 mm de altura, e haste preta fina de 400 mm, de 8 para 4 mm, inclinada 20 graus para trás.',
      formas: [TETO, pe, haste(400, 20)] },
    { titulo: '(b) haste de 300 mm quase em pé', nota: 'O mesmo pé, com a haste de 300 mm inclinada 10 graus para trás.',
      formas: [TETO, pe, haste(300, 10)] },
  ],
};
