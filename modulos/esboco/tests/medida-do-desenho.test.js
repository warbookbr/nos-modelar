/* A medida do desenho de linhas (`medida-do-desenho.js`), a parte que não precisa de navegador: a base da vista, os triângulos da
   referência, a máscara dos traços, a histerese e as faíscas da referência, e a comparação com a tolerância (vazamento e falha, em grupos).
   A prova da medida inteira, com o WebGL, está em `tools/modelar/medida-do-desenho.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { VISTAS } from '../src/index.js';
import {
  FOLGA_DO_PIXEL, TOLERANCIA_DO_DESENHO, arestaPorHisterese, baseDaVista, compararComAReferencia, dilatar, gruposDaMascara, mascaraDosTracos, tirarFaiscas,
  triangulosDaReferencia,
} from '../src/medida-do-desenho.js';

/* uma máscara de `l` x `a` com os pixels dados */
const mascara = (l, a, pixels) => { const m = new Uint8Array(l * a); for (const [x, y] of pixels) m[y * l + x] = 1; return m; };
const linhaH = (y, x0, x1) => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y]);

describe('baseDaVista', () => {
  it('dá o olho unitário e os eixos da tela unitários, com a escala do plano (1,2247 na isométrica, 1 nas outras)', () => {
    const iso = baseDaVista(VISTAS.isometrica);
    expect(Math.hypot(...iso.u)).toBeCloseTo(1, 9);
    expect(Math.hypot(...iso.v)).toBeCloseTo(1, 9);
    expect(Math.hypot(...iso.olho)).toBeCloseTo(1, 9);
    expect(iso.u.reduce((s, c, i) => s + c * iso.olho[i], 0)).toBeCloseTo(0, 9);
    expect(iso.mmPorUnidade).toBeCloseTo(1 / Math.sqrt(1.5), 9);
    expect(baseDaVista(VISTAS.frontal).mmPorUnidade).toBe(1);
  });

  it('recusa uma projeção que não é ortogonal e uniforme', () => {
    expect(() => baseDaVista({ olho: [0, 0, 1], p: ([x, y]) => [2 * x, y] })).toThrow(/ortogonal/);
  });
});

describe('triangulosDaReferencia', () => {
  const malha = { vertices: [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 5]], faces: [{ vertices: [0, 1, 2], volume: 'a' }, { vertices: [0, 2, 1], volume: 'a' }, { vertices: [0, 1, 3], volume: 'b' }] };

  it('leva só o triângulo de frente dos volumes pedidos, com a posição no quadro, a profundidade e a normal na tela', () => {
    const t = triangulosDaReferencia({ malha, volumes: ['a'], V: VISTAS.frontal, tela: (q) => [q[0] * 2 + 100, q[1] * 2 + 50] });
    expect(t.pos).toHaveLength(9);
    expect(t.pos.slice(0, 3)).toEqual([100, 50, 0]);
    expect(t.nor.slice(0, 3).map((x) => x + 0)).toEqual([0, 0, 1]);
    expect(t.mmPorUnidade).toBe(1);
  });

  it('diz quando não sobra triângulo nenhum', () => {
    expect(() => triangulosDaReferencia({ malha, volumes: ['c'], V: VISTAS.frontal, tela: (q) => q })).toThrow(/nenhum triângulo/);
  });
});

describe('mascaraDosTracos', () => {
  const imagem = (cores) => ({ width: cores.length, height: 1, data: Uint8Array.from(cores.flatMap((c) => [...c, 255])) });

  it('marca o pixel em que a fita cobre ao menos metade, seja qual for a cor da face, e não o que já era escuro sem ela', () => {
    const sem = imagem([[255, 255, 255], [140, 0, 0], [140, 0, 0], [17, 17, 17]]);
    const com = imagem([[255, 255, 255], [140, 0, 0], [70, 8, 8], [17, 17, 17]]);
    /* o segundo pixel não mudou, o terceiro ficou a mais da metade do caminho até o traço, e o quarto já era a cor do traço */
    const m = mascaraDosTracos(com, sem, [0, 0, 4, 1]);
    expect(Array.from(m)).toEqual([0, 0, 1, 0]);
  });
});

describe('a referência: histerese e faíscas', () => {
  it('um pixel fraco só vale ligado a um forte, e o isolado some', () => {
    const l = 12; const a = 3;
    const contagem = new Uint8Array(l * a);
    /* uma linha com a ponta de uma amostra só, e um pixel solto de duas amostras longe dela */
    for (let x = 0; x < 6; x++) contagem[1 * l + x] = 8;
    contagem[1 * l + 6] = 1;
    contagem[1 * l + 10] = 2;
    const m = arestaPorHisterese(contagem, l, a);
    expect(m[1 * l + 6]).toBe(1);
    expect(m[1 * l + 10]).toBe(0);
  });

  it('tira o grupo pequeno e deixa o comprido', () => {
    const l = 20; const a = 3;
    const m = mascara(l, a, [...linhaH(1, 2, 12), [16, 1], [17, 1]]);
    const saida = tirarFaiscas(m, l, a);
    expect(saida[1 * l + 16]).toBe(0);
    expect(saida[1 * l + 5]).toBe(1);
  });
});

describe('compararComAReferencia', () => {
  const l = 60; const a = 20;

  it('a linha dentro da tolerância da aresta não é vazamento nem falha', () => {
    const r = compararComAReferencia({ tracos: mascara(l, a, linhaH(10, 5, 50)), referencia: mascara(l, a, linhaH(11, 5, 50)), largura: l, altura: a });
    expect(r.vazamento.pixels).toBe(0);
    expect(r.falha.pixels).toBe(0);
  });

  it('o traço longe da aresta é vazamento num grupo, e a aresta sem traço é falha num grupo, com a posição e o afastamento', () => {
    const r = compararComAReferencia({ tracos: mascara(l, a, linhaH(4, 5, 30)), referencia: mascara(l, a, linhaH(14, 5, 30)), largura: l, altura: a, origem: [100, 200] });
    expect(r.vazamento.pixels).toBe(26);
    expect(r.falha.pixels).toBe(26);
    expect(r.vazamento.grupos).toHaveLength(1);
    expect(r.vazamento.grupos[0].caixa).toEqual([105, 204, 130, 204]);
    expect(r.vazamento.grupos[0].centro).toEqual([117.5, 204]);
    expect(r.vazamento.grupos[0].afastamento).toBe(10);
    expect(r.falha.grupos[0].caixa).toEqual([105, 214, 130, 214]);
  });

  it('a tolerância é a distância entre centros de pixel, com a folga de um quarto de pixel', () => {
    const referencia = mascara(l, a, [[20, 10]]);
    const distantes = (d) => compararComAReferencia({ tracos: mascara(l, a, [[20 + d, 10]]), referencia, largura: l, altura: a }).vazamento.pixels;
    expect(distantes(2)).toBe(0);
    expect(distantes(3)).toBe(1);
    /* o canto da fita, a dois pixels para um lado e um para o outro (2,24), cabe na folga */
    expect(compararComAReferencia({ tracos: mascara(l, a, [[22, 11]]), referencia, largura: l, altura: a }).vazamento.pixels).toBe(0);
    expect(TOLERANCIA_DO_DESENHO + FOLGA_DO_PIXEL).toBeGreaterThan(Math.hypot(2, 1));
    /* e com a tolerância pedida menor, o mesmo pixel passa a vazar */
    expect(compararComAReferencia({ tracos: mascara(l, a, [[22, 11]]), referencia, largura: l, altura: a, tolerancia: 1 }).vazamento.pixels).toBe(1);
  });

  it('separa os grupos que não se tocam e conta os que se tocam pela diagonal como um só', () => {
    const grupos = gruposDaMascara(mascara(10, 10, [[1, 1], [2, 2], [3, 3], [7, 7]]), 10, 10);
    expect(grupos.map((g) => g.pixels)).toEqual([3, 1]);
  });

  it('dilatar espalha por um disco', () => {
    const d = dilatar(mascara(9, 9, [[4, 4]]), 9, 9, 2);
    expect(d[4 * 9 + 6]).toBe(1);
    expect(d[6 * 9 + 6]).toBe(0);
  });

  it('recusa máscaras de tamanhos diferentes', () => {
    expect(() => compararComAReferencia({ tracos: new Uint8Array(4), referencia: new Uint8Array(5), largura: 2, altura: 2 })).toThrow(/tamanho/);
  });
});
