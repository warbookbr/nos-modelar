/* Oclusão por pixel nas imagens PNG do esboço. O desenho em SVG pinta cada forma inteira por cima ou por baixo das outras
   (profundidade média), e erra quando uma forma longa passa por trás e depois pela frente de outra, quando duas se
   encostam no mesmo plano e quando uma está dentro de outra. A camada das formas (camada.js) leva as faces com a
   profundidade de cada vértice a um WebGL com buffer de profundidade, e cada teste lê o pixel onde a forma da frente tem
   de aparecer e confere a cor. A cor esperada vem das próprias faces da camada: as formas de cada fixture têm cores de
   base diferentes, e longe das arestas o pixel é exatamente a cor da face. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { desenharEsboco, VISTAS } from '../src/index.js';
import { passoDeDesempate } from '../src/camada.js';
import { desenhoParaPng, svgParaPng } from '../../../tools/modelar/esboco.mjs';

let navegador;
let pasta;
beforeAll(async () => {
  navegador = await (await import('playwright')).default.chromium.launch();
  pasta = mkdtempSync(join(tmpdir(), 'esboco-pixel-'));
});
afterAll(async () => {
  await navegador?.close();
  if (pasta) rmSync(pasta, { recursive: true, force: true });
});

const esboco = (vista, formas, extra = {}) => ({ vista, geometria: true, ocultar: ['titulo', 'escala', 'nota'], opcoes: [{ titulo: 'T', formas }], ...extra });
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/* Desenha com a camada, grava o PNG e devolve a leitura de pixels pelo ponto 3D da vista. */
async function fotografar(e, nome, { webgl = true } = {}) {
  const r = desenharEsboco(e, { camada: true });
  const destino = join(pasta, `${nome}.png`);
  if (webgl) await desenhoParaPng(r, null, destino, navegador);
  else await svgParaPng(r.svg, r.largura, r.altura, destino, navegador);
  const png = PNG.sync.read(readFileSync(destino));
  const { cx, cy } = r.geometria.paineis[0];
  const p = VISTAS[e.vista].p;
  const pixelDe = (x, y) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]]; };
  return {
    r,
    png,
    bytes: readFileSync(destino),
    /* o pixel onde cai o ponto 3D */
    em: (ponto3) => { const q = p(ponto3); return pixelDe(Math.round(cx + q[0] * r.geometria.escala), Math.round(cy + q[1] * r.geometria.escala)); },
    /* as cores (hexadecimais) das faces de uma forma, como a camada as entregou */
    coresDe: (id) => new Set(r.camada.formas.find((f) => f.id === id).faces.map((f) => f.k)),
  };
}
const ehDe = (pixel, cores) => [...cores].some((k) => rgb(k).every((c, i) => Math.abs(c - pixel[i]) <= 1));

describe('tubo longo que passa por trás de uma placa e sai pela frente', () => {
  /* o cilindro vai de z=-100 a z=+100 e atravessa o plano da placa (z de -10 a 10) em x=0: atrás dela à esquerda, na frente à direita.
     Os dois têm o centro em z=0, e a profundidade média não decide */
  const formas = [
    { id: 'placa', tipo: 'caixa', largura: 200, altura: 200, profundidade: 20, centro: [0, 0, 0], cor: 'azul' },
    { id: 'tubo', tipo: 'cilindro', diametro: 20, de: [-300, 0, -100], para: [300, 0, 100], cor: 'laranja' },
  ];
  it('a placa cobre o tubo onde ele está atrás e o tubo cobre a placa onde está na frente', async () => {
    const f = await fotografar(esboco('frontal', formas), 'tubo-cilindro');
    expect(ehDe(f.em([-80, 0, 0]), f.coresDe('placa'))).toBe(true);
    expect(ehDe(f.em([80, 0, 0]), f.coresDe('tubo'))).toBe(true);
    /* e fora da placa o tubo aparece dos dois lados */
    expect(ehDe(f.em([-200, 0, 0]), f.coresDe('tubo'))).toBe(true);
  });
  it('o pintor por forma erra um dos dois lados (é o defeito que a camada corrige)', async () => {
    const f = await fotografar(esboco('frontal', formas), 'tubo-cilindro-svg', { webgl: false });
    const certo = ehDe(f.em([-80, 0, 0]), f.coresDe('placa')) && ehDe(f.em([80, 0, 0]), f.coresDe('tubo'));
    expect(certo).toBe(false);
  });
  it('um tubo por pontos que corre atrás da placa e vem para a frente dela também', async () => {
    const tubo = { id: 'tubo', tipo: 'tubo', diametro: 20, cor: 'laranja', caminho: [[-300, 0, -100], [0, 0, -100], [0, 0, 100], [300, 0, 100]] };
    const f = await fotografar(esboco('frontal', [formas[0], tubo]), 'tubo-por-pontos');
    expect(ehDe(f.em([-50, 0, 0]), f.coresDe('placa'))).toBe(true);
    expect(ehDe(f.em([50, 0, 0]), f.coresDe('tubo'))).toBe(true);
  });
});

describe('peça única encostada à frente de outra', () => {
  /* a barra encosta na frente da placa (z=18) e vai para o lado em -x: o centro dela fica mais longe do olho isométrico que o da placa,
     e o pintor a põe atrás da placa mesmo na parte que está na frente */
  const formas = [
    { id: 'placa', tipo: 'caixa', largura: 200, altura: 100, profundidade: 18, centro: [0, 0, 9], cor: 'azul' },
    { id: 'barra', tipo: 'caixa', largura: 300, altura: 100, profundidade: 18, centro: [-150, 0, 27], cor: 'laranja' },
  ];
  it('a barra aparece inteira sobre a face da placa na isométrica', async () => {
    const f = await fotografar(esboco('isometrica', formas), 'barra-encostada');
    expect(ehDe(f.em([-50, 0, 36]), f.coresDe('barra'))).toBe(true);
    expect(ehDe(f.em([-20, 20, 36]), f.coresDe('barra'))).toBe(true);
    /* onde a placa não tem barra na frente, a face dela continua visível */
    expect(ehDe(f.em([60, 0, 18]), f.coresDe('placa'))).toBe(true);
  });
  it('o pintor por forma cobre a barra com a placa', async () => {
    const f = await fotografar(esboco('isometrica', formas), 'barra-encostada-svg', { webgl: false });
    expect(ehDe(f.em([-50, 0, 36]), f.coresDe('barra'))).toBe(false);
  });
});

describe('barra interna numa caixa fechada', () => {
  const formas = [
    { id: 'caixa', tipo: 'caixa', largura: 400, altura: 200, profundidade: 200, centro: [0, 0, 0], cor: 'azul' },
    { id: 'barra', tipo: 'cilindro', diametro: 20, de: [-180, 0, 0], para: [180, 0, 0], cor: 'laranja' },
  ];
  for (const vista of ['frontal', 'isometrica', 'superior']) {
    it(`a barra não aparece na vista ${vista}`, async () => {
      const f = await fotografar(esboco(vista, formas), `barra-interna-${vista}`);
      const topo = vista === 'superior' ? [0, 100, 0] : vista === 'frontal' ? [0, 0, 100] : [0, 100, 0];
      expect(ehDe(f.em(topo), f.coresDe('caixa'))).toBe(true);
      expect(ehDe(f.em([100, 0, 100]), f.coresDe('barra'))).toBe(false);
    });
  }
  it('a ordem em que as formas são declaradas não muda o que aparece', async () => {
    const f = await fotografar(esboco('frontal', [...formas].reverse()), 'barra-interna-invertida');
    expect(ehDe(f.em([0, 0, 100]), f.coresDe('caixa'))).toBe(true);
  });
});

describe('formas que se tocam no mesmo plano', () => {
  /* a frente pequena e a placa grande têm a face da frente no mesmo plano (z=18): sem regra, as duas disputam cada pixel */
  const placa = { id: 'placa', tipo: 'caixa', largura: 300, altura: 300, profundidade: 18, centro: [0, 0, 9], cor: 'azul' };
  const frente = { id: 'frente', tipo: 'caixa', largura: 100, altura: 100, profundidade: 18, centro: [0, 0, 9], cor: 'laranja' };
  const amostra = (f, cores, fora) => {
    let acertos = 0;
    let total = 0;
    for (let x = -40; x <= 40; x += 8) for (let y = -40; y <= 40; y += 8) { total++; if (ehDe(f.em([x, y, 18]), cores)) acertos++; }
    return { acertos, total, fora: fora && ehDe(f.em([120, 0, 18]), fora) };
  };
  it('a forma declarada depois vence em todos os pixels do encosto, sem listras', async () => {
    const f = await fotografar(esboco('frontal', [placa, frente]), 'plano-comum');
    const a = amostra(f, f.coresDe('frente'), f.coresDe('placa'));
    expect(a.acertos).toBe(a.total);
    expect(a.fora).toBe(true);
  });
  it('invertida a ordem, vence a outra, também sem listras', async () => {
    const f = await fotografar(esboco('frontal', [frente, placa]), 'plano-comum-invertido');
    const a = amostra(f, f.coresDe('placa'));
    expect(a.acertos).toBe(a.total);
  });
  it('o viés de desempate cabe no passo declarado, abaixo de 0,4 mm no total', () => {
    expect(passoDeDesempate(2)).toBe(0.004);
    expect(passoDeDesempate(500) * 500).toBeLessThanOrEqual(0.4 + 1e-9);
  });
});

describe('opacidade parcial', () => {
  it('a placa translúcida mistura a cor dela com a da barra que está atrás, e com o fundo onde não há nada', async () => {
    const formas = [
      { id: 'barra', tipo: 'cilindro', diametro: 40, de: [-200, 0, -50], para: [200, 0, -50], cor: 'laranja' },
      { id: 'vidro', tipo: 'caixa', largura: 200, altura: 200, profundidade: 20, centro: [0, 0, 20], cor: 'azul', opacidade: 0.5 },
    ];
    const f = await fotografar(esboco('frontal', formas), 'translucida');
    const k = [...f.coresDe('vidro')][0];
    const fundo = f.em([0, 80, 30]);
    const sobreBarra = f.em([0, 0, 30]);
    const cor = rgb(k);
    const barra = rgb([...f.coresDe('barra')].sort()[0]);
    /* sobre o fundo branco: metade da cor da placa, metade de branco */
    cor.forEach((c, i) => expect(Math.abs(fundo[i] - (0.5 * c + 0.5 * 255))).toBeLessThanOrEqual(2));
    /* sobre a barra: metade da cor da placa, metade da barra, que é mais escura que o branco */
    expect(sobreBarra[0] + sobreBarra[1] + sobreBarra[2]).toBeLessThan(fundo[0] + fundo[1] + fundo[2] - 30);
    expect(barra.length).toBe(3);
    /* as faces da própria placa não escurecem onde se sobrepõem: o fundo é uma só camada de 50% */
    expect(fundo[3]).toBe(255);
  });
});

describe('determinismo e caminho SVG', () => {
  const formas = [
    { id: 'placa', tipo: 'caixa', largura: 200, altura: 200, profundidade: 20, centro: [0, 0, 0], cor: 'azul' },
    { id: 'tubo', tipo: 'cilindro', diametro: 20, de: [-300, 0, -100], para: [300, 0, 100], cor: 'laranja' },
    { id: 'vidro', tipo: 'caixa', largura: 120, altura: 120, profundidade: 20, centro: [0, 0, 60], cor: 'verde', opacidade: 0.4 },
  ];
  const hash = (b) => createHash('sha256').update(b).digest('hex');
  it('o mesmo esboço gera o mesmo PNG em execuções seguidas', async () => {
    const a = await fotografar(esboco('isometrica', formas), 'det-a');
    const b = await fotografar(esboco('isometrica', formas), 'det-b');
    expect(hash(a.bytes)).toBe(hash(b.bytes));
    const c = await fotografar(esboco('isometrica', formas, { ladosPorEscala: true }), 'det-c');
    const d = await fotografar(esboco('isometrica', formas, { ladosPorEscala: true }), 'det-d');
    expect(hash(c.bytes)).toBe(hash(d.bytes));
  });
  it('o SVG puro não muda com a camada e não leva marcador nem imagem', () => {
    const e = esboco('isometrica', formas);
    const sem = desenharEsboco(e);
    const com = desenharEsboco(e, { camada: true });
    expect(com.svg).toBe(sem.svg);
    expect(sem.camada).toBeUndefined();
    expect(com.svg).not.toContain('__CAMADA__');
    expect(com.svgSobreCamada).toContain('__CAMADA__');
    expect(com.svgSobreCamada).not.toContain('fill-rule="evenodd"');
    expect(com.svgSobreCamada.length).toBeLessThan(com.svg.length);
  });
  it('a camada traz a mesma quantidade de formas do desenho e profundidade em cada vértice', () => {
    const r = desenharEsboco(esboco('isometrica', formas), { camada: true });
    expect(r.camada.formas.map((f) => f.id)).toEqual(['placa', 'tubo', 'vidro']);
    expect(r.camada.formas[2].opacidade).toBe(0.4);
    expect(r.camada.formas[0].faces[0].c[0]).toHaveLength(3);
    expect(r.camada.zMax).toBeGreaterThan(r.camada.zMin);
  });
});
