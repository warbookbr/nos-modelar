/* preenchimento-do-miolo.test.mjs — o protótipo do preenchimento do miolo (`preenchimento-do-miolo.mjs`), fora do núcleo: a mistura, a
 * conferência contra o Coons e o alisamento da rede, e os números que o banco de provas registra
 * (`docs/modelar/banco-de-provas/correcao-de-superficie-2026-11-16/README.md`), com o que NÃO passou marcado como CONHECIDA. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { definicao as definicaoDaChapaLateral } from '../../../procedural/nucleo/fixtures/gaiola-por-rede-prova.js';
import { definicaoDaChapaSimetrica, definicaoDaEmenda, definicaoDaRede, definicaoTresNoNo } from './chapas.mjs';
import { contraPrototipo, gradeDoRetalho, pesosDaMistura, preencherGrades, preencherRede, provaDaRede, provaDasAnaliticas, provaDasEmendas } from './preenchimento-do-miolo.mjs';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('o preenchimento do miolo pelas curvas vizinhas, fora do núcleo', () => {
  it('a mistura soma um, é a reta sem ponto de fora e reproduz a parábola de passo desigual com um ou com dois', () => {
    const f = (x) => 3 - 2 * x + 5 * x * x; const h0 = 0.7, h = 1.9, h1 = 0.4;
    for (const t of [0, 0.13, 0.5, 0.86, 1]) {
      const x = t * h; const valores = [f(-h0), f(0), f(h), f(h + h1)];
      const com = (w) => w.reduce((s, p, k) => s + p * valores[k], 0);
      for (const w of [pesosDaMistura(t, h0, h, h1), pesosDaMistura(t, h0, h, null), pesosDaMistura(t, null, h, h1)]) {
        expect(w.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 12);
        expect(com(w)).toBeCloseTo(f(x), 10);
      }
      pesosDaMistura(t, null, h, null).forEach((p, k) => expect(p).toBeCloseTo([0, 1 - t, t, 0][k], 12));
    }
  });

  it('o retalho sem vizinho sai igual ao Coons de hoje, e a ordem dos lados não muda o resultado', () => {
    const n = 5; const k = (i, j) => `${i}.${j}`; const pos = new Map();
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) pos.set(k(i, j), [0.1 * i + 0.01 * j * j, 0.02 * Math.sin(i) * Math.cos(0.7 * j), 0.1 * j - 0.005 * i * i]);
    const lados = [Array.from({ length: n + 1 }, (_, q) => k(q, 0)), Array.from({ length: n + 1 }, (_, q) => k(n, q)), Array.from({ length: n + 1 }, (_, q) => k(n - q, n)), Array.from({ length: n + 1 }, (_, q) => k(0, n - q))];
    const gr = gradeDoRetalho('a', lados, k); const girada = gradeDoRetalho('a', [lados[1], lados[2], lados[3], lados[0]], (i, j) => k(n - j, i));
    const c = preencherGrades([gr], (q) => pos.get(q), { modo: 'coons' }); const v = preencherGrades([gr], (q) => pos.get(q), { modo: 'vizinhas' }); const g = preencherGrades([girada], (q) => pos.get(q), { modo: 'fitas' }); const f = preencherGrades([gr], (q) => pos.get(q), { modo: 'fitas' });
    expect(c.size).toBe((n - 1) ** 2);
    for (const [nome, p] of c) { expect(dist(p, v.get(nome))).toBeLessThan(1e-12); expect(dist(f.get(nome), g.get(nome))).toBeLessThan(1e-12); }
  });

  it('a chapa de curvatura numa direção só e a aditiva não se mexem; a rede com o retalho de cinco lados ao lado fica no painel', () => {
    for (const nome of ['emenda-g1', 'emenda-dupla']) {
      const g = gaiolaPorRede({ ...definicaoDaEmenda(nome), liso: false });
      for (const modo of ['coons', 'vizinhas', 'fitas']) expect(preencherRede(g, modo).andou, `${nome} ${modo}`).toBeLessThan(1e-9);
    }
    /* o painel é aditivo e o Coons já o reproduz; a fileira de fora só entra com a mesma mistura das fileiras do retalho (sem isso, 0,98 mm) */
    const rede = gaiolaPorRede({ ...definicaoDaRede({ ruido: false }), liso: false });
    for (const modo of ['vizinhas', 'fitas']) expect(preencherRede(rede, modo).andou * 1000, modo).toBeLessThan(0.01);
    expect(() => preencherRede(gaiolaPorRede(definicaoDaRede({ ruido: false })), 'vizinhas')).toThrow(/liso: false/);
  });

  it('na calota a cota do miolo cai de 0,25 para menos de 0,01 mm a 100 mm da borda, e com a energia a superfície fica mais perto que hoje', () => {
    const [p] = provaDasAnaliticas({ superficies: ['calota'], modos: ['vizinhas'] });
    expect(p.coonsRefeitoMm).toBe(0); expect(p.lisoRefeitoMm).toBe(0);
    expect(p.hoje.cotaSemAlisarMm[2]).toBeGreaterThan(0.2);
    expect(p.vizinhas.cotaMm[1]).toBeLessThan(0.01); expect(p.vizinhas.cotaMm[2]).toBeLessThan(0.01);
    expect(p.vizinhas.comEnergia.a100Mm).toBeLessThan(0.5 * p.hoje.comEnergia.a100Mm);
    expect(p.vizinhas.comEnergia.a100Mm).toBeLessThan(0.5 * p.hoje.semEnergia.a100Mm);
    expect(p.vizinhas.comEnergia.crista.h1).toBeLessThan(0.05);
    /* CONHECIDA: sem a energia, com o alisamento pela normal por cima, a calota fica 0,015 mm mais longe que hoje a 100 mm (0,244 contra 0,229) */
    expect(p.vizinhas.semEnergia.a100Mm, 'a calota sem a energia passou a caber: tire a marca').toBeGreaterThan(p.hoje.semEnergia.a100Mm);
    expect(p.vizinhas.semEnergia.a100Mm).toBeLessThan(p.hoje.semEnergia.a100Mm + 0.03);
  }, 120000);

  it('na calota de cruzamento fora do centro, com a energia, a superfície fica abaixo da de hoje sem a opção (com o Coons ficava acima)', () => {
    for (const [definicao, teto] of [[{ meio: [0.25, 0.25] }, 0.75], [{ meio: [0.25, 0.25], pontos: 16 }, 0.2]]) {
      const [p] = provaDasAnaliticas({ definicao, superficies: ['calota'], modos: ['vizinhas'] });
      expect(p.hoje.comEnergia.a100Mm, JSON.stringify(definicao)).toBeGreaterThan(p.hoje.semEnergia.a100Mm);
      expect(p.vizinhas.comEnergia.a100Mm, JSON.stringify(definicao)).toBeLessThan(teto * p.hoje.semEnergia.a100Mm);
    }
  }, 240000);
});

/* A `vizinhas` NO NÚCLEO (2026-11-19): a `gaiolaPorRede` com `alisarSuperficie` preenche o miolo dos retalhos de quatro lados pelas curvas
 * vizinhas. O protótipo é a conta independente: os pontos da rede com a opção ficam a menos de 1e-9 mm dos dele, a tabela pelo núcleo é a
 * dele, e o gate da opção ligada (a distância a mais de 100 mm da borda e a crista por ponto nunca piores que sem a opção) vale nas
 * dezoito chapas analíticas. A grade de razão 2 segue CONHECIDA em `procedural/nucleo/subdivisao-energia-de-curvatura.test.mjs`: o
 * defeito dela é da energia no espaçamento desigual, e o preenchimento não o alcança. */
const maiorDiferencaDeNumero = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b);
  if (a === null || typeof a !== 'object') return a === b ? 0 : Infinity;
  return Object.keys(a).reduce((m, k) => Math.max(m, maiorDiferencaDeNumero(a[k], b?.[k])), 0);
};

describe('o preenchimento pelas curvas vizinhas no núcleo, contra o protótipo', () => {
  it('nas dezoito chapas analíticas o núcleo dá os pontos e a tabela do protótipo, e a opção ligada nunca fica pior que sem ela', () => {
    /* a distância a 100 mm da borda medida em 2026-11-19, com a opção, na ordem paraboloide, calota e toro */
    const casos = [[{}, [0.0369, 0.0634, 0.0495]], [{ pontos: 16 }, [0.0358, 0.0314, 0.019]], [{ meio: [0.25, 0.25] }, [0.4974, 0.4726, 1.1054]], [{ meio: [0.25, 0.25], pontos: 16 }, [0.2358, 0.0631, 0.2285]], [{ meio: [0.3, 0.5] }, [0.3551, 0.2869, 0.1993]], [{ meio: [0.3, 0.5], pontos: 16 }, [0.0773, 0.0857, 0.0278]]];
    let linhas = 0;
    for (const [definicao, medidas] of casos) {
      const provas = provaDasAnaliticas({ definicao, modos: ['vizinhas'] });
      expect(provas.map((p) => p.superficie)).toEqual(['paraboloide', 'calota', 'toro']);
      provas.forEach((p, k) => {
        const onde = `${p.superficie} ${JSON.stringify(definicao)}`; const { nucleo, hoje, vizinhas } = p; linhas++;
        expect(nucleo.contraPrototipoMm, `${onde}: os pontos do núcleo contra os do protótipo`).toBeLessThan(1e-9);
        expect(maiorDiferencaDeNumero(vizinhas.comEnergia, nucleo.comEnergia), `${onde}: a tabela`).toBeLessThan(1e-9);
        expect(maiorDiferencaDeNumero(vizinhas.cotaMm, nucleo.cotaMm), `${onde}: a cota do miolo`).toBeLessThan(1e-9);
        /* o gate: nunca pior que sem a opção, nem que a opção com o preenchimento padrão (a etapa B), e não pior que a medida */
        expect(nucleo.comEnergia.a100Mm, `${onde}: a 100 mm da borda contra a rede sem a opção`).toBeLessThanOrEqual(hoje.semEnergia.a100Mm);
        expect(nucleo.comEnergia.a100Mm, `${onde}: a 100 mm da borda contra a etapa B`).toBeLessThanOrEqual(hoje.comEnergia.a100Mm + 1e-4);
        expect(nucleo.comEnergia.a100Mm, `${onde}: a 100 mm da borda contra a medida`).toBeLessThanOrEqual(medidas[k] * 1.02 + 0.001);
        for (const curva of ['h1', 'v1']) expect(nucleo.comEnergia.crista[curva], `${onde}: a crista da ${curva} contra a rede sem a opção`).toBeLessThanOrEqual(hoje.semEnergia.crista[curva]);
      });
    }
    expect(linhas).toBe(18);
  }, 600000);

  it('nas chapas emendadas e na rede-sem-ruido o núcleo dá os pontos e a tabela do protótipo, e as medidas ficam as da etapa B', () => {
    for (const p of [...provaDasEmendas({ modos: ['vizinhas'] }), provaDaRede({ modos: ['vizinhas'] })]) {
      expect(p.nucleo.contraPrototipoMm, p.chapa).toBeLessThan(1e-9);
      expect(maiorDiferencaDeNumero(p.vizinhas.comEnergia, p.nucleo.comEnergia), p.chapa).toBeLessThan(1e-9);
      /* as chapas emendadas e o painel da rede são de curvatura numa direção só ou aditivos: o miolo quase não se mexe (0 e 0,003 mm) e
         as medidas com a opção ficam as do preenchimento padrão com a energia, a menos da quarta casa */
      expect(p.vizinhas.andouMm, p.chapa).toBeLessThan(0.01);
      expect(maiorDiferencaDeNumero(p.hoje.comEnergia, p.nucleo.comEnergia), p.chapa).toBeLessThan(0.02);
    }
  }, 240000);

  it('nas redes com vinco, simetria, nó em T e retalho de três e de cinco lados ao lado, os pontos do núcleo são os do protótipo', () => {
    const redes = { 'rede-com-ruido': definicaoDaRede({}), 'chapa-simetrica': definicaoDaChapaSimetrica({}), 'rede-tres-no-no': definicaoTresNoNo(), 'emenda-g0': definicaoDaEmenda('emenda-g0'), 'chapa lateral': definicaoDaChapaLateral({}) };
    for (const [nome, def] of Object.entries(redes)) {
      const curvas = def.curvas.map(({ continuidade, ...c }) => c);
      const g0 = gaiolaPorRede({ ...def, curvas, liso: false }); const gE = gaiolaPorRede({ ...def, curvas, alisarSuperficie: true });
      expect(contraPrototipo(g0, gE) * 1000, nome).toBeLessThan(1e-9);
    }
    /* e ali o miolo se mexe de fato: 0,88, 0,71, 0,46 e 4,6 mm (na emenda-g0, de curvatura numa direção só, não) */
    const lateral = definicaoDaChapaLateral({});
    expect(preencherRede(gaiolaPorRede({ ...lateral, liso: false }), 'vizinhas').andou * 1000).toBeGreaterThan(1);
  });
});
