/* booleanas-revisao-2.test.ts — regressões da segunda revisão adversarial das
   booleanas (2026-09-29): tolerâncias que dependiam da posição, costura mista
   que saía aberta sem grito, topologia que mudava com translação pura, e a
   faixa estendida de ids para o passo que passa de BLOCO pedaços. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { BASE_ESTENDIDA, BLOCO, FAIXA_ESTENDIDA, adaptarV3, idDoPasso, neutroCanonico, nucleo } from '../entrada.js';
// @ts-expect-error — fixture JavaScript.
import { TABELA, gerarPassos } from '../../../tools/mecanifica/fixtures/fixture-ombro-uniao.js';
// @ts-expect-error — serviço MJS.
import { exportarPeca, lerPecaResolvida } from '../../../tools/mecanifica/exportar-peca.mjs';
import { conferirMalha, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

const lat = (id: number, eixo: string, R: number, h: number, L: number, em: number[]) => ['lathe', { origemId: id, eixo, lados: L, em, perfil: [[0, 0], [R, 0], [R, h], [0, h]] }];
const faces = (n: any) => JSON.stringify([...n.F.values()].map((f: any) => [f.id, f.vs]).sort((a: any, b: any) => a[0] - b[0]));

describe('modo curvo com peça pequena longe da origem', () => {
  /* T de lathes: coluna de raio 1 mm, braço de 0,5 mm, arredondamento de
     0,1 mm. A tolerância da fatia media a distância à origem, e em x = 50 e
     500 o passo gritava. */
  const T = (x: number) => { const s = 0.001; return nucleo([lat(1, 'y', s, 4 * s, 24, [x, -2 * s, 0]), lat(2, 'x', 0.5 * s, 2 * s, 24, [x, 0, 0]),
    ['unir', { origemId: 9, solidos: [{ origem: { op: 'lathe', id: 1 } }, { origem: { op: 'lathe', id: 2 } }] }],
    ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: 0.1 * s }]]); };
  const base = T(0);
  for (const x of [5, 50, 500]) it(`em x = ${x} fecha e dá as mesmas faces e ids que na origem`, () => {
    const n = T(x);
    expect(n.orfaos).toEqual([]);
    expect(faces(n)).toBe(faces(base));
    expect(vinculosNaoManifold(n)).toEqual([]);
  });
});

describe('costura mista: caixa com cilindro facetado', () => {
  for (const r of [0.03, 0.05, 0.1, 0.2]) it(`raio ${r}: casca fechada e manifold (saía com 46 arestas sem par e sem grito)`, () => {
    const n = nucleo([['cubo', { origemId: 1, larg: 2, alt: 0.5, prof: 2 }], lat(2, 'y', 0.4, 1.5, 24, [0, 0, 0]),
      ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'lathe', id: 2 } }] }],
      ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: r }]]);
    conferirMalha(n, { fechada: true, rotulo: `mista r${r}` });
  });
});

describe('transladar a peça não muda topologia nem ids', () => {
  const P = gerarPassos(TABELA);
  const k = P.findIndex(([o]: any[]) => o === 'arredondarCostura');
  const rodar = (d: number[]) => {
    const l = P.slice(0, k + 1).map((x: any) => JSON.parse(JSON.stringify(x)));
    const rg = l[k][1].regiao;
    if (rg) { rg.min = rg.min.map((c: number, j: number) => c + d[j]); rg.max = rg.max.map((c: number, j: number) => c + d[j]); }
    l.splice(2, 0, ['transladar', { d, sel: { tudo: true } }]);
    return nucleo(l, TABELA);
  };
  const base = rodar([0, 0, 0]);
  for (const d of [[3, 0, 0], [300, 0, 0], [3000, 0, 0], [0.7, -12, 5]]) it(`ombro com concordância em ${JSON.stringify(d)}`, () => {
    const n = rodar(d);
    expect(n.orfaos).toEqual([]);
    expect(faces(n)).toBe(faces(base));
  });
});

describe('faixa estendida de ids', () => {
  it('idDoPasso: bloco normal até BLOCO-1, faixa estendida depois, e recusa fora dela', () => {
    expect(idDoPasso(3, 0)).toBe(3 * BLOCO);
    expect(idDoPasso(3, BLOCO - 1)).toBe(3 * BLOCO + BLOCO - 1);
    expect(idDoPasso(3, BLOCO)).toBe(BASE_ESTENDIDA + 3 * FAIXA_ESTENDIDA);
    expect(Number.isSafeInteger(idDoPasso(4095, BLOCO + FAIXA_ESTENDIDA - 1))).toBe(true);
    expect(() => idDoPasso(0, BLOCO + FAIXA_ESTENDIDA)).toThrow();
  });

  /* braço inclinado a 20° com raio 0,01: o modo por fatias precisa de mais de
     BLOCO pedaços, e antes gritava "divida a operação" */
  const receita = [['cubo', { origemId: 1, larg: 0.4, alt: 1.2, prof: 0.6 }], ['cubo', { origemId: 2, larg: 0.8, alt: 0.3, prof: 0.3, em: [0.4, 0.6, 0] }],
    ['rotaciona', { sel: { origem: { op: 'cubo', id: 2 } }, eixo: 'z', graus: 20, pivo: [0, 0.75, 0] }],
    ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
    ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio: 0.01 }],
    ['cubo', { origemId: 3, lado: 0.1, em: [0.6, 0, 0] }]];   // longe da peça, mas sem aumentar a escala da guarda de malha
  const n = nucleo(receita);
  const grandes = [...n.F.keys()].filter((id: number) => id >= BASE_ESTENDIDA);

  it('passa de BLOCO, fecha, e o passo seguinte numera sem colidir', () => {
    expect(n.orfaos).toEqual([]);
    expect(grandes.length).toBeGreaterThan(0);
    expect(grandes.every((id: number) => id >= BASE_ESTENDIDA + 4 * FAIXA_ESTENDIDA && id < BASE_ESTENDIDA + 5 * FAIXA_ESTENDIDA)).toBe(true);
    expect([...n.F.keys()].some((id: number) => id >= 5 * BLOCO && id < 6 * BLOCO)).toBe(true);   // o cubo do passo 5
    conferirMalha(n, { fechada: true, rotulo: 'faixa estendida' });
  });

  it('determinística, e a forma canônica ordena os ids grandes depois dos do bloco', () => {
    const a = JSON.stringify(neutroCanonico(n)), b = JSON.stringify(neutroCanonico(nucleo(receita)));
    expect(a).toBe(b);
    const ids = neutroCanonico(n).F.map((row: any[]) => row[0]);
    expect(ids).toEqual([...ids].sort((x: number, y: number) => x - y));
    expect(JSON.parse(a).F.map((row: any[]) => row[0])).toEqual(ids);   // o JSON ida e volta preserva o id grande
  });

  it('o atlas por face acha a ilha de uma face da faixa estendida', () => {
    const ctx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
    const r: any = adaptarV3(n, ctx);
    const ilha = r.atlas.daFace(grandes[0]).ilha;
    expect(ilha.w).toBeGreaterThan(0);
    expect(ilha.h).toBeGreaterThan(0);
  });

  it('a exportação leva o id grande e a leitura devolve a mesma malha', async () => {
    const e = await exportarPeca('faixa-estendida', { modulo: { meta: { nome: 'faixa_estendida' }, PASSOS: receita } });
    const idsExportados = e.dado.F.map((row: any[]) => row[0]);
    expect(idsExportados).toContain(grandes[0]);
    const lida = lerPecaResolvida(e.dado);
    expect(lida.F.size).toBe(n.F.size);
    expect(lida.F.has(grandes[0])).toBe(true);
  });
});

describe('conferirMalha pega vértice não-manifold', () => {
  it('duas pirâmides presas por um canto só: arestas com par, vínculo em duas voltas', () => {
    const V = new Map<number, number[]>([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [0, 1, 0]], [3, [0, 0, 1]], [4, [-1, 0, 0]], [5, [0, -1, 0]], [6, [0, 0, -1]]]);
    const F = new Map<number, any>();
    const tetra = (base: number, a: number, b: number, c: number) => { F.set(base, { id: base, vs: [0, b, a] }); F.set(base + 1, { id: base + 1, vs: [0, a, c] }); F.set(base + 2, { id: base + 2, vs: [0, c, b] }); F.set(base + 3, { id: base + 3, vs: [a, b, c] }); };
    tetra(0, 1, 2, 3); tetra(10, 4, 5, 6);
    expect(vinculosNaoManifold({ V, F })).toHaveLength(1);
  });
});
