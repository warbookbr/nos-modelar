/* friso.test.mjs — o friso ao longo de curva: a varredura pura (volume, sólido fechado, esquadria, ponta fechada e
   grito da curva fechada demais), a cadeia na gaiola refinada com a mesma numeração da subdivisão, o passo `friso` na
   polilinha e sobre a superfície, e o gate da fatia 13 do plano da carroceria por subdivisão: sobre uma chapa curva de
   subdivisão com 2 mm de espessura e um vão de cantos vivos, o tubo em volta fechada ao redor do vão, a nervura de
   ponta aberta e o friso de ponta fechada acompanham a linha limite a menos de 0,5 mm, saem fechados no
   `conferir-malha` e entram na chapa sem atravessá-la. O contato declarado, que leva cerca de 5 s, é medido em
   `friso-contato.test.mjs`, da lista dos testes lentos. */
import { describe, expect, it } from 'vitest';
import { ErroDoFriso, cadeiaRefinada, varrerPerfil } from './friso.js';
import { ajustarGaiolaAsMedidas, subdividirCatmullClark } from './subdivisao.js';
import { neutroCanonico, nucleo } from './entrada.js';
import { area, cruzamentos, distancias, pontoTriangulo, triangulos, volume } from './fixtures/medidas-de-malha.js';
import * as prova from './fixtures/friso-prova.js';
import { analisarTopologia } from '../../modulos/topologia/src/analisar.js';
import { prepararParaMicropoligono } from '../../modulos/preparo-micropoligono/src/preparar.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return a.map((c) => c / l); };
const up = [0, 1, 0];
const retangulo = [[-0.01, -0.002], [0.01, -0.002], [0.01, 0.008], [-0.01, 0.008]];
const topologia = (m) => analisarTopologia(m);
const grito = (fn) => { try { fn(); } catch (e) { return e; } throw new Error('não gritou'); };

/* As faces e os vértices de uma parte do neutro, por índice local. */
function malhaDaParte(neutro, ...partes) {
  const faces = [...neutro.F.values()].filter((f) => partes.includes(f.parte));
  const ids = [...new Set(faces.flatMap((f) => f.vs))].sort((a, b) => a - b);
  const indice = new Map(ids.map((id, k) => [id, k]));
  return { vertices: ids.map((id) => neutro.V.get(id)), faces: faces.map((f) => f.vs.map((v) => indice.get(v))) };
}
const juntar = (...malhas) => {
  const vertices = []; const faces = [];
  for (const m of malhas) { const b = vertices.length; vertices.push(...m.vertices); faces.push(...m.faces.map((f) => f.map((k) => b + k))); }
  return { vertices, faces };
};
/* Distância com sinal de cada ponto à superfície de triângulos: o sinal é o lado do triângulo mais perto. */
function distanciasComSinal(pontos, m) {
  const tris = triangulos(m.faces).map((t) => t.map((k) => m.vertices[k]));
  const normais = tris.map(([a, b, c]) => unit(cruz(sub(b, a), sub(c, a))));
  return pontos.map((p) => {
    let melhor = Infinity, n = 0;
    tris.forEach((t, k) => {
      if (Math.abs(t[0][0] - p[0]) > 0.05 || Math.abs(t[0][2] - p[2]) > 0.05) return;
      const d = pontoTriangulo(p, t); if (d < melhor) { melhor = d; n = k; }
    });
    return Math.sign(dot(sub(p, tris[n][0]), normais[n])) * melhor;
  });
}

describe('varrerPerfil', () => {
  it('o trecho reto tampado é o prisma do perfil, e a volta quadrada com esquadria tem volume área × comprimento', () => {
    const reto = varrerPerfil({ pontos: [[0, 0, 0], [1, 0, 0]], normais: [up, up], perfil: retangulo });
    expect(volume(reto.vertices, reto.faces)).toBeCloseTo(0.0002, 15);
    expect(topologia(reto).veredito).toBe('aprova');
    expect(reto.partes.pontas).toHaveLength(4);
    const quadrado = [[0, 0, 0], [0.3, 0, 0], [0.3, 0, 0.3], [0, 0, 0.3]];
    const volta = varrerPerfil({ pontos: quadrado, normais: quadrado.map(() => up), perfil: retangulo, fechada: true });
    expect(volume(volta.vertices, volta.faces)).toBeCloseTo(0.0002 * 1.2, 15);
    expect(volta.partes.pontas).toEqual([]);
    expect(topologia(volta).achados).toEqual([]);
    expect(cruzamentos(volta.vertices, volta.faces)).toEqual([]);
    /* na esquadria de 90 graus, a largura do perfil vira largura × √2 no plano bissetor */
    const canto = volta.vertices.slice(4, 8);
    expect(Math.hypot(...sub(canto[0], canto[1]))).toBeCloseTo(0.02 * Math.SQRT2, 14);
  });

  it('o perfil anda pela normal e para a esquerda de quem segue a linha, e o sentido do perfil não importa', () => {
    const r = varrerPerfil({ pontos: [[0, 0, 0], [1, 0, 0]], normais: [up, up], perfil: [[0, 0], [0.01, 0], [0, 0.02]] });
    /* seguindo +x com a normal +y, a esquerda é -z */
    expect(r.vertices.slice(0, 3)).toEqual([[0, 0, 0], [0, 0, -0.01], [0, 0.02, 0]]);
    const invertido = varrerPerfil({ pontos: [[0, 0, 0], [1, 0, 0]], normais: [up, up], perfil: [[0, 0.02], [0.01, 0], [0, 0]] });
    expect(volume(invertido.vertices, invertido.faces)).toBeCloseTo(volume(r.vertices, r.faces), 15);
  });

  it('a ponta fechada encolhe o perfil até um ponto da linha e o sólido continua fechado', () => {
    const r = varrerPerfil({ pontos: [[0, 0, 0], [0.5, 0, 0]], normais: [up, up], perfil: retangulo, pontas: ['fechada', 'aberta'], fechamento: 0.05 });
    expect(r.vertices[0]).toEqual([0, 0, 0]);
    expect(r.estacoes).toBe(8);
    expect(topologia(r).achados).toEqual([]);
    /* o quarto de elipse tira um terço do prisma no trecho do fechamento; os seis passos tiram um pouco mais, 0,12%
       (sem a estação no fim do encolhimento, o perfil voltava ao tamanho cheio só na outra ponta, e faltavam 3,3%) */
    const V = volume(r.vertices, r.faces);
    expect(V).toBeLessThan(0.0002 * (0.5 - 0.05 / 3));
    expect(V / (0.0002 * (0.5 - 0.05 / 3))).toBeGreaterThan(0.998);
    expect(grito(() => varrerPerfil({ pontos: [[0, 0, 0], [0.05, 0, 0]], normais: [up, up], perfil: retangulo, pontas: ['fechada', 'fechada'], fechamento: 0.03 })).message).toMatch(/o fechamento 0\.03 nas duas pontas passa da metade do comprimento da linha/);
  });

  it('o trecho longo é dividido para a face lateral não virar lasca', () => {
    /* a menor aresta do perfil tem 1 cm, e o trecho de 3 m passa de 100 vezes ela: sai em três */
    const r = varrerPerfil({ pontos: [[0, 0, 0], [3, 0, 0]], normais: [up, up], perfil: retangulo });
    expect(r.estacoes).toBe(4);
    expect(topologia(r).veredito).toBe('aprova');
  });

  it('grita com o ponto quando a curva é fechada demais para a largura, a normal acompanha a linha ou a linha volta', () => {
    const u = [[0, 0, 0], [0.3, 0, 0], [0.3, 0, 0.015], [0, 0, 0.015]];
    const e = grito(() => varrerPerfil({ pontos: u, normais: u.map(() => up), perfil: retangulo }));
    expect(e).toBeInstanceOf(ErroDoFriso);
    expect(e.indice).toBe(1);
    expect(e.message).toMatch(/a curva é fechada demais para a largura do perfil: no trecho de 0\.015 o lado de dentro da esquadria recua 0\.02/);
    expect(grito(() => varrerPerfil({ pontos: [[0, 0, 0], [0, 1, 0]], normais: [up, up], perfil: retangulo })).message).toMatch(/paralela à linha/);
    expect(grito(() => varrerPerfil({ pontos: [[0, 0, 0], [1, 0, 0], [0, 0, 0]], normais: [up, up, up], perfil: retangulo })).message).toMatch(/volta para trás/);
    expect(grito(() => varrerPerfil({ pontos: [[0, 0, 0], [0, 0, 0]], normais: [up, up], perfil: retangulo })).indice).toBe(0);
  });
});

describe('cadeiaRefinada', () => {
  it('repete a numeração e as faces da subdivisão, e a cadeia anda pelas arestas de cada nível', () => {
    const P = prova.pontos(); const g = prova.gaiola();
    const indice = new Map(g.vertices.map((n, k) => [n, k]));
    const faces = g.faces.map((f) => f.map((n) => indice.get(n)));
    const r = cadeiaRefinada(faces, g.vertices.length, 2, prova.voltaDoVao().map((n) => indice.get(n)));
    const s = subdividirCatmullClark({ vertices: g.vertices.map((n) => P[n]), faces, niveis: 2 });
    expect(r.faces).toEqual(s.faces);
    expect(r.vertices).toBe(s.vertices.length);
    expect(r.cadeia).toHaveLength(16 * 4 + 1);
    const arestas = new Set(s.faces.flatMap((f) => f.map((a, k) => [a, f[(k + 1) % f.length]].sort((x, y) => x - y).join(','))));
    for (let k = 0; k + 1 < r.cadeia.length; k++) expect(arestas.has([r.cadeia[k], r.cadeia[k + 1]].sort((x, y) => x - y).join(','))).toBe(true);
    expect(r.cadeia[0]).toBe(r.cadeia[r.cadeia.length - 1]);
    expect(grito(() => cadeiaRefinada(faces, g.vertices.length, 1, [indice.get('p0_0'), indice.get('p1_1')])).indice).toBe(0);
  });
});

describe('passo friso', () => {
  it('na polilinha, segue os pontos nomeados com a normal declarada e publica lateral e pontas', () => {
    const n = nucleo([['friso', { origemId: 7, linha: { nome: 'corrimao', pontos: ['a', 'b', [0.5, 0.2, 0.5]] }, normal: [0, 1, 0], perfil: { circulo: { raio: 0.01 } } }], ['parte', { nome: 'corrimao', sel: { origem: { op: 'friso', id: 7, parte: 'pontas' } } }]], { a: [0, 0, 0], b: [0.5, 0, 0] });
    expect(n.orfaos).toEqual([]);
    /* o trecho de 54 cm passa de 100 vezes a aresta de 3,9 mm do círculo de 16 lados e sai em dois */
    expect(n.V.size).toBe(5 * 16);
    expect(analisarTopologia({ vertices: n.V, faces: n.F }).achados).toEqual([]);
    expect([...n.F.values()].filter((f) => f.parte === 'corrimao')).toHaveLength(2 * 14);
  });

  it('grita com o nome: linha fora da aresta, ponto fora da gaiola, ponta na volta, normal na superfície e polilinha sem normal', () => {
    const P = prova.pontos();
    const motivo = (extra) => nucleo(prova.passos({ extra: { nervura: extra } }), P).orfaos.map((o) => o.motivo);
    expect(motivo({ linha: { nome: 'nervura', pontos: ['p1_7', 'p2_6'] } })[0]).toBe("a linha 'nervura' liga 'p1_7' a 'p2_6', que não formam aresta da gaiola; a linha segue as arestas da gaiola, como o vinco");
    expect(motivo({ linha: { nome: 'nervura', pontos: ['p1_7', 'p4_4'] } })[0]).toBe("a linha 'nervura' cita o ponto 'p4_4', que não é ponto nomeado da gaiola da superfície");
    expect(motivo({ normal: [0, 1, 0] })[0]).toMatch(/^normal só vale na polilinha/);
    expect(motivo({ superficie: { op: 'subdivisao', id: 9 } })[0]).toMatch(/^superficie: nenhum passo subdivisao declara a origem 9/);
    expect(motivo({ superficie: { op: 'cubo', id: 1 } })[0]).toMatch(/^superficie precisa ser a origem de um passo subdivisao/);
    expect(motivo({ perfil: { retangulo: { largura: 0.008, profundidade: 0.004, centro: [0, 0.002] } } })[0]).toMatch(/^o perfil não entra na chapa \(v vai de 0 a 0\.004\)/);
    expect(motivo({ perfil: { retangulo: { largura: 0.008, profundidade: 0.008, centro: [0, 0.001] } } })[0]).toBe('o perfil entra 0.003 na chapa, e a espessura é 0.002: ele atravessaria a face de dentro; suba o perfil para entrar menos que a espessura');
    expect(nucleo(prova.passos({ extra: { voltaDoVao: { ponta: 'aberta' } } }), P).orfaos[0].motivo).toBe("a linha 'voltaDoVao' é volta fechada e não tem ponta; tire ponta");
    expect(nucleo([['friso', { linha: { nome: 'l', pontos: [[0, 0, 0], [1, 0, 0]] }, perfil: { circulo: { raio: 0.01 } } }]]).orfaos[0].motivo).toMatch(/^a polilinha precisa de normal/);
    /* o tubo de 20 cm não cabe na dobra de 90 graus da volta, e o grito cita o canto da gaiola */
    const largo = nucleo(prova.passos({ extra: { voltaDoVao: { perfil: { circulo: { raio: 0.1, centro: [0, 0.099] } } } } }), P).orfaos[0].motivo;
    expect(largo).toMatch(/^na linha 'voltaDoVao', perto de 'p\d_\d': a curva é fechada demais para a largura do perfil/);
  });

  it('acompanha a chapa depois de uma transformação dela', () => {
    const P = prova.pontos();
    const base = prova.passos().slice(0, 3);
    const movido = [base[0], ['transladar', { d: [0, 0.5, 0] }], ...base.slice(1)];
    const a = nucleo(base, P); const b = nucleo(movido, P);
    expect(b.orfaos).toEqual([]);
    /* o passo de cada friso anda uma posição com a translação no meio, e o id local fica */
    for (const [passo, k] of [[1, 0], [1, 100], [2, 0]]) expect(b.V.get((passo + 1) * 1000 + k).map((c, e) => c - a.V.get(passo * 1000 + k)[e])).toEqual([expect.closeTo(0, 12), expect.closeTo(0.5, 12), expect.closeTo(0, 12)]);
  });
});

describe('gate da fatia 13: o friso sobre a chapa curva com vão', () => {
  const P = prova.pontos();
  const neutro = nucleo(prova.passos(), P);
  const g = prova.gaiola();
  const indice = new Map(g.vertices.map((n, k) => [n, k]));
  const gaiolaIdx = { vertices: g.vertices.map((n) => P[n]), faces: g.faces.map((f) => f.map((n) => indice.get(n))), cantos: g.cantos.map((n) => indice.get(n)), borda: 'cantos' };
  const ajustada = ajustarGaiolaAsMedidas(gaiolaIdx, g.vertices.map((_, k) => k)).vertices;
  const NIVEL_DENSO = 4;
  const densa = subdividirCatmullClark({ ...gaiolaIdx, vertices: ajustada, niveis: NIVEL_DENSO, aoLimite: true });
  const facesDoVertice = new Map();
  densa.faces.forEach((f) => f.forEach((v) => { if (!facesDoVertice.has(v)) facesDoVertice.set(v, []); facesDoVertice.get(v).push(f); }));
  const normalDensa = (v) => unit((facesDoVertice.get(v) ?? []).reduce((n, f) => { const m = cruz(sub(densa.vertices[f[2]], densa.vertices[f[0]]), sub(densa.vertices[f[3]], densa.vertices[f[1]])); return [n[0] + m[0], n[1] + m[1], n[2] + m[2]]; }, [0, 0, 0]));
  /* a linha na superfície limite: os vértices da malha de nível 4, levados ao limite, sobre as arestas da linha */
  const linhaLimite = (nomes) => cadeiaRefinada(gaiolaIdx.faces, ajustada.length, NIVEL_DENSO, nomes.map((n) => indice.get(n))).cadeia.map((v) => ({ p: densa.vertices[v], n: normalDensa(v) }));
  /* o desvio de um ponto do perfil ao longo da linha: a distância de linha + v·normal até a malha do friso, menos a
     distância esperada (0 num ponto da face do perfil, o apótema no eixo do tubo poligonal) */
  const desvios = (parte, nomes, v, esperado, corte = () => true) => {
    const m = malhaDaParte(neutro, parte); const tris = triangulos(m.faces).map((t) => t.map((k) => m.vertices[k]));
    const amostras = linhaLimite(nomes).filter((_, k, todos) => corte(k, todos.length));
    return distancias(amostras.map(({ p, n }) => [p[0] + v * n[0], p[1] + v * n[1], p[2] + v * n[2]]), tris, 0.01).map((d) => Math.abs(d - esperado));
  };

  it('sai sem grito, e a peça (chapa e três frisos) passa no conferir-malha sem casca aberta', () => {
    expect(neutro.orfaos).toEqual([]);
    const top = analisarTopologia({ vertices: neutro.V, faces: neutro.F });
    expect(top.achados.map((a) => a.codigo)).toEqual(['ilhas']);
    expect(top.resumo.componentes).toBe(4);
    for (const parte of ['chapa', 'voltaDoVao', 'nervura', 'aba']) expect(analisarTopologia(malhaDaParte(neutro, parte)).achados).toEqual([]);
    expect(prepararParaMicropoligono({ vertices: neutro.V, faces: neutro.F }, { unidadeEntrada: 'm', unidadeSaida: 'cm' }).veredito).not.toBe('reprova');
  });

  it('o tubo em volta do vão de cantos vivos acompanha a linha limite a menos de 0,5 mm, com os quatro cantos de 90 graus', () => {
    const apotema = prova.TUBO.raio * Math.cos(Math.PI / (4 * prova.TUBO.segmentosArco));
    const d = desvios('voltaDoVao', prova.voltaDoVao(), prova.TUBO.centro, apotema);
    expect(d).toHaveLength(16 * 2 ** NIVEL_DENSO + 1);
    expect(Math.max(...d)).toBeLessThan(0.0005);
    expect(Math.max(...d)).toBeLessThan(0.0002);
  });

  it('o topo da nervura e o do friso de ponta fechada acompanham a linha a menos de 0,5 mm, pela normal da chapa', () => {
    const topoNervura = prova.NERVURA.centro + prova.NERVURA.profundidade / 2;
    expect(Math.max(...desvios('nervura', prova.linhaDaNervura(), topoNervura, 0))).toBeLessThan(0.0005);
    /* fora do trecho em que a ponta fechada encolhe o perfil (30 mm de cada lado de uma linha de 400 mm) */
    const fora = (k, n) => k > (n - 1) * (0.03 / 0.4) && k < (n - 1) * (1 - 0.03 / 0.4);
    expect(Math.max(...desvios('aba', prova.linhaDaAba(), 0.004, 0, fora))).toBeLessThan(0.0005);
  });

  it('cada friso entra na chapa pela parte de v negativo e não atravessa a face de dentro', () => {
    const chapa = nucleo([prova.passos()[0], ...['externa', 'interna'].map((parte) => ['parte', { nome: parte, sel: { origem: { op: 'subdivisao', id: 1, parte } } }])], P);
    const fora = malhaDaParte(chapa, 'externa'); const interna = malhaDaParte(chapa, 'interna');
    const perfis = { voltaDoVao: [5, 16], nervura: [2, 4], aba: [2, 4] };
    for (const [parte, [abaixo, total]] of Object.entries(perfis)) {
      const friso = malhaDaParte(neutro, parte);
      const s = distanciasComSinal(friso.vertices, fora).filter((x) => Math.abs(x) > 1e-9);
      const dentro = s.filter((x) => x < 0);
      /* a mesma fração de pontos do perfil abaixo de v = 0: nenhum ponto da base fica solto acima da chapa */
      expect(dentro.length / s.length).toBeCloseTo(abaixo / total, 12);
      expect(Math.min(...dentro)).toBeGreaterThan(-prova.ESPESSURA);
      const comInterna = juntar(friso, interna);
      expect(cruzamentos(comInterna.vertices, comInterna.faces, 0.01)).toEqual([]);
      const comExterna = juntar(friso, fora);
      expect(cruzamentos(comExterna.vertices, comExterna.faces, 0.01).length).toBeGreaterThan(0);
      expect(cruzamentos(friso.vertices, friso.faces, 0.01)).toEqual([]);
    }
  });

  it('o volume do tubo é a área do perfil vezes o comprimento da volta, a 2%', () => {
    const m = malhaDaParte(neutro, 'voltaDoVao');
    const linha = linhaLimite(prova.voltaDoVao());
    let L = 0; for (let k = 0; k + 1 < linha.length; k++) L += Math.hypot(...sub(linha[k + 1].p, linha[k].p));
    const A = 16 * 0.5 * prova.TUBO.raio ** 2 * Math.sin((2 * Math.PI) / 16);
    expect(Math.abs(volume(m.vertices, m.faces) / (A * L) - 1)).toBeLessThan(0.02);
    expect(area(m.vertices, m.faces)).toBeGreaterThan(0);
  });

  it('é bit a bit', () => {
    expect(JSON.stringify(neutroCanonico(nucleo(prova.passos(), P)))).toBe(JSON.stringify(neutroCanonico(neutro)));
  });
});

describe('friso na simetria em x', () => {
  /* uma chapa curva de 3 × 3 faces na metade x >= 0, espelhada: as linhas da gaiola são as colunas c0 (no plano) a c3 */
  const pontos = {};
  const vertices = []; const faces = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = 0.1 * i, z = 0.1 * j; pontos[`c${i}_${j}`] = [x, 0.2 - x * x - (z - 0.15) ** 2, z]; vertices.push(`c${i}_${j}`); }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) faces.push([`c${i}_${j}`, `c${i}_${j + 1}`, `c${i + 1}_${j + 1}`, `c${i + 1}_${j}`]);
  const chapa = ['subdivisao', { origemId: 1, vertices, faces, simetria: 'x', medidas: [...vertices], espessura: 0.002, niveis: 2 }];
  const friso = (pts) => ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'l', pontos: pts }, perfil: { retangulo: { largura: 0.006, profundidade: 0.004, centro: [0, 0.001] } } }];
  const so = (passos) => { const n = nucleo([...passos, ['parte', { nome: 'f', sel: { origem: { op: 'friso', id: 2 } } }]], pontos); expect(n.orfaos).toEqual([]); return malhaDaParte(n, 'f'); };
  const espelhado = (m) => m.vertices.every(([x, y, z]) => m.vertices.some((q) => Math.hypot(q[0] + x, q[1] - y, q[2] - z) < 1e-9));

  it('a linha que toca o plano numa ponta continua na imagem, numa peça só e simétrica', () => {
    const m = so([chapa, friso(['c0_1', 'c1_1', 'c2_1'])]);
    expect(analisarTopologia(m).resumo.componentes).toBe(1);
    expect(analisarTopologia(m).achados).toEqual([]);
    expect(espelhado(m)).toBe(true);
    expect(Math.min(...m.vertices.map((p) => p[0]))).toBeLessThan(-0.19);
  });

  it('a que toca nas duas pontas vira volta, e a que não toca ganha a cópia espelhada', () => {
    const volta = so([chapa, friso(['c0_0', 'c1_0', 'c1_1', 'c1_2', 'c0_2'])]);
    expect(analisarTopologia(volta).resumo.componentes).toBe(1);
    expect(analisarTopologia(volta).achados).toEqual([]);
    expect(volta.vertices.length % 4).toBe(0);
    const solta = so([chapa, friso(['c1_1', 'c2_1', 'c2_2'])]);
    expect(analisarTopologia(solta).resumo.componentes).toBe(2);
    expect(analisarTopologia(solta).achados.map((a) => a.codigo)).toEqual(['ilhas']);
    expect(espelhado(solta)).toBe(true);
  });
});
