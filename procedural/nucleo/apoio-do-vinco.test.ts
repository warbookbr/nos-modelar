/* apoio-do-vinco.test.ts — o raio em milímetro de uma aresta de caráter, convertido em colunas de apoio (apoio-do-vinco.js) e ligado
   ao vinco de `gaiolaPorEstacoes` (campo `raio`). A definição de raio (o filete) é conferida num perfil de arco exato; a relação, contra a
   definição aplicada à superfície limite e à malha que `subdivisao` entrega; e as provas da fatia 4c do plano do núcleo para qualquer
   mecanismo: (a) a dobra de duas faces planas a 90, 60, 120 e 150 graus com raio de 3, 6 e 12 mm em 2, 3 e 4 níveis, (b) a mesma dobra
   com as faces abauladas, (c) a quina que afina, (d) a chapa de 1 mm, (e) as duas quinas do caminho A do sedã contra a calibragem à mão,
   e os avisos pelo nome. O corte é perpendicular ao vinco, sobre a malha subdividida. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { NIVEIS_RECOMENDADOS, anguloDaDobra, apoioDoVinco, perfilDoApoio, raioDoFilete, raioPeloApoio, tabelaDeCalibragem } from './apoio-do-vinco.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorLacos } from './gaiola-por-lacos.js';
// @ts-expect-error — núcleo em JavaScript.
import { nitidezDoVinco, subdividirCatmullClark } from './subdivisao.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';
// @ts-expect-error — conversor do esboço em JavaScript.
import { argsEmMetro } from '../../modulos/esboco-nucleo/src/milimetro.js';

type P2 = [number, number];
const rad = (g: number) => (g * Math.PI) / 180;

/* ---- a fixture: duas faces planas (ou abauladas) que se dobram numa quina, em estações ao longo do vinco (z) ---- */
function cruzeta({ angulo, raio, L = 0.1, flecha = 0, nitidez, extra = {}, estacoes = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6], semVinco = false }:
  { angulo: number; raio?: any; L?: number; flecha?: number; nitidez?: number; extra?: Record<string, unknown>; estacoes?: number[]; semVinco?: boolean }) {
  const t = rad(angulo), c = Math.cos(t), s = Math.sin(t);
  const ds = [0.5, 0.3, L].sort((a, b) => b - a);
  /* a flecha: o ponto a `d` da quina sai da corda 4 f (d/0,5)(1 − d/0,5), para o lado de fora da dobra (a normal -y da face de trás) */
  const sai = (d: number) => flecha * 4 * (d / 0.5) * (1 - d / 0.5);
  const colunas: { nome: string; em: P2 }[] = [];
  for (const d of ds) colunas.push({ nome: `a${Math.round(d * 1000)}`, em: [-d, -sai(d)] });
  colunas.push({ nome: 'quina', em: [0, 0] });
  for (const d of [...ds].reverse()) colunas.push({ nome: `b${Math.round(d * 1000)}`, em: [d * c - sai(d) * s, d * s + sai(d) * c] });
  const vinco = semVinco ? [] : [{ nome: 'quina', coluna: 'quina', ...(raio != null ? { raio } : { nitidez }) }];
  return gaiolaPorEstacoes({ eixo: 'z', estacoes: estacoes.map((z, k) => ({ nome: `z${k}`, em: z, colunas })), vincos: vinco, ...extra });
}
/* a malha de `subdivisao` da gaiola, no nível dado, como { vertices, faces } em mm (a fixture é escrita em metro) */
function malha(g: any, niveis: number, escala = 1000) {
  const nomes: string[] = g.passo.vertices; const idx = new Map(nomes.map((n, i) => [n, i]));
  const V = nomes.map((n) => g.pontos[n].map((x: number) => x * escala));
  const F = g.passo.faces.map((f: string[]) => f.map((n) => idx.get(n)));
  const vincos = g.passo.vincos.filter((v: any) => v.nitidez !== 0).flatMap((v: any) => v.pontos.slice(0, -1).map((a: string, k: number) => [idx.get(a), idx.get(v.pontos[k + 1]), nitidezDoVinco(v.nitidez)]));
  return subdividirCatmullClark({ vertices: V, faces: F, vincos, niveis });
}
/* o corte da malha pelo plano z = z0: os pontos de cruzamento das arestas, em (x, y), da face de trás à da frente */
function corte(m: any, z0: number, angulo: number): P2[] {
  const pts: P2[] = [];
  for (const f of m.faces) for (let q = 0; q < f.length; q++) {
    const A = m.vertices[f[q]], B = m.vertices[f[(q + 1) % f.length]]; const da = A[2] - z0, db = B[2] - z0;
    if (da === 0 && db === 0) continue;
    if (!(da === 0 || db === 0 || (da < 0) !== (db < 0))) continue;
    const p: P2 = da === 0 ? [A[0], A[1]] : db === 0 ? [B[0], B[1]] : (() => { const u = da / (da - db); return [A[0] + u * (B[0] - A[0]), A[1] + u * (B[1] - A[1])] as P2; })();
    if (!pts.some((u) => Math.hypot(u[0] - p[0], u[1] - p[1]) < 1e-7)) pts.push(p);
  }
  const h = rad(angulo) / 2;
  return pts.sort((u, v) => (u[0] * Math.cos(h) + u[1] * Math.sin(h)) - (v[0] * Math.cos(h) + v[1] * Math.sin(h)));
}
const medir = (g: any, niveis: number, angulo: number, z0 = 0, opcoes = {}) => raioDoFilete(corte(malha(g, niveis), z0, angulo), opcoes).raio as number;

describe('a definição do raio: o filete', () => {
  /* uma reta, o arco exato de raio r e uma reta, com a dobra de `graus` */
  const filete = (graus: number, r: number): P2[] => {
    const t = rad(graus), T = r * Math.tan(t / 2); const pts: P2[] = [];
    for (let k = 0; k < 40; k++) pts.push([-T - 60 + (60 * k) / 40, 0]);
    const c: P2 = [-T, r];
    for (let k = 0; k <= 60; k++) { const a = -Math.PI / 2 + (t * k) / 60; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
    const u: P2 = [Math.cos(t), Math.sin(t)]; const f = pts[pts.length - 1];
    for (let k = 1; k <= 40; k++) pts.push([f[0] + (60 * k * u[0]) / 40, f[1] + (60 * k * u[1]) / 40]);
    return pts;
  };
  it('mede o raio de um arco exato com o erro do ajuste na casa do micrômetro, de 20 a 150 graus', () => {
    for (const graus of [20, 45, 90, 135, 150]) for (const r of [2, 7, 25]) {
      const m = raioDoFilete(filete(graus, r));
      expect(Math.abs(m.raio / r - 1)).toBeLessThan(0.01);
      expect(m.angulo).toBeCloseTo(graus, 1);
      expect(m.razaoDoErro).toBeLessThan(0.01);
    }
  });
  it('não mede raio onde não há dobra', () => {
    const reta: P2[] = Array.from({ length: 30 }, (_, k) => [k * 3, 0.0001 * k]);
    expect(raioDoFilete(reta).raio).toBeNull();
    expect(raioDoFilete([[0, 0], [1, 0]]).raio).toBeNull();
  });
  it('o menor raio de curvatura não é o filete: o perfil da subdivisão tem o núcleo mais apertado que o arco que o cobre', () => {
    /* quando o apoio é curto e a coluna seguinte longe, o perfil é um núcleo apertado com uma cauda; o filete ajustado ao perfil inteiro é maior que o círculo por três pontos junto da quina */
    const perfil = perfilDoApoio({ angulo: 90, apoio: 1, vizinho: 30, passos: 200 });
    const raios = perfil.slice(1, -1).map((p: P2, k: number) => {
      const a = perfil[k], c = perfil[k + 2]; const ab = Math.hypot(p[0] - a[0], p[1] - a[1]), bc = Math.hypot(c[0] - p[0], c[1] - p[1]), ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
      const area2 = Math.abs((p[0] - a[0]) * (c[1] - a[1]) - (p[1] - a[1]) * (c[0] - a[0]));
      return area2 > 1e-12 ? (ab * bc * ca) / (2 * area2) : Infinity;
    });
    const menor = Math.min(...raios);
    expect(raioDoFilete(perfil).raio).toBeGreaterThan(menor * 1.1);
  });
});

describe('a relação entre o raio e a distância do apoio', () => {
  it('a tabela gravada é a que a definição dá sobre o perfil limite, e interpola fora dos nós a menos de 1%', () => {
    const tabela = tabelaDeCalibragem();
    expect(tabela).toHaveLength(14);
    for (const [i, g] of [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150].entries()) {
      for (const [j, rho] of [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 10, 30, 100].entries()) {
        const medido = raioDoFilete(perfilDoApoio({ angulo: g, apoio: 3, vizinho: 3 * rho })).raio;
        expect(Math.abs(raioPeloApoio({ angulo: g, apoio: 3, vizinho: 3 * rho }) / medido - 1)).toBeLessThan(0.002);
        expect(tabela[i][j]).toBeGreaterThan(1);
      }
    }
    let pior = 0;
    for (const g of [22, 35, 55, 75, 95, 115, 135, 148]) for (const rho of [0.07, 0.3, 0.8, 3, 7, 20, 60]) {
      const medido = raioDoFilete(perfilDoApoio({ angulo: g, apoio: 2, vizinho: 2 * rho })).raio;
      pior = Math.max(pior, Math.abs(raioPeloApoio({ angulo: g, apoio: 2, vizinho: 2 * rho }) / medido - 1));
    }
    expect(pior).toBeLessThan(0.01);
  });
  it('o raio não depende da escala: o apoio de um raio pedido é proporcional a ele', () => {
    const a = apoioDoVinco({ angulo: 75, raio: 4, vizinho: 80 }), b = apoioDoVinco({ angulo: 75, raio: 8, vizinho: 160 });
    expect(b.apoio / a.apoio).toBeCloseTo(2, 3);
  });
  it('o apoio devolvido, posto na relação direta, dá o raio pedido de 20 a 150 graus; a nitidez é 0', () => {
    for (const angulo of [20, 33, 60, 90, 120, 150]) for (const raio of [1, 3, 6]) {
      const r = apoioDoVinco({ angulo, raio, vizinho: 100 });
      expect(r.cabe).toBe(true); expect(r.nitidez).toBe(0);
      expect(raioPeloApoio({ angulo, apoio: r.apoio, vizinho: 100 - r.apoio })).toBeCloseTo(raio, 6);
    }
    expect(apoioDoVinco({ angulo: 90, raio: 6, vizinho: 100 }).apoio).toBeCloseTo(9.65, 1);
  });
  it('avisa pelo nome: raio que não cabe, ângulo fora da calibragem, apoio de mais da metade, níveis a menos', () => {
    const grande = apoioDoVinco({ angulo: 90, raio: 80, vizinho: 100 });
    expect(grande.cabe).toBe(false); expect(grande.avisos[0].nome).toBe('raioNaoCabe'); expect(grande.apoio).toBeCloseTo(90, 6);
    expect(apoioDoVinco({ angulo: 10, raio: 3, vizinho: 100 }).avisos.map((a: any) => a.nome)).toContain('anguloForaDaCalibragem');
    expect(apoioDoVinco({ angulo: 150, raio: 6, vizinho: 100 }).avisos.map((a: any) => a.nome)).toContain('apoioMaiorQueMetadeDaFace');
    expect(apoioDoVinco({ angulo: 60, raio: 3, vizinho: 100, niveis: 1 }).avisos.map((a: any) => a.nome)).toContain('niveisAbaixoDoRecomendado');
    expect(apoioDoVinco({ angulo: 60, raio: 3, vizinho: 100, niveis: NIVEIS_RECOMENDADOS }).avisos).toEqual([]);
    expect(apoioDoVinco({ angulo: 20, raio: 3, vizinho: 100, niveis: 3 }).avisos.map((a: any) => a.nome)).not.toContain('raioNaoCabe');
    expect(() => apoioDoVinco({ angulo: 0, raio: 3, vizinho: 100 })).toThrow(/angulo/);
    expect(() => apoioDoVinco({ angulo: 90, raio: -1, vizinho: 100 })).toThrow(/raio/);
  });
  it('anguloDaDobra: 0 no plano, 90 no canto reto, em 2D e em 3D', () => {
    expect(anguloDaDobra([-1, 0, 0], [0, 0, 0], [1, 0, 0])).toBeCloseTo(0, 9);
    expect(anguloDaDobra([-1, 0], [0, 0], [0, 1])).toBeCloseTo(90, 9);
    expect(anguloDaDobra([-1, 0, 5], [0, 0, 5], [Math.cos(rad(60)), Math.sin(rad(60)), 5])).toBeCloseTo(60, 9);
  });
});

describe('(a) a dobra de duas faces planas: o raio na malha, de 2 a 4 níveis', () => {
  const resultados: { angulo: number; raio: number; n: number[]; medidos: number[]; esperado: number }[] = [];
  for (const angulo of [90, 60, 120, 150]) for (const raio of [3, 6, 12]) {
    it(`${angulo} graus, raio ${raio} mm`, () => {
      /* faces de 100 mm de cada lado da quina; a de 150 graus com 12 mm pede um apoio de 90 mm e usa faces de 200 mm */
      const L = angulo === 150 && raio === 12 ? 0.2 : 0.1;
      const g = cruzeta({ angulo, raio, L });
      const medidos = [2, 3, 4].map((n) => medir(g, n, angulo));
      for (const m of medidos) expect(Math.abs(m / raio - 1)).toBeLessThan(0.1);
      /* da superfície limite: o raio esperado que o ajudante devolve confere com o pedido */
      expect(g.raios[0].raioEsperado.minimo).toBeCloseTo(raio, 2); expect(g.raios[0].raioEsperado.maximo).toBeCloseTo(raio, 2);
      /* o ângulo que o ajudante leu na gaiola é o da dobra */
      expect(g.raios[0].pontos[3].angulo).toBeCloseTo(angulo, 6);
      const variacao = (a: number, b: number) => Math.abs(a - b) / ((a + b) / 2);
      expect(variacao(medidos[1], medidos[2])).toBeLessThan(0.02);   /* de 3 para 4 níveis */
      expect(variacao(medidos[0], medidos[2])).toBeLessThan(0.05);   /* de 2 para 4 */
      resultados.push({ angulo, raio, n: [2, 3, 4], medidos, esperado: raio });
    });
  }
  it('a malha e o raio esperado coincidem na superfície limite a 1%: a variação entre níveis é da malha, e não da relação', () => {
    const g = cruzeta({ angulo: 90, raio: 6 });
    const [a, segunda] = g.raios[0].pontos[3].distancias;
    const limite = raioDoFilete(perfilDoApoio({ angulo: 90, apoio: a, vizinho: segunda - a })).raio;
    expect(Math.abs(limite / 6 - 1)).toBeLessThan(0.01);
    expect(Math.abs(medir(g, 5, 90) / limite - 1)).toBeLessThan(0.01);
  });
  it('é determinística: duas chamadas dão a mesma gaiola', () => {
    expect(JSON.stringify(cruzeta({ angulo: 75, raio: 5 }))).toBe(JSON.stringify(cruzeta({ angulo: 75, raio: 5 })));
  });
});

describe('(b) a mesma dobra com as faces abauladas, flecha de 5 mm em 500', () => {
  for (const angulo of [90, 60, 120]) for (const raio of [3, 6, 12]) {
    it(`${angulo} graus, raio ${raio} mm`, () => {
      const g = cruzeta({ angulo, raio, flecha: 0.005 });
      for (const n of [3, 4]) {
        /* as faces são curvas: as retas saem dos pontos entre 3 r + 10 e 3 r + 60 mm da quina, fora do arredondamento e antes de a flecha mover a reta da quina */
        const de = 3 * raio + 10;
        const m = medir(g, n, angulo, 0, { retasPor: { de, ate: de + 50 } });
        expect(Math.abs(m / raio - 1)).toBeLessThan(raio === 3 ? 0.2 : 0.1);
      }
    });
  }
});

describe('(c) a quina que afina: o raio vai de 6 a 3 mm ao longo do vinco', () => {
  it('o raio por estação sai do raio do ponto: cortes em z = -0,6 a 0,6 seguem o que a linha pede, dentro de 10%', () => {
    const g = cruzeta({ angulo: 90, raio: { de: 6, ate: 3 } });
    const pontos = g.raios[0].pontos;
    expect(pontos[0].raioPedido).toBeCloseTo(6, 9); expect(pontos[6].raioPedido).toBeCloseTo(3, 9);
    expect(pontos[0].apoio).toBeGreaterThan(pontos[6].apoio);
    for (const [k, z] of [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].entries()) {
      const pedido = 6 - (3 * k) / 6;
      const m = medir(g, 4, 90, z * 1000 === 0 ? 0 : z * 1000);
      expect(Math.abs(m / pedido - 1)).toBeLessThan(k === 0 || k === 6 ? 0.2 : 0.1);
    }
    expect(g.raios[0].raioEsperado.minimo).toBeCloseTo(3, 2); expect(g.raios[0].raioEsperado.maximo).toBeCloseTo(6, 2);
  });
  it('o raio também se dá por ponto, uma lista com um raio por estação', () => {
    const g = cruzeta({ angulo: 90, raio: [6, 5, 4, 3, 4, 5, 6] });
    expect(g.raios[0].pontos.map((p: any) => Math.round(p.raio))).toEqual([6, 5, 4, 3, 4, 5, 6]);
    expect(() => cruzeta({ angulo: 90, raio: [6, 5] })).toThrow(/um raio positivo por ponto/);
  });
});

describe('(d) a chapa de 1 mm: o raio da pele de fora é o pedido', () => {
  it('a pele de fora, que é a superfície declarada, tem o raio pedido, e a de dentro tem o raio menos a espessura', () => {
    const angulo = 90, raio = 6;
    const g = cruzeta({ angulo, raio, extra: { niveis: 3 } });
    const pontosMm = Object.fromEntries(Object.entries(g.pontos).map(([n, p]: [string, any]) => [n, p.map((x: number) => x * 1000)]));
    const pele = (parte: string) => {
      const st = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 3, espessura: 1 }], ['solido', { sel: { origem: { op: 'subdivisao', id: 1, parte } } }]], {}, pontosMm);
      const faces = [...st.F.values()].filter((f: any) => f.solido);
      const m = { vertices: [] as number[][], faces: [] as number[][] }; const idx = new Map<number, number>();
      for (const f of faces) m.faces.push(f.vs.map((i: number) => { if (!idx.has(i)) { idx.set(i, m.vertices.length); m.vertices.push(st.V.get(i)); } return idx.get(i)!; }));
      return m;
    };
    const externa = raioDoFilete(corte(pele('externa'), 0, angulo)).raio as number;
    const interna = raioDoFilete(corte(pele('interna'), 0, angulo)).raio as number;
    expect(Math.abs(externa / raio - 1)).toBeLessThan(0.1);
    expect(Math.abs(interna / (raio - 1) - 1)).toBeLessThan(0.15);
  });
});

describe('os avisos do ajudante, pelo nome', () => {
  const nomes = (g: any) => (g.avisos ?? []).map((a: any) => a.nome);
  it('o raio que não cabe: o apoio fica em 90% da face, o raio esperado é o máximo e o aviso diz quanto cabe', () => {
    const g = cruzeta({ angulo: 90, raio: 80, L: 0.1 });
    expect(nomes(g)).toContain('raioNaoCabe');
    const a = g.avisos.find((x: any) => x.nome === 'raioNaoCabe');
    expect(a.raioMaximo).toBeGreaterThan(40); expect(a.raioMaximo).toBeLessThan(60);
    expect(g.raios[0].raioEsperado.maximo).toBeCloseTo(a.raioMaximo, 6);
    expect(g.raios[0].pontos[3].apoio).toBeCloseTo(90, 6);
  });
  it('dois vincos próximos que disputam a mesma aresta: os dois apoios encurtam na proporção e o aviso cita os dois vincos', () => {
    const t = (d: number) => [{ nome: 'x', em: [-d, 0] }, { nome: 'q1', em: [0, 0] }, { nome: 'q2', em: [0, 0.02] }, { nome: 'y', em: [d, 0.02] }];
    const estacoes = [-0.4, -0.2, 0, 0.2, 0.4].map((z, k) => ({ nome: `z${k}`, em: z, colunas: t(0.1) }));
    const g = gaiolaPorEstacoes({ eixo: 'z', estacoes, vincos: [{ nome: 'v1', coluna: 'q1', raio: 6 }, { nome: 'v2', coluna: 'q2', raio: 6 }] });
    expect(nomes(g)).toContain('vincosDisputamApoio');
    const a = g.avisos.find((x: any) => x.nome === 'vincosDisputamApoio');
    expect(a.vincos.sort()).toEqual(['v1', 'v2']);
    for (const r of g.raios) expect(r.raioEsperado.maximo).toBeLessThan(6);
    /* sem a disputa (a coluna do meio mais larga), os dois raios saem inteiros */
    const folgado = [{ nome: 'x', em: [-0.1, 0] }, { nome: 'q1', em: [0, 0] }, { nome: 'q2', em: [0, 0.08] }, { nome: 'y', em: [0.1, 0.08] }];
    const g2 = gaiolaPorEstacoes({ eixo: 'z', estacoes: [-0.4, -0.2, 0, 0.2, 0.4].map((z, k) => ({ nome: `z${k}`, em: z, colunas: folgado })), vincos: [{ nome: 'v1', coluna: 'q1', raio: 6 }, { nome: 'v2', coluna: 'q2', raio: 6 }] });
    expect(nomes(g2)).not.toContain('vincosDisputamApoio');
    for (const r of g2.raios) expect(r.raioEsperado.minimo).toBeCloseTo(6, 1);
  });
  it('a quina que é cota medida avisa (a superfície passaria pela quina viva); vinco na borda da chapa fica sem apoio; raio e nitidez juntos são recusados', () => {
    const g = cruzeta({ angulo: 90, raio: 6, extra: { medidas: [{ coluna: 'quina' }] } });
    expect(nomes(g)).toContain('quinaMedida');
    const borda = cruzeta({ angulo: 90, raio: 6, extra: {} });
    expect(nomes(borda)).not.toContain('quinaMedida');
    const naBorda = gaiolaPorEstacoes({ eixo: 'z', estacoes: [0, 0.2, 0.4].map((z, k) => ({ nome: `z${k}`, em: z, colunas: [{ nome: 'a', em: [-0.1, 0] }, { nome: 'q', em: [0, 0] }] })), vincos: [{ nome: 'v', coluna: 'q', raio: 3 }] });
    expect(nomes(naBorda)).toContain('vincoSemDuasFaces');
    expect(() => gaiolaPorEstacoes({ eixo: 'z', estacoes: [0, 0.2].map((z, k) => ({ nome: `z${k}`, em: z, colunas: [{ nome: 'a', em: [0, 0] }, { nome: 'b', em: [0.1, 0] }] })), vincos: [{ nome: 'v', coluna: 'a', raio: 3, nitidez: 0.5 }] })).toThrow(/raio e nitidez/);
  });
  it('o vinco que acaba no meio da chapa ganha o apoio e a face além da ponta o ponto dele, sem aresta pendurada', () => {
    const t = [{ nome: 'a', em: [-0.1, 0] }, { nome: 'q', em: [0, 0] }, { nome: 'b', em: [0.0707, 0.0707] }, { nome: 'c', em: [0.1414, 0.1414] }];
    const estacoes = [-0.4, -0.2, 0, 0.2, 0.4].map((z, k) => ({ nome: `z${k}`, em: z, colunas: t }));
    const g = gaiolaPorEstacoes({ eixo: 'z', estacoes, vincos: [{ nome: 'v', coluna: 'q', de: 'z1', ate: 'z3', raio: 4 }] });
    expect(nomes(g)).toEqual([]);
    const conta = new Map<string, number>();
    for (const f of g.passo.faces) f.forEach((a: string, k: number) => { const c = [a, f[(k + 1) % f.length]].sort().join('|'); conta.set(c, (conta.get(c) ?? 0) + 1); });
    /* toda aresta tem uma ou duas faces: nenhuma com três (a quebra de aresta sem o ponto na face vizinha daria T) */
    expect([...conta.values()].every((n) => n <= 2)).toBe(true);
    const m = subdividirCatmullClark({ vertices: g.passo.vertices.map((n: string) => g.pontos[n].map((x: number) => x * 1000)), faces: g.passo.faces.map((f: string[]) => f.map((n) => g.passo.vertices.indexOf(n))), vincos: [], niveis: 2 });
    expect(m.faces.length).toBeGreaterThan(0);
  });
});

describe('o raio pedido chega ao conteúdo salvo', () => {
  const pontosDe = (g: any) => g.pontos;
  it('o vinco do passo traz o raio em metro junto da nitidez 0, e o passo subdivisao o aceita sem mudar a geometria', () => {
    const g = cruzeta({ angulo: 90, raio: 6 });
    expect(g.passo.vincos[0]).toMatchObject({ nome: 'quina', nitidez: 0, raio: 0.006 });
    const com = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 2 }]], {}, pontosDe(g));
    const sem = nucleo([['subdivisao', { origemId: 1, ...g.passo, vincos: g.passo.vincos.map(({ raio, ...v }: any) => v), niveis: 2 }]], {}, pontosDe(g));
    expect(JSON.stringify([...com.V.entries()])).toBe(JSON.stringify([...sem.V.entries()]));
    expect(com.F.size).toBe(sem.F.size);
    const porEstacao = cruzeta({ angulo: 90, raio: { de: 6, ate: 3 } });
    expect(porEstacao.passo.vincos[0].raio).toEqual({ de: 0.006, ate: 0.003 });
    expect(nucleo([['subdivisao', { origemId: 1, ...porEstacao.passo, niveis: 1 }]], {}, pontosDe(porEstacao)).V.size).toBeGreaterThan(0);
  });
  it('o passo recusa raio que não é número positivo, forma por estação inválida ou lista de tamanho errado', () => {
    const g = cruzeta({ angulo: 90, raio: 6 });
    for (const raio of [-1, 0, { de: 1 }, [0.006, 0.005], { de: 1, ate: 2, extra: 3 }]) {
      const passo = { ...g.passo, vincos: [{ ...g.passo.vincos[0], raio }] };
      const neutro = nucleo([['subdivisao', { origemId: 1, ...passo, niveis: 1 }]], {}, pontosDe(g));
      expect(neutro.V.size, JSON.stringify(raio)).toBe(0);
      expect(neutro.orfaos[0].motivo, JSON.stringify(raio)).toMatch(/raio/);
    }
  });
  it('o conversor do esboço divide o raio do vinco por mil e deixa o resto do vinco', () => {
    const v = [{ nome: 'q', pontos: ['a', 'b'], nitidez: 0, raio: 6 }, { nome: 'r', pontos: ['a', 'b'], nitidez: 0, raio: { de: 6, ate: 3 } }, { nome: 's', pontos: ['a', 'b'], nitidez: 'viva' }];
    const m = argsEmMetro('subdivisao', { origemId: 1, niveis: 2, vincos: v }).vincos;
    expect(m[0]).toEqual({ nome: 'q', pontos: ['a', 'b'], nitidez: 0, raio: 0.006 });
    expect(m[1].raio).toEqual({ de: 0.006, ate: 0.003 });
    expect(m[2]).toEqual(v[2]);
  });
});

describe('gaiolaPorLacos: o vinco com raio', () => {
  /* barra de seção 100 por 100 ao longo de x, três laços; as outras três quinas da seção são vivas, e a de baixo com a da frente leva o raio */
  const trechos = [{ nome: 'baixo', pontos: 3 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 3 }, { nome: 'tras', pontos: 3 }];
  const laco = (em: number) => ({ em, trechos: { baixo: [[0, 0], [0, 100]], frente: [[0, 100], [100, 100]], cima: [[100, 100], [100, 0]], tras: [[100, 0], [0, 0]] } });
  const barra = (raio: unknown, extra: Record<string, unknown> = {}) => gaiolaPorLacos({
    nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' }, trechos, lacos: [0, 200, 400].map(laco),
    vincos: [{ nome: 'quina', entre: ['baixo', 'frente'], ...(raio != null ? { raio } : { nitidez: 0.5 }) },
      { nome: 'q2', entre: ['frente', 'cima'], nitidez: 'viva' }, { nome: 'q3', entre: ['cima', 'tras'], nitidez: 'viva' }, { nome: 'q4', entre: ['tras', 'baixo'], nitidez: 'viva' }], ...extra,
  });
  const perfilEmX = (g: any, niveis: number, x0: number): P2[] => {
    const nomes: string[] = g.passo.vertices; const idx = new Map(nomes.map((n, i) => [n, i]));
    const vincos = g.passo.vincos.filter((v: any) => v.nitidez !== 0).flatMap((v: any) => v.pontos.slice(0, -1).map((a: string, k: number) => [idx.get(a), idx.get(v.pontos[k + 1]), nitidezDoVinco(v.nitidez)]));
    const m = subdividirCatmullClark({ vertices: nomes.map((n) => g.pontosMm[n]), faces: g.passo.faces.map((f: string[]) => f.map((n) => idx.get(n))), vincos, niveis });
    /* a quina de baixo com a frente fica em (y 0, z 100): o corte é o da vizinhança dela, com z contado a partir dela */
    return m.vertices.filter((p: number[]) => Math.abs(p[0] - x0) < 1e-6 && p[1] >= -1e-6 && p[2] <= 100 + 1e-6 && p[1] <= 40 && p[2] >= 60)
      .map((p: number[]) => [p[1], 100 - p[2]] as P2).sort((a: P2, b: P2) => (a[0] - a[1]) - (b[0] - b[1]));
  };
  it('o raio vira apoio, sai no passo em metro com nitidez 0, a malha fecha e o raio medido na seção do meio é o pedido', () => {
    const g = barra(4);
    expect(g.raios[0].vinco).toBe('quina');
    expect(g.raios[0].raioEsperado.minimo).toBeCloseTo(4, 2);
    expect(g.passo.vincos.find((v: any) => v.nome === 'quina')).toMatchObject({ nitidez: 0, raio: 0.004 });
    expect(g.passo.vertices.length).toBeGreaterThan(3 * 8);
    const r = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 2 }]], {}, g.pontos);
    expect(r.V.size).toBeGreaterThan(0);
    for (const n of [3, 4]) {
      const medido = raioDoFilete(perfilEmX(g, n, 200)).raio as number;
      expect(Math.abs(medido / 4 - 1), `nível ${n}`).toBeLessThan(0.1);
    }
  });
  it('a aresta fica com duas faces, uma em cada sentido, como a gaiola de hoje', () => {
    const g = barra(4);
    const conta = new Map<string, number>();
    for (const f of g.passo.faces) f.forEach((a: string, k: number) => { const c = `${a}|${f[(k + 1) % f.length]}`; conta.set(c, (conta.get(c) ?? 0) + 1); });
    for (const [c, n] of conta) { const [a, b] = c.split('|'); expect(n).toBe(1); expect(conta.has(`${b}|${a}`), c).toBe(true); }
  });
  it('sem raio a saída é a de hoje: o vinco só leva nome, pontos e nitidez, sem `raios`, e raio com nitidez ou esvai é recusado', () => {
    const g = barra(null);
    expect(g.raios).toBeUndefined();
    expect(Object.keys(g.passo.vincos[0]).sort()).toEqual(['nitidez', 'nome', 'pontos']);
    expect(g.passo.vertices).toHaveLength(3 * 8);
    expect(() => gaiolaPorLacos({ nome: 'b', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' }, trechos, lacos: [0, 200].map(laco), vincos: [{ nome: 'q', entre: ['baixo', 'frente'], raio: 3, nitidez: 0.5 }] })).toThrow(/raio e nitidez/);
  });
  it('a espessura confere a gaiola com os apoios sem quebrar, e o raio por estação ({ de, ate }) segue o pedido', () => {
    const g = barra(4, { espessura: 1 });
    expect(g.espessura).toBeTruthy();
    const f = barra({ de: 6, ate: 3 });
    expect(f.raios[0].raioEsperado.minimo).toBeCloseTo(3, 2); expect(f.raios[0].raioEsperado.maximo).toBeCloseTo(6, 2);
  });
});

describe('sem raio, a saída do ajudante é a de antes', () => {
  it('o vinco só com nitidez dá o mesmo passo, sem apoio, sem `raios` e sem aviso de raio', () => {
    const g = cruzeta({ angulo: 90, nitidez: 0.58 });
    expect(g.raios).toBeUndefined();
    expect(g.passo.vincos).toEqual([{ nome: 'quina', pontos: ['z0_quina', 'z1_quina', 'z2_quina', 'z3_quina', 'z4_quina', 'z5_quina', 'z6_quina'], nitidez: 0.58 }]);
    expect(g.passo.vertices).toHaveLength(7 * 7);
    expect(g.passo.faces).toHaveLength(6 * 6);
    expect(Object.keys(g.passo.vincos[0]).sort()).toEqual(['nitidez', 'nome', 'pontos']);
  });
});

/* ---- (e) o caso real: as duas quinas do caminho A do sedã ---- */
/* As medidas de `procedural/pecas/sedan-chassi-e-lataria/alta-definicao/alvo.mjs`, copiadas: a lateral, o topo e a planta do trecho. A
   gaiola é a do caminho A sem as colunas de apoio, com o raio pedido no vinco da cintura (6 mm) e no do ombro (3 mm). */
describe('(e) o caso real: a cintura a 6 mm e o ombro a 3 mm, contra os 18 e 2,75 mm calibrados à mão', () => {
  const T = { ladoTopo: [[2122, 970], [1879, 1000], [-1421, 1000], [-2087, 972]], planta: [[2122, 770], [2060, 852], [2000, 872], [1700, 926], [1421, 934], [871, 933], [700, 885], [560, 860], [-560, 860], [-700, 885], [-800, 913], [-1237, 928], [-1650, 911], [-1925, 888], [-2087, 880]],
    meiaDaCabine: 860, xCapo: 760, yOmbro: 890, yAlargado: 700, bojo: 6, flechaDoCapo: 8, zPeDoCapo: 693 };
  const suave = (tabela: number[][]) => {
    const t = [...tabela].sort((a, b) => a[0] - b[0]); const n = t.length; const h: number[] = []; const d: number[] = [];
    for (let i = 0; i + 1 < n; i++) { h.push(t[i + 1][0] - t[i][0]); d.push((t[i + 1][1] - t[i][1]) / h[i]); }
    const m = t.map((_, i) => {
      if (i === 0) return d[0]; if (i === n - 1) return d[n - 2]; if (d[i - 1] * d[i] <= 0) return 0;
      const w1 = 2 * h[i] + h[i - 1]; const w2 = h[i] + 2 * h[i - 1]; return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    });
    return (z: number) => {
      if (z <= t[0][0]) return t[0][1]; if (z >= t[n - 1][0]) return t[n - 1][1];
      let i = 0; while (z > t[i + 1][0]) i++;
      const u = (z - t[i][0]) / h[i]; const u2 = u * u; const u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * t[i][1] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * t[i + 1][1] + (u3 - u2) * h[i] * m[i + 1];
    };
  };
  const yTopo = suave(T.ladoTopo), meia = suave(T.planta);
  const ladoX = (z: number, y: number) => {
    const t = Math.min(1, Math.max(0, (T.yOmbro - y) / (T.yOmbro - T.yAlargado)));
    return T.meiaDaCabine + (meia(z) - T.meiaDaCabine) * (1 - (1 - t) ** 2) + T.bojo * Math.max(0, 1 - ((y - 710) / 290) ** 2);
  };
  const topoY = (x: number, z: number) => yTopo(z) + T.flechaDoCapo * (1 - (x / ladoX(z, yTopo(z))) ** 2);
  const noLado = (z: number, y: number): [number, number, number] => [ladoX(z, y), y, z];
  const naCintura = (z: number) => noLado(z, yTopo(z));
  const noTopo = (x: number, z: number): [number, number, number] => [x, topoY(x, z), z];
  const ESTACOES = [T.zPeDoCapo, 871, 1146, 1421, 1700, 1990];
  const base: [string, (z: number) => [number, number, number]][] = [
    ['fundo', (z) => noLado(z, 419 + 0 * z)], ['alargado', (z) => noLado(z, T.yAlargado)], ['meioDoOmbro', (z) => noLado(z, 795)], ['ombro', (z) => noLado(z, T.yOmbro)], ['cintura', naCintura],
    ['vaoDoCapo', (z) => noTopo(T.xCapo, z)], ['meioDoCapo', (z) => noTopo(T.xCapo / 2, z)], ['centro', (z) => noTopo(0, z)]];
  /* a gaiola da lateral e do topo em metro: eixo z, a coluna é [x, y] */
  const montar = (vincos: any[], extras: [string, (z: number) => [number, number, number]][] = [], ordem?: string[]) => {
    const todas = new Map<string, (z: number) => [number, number, number]>([...base, ...extras]);
    const nomesDaOrdem = ordem ?? ['fundo', 'alargado', 'meioDoOmbro', 'ombro', 'cintura', 'vaoDoCapo', 'meioDoCapo', 'centro'];
    const estacoes = ESTACOES.map((z, k) => ({ nome: `e${k}`, em: z / 1000, colunas: nomesDaOrdem.map((n) => { const p = todas.get(n)!(z); return { nome: n, em: [p[0] / 1000, p[1] / 1000] }; }) }));
    return gaiolaPorEstacoes({ eixo: 'z', estacoes, vincos, niveis: 3 });
  };
  /* o corte da malha pelo plano z, em cadeia da primeira à última coluna (as arestas que cruzam o plano, ligadas pelas pontas) */
  const cadeiaDoCorte = (m: any, z0: number): P2[] => {
    const chave = (p: P2) => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)}`;
    const vizinhos = new Map<string, { p: P2; v: string[] }>();
    const liga = (a: P2, b: P2) => { for (const [x, y] of [[a, b], [b, a]] as [P2, P2][]) { const k = chave(x); const e = vizinhos.get(k) ?? { p: x, v: [] }; e.v.push(chave(y)); vizinhos.set(k, e); } };
    for (const f of m.faces) {
      const c: P2[] = [];
      for (let q = 0; q < f.length; q++) {
        const A = m.vertices[f[q]], B = m.vertices[f[(q + 1) % f.length]]; const da = A[2] - z0, db = B[2] - z0;
        if ((da < 0) !== (db < 0)) { const u = da / (da - db); c.push([A[0] + u * (B[0] - A[0]), A[1] + u * (B[1] - A[1])]); }
      }
      if (c.length === 2) liga(c[0], c[1]);
    }
    const inicio = [...vizinhos.entries()].find(([, e]) => e.v.length === 1)![0];
    const cadeia: P2[] = []; let atual = inicio; let antes = '';
    for (;;) {
      const e = vizinhos.get(atual)!; cadeia.push(e.p);
      const proximo = e.v.find((k) => k !== antes); if (proximo === undefined || cadeia.length > vizinhos.size) break;
      antes = atual; atual = proximo;
    }
    return cadeia;
  };
  /* o raio de uma quina pelo filete: os pontos da cadeia a até `meia` mm de arco do ponto mais perto da quina viva */
  const raioDaQuina = (g: any, z: number, viva: P2, meia: number) => {
    const cadeia = cadeiaDoCorte(malha(g, 3), z);
    let iq = 0; for (let i = 1; i < cadeia.length; i++) if (Math.hypot(cadeia[i][0] - viva[0], cadeia[i][1] - viva[1]) < Math.hypot(cadeia[iq][0] - viva[0], cadeia[iq][1] - viva[1])) iq = i;
    const arco = [0]; for (let i = 1; i < cadeia.length; i++) arco.push(arco[i - 1] + Math.hypot(cadeia[i][0] - cadeia[i - 1][0], cadeia[i][1] - cadeia[i - 1][1]));
    const trecho = cadeia.filter((_, i) => Math.abs(arco[i] - arco[iq]) <= meia);
    /* as faces abaixo do ombro são curvas (o alargamento do para-lama): as retas saem dos pontos entre 15 e 55 mm da quina */
    return raioDoFilete(trecho, { fracaoDasPontas: 0.3, retasPor: { de: 15, ate: 55 } });
  };
  /* a calibragem à mão do caminho A: uma coluna de apoio de cada lado da quina, a 18 mm da cintura e a 2,75 mm do ombro, vinco de nitidez 0,15 */
  const aMao = () => {
    const extras: [string, (z: number) => [number, number, number]][] = [
      ['cinturaAbaixo', (z) => noLado(z, yTopo(z) - 18)], ['cinturaAcima', (z) => noTopo(naCintura(z)[0] - 18, z)],
      ['ombroAbaixo', (z) => noLado(z, T.yOmbro - 2.75)], ['ombroAcima', (z) => noLado(z, T.yOmbro + 2.75)]];
    const ordem = ['fundo', 'alargado', 'meioDoOmbro', 'ombroAbaixo', 'ombro', 'ombroAcima', 'cinturaAbaixo', 'cintura', 'cinturaAcima', 'vaoDoCapo', 'meioDoCapo', 'centro'];
    return montar([{ nome: 'cintura', coluna: 'cintura', nitidez: 0.15 }, { nome: 'ombro', coluna: 'ombro', nitidez: 0.15 }], extras, ordem);
  };

  it('o ajudante lê a dobra de cada estação e devolve o apoio de cada quina, e a malha tem o raio pedido pela definição do filete; a calibragem à mão, medida igual, fica com o raio dela', () => {
    const g = montar([{ nome: 'cintura', coluna: 'cintura', raio: 6 }, { nome: 'ombro', coluna: 'ombro', raio: 3 }]);
    const porVinco = Object.fromEntries(g.raios.map((r: any) => [r.vinco, r]));
    expect((g.avisos ?? []).map((a: any) => a.nome)).not.toContain('raioNaoCabe');
    /* o apoio sai do ângulo da dobra de cada estação: no ombro, de 6 a 29 graus entre as estações, e o apoio vai junto */
    const apOmbro = porVinco.ombro.pontos.map((p: any) => p.apoio);
    expect(Math.max(...apOmbro) / Math.min(...apOmbro)).toBeGreaterThan(3);
    const apCintura = porVinco.cintura.pontos.map((p: any) => p.apoio);
    expect(Math.min(...apCintura)).toBeGreaterThan(8); expect(Math.max(...apCintura)).toBeLessThan(10);
    const mao = aMao();
    const medidas: any[] = [];
    for (const z of [871.5, 1146.5, 1421.5, 1700.5]) {
      const cintura = naCintura(z), ombro = noLado(z, T.yOmbro);
      medidas.push({ z,
        cintura: raioDaQuina(g, z, [cintura[0], cintura[1]], 70), ombro: raioDaQuina(g, z, [ombro[0], ombro[1]], 70),
        cinturaAMao: raioDaQuina(mao, z, [cintura[0], cintura[1]], 70), ombroAMao: raioDaQuina(mao, z, [ombro[0], ombro[1]], 70) });
    }
    /* a cintura, de 87 graus: 6 mm em todos os cortes, dentro de 5%; a calibragem à mão, com os 18 mm, é de 10,4 mm pela mesma definição */
    for (const m of medidas) {
      expect(Math.abs(m.cintura.raio / 6 - 1)).toBeLessThan(0.05);
      expect(m.cinturaAMao.raio).toBeGreaterThan(9.5); expect(m.cinturaAMao.raio).toBeLessThan(11.5);
    }
    /* o ombro, de 25 a 29 graus: onde o ajuste das retas é bom (o erro do ajuste menor que 10% do raio) o raio medido é o pedido, a 5%; nos cortes
       em que a quina de 1 mm de arco é mais fina que o erro das faces curvas, a própria medida acusa (erro do ajuste acima de 30% do raio) */
    const bons = medidas.filter((m) => m.ombro.razaoDoErro < 0.1);
    expect(bons.length).toBeGreaterThanOrEqual(2);
    for (const m of bons) expect(Math.abs(m.ombro.raio / 3 - 1)).toBeLessThan(0.05);
    for (const m of medidas.filter((x) => !bons.includes(x))) expect(m.ombro.razaoDoErro).toBeGreaterThan(0.3);
    /* a calibragem à mão dá, pela definição do filete, de 2,4 a 2,7 mm no ombro: perto dos 3 mm que o ciclo mirou, pelo menor raio de curvatura */
    for (const m of medidas) { expect(m.ombroAMao.raio).toBeGreaterThan(2.2); expect(m.ombroAMao.raio).toBeLessThan(3.1); }
    /* o apoio calculado: 9 mm na cintura (contra 18 à mão) e cerca de 1 mm no ombro (contra 2,75), em colunas graduadas */
    expect(Math.min(...apCintura)).toBeGreaterThan(8.9);
    expect(Math.max(...apOmbro)).toBeLessThan(1.5);
    expect(porVinco.cintura.colunas).toBeGreaterThanOrEqual(2); expect(porVinco.ombro.colunas).toBeGreaterThanOrEqual(3);
  });
});
