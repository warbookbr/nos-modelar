/* antena.esboco.mjs — três formas da antena do teto do furgão, em mm, na bancada neutra. O apoio é um pedaço de teto curvo
 * (360 mm de largura em x, 300 em z, 20 de espessura, raio de 1.800 mm na seção, frente do furgão em +z), e a antena fica no meio
 * (x 0), 70 mm atrás da borda da frente do pedaço, onde fica logo acima do para-brisa. Em todas as opções fica igual: o teto.
 * (a) base em gota de 110 x 50 mm e haste preta de 6 mm por 400 mm, inclinada 15 graus para trás; (b) a mesma com a haste de
 * 200 mm; (c) só uma base em barbatana de 200 x 40 mm e 62 mm de altura, sem haste. */
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

/** A gota de base: círculo de raio 25 na frente e ponta atrás, 110 mm de comprimento, em [x, z]. */
function perfilDaGota() {
  const r = 25; const ponta = -85; const c = 0;
  const d = c - ponta; const a = Math.asin(r / d);
  const pts = [];
  /* o círculo, de um ponto de tangência ao outro, pela frente (+z) */
  const de = Math.PI / 2 + a; const ate = -Math.PI / 2 - a + 2 * Math.PI;
  const n = 20;
  for (let i = 0; i <= n; i += 1) { const t = de + ((ate - de) * i) / n; pts.push([r * Math.sin(t) * -1, c + r * Math.cos(t) * -1]); }
  pts.push([0, ponta]);
  return pts;
}

/** Cilindro raio 3 (haste fina, 6 mm), com `altura`, sobre a base e inclinado 15 graus para trás pelo pé. */
const haste = (altura) => ({ id: 'haste', rotulo: 'haste preta', op: 'cilindro', args: { raio: 3, altura, lados: 12 }, sobre: 'base', desloca: [0, 0, 30], contato: { base: 'atravessa' },
  rotacao: { eixo: 'x', graus: -15, pivo: 'haste.-y' } });

const base = { id: 'base', rotulo: 'base em gota', op: 'extrusao', args: { eixo: 'y', altura: 22, perfil: perfilDaGota() },
  encosta: { id: 'teto', lado: '+y' }, desloca: [0, 0, 50] };

export default {
  formato: 'esboco-nucleo@1',
  opcoes: [
    { titulo: '(a) base em gota e haste de 400 mm', nota: 'Base de 110 x 50 mm e haste preta fina de 400 mm, inclinada 15 graus para trás.', formas: [TETO, base, haste(400)] },
    { titulo: '(b) haste curta de 200 mm', nota: 'A mesma base, com a haste de 200 mm.', formas: [TETO, base, haste(200)] },
    { titulo: '(c) só a base em barbatana', nota: 'Sem haste: uma barbatana de 200 mm de comprimento e 62 mm de altura.',
      formas: [TETO, { id: 'barbatana', rotulo: 'base em barbatana', op: 'extrusao',
        args: { eixo: 'x', altura: 40, perfil: [[0, 100], [0, -100], [-62, -55], [-62, -25]] },
        encosta: { id: 'teto', lado: '+y' }, desloca: [0, 0, 40] }] },
  ],
};
