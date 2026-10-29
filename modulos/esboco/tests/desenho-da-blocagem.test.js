/* O desenho da blocagem (`src/desenho-da-blocagem.js`): recebe a malha como dado e desenha as quatro vistas no mesmo quadro do
   desenho das formas. As malhas daqui são montadas à mão (caixa e prisma vazado), de modo que o teste não depende do núcleo. */
import { describe, expect, it } from 'vitest';
import { desenharEsboco, ErroDeEsboco, VISTAS } from '../src/index.js';
import { desenharBlocagem } from '../src/desenho-da-blocagem.js';

const VISTAS_DO_MODULO = Object.keys(VISTAS);

/* A caixa `[lx, ly, lz]` centrada em `c`, 12 triângulos anti-horários vistos de fora, no volume `id`. */
function caixa(id, [lx, ly, lz], c = [0, 0, 0]) {
  const v = [];
  for (const sz of [-1, 1]) for (const sy of [-1, 1]) for (const sx of [-1, 1]) v.push([c[0] + (sx * lx) / 2, c[1] + (sy * ly) / 2, c[2] + (sz * lz) / 2]);
  /* índice = (sz > 0) * 4 + (sy > 0) * 2 + (sx > 0) */
  const quad = (a, b, cc, d) => [[a, b, cc], [a, cc, d]];
  const faces = [
    ...quad(1, 0, 2, 3), // z -
    ...quad(4, 5, 7, 6), // z +
    ...quad(0, 1, 5, 4), // y -
    ...quad(2, 6, 7, 3), // y +
    ...quad(0, 4, 6, 2), // x -
    ...quad(1, 3, 7, 5), // x +
  ];
  return { vertices: v, faces: faces.map((vertices) => ({ vertices, volume: id })) };
}

/* O prisma de seção quadrada vazada (lado de fora `fora`, furo `dentro`, comprimento `lz` ao longo de z), com a parede do furo de
   normal para dentro do furo. */
function prismaVazado(id, fora, dentro, lz) {
  const anel = (m, z) => [[-m, -m, z], [m, -m, z], [m, m, z], [-m, m, z]];
  const vertices = [...anel(fora, lz / 2), ...anel(dentro, lz / 2), ...anel(fora, -lz / 2), ...anel(dentro, -lz / 2)];
  const oT = 0; const iT = 4; const oB = 8; const iB = 12;
  const tris = [];
  for (let k = 0; k < 4; k++) {
    const n = (k + 1) % 4;
    tris.push([oT + k, oT + n, iT + n], [oT + k, iT + n, iT + k]); // tampa de cima, +z
    tris.push([oB + k, iB + n, oB + n], [oB + k, iB + k, iB + n]); // tampa de baixo, -z
    tris.push([oB + k, oB + n, oT + n], [oB + k, oT + n, oT + k]); // parede de fora
    tris.push([iB + k, iT + n, iB + n], [iB + k, iT + k, iT + n]); // parede do furo
  }
  return { vertices, faces: tris.map((t) => ({ vertices: t, volume: id })) };
}

const volumeAssinado = ({ vertices, faces }) => faces.reduce((s, { vertices: [i, j, k] }) => {
  const a = vertices[i]; const b = vertices[j]; const c = vertices[k];
  return s + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
}, 0);

const painelDe = (malha, volumes, extra = {}) => ({ titulo: 'Teste', nota: 'uma nota', malha, volumes, ...extra });

describe('as malhas de teste', () => {
  it('têm os triângulos voltados para fora (volume com sinal positivo)', () => {
    expect(volumeAssinado(caixa('a', [100, 60, 40]))).toBeCloseTo(100 * 60 * 40, 6);
    expect(volumeAssinado(prismaVazado('a', 50, 20, 40))).toBeCloseTo((100 * 100 - 40 * 40) * 40, 6);
  });
});

describe('desenharBlocagem: o quadro do desenho das formas', () => {
  const esbocoDaCaixa = { opcoes: [{ titulo: 'Teste', nota: 'uma nota', formas: [{ id: 'a', tipo: 'caixa', largura: 100, altura: 60, profundidade: 40, centro: [10, 5, -3], cor: 'azul' }] }] };

  it('dá a mesma largura, altura e escala que o desenho das formas, nas quatro vistas', () => {
    for (const vista of VISTAS_DO_MODULO) {
      const velho = desenharEsboco({ ...esbocoDaCaixa, vista }, { camada: true });
      const novo = desenharBlocagem({ vista, paineis: [painelDe(caixa('a', [100, 60, 40], [10, 5, -3]), [{ id: 'a', cor: 'azul' }])] }, { camada: true });
      expect(novo.largura).toBe(velho.largura);
      expect(novo.altura).toBe(velho.altura);
      expect(novo.escala).toBeCloseTo(velho.escala, 9);
    }
  });

  it('põe cada opção num painel, na mesma escala, com o título, a nota e a barra de escala', () => {
    const duas = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(caixa('a', [100, 60, 40]), [{ id: 'a', cor: 'azul' }]), painelDe(caixa('b', [50, 30, 20]), [{ id: 'b', cor: 'verde' }], { titulo: 'Menor' })] });
    expect(duas.largura).toBe(2 * 620);
    expect(duas.svg).toContain('>Teste<');
    expect(duas.svg).toContain('>Menor<');
    expect(duas.svg).toContain('uma nota');
    expect(duas.svg).toContain('100 mm');
    /* a barra de 100 mm tem o tamanho de 100 mm na escala comum: 100 * escala */
    const barra = /<line x1="20" y1="\d+" x2="([\d.]+)"/.exec(duas.svg);
    expect(Number(barra[1]) - 20).toBeCloseTo(100 * duas.escala, 0);
    const oculto = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(caixa('a', [100, 60, 40]), [{ id: 'a', cor: 'azul' }], { ocultar: ['titulo', 'nota', 'escala'] })] });
    expect(oculto.svg).not.toContain('>Teste<');
    expect(oculto.svg).not.toContain('uma nota');
    expect(oculto.svg).not.toContain('100 mm');
  });

  it('usa a escala maior do modo lista quando o painel pede a chave em lista', () => {
    const colunas = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(caixa('a', [100, 60, 40]), [{ id: 'a', cor: 'azul' }])] });
    const lista = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(caixa('a', [100, 60, 40]), [{ id: 'a', cor: 'azul' }], { lista: true })] });
    expect(lista.escala).toBeGreaterThan(colunas.escala);
  });
});

describe('desenharBlocagem: faces, traços e oclusão', () => {
  it('desenha só as faces de frente e traça a silhueta e o vinco da caixa', () => {
    const frontal = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(caixa('a', [100, 60, 40]), [{ id: 'a', cor: 'azul' }])] }, { camada: true });
    expect(frontal.paineis[0]).toMatchObject({ volumes: 1, faces: 2, tracos: 4 });
    const iso = desenharBlocagem({ vista: 'isometrica', paineis: [painelDe(caixa('a', [100, 60, 40]), [{ id: 'a', cor: 'azul' }])] }, { camada: true });
    expect(iso.paineis[0]).toMatchObject({ volumes: 1, faces: 6, tracos: 9 });
    expect(frontal.camada.formas).toHaveLength(1);
    expect(frontal.camada.formas[0].faces).toHaveLength(2);
  });

  it('tira do traço o que o próprio volume esconde: a parede do furo vista de lado', () => {
    const malha = prismaVazado('anel', 50, 20, 40);
    const volumes = [{ id: 'anel', cor: 'cinza' }];
    /* de frente (olho em z) a parede do furo está de perfil e o furo mostra os dois contornos */
    expect(desenharBlocagem({ vista: 'frontal', paineis: [painelDe(malha, volumes)] }).paineis[0].tracos).toBe(8);
    /* de lado (olho em x) a parede do furo do lado oposto olha para o observador, mas o corpo a cobre: só o contorno da parede de fora fica */
    expect(desenharBlocagem({ vista: 'lateral', paineis: [painelDe(malha, volumes)] }).paineis[0].tracos).toBe(4);
  });

  it('escolhe os volumes pela lista e na ordem dela (o que vem depois ganha no mesmo plano)', () => {
    const a = caixa('a', [100, 60, 40]);
    const b = caixa('b', [30, 30, 40], [0, 0, 20]);
    const base = a.vertices.length;
    const malha = { vertices: [...a.vertices, ...b.vertices], faces: [...a.faces, ...b.faces.map((f) => ({ ...f, vertices: f.vertices.map((i) => i + base) }))] };
    const so = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(malha, [{ id: 'b', cor: 'verde' }])] }, { camada: true });
    expect(so.camada.formas.map((f) => f.id)).toEqual(['b']);
    const dois = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(malha, [{ id: 'a', cor: 'azul' }, { id: 'b', cor: 'verde', opacidade: 0.4 }])] }, { camada: true });
    expect(dois.camada.formas.map((f) => f.id)).toEqual(['a', 'b']);
    expect(dois.camada.formas[0].opacidade).toBe(1);
    expect(dois.camada.formas[1].opacidade).toBe(0.4);
    /* a face da frente de b (z = 40) fica mais perto do olho que a de a (z = 20) */
    const zDe = (f) => Math.max(...f.faces.flatMap((q) => q.c.map((p) => p[2])));
    expect(zDe(dois.camada.formas[1])).toBeGreaterThan(zDe(dois.camada.formas[0]));
  });

  /* A caixa cortada em duas partes no plano x = 0, sem parede no corte: um sólido só, com os vértices do corte divididos pelas duas. */
  function caixaEmDuasPartes([lx, ly, lz]) {
    const vertices = [];
    for (const z of [-lz / 2, lz / 2]) for (const y of [-ly / 2, ly / 2]) for (const x of [-lx / 2, 0, lx / 2]) vertices.push([x, y, z]);
    const v = (ix, iy, iz) => iz * 6 + iy * 3 + ix;
    const quad = (a, b, c, d, volume) => [{ vertices: [a, b, c], volume }, { vertices: [a, c, d], volume }];
    const faces = [];
    for (const [i, volume] of [[0, 'esquerda'], [1, 'direita']]) {
      faces.push(...quad(v(i, 0, 1), v(i + 1, 0, 1), v(i + 1, 1, 1), v(i, 1, 1), volume)); // z +
      faces.push(...quad(v(i, 0, 0), v(i, 1, 0), v(i + 1, 1, 0), v(i + 1, 0, 0), volume)); // z -
      faces.push(...quad(v(i, 0, 0), v(i + 1, 0, 0), v(i + 1, 0, 1), v(i, 0, 1), volume)); // y -
      faces.push(...quad(v(i, 1, 0), v(i, 1, 1), v(i + 1, 1, 1), v(i + 1, 1, 0), volume)); // y +
    }
    faces.push(...quad(v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0), 'esquerda')); // x -
    faces.push(...quad(v(2, 0, 0), v(2, 1, 0), v(2, 1, 1), v(2, 0, 1), 'direita')); // x +
    return { vertices, faces };
  }

  it('não traça a divisão entre duas partes da mesma face plana, e traça o vinco que passa por ela', () => {
    const malha = caixaEmDuasPartes([100, 60, 40]);
    expect(volumeAssinado(malha)).toBeCloseTo(100 * 60 * 40, 6);
    const volumes = [{ id: 'esquerda', cor: 'azul' }, { id: 'direita', cor: 'verde' }];
    /* de frente, o contorno da face z + em duas metades: seis trechos, e nenhum no corte x = 0 */
    const frontal = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(malha, volumes)] });
    expect(frontal.paineis[0].tracos).toBe(6);
    /* na isométrica, o vinco entre a frente e o topo atravessa o corte e fica traçado nas duas partes */
    const iso = desenharBlocagem({ vista: 'isometrica', paineis: [painelDe(malha, volumes)] });
    const inteira = desenharBlocagem({ vista: 'isometrica', paineis: [painelDe(caixa('a', [100, 60, 40]), [{ id: 'a', cor: 'azul' }])] });
    expect(iso.paineis[0].tracos).toBe(inteira.paineis[0].tracos + 3);
  });

  it('dá o mesmo desenho para a mesma entrada, byte a byte', () => {
    const entrada = () => ({ vista: 'isometrica', paineis: [painelDe(prismaVazado('anel', 50, 20, 40), [{ id: 'anel', cor: 'laranja' }])] });
    const a = desenharBlocagem(entrada(), { camada: true });
    const b = desenharBlocagem(entrada(), { camada: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('recusa vista desconhecida, painel sem volume e volume que a malha não tem', () => {
    const malha = caixa('a', [10, 10, 10]);
    expect(() => desenharBlocagem({ vista: 'traseira', paineis: [painelDe(malha, [{ id: 'a' }])] })).toThrow(ErroDeEsboco);
    expect(() => desenharBlocagem({ vista: 'frontal', paineis: [painelDe(malha, [])] })).toThrow(/volumes/);
    expect(() => desenharBlocagem({ vista: 'frontal', paineis: [painelDe(malha, [{ id: 'z' }])] })).toThrow(/nenhum dos volumes/);
    expect(() => desenharBlocagem({ vista: 'frontal', paineis: [] })).toThrow(/paineis/);
  });

  it('devolve o SVG sobre a camada com o lugar da imagem das formas', () => {
    const r = desenharBlocagem({ vista: 'frontal', paineis: [painelDe(caixa('a', [10, 10, 10]), [{ id: 'a', cor: 'azul' }])] }, { camada: true });
    expect(r.svgSobreCamada).toContain('href="__CAMADA__"');
    expect(r.svg).not.toContain('__CAMADA__');
    expect(r.svg).toContain('<path');
  });
});
