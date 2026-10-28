/* A superfície suave por seções (`suave: true` no loft e na revolução, `suave.js`): a curva passa pelas seções declaradas com
   tangente contínua, sem passar do valor de nenhuma entre duas vizinhas, a aresta viva fica onde a forma declara (o campo
   `aresta`) ou onde a quebra passa de 40 graus, a densidade de estações sai da flecha e do tamanho da forma, o desenho alisa a
   normal só onde a superfície é lisa, o corte e o gate de contato leem as estações, e sem o campo tudo é como era. Caso de
   origem: o capô do avião (um loft de 5 a 20 seções em degraus), o amortecedor, a ponta da asa e o cone de cauda facetados
   (atritos 15, 30 e 34 do esboço do avião). As provas são medidas: passagem, derivada, flecha, normais por vértice e pixels. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { desenharEsboco, ErroDeEsboco, fatiarForma, resolverOpcao, VISTAS } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { medirPar, pecasDe } from '../src/contato.js';
import { recortarBloco } from '../src/corte.js';
import { formasResolvidas } from '../src/formas-resolvidas.js';
import {
  ANGULO_DE_ARESTA, ESTACOES_MAXIMAS, ladosDoContorno, passoAngularDe, segmentosDoCanto, TOLERANCIA_RELATIVA, toleranciaDe,
  densificar, densificarPerfil, normaisSuavesDasFaixas,
} from '../src/suave.js';
import { renderizarCamada } from '../../../tools/modelar/esboco.mjs';

const resolver = (formas) => Object.fromEntries(resolverOpcao({ formas }).map((r) => [r.id, r]));
const recusa = (formas, trecho) => {
  expect(() => resolverOpcao({ formas })).toThrow(ErroDeEsboco);
  expect(() => resolverOpcao({ formas })).toThrow(trecho);
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* Uma seção de n pontos num círculo de raio r em torno do centro [cu, cv]. */
const disco = (w, r, n = 8, [cu, cv] = [0, 0]) => ({ w, perfil: Array.from({ length: n }, (_, i) => [cu + r * Math.cos((2 * Math.PI * i) / n), cv + r * Math.sin((2 * Math.PI * i) / n)]) });
const raioDe = (sc) => Math.hypot(...sc.perfil[0]);

/* O capô: cinco seções arredondadas que engrossam e afunilam, o que o avião escreveu à mão em 16. */
const capo = (extra = {}) => ({
  id: 'capo', tipo: 'loft', eixo: 'z', centro: [0, 0, 0],
  secoes: [
    { pos: 0, forma: 'arredondado', tamanho: [600, 600], cantos: 200 },
    { pos: 150, forma: 'arredondado', tamanho: [700, 700], cantos: 250 },
    { pos: 300, forma: 'arredondado', tamanho: [760, 740], cantos: 280 },
    { pos: 600, forma: 'arredondado', tamanho: [780, 760], cantos: 300 },
    { pos: 800, forma: 'arredondado', tamanho: [500, 500], cantos: 200 },
  ],
  ...extra,
});

describe('densificar: a curva pelas seções', () => {
  const secoes = [disco(0, 30), disco(100, 50), disco(250, 80), disco(300, 78), disco(500, 40)];

  it('passa por todas as seções declaradas, que entram como vieram, e a posição cresce', () => {
    const d = densificar(secoes, { extensao: 500 });
    expect(d.declaradas).toHaveLength(5);
    d.declaradas.forEach((i, k) => expect(d.secoes[i]).toBe(secoes[k]));
    expect(d.secoes.length).toBeGreaterThan(5);
    d.secoes.slice(1).forEach((sc, i) => expect(sc.w).toBeGreaterThan(d.secoes[i].w));
    expect(d.nos).toEqual(d.secoes.map((sc) => sc.w));
  });

  it('dado em reta é reta: nenhuma estação a mais, e com duas seções também', () => {
    const reta = [disco(0, 10), disco(100, 20), disco(200, 30), disco(300, 40)];
    expect(densificar(reta, { extensao: 300 }).secoes).toHaveLength(4);
    expect(densificar([disco(0, 10), disco(500, 90)], { extensao: 500 }).secoes).toHaveLength(2);
  });

  it('não passa do valor de nenhuma seção entre duas vizinhas: a cintura não vira barriga', () => {
    const d = densificar(secoes, { extensao: 500 });
    d.secoes.forEach((sc) => {
      const k = secoes.findIndex((s, i) => i + 1 < secoes.length && sc.w >= s.w - 1e-9 && sc.w <= secoes[i + 1].w + 1e-9);
      const [a, b] = [raioDe(secoes[k]), raioDe(secoes[k + 1])];
      expect(raioDe(sc)).toBeGreaterThanOrEqual(Math.min(a, b) - 1e-6);
      expect(raioDe(sc)).toBeLessThanOrEqual(Math.max(a, b) + 1e-6);
    });
  });

  it('a tangente é contínua nas seções: a inclinação de cada lado, a 0,01 mm, é a mesma', () => {
    const base = densificar(secoes, { extensao: 500 });
    const e = 0.01;
    const lados = [100, 250, 300].flatMap((w) => [w - e, w + e]);
    const fino = densificar(secoes, { extensao: 500, arestas: base.arestas, nos: [...base.nos, ...lados].sort((x, y) => x - y) });
    const r = (w) => raioDe(fino.secoes.find((sc) => Math.abs(sc.w - w) < 1e-9));
    for (const w of [100, 250, 300]) {
      const [antes, depois] = [(r(w) - r(w - e)) / e, (r(w + e) - r(w)) / e];
      expect(Math.abs(antes - depois)).toBeLessThan(1e-3 * Math.max(1, Math.abs(antes)));
    }
  });

  it('a flecha da curva contra a corda de cada subtrecho fica abaixo da tolerância da forma', () => {
    const extensao = 500;
    const d = densificar(secoes, { extensao });
    /* a curva fina: o mesmo trecho com 8 estações entre cada duas das estações do módulo */
    const nos = d.nos.flatMap((w, i) => (i + 1 < d.nos.length ? Array.from({ length: 8 }, (_, j) => w + (j * (d.nos[i + 1] - w)) / 8) : [w]));
    const fina = densificar(secoes, { extensao, arestas: d.arestas, nos });
    let pior = 0;
    d.secoes.slice(0, -1).forEach((a, i) => {
      const b = d.secoes[i + 1];
      for (const sc of fina.secoes.filter((q) => q.w > a.w && q.w < b.w)) {
        const t = (sc.w - a.w) / (b.w - a.w);
        pior = Math.max(pior, Math.abs(raioDe(sc) - (raioDe(a) + t * (raioDe(b) - raioDe(a)))));
      }
    });
    expect(pior).toBeLessThanOrEqual(toleranciaDe(extensao) * 1.05);
    expect(pior).toBeGreaterThan(0);
  });

  it('mais curvatura pede mais estações e uma forma maior, menos: a densidade sai da flecha e do tamanho', () => {
    const curva = (r1) => [disco(0, 10), disco(100, r1), disco(200, 10)];
    const contagem = (r1, extensao) => densificar(curva(r1), { extensao }).secoes.length;
    expect(contagem(40, 200)).toBeGreaterThan(contagem(20, 200));
    expect(contagem(40, 200)).toBeGreaterThan(contagem(40, 5000));
    expect(contagem(40, 5000)).toBeGreaterThan(3);
    expect(contagem(40, 200000)).toBe(3);
  });

  it('o total de estações tem teto, e o mesmo dado dá as mesmas estações', () => {
    const muitas = Array.from({ length: 40 }, (_, k) => disco(k * 50, 30 + (k % 2) * 25));
    const d = densificar(muitas, { extensao: 100 });
    expect(d.secoes.length).toBeLessThanOrEqual(ESTACOES_MAXIMAS + muitas.length);
    expect(densificar(muitas, { extensao: 100 })).toEqual(d);
  });

  describe('aresta viva', () => {
    /* um degrau de 90 graus no meio: 40 mm de raio até 200, salta para 90 em 205 e segue */
    const degrau = [disco(0, 40), disco(100, 42), disco(200, 44), disco(205, 90), disco(300, 92), disco(400, 94)];

    it('a quebra de mais de 40 graus entre as duas cordas é aresta sem ninguém declarar, e o trecho entre duas arestas é reta', () => {
      expect(ANGULO_DE_ARESTA).toBe(40);
      const d = densificar(degrau, { extensao: 400 });
      expect(d.arestas).toEqual([false, false, true, true, false, false]);
      const [i2, i3] = [d.declaradas[2], d.declaradas[3]];
      expect(i3).toBe(i2 + 1);
      expect([...d.vivas].sort((a, b) => a - b)).toEqual([i2, i3]);
    });

    it('`aresta: false` obriga a suavidade e `aresta: true` quebra uma seção que o ângulo deixaria lisa', () => {
      expect(densificar(degrau, { extensao: 400, arestas: [undefined, undefined, undefined, false] }).arestas[3]).toBe(false);
      const liso = [disco(0, 40), disco(100, 50), disco(200, 60), disco(300, 70)];
      expect(densificar(liso, { extensao: 300 }).arestas).toEqual([false, false, false, false]);
      expect(densificar(liso, { extensao: 300, arestas: [undefined, true] }).arestas[1]).toBe(true);
    });

    it('cada lado da aresta chega com a própria tangente: o degrau não borra nem passa do que as seções dizem', () => {
      const d = densificar(degrau, { extensao: 400 });
      const [a, b] = [d.declaradas[2], d.declaradas[3]];
      for (const sc of d.secoes.slice(a, b + 1)) {
        expect(raioDe(sc)).toBeGreaterThanOrEqual(44 - 1e-6);
        expect(raioDe(sc)).toBeLessThanOrEqual(90 + 1e-6);
      }
      /* antes do degrau a curva fica entre os raios 40 e 44, depois dele entre 90 e 94 */
      d.secoes.filter((sc) => sc.w <= 200).forEach((sc) => expect(raioDe(sc)).toBeLessThanOrEqual(44 + 1e-6));
      d.secoes.filter((sc) => sc.w >= 205).forEach((sc) => expect(raioDe(sc)).toBeGreaterThanOrEqual(90 - 1e-6));
    });
  });
});

describe('densificarPerfil: o contorno da revolução como curva', () => {
  it('um quarto de círculo de poucos pontos, com a parede vertical, volta a ser o arco: a curva anda pelo comprimento de corda, não pela altura', () => {
    /* arco de raio 40 de (raio 100, altura 0) a (raio 140, altura 40), centro em (100, 40): a parede começa vertical em raio */
    const arco = [0, 30, 60, 90].map((g) => ({ raio: 100 + 40 * Math.sin((g * Math.PI) / 180), altura: 40 - 40 * Math.cos((g * Math.PI) / 180) }));
    const d = densificarPerfil(arco, { extensao: 200 });
    expect(d.pontos.length).toBeGreaterThan(4);
    const erro = Math.max(...d.pontos.map((q) => Math.abs(Math.hypot(q.raio - 100, q.altura - 40) - 40)));
    /* a polilinha dos 4 pontos errava 40 * (1 - cos 15 graus) = 1,4 mm; a curva fica bem abaixo disso */
    expect(erro).toBeLessThan(0.6);
    d.declaradas.forEach((i, k) => expect(d.pontos[i]).toEqual(arco[k]));
    d.pontos.slice(1).forEach((q, i) => expect(q.altura).toBeGreaterThanOrEqual(d.pontos[i].altura));
  });

  it('o degrau (duas alturas iguais) é aresta, e o perfil que já é fino demais não ganha pontos', () => {
    const d = densificarPerfil([{ raio: 10, altura: 0 }, { raio: 50, altura: 0 }, { raio: 50, altura: 100 }, { raio: 20, altura: 100 }], { extensao: 100 });
    expect(d.pontos).toHaveLength(4);
    expect([...d.vivas]).toEqual([1, 2]);
  });
});

describe('o contorno curvo: lados e segmentos escolhidos pela flecha', () => {
  it('o passo angular é o menor entre 6 graus e o que mantém a flecha: um raio grande contra a forma pede mais lados', () => {
    expect(passoAngularDe(10, 5)).toBe(6);
    expect(passoAngularDe(500, 0.2)).toBeCloseTo(3.2, 1);
    expect(ladosDoContorno(50, toleranciaDe(8000))).toBe(60);
    expect(ladosDoContorno(500, 0.5)).toBeGreaterThan(60);
    expect(ladosDoContorno(500, 0.5)).toBeLessThanOrEqual(96);
    expect(ladosDoContorno(1e6, 1e-6)).toBe(96);
    expect(segmentosDoCanto(0, 1)).toBe(4);
    expect(segmentosDoCanto(300, toleranciaDe(800))).toBeGreaterThan(4);
    expect(segmentosDoCanto(300, toleranciaDe(800))).toBeLessThanOrEqual(12);
    expect(TOLERANCIA_RELATIVA).toBeCloseTo(0.35 / 500, 12);
  });
});

describe('o loft com suave: true', () => {
  const [reto, suave] = [resolver([capo()]).capo, resolver([capo({ suave: true })]).capo];

  it('sem o campo, e com suave: false, o loft é o de sempre, byte a byte', () => {
    expect(reto.prisma.suave).toBeUndefined();
    expect(reto.prisma.secoes).toHaveLength(5);
    const svg = (extra) => desenharEsboco({ opcoes: [{ formas: [capo(extra)] }] }).svg;
    expect(svg({ suave: false })).toBe(svg({}));
  });

  it('as seções declaradas ficam como estavam, a caixa e as âncoras não mudam e o desenho ganha estações', () => {
    expect(suave.prisma.suave).toBe(true);
    expect(suave.prisma.secoesDeclaradas).toHaveLength(5);
    expect(suave.prisma.secoes.length).toBeGreaterThan(5);
    expect(suave.min).toEqual(reto.min);
    expect(suave.max).toEqual(reto.max);
    expect(suave.prisma.comprimento).toBe(reto.prisma.comprimento);
    const posicoes = new Set(suave.prisma.secoes.map((sc) => sc.w));
    reto.prisma.secoes.forEach((sc) => expect(posicoes.has(sc.w)).toBe(true));
    /* os pontos por seção são os que o módulo escolheu pelo canto: mais que os 20 de antes */
    expect(suave.prisma.secoes[0].perfil.length).toBeGreaterThan(reto.prisma.secoes[0].perfil.length);
  });

  it('a silhueta muda pouco: a superfície suave se afasta da de troncos retos por menos de 4% da extensão do capô, e passa por fora onde o perfil é convexo', () => {
    const decl = reto.prisma.secoes;
    const retoEm = (w) => {
      const k = decl.findIndex((sc, i) => i + 1 < decl.length && w >= sc.w - 1e-9 && w <= decl[i + 1].w + 1e-9);
      const t = (w - decl[k].w) / (decl[k + 1].w - decl[k].w);
      return decl[k].perfil.map((q, i) => [q[0] + t * (decl[k + 1].perfil[i][0] - q[0]), q[1] + t * (decl[k + 1].perfil[i][1] - q[1])]);
    };
    let [fora, desvio] = [0, 0];
    for (const sc of suave.prisma.secoes) {
      /* a seção do capô tem os cantos arredondados em mais pontos que no reto: compara o raio máximo, que é a barriga do perfil */
      const dentro = Math.max(...retoEm(sc.w).map((q) => Math.hypot(...q)));
      const raio = Math.max(...sc.perfil.map((q) => Math.hypot(...q)));
      fora = Math.max(fora, raio - dentro);
      desvio = Math.max(desvio, Math.abs(raio - dentro));
    }
    expect(fora).toBeGreaterThan(5);
    expect(desvio).toBeLessThan(0.04 * 800);
  });

  it('recusa o valor que não é booleano, a aresta que não é booleana e a seção inclinada', () => {
    recusa([capo({ suave: 'sim' })], '"suave" deve ser true');
    recusa([capo({ secoes: capo().secoes.map((s, i) => (i === 2 ? { ...s, aresta: 'x' } : s)), suave: true })], '"aresta" deve ser true');
    recusa([capo({ suave: true, secoes: capo().secoes.map((s, i) => (i === 3 ? { ...s, inclinacao: [0, 5] } : s)) })], 'não aceita seção com "inclinacao"');
    /* sem suave a inclinação continua valendo */
    expect(() => resolverOpcao({ formas: [capo({ secoes: capo().secoes.map((s, i) => (i === 3 ? { ...s, inclinacao: [0, 5] } : s)) })] })).not.toThrow();
  });

  it('a elipse leva os lados que a flecha pede, e a mistura de formas reamostra no mesmo número', () => {
    const f = (extra, secoes) => resolver([{ id: 'f', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], secoes, ...extra }]).f;
    const elipses = [{ pos: 0, forma: 'elipse', tamanho: [60, 60] }, { pos: 100, forma: 'elipse', tamanho: [100, 100] }, { pos: 200, forma: 'elipse', tamanho: [60, 60] }];
    expect(f({}, elipses).prisma.secoes[0].perfil).toHaveLength(48);
    expect(f({ suave: true }, elipses).prisma.secoes[0].perfil.length).toBeGreaterThan(48);
    const mistas = [{ pos: 0, forma: 'retangulo', tamanho: [60, 60] }, { pos: 100, forma: 'elipse', tamanho: [100, 100] }, { pos: 200, forma: 'retangulo', tamanho: [60, 60] }];
    const n = f({ suave: true }, mistas).prisma.secoes[0].perfil.length;
    expect(n).toBeGreaterThanOrEqual(48);
    expect(new Set(f({ suave: true }, mistas).prisma.secoes.map((sc) => sc.perfil.length))).toEqual(new Set([n]));
  });

  it('uma quebra de mais de 40 graus é aresta sem declarar, `aresta: false` a mantém lisa e `aresta: true` quebra uma seção gentil', () => {
    const corpo = (secoes) => ({ id: 'o', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], suave: true, secoes: secoes.map(([pos, lado, aresta]) => ({ pos, forma: 'elipse', tamanho: [lado, lado], ...(aresta === undefined ? {} : { aresta }) })) });
    /* o ombro em pos 200: a corda de 10 mm em 100 passa a 180 mm em 50 */
    const ombro = [[0, 100], [100, 110], [200, 120], [250, 300]];
    expect(resolver([corpo(ombro)]).o.prisma.vivasEmW).toHaveLength(1);
    expect(resolver([corpo(ombro.map((s, i) => (i === 2 ? [...s, false] : s)))]).o.prisma.vivasEmW).toHaveLength(0);
    const gentil = [[0, 100], [100, 110], [200, 120], [300, 130]];
    expect(resolver([corpo(gentil)]).o.prisma.vivasEmW).toHaveLength(0);
    expect(resolver([corpo(gentil.map((s, i) => (i === 1 ? [...s, true] : s)))]).o.prisma.vivasEmW).toHaveLength(1);
  });

  it('a revolução com suave: os lados saem da flecha, o perfil ganha pontos e a aresta pode ser declarada', () => {
    const cone = (extra = {}) => ({ id: 'c', tipo: 'revolucao', eixo: 'z', centro: [0, 0, 0], perfil: [[0, 0], [60, 80], [95, 200], [105, 380], [100, 600]], ...extra });
    const [a, b] = [resolver([cone()]).c, resolver([cone({ suave: true })]).c];
    expect(a.prisma.secoes).toHaveLength(5);
    expect(a.prisma.secoes[0].perfil).toHaveLength(48);
    expect(b.prisma.secoes.length).toBeGreaterThan(5);
    expect(b.prisma.secoesDeclaradas).toHaveLength(5);
    expect(b.prisma.secoes[0].perfil.length).toBeGreaterThanOrEqual(48);
    expect(b.max).toEqual(a.max);
    expect(resolver([cone({ suave: true, lados: 16 })]).c.prisma.secoes[0].perfil).toHaveLength(16);
    const flange = cone({ suave: true, perfil: [[40, 0], [40, 100], [60, 100], [60, 200], [58, 300]] });
    expect(resolver([flange]).c.prisma.vivasEmW.length).toBeGreaterThanOrEqual(2);
    recusa([cone({ suave: 1 })], '"suave" deve ser true');
    recusa([cone({ perfil: [[0, 0], { raio: 60, altura: 100, aresta: 'x' }, [50, 300]], suave: true })], '"aresta" deve ser true');
  });
});

describe('a casca do loft suave', () => {
  const bacia = (extra = {}) => ({
    id: 'b', tipo: 'loft', eixo: 'y', centro: [0, 0, 0], casca: { espessura: 6, aberta: 'fim' },
    secoes: [
      { pos: 0, forma: 'arredondado', tamanho: [240, 160], cantos: 30 },
      { pos: 80, forma: 'arredondado', tamanho: [360, 250], cantos: 60 },
      { pos: 220, forma: 'arredondado', tamanho: [420, 300], cantos: 80 },
    ],
    ...extra,
  });

  it('a parede de dentro passa pelas mesmas estações da de fora, e a exportação leva a cavidade declarada', () => {
    const { b } = resolver([bacia({ suave: true })]);
    const lista = b.prisma.casca.cavidade;
    const fora = b.prisma.secoes;
    expect(fora.length).toBeGreaterThan(3);
    const wcavidade = new Set(lista.map((sc) => Math.round(sc.w * 1e6)));
    fora.filter((sc) => sc.w > b.prisma.casca.wc + 1e-6).forEach((sc) => expect(wcavidade.has(Math.round(sc.w * 1e6))).toBe(true));
    expect(lista.every((sc) => sc.perfil.length === fora[0].perfil.length)).toBe(true);
    expect(b.prisma.casca.cavidadeDeclarada.length).toBeLessThan(lista.length);
    const reto = resolver([bacia()]).b;
    expect(reto.prisma.casca.cavidadeDeclarada).toBeUndefined();
    expect(b.prisma.casca.wc).toBeCloseTo(reto.prisma.casca.wc, 9);
  });

  it('a espessura entre as superfícies continua a da casca: cada ponto da cavidade está a espessura de fora (no plano da seção)', () => {
    const { b } = resolver([bacia({ suave: true })]);
    const fora = new Map(b.prisma.secoes.map((sc) => [Math.round(sc.w * 1e6), sc]));
    let pior = 0;
    for (const sc of b.prisma.casca.cavidade) {
      const f = fora.get(Math.round(sc.w * 1e6));
      if (!f) continue;
      for (let i = 0; i < sc.perfil.length; i++) pior = Math.max(pior, Math.abs(Math.hypot(...sc.perfil[i]) - Math.hypot(...f.perfil[i])));
    }
    /* a cavidade é um recuo da seção, que nas estações é uma curva: a diferença de raio é da ordem da espessura */
    expect(pior).toBeLessThan(20);
    expect(pior).toBeGreaterThan(1);
  });

  it('as faces de dentro da casca levam as normais dos vértices viradas como a normal da face, para dentro da cavidade', () => {
    const { b } = resolver([bacia({ suave: true })]);
    const olho = [0.3, 1, 0.4].map((x) => x / Math.hypot(0.3, 1, 0.4));
    const dentro = fatiarForma(b, olho).flatMap((ch) => ch.dentro);
    expect(dentro.length).toBeGreaterThan(50);
    for (const f of dentro) for (const n of f.nv) expect(dot(n, f.n)).toBeGreaterThan(0.5);
  });

  it('desenha oca (a boca e o fundo de dentro) e o gate vê a parede, não a cavidade', () => {
    const e = { vista: 'isometrica', opcoes: [{ titulo: 'T', formas: [bacia({ suave: true })] }] };
    expect(desenharEsboco(e).svg).toContain('<path');
    const p = pecasDe(resolver([bacia({ suave: true })]).b);
    expect(p.length).toBeGreaterThan(pecasDe(resolver([bacia()]).b).length);
  });
});

describe('a exportação das formas resolvidas', () => {
  it('o loft e a revolução suaves saem nas seções declaradas, com o aviso de que são suaves', () => {
    const esboco = { opcoes: [{ titulo: 'T', formas: [capo({ suave: true }), { id: 'r', tipo: 'revolucao', eixo: 'z', suave: true, perfil: [[0, 0], [60, 80], [95, 200], [105, 380]], centro: [0, 0, 1200] }] }] };
    const dado = formasResolvidas(esboco, 1);
    const [loft, rev] = dado.formas.map((f) => f.geometria);
    expect(loft.suave).toBe(true);
    expect(loft.secoes).toHaveLength(5);
    expect(rev.suave).toBe(true);
    expect(rev.perfil).toHaveLength(4);
    const sem = formasResolvidas({ opcoes: [{ titulo: 'T', formas: [capo()] }] }, 1).formas[0].geometria;
    expect(sem.suave).toBeUndefined();
    expect(sem.secoes).toHaveLength(5);
    expect(JSON.parse(JSON.stringify(dado))).toEqual(dado);
  });
});

describe('o sombreamento: normal alisada só onde a superfície é lisa', () => {
  const olho = VISTAS.isometrica.olho.map((x) => x / Math.hypot(...VISTAS.isometrica.olho));
  const faces = (r, v = olho) => fatiarForma(r, v).flatMap((ch) => ch.lados);

  it('toda face lateral do loft suave leva as quatro normais dos vértices, e a de um loft reto não leva nenhuma', () => {
    expect(faces(resolver([capo()]).capo).every((f) => f.nv === undefined)).toBe(true);
    const lisas = faces(resolver([capo({ suave: true })]).capo);
    expect(lisas.length).toBeGreaterThan(100);
    expect(lisas.every((f) => f.nv.length === 4 && f.nv.every((n) => Math.abs(Math.hypot(...n) - 1) < 1e-9))).toBe(true);
  });

  it('as faces vizinhas concordam na normal do vértice que dividem: a cor deixa de ser um degrau', () => {
    const r = resolver([capo({ suave: true })]).capo;
    const lisas = faces(r);
    const chave = (p) => p.map((x) => Math.round(x * 1e3)).join(',');
    const porVertice = new Map();
    for (const f of lisas) f.pts.forEach((p, i) => { const k = chave(p); if (!porVertice.has(k)) porVertice.set(k, []); porVertice.get(k).push(f.nv[i]); });
    let comparados = 0;
    let pior = 0;
    for (const lista of porVertice.values()) {
      for (const n of lista.slice(1)) { comparados++; pior = Math.max(pior, 1 - dot(n, lista[0])); }
    }
    expect(comparados).toBeGreaterThan(300);
    /* o ângulo entre as normais de um mesmo vértice, vistas de duas faces: abaixo de 3 graus em quase todos */
    expect(pior).toBeLessThan(1 - Math.cos((8 * Math.PI) / 180));
    /* no loft reto, a normal de cada face é a da face: o degrau entre vizinhas é o ângulo da faixa */
    const retas = faces(resolver([capo()]).capo);
    const quebras = retas.flatMap((f, i) => retas.slice(i + 1, i + 3).map((g) => 1 - dot(f.n, g.n)));
    expect(Math.max(...quebras)).toBeGreaterThan(1 - Math.cos((8 * Math.PI) / 180));
  });

  it('na aresta viva a normal se parte: as faces dos dois lados não dividem normal, e a aresta é desenhada', () => {
    const degrau = (suave) => ({
      id: 'd', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], suave,
      secoes: [{ pos: 0, forma: 'arredondado', tamanho: [100, 100], cantos: 20 }, { pos: 100, forma: 'arredondado', tamanho: [102, 102], cantos: 20 }, { pos: 105, forma: 'arredondado', tamanho: [200, 200], cantos: 40 }, { pos: 200, forma: 'arredondado', tamanho: [204, 204], cantos: 40 }],
    });
    const r = resolver([degrau(true)]).d;
    expect(r.prisma.vivasEmW.length).toBeGreaterThan(0);
    const wDoDegrau = r.prisma.vivasEmW[0];
    const lisas = faces(r, [0.3, 0.2, -1].map((x) => x / Math.hypot(0.3, 0.2, 1)));
    /* a face da parede do degrau (a normal quase axial) é a única entre as duas faixas: nenhuma face do cilindro leva dela normal quase axial */
    const axiais = lisas.filter((f) => Math.abs(f.n[2]) > 0.95);
    expect(axiais.length).toBeGreaterThan(0);
    for (const f of lisas.filter((q) => Math.abs(q.n[2]) < 0.2)) for (const n of f.nv) expect(Math.abs(n[2])).toBeLessThan(0.5);
    expect(wDoDegrau).toBeDefined();
    /* o loft reto e o suave desenham a aresta do degrau como linha */
    const linhas = (x) => fatiarForma(x, [0.3, 0.2, -1].map((q) => q / Math.hypot(0.3, 0.2, 1))).reduce((s, ch) => s + ch.linhas.length, 0);
    expect(linhas(r)).toBeGreaterThan(0);
  });

  it('normaisSuavesDasFaixas: duas faixas planas a 90 graus não dividem normal, a 10 graus dividem, e a aresta viva as parte', () => {
    /* três faces por faixa, todas com a normal da faixa, para o vértice ser tocado por duas faces de cada lado */
    const faixa = (a) => Array.from({ length: 3 }, () => [Math.cos(a), Math.sin(a), 0]);
    const perto = (v, e) => v.forEach((x, i) => expect(x).toBeCloseTo(e[i], 9));
    const cos25 = Math.cos((25 * Math.PI) / 180);
    const reto = normaisSuavesDasFaixas([faixa(0), faixa(Math.PI / 2)], 3, new Set(), cos25);
    perto(reto[0][0][2], [1, 0, 0]);
    perto(reto[1][0][0], [0, 1, 0]);
    const liso = normaisSuavesDasFaixas([faixa(0), faixa(Math.PI / 18)], 3, new Set(), cos25);
    expect(liso[0][0][2][1]).toBeGreaterThan(0.04);
    perto(liso[0][0][2], liso[1][0][0]);
    const viva = normaisSuavesDasFaixas([faixa(0), faixa(Math.PI / 18)], 3, new Set([1]), cos25);
    perto(viva[0][0][2], [1, 0, 0]);
    perto(viva[1][0][0], [Math.cos(Math.PI / 18), Math.sin(Math.PI / 18), 0]);
  });
});

describe('o corte e o gate leem as estações', () => {
  it('o corte recorta as normais dos vértices junto com a face', () => {
    const r = resolver([capo({ suave: true })]).capo;
    const cortados = fatiarForma(r, VISTAS.isometrica.olho.map((x) => x / Math.sqrt(3))).map((ch) => recortarBloco(ch, { eixo: 'z', valor: 100 }, 1)).filter(Boolean);
    const lados = cortados.flatMap((ch) => ch.lados);
    expect(lados.length).toBeGreaterThan(20);
    /* o corte parte faces: as normais novas vêm da interpolação das duas da aresta, e a face recortada leva uma por vértice */
    expect(lados.some((f) => f.pts.length > 4)).toBe(false);
    for (const f of lados) {
      expect(f.nv).toHaveLength(f.pts.length);
      for (const n of f.nv) expect(Math.abs(Math.hypot(...n) - 1)).toBeLessThan(1e-9);
    }
  });

  it('o gate mede a superfície suave: uma barra na barriga entre duas seções, que as faixas retas deixam a 3 mm, encosta nela', () => {
    const corpo = (extra = {}) => ({ id: 'c', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], secoes: [{ pos: 0, forma: 'elipse', tamanho: [100, 100] }, { pos: 100, forma: 'elipse', tamanho: [180, 180] }, { pos: 200, forma: 'elipse', tamanho: [200, 200] }], ...extra });
    /* o loft é centrado: z = -50 é a posição 50, onde a corda reta tem raio 70 e a curva, cerca de 75 */
    const barra = { id: 'b', tipo: 'caixa', largura: 4, altura: 4, profundidade: 4, centro: [76, 0, -50] };
    const medida = (extra) => { const r = resolver([corpo(extra), barra]); return medirPar(pecasDe(r.c), pecasDe(r.b)); };
    const [a, b] = [medida({}), medida({ suave: true })];
    expect(a.penetracao).toBe(0);
    expect(a.folga).toBeGreaterThan(2.5);
    expect(b.penetracao).toBeGreaterThan(1);
    expect(b.folga).toBe(0);
  });

  it('o desempenho: o loft suave de 26 seções do avião resolve e mede em menos de um segundo', () => {
    const secoes = Array.from({ length: 26 }, (_, k) => ({ pos: k * 300, forma: 'arredondado', tamanho: [800 + 300 * Math.sin(k / 1.5), 700 + 250 * Math.sin(k / 2.5)], cantos: 150 }));
    const t0 = Date.now();
    const r = resolver([{ id: 'f', tipo: 'loft', eixo: 'z', centro: [0, 0, 0], suave: true, secoes }]).f;
    pecasDe(r);
    expect(r.prisma.secoes.length).toBeGreaterThan(26);
    expect(r.prisma.secoes.length).toBeLessThanOrEqual(ESTACOES_MAXIMAS + 26);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});

describe('a camada e os pixels', () => {
  let navegador;
  beforeAll(async () => { navegador = await (await import('playwright')).default.chromium.launch(); });
  afterAll(async () => { await navegador?.close(); });

  /* o desenho do loft de cinco seções na lateral (o olho em +x): três cores por vértice, uma por face no loft reto */
  const camada = (extra) => desenharEsboco({ vista: 'isometrica', geometria: true, ocultar: ['titulo', 'escala', 'nota', 'legendas'], opcoes: [{ titulo: 'T', formas: [capo({ cor: 'azul', ...extra })] }] }, { camada: true }).camada;

  it('a camada leva a cor de cada vértice da face lisa (kv) e nenhuma na face reta', () => {
    const [reta, lisa] = [camada({}), camada({ suave: true })];
    expect(reta.formas[0].faces.every((f) => f.kv === undefined)).toBe(true);
    const comKv = lisa.formas[0].faces.filter((f) => f.kv);
    expect(comKv.length).toBeGreaterThan(100);
    expect(comKv.every((f) => f.kv.length === f.c.length && f.kv.every((k) => /^#[0-9a-f]{6}$/.test(k)))).toBe(true);
  });

  it('o sombreamento do PNG é contínuo: os degraus de cor entre pixels vizinhos caem a menos da metade', async () => {
    const lerPixels = async (c) => PNG.sync.read(Buffer.from((await renderizarCamada(c, 1, navegador)).split(',')[1], 'base64'));
    const [reto, liso] = [await lerPixels(camada({})), await lerPixels(camada({ suave: true }))];
    const saltos = (png) => {
      const brilho = (x, y) => (png.data[(y * png.width + x) * 4 + 3] >= 250 ? png.data[(y * png.width + x) * 4 + 1] : -1);
      let grandes = 0;
      let total = 0;
      for (let y = 0; y < png.height; y++) {
        for (let x = 0; x + 1 < png.width; x++) {
          const [a, b] = [brilho(x, y), brilho(x + 1, y)];
          if (a < 0 || b < 0) continue;
          total++;
          /* o degrau de sombreamento (2 a 20 níveis); o traço preto e a borda da silhueta saltam mais e são os mesmos nos dois */
          const d = Math.abs(a - b);
          if (d >= 2 && d <= 20) grandes++;
        }
      }
      return { grandes, total };
    };
    const [sr, sl] = [saltos(reto), saltos(liso)];
    expect(sr.total).toBeGreaterThan(10000);
    /* no reto cada face é uma cor e há um degrau a cada borda de faixa (3,1% dos pares de pixels); no liso o degradê passa de um pixel
       ao vizinho em passos de 1 nível (1,0%) */
    expect(sr.grandes / sr.total).toBeGreaterThan(0.02);
    expect(sl.grandes / sl.total).toBeLessThan(0.5 * (sr.grandes / sr.total));
  });
});

describe('o esquema aceita o campo e recusa o que não existe', () => {
  it('suave vale em loft e revolução e não em outro tipo', () => {
    expect(() => desenharEsboco({ opcoes: [{ formas: [capo({ suave: true })] }] })).not.toThrow();
    expect(() => desenharEsboco({ opcoes: [{ formas: [{ id: 'c', tipo: 'cilindro', diametro: 10, comprimento: 10, suave: true }] }] })).toThrow(/suave/);
  });

  it('o esboço expandido leva `suave` e `aresta` sem mexer', () => {
    const e = expandirEsboco({ opcoes: [{ titulo: 'T', formas: [capo({ suave: true, secoes: capo().secoes.map((s, i) => (i === 1 ? { ...s, aresta: true } : s)) })] }] });
    expect(e.opcoes[0].formas[0].suave).toBe(true);
    expect(e.opcoes[0].formas[0].secoes[1].aresta).toBe(true);
  });
});
