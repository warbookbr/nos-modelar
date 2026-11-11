/* paineis-por-vaos-curva.test.ts — a linha de vão dada como curva 3D sobre a chapa (`linhas[i].curva`), que sobe a quina arredondada.
   A chapa é a de `fixtures/chapa-em-l-prova.js`: duas faces a 90 graus ligadas por quina de raio 6 mm, de raio 3 mm e de raio que afina de 6 a 3 mm, de 1 mm de espessura em
   `subdivisao`. Cada caso mede no resultado executado, e não no que a função diz: a menor distância 3D entre as paredes do corte (a folga), a distância entre as bordas da
   pele de fora dos dois painéis (o vão) e o desnível entre a pele de fora de um e o plano da face do outro junto da borda (o degrau). Sem domínio. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { paineisPorVaos } from './paineis-por-vaos.js';
// @ts-expect-error — núcleo em JavaScript.
import { curvaDaGaiola } from './curva-da-gaiola.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';
// @ts-expect-error — núcleo em JavaScript.
import { normalDaFace } from './nucleo.js';
// @ts-expect-error — núcleo em JavaScript.
import { prepararPontoNaMalha } from './ponto-na-malha.js';
// @ts-expect-error — núcleo em JavaScript.
import { chapaEmL } from './fixtures/chapa-em-l-prova.js';
// @ts-expect-error — módulo em JavaScript.
import { passoEmMetro } from '../../modulos/esboco-nucleo/src/milimetro.js';

type V3 = [number, number, number];
const grito = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } throw new Error('não gritou'); };
const chv = (p: V3) => p.map((x) => Math.round(x * 1000)).join(',');

/** A folga, o vão e o degrau do corte, medidos nos vértices que o corte criou. */
function medirCorte(g: any, chapa: any, partes: string[], exclui: (p: V3) => boolean = () => false) {
  const st = nucleo(g.passos, {}, chapa.pontos);
  expect(st.orfaos).toEqual([]);
  const original = nucleo([...chapa.passos, ['parte', { nome: 'ext', sel: { origem: { ...chapa.origem, parte: 'externa' } } }]], {}, chapa.pontos);
  const externa = [...original.F.values()].filter((f: any) => f.parte === 'ext').map((f: any) => f.id);
  const pele = prepararPontoNaMalha(original.V, original.F, externa);
  const vertices = new Set([...original.V.values()].map(chv));
  const sobrePele = (p: V3) => (pele.maisProximo(p, 0.01)?.distancia ?? 1) < 0.01;
  const faces = (nome: string) => [...st.F.values()].filter((f: any) => f.parte === nome);
  const grade = (lista: any[]) => prepararPontoNaMalha(st.V, new Map(lista.map((f) => [f.id, f])), lista.map((f) => f.id));
  const todas: Record<string, any> = {}; const peles: Record<string, any> = {};
  for (const nome of partes) {
    todas[nome] = grade(faces(nome));
    peles[nome] = grade(faces(nome).filter((f: any) => f.vs.every((v: number) => sobrePele(st.V.get(v)))));
  }
  const folga: number[] = []; const vao: number[] = []; const degrau: number[] = [];
  for (const a of partes) {
    const criados = new Map<number, V3>();
    for (const f of faces(a)) for (const v of f.vs) { const p = st.V.get(v) as V3; if (!vertices.has(chv(p)) && !exclui(p)) criados.set(v, p); }
    for (const p of criados.values()) {
      /* o pedaço mais perto: a folga de um vértice da parede é a distância ao pedaço do outro lado dela, e não a de um pedaço que fica adiante */
      let melhor: { b: string, d: number } | null = null;
      for (const b of partes) {
        if (a === b) continue;
        const r = todas[b].maisProximo(p, 10);
        if (r && (!melhor || r.distancia < melhor.d)) melhor = { b, d: r.distancia };
      }
      if (!melhor) continue;
      folga.push(melhor.d);
      if (!sobrePele(p)) continue;
      const q = peles[melhor.b].maisProximo(p, 10);
      if (!q) continue;
      const n = normalDaFace(st.V, st.F.get(q.face).vs);
      vao.push(q.distancia);
      degrau.push(Math.abs((p[0] - q.ponto[0]) * n[0] + (p[1] - q.ponto[1]) * n[1] + (p[2] - q.ponto[2]) * n[2]));
    }
  }
  const e = (l: number[]) => ({ n: l.length, min: Math.min(...l), max: Math.max(...l) });
  return { st, folga: e(folga), vao: e(vao), degrau: e(degrau), pedacos: new Set([...st.F.values()].map((f: any) => f.parte).filter(Boolean)).size };
}

const NO_L = (x: number) => x; // a quina de raio 0: a curva dos testes é dada na L viva e a pele a leva à quina arredondada
/** O ponto da L viva (face de cima de x = -40 a 40, face de lado de y = 40 a -40) a `s` mm da ponta de cima, em z. */
const naL = (s: number, z: number): V3 => (s <= 80 ? [NO_L(-40 + s), 40, z] : [40, 40 - (s - 80), z]);
const sementes = (...p: [string, string, number[]][]) => p.map(([nome, eixo, ponto]) => ({ nome, eixo, ponto }));
const DOIS = sementes(['a', 'y', [-20, 20]], ['b', 'y', [-20, 70]]);
/** A curva da face de cima à de lado em z = 48,6 mm, dada na L viva: o ponto da quina fica a 2,5 mm da pele arredondada. */
const CURVA_L: V3[] = [0, 20, 40, 60, 78, 80, 82, 100, 120, 140, 158].map((s) => naL(s, 48.6));

describe('curva 3D sobre a quina arredondada: folga de 4 mm ao longo de toda a curva', () => {
  for (const [rotulo, raio] of [['raio 6', 6], ['raio 3', 3], ['raio 6 a 3', { de: 6, ate: 3 }]] as [string, any][]) {
    it(`${rotulo}: a curva dada em pontos sobe a quina, com a folga entre 4,0 e 4,2 mm e o degrau pequeno`, () => {
      const L = chapaEmL({ raio });
      const g = paineisPorVaos({ chapa: L.chapa, vao: 4, linhas: [{ nome: 'porta', curva: CURVA_L, alem: 20 }], paineis: DOIS });
      expect(g.medidas.paineisAchados).toBe(2);
      expect(g.medidas.pedacosSemNome).toEqual([]);
      expect(g.avisos).toEqual([]);
      expect(g.medidas.curvas[0].desvioMaximo).toBeLessThan(3);
      const m = medirCorte(g, L.chapa, ['a', 'b']);
      expect(m.pedacos).toBe(2);
      expect(m.folga.min).toBeGreaterThanOrEqual(4 - 1e-6);
      expect(m.folga.max).toBeLessThanOrEqual(4.2);
      expect(m.vao.min).toBeGreaterThanOrEqual(4 - 1e-6);
      expect(m.vao.max).toBeLessThanOrEqual(4.2);
      expect(m.degrau.max).toBeLessThanOrEqual(typeof raio === 'number' ? 0.001 : 0.2);
      expect(g.medidas.folgaMedida).toBeGreaterThanOrEqual(4);
      expect(g.medidas.folgaMedida).toBeLessThanOrEqual(4.2);
      process.stdout.write(`[curva sobe a quina, ${rotulo}] folga ${m.folga.min.toFixed(3)} a ${m.folga.max.toFixed(3)}, vão ${m.vao.min.toFixed(3)} a ${m.vao.max.toFixed(3)}, degrau ${m.degrau.max.toFixed(3)}, ${g.medidas.curvas[0].estacoes} estações\n`);
    });
  }

  it('a linha que corre ao longo da quina, desenhada na vista de lado, é recusada nos dois modos, como o atrito 3 do ciclo 1', () => {
    const L = chapaEmL({ raio: 6 });
    const base = { chapa: L.chapa, vao: 4, paineis: DOIS };
    /* de lado ([z, y]), a linha que corre ao longo da quina, a y = 39,9, passa onde a pele fica a mais de 80 graus da lâmina (a normal quase paralela ao perpendicular da linha) */
    const linha = { nome: 'longa', eixo: 'x', pontos: [[10, 39.9], [70, 39.9]], alcance: [0, 100] };
    expect(grito(() => paineisPorVaos({ ...base, linhas: [linha] }))).toMatch(/inclinada/);
    expect(grito(() => paineisPorVaos({ ...base, linhas: [linha], modo: 'superficie' }))).toMatch(/rasante/);
  });
});

describe('curva tirada da gaiola numa estação fracionária', () => {
  for (const [rotulo, raio, virar] of [['raio 6, normais para fora', 6, true], ['raio 3, normais para fora', 3, true], ['raio 6, normais para dentro', 6, false], ['raio 6 a 3, normais para fora', { de: 6, ate: 3 }, true]] as [string, any, boolean][]) {
    it(`estação 2,43, da coluna a à coluna b, ${rotulo}`, () => {
      const L = chapaEmL({ raio, virar });
      const { curva } = curvaDaGaiola(L.gaiola, { estacao: 2.43, de: 'a', ate: 'b' });
      expect(curva.every((p: V3) => Math.abs(p[2] - 48.6) < 1e-6)).toBe(true);
      const g = paineisPorVaos({ chapa: L.chapa, vao: 4, linhas: [{ nome: 'porta', curva, alem: 20 }], paineis: DOIS });
      expect(g.avisos).toEqual([]);
      expect(g.medidas.curvas[0].desvioMaximo).toBeLessThan(0.01);
      const m = medirCorte(g, L.chapa, ['a', 'b']);
      expect(m.pedacos).toBe(2);
      expect(m.folga.min).toBeGreaterThanOrEqual(4 - 1e-6);
      expect(m.folga.max).toBeLessThanOrEqual(4.2);
      expect(m.vao.min).toBeGreaterThanOrEqual(4 - 1e-6);
      expect(m.vao.max).toBeLessThanOrEqual(4.2);
      expect(m.degrau.max).toBeLessThanOrEqual(typeof raio === 'number' ? 0.001 : 0.2);
      process.stdout.write(`[estação 2,43 da gaiola, ${rotulo}] folga ${m.folga.min.toFixed(3)} a ${m.folga.max.toFixed(3)}, degrau ${m.degrau.max.toFixed(3)}, ${g.medidas.curvas[0].estacoes} estações\n`);
    });
  }
});

describe('curva fechada (uma janela) que cruza a quina', () => {
  it('a janela de 24 por 32 mm, metade em cada face, sai como painel próprio com a folga de 4 mm em toda a volta', () => {
    const L = chapaEmL({ raio: 6 });
    const pts: V3[] = [];
    const lado = (a: [number, number], b: [number, number]) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3); for (let k = 0; k < n; k += 1) pts.push(naL(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n)); };
    lado([68, 24], [92, 24]); lado([92, 24], [92, 56]); lado([92, 56], [68, 56]); lado([68, 56], [68, 24]);
    const paineis = sementes(['fora', 'y', [-20, 40]], ['janela', 'y', [36, 40]]);
    const g = paineisPorVaos({ chapa: L.chapa, vao: 4, linhas: [{ nome: 'janela', curva: pts, fechada: true }], paineis });
    expect(g.medidas.paineisAchados).toBe(2);
    expect(g.avisos).toEqual([]);
    /* nos quatro cantos da janela a parede de fora está a 4 por raiz de 2 do canto de dentro (a diagonal da esquadria); fora de 6 mm deles é a folga da parede */
    const cantos: V3[] = [[28, 40, 24], [28, 40, 56], [40, 28, 24], [40, 28, 56]];
    const m = medirCorte(g, L.chapa, ['fora', 'janela'], (p) => cantos.some((c) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < 6));
    expect(m.pedacos).toBe(2);
    expect(m.folga.min).toBeGreaterThanOrEqual(4 - 1e-6);
    expect(m.folga.max).toBeLessThanOrEqual(4.2);
    expect(m.vao.max).toBeLessThanOrEqual(4.2);
    expect(m.degrau.max).toBeLessThanOrEqual(0.001);
    expect(g.medidas.folgaMedida).toBeGreaterThanOrEqual(4);
    expect(g.medidas.folgaMedida).toBeLessThanOrEqual(4.2);
    process.stdout.write(`[janela fechada na quina] folga ${m.folga.min.toFixed(3)} a ${m.folga.max.toFixed(3)}, vão ${m.vao.min.toFixed(3)} a ${m.vao.max.toFixed(3)}, degrau ${m.degrau.max.toFixed(3)}\n`);
  });
});

describe('duas curvas que se encontram em T sobre a quina', () => {
  it('a linha que sobe a quina e outra que corre ao longo dela, a partir da primeira, dão três painéis com 4 mm de folga entre cada par', () => {
    const L = chapaEmL({ raio: 6 });
    const a = curvaDaGaiola(L.gaiola, { estacao: 2.43, de: 'a', ate: 'b' }).curva;
    const b = curvaDaGaiola(L.gaiola, { coluna: 'q', de: 2.43, ate: 4 }).curva;
    expect(b[0][2]).toBeCloseTo(48.6, 6);
    const paineis = [{ nome: 'a', eixo: 'y', ponto: [-20, 20] }, { nome: 'cima', eixo: 'y', ponto: [0, 70] }, { nome: 'lado', eixo: 'x', ponto: [70, 0], lado: '+' }];
    const g = paineisPorVaos({ chapa: L.chapa, vao: 4, linhas: [{ nome: 'travessa', curva: a, alem: 20 }, { nome: 'longa', curva: b, alem: [0, 20] }], paineis });
    expect(g.medidas.paineisAchados).toBe(3);
    expect(g.medidas.pedacosSemNome).toEqual([]);
    expect(g.avisos).toEqual([]);
    /* junto do T a distância de uma parede da travessa aos cantos da longa é de 4,5 mm (a diagonal de 4 por 2); fora de 5,5 mm em volta da emenda, é a da parede */
    const m = medirCorte(g, L.chapa, ['a', 'cima', 'lado'], (p) => p[0] + p[1] > 70 && Math.abs(p[2] - 48.6) < 5.5);
    expect(m.pedacos).toBe(3);
    expect(m.folga.min).toBeGreaterThanOrEqual(4 - 1e-6);
    expect(m.folga.max).toBeLessThanOrEqual(4.2);
    expect(g.medidas.folgaMedida).toBeGreaterThanOrEqual(4);
    expect(g.medidas.folgaMedida).toBeLessThanOrEqual(4.2);
    /* o degrau medido contra o plano da face do outro painel não vale para a travessa que corre ao longo da quina: o plano é tangente ao filete, e o filete se afasta dele 1,9 mm em 4 mm de arco */
    process.stdout.write(`[T sobre a quina] folga ${m.folga.min.toFixed(3)} a ${m.folga.max.toFixed(3)}, vão ${m.vao.min.toFixed(3)} a ${m.vao.max.toFixed(3)}, degrau ${m.degrau.max.toFixed(3)}\n`);
  });
});

describe('determinismo, unidade e entradas', () => {
  const L = chapaEmL({ raio: 6 });
  const { curva } = curvaDaGaiola(L.gaiola, { estacao: 2.43, de: 'a', ate: 'b' });
  const base = { chapa: L.chapa, vao: 4, linhas: [{ nome: 'porta', curva, alem: 20 }], paineis: DOIS };
  it('a mesma entrada dá os mesmos passos e a mesma malha, e `saida: metro` é o conversor do esboço sobre a saída em mm', () => {
    const a = paineisPorVaos({ ...base, areaMinima: 100 });
    const b = paineisPorVaos({ ...base, areaMinima: 100.0000001 });
    expect(JSON.stringify(b.passos)).toBe(JSON.stringify(a.passos));
    const malha = (g: any) => { const st = nucleo(g.passos, {}, L.chapa.pontos); return JSON.stringify([[...st.V.entries()], [...st.F.values()].map((f: any) => [f.id, f.vs, f.parte])]); };
    expect(malha(b)).toBe(malha(a));
    const mm = paineisPorVaos({ ...base, chapa: { ...L.chapa, emitir: false }, areaMinima: 100 });
    const metro = paineisPorVaos({ ...base, saida: 'metro' });
    expect(metro.passos).toEqual(mm.passos.map((p: any) => passoEmMetro(p)));
    expect(metro.passos.some((p: any) => p[0] === 'subdivisao')).toBe(true);
  });
  it('a curva que passa mais longe da pele que a tolerância, ou que sai da chapa sem `alem`, é recusada com o ponto', () => {
    const longe = curva.map((p: V3, k: number) => (k === 5 ? [p[0], p[1] + 30, p[2]] : p));
    expect(grito(() => paineisPorVaos({ ...base, linhas: [{ nome: 'porta', curva: longe }] }))).toMatch(/ponto 5 .* a mais de 12 mm da pele, no meio da curva/);
    expect(grito(() => paineisPorVaos({ ...base, distanciaDaCurva: 0.5, linhas: [{ nome: 'porta', curva: CURVA_L, alem: 20 }] }))).toMatch(/a mais de 0,5 mm da pele/);
    const alem = [...curva, [40, -60, 48.6]];
    expect(grito(() => paineisPorVaos({ ...base, linhas: [{ nome: 'porta', curva: alem }] }))).toMatch(/sai da chapa pela ponta final.*dê `alem`/);
    expect(() => paineisPorVaos({ ...base, linhas: [{ nome: 'porta', curva: alem, alem: 20 }] })).not.toThrow();
    expect(grito(() => paineisPorVaos({ ...base, linhas: [{ nome: 'porta', curva: curva.map((p: V3) => [p[0] + 500, p[1], p[2]]) }] }))).toMatch(/não corta a chapa/);
  });
  it('a curva que não corta a chapa em dois pedaços é recusada, e a linha não mistura curva com a linha de uma vista', () => {
    const curta = curva.slice(2, 6);
    expect(grito(() => paineisPorVaos({ ...base, linhas: [{ nome: 'curta', curva: curta }] }))).toMatch(/nenhuma curva a separou em dois pedaços/);
    expect(grito(() => paineisPorVaos({ ...base, linhas: [{ nome: 'dupla', curva, eixo: 'y', pontos: [[0, 0], [1, 1]] }] }))).toMatch(/escolha uma entrada/);
    expect(grito(() => paineisPorVaos({ ...base, linhas: [{ nome: 'x', curva, modo: 'vista' }] }))).toMatch(/só vale no modo 'superficie'/);
    expect(grito(() => paineisPorVaos({ ...base, linhas: [{ nome: 'x', curva: [[0, 0, 0]] }] }))).toMatch(/pelo menos dois pontos/);
    expect(grito(() => paineisPorVaos({ ...base, linhas: [{ nome: 'x', curva, alem: [1] }] }))).toMatch(/\[no início, no fim\]/);
  });
});

describe('limpar: as faces finas do corte', () => {
  it('ligada por padrão na curva: o vão e as áreas não mudam, e a conta das faces finas sai nas medidas; `false` não emite o passo', () => {
    const L = chapaEmL({ raio: { de: 6, ate: 3 } });
    const { curva } = curvaDaGaiola(L.gaiola, { estacao: 2.43, de: 'a', ate: 'b' });
    const entrada = { chapa: L.chapa, vao: 4, linhas: [{ nome: 'p', curva, alem: 20 }], paineis: DOIS };
    const com = paineisPorVaos(entrada);
    const sem = paineisPorVaos({ ...entrada, limpar: false });
    expect(com.passos.some((p: any) => p[0] === 'limparLascas')).toBe(true);
    expect(sem.passos.some((p: any) => p[0] === 'limparLascas')).toBe(false);
    expect(com.medidas.lascasRestantes).toBeLessThanOrEqual(com.medidas.lascasAntes);
    expect(com.medidas.lascasAntes).toBeGreaterThan(0);
    expect(sem.medidas.lascasAntes).toBeUndefined();
    expect(Math.abs(com.medidas.folgaMedida - sem.medidas.folgaMedida)).toBeLessThanOrEqual(0.01);
    expect(com.medidas.paineis.map((p: any) => Math.round(p.area))).toEqual(sem.medidas.paineis.map((p: any) => Math.round(p.area)));
    expect(grito(() => paineisPorVaos({ ...entrada, limpar: { tolerancia: -1 } }))).toMatch(/limpar é true, false ou/);
  });
});

describe('a linha continuada de uma vista a outra', () => {
  it('um trecho visto de cima e outro visto de lado, com a emenda na quina, dão a curva que sobe a quina', () => {
    const L = chapaEmL({ raio: 6 });
    /* de cima ([x, z]) até o começo da quina (x = 34), e de lado ([z, y]) dali até a borda de baixo */
    const vistas = [{ eixo: 'y', pontos: [[-40, 48.6], [-10, 48.6], [34, 48.6]] }, { eixo: 'x', pontos: [[48.6, 34], [48.6, 0], [48.6, -40]] }];
    const g = paineisPorVaos({ chapa: L.chapa, vao: 4, linhas: [{ nome: 'porta', vistas, alem: 20 }], paineis: DOIS });
    expect(g.avisos).toEqual([]);
    const m = medirCorte(g, L.chapa, ['a', 'b']);
    expect(m.pedacos).toBe(2);
    expect(m.folga.min).toBeGreaterThanOrEqual(4 - 1e-6);
    expect(m.folga.max).toBeLessThanOrEqual(4.2);
    expect(m.degrau.max).toBeLessThanOrEqual(0.001);
    expect(grito(() => paineisPorVaos({ chapa: L.chapa, vao: 4, linhas: [{ nome: 'p', vistas: [{ eixo: 'y', pontos: [[900, 48.6], [901, 48.6]] }] }], paineis: DOIS }))).toMatch(/não toca a chapa/);
    process.stdout.write(`[vistas continuadas] folga ${m.folga.min.toFixed(3)} a ${m.folga.max.toFixed(3)}, ${g.medidas.curvas[0].quinas} quinas fundidas, ${g.medidas.curvas[0].estacoes} estações\n`);
  });
});
