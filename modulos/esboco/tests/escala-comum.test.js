/* A escala comum das vistas que vão juntas ao crítico (`escalaComumDasVistas` no desenho das formas, `escalaComumDaBlocagem` no da
   blocagem): numa peça alongada, cada vista sozinha enche o painel com uma escala diferente (a de ponta sai oito vezes maior), e a
   barra de 100 mm mudava de tamanho de uma vista para a outra. Na escala comum a barra tem o mesmo comprimento em pixels nas quatro e
   nenhuma vista corta a peça. */
import { describe, expect, it } from 'vitest';
import { barraDeEscala, desenharEsboco, escalaComumDasVistas, escalaDoEsboco, FRACAO_MINIMA_NA_ESCALA_COMUM, QUADRO, tituloDaAmpliada, VISTAS, vistasAmpliadas } from '../src/index.js';
import { desenharBlocagem, escalaComumDaBlocagem, escalaDaBlocagem } from '../src/desenho-da-blocagem.js';

const QUATRO = Object.keys(VISTAS);

/* O cilindro longo do esboço: 800 mm ao longo de x, 60 mm de diâmetro. */
const CILINDRO = { opcoes: [{ titulo: 'Haste', formas: [{ id: 'haste', tipo: 'cilindro', diametro: 60, comprimento: 800, eixo: 'x', centro: [0, 0, 0], cor: 'cinza' }] }] };

/* O mesmo cilindro como malha (16 lados, tampas em leque), para o desenho da blocagem. */
function malhaDoCilindro({ comprimento = 800, raio = 30, lados = 16 } = {}) {
  const vertices = [];
  for (const x of [-comprimento / 2, comprimento / 2]) {
    for (let k = 0; k < lados; k++) {
      const a = (2 * Math.PI * k) / lados;
      vertices.push([x, raio * Math.cos(a), raio * Math.sin(a)]);
    }
  }
  vertices.push([-comprimento / 2, 0, 0], [comprimento / 2, 0, 0]);
  const c0 = 2 * lados; const c1 = c0 + 1;
  const faces = [];
  for (let k = 0; k < lados; k++) {
    const n = (k + 1) % lados;
    faces.push([k, n, lados + n], [k, lados + n, lados + k]);
    faces.push([c0, n, k], [c1, lados + k, lados + n]);
  }
  return { vertices, faces: faces.map((v) => ({ vertices: v, volume: 'haste' })) };
}
const PAINEL = { titulo: 'Haste', malha: malhaDoCilindro(), volumes: [{ id: 'haste', cor: '#c9d6e8' }] };

/* A barra de escala do rodapé: o comprimento em pixels do quadro e o rótulo. */
function barra(svg) {
  const m = /<line x1="20" y1="([\d.]+)" x2="([\d.]+)" y2="\1" stroke="#111111" stroke-width="3"\/><text [^>]*>([^<]+)<\/text>/.exec(svg);
  expect(m, 'o desenho tem a barra de escala').not.toBeNull();
  return { px: Number(m[2]) - 20, rotulo: m[3] };
}

/* Os pontos da camada (as faces das formas, em pixels do quadro) que caem fora do painel: o que a vista cortaria. */
function foraDoPainel(r) {
  const fora = [];
  for (const f of r.camada.formas) {
    for (const face of f.faces) {
      for (const [x, y] of face.c) {
        if (x < -1e-6 || x > QUADRO.painelL + 1e-6 || y < QUADRO.topo - 1e-6 || y > QUADRO.topo + QUADRO.painelA + 1e-6) fora.push([x, y]);
      }
    }
  }
  return fora;
}

describe('a escala comum das quatro vistas de uma peça alongada', () => {
  it('no desenho das formas: a barra de 100 mm tem o mesmo comprimento nas quatro e nenhuma vista corta o cilindro', () => {
    const esbocos = QUATRO.map((vista) => ({ ...CILINDRO, vista }));
    const proprias = esbocos.map(escalaDoEsboco);
    /* sozinha, a vista de ponta enche o painel com o círculo de 60 mm: a escala dela é muitas vezes a das outras */
    expect(Math.max(...proprias) / Math.min(...proprias)).toBeGreaterThan(5);
    const escala = escalaComumDasVistas(esbocos);
    expect(escala).toBe(Math.min(...proprias));
    const desenhos = esbocos.map((e) => desenharEsboco(e, { camada: true, escala }));
    const barras = desenhos.map((r) => barra(r.svg));
    expect(new Set(barras.map((b) => b.px.toFixed(1))).size).toBe(1);
    expect(barras.map((b) => b.rotulo)).toEqual(QUATRO.map(() => '100 mm'));
    expect(barras[0].px).toBeCloseTo(100 * escala, 0);
    expect(desenhos.map((r) => r.escala)).toEqual(QUATRO.map(() => escala));
    expect(desenhos.every((r) => r.camada.formas.some((f) => f.faces.length > 0))).toBe(true);
    expect(desenhos.map((r) => foraDoPainel(r).length)).toEqual(QUATRO.map(() => 0));
    /* a conta de corte morde: a vista de frente na escala que a de ponta teria sozinha sai do painel */
    expect(foraDoPainel(desenharEsboco(esbocos[1], { camada: true, escala: Math.max(...proprias) })).length).toBeGreaterThan(0);
    /* a escala própria de cada vista é a do desenho sem escala dada */
    expect(esbocos.map((e) => desenharEsboco(e).escala)).toEqual(proprias);
  });

  it('no desenho da blocagem: a barra de 100 mm tem o mesmo comprimento nas quatro e nenhuma vista corta o cilindro', () => {
    const entradas = QUATRO.map((vista) => ({ vista, paineis: [PAINEL] }));
    const proprias = entradas.map(escalaDaBlocagem);
    expect(proprias).toEqual(entradas.map((e) => desenharBlocagem(e).escala));
    expect(Math.max(...proprias) / Math.min(...proprias)).toBeGreaterThan(5);
    const escala = escalaComumDaBlocagem(entradas);
    expect(escala).toBe(Math.min(...proprias));
    const desenhos = entradas.map((e) => desenharBlocagem(e, { camada: true, escala }));
    const barras = desenhos.map((r) => barra(r.svg));
    expect(new Set(barras.map((b) => b.px.toFixed(1))).size).toBe(1);
    expect(barras.map((b) => b.rotulo)).toEqual(QUATRO.map(() => '100 mm'));
    expect(desenhos.map((r) => foraDoPainel(r).length)).toEqual(QUATRO.map(() => 0));
  });

  it('recusa a escala que não é um número positivo', () => {
    expect(() => desenharEsboco({ ...CILINDRO, vista: 'frontal' }, { escala: 0 })).toThrow(/"escala" deve ser um número positivo/);
    expect(() => desenharBlocagem({ vista: 'frontal', paineis: [PAINEL] }, { escala: Number.NaN })).toThrow(/"escala" deve ser um número positivo/);
  });
});

/* Uma peça compacta: a caixa de 300 por 200 por 250 mm, que nenhuma vista deixa pequena demais na escala comum. */
const CAIXA = { opcoes: [{ titulo: 'Caixa', formas: [{ id: 'caixa', tipo: 'caixa', largura: 300, altura: 200, profundidade: 250, centro: [0, 0, 0], cor: 'cinza' }] }] };

describe('a vista ampliada em escala própria', () => {
  const proprias = (base) => QUATRO.map((vista) => ({ vista, escala: escalaDoEsboco({ ...base, vista }) }));

  it('no cilindro longo, só a vista de ponta fica abaixo do limite e é ampliada', () => {
    const p = proprias(CILINDRO);
    const comum = Math.min(...p.map((x) => x.escala));
    const ampliadas = vistasAmpliadas(p, comum);
    expect(ampliadas.map((a) => a.vista)).toEqual(['lateral']);
    expect(ampliadas[0].fracao).toBeLessThan(FRACAO_MINIMA_NA_ESCALA_COMUM);
    /* desenhada sozinha, na escala própria e com o título que o diz, ela enche o painel e tem a barra dela */
    const r = desenharEsboco({ ...CILINDRO, vista: 'lateral', opcoes: CILINDRO.opcoes.map((o) => ({ ...o, titulo: tituloDaAmpliada('lateral') })) }, { camada: true });
    expect(r.svg).toContain('>Lateral, ampliada em escala própria</text>');
    expect(r.escala).toBe(ampliadas[0].escala);
    expect(r.escala / comum).toBeGreaterThan(1 / FRACAO_MINIMA_NA_ESCALA_COMUM);
    const b = barraDeEscala(r.escala);
    expect(barra(r.svg)).toEqual({ px: Number(b.px.toFixed(1)), rotulo: b.rotulo });
    expect(foraDoPainel(r)).toEqual([]);
  });

  it('na peça compacta nenhuma vista é ampliada', () => {
    const p = proprias(CAIXA);
    expect(vistasAmpliadas(p, Math.min(...p.map((x) => x.escala)))).toEqual([]);
  });

  it('o mesmo vale no desenho da blocagem', () => {
    const p = QUATRO.map((vista) => ({ vista, escala: escalaDaBlocagem({ vista, paineis: [PAINEL] }) }));
    expect(vistasAmpliadas(p, Math.min(...p.map((x) => x.escala))).map((a) => a.vista)).toEqual(['lateral']);
    const r = desenharBlocagem({ vista: 'lateral', paineis: [{ ...PAINEL, titulo: tituloDaAmpliada('lateral') }] });
    expect(r.svg).toContain('>Lateral, ampliada em escala própria</text>');
  });
});
