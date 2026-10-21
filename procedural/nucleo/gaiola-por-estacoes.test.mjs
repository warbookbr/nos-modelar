/* gaiola-por-estacoes.test.mjs — o ajudante que monta a gaiola da subdivisão por estações e colunas nomeadas: faces,
   transições de três e cinco lados, vãos, vincos, cantos, medidas, simetria e os gritos com nomes; e a forma de prova
   desenhada por código, que sai com menos de um terço dos vértices da mesma forma em grade cheia. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes, nomeDoPonto } from './gaiola-por-estacoes.js';
import { definicaoAdensada, definicaoGradeCheia, nomeDaColuna, superficie } from './fixtures/gaiola-por-estacoes-prova.js';
import { subdividirCatmullClark, espelharGaiolaEmX, nitidezDoVinco } from './subdivisao.js';
import { enderecosPorIndice } from './operacoes/subdivisao.js';
import { neutroCanonico, nucleo } from './entrada.js';
import { sha256Hex } from './sha256.js';
import { distancias } from './fixtures/medidas-de-malha.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const col = (nome, u, v, extra) => ({ nome, em: [u, v], ...extra });
/* Uma lateral plana em x = 1, com as colunas subindo em y e as estações andando em z. */
const plana = (zs, colunas) => zs.map((z, k) => ({ nome: `e${k}`, em: z, colunas: colunas(k).map(([n, y, extra]) => col(n, 1, y, extra)) }));
const tres = [['a', 0], ['b', 1], ['c', 2]];
const ladosDe = (faces) => { const r = {}; for (const f of faces) r[f.length] = (r[f.length] ?? 0) + 1; return r; };
const normal = (P) => {
  const n = [0, 0, 0];
  for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  return n;
};
const grito = (definicao) => { try { gaiolaPorEstacoes(definicao); } catch (e) { return e.message; } throw new Error('não gritou'); };

describe('gaiola por estações', () => {
  it('monta a grade com os pontos nomeados por estação e coluna, na ordem, e a normal para fora', () => {
    const g = gaiolaPorEstacoes({ eixo: 'z', estacoes: plana([0, 1, 2], () => tres) });
    expect(g.passo.vertices).toEqual(['e0_a', 'e0_b', 'e0_c', 'e1_a', 'e1_b', 'e1_c', 'e2_a', 'e2_b', 'e2_c']);
    expect(g.pontos.e1_c).toEqual([1, 2, 1]);
    expect(g.passo.faces).toEqual([['e0_a', 'e0_b', 'e1_b', 'e1_a'], ['e0_b', 'e0_c', 'e1_c', 'e1_b'], ['e1_a', 'e1_b', 'e2_b', 'e2_a'], ['e1_b', 'e1_c', 'e2_c', 'e2_b']]);
    expect(g.ponto('e2', 'b')).toBe('e2_b');
    expect(nomeDoPonto('e2', 'b', 'lado.')).toBe('lado.e2_b');
    // (sentido das colunas, +y) × (sentido das estações, +z) = +x
    for (const f of g.passo.faces) expect(normal(f.map((n) => g.pontos[n]))[0]).toBeGreaterThan(0);
    expect(gaiolaPorEstacoes({ eixo: 'z', virar: true, estacoes: plana([0, 1, 2], () => tres) }).passo.faces[0]).toEqual(['e1_a', 'e1_b', 'e0_b', 'e0_a']);
  });

  it('põe as coordenadas da coluna nos outros dois eixos, na ordem x, y, z, e w desloca ao longo do eixo', () => {
    const est = (eixo) => gaiolaPorEstacoes({ eixo, estacoes: [{ nome: 'p', em: 5, colunas: [col('a', 1, 2), col('b', 3, 4, {})] }, { nome: 'q', em: 6, colunas: [{ nome: 'a', em: [1, 2, 0.5] }, col('b', 3, 4)] }] }).pontos;
    expect(est('z').p_a).toEqual([1, 2, 5]);
    expect(est('y').p_a).toEqual([1, 5, 2]);
    expect(est('x').p_a).toEqual([5, 1, 2]);
    expect(est('z').q_a).toEqual([1, 2, 6.5]);
  });

  it('a coluna que começa ou termina entre duas que seguem fecha um pentágono', () => {
    const g = gaiolaPorEstacoes({ eixo: 'z', estacoes: plana([0, 1, 2], (k) => (k === 1 ? [['a', 0], ['m', 0.5], ['b', 1]] : [['a', 0], ['b', 1]])) });
    expect(g.passo.faces).toEqual([['e0_a', 'e0_b', 'e1_b', 'e1_m', 'e1_a'], ['e1_a', 'e1_m', 'e1_b', 'e2_b', 'e2_a']]);
    for (const f of g.passo.faces) expect(normal(f.map((n) => g.pontos[n]))[0]).toBeGreaterThan(0);
  });

  it('a fusão e a divisão declaradas por de fecham triângulos', () => {
    const fusao = gaiolaPorEstacoes({ eixo: 'z', estacoes: plana([0, 1], (k) => (k === 0 ? [['a', 0], ['m', 0.5], ['n', 0.6], ['b', 1]] : [['a', 0], ['mn', 0.55, { de: ['m', 'n'] }], ['b', 1]])) });
    expect(fusao.passo.faces).toEqual([['e0_a', 'e0_m', 'e1_mn', 'e1_a'], ['e0_m', 'e0_n', 'e1_mn'], ['e0_n', 'e0_b', 'e1_b', 'e1_mn']]);
    const divisao = gaiolaPorEstacoes({ eixo: 'z', estacoes: plana([0, 1], (k) => (k === 0 ? [['a', 0], ['m', 0.5], ['b', 1]] : [['a', 0], ['m1', 0.4, { de: ['m'] }], ['m2', 0.6, { de: ['m'] }], ['b', 1]])) });
    expect(divisao.passo.faces).toEqual([['e0_a', 'e0_m', 'e1_m1', 'e1_a'], ['e0_m', 'e1_m2', 'e1_m1'], ['e0_m', 'e0_b', 'e1_b', 'e1_m2']]);
    for (const g of [fusao, divisao]) for (const f of g.passo.faces) expect(normal(f.map((n) => g.pontos[n]))[0]).toBeGreaterThan(0);
  });

  it('o vão tira as faces da faixa de estações e colunas, e a borda dele fica livre', () => {
    const quatro = [...tres, ['d', 3]];
    const g = gaiolaPorEstacoes({ eixo: 'z', estacoes: plana([0, 1, 2, 3], () => quatro), vaos: [{ nome: 'janela', estacoes: ['e1', 'e2'], colunas: ['b', 'c'] }] });
    expect(g.passo.faces).toHaveLength(8);
    expect(g.passo.faces.some((f) => f.includes('e1_b') && f.includes('e2_c'))).toBe(false);
    // a borda do vão é aresta de uma face só
    const arestas = new Map();
    for (const f of g.passo.faces) f.forEach((p, k) => { const q = f[(k + 1) % f.length]; const c = [p, q].sort().join(); arestas.set(c, (arestas.get(c) ?? 0) + 1); });
    for (const c of ['e1_b,e1_c', 'e1_c,e2_c', 'e2_b,e2_c', 'e1_b,e2_b']) expect(arestas.get(c)).toBe(1);
    const neutro = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 1 }]], g.pontos);
    expect(neutro.orfaos).toEqual([]);
  });

  it('o vinco segue uma coluna ou uma estação por nome, e cantos e medidas marcam por estação, coluna ou os dois', () => {
    const g = gaiolaPorEstacoes({
      eixo: 'z', estacoes: plana([0, 1, 2, 3], () => tres),
      vincos: [{ nome: 'meio', coluna: 'b', nitidez: 'viva' }, { nome: 'curto', coluna: 'a', de: 'e1', ate: 'e2', nitidez: 0.5 }, { nome: 'travessa', estacao: 'e2', de: 'b', nitidez: 'nitidezDaTravessa' }],
      cantos: [{ estacao: 'e0', coluna: 'a' }], medidas: [{ coluna: 'c' }, { estacao: 'e1' }],
    });
    expect(g.passo.vincos).toEqual([
      { nome: 'meio', pontos: ['e0_b', 'e1_b', 'e2_b', 'e3_b'], nitidez: 'viva' },
      { nome: 'curto', pontos: ['e1_a', 'e2_a'], nitidez: 0.5 },
      { nome: 'travessa', pontos: ['e2_b', 'e2_c'], nitidez: 'nitidezDaTravessa' },
    ]);
    expect(g.passo.cantos).toEqual(['e0_a']);
    expect(g.passo.medidas).toEqual(['e0_c', 'e1_a', 'e1_b', 'e1_c', 'e2_c', 'e3_c']);
    expect(enderecosPorIndice(g.passo)).toEqual([]);
    const neutro = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 2 }]], { ...g.pontos, nitidezDaTravessa: 0.75 });
    expect(neutro.orfaos).toEqual([]);
    const P = [...neutro.V.values()];
    for (const m of g.passo.medidas) expect(Math.min(...P.map((p) => dist(p, g.pontos[m])))).toBeLessThan(1e-6);
  });

  it('a simetria em x passa ao passo e a costura sai lisa, como a gaiola espelhada à mão', () => {
    // seção do teto: da lateral (x = 1) à costura (x = 0)
    const estacoes = [0, 1, 2].map((z, k) => ({ nome: `e${k}`, em: z, colunas: [col('lado', 1, 0), col('teto', 0.6, 0.4), col('centro', 0, 0.5)] }));
    const g = gaiolaPorEstacoes({ eixo: 'z', simetria: 'x', estacoes });
    expect(g.passo.simetria).toBe('x');
    const neutro = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 2 }]], g.pontos);
    expect(neutro.orfaos).toEqual([]);
    const k = new Map(g.passo.vertices.map((n, i) => [n, i]));
    const mao = subdividirCatmullClark({ ...espelharGaiolaEmX({ vertices: g.passo.vertices.map((n) => g.pontos[n]), faces: g.passo.faces.map((f) => f.map((n) => k.get(n))) }), niveis: 2 });
    expect(JSON.stringify([...neutro.V.values()])).toBe(JSON.stringify(mao.vertices));
  });

  it('é determinística: a mesma definição dá a mesma saída, byte a byte', () => {
    const f = () => { const g = gaiolaPorEstacoes(definicaoAdensada()); return JSON.stringify([g.pontos, g.passo]); };
    expect(f()).toBe(f());
  });

  describe('grita com os nomes', () => {
    it('coluna inexistente em de, no vão, no vinco, em cantos e medidas', () => {
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], (k) => (k ? [['a', 0], ['b', 1, { de: ['x'] }]] : tres.slice(0, 2))) })).toBe("gaiola por estações: a coluna 'b' da estação 'e1' vem de 'x', que a estação 'e0' não tem");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], () => tres), vaos: [{ nome: 'v', estacoes: ['e0', 'e1'], colunas: ['a', 'z'] }] })).toBe("gaiola por estações: o vão 'v' cita a coluna 'z', que a estação 'e0' não tem");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], () => tres), vincos: [{ nome: 'v', coluna: 'z', nitidez: 1 }] })).toBe("gaiola por estações: o vinco 'v' segue a coluna 'z', que nenhuma estação tem");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], () => tres), vincos: [{ nome: 'v', estacao: 'e1', de: 'z', nitidez: 1 }] })).toBe("gaiola por estações: o vinco 'v' cita a coluna 'z', que a estação 'e1' não tem");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1, 2], (k) => (k === 1 ? [['a', 0], ['c', 2]] : tres)), vincos: [{ nome: 'v', coluna: 'b', nitidez: 1 }] })).toBe("gaiola por estações: o vinco 'v' segue a coluna 'b' da estação 'e0' à 'e2', mas a estação 'e1' não tem a coluna 'b'");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], () => tres), medidas: [{ estacao: 'e0', coluna: 'z' }] })).toBe("gaiola por estações: medidas[0] cita a coluna 'z', que a estação 'e0' não tem");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], () => tres), cantos: [{ estacao: 'e9' }] })).toBe("gaiola por estações: cantos[0] cita a estação 'e9', que não existe");
    });

    it('transição impossível: ligações que se cruzam, ponta sem ligação e face de mais de cinco lados', () => {
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], (k) => (k ? [['a', 0], ['c', 1, { de: ['c'] }], ['b', 2, { de: ['b'] }]] : tres)) }))
        .toBe("gaiola por estações: transição impossível entre as estações 'e0' e 'e1': as ligações 'b' → 'b' e 'c' → 'c' se cruzam");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], (k) => (k ? [['novo', -1], ...tres] : tres)) }))
        .toBe("gaiola por estações: transição impossível entre as estações 'e0' e 'e1': a primeira coluna de uma, 'a', precisa se ligar à primeira da outra, 'novo'; declare de: ['a'] na coluna 'novo'");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], (k) => (k ? [...tres, ['d', 3]] : tres)) })).toMatch(/a última coluna de uma, 'c', precisa se ligar à última da outra, 'd'/);
      const seis = grito({ eixo: 'z', estacoes: plana([0, 1], (k) => (k ? [['a', 0], ['m', 0.3], ['n', 0.6], ['c', 2]] : tres)) });
      expect(seis).toMatch(/transição impossível entre as estações 'e0' e 'e1': a face \['e0_a', 'e0_b', 'e0_c', 'e1_c', 'e1_n', 'e1_m', 'e1_a'\] tem 7 lados/);
    });

    it('vão que deixa ponto sem face, que cita coluna ausente ou com faixa invertida', () => {
      expect(grito({ eixo: 'z', estacoes: plana([0, 1, 2], () => tres), vaos: [{ nome: 'janela', estacoes: ['e0', 'e2'], colunas: ['a', 'c'] }] }))
        .toBe("gaiola por estações: o vão 'janela' deixa sem face os pontos 'e0_a', 'e0_b', 'e0_c', 'e1_a', 'e1_b', 'e1_c', 'e2_a', 'e2_b', 'e2_c'; tire esses pontos das estações do vão ou estreite o vão");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1, 2, 3], () => tres), vaos: [{ nome: 'janela', estacoes: ['e1', 'e3'], colunas: ['a', 'c'] }] })).toBe("gaiola por estações: o vão 'janela' deixa sem face os pontos 'e2_a', 'e2_b', 'e2_c', 'e3_a', 'e3_b', 'e3_c'; tire esses pontos das estações do vão ou estreite o vão");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1, 2], () => tres), vaos: [{ nome: 'borda', estacoes: ['e1', 'e2'], colunas: ['b', 'c'] }] })).toMatch(/o vão 'borda' deixa sem face o ponto 'e2_c'/);
      expect(grito({ eixo: 'z', estacoes: plana([0, 1, 2], (k) => (k === 1 ? [['a', 0], ['c', 2]] : tres)), vaos: [{ nome: 'v', estacoes: ['e0', 'e1'], colunas: ['a', 'b'] }] })).toBe("gaiola por estações: o vão 'v' cita a coluna 'b', que a estação 'e1' não tem");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1, 2], () => tres), vaos: [{ nome: 'v', estacoes: ['e0', 'e1'], colunas: ['a', 'a'] }] })).toBe("gaiola por estações: o vão 'v' vai da coluna 'a' à 'a', que na estação 'e0' precisa vir depois");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], () => tres), vaos: [{ nome: 'v', estacoes: ['e1', 'e0'], colunas: ['a', 'b'] }] })).toBe("gaiola por estações: o vão 'v' vai da estação 'e1' à 'e0', que precisa vir depois");
    });

    it('vinco sobre aresta que o vão ou a fusão tirou', () => {
      expect(grito({ eixo: 'z', estacoes: plana([0, 1, 2], (k) => (k === 1 ? [['a', 0], ['bc', 1.5, { de: ['b', 'c'] }]] : (k === 2 ? [['a', 0], ['b', 1, { de: ['bc'] }], ['c', 2, { de: ['bc'] }]] : tres))), vincos: [{ nome: 'v', coluna: 'b', nitidez: 1 }] }))
        .toBe("gaiola por estações: o vinco 'v' segue a coluna 'b' da estação 'e0' à 'e2', mas a estação 'e1' não tem a coluna 'b'");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], (k) => (k ? [['a', 0], ['b', 1, { de: ['a'] }], ['c', 2]] : tres)), vincos: [{ nome: 'v', coluna: 'b', nitidez: 1 }] }))
        .toBe("gaiola por estações: o vinco 'v' liga 'e0_b' a 'e1_b', que não formam aresta da gaiola (um vão, uma fusão ou uma divisão tirou essa aresta)");
    });

    it('estações fora de ordem, nomes repetidos, ponto com o mesmo nome e campo desconhecido', () => {
      expect(grito({ eixo: 'z', estacoes: plana([1, 0], () => tres) })).toBe("gaiola por estações: as estações vêm em ordem crescente de em, e 'e1' (0) não passa de 'e0' (1)");
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], () => [['a', 0], ['a', 1]]) })).toBe("gaiola por estações: a coluna 'a' aparece mais de uma vez na estação 'e0'");
      expect(grito({ eixo: 'z', estacoes: [{ nome: 'p_q', em: 0, colunas: [col('r', 0, 0), col('s', 0, 1)] }, { nome: 'p', em: 1, colunas: [col('q_r', 0, 0), col('s', 0, 1)] }] })).toMatch(/o ponto 'p_q_r' sai de duas estações e colunas \('p_q'\/'r' e 'p'\/'q_r'\)/);
      expect(grito({ eixo: 'z', estacoes: plana([0, 1], () => tres), vincos: [{ nome: 'v', coluna: 'a', nitidez: 1, arestas: [0, 1] }] })).toMatch(/o vinco 0 tem campo desconhecido 'arestas'/);
      expect(grito({ eixo: 'w', estacoes: plana([0, 1], () => tres) })).toMatch(/eixo precisa ser 'x', 'y' ou 'z'/);
    });

    it('na simetria em x: ponto com x < 0 e aresta da costura com duas faces', () => {
      const estacoes = [0, 1].map((z, k) => ({ nome: `e${k}`, em: z, colunas: [col('lado', 1, 0), col('centro', -0.1, 0.5)] }));
      expect(grito({ eixo: 'z', simetria: 'x', estacoes })).toBe("gaiola por estações: na simetria em x a gaiola é a metade x >= 0, e os pontos 'e0_centro', 'e1_centro' têm x < 0");
      // uma chapa deitada no plano x = 0: as arestas internas dela ficam na costura com duas faces
      expect(grito({ eixo: 'z', simetria: 'x', estacoes: plana([0, 1, 2], () => tres).map((e) => ({ ...e, colunas: e.colunas.map((c) => ({ ...c, em: [0, c.em[1]] })) })) }))
        .toMatch(/na simetria em x a aresta 'e0_b'-'e1_b' fica no plano x = 0 e tem duas faces na metade/);
    });
  });
});

/* A forma de prova: a mesma função amostrada pela gaiola adensada perto do vinco e pela grade cheia na densidade do
   vinco. As duas descem pela operação `subdivisao`, com os cantos da borda mantidos, e a distância entre as superfícies
   é medida de cada vértice da superfície limite de uma até os triângulos da outra, nos dois sentidos. */
describe('forma de prova da gaiola por estações', () => {
  const adensada = gaiolaPorEstacoes(definicaoAdensada());
  const cheia = gaiolaPorEstacoes(definicaoGradeCheia());
  const passo = (g, extra) => ['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2, ...extra }];

  it('sai com menos de um terço dos vértices da grade cheia, sem índice numérico e com triângulos e pentágonos na transição', () => {
    const a = nucleo([passo(adensada)], adensada.pontos);
    const c = nucleo([passo(cheia)], cheia.pontos);
    expect(a.orfaos).toEqual([]);
    expect(c.orfaos).toEqual([]);
    expect(adensada.passo.vertices).toHaveLength(472);
    expect(cheia.passo.vertices).toHaveLength(1596);
    expect(a.V.size).toBe(13603);
    expect(c.V.size).toBe(48671);
    expect(a.V.size * 3).toBeLessThan(c.V.size);
    expect(adensada.passo.vertices.length * 3).toBeLessThan(cheia.passo.vertices.length);
    expect(ladosDe(adensada.passo.faces)).toEqual({ 3: 6, 4: 404, 5: 6 });
    for (const g of [adensada, cheia]) {
      expect(enderecosPorIndice(g.passo)).toEqual([]);
      expect(JSON.stringify([g.passo.vertices, g.passo.faces, g.passo.vincos.map((v) => v.pontos), g.passo.cantos])).not.toMatch(/[[,]-?\d/);
    }
  });

  it('perto do vinco as duas têm os mesmos pontos: a mesma densidade', () => {
    const perto = (g) => g.passo.vertices.filter((n) => { const p = g.pontos[n]; return p[2] >= 1.05 && p[2] <= 1.9; }).filter((n) => /_(s0[4-9]|s1[0-2]|cintura)$/.test(n));
    expect(perto(adensada).length).toBe(18 * 9);
    expect(perto(adensada).every((n) => cheia.pontos[n] && dist(cheia.pontos[n], adensada.pontos[n]) === 0)).toBe(true);
    expect(perto(cheia)).toEqual(perto(adensada));
    expect(adensada.passo.vincos.map((v) => [v.nome, v.pontos.length, v.nitidez])).toEqual([['linhaDeCintura', 17, 'viva'], ['ombro', 40, 0.75]]);
    expect(adensada.ponto('z150', 'cintura')).toBe('z150_cintura');
    expect(adensada.pontos.z150_cintura).toEqual([...superficie(1.5, 9 / 16), 1.5]);
    expect(nomeDaColuna(9)).toBe('cintura');
  });

  it('medidas em pontos nomeados passam pela superfície, e a saída é bit a bit', () => {
    const medidas = [{ estacao: 'z020', coluna: 'ombro' }, { estacao: 'z120', coluna: 'ombro' }, { estacao: 'z220', coluna: 'ombro' }, { estacao: 'z150', coluna: 'cintura' }, { estacao: 'z130', coluna: 'vaoFora' }, { estacao: 'z060', coluna: 'soleira' }, { estacao: 'z100', coluna: 'centro' }];
    const g = gaiolaPorEstacoes({ ...definicaoAdensada(), medidas });
    expect(g.passo.medidas).toEqual(['z020_ombro', 'z060_soleira', 'z100_centro', 'z120_ombro', 'z130_vaoFora', 'z150_cintura', 'z220_ombro']);
    expect(enderecosPorIndice(g.passo)).toEqual([]);
    const neutro = nucleo([passo(g)], g.pontos);
    expect(neutro.orfaos).toEqual([]);
    const P = [...neutro.V.values()];
    for (const m of g.passo.medidas) {
      expect(Math.min(...P.map((p) => dist(p, g.pontos[m])))).toBeLessThan(1e-6);
      const imagem = [-g.pontos[m][0], g.pontos[m][1], g.pontos[m][2]];
      expect(Math.min(...P.map((p) => dist(p, imagem)))).toBeLessThan(1e-6);
    }
    expect(JSON.stringify(neutroCanonico(nucleo([passo(g)], g.pontos)))).toBe(JSON.stringify(neutroCanonico(neutro)));
  });

  it('a saída do ajudante para a forma de prova está congelada', () => {
    expect(sha256Hex(JSON.stringify([adensada.pontos, adensada.passo]))).toBe('aa1bf8bac54645eba4e7b21c7615064208713119045cfc848028ba9361fa2a1c');
  });

  it('a superfície adensada fica a menos de 5 mm da grade cheia, e perto do vinco a menos de 0,5 mm', () => {
    const malha = (g) => {
      const k = new Map(g.passo.vertices.map((n, i) => [n, i]));
      const vincos = g.passo.vincos.flatMap((v) => v.pontos.slice(1).map((q, j) => [k.get(v.pontos[j]), k.get(q), nitidezDoVinco(v.nitidez)]));
      const gaiola = espelharGaiolaEmX({ vertices: g.passo.vertices.map((n) => g.pontos[n]), faces: g.passo.faces.map((f) => f.map((n) => k.get(n))), vincos, cantos: g.passo.cantos.map((n) => k.get(n)) });
      const r = subdividirCatmullClark({ ...gaiola, niveis: 2, borda: 'cantos', aoLimite: true });
      return { V: r.vertices.filter((p) => p[0] >= 0), tris: r.faces.flatMap((f) => [[f[0], f[1], f[2]], [f[0], f[2], f[3]]]).map((t) => t.map((i) => r.vertices[i])) };
    };
    const A = malha(adensada), C = malha(cheia);
    const perto = (p) => p[2] >= 1.05 && p[2] <= 1.9 && p[1] >= 0.3 && p[1] <= 0.6 && p[0] > 0.5;
    const ac = distancias(A.V, C.tris), ca = distancias(C.V, A.tris);
    const maior = Math.max(...ac, ...ca);
    const pertoDoVinco = Math.max(...ac.filter((_, k) => perto(A.V[k])), ...ca.filter((_, k) => perto(C.V[k])));
    expect(maior).toBeLessThan(0.005);
    expect(pertoDoVinco).toBeLessThan(5e-4);
  });
});
