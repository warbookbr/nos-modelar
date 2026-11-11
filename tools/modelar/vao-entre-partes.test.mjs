/* vao-entre-partes.test.mjs — o vão e o degrau entre chapas planas com a medida conhecida (coplanares, com degrau, inclinadas a 38 graus,
   com vão de 4 a 5 mm), a parte solta, a faixa esperada com o ponto, e a entrada por esboço com a folga declarada. Sem domínio. */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAPACIDADES, executar as fichas } from './capacidade.mjs';
import { ErroDoVao, executar, linhaDoPar, vaoEntrePartes } from './vao-entre-partes.mjs';

const add = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);
const gira = (v, graus) => { const r = (graus * Math.PI) / 180; return [v[0] * Math.cos(r) + v[2] * Math.sin(r), v[1], -v[0] * Math.sin(r) + v[2] * Math.cos(r)]; };

/* um prisma de seis faces: a origem o, a largura ao longo de u, o comprimento ao longo de v e a espessura ao longo de n */
function chapa(parte, o, u, v, n, [lu, lv, esp]) {
  const c = (i, j, k) => add(add(add(o, u, i * lu), v, j * lv), n, k * esp);
  const quad = (a, b, cc, d) => ({ pts: [a, b, cc, d], parte });
  return [
    quad(c(0, 0, 0), c(0, 1, 0), c(1, 1, 0), c(1, 0, 0)), quad(c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)),
    quad(c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(0, 0, 1)), quad(c(0, 1, 0), c(0, 1, 1), c(1, 1, 1), c(1, 1, 0)),
    quad(c(0, 0, 0), c(0, 0, 1), c(0, 1, 1), c(0, 1, 0)), quad(c(1, 0, 0), c(1, 1, 0), c(1, 1, 1), c(1, 0, 1)),
  ];
}
const X = [1, 0, 0]; const Y = [0, 1, 0]; const Z = [0, 0, 1];
const MEDIDA = [100, 100, 1.5];
/* duas chapas de 100 x 100 x 1,5 mm, a segunda a `vao` mm da primeira ao longo de u, e com `dz` mm de degrau */
const duasChapas = ({ vao = 4, dz = 0, giro = 0 } = {}) => {
  const base = (o, parte) => chapa(parte, gira(o, giro), gira(X, giro), Y, gira(Z, giro), MEDIDA);
  return [...base([0, 0, 0], 'a'), ...base([100 + vao, 0, dz], 'b')];
};
const par = (faces, o = {}) => vaoEntrePartes(faces, o).pares.find((p) => (p.a === 'a' && p.b === 'b'));

describe('o vão entre duas chapas', () => {
  it('coplanares a 4 mm: vão 4,000 de ponta a ponta, sem degrau, na linha de 100 mm', () => {
    const p = par(duasChapas());
    expect(p.tipo).toBe('folga');
    expect(p.vao).toMatchObject({ min: 4, mediana: 4, p90: 4, max: 4 });
    expect(p.degrau).toMatchObject({ mediana: 0, max: 0 });
    expect(p.linhaMm).toBeGreaterThan(90); expect(p.linhaMm).toBeLessThan(115);
    expect(p.vao.emMin[0]).toBeCloseTo(102, 0);
    expect(p.vao.emMin.slice(1).every((x) => x >= 0 && x <= 100)).toBe(true);
  });

  it('a 4 mm com degrau de 1 mm: o vão continua 4 e o degrau é 1', () => {
    const p = par(duasChapas({ dz: 1 }));
    expect(p.vao.min).toBeCloseTo(4, 2); expect(p.vao.max).toBeCloseTo(4, 1);
    expect(p.degrau).toMatchObject({ mediana: 1, max: 1 });
    expect(par(duasChapas({ dz: 1 }), { degrau: 0.5 }).fora.map((f) => f.motivo)).toEqual(['degrau acima do aceito']);
    expect(par(duasChapas({ dz: 1 }), { degrau: 1.5 }).fora).toEqual([]);
  });

  it('inclinadas a 38 graus, o vão de 4 mm é o ao longo delas', () => {
    const p = par(duasChapas({ giro: 38 }));
    expect(p.vao.min).toBeCloseTo(4, 2);
    expect(p.vao.max).toBeCloseTo(4, 2);
    expect(p.degrau.max).toBeCloseTo(0, 2);
  });

  it('a chapa a 38 graus cortada com a parede paralela ao eixo, e não normal a ela, tem o vão ao longo dela de 4 sobre o cosseno', () => {
    /* o corte no plano x z: a parede de cada chapa é vertical, as duas a 4 mm uma da outra em x, e a borda de uma à da outra, ao
       longo da chapa, mede 4 / cos 38 = 5,076 mm (o do para-brisa do sedã) */
    const r = (38 * Math.PI) / 180; const u = [Math.cos(r), -Math.sin(r)]; const n = [Math.sin(r), Math.cos(r)]; const e = 1.5; const L = 100;
    const secao = (s0) => {
      const T0 = [s0 * u[0], s0 * u[1]]; const T1 = [(s0 + L) * u[0], (s0 + L) * u[1]];
      const fora = (T) => [T[0] + e * n[0] - e * Math.tan(r) * u[0], T[1] + e * n[1] - e * Math.tan(r) * u[1]];
      return [T0, T1, fora(T1), fora(T0)];
    };
    const extrude = (parte, q) => {
      const pt = ([x, z], y) => [x, y, z];
      const lados = q.map((c, i) => { const d = q[(i + 1) % 4]; return { pts: [pt(c, 0), pt(d, 0), pt(d, 100), pt(c, 100)], parte }; });
      return [...lados, { pts: q.map((c) => pt(c, 0)), parte }, { pts: [...q].reverse().map((c) => pt(c, 100)), parte }];
    };
    const p = par([...extrude('a', secao(0)), ...extrude('b', secao(L + 4 / Math.cos(r)))]);
    expect(p.tipo).toBe('folga');
    expect(p.vao.mediana).toBeCloseTo(4 / Math.cos(r), 2);
    expect(p.vao.min).toBeCloseTo(4 / Math.cos(r), 2);
    expect(p.degrau.max).toBeCloseTo(0, 2);
  });

  it('com vão de 4 a 5 mm: mínimo 4, máximo 5 e mediana entre os dois, com o ponto de cada um', () => {
    /* a segunda chapa girada em torno de z, de modo que o vão cresce 1 mm em 100 mm de comprimento */
    const a = chapa('a', [0, 0, 0], X, Y, Z, MEDIDA);
    const ang = Math.atan(1 / 100);
    const u = [Math.cos(ang), -Math.sin(ang), 0]; const v = [Math.sin(ang), Math.cos(ang), 0];
    const b = chapa('b', [104, 0, 0], u, v, Z, MEDIDA);
    const p = par([...a, ...b]);
    expect(p.vao.min).toBeGreaterThan(3.97); expect(p.vao.min).toBeLessThan(4.1);
    expect(p.vao.max).toBeGreaterThan(4.85); expect(p.vao.max).toBeLessThan(5.05);
    expect(p.vao.mediana).toBeGreaterThan(4.3); expect(p.vao.mediana).toBeLessThan(4.7);
    expect(p.vao.emMin[1]).toBeLessThan(25); expect(p.vao.emMax[1]).toBeGreaterThan(75);
  });
});

describe('a faixa esperada', () => {
  it('o par dentro de esperado ± tolerância não sai fora; o de fora sai com o ponto e o comando devolve 1', async () => {
    const faces = duasChapas({ vao: 4.5 });
    expect(par(faces, { esperado: 4.5, tolerancia: 0.1 }).fora).toEqual([]);
    const f = par(faces, { esperado: 4, tolerancia: 0.1 }).fora;
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ motivo: 'vão acima do esperado', mm: 4.5 });
    expect(f[0].em).toHaveLength(3);
    const r = vaoEntrePartes(faces, { esperado: 4, tolerancia: 0.1 });
    expect(r.resumo.fora).toBe(1);
    expect(linhaDoPar(r.pares[0])).toContain('FORA: vão acima do esperado');
  });

  it('a folga declarada no par vale no lugar da geral', () => {
    const faces = duasChapas({ vao: 4.5 });
    const r = vaoEntrePartes(faces, { esperado: 4, tolerancia: 0.1, folgas: { 'a|b': { esperada: 4.5, tolerancia: 0.05 } } });
    expect(r.pares[0].fora).toEqual([]);
    expect(r.pares[0]).toMatchObject({ esperada: 4.5, tolerancia: 0.05 });
  });

  it('o par que toca não tem vão e só é conferido quando declarado', () => {
    const faces = duasChapas({ vao: 0 });
    expect(par(faces, { esperado: 4 })).toMatchObject({ tipo: 'toca', fora: [] });
    expect(par(faces, { esperado: 4, folgas: { 'a|b': { esperada: 4, tolerancia: 0.1 } } }).fora[0].motivo).toMatch(/toca/);
  });

  it('--par mede só os pares pedidos e --partes só as partes do subconjunto', () => {
    const faces = [...duasChapas(), ...chapa('c', [300, 0, 0], X, Y, Z, MEDIDA), ...chapa('cc', [404, 0, 0], X, Y, Z, MEDIDA)];
    expect(vaoEntrePartes(faces, { vizinho: 12 }).pares.map((p) => `${p.a}:${p.b}`).sort()).toEqual(['a:b', 'c:cc']);
    expect(vaoEntrePartes(faces, { pares: [['b', 'a']] }).pares.map((p) => `${p.a}:${p.b}`)).toEqual(['a:b']);
    expect(vaoEntrePartes(faces, { partes: ['c'] }).pares.map((p) => `${p.a}:${p.b}`)).toEqual(['c:cc']);
    expect(() => vaoEntrePartes(faces, { pares: [['a', 'z']] })).toThrow(ErroDoVao);
    expect(() => vaoEntrePartes(faces, { partes: ['zz'] })).toThrow(/não casa/);
  });
});

describe('as partes soltas', () => {
  const faces = [...duasChapas({ vao: 0 }), ...chapa('c', [350, 0, 0], X, Y, Z, MEDIDA)];
  it('lista a que não encosta nem atravessa nenhuma outra, com a mais próxima e a distância', () => {
    const r = vaoEntrePartes(faces);
    expect(r.soltas).toEqual([expect.objectContaining({ parte: 'c', maisProxima: 'b', apoia: null })]);
    expect(r.pares.find((p) => p.a === 'a' && p.b === 'b').tipo).toBe('toca');
    expect(r.soltas[0].distanciaMm).toBeCloseTo(150, 1);
    expect(r.resumo.soltasSemApoio).toBe(1);
  });

  it('a parte que atravessa a outra sem tocar a quina não é solta, e --apoia declara a solta de propósito', () => {
    const cruz = [...chapa('a', [0, 0, 0], X, Y, Z, [100, 20, 1.5]), ...chapa('b', [40, -40, -20], X, Y, Z, [20, 100, 40])];
    expect(vaoEntrePartes(cruz).soltas).toEqual([]);
    const r = vaoEntrePartes(faces, { apoia: { c: 'pousa no chão' } });
    expect(r.soltas[0].apoia).toBe('pousa no chão');
    expect(r.resumo).toMatchObject({ soltas: 1, soltasSemApoio: 0 });
  });
});

describe('o comando', () => {
  const esboco = (contato) => ({
    opcoes: [{
      titulo: 'dois cubos', formas: [
        { id: 'a', op: 'cubo', args: { larg: 100, alt: 100, prof: 2 }, centro: [0, 0, 0] },
        { id: 'b', op: 'cubo', args: { larg: 100, alt: 100, prof: 2 }, centro: [104, 0, 0] },
        { id: 'c', op: 'cubo', args: { larg: 20, alt: 20, prof: 2 }, centro: [0, 200, 0] },
      ],
      contatos: [{ par: ['a', 'b'], relacao: 'folga', motivo: 'vão de projeto', ...(contato ? { folga: contato } : {}) }],
    }],
  });
  const gravar = (e) => { const f = join(mkdtempSync(join(tmpdir(), 'vao-')), 'x.esboco.json'); writeFileSync(f, JSON.stringify(e)); return f; };

  it('usa a folga declarada no esboço, lista a solta e sai 0 ou 1', async () => {
    const certo = await executar([gravar(esboco({ esperada: 4, tolerancia: 0.1 }))]);
    expect(certo.codigo).toBe(0);
    expect(certo.stdout).toMatch(/a:b \[folga\] vão mín 4,000/);
    expect(certo.stdout).toMatch(/partes soltas \(3\): c a 140,00 mm de a; a a 4,00 mm de b; b a 4,00 mm de a/);
    const errado = await executar([gravar(esboco({ esperada: 5, tolerancia: 0.1 }))]);
    expect(errado.codigo).toBe(1);
    expect(errado.stdout).toContain('FORA: vão abaixo do esperado 4,000 em (');
  });

  it('--soltas=recusar sai 1 com solta, e --apoia a libera; --json traz os números', async () => {
    const arq = gravar(esboco());
    expect((await executar([arq, '--soltas=recusar'])).codigo).toBe(1);
    const apoios = ['--apoia=c:pendurada', '--apoia=a:dobradiça', '--apoia=b:dobradiça'];
    expect((await executar([arq, '--soltas=recusar', ...apoios])).codigo).toBe(0);
    const j = JSON.parse((await executar([arq, '--json', '--esperado=4', '--tolerancia=0.1'])).stdout);
    expect(j.pares[0]).toMatchObject({ a: 'a', b: 'b', vao: { min: 4 } });
    expect(j.soltas.map((x) => x.parte)).toEqual(['c', 'a', 'b']);
  });

  it('recusa argumento ruim e montagem com o código 2', async () => {
    const arq = gravar(esboco());
    expect((await executar([arq, '--par=a'])).codigo).toBe(2);
    expect((await executar([arq, '--esperado=x'])).codigo).toBe(2);
    expect((await executar([arq, '--soltas=talvez'])).codigo).toBe(2);
    const m = join(mkdtempSync(join(tmpdir(), 'vao-')), 'm.json');
    writeFileSync(m, JSON.stringify({ formato: 'mecanifica.montagem', versao: 5, id: 'x', instancias: [] }));
    const r = await executar([m]);
    expect(r.codigo).toBe(2);
    expect(r.stderr).toMatch(/montagem/);
  });
});

describe('a ficha', () => {
  it('a capacidade vaoEntrePartes se acha por vão, folga, degrau, painel e parte solta', () => {
    expect(CAPACIDADES.vaoEntrePartes).toBeDefined();
    const r = fichas(['vaoEntrePartes']);
    expect(r.codigo).toBe(0);
    for (const palavra of ['vão', 'folga', 'degrau', 'painéis', 'solta']) expect(r.stdout).toContain(palavra);
  });
});
