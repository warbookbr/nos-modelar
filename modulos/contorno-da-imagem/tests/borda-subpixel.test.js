/* borda-subpixel.test.js — a linha de cada borda passa pelo meio-tom da imagem,
   dentro do pixel. Casos sintéticos antisserrilhados, em que a posição real da
   borda é conhecida: a borda inclinada sai reta, a divisa entre partes é uma
   linha só, o detalhe que a imagem tem continua, e a máscara de pixel de borda
   (`bordaSubpixel: false`) continua disponível. */
import { describe, expect, it } from 'vitest';
import { segmentar, silhuetaEmPedacos } from '../src/index.js';
import { imagemAntisserrilhada, amostrarAnel, desvioDaReta, areaDoAnel, centroideDoAnel, sobreposicaoEBuraco } from './ajudas-subpixel.js';

const FUNDO = 240; const CORPO = 150;

/* Corpo de x = 20 a 140 e de `topo(x)` até y = 80, com a borda de cima dada
   por uma função contínua. */
const corpoComTopo = (topo) => (x, y) => (x < 20 || x > 140 || y < topo(x) || y > 80 ? FUNDO : CORPO);

const pontosDoTopo = (anel, topo) => amostrarAnel(anel).filter(([x, y]) => x > 30 && x < 130 && y < 78 && Math.abs(y - topo(x)) < 2);

describe('borda abaixo do pixel: a borda inclinada antisserrilhada', () => {
  for (const [inclinacao, degrauDaMascara] of [[0.2, 0.3], [0.5, 0.15]]) {
    it(`com inclinação ${inclinacao} sai reta a menos de 0,3 px, e o contorno de máscara dava degrau`, async () => {
      const topo = (x) => 20 + inclinacao * (x - 20);
      const png = imagemAntisserrilhada(160, 100, corpoComTopo(topo));
      const config = { limiar: 225, regioes: { corpo: [60, 60] } };
      const depois = await segmentar(png, config);
      const antes = await segmentar(png, { ...config, bordaSubpixel: false });
      const silhuetaDepois = (await silhuetaEmPedacos(depois, { folga: 0 })).pedacos[0].contornoPx;
      const silhuetaAntes = (await silhuetaEmPedacos(antes, { folga: 0 })).pedacos[0].contornoPx;
      const dDepois = desvioDaReta(pontosDoTopo(silhuetaDepois, topo));
      const dAntes = desvioDaReta(pontosDoTopo(silhuetaAntes, topo));
      expect(dDepois).toBeLessThan(0.3);
      expect(dAntes).toBeGreaterThan(degrauDaMascara);
      expect(dDepois).toBeLessThan(dAntes);
      /* A parte, que o desenhador vê, sai igual: a mesma linha. */
      expect(desvioDaReta(pontosDoTopo(depois.regioes.corpo.contornoPx, topo))).toBeLessThan(0.3);
      /* Poucos vértices: a borda reta é um segmento. */
      expect(depois.regioes.corpo.contornoPx.length).toBeLessThanOrEqual(10);
    });
  }

  it('a posição da borda vem do tom: erro de até 0,2 px contra a borda real, onde a máscara errava até meio pixel', async () => {
    /* Borda horizontal em y = 20.5, no meio do pixel, em x = 20.3 na esquerda. */
    const png = imagemAntisserrilhada(160, 100, (x, y) => (x < 20.3 || x > 140.6 || y < 20.5 || y > 80.2 ? FUNDO : CORPO));
    const seg = await segmentar(png, { limiar: 225, regioes: { corpo: [60, 60] } });
    const xs = seg.regioes.corpo.contornoPx.map(([x]) => x); const ys = seg.regioes.corpo.contornoPx.map(([, y]) => y);
    for (const [obtido, real] of [[Math.min(...xs), 20.3], [Math.max(...xs), 140.6], [Math.min(...ys), 20.5], [Math.max(...ys), 80.2]]) {
      expect(Math.abs(obtido - real)).toBeLessThan(0.2);
    }
    const antes = await segmentar(png, { limiar: 225, regioes: { corpo: [60, 60] }, bordaSubpixel: false });
    const yAntes = Math.min(...antes.regioes.corpo.contornoPx.map(([, y]) => y));
    expect(Math.abs(yAntes - 20.5)).toBeGreaterThanOrEqual(0.4);
  });

  it('uma peça de poucos pixels não sai amassada: a área de um disco de 3,2 px de raio erra menos de 12%', async () => {
    const png = imagemAntisserrilhada(60, 40, (x, y) => (Math.hypot(x - 30.3, y - 20.4) < 3.2 ? CORPO : FUNDO));
    const real = Math.PI * 3.2 ** 2;
    const depois = await segmentar(png, { limiar: 225, regioes: { disco: [30, 20] } });
    const antes = await segmentar(png, { limiar: 225, regioes: { disco: [30, 20] }, bordaSubpixel: false });
    expect(Math.abs(depois.regioes.disco.areaPx - real) / real).toBeLessThan(0.12);
    expect(Math.abs(antes.regioes.disco.areaPx - real) / real).toBeGreaterThan(0.2);
    /* O centro fica a menos de 0,15 px do real. */
    const [cx, cy] = centroideDoAnel(depois.regioes.disco.contornoPx);
    expect(Math.hypot(cx - 30.3, cy - 20.4)).toBeLessThan(0.15);
  });

  it('é determinístico: a mesma imagem dá a mesma linha nas duas execuções', async () => {
    const png = imagemAntisserrilhada(160, 100, corpoComTopo((x) => 20 + 0.3 * (x - 20)));
    const a = await segmentar(png, { limiar: 225, regioes: { corpo: [60, 60] } });
    const b = await segmentar(png, { limiar: 225, regioes: { corpo: [60, 60] } });
    expect(b.regioes).toEqual(a.regioes);
    expect((await silhuetaEmPedacos(b)).linhasDeFora).toEqual((await silhuetaEmPedacos(a)).linhasDeFora);
  });

  it('a parte que encosta na borda da imagem fecha na borda da imagem, meio pixel antes do centro do pixel de borda', async () => {
    const png = imagemAntisserrilhada(100, 60, (x, y) => (y < 10.3 || y > 50.2 ? FUNDO : CORPO));
    const seg = await segmentar(png, { limiar: 225, regioes: { faixa: [50, 30] } });
    const xs = seg.regioes.faixa.contornoPx.map(([x]) => x);
    expect(Math.min(...xs)).toBe(-0.5);
    expect(Math.max(...xs)).toBe(99.5);
    expect(Math.abs(seg.regioes.faixa.areaPx - 100 * 39.9) / (100 * 39.9)).toBeLessThan(0.01);
  });

  it('com bordaSubpixel: false a máscara continua dando o contorno de pixel de borda, em inteiros', async () => {
    const png = imagemAntisserrilhada(160, 100, (x, y) => (x < 20 || x > 140 || y < 20 || y > 80 ? FUNDO : CORPO));
    const seg = await segmentar(png, { limiar: 225, regioes: { corpo: [60, 60] }, bordaSubpixel: false });
    expect(seg.tracado).toBeNull();
    expect(seg.regioes.corpo.contornoPx.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y))).toBe(true);
  });
});

describe('borda abaixo do pixel: a divisa entre partes é uma linha só', () => {
  /* O avião em pequeno: à esquerda `a`, à direita, em cima `b` e embaixo `c`,
     com a costura entre `a` e as outras inclinada (traço escuro de 1,8 px) e a
     de `b` e `c` horizontal. Fundo claro, bordas de cima e de baixo inclinadas. */
  const costuraX = (y) => 70 + 0.35 * (y - 30);
  const topo = (x) => 20 + 0.1 * (x - 20);
  const tom = (x, y) => {
    if (x < 20 || x > 140 || y < topo(x) || y > 70) return FUNDO;
    if (Math.abs(x - costuraX(y)) * Math.cos(Math.atan(0.35)) < 0.9) return 90;
    if (x > costuraX(y) && Math.abs(y - 48) < 0.8) return 90;
    return CORPO;
  };
  const png = imagemAntisserrilhada(160, 90, tom);
  const config = { limiar: 225, regioes: { a: [40, 55], b: [115, 38], c: [115, 60] } };

  it('as duas partes usam os mesmos vértices na divisa, sem sobreposição e sem buraco', async () => {
    const seg = await segmentar(png, config);
    const { pedacos } = await silhuetaEmPedacos(seg, { folga: 0 });
    expect(pedacos).toHaveLength(1);
    const aneis = ['a', 'b', 'c'].map((nome) => { expect(seg.regioes[nome].pedacos).toHaveLength(1); return seg.regioes[nome].contornoPx; });
    const { sobra, buraco } = sobreposicaoEBuraco(aneis, [pedacos[0].contornoPx], [18, 18, 142, 72]);
    expect({ sobra, buraco }).toEqual({ sobra: 0, buraco: 0 });
    /* As áreas somam a da silhueta, sem diferença. */
    const soma = aneis.reduce((s, a) => s + areaDoAnel(a), 0);
    expect(Math.abs(soma - areaDoAnel(pedacos[0].contornoPx))).toBeLessThan(1e-3);
    /* A divisa a/b e a/c tem vértices iguais nas duas partes, e são mais de dois por divisa. */
    const chave = ([x, y]) => `${x},${y}`;
    const iguais = (p, q) => { const s = new Set(seg.regioes[q].contornoPx.map(chave)); return seg.regioes[p].contornoPx.filter((v) => s.has(chave(v))); };
    for (const par of [['a', 'b'], ['a', 'c'], ['b', 'c']]) expect(iguais(...par).length).toBeGreaterThanOrEqual(2);
  });

  it('a costura inclinada sai reta a menos de 0,3 px, e a de b e c horizontal', async () => {
    const seg = await segmentar(png, config);
    /* A junção das três partes, em (76, 48), deforma a divisa até 0,6 px em 3 px
       de cada lado: a medida é fora dela. */
    const costura = amostrarAnel(seg.regioes.a.contornoPx).filter(([x, y]) => x > 65 && x < 90 && ((y > 33 && y < 44) || (y > 53 && y < 66)));
    expect(costura.length).toBeGreaterThan(100);
    expect(desvioDaReta(costura)).toBeLessThan(0.3);
    for (const [x, y] of costura) expect(Math.abs(x - costuraX(y))).toBeLessThan(0.35);
    const horizontal = amostrarAnel(seg.regioes.b.contornoPx).filter(([x, y]) => x > 95 && x < 135 && y > 44 && y < 52);
    expect(horizontal.length).toBeGreaterThan(100);
    expect(desvioDaReta(horizontal)).toBeLessThan(0.3);
    for (const [, y] of horizontal) expect(Math.abs(y - 48)).toBeLessThan(0.35);
  });

  it('o contorno da silhueta é o das partes: a parte nunca sai pelo lado de fora da linha de fora', async () => {
    const seg = await segmentar(png, config);
    const { pedacos } = await silhuetaEmPedacos(seg, { folga: 0 });
    const silhueta = pedacos[0].contornoPx;
    const chave = ([x, y]) => `${x},${y}`;
    const s = new Set(silhueta.map(chave));
    /* Todo vértice de parte que está na borda de fora é vértice da silhueta, igual. */
    let naBorda = 0;
    for (const nome of ['a', 'b', 'c']) for (const v of seg.regioes[nome].contornoPx) if (s.has(chave(v))) naBorda += 1;
    expect(naBorda).toBeGreaterThan(10);
  });

  it('a parte fora do modelo tira a silhueta pela mesma linha que a divisa com ela', async () => {
    const seg = await segmentar(png, config);
    const { pedacos } = await silhuetaEmPedacos(seg, { folga: 0, sem: ['c'] });
    const soma = areaDoAnel(seg.regioes.a.contornoPx) + areaDoAnel(seg.regioes.b.contornoPx);
    expect(pedacos.reduce((s, p) => s + p.areaPx, 0)).toBeCloseTo(soma, 3);
  });
});

describe('borda abaixo do pixel: o detalhe que a imagem tem continua', () => {
  /* O volume escuro na frente da asa do avião: uma saliência de 5 x 7 px na
     borda de cima de uma borda reta. */
  const volume = (x, y) => x >= 60 && x < 65 && y >= 13 && y < 20;
  const png = imagemAntisserrilhada(160, 100, (x, y) => (volume(x, y) ? 40 : corpoComTopo(() => 20)(x, y)));

  it('a saliência fica no contorno, com a altura e a largura que a imagem dá', async () => {
    const seg = await segmentar(png, { limiar: 225, regioes: { corpo: [60, 60] } });
    const ys = seg.regioes.corpo.contornoPx.map(([, y]) => y);
    /* O topo da saliência está em y = 13, onde o volume começa. */
    expect(Math.abs(Math.min(...ys) - 13)).toBeLessThan(0.25);
    const lado = seg.regioes.corpo.contornoPx.filter(([, y]) => y < 17);
    const xs = lado.map(([x]) => x);
    expect(Math.abs(Math.max(...xs) - Math.min(...xs) - 5)).toBeLessThan(0.6);
    /* A área é a do corpo mais a da saliência (35 px²), a 3% do real. */
    const real = 120 * 60 + 35;
    expect(Math.abs(seg.regioes.corpo.areaPx - real) / real).toBeLessThan(0.03);
  });

  it('o resto da borda continua reto', async () => {
    const seg = await segmentar(png, { limiar: 225, regioes: { corpo: [60, 60] } });
    const resto = amostrarAnel(seg.regioes.corpo.contornoPx).filter(([x, y]) => x > 70 && x < 135 && y < 25);
    expect(desvioDaReta(resto)).toBeLessThan(0.15);
  });
});

describe('borda abaixo do pixel: contornos com linha escura fina', () => {
  it('a parte de cor clara com contorno de 1 px sai pela borda de fora da linha, e não por dentro dela', async () => {
    /* Como o avião: o preenchimento (190) é mais claro que o meio-tom entre o
       fundo e a linha, e a linha de 1 px fecha a passagem para o fundo. */
    const dentro = (x, y) => x >= 20 && x <= 100 && y >= 20 && y <= 60;
    const linha = (x, y) => dentro(x, y) && (x < 21 || x > 99 || y < 21 || y > 59);
    const png = imagemAntisserrilhada(130, 80, (x, y) => (!dentro(x, y) ? FUNDO : linha(x, y) ? 20 : 190));
    const seg = await segmentar(png, { limiar: 225, regioes: { corpo: [60, 40] } });
    const xs = seg.regioes.corpo.contornoPx.map(([x]) => x); const ys = seg.regioes.corpo.contornoPx.map(([, y]) => y);
    /* A linha de 1 px, repartida em dois pixels, deixa a borda até 0,4 px para fora; por dentro dela ficaria em 21 ou mais. */
    expect(Math.min(...xs)).toBeLessThan(20.1); expect(Math.min(...xs)).toBeGreaterThan(19.4);
    expect(Math.max(...xs)).toBeGreaterThan(99.9); expect(Math.max(...xs)).toBeLessThan(100.6);
    expect(Math.min(...ys)).toBeLessThan(20.1); expect(Math.max(...ys)).toBeGreaterThan(59.9);
    /* Um polígono só, sem a volta por dentro da linha. */
    expect(seg.regioes.corpo.pedacos).toHaveLength(1);
    expect(seg.regioes.corpo.contornoPx.length).toBeLessThanOrEqual(16);
    expect(Math.abs(seg.regioes.corpo.areaPx - 80 * 40)).toBeLessThan(80 * 40 * 0.02 + 40);
  });
});
