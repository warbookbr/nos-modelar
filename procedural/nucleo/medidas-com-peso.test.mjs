/* medidas-com-peso.test.mjs — a medida com peso da subdivisão (fatia 11 do plano de carroceria por subdivisão).
 *
 * A gaiola é uma chapa em grade desenhada por código sobre uma forma lisa, e vinte pontos alinhados no meio dela levam
 * cotas com ruído de até ±2 mm na altura. Com as cotas exatas, a superfície passa por cada uma e ondula; com peso, ela se
 * aproxima por mínimos quadrados e fica mais lisa, com o desvio médio às cotas abaixo do ruído. O teste confere também a
 * formulação pela geometria (a gaiola ajustada é mínimo da energia declarada, medida pelo ponto limite da gaiola nova),
 * a medida exata no meio das com peso, a simetria, o determinismo bit a bit e os gritos. */
import { describe, expect, it } from 'vitest';
import { ajustarGaiolaAsMedidasComPeso, limitesDaGaiola } from './subdivisao.js';
import { enderecosPorIndice } from './operacoes/subdivisao.js';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { neutroCanonico, nucleo } from './entrada.js';

/* a chapa: 24 colunas em x a cada 100 mm, 9 linhas em z a cada 100 mm, altura y de uma forma lisa */
const NX = 24; const NZ = 9; const PASSO = 0.1; const COMPRIMENTO = (NX - 1) * PASSO;
const forma = (x, z) => 0.15 * Math.sin(Math.PI * x / COMPRIMENTO) + 0.1 * Math.cos(Math.PI * (z - 0.4) / 1.6);
function normalDaForma(x, z) {
  const fx = 0.15 * Math.PI / COMPRIMENTO * Math.cos(Math.PI * x / COMPRIMENTO); const fz = -0.1 * Math.PI / 1.6 * Math.sin(Math.PI * (z - 0.4) / 1.6);
  const m = Math.hypot(fx, 1, fz);
  return [-fx / m, 1 / m, -fz / m];
}
const RUIDO = 0.002; const LINHA = 4; const COLUNAS = Array.from({ length: 20 }, (_, k) => k + 2);
const nome = (i, j) => `p${i}_${j}`;
/* ruído determinístico: gerador congruente linear de semente fixa, uniforme em ±RUIDO */
function chapa() {
  let semente = 12345;
  const sorteio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  const pontos = {}; const ruido = {};
  for (let j = 0; j < NZ; j += 1) for (let i = 0; i < NX; i += 1) pontos[nome(i, j)] = [i * PASSO, forma(i * PASSO, j * PASSO), j * PASSO];
  for (const i of COLUNAS) {
    const n = nome(i, LINHA); ruido[n] = RUIDO * (2 * sorteio() - 1);
    pontos[n] = [pontos[n][0], pontos[n][1] + ruido[n], pontos[n][2]];
  }
  const faces = [];
  for (let j = 0; j < NZ - 1; j += 1) for (let i = 0; i < NX - 1; i += 1) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  return { pontos, ruido, vertices: Object.keys(pontos), faces, cotas: COLUNAS.map((i) => nome(i, LINHA)) };
}

const graus = (a, b) => Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;

/* As medidas da superfície entregue: o desvio da normal de cada face, perto da linha das cotas, à normal da forma (p95,
   em grau); a distância de cada cota ao vértice da malha do ponto dela (com medidas, todo vértice está no ponto limite);
   e a distância desse vértice à forma sem ruído. */
function medir(neutro, c) {
  const desvios = [];
  for (const f of neutro.F.values()) {
    const P = f.vs.map((v) => neutro.V.get(v)); const m = [0, 1, 2].map((k) => P.reduce((s, p) => s + p[k], 0) / P.length);
    if (m[2] < 0.25 || m[2] > 0.55 || m[0] < 0.25 || m[0] > 2.05) continue;
    let x = 0; let y = 0; let z = 0;
    for (let k = 0; k < P.length; k += 1) { const a = P[k]; const b = P[(k + 1) % P.length]; x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]); }
    const n = Math.hypot(x, y, z); desvios.push(graus([x / n, y / n, z / n], normalDaForma(m[0], m[2])));
  }
  desvios.sort((a, b) => a - b);
  const ids = [...neutro.V.keys()];
  const doPonto = (n) => neutro.V.get(ids[c.vertices.indexOf(n)]);
  const aCota = c.cotas.map((n) => { const v = doPonto(n); const a = c.pontos[n]; return Math.hypot(v[0] - a[0], v[1] - a[1], v[2] - a[2]); });
  const aForma = c.cotas.map((n) => { const v = doPonto(n); return Math.abs(v[1] - forma(v[0], v[2])); });
  const media = (l) => l.reduce((s, x) => s + x, 0) / l.length;
  return { p95: desvios[Math.floor(0.95 * (desvios.length - 1))], faces: desvios.length, mediaCota: media(aCota), maiorCota: Math.max(...aCota), mediaForma: media(aForma) };
}

const passo = (c, medidas, extra = {}) => [['subdivisao', { origemId: 1, vertices: c.vertices, faces: c.faces, niveis: 2, medidas, ...extra }]];

describe('medida com peso', () => {
  const c = chapa();
  const ruidoMedio = Object.values(c.ruido).reduce((s, x) => s + Math.abs(x), 0) / COLUNAS.length;

  it('com 20 cotas ruidosas de ±2 mm, a superfície com peso fica mais lisa que a exata e o desvio médio às cotas fica abaixo do ruído', () => {
    expect(Math.max(...Object.values(c.ruido).map(Math.abs))).toBeGreaterThan(0.0019);
    const exata = nucleo(passo(c, c.cotas), c.pontos);
    const comPeso = nucleo(passo(c, c.cotas.map((ponto) => ({ ponto, peso: 1 }))), c.pontos);
    expect(exata.orfaos).toEqual([]); expect(comPeso.orfaos).toEqual([]);
    const e = medir(exata, c); const p = medir(comPeso, c);
    expect(e.faces).toBe(864); expect(p.faces).toBe(864);
    /* medido: p95 de 1,43 grau na exata e 0,65 com peso 1; desvio médio às cotas 0 e 0,79 mm, com ruído médio de 1,04 mm */
    expect(e.mediaCota).toBeLessThan(1e-6);
    expect(p.p95).toBeLessThan(0.6 * e.p95);
    expect(p.mediaCota).toBeLessThan(RUIDO);
    expect(p.mediaCota).toBeLessThan(ruidoMedio);
    /* e a superfície com peso fica mais perto da forma sem ruído que a exata, que copia o ruído */
    expect(p.mediaForma).toBeLessThan(0.6 * e.mediaForma);
    /* bit a bit: a mesma receita dá o mesmo canônico */
    expect(JSON.stringify(neutroCanonico(nucleo(passo(c, c.cotas.map((ponto) => ({ ponto, peso: 1 }))), c.pontos)))).toBe(JSON.stringify(neutroCanonico(comPeso)));
  });

  it('o peso troca lisura por aderência: o desvio às cotas cai e a ondulação sobe com ele, até a exata', () => {
    const porPeso = [0.25, 1, 4, 16, 1e4].map((peso) => medir(nucleo(passo(c, c.cotas.map((ponto) => ({ ponto, peso }))), c.pontos), c));
    for (let k = 1; k < porPeso.length; k += 1) {
      expect(porPeso[k].mediaCota).toBeLessThan(porPeso[k - 1].mediaCota);
      expect(porPeso[k].p95).toBeGreaterThan(porPeso[k - 1].p95);
    }
    expect(porPeso[porPeso.length - 1].maiorCota).toBeLessThan(2e-4);
  });

  it('a gaiola ajustada é o mínimo da energia declarada, conferido pelo ponto limite da gaiola nova', () => {
    const k = new Map(c.vertices.map((n, i) => [n, i]));
    const gaiola = { vertices: c.vertices.map((n) => c.pontos[n]), faces: c.faces.map((f) => f.map((n) => k.get(n))), borda: 'suave' };
    const medidas = c.cotas.map((n, t) => ({ indice: k.get(n), peso: 0.5 + (t % 3) }));
    const r = ajustarGaiolaAsMedidasComPeso(gaiola, medidas);
    const energia = (V) => {
      const L = limitesDaGaiola({ ...gaiola, vertices: V });
      let e = 0;
      for (const { indice, peso } of medidas) { const a = gaiola.vertices[indice]; e += peso * ((L[indice][0] - a[0]) ** 2 + (L[indice][1] - a[1]) ** 2 + (L[indice][2] - a[2]) ** 2); }
      V.forEach((p, j) => { const q = gaiola.vertices[j]; e += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; });
      return e;
    };
    const e0 = energia(r.vertices);
    expect(e0).toBeLessThan(energia(gaiola.vertices));
    /* qualquer passo de 0,1 mm num ponto da gaiola, medido ou vizinho, em qualquer eixo, sobe a energia */
    const h = 1e-4;
    for (const j of [k.get(nome(2, LINHA)), k.get(nome(10, LINHA)), k.get(nome(10, LINHA + 1)), k.get(nome(15, LINHA - 1)), k.get(nome(21, LINHA))]) {
      for (let eixo = 0; eixo < 3; eixo += 1) for (const s of [h, -h]) {
        const V = r.vertices.map((p) => [...p]); V[j][eixo] += s;
        expect(energia(V)).toBeGreaterThan(e0);
      }
    }
    /* os pontos longe das estrelas medidas não se movem */
    expect(r.vertices[k.get(nome(10, 0))]).toEqual(gaiola.vertices[k.get(nome(10, 0))]);
  });

  it('a medida exata no meio das com peso passa pela superfície, e as com peso não', () => {
    const medidas = c.cotas.map((ponto, t) => (t % 5 === 0 ? ponto : { ponto, peso: 1 }));
    const n = nucleo(passo(c, medidas), c.pontos);
    expect(n.orfaos).toEqual([]);
    const ids = [...n.V.keys()];
    const desvio = (nm) => { const v = n.V.get(ids[c.vertices.indexOf(nm)]); const a = c.pontos[nm]; return Math.hypot(v[0] - a[0], v[1] - a[1], v[2] - a[2]); };
    for (const [t, nm] of c.cotas.entries()) {
      if (t % 5 === 0) expect(desvio(nm)).toBeLessThan(1e-6);
      else expect(desvio(nm)).toBeGreaterThan(1e-6);
    }
  });

  it('na simetria em x, a imagem do ponto com peso leva o mesmo peso e a superfície sai simétrica', () => {
    const meia = { vertices: [[0, 0, 0], [0.5, 0.1, 0], [1, 0, 0], [0, 0.2, 1], [0.5, 0.3, 1], [1, 0.1, 1], [0, 0.1, 2], [0.5, 0.25, 2], [1, 0.05, 2]], faces: [[0, 3, 4, 1], [1, 4, 5, 2], [3, 6, 7, 4], [4, 7, 8, 5]] };
    const nm = meia.vertices.map((_, k) => `m${k}`);
    const n = nucleo([['subdivisao', { origemId: 1, simetria: 'x', vertices: nm, faces: meia.faces.map((f) => f.map((k) => nm[k])), niveis: 2, medidas: [{ ponto: 'm4', peso: 3 }, { ponto: 'm5', peso: 3 }, 'm3'] }]], Object.fromEntries(nm.map((x, k) => [x, meia.vertices[k]])));
    expect(n.orfaos).toEqual([]);
    const V = [...n.V.values()];
    for (const p of V) expect(Math.min(...V.map((q) => Math.hypot(q[0] + p[0], q[1] - p[1], q[2] - p[2])))).toBeLessThan(1e-12);
  });

  it('peso inválido, campo desconhecido e o mesmo ponto com dois pesos gritam com o nome', () => {
    const motivo = (medidas, extra) => nucleo(passo(c, medidas, extra), { ...c.pontos, pesoDaCota: 2 }).orfaos.map((o) => o.motivo).join(' | ');
    expect(motivo([{ ponto: c.cotas[0], peso: 0 }])).toMatch(new RegExp(`'${c.cotas[0]}' tem peso 0`));
    expect(motivo([{ ponto: c.cotas[0] }])).toMatch(/precisa de peso maior que zero/);
    expect(motivo([{ ponto: c.cotas[0], peso: 1, nitidez: 1 }])).toMatch(/campo desconhecido 'nitidez'/);
    expect(motivo([c.cotas[0], { ponto: c.cotas[0], peso: 1 }])).toMatch(new RegExp(`'${c.cotas[0]}' aparece em medidas com pesos diferentes`));
    expect(motivo([{ ponto: 'outro', peso: 1 }])).toMatch(/'outro' não é ponto declarado/);
    /* o peso aceita nome de PARAMS */
    expect(motivo([{ ponto: c.cotas[0], peso: 'pesoDaCota' }])).toBe('');
    expect(enderecosPorIndice({ medidas: ['a', { ponto: 'b', peso: 2 }, { ponto: 3, peso: 1 }] })).toEqual(['medidas[2].ponto']);
  });

  it('as exatas que o limite não separa gritam singular com os nomes, e as mal condicionadas gritam o ganho', () => {
    const cubo = (pref, dx) => {
      const v = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map((p) => [p[0] + dx, p[1], p[2]]);
      return { pontos: Object.fromEntries(v.map((p, k) => [`${pref}${k}`, p])), faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].map((q) => q.map((k) => `${pref}${k}`)) };
    };
    const a = cubo('a', 0); const b = cubo('b', 5); const pontos = { ...a.pontos, ...b.pontos };
    const rodar = (medidas, vincos = []) => nucleo([['subdivisao', { origemId: 1, vertices: Object.keys(pontos), faces: [...a.faces, ...b.faces], niveis: 1, vincos, medidas }]], pontos);
    /* os oito cantos de um cubo liso, exatos, são singulares também com a cota com peso no outro cubo */
    const singular = rodar([...Object.keys(a.pontos), { ponto: 'b0', peso: 2 }]).orfaos;
    expect(singular).toHaveLength(1);
    expect(singular[0].motivo).toMatch(/singular/);
    for (const n of Object.keys(a.pontos)) expect(singular[0].motivo).toContain(`'${n}'`);
    expect(singular[0].motivo).not.toContain("'b0'");
    /* com vincos fracos o mesmo conjunto deixa de ser singular e passa a mover a gaiola 459 vezes o erro da cota */
    const fraco = rodar([...Object.keys(a.pontos), { ponto: 'b0', peso: 2 }], [{ nome: 'fraco', pontos: ['a4', 'a5', 'a6'], nitidez: 0.1 }]).orfaos;
    expect(fraco).toHaveLength(1);
    expect(fraco[0].motivo).toMatch(/mal condicionado \(ganho \d+/);
    expect(fraco[0].motivo).toContain("'a0'");
    /* a cota com peso sozinha nunca fica mal condicionada: a regularização limita o ganho */
    expect(rodar(Object.keys(a.pontos).map((ponto) => ({ ponto, peso: 1e9 }))).orfaos).toEqual([]);
  });

  it('a gaiola por estações passa o peso da medida ao passo', () => {
    const secao = (n, em) => ({ nome: n, em, colunas: [{ nome: 'baixo', em: [1, 0] }, { nome: 'meio', em: [1, 0.5] }, { nome: 'alto', em: [0.8, 1] }] });
    const g = gaiolaPorEstacoes({
      eixo: 'z', estacoes: [secao('a', 0), secao('b', 1), secao('c', 2)], vincos: [],
      medidas: [{ estacao: 'b', peso: 4 }, { estacao: 'a' }],
    });
    expect(g.passo.medidas).toEqual(['a_baixo', 'a_meio', 'a_alto', { ponto: 'b_baixo', peso: 4 }, { ponto: 'b_meio', peso: 4 }, { ponto: 'b_alto', peso: 4 }]);
    expect(() => gaiolaPorEstacoes({ eixo: 'z', estacoes: [secao('a', 0), secao('b', 1)], vincos: [], medidas: [{ estacao: 'b', peso: 4 }, { coluna: 'meio', peso: 2 }] })).toThrow(/outro peso/);
    expect(() => gaiolaPorEstacoes({ eixo: 'z', estacoes: [secao('a', 0), secao('b', 1)], vincos: [], medidas: [{ estacao: 'b', peso: -1 }] })).toThrow(/peso -1/);
    const n = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 1 }]], g.pontos);
    expect(n.orfaos).toEqual([]);
  });
});
