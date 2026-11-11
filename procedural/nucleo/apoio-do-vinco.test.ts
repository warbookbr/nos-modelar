/* apoio-do-vinco.test.ts — o raio em milímetro de uma aresta de caráter, convertido em colunas de apoio (apoio-do-vinco.js) e ligado
   ao vinco de `gaiolaPorEstacoes` (campo `raio`). A definição de raio (o filete) é conferida num perfil de arco exato; a relação, contra a
   definição aplicada à superfície limite e à malha que `subdivisao` entrega; e as provas da fatia 4c do plano do núcleo para qualquer
   mecanismo: (a) a dobra de duas faces planas a 90, 60, 120 e 150 graus com raio de 3, 6 e 12 mm em 2, 3 e 4 níveis, (b) a mesma dobra
   com as faces abauladas, (c) a quina que afina, (d) a chapa de 1 mm, (e) as duas quinas do caminho A do sedã contra a calibragem à mão,
   e os avisos pelo nome. O corte é perpendicular ao vinco, sobre a malha subdividida. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { NIVEIS_RECOMENDADOS, anguloDaDobra, apoioDoVinco, inserirApoiosNosVincos, perfilDoApoio, raioDoFilete, raioPeloApoio, tabelaDeCalibragem } from './apoio-do-vinco.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorLacos } from './gaiola-por-lacos.js';
// @ts-expect-error — núcleo em JavaScript.
import { nitidezDoVinco, subdividirCatmullClark } from './subdivisao.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';
// @ts-expect-error — núcleo em JavaScript.
import { analisarTopologia } from './topologia.js';
// @ts-expect-error — ferramenta em JavaScript.
import { ondulacaoDaReceita } from '../../tools/modelar/ondulacao-da-superficie.mjs';
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
       em que a quina de 1 mm de arco é mais fina que o erro das faces curvas, a própria medida acusa (erro do ajuste acima de 10% do raio) */
    const bons = medidas.filter((m) => m.ombro.razaoDoErro < 0.1);
    expect(bons.length).toBeGreaterThanOrEqual(2);
    for (const m of bons) expect(Math.abs(m.ombro.raio / 3 - 1)).toBeLessThan(0.05);
    for (const m of medidas.filter((x) => !bons.includes(x))) expect(m.ombro.razaoDoErro).toBeGreaterThan(0.1);
    /* a calibragem à mão dá, pela definição do filete, de 2,4 a 2,7 mm no ombro: perto dos 3 mm que o ciclo mirou, pelo menor raio de curvatura */
    for (const m of medidas) { expect(m.ombroAMao.raio).toBeGreaterThan(2.2); expect(m.ombroAMao.raio).toBeLessThan(3.1); }
    /* o apoio calculado: 9 mm na cintura (contra 18 à mão) e cerca de 1 mm no ombro (contra 2,75), em colunas graduadas */
    expect(Math.min(...apCintura)).toBeGreaterThan(8.9);
    expect(Math.max(...apOmbro)).toBeLessThan(1.5);
    expect(porVinco.cintura.colunas).toBeGreaterThanOrEqual(2); expect(porVinco.ombro.colunas).toBeGreaterThanOrEqual(3);
  });
});

/* O raio que o passo guarda é o realizado: o `raioNaoCabe` grava o que a malha tem, o vinco sem apoio não grava nenhum, o passo recusa raio com nitidez, e o perfil com NaN diz que há valor inválido. */
describe('o raio gravado no vinco do passo', () => {
  const colunas = [{ nome: 'a', em: [-0.04, 0.04] }, { nome: 'q', em: [0.04, 0.04] }, { nome: 'b', em: [0.04, -0.04] }];
  const gaiola = (vinco: any) => gaiolaPorEstacoes({ eixo: 'z', virar: true, niveis: 3, estacoes: [0, 1, 2, 3, 4].map((i) => ({ nome: `e${i}`, em: i * 0.02, colunas })), vincos: [vinco] });

  it('o raio que cabe sai como foi pedido, e o `raios` da saída traz o gravado ao lado do pedido e do esperado', () => {
    const g = gaiola({ nome: 'quina', coluna: 'q', raio: 6 });
    expect(g.passo.vincos[0].raio).toBeCloseTo(0.006, 12);
    expect(g.raios[0].gravado).toBe(6);
    expect(g.raios[0].raioPedido).toEqual({ minimo: 6, maximo: 6 });
    expect(g.raios[0].raioEsperado.minimo).toBeGreaterThan(5);
  });

  it('raio de 60 num braço de 40: o aviso diz o que cabe e o passo guarda o mesmo valor, e não o pedido', () => {
    const g = gaiola({ nome: 'quina', coluna: 'q', raio: 60 });
    const aviso = g.avisos.find((a: any) => a.ref === 'raioNaoCabe');
    expect(aviso.raioMaximo).toBeCloseTo(42.97, 2);
    expect(g.passo.vincos[0].raio * 1000).toBeCloseTo(aviso.raioMaximo, 2);
    expect(g.raios[0].gravado).toBeCloseTo(aviso.raioMaximo, 2);
  });

  it('o vinco sem duas faces fica sem apoio e sem raio no passo', () => {
    const g = gaiola({ nome: 'quina', coluna: 'a', raio: 6 });
    expect(g.avisos.map((a: any) => a.ref)).toContain('vincoSemDuasFaces');
    expect(g.passo.vincos[0]).toEqual({ nome: 'quina', pontos: ['e0_a', 'e1_a', 'e2_a', 'e3_a', 'e4_a'], nitidez: 0 });
  });

  it('o passo subdivisao recusa raio junto de nitidez diferente de 0, e raio com a nitidez 0 passa', () => {
    const g = gaiola({ nome: 'quina', coluna: 'q', raio: 6 });
    const roda = (vinco: any) => nucleo([['subdivisao', { origemId: 1, ...g.passo, vincos: [{ ...g.passo.vincos[0], ...vinco }], niveis: 3 }]], {}, g.pontos);
    expect(roda({}).orfaos).toEqual([]);
    expect(roda({ nitidez: 1 }).orfaos[0].motivo).toMatch(/declara raio e nitidez 1/);
    expect(roda({ nitidez: 'viva' }).orfaos[0].motivo).toMatch(/declara raio e nitidez 'viva'/);
  });

  it('raioDoFilete com NaN no perfil diz que há valor inválido, e não "perfil curto demais"', () => {
    expect(raioDoFilete([[0, 0], [1, NaN], [2, 0], [3, 1], [4, 2]]).motivo).toMatch(/valor inválido/);
    expect(raioDoFilete([[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]).motivo).toMatch(/curto demais|sem dobra/);
  });
});

/* ---- (f) a quina oblíqua ---- */
/* Duas faces planas que se dobram a 90 graus numa quina ao longo de z, com as estações inclinadas `theta` graus em relação ao plano perpendicular à quina
   (a coluna A de uma cabine corta as estações de z constante na diagonal): o ponto de cada coluna anda ao longo de z na proporção da posição em x. A face
   de trás corta a quina a 90 - theta graus, e a da frente, também. */
function cruzetaObliqua({ theta, raio }: { theta: number; raio: number }) {
  const tg = Math.tan(rad(theta)); const ds = [0.5, 0.3, 0.1];
  const colunas: { nome: string; em: [number, number, number] }[] = [
    ...ds.map((d) => ({ nome: `a${Math.round(d * 1000)}`, em: [-d, 0, -d * tg] as [number, number, number] })),
    { nome: 'quina', em: [0, 0, 0] },
    ...[...ds].reverse().map((d) => ({ nome: `b${Math.round(d * 1000)}`, em: [0, d, d * tg] as [number, number, number] }))];
  const estacoes = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].map((z, k) => ({ nome: `z${k}`, em: z, colunas }));
  return gaiolaPorEstacoes({ eixo: 'z', estacoes, vincos: [{ nome: 'quina', coluna: 'quina', raio }], niveis: 3 });
}

describe('(f) a quina oblíqua: a distância do apoio é medida perpendicular ao vinco, e o raio sai o pedido', () => {
  for (const theta of [0, 20, 40, 60]) for (const raio of [4, 8]) {
    it(`a quina corta as estações a ${theta} graus, com raio ${raio} mm: o corte perpendicular mede o pedido a 10%, e o passo guarda o pedido`, () => {
      const g = cruzetaObliqua({ theta, raio });
      /* o corte z = const é perpendicular à quina (que corre ao longo de z), e não ao plano da estação */
      for (const z0 of [-0.3, 0.05, 0.3]) {
        const m = medir(g, 4, 90, z0 * 1000 + 0.01);
        expect(Math.abs(m / raio - 1), `z = ${z0}`).toBeLessThan(0.1);
      }
      /* o que o ajudante leu: a dobra do corte perpendicular (90, e não a do ângulo entre as arestas inclinadas) e o seno da aresta com a quina */
      const ponto = g.raios[0].pontos[3];
      expect(ponto.angulo).toBeCloseTo(90, 6);
      expect(ponto.seno[0]).toBeCloseTo(Math.cos(rad(theta)), 6);
      expect(g.raios[0].raioEsperado.minimo).toBeCloseTo(raio, 1);
      expect(g.passo.vincos[0].raio).toBeCloseTo(raio / 1000, 12);
      expect((g.avisos ?? []).map((a: any) => a.ref)).not.toContain('raioNaoCabe');
    });
  }
  it('a 60 graus o apoio vai a 1/cos(60) = 2 vezes mais longe ao longo da aresta, e o apoio perpendicular é o mesmo da quina reta', () => {
    const reta = cruzetaObliqua({ theta: 0, raio: 4 }); const obliqua = cruzetaObliqua({ theta: 60, raio: 4 });
    expect(obliqua.raios[0].pontos[3].apoio).toBeCloseTo(reta.raios[0].pontos[3].apoio, 9);
    const aoLongo = (g: any) => { const o = g.origens[Object.keys(g.origens).find((n) => /^quina_apoio1_z3_quina_z3_a100$/.test(n))!]; return o.distanciaNaAresta; };
    expect(aoLongo(obliqua) / aoLongo(reta)).toBeCloseTo(2, 6);
  });
});

/* ---- (g) as quinas que se encontram ---- */
/* Uma caixa de meia aresta `lado` mm com cada face em n por n quadrados e as doze quinas como vincos de raio `raio`; os oito cantos são o encontro de três. */
function caixa({ raio, lado = 200, n = 2, quais, raioDe }: { raio: number; lado?: number; n?: number; quais?: number[]; raioDe?: (i: number) => number }) {
  const pontos: Record<string, number[]> = {}; const nome = (c: number[]) => `p${c.join('_')}`; const passo = lado / n;
  const faces: string[][] = [];
  for (const ax of [0, 1, 2]) for (const sg of [-1, 1]) {
    const u = (ax + 1) % 3, v = (ax + 2) % 3;
    const P = (i: number, j: number) => { const c = [0, 0, 0]; c[ax] = sg * n; c[u] = i; c[v] = j; return c; };
    for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
      const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]; if (sg < 0) q.reverse();
      for (const c of q) pontos[nome(c)] = c.map((x) => (x * passo) / 1000);
      faces.push(q.map(nome));
    }
  }
  const vincos: { nome: string; pontos: string[]; raio: number }[] = [];
  for (const ax of [0, 1, 2]) for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    const u = (ax + 1) % 3, v = (ax + 2) % 3; const linha: string[] = [];
    for (let t = -n; t <= n; t++) { const c = [0, 0, 0]; c[ax] = t; c[u] = s1 * n; c[v] = s2 * n; linha.push(nome(c)); }
    vincos.push({ nome: `v${ax}_${s1}_${s2}`, pontos: linha, raio: raioDe ? raioDe(vincos.length) : raio });
  }
  const r = inserirApoiosNosVincos({ pontos, faces, vincos: quais ? quais.map((i) => vincos[i]) : vincos, unidade: 1000, niveis: 3 });
  return { ...r, todos: { ...pontos, ...r.pontos } as Record<string, number[]> };
}
function malhaDaCaixa(c: any, niveis: number) {
  const nomes = Object.keys(c.todos); const idx = new Map(nomes.map((n, i) => [n, i]));
  return subdividirCatmullClark({ vertices: nomes.map((n) => c.todos[n].map((x: number) => x * 1000)), faces: c.faces.map((f: string[]) => f.map((n) => idx.get(n))), vincos: [], niveis });
}
/* o raio da quina ao longo do eixo `ax` na quina +,+ (as faces u = lado e v = lado), no corte perpendicular em `c0` (mm) */
function raioDaQuinaDaCaixa(m: any, ax: number, c0: number, lado = 200) {
  const u = (ax + 1) % 3, v = (ax + 2) % 3; const pts: P2[] = [];
  for (const f of m.faces) for (let q = 0; q < f.length; q++) {
    const A = m.vertices[f[q]], B = m.vertices[f[(q + 1) % f.length]]; const da = A[ax] - c0, db = B[ax] - c0;
    if ((da < 0) === (db < 0)) continue;
    const t = da / (da - db); const p: P2 = [A[u] + t * (B[u] - A[u]), A[v] + t * (B[v] - A[v])];
    if (p[0] > lado - 40 && p[1] > lado - 40 && !pts.some((w) => Math.hypot(w[0] - p[0], w[1] - p[1]) < 1e-7)) pts.push(p);
  }
  pts.sort((a, b) => (a[0] - a[1]) - (b[0] - b[1]));
  return raioDoFilete(pts).raio as number;
}

describe('(g) as quinas com raio que se encontram: o canto de uma caixa, onde três quinas arredondadas se encontram', () => {
  for (const raio of [6, 12]) {
    it(`raio ${raio} mm nas doze quinas: o raio medido ao longo das três até 10 mm do canto é o pedido a 10%, e o canto é o de um cubo arredondado`, () => {
      const c = caixa({ raio });
      expect(c.avisos.map((a: any) => a.nome)).toEqual([]);
      const m = malhaDaCaixa(c, 4);
      const medidos: number[] = [];
      for (const ax of [0, 1, 2]) for (const d of [200, 100, 50, 30, 20, 10]) {
        /* d mm do canto (200, 200, 200): o corte em 200 - d ao longo do eixo */
        const r = raioDaQuinaDaCaixa(m, ax, 200 - d + 0.01);
        medidos.push(r);
        expect(Math.abs(r / raio - 1), `eixo ${ax}, a ${d} mm do canto`).toBeLessThan(0.1);
      }
      expect(Math.max(...medidos) - Math.min(...medidos)).toBeLessThan(0.06 * raio);
      /* o canto de um cubo arredondado: o ponto da malha mais perto do canto vivo fica a raio × (raiz de 3 − 1) dele, ao 10% */
      const perto = Math.min(...m.vertices.map((p: number[]) => Math.hypot(200 - p[0], 200 - p[1], 200 - p[2])));
      expect(Math.abs(perto / (raio * (Math.sqrt(3) - 1)) - 1)).toBeLessThan(0.1);
    });
  }
  it('a gaiola dos apoios fecha: toda aresta tem duas faces em sentidos opostos, as faces são de quatro lados e cada um dos oito cantos tem a grade em três faces', () => {
    const c = caixa({ raio: 6 });
    const dirigidas = new Map<string, number>();
    for (const f of c.faces) f.forEach((a: string, k: number) => { const k2 = `${a}>${f[(k + 1) % f.length]}`; dirigidas.set(k2, (dirigidas.get(k2) ?? 0) + 1); });
    for (const [k, n] of dirigidas) { const [a, b] = k.split('>'); expect(n, k).toBe(1); expect(dirigidas.has(`${b}>${a}`), k).toBe(true); }
    expect(new Set(c.faces.map((f: string[]) => f.length))).toEqual(new Set([4]));
    /* a linha de cada vinco segue só arestas da gaiola nova */
    for (const v of Object.values(c.linhas) as string[][]) for (let k = 0; k + 1 < v.length; k++) expect(dirigidas.has(`${v[k]}>${v[k + 1]}`) || dirigidas.has(`${v[k + 1]}>${v[k]}`)).toBe(true);
    const doCanto = Object.values(c.origens).filter((o: any) => o.tipo === 'canto') as any[];
    expect(new Set(doCanto.map((o) => o.ponto)).size).toBe(8);
    for (const ponto of new Set(doCanto.map((o) => o.ponto))) expect(new Set(doCanto.filter((o) => o.ponto === ponto).map((o) => o.face)).size).toBe(3);
  });
  it('sem falha de ondulação no canto e sem face fina: a normal não dá salto no canto maior que o da quina reta, e nenhuma face da malha é lasca', () => {
    const c = caixa({ raio: 6 });
    const m = malhaDaCaixa(c, 3);
    const normal = (f: number[]) => { const n = [0, 0, 0]; for (let k = 0; k < f.length; k++) { const a = m.vertices[f[k]], b = m.vertices[f[(k + 1) % f.length]]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } const l = Math.hypot(n[0], n[1], n[2]); return n.map((x) => x / l); };
    const normais = m.faces.map(normal); const porAresta = new Map<string, number[]>();
    m.faces.forEach((f: number[], i: number) => f.forEach((a, k) => { const b = f[(k + 1) % f.length]; const key = a < b ? `${a},${b}` : `${b},${a}`; (porAresta.get(key) ?? porAresta.set(key, []).get(key)!).push(i); }));
    const centro = (f: number[]) => f.reduce((s, v) => [s[0] + m.vertices[v][0] / f.length, s[1] + m.vertices[v][1] / f.length, s[2] + m.vertices[v][2] / f.length], [0, 0, 0]);
    let noCanto = 0, naQuina = 0;
    for (const [, fs] of porAresta) {
      if (fs.length !== 2) continue;
      const c0 = centro(m.faces[fs[0]]); const jump = (Math.acos(Math.max(-1, Math.min(1, normais[fs[0]].reduce((s: number, x: number, k: number) => s + x * normais[fs[1]][k], 0)))) * 180) / Math.PI;
      const longe = [0, 1, 2].filter((k) => Math.abs(c0[k]) > 200 - 30).length;
      if (longe === 3) noCanto = Math.max(noCanto, jump); else if (longe === 2 && Math.abs(c0[0]) < 100 + 1 && Math.abs(c0[1] + c0[2]) < 1e9) naQuina = Math.max(naQuina, jump);
    }
    expect(noCanto).toBeGreaterThan(0);
    expect(noCanto).toBeLessThanOrEqual(naQuina * 1.3);
    /* sem face fina: a malha entregue pelo passo, com a espessura da chapa, não tem lasca */
    const nomes = Object.keys(c.todos);
    const neutro = nucleo([['subdivisao', { origemId: 1, vertices: nomes, faces: c.faces, vincos: [], niveis: 2 }]], {}, c.todos);
    expect(neutro.orfaos).toEqual([]);
    expect(analisarTopologia({ vertices: neutro.V, faces: neutro.F }).achados.filter((a: any) => a.codigo === 'face-fina')).toEqual([]);
  });
  it('três quinas de raios diferentes (6, 8 e 10 mm) no mesmo canto também fecham, e cada uma mede o seu a 10% a 50 mm do canto ou mais (a 30 mm, a 20%: a transição entre raios diferentes leva uns três raios)', () => {
    const raios = [6, 8, 10];
    const c = caixa({ raio: 6, quais: [3, 7, 11], raioDe: (i) => raios[Math.floor(i / 4)] });
    expect(c.avisos.map((a: any) => a.nome)).toEqual([]);
    const m = malhaDaCaixa(c, 4);
    for (const ax of [0, 1, 2]) for (const d of [100, 50, 30]) expect(Math.abs(raioDaQuinaDaCaixa(m, ax, 200 - d + 0.01) / raios[ax] - 1), `eixo ${ax}, a ${d} mm`).toBeLessThan(d >= 50 ? 0.1 : 0.2);
  });
});

/* ---- (h) a quina do teto que termina na quina da cabine ---- */
describe('(h) a quina ao longo de uma estação que termina na quina ao longo de uma coluna: o canto do teto', () => {
  /* a seção em x, y com o teto a y(z) (plano até z = 0,3 e a 25 graus depois) e a lateral que desce da quina: a quina corre ao longo de z (e dobra em z = 0,3),
     e a quina da estação z = 0,3, do alto da coluna `a500` até a quina, é a de um teto que vira para-brisa */
  const k = Math.tan(rad(25)); const zs = [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  const yDe = (z: number) => -k * Math.max(0, z - 0.3);
  const montar = (rQuina: number, rTopo: number) => gaiolaPorEstacoes({ eixo: 'z', niveis: 3,
    estacoes: zs.map((z, i) => { const y = yDe(z); return { nome: `e${i}`, em: z, colunas: [
      ...[0.5, 0.3, 0.1].map((d) => ({ nome: `a${d * 1000}`, em: [-d, y] })), { nome: 'quina', em: [0, y] }, ...[0.1, 0.3, 0.5].map((d) => ({ nome: `b${d * 1000}`, em: [0, y - d] }))] }; }),
    vincos: [{ nome: 'quina', coluna: 'quina', raio: rQuina }, { nome: 'topo', estacao: 'e7', de: 'a500', ate: 'quina', raio: rTopo }] });
  const cortar = (m: any, eixo: number, c0: number, filtro: (p: number[]) => boolean) => {
    const pts: number[][] = [];
    for (const f of m.faces) for (let q = 0; q < f.length; q++) {
      const A = m.vertices[f[q]], B = m.vertices[f[(q + 1) % f.length]]; const da = A[eixo] - c0, db = B[eixo] - c0;
      if ((da < 0) === (db < 0)) continue;
      const t = da / (da - db); const p = [0, 1, 2].map((d) => A[d] + t * (B[d] - A[d]));
      if (filtro(p) && !pts.some((w) => Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]) < 1e-7)) pts.push(p);
    }
    return pts;
  };
  it('o vinco da estação chega à quina (a linha dele segue as arestas que os apoios da quina criaram), sem recusa nem aviso, e as duas medem o pedido até o canto', () => {
    const g = montar(4, 15);
    expect(g.avisos ?? []).toEqual([]);
    const linhaDoTopo = g.passo.vincos.find((v: any) => v.nome === 'topo').pontos;
    expect(linhaDoTopo[linhaDoTopo.length - 1]).toBe('e7_quina');
    expect(linhaDoTopo.some((n: string) => n.startsWith('quina_apoio1_'))).toBe(true);
    /* a linha da quina também ganha os pontos que o apoio do teto pôs nela, e continua sequência de arestas da gaiola */
    const arestas = new Set<string>(); for (const f of g.passo.faces) f.forEach((a: string, i: number) => arestas.add(`${a}>${f[(i + 1) % f.length]}`));
    for (const v of g.passo.vincos) for (let i = 0; i + 1 < v.pontos.length; i++) expect(arestas.has(`${v.pontos[i]}>${v.pontos[i + 1]}`) || arestas.has(`${v.pontos[i + 1]}>${v.pontos[i]}`), `${v.nome}: ${v.pontos[i]}`).toBe(true);
    const nomes = g.passo.vertices; const idx = new Map(nomes.map((n: string, i: number) => [n, i]));
    const m = subdividirCatmullClark({ vertices: nomes.map((n: string) => g.pontos[n].map((x: number) => x * 1000)), faces: g.passo.faces.map((f: string[]) => f.map((n) => idx.get(n))), vincos: [], niveis: 4 });
    /* o teto: o corte x = const, em (z, y), a 15, 25 e 100 mm do canto (x = 0) */
    for (const x0 of [-300, -100, -60, -25, -15]) {
      const perfil = cortar(m, 0, x0 + 0.01, (q) => Math.abs(q[2] - 300) < 120).map((q) => [q[2], q[1]]).sort((a, b) => a[0] - b[0]);
      expect(Math.abs((raioDoFilete(perfil).raio as number) / 15 - 1), `a ${-x0} mm do canto`).toBeLessThan(0.1);
    }
    /* a quina da cabine, antes do canto (z até 200) e depois dele, a 25 mm ou mais */
    for (const z0 of [-300, -100, 100, 200]) {
      const perfil = cortar(m, 2, z0 + 0.01, (q) => q[0] > -60 && q[1] > yDe(z0 / 1000) * 1000 - 60).map((q) => [q[0], q[1]]).sort((a, b) => (a[0] - a[1]) - (b[0] - b[1]));
      expect(Math.abs((raioDoFilete(perfil).raio as number) / 4 - 1), `z = ${z0}`).toBeLessThan(0.1);
    }
  });
  it('é determinística, e o vinco do canto que corre sobre a aresta de outro é recusado com aviso', () => {
    expect(JSON.stringify(montar(4, 15))).toBe(JSON.stringify(montar(4, 15)));
    const c = caixa({ raio: 6, quais: [0] });
    const dobrada = inserirApoiosNosVincos({ pontos: c.todos, faces: c.faces, unidade: 1000, vincos: [
      { nome: 'um', pontos: ['p-2_2_2', 'p-1_2_2', 'p0_2_2'], raio: 6 }, { nome: 'dois', pontos: ['p-1_2_2', 'p0_2_2', 'p1_2_2'], raio: 6 }] });
    expect(dobrada.avisos.map((a: any) => a.nome)).toContain('vincoCruzaOutroComRaio');
    expect(dobrada.aplicados).toEqual(['um']);
  });
});

/* ---- (i) as quinas que se cruzam na gaiola por laços: o vinco do laço da ponta ---- */
/* Uma barra de 330 por 72 mm de seção ao longo de x, como o para-choque do sedã: as quatro quinas dos trechos com raio (8 mm na frente e em cima, 3 mm atrás e em baixo) e o
   vinco do laço da ponta, nas duas pontas, com raio 8. Os laços ficam a 60 mm da ponta ou mais, que é a distância que o apoio do raio pede (4 raios). */
describe('(i) gaiolaPorLacos: o vinco do laço da ponta cruza as quinas dos trechos, e o raio sai o pedido até o canto', () => {
  const A = 330; const B = 72;
  const lacoDe = (em: number) => ({ em, trechos: { baixo: [[0, 0], [0, B / 2], [0, B]], frente: [[0, B], [A / 3, B], [(2 * A) / 3, B], [A, B]], cima: [[A, B], [A, B / 2], [A, 0]], tras: [[A, 0], [(2 * A) / 3, 0], [A / 3, 0], [0, 0]] } });
  const XS = [0, 60, 160, 320, 480, 580, 640];
  const barra = (vincos: any[], extra: Record<string, unknown> = {}) => gaiolaPorLacos({ nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' },
    trechos: [{ nome: 'baixo', pontos: 3 }, { nome: 'frente', pontos: 4 }, { nome: 'cima', pontos: 3 }, { nome: 'tras', pontos: 4 }], lacos: XS.map(lacoDe), vincos, ...extra });
  const quinas = [{ nome: 'q1', entre: ['frente', 'cima'], raio: 8 }, { nome: 'q2', entre: ['baixo', 'frente'], raio: 8 }, { nome: 'q3', entre: ['cima', 'tras'], raio: 3 }, { nome: 'q4', entre: ['tras', 'baixo'], raio: 3 }];
  const pontas = [{ nome: 'ponta', laco: 'primeiro', raio: 8 }, { nome: 'pontaB', laco: 'ultimo', raio: 8 }];
  const g = barra([...quinas, ...pontas]);
  const nomes: string[] = g.passo.vertices; const idx = new Map(nomes.map((n, i) => [n, i]));
  const malha = (niveis: number) => subdividirCatmullClark({ vertices: nomes.map((n) => g.pontosMm[n]), faces: g.passo.faces.map((f: string[]) => f.map((n) => idx.get(n))), vincos: [], niveis });
  const cortar = (m: any, eixo: number, c0: number, filtro: (p: number[]) => boolean) => {
    const pts: number[][] = [];
    for (const f of m.faces) for (let q = 0; q < f.length; q++) {
      const a = m.vertices[f[q]], b = m.vertices[f[(q + 1) % f.length]]; const da = a[eixo] - c0, db = b[eixo] - c0;
      if ((da < 0) === (db < 0)) continue;
      const t = da / (da - db); const p = [0, 1, 2].map((d) => a[d] + t * (b[d] - a[d]));
      if (filtro(p) && !pts.some((w) => Math.hypot(w[0] - p[0], w[1] - p[1], w[2] - p[2]) < 1e-7)) pts.push(p);
    }
    return pts;
  };
  it('antes, o vinco do laço da ponta ficava sem apoio (apoioAmbiguo); agora ele e as quinas montam sem aviso de recusa, com a tampa refeita e declarada', () => {
    expect((g.avisos ?? []).map((a: any) => a.ref).filter((r: string) => r !== 'planosDesiguais')).toEqual([]);
    expect(g.aneisDaTampa.map((t: any) => t.laco)).toEqual(['l0', 'l6']);
    expect(g.aneisDaTampa[0].recuoMm).toBeGreaterThan(20);
    expect(g.raios.map((r: any) => [r.vinco, r.gravado])).toEqual([['q1', 8], ['q2', 8], ['q3', 3], ['q4', 3], ['ponta', 8], ['pontaB', 8]]);
    for (const v of ['ponta', 'pontaB']) expect(g.passo.vincos.find((x: any) => x.nome === v)).toMatchObject({ nitidez: 0, raio: 0.008 });
    /* a gaiola fecha: cada aresta em duas faces, uma em cada sentido */
    const dirigidas = new Map<string, number>();
    for (const f of g.passo.faces) f.forEach((a: string, k: number) => { const c = `${a}>${f[(k + 1) % f.length]}`; dirigidas.set(c, (dirigidas.get(c) ?? 0) + 1); });
    for (const [c, n] of dirigidas) { const [a, b] = c.split('>'); expect(n, c).toBe(1); expect(dirigidas.has(`${b}>${a}`), c).toBe(true); }
    /* cada vinco segue só arestas da gaiola nova, com os pontos que o outro pôs nele */
    for (const v of g.passo.vincos) for (let k = 0; k + 1 < v.pontos.length; k++) expect(dirigidas.has(`${v.pontos[k]}>${v.pontos[k + 1]}`) || dirigidas.has(`${v.pontos[k + 1]}>${v.pontos[k]}`), `${v.nome} ${v.pontos[k]}`).toBe(true);
  });
  it('o raio da ponta (8 mm), medido na face da frente e na de baixo até 5 mm do canto, é o pedido a 10%, e o das quinas dos trechos também', () => {
    const m = malha(4);
    for (const dc of [100, 60, 40, 20, 10, 5]) {
      /* a aresta da tampa com a face da frente (z = 72): o corte y = const, de z = 25 até a tampa e de x = 0 a 70 */
      const frente = cortar(m, 1, A - dc, (p) => p[0] < 70 && p[2] > 25).map((p) => [p[0], p[2]]).sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
      expect(Math.abs((raioDoFilete(frente).raio as number) / 8 - 1), `frente, a ${dc} mm do canto`).toBeLessThan(0.1);
    }
    for (const dz of [30, 20, 10]) {
      /* a aresta da tampa com a face de baixo (y = 0): o corte z = const */
      const baixo = cortar(m, 2, B - dz, (p) => p[0] < 70 && p[1] > -1 && p[1] < 70).map((p) => [p[0], p[1]]).sort((a, b) => (a[0] - a[1]) - (b[0] - b[1]));
      expect(Math.abs((raioDoFilete(baixo).raio as number) / 8 - 1), `baixo, a ${dz} mm do canto`).toBeLessThan(0.1);
    }
    for (const x0 of [200, 100, 50, 30, 20, 10, 5]) {
      const quina = cortar(m, 0, x0 + 0.01, (p) => p[1] > A - 60 && p[2] > B - 60).map((p) => [p[1], p[2]]).sort((a, b) => (a[0] - a[1]) - (b[0] - b[1]));
      expect(Math.abs((raioDoFilete(quina).raio as number) / 8 - 1), `quina de cima, a ${x0} mm da ponta`).toBeLessThan(0.1);
    }
  });
  it('sem falha de ondulação e sem face fina: a malha entregue pelo passo não tem lasca nem órfão, e a superfície ondula menos de 0,3 mm fora das feições', () => {
    const receita = { PARAMS: {}, TOPO: g.pontos, PASSOS: [['subdivisao', { origemId: 1, ...g.passo, niveis: 3, borda: 'cantos' }], ['parte', { nome: 'barra', sel: { origem: { op: 'subdivisao', id: 1 } } }]] };
    const o = ondulacaoDaReceita(receita);
    expect(o.falhas).toBe(0);
    expect(o.foraDasFeicoes).toBe(0);
    const r = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 3 }]], {}, g.pontos);
    expect(r.orfaos).toEqual([]);
    expect(analisarTopologia({ vertices: r.V, faces: r.F }).achados.filter((a: any) => a.codigo === 'face-fina')).toEqual([]);
  });
  it('a espessura e os grupos conhecem os pontos da volta recuada, e a mesma chamada dá a mesma gaiola', () => {
    const e = barra([...quinas, pontas[0]], { espessura: 2, grupos: [{ nome: 'ponta', lacos: ['l0', 'l1'] }] });
    expect(e.espessura).toBeTruthy();
    expect(e.passo.grupos[0].pontos.some((n: string) => n.endsWith('_dentro'))).toBe(true);
    expect(JSON.stringify(barra([...quinas, ...pontas]))).toBe(JSON.stringify(barra([...quinas, ...pontas])));
  });
  it('a tampa fina demais para o apoio dá raioNaoCabe com o raio que cabe, e o vinco da ponta sem raio continua o de hoje', () => {
    const fina = gaiolaPorLacos({ nome: 'f', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' }, trechos: [{ nome: 'baixo', pontos: 3 }, { nome: 'frente', pontos: 4 }, { nome: 'cima', pontos: 3 }, { nome: 'tras', pontos: 4 }],
      lacos: [0, 160, 320].map((em) => ({ em, trechos: { baixo: [[0, 0], [0, 5], [0, 10]], frente: [[0, 10], [110, 10], [220, 10], [330, 10]], cima: [[330, 10], [330, 5], [330, 0]], tras: [[330, 0], [220, 0], [110, 0], [0, 0]] } })),
      vincos: [{ nome: 'ponta', laco: 'primeiro', raio: 8 }] });
    expect(fina.avisos.map((a: any) => a.ref)).toContain('raioNaoCabe');
    const viva = barra([{ nome: 'ponta', laco: 'primeiro', nitidez: 'viva' }]);
    expect(viva.raios).toBeUndefined(); expect(viva.aneisDaTampa).toBeUndefined();
    expect(viva.passo.vertices.some((n: string) => n.endsWith('_dentro'))).toBe(false);
  });
});
