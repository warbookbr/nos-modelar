/* espessura.test.mjs — a espessura da superfície aberta: a função pura sobre placa, caixa aberta e tubo, o passo
   `subdivisao` com `espessura` (sólido fechado, partes citáveis, medidas na face externa, gritos com nomes) e o gate 4
   do plano da carroceria por subdivisão: a forma de prova da gaiola por estações com espessura sai fechada no
   `conferir-malha`, com volume igual à área vezes a espessura a 2%, sem auto-interseção, e grita com o lugar quando a
   espessura passa do raio local. */
import { describe, expect, it } from 'vitest';
import { espessarSuperficie, ErroDaEspessura } from './espessura.js';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { subdividirCatmullClark } from './subdivisao.js';
import { definicaoAdensada } from './fixtures/gaiola-por-estacoes-prova.js';
import { area, cruzamentos, distancias, triangulos, volume } from './fixtures/medidas-de-malha.js';
import { neutroCanonico, nucleo } from './entrada.js';
import { analisarTopologia } from './topologia.js';

/* O que o motor de micropolígono recusaria: casca aberta, não-manifold, orientação incoerente e triângulo de área nula. */
const RECUSA_DE_SAIDA = ['malha-aberta', 'nao-manifold', 'orientacao-incoerente', 'canto-repetido', 'area-nula', 'triangulo-degenerado'];
const recusasDeSaida = (malha) => analisarTopologia(malha, { triangulacao: true }).achados.filter((a) => RECUSA_DE_SAIDA.includes(a.codigo)).map((a) => a.mensagem);
import { auditarParDeSolidos, prepararSolido } from '../../src/autoria/contato-de-solidos.js';

const quadrado = { vertices: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], faces: [[0, 1, 2, 3]] };
/* a caixa de 1 m sem tampa, com a normal para fora */
const caixaAberta = {
  vertices: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
  faces: [[0, 3, 2, 1], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
};
/* o tubo aberto de raio r, com 24 lados, a normal para fora */
const tubo = (r = 0.1, lados = 24) => {
  const vertices = []; const faces = [];
  for (const z of [0, 0.5]) for (let k = 0; k < lados; k++) vertices.push([r * Math.cos((2 * Math.PI * k) / lados), r * Math.sin((2 * Math.PI * k) / lados), z]);
  for (let k = 0; k < lados; k++) { const j = (k + 1) % lados; faces.push([k, j, lados + j, lados + k]); }
  return { vertices, faces };
};
const malhaDoNeutro = (neutro) => {
  const ids = [...neutro.V.keys()]; const indice = new Map(ids.map((id, k) => [id, k]));
  return { vertices: ids.map((id) => neutro.V.get(id)), faces: [...neutro.F.values()].map((f) => f.vs.map((v) => indice.get(v))) };
};
/* O canto côncavo do painel da perua em x = 0, em metros: o capô (0 a 3, com o canto 2 entre a frente do capô e a rampa)
   e a rampa (1, 4, 5, 2). `partida` parte a face do capô com os pontos 6 (na borda do capô, a 300 mm do canto) e 7. */
const cantoConcavo = (partida = false) => {
  const P = (z, y) => [0, y / 1000, z / 1000];
  const vertices = [P(1100, 980), P(1100, 1110), P(1180, 1110), P(2342, 980), P(979, 1190), P(1059, 1190)];
  if (!partida) return { vertices, faces: [[0, 1, 2, 3], [1, 4, 5, 2]] };
  return { vertices: [...vertices, P(1480, 1076.4), P(1480, 980)], faces: [[0, 1, 2, 7], [7, 2, 6], [7, 6, 3], [1, 4, 5, 2]] };
};
const codigos = (topologia) => topologia.achados.map((a) => a.codigo);
const grito = (fn) => { try { fn(); } catch (e) { return e; } throw new Error('não gritou'); };

describe('espessarSuperficie', () => {
  it('o quadrado vira placa: a face externa fica, a interna anda a espessura, a parede fecha as quatro bordas', () => {
    const r = espessarSuperficie({ ...quadrado, espessura: 0.1 });
    expect(r.vertices.slice(0, 4)).toEqual(quadrado.vertices);
    expect(r.vertices.slice(4)).toEqual(quadrado.vertices.map(([x, y]) => [x, y, -0.1]));
    expect(r.faces).toHaveLength(6);
    expect(r.partes).toEqual({ externa: [0], interna: [1], borda: [2, 3, 4, 5] });
    expect(volume(r.vertices, r.faces)).toBeCloseTo(0.1, 14);
    expect(analisarTopologia({ vertices: r.vertices, faces: r.faces }).veredito).toBe('aprova');
    expect(r.raioMinimo).toBe(Infinity);
  });

  it("lado: 'normal' põe o material a favor da normal, e o sólido sai com a normal para fora", () => {
    const r = espessarSuperficie({ ...quadrado, espessura: 0.1, lado: 'normal' });
    expect(r.vertices.slice(0, 4)).toEqual(quadrado.vertices);
    expect(r.vertices.slice(4)).toEqual(quadrado.vertices.map(([x, y]) => [x, y, 0.1]));
    expect(volume(r.vertices, r.faces)).toBeCloseTo(0.1, 14);
    expect(r.faces[0]).toEqual([3, 2, 1, 0]);
  });

  it('na dobra viva e no canto, a esquadria põe a face interna a uma espessura de cada face externa', () => {
    const r = espessarSuperficie({ ...caixaAberta, espessura: 0.1 });
    const interno = r.vertices.slice(8);
    const perto = (p, q) => p.every((c, k) => Math.abs(c - q[k]) < 1e-12);
    expect(perto(interno[0], [0.1, 0.1, 0.1])).toBe(true);
    expect(perto(interno[6], [0.9, 0.9, 1])).toBe(true);
    // a caixa de 1 m menos a cavidade de 0,8 × 0,8 × 0,9
    expect(volume(r.vertices, r.faces)).toBeCloseTo(1 - 0.8 * 0.8 * 0.9, 12);
    expect(r.partes.borda).toHaveLength(4);
    expect(analisarTopologia({ vertices: r.vertices, faces: r.faces }).veredito).toBe('aprova');
  });

  it('grita com o lugar quando a espessura passa do raio local do lado do material, e aceita abaixo dele', () => {
    const e = grito(() => espessarSuperficie({ ...tubo(), espessura: 0.15 }));
    expect(e).toBeInstanceOf(ErroDaEspessura);
    expect(e.message).toMatch(/a espessura 0\.15 passa do raio de curvatura local, que chega a 0\.0991$/);
    expect(e.raio).toBeGreaterThan(0.099);
    expect(e.raio).toBeLessThan(0.1);
    expect(e.lugares.length).toBeGreaterThan(0);
    for (const l of e.lugares) expect(Math.hypot(l.ponto[0], l.ponto[1])).toBeLessThan(0.1);
    const ok = espessarSuperficie({ ...tubo(), espessura: 0.05 });
    expect(ok.raioMinimo).toBe(e.raio);
    expect(cruzamentos(ok.vertices, ok.faces)).toEqual([]);
    // por fora, o tubo não curva para o lado do material, e nenhuma espessura dobra a face
    expect(espessarSuperficie({ ...tubo(), espessura: 0.15, lado: 'normal' }).raioMinimo).toBe(Infinity);
  });

  it('grita quando a superfície plana se dobra sobre si no canto côncavo, onde a face interna saía 3,3 mm à frente da externa', () => {
    /* duas faces planas em x = 0 com o canto côncavo do painel da perua (o capô encontra a rampa do para-brisa em z 1180,
       y 1110, mm), a face do capô com 174 graus no canto; em nível 2 a subdivisão vira uma face junto do canto */
    const { vertices, faces } = subdividirCatmullClark({ ...cantoConcavo(), niveis: 2, borda: 'cantos', cantos: [0, 1, 2, 3, 4, 5] });
    const lado = (f, V = vertices) => Math.sign(f.reduce((s, i, k) => { const a = V[i], b = V[f[(k + 1) % f.length]]; return s + (a[1] - b[1]) * (a[2] + b[2]); }, 0));
    expect(faces.filter((f) => lado(f) !== lado(faces[0]))).toHaveLength(1);
    const e = grito(() => espessarSuperficie({ vertices, faces, espessura: 0.0015 }));
    expect(e).toBeInstanceOf(ErroDaEspessura);
    expect(e.tipo).toBe('dobra');
    expect(e.message).toMatch(/^espessura: a superfície se dobra sobre si: em 4 vértice\(s\) uma face em volta fica a 180 graus da normal do vértice/);
    // o canto da gaiola (o índice 2 fica no refino) é um dos lugares, e todos ficam a menos de 60 mm dele
    expect(e.lugares.map((l) => l.vertices[0])).toContain(2);
    for (const l of e.lugares) expect(Math.hypot(l.ponto[1] - 1.11, l.ponto[2] - 1.18)).toBeLessThan(0.06);
    // a mesma chapa com a face do capô partida por um ponto da gaiola não vira, e toda a face interna fica no plano x = -t
    const partida = subdividirCatmullClark({ ...cantoConcavo(true), niveis: 2, borda: 'cantos', cantos: [0, 1, 2, 3, 4, 5, 6, 7] });
    const ok = espessarSuperficie({ ...partida, espessura: 0.0015 });
    const internos = ok.vertices.slice(partida.vertices.length);
    expect(Math.max(...internos.map((p) => Math.abs(p[0] * lado(partida.faces[0], partida.vertices) + 0.0015)))).toBeLessThan(1e-12);
  });

  it('nenhum vértice interno fica à frente de uma face externa em volta, na placa, na caixa aberta e no tubo', () => {
    for (const malha of [quadrado, caixaAberta, tubo()]) {
      const r = espessarSuperficie({ ...malha, espessura: 0.05 });
      const n = malha.vertices.length;
      malha.faces.forEach((f) => {
        const [a, b, c] = f.map((i) => malha.vertices[i]);
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const nf = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        for (const i of f) { const p = r.vertices[n + i]; expect((p[0] - a[0]) * nf[0] + (p[1] - a[1]) * nf[1] + (p[2] - a[2]) * nf[2]).toBeLessThan(0); }
      });
    }
  });

  it('recusa superfície que não é variedade orientada, espessura inválida e lado desconhecido', () => {
    expect(grito(() => espessarSuperficie({ vertices: quadrado.vertices, faces: [[0, 1, 2], [0, 1, 3]], espessura: 0.1 })).message).toMatch(/não é orientada/);
    const leque = { vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]], faces: [[0, 1, 2], [1, 0, 3], [0, 1, 4]] };
    expect(grito(() => espessarSuperficie({ ...leque, espessura: 0.1 }))).toBeInstanceOf(ErroDaEspessura);
    expect(grito(() => espessarSuperficie({ ...quadrado, espessura: 0 })).message).toMatch(/maior que zero/);
    expect(grito(() => espessarSuperficie({ ...quadrado, espessura: 0.1, lado: 'dentro' })).message).toMatch(/lado precisa ser 'contraNormal' ou 'normal'/);
  });
});

/* Uma chapa curva por estações: quatro estações de cinco colunas, abaulada em y, com um vão no meio. */
const chapa = (extra = {}) => gaiolaPorEstacoes({
  eixo: 'z',
  estacoes: ['a', 'b', 'c', 'd'].map((nome, k) => ({ nome, em: k * 0.3, colunas: ['c0', 'c1', 'c2', 'c3', 'c4'].map((c, j) => ({ nome: c, em: [0.6 - 0.02 * (j - 2) ** 2, j * 0.2] })) })),
  vaos: [{ nome: 'janela', estacoes: ['b', 'c'], colunas: ['c1', 'c3'] }],
  ...extra,
});

describe('subdivisao com espessura', () => {
  it('fecha o sólido com parede no contorno e no vão, e publica externa, interna e borda', () => {
    const g = chapa({ medidas: [{ estacao: 'b', coluna: 'c0' }, { estacao: 'd', coluna: 'c4' }] });
    const neutro = nucleo([
      ['subdivisao', { origemId: 1, ...g.passo, niveis: 2, espessura: 0.01 }],
      ['solido', { sel: { origem: { op: 'subdivisao', id: 1, parte: 'interna' } } }],
    ], g.pontos);
    expect(neutro.orfaos).toEqual([]);
    const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F });
    expect(topologia.veredito).toBe('aprova');
    expect(topologia.resumo.bordas).toBe(0);
    const faces = [...neutro.F.values()];
    const internas = faces.filter((f) => f.solido).length;
    expect(internas * 2).toBeLessThan(faces.length);
    // o contorno da chapa e o do vão viram parede: 2 × (5 + 3) × 4 arestas no nível 2, mais o vão de 2 × (2 + 1) × 4
    expect(faces.length - 2 * internas).toBe(2 * (4 + 3) * 4 + 2 * (2 + 1) * 4);
    // as medidas ficam na face externa: são vértices da malha
    const P = [...neutro.V.values()];
    for (const m of g.passo.medidas) expect(Math.min(...P.map((p) => Math.hypot(p[0] - g.pontos[m][0], p[1] - g.pontos[m][1], p[2] - g.pontos[m][2])))).toBeLessThan(1e-6);
    expect(volume(...Object.values(malhaDoNeutro(neutro)))).toBeGreaterThan(0);
  });

  it('a espessura aceita nome de PARAMS e é bit a bit', () => {
    const g = chapa();
    const passos = [['subdivisao', { origemId: 1, ...g.passo, niveis: 2, espessura: 'chapa' }]];
    const a = nucleo(passos, { ...g.pontos, chapa: 0.01 });
    expect(a.orfaos).toEqual([]);
    expect(JSON.stringify(neutroCanonico(nucleo(passos, { ...g.pontos, chapa: 0.01 })))).toBe(JSON.stringify(neutroCanonico(a)));
  });

  it('grita com o nome do ponto da gaiola quando a espessura passa do raio local, e não gera malha', () => {
    /* um tubo de raio 0,1 m: três anéis de oito pontos nomeados, com a normal para fora */
    const aneis = ['baixo', 'meio', 'alto'];
    const nome = (a, k) => `${aneis[a]}_p${k % 8}`;
    const pontos = {};
    aneis.forEach((_, a) => { for (let k = 0; k < 8; k++) pontos[nome(a, k)] = [0.1 * Math.cos((Math.PI * k) / 4), 0.1 * Math.sin((Math.PI * k) / 4), 0.2 * a]; });
    const faces = [];
    for (let a = 0; a < 2; a++) for (let k = 0; k < 8; k++) faces.push([nome(a, k), nome(a, k + 1), nome(a + 1, k + 1), nome(a + 1, k)]);
    const passo = { vertices: Object.keys(pontos), faces };
    const ok = nucleo([['subdivisao', { origemId: 1, ...passo, niveis: 2, espessura: 0.02 }]], pontos);
    expect(ok.orfaos).toEqual([]);
    const neutro = nucleo([['subdivisao', { origemId: 1, ...passo, niveis: 2, espessura: 0.2 }]], pontos);
    expect(neutro.V.size).toBe(0);
    expect(neutro.orfaos).toHaveLength(1);
    expect(neutro.orfaos[0].ref).toBe('espessura');
    expect(neutro.orfaos[0].motivo).toMatch(/^a espessura 0\.2 passa do raio de curvatura local, que chega a 0\.0\d+, perto de '(baixo|meio|alto)_p\d' \(raio /);
  });

  it('grita com o nome do canto côncavo quando a superfície se dobra sobre si, e não gera malha', () => {
    const nomes = ['capoTras', 'cinturaTras', 'cantoDoCapo', 'capoFrente', 'rampaTras', 'rampaFrente'];
    const { vertices } = cantoConcavo();
    const pontos = Object.fromEntries(nomes.map((n, k) => [n, vertices[k]]));
    const passo = { vertices: nomes, faces: [['capoTras', 'cinturaTras', 'cantoDoCapo', 'capoFrente'], ['cinturaTras', 'rampaTras', 'rampaFrente', 'cantoDoCapo']], cantos: nomes, borda: 'cantos', niveis: 2 };
    expect(nucleo([['subdivisao', { origemId: 1, ...passo }]], pontos).orfaos).toEqual([]);
    const neutro = nucleo([['subdivisao', { origemId: 1, ...passo, espessura: 0.0015 }]], pontos);
    expect(neutro.V.size).toBe(0);
    expect(neutro.orfaos).toHaveLength(1);
    expect(neutro.orfaos[0].ref).toBe('espessura');
    expect(neutro.orfaos[0].motivo).toMatch(/^a superfície se dobra sobre si: .*, perto de 'cantoDoCapo' \(em \[0, 1\.11, 1\.18\]\)/);
    expect(neutro.orfaos[0].motivo).toMatch(/um ponto novo da gaiola que parta essa face a desfaz/);
    expect(neutro.orfaos[0].motivo).not.toMatch(/raio/);
  });

  it('lado sem espessura, espessura zero, lado desconhecido e parte sem espessura gritam', () => {
    const g = chapa();
    const motivo = (extra, passos = []) => nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 1, ...extra }], ...passos], g.pontos).orfaos.map((o) => o.motivo).join(' | ');
    expect(motivo({ lado: 'normal' })).toMatch(/lado só vale com espessura/);
    expect(motivo({ espessura: 0 })).toMatch(/a espessura precisa ser maior que zero/);
    expect(motivo({ espessura: 0.01, lado: 'dentro' })).toMatch(/lado precisa ser 'contraNormal'/);
    expect(motivo({}, [['solido', { sel: { origem: { op: 'subdivisao', id: 1, parte: 'interna' } } }]])).toMatch(/não tem espessura, e parte só existe com espessura/);
    expect(motivo({ espessura: 0.01 }, [['solido', { sel: { origem: { op: 'subdivisao', id: 1, parte: 'avesso' } } }]])).toMatch(/parte opcional \('externa', 'interna' ou 'borda'/);
  });
});

/* Gate 4: a forma de prova da fatia 4, em nível 2 com a simetria e os cantos da borda, com 2 mm de chapa. */
describe('forma de prova com espessura', () => {
  const ESPESSURA = 0.002;
  const g = gaiolaPorEstacoes(definicaoAdensada());
  const passo = (extra) => ['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2, ...extra }];
  const superficie = nucleo([passo()], g.pontos);
  const solido = nucleo([passo({ espessura: ESPESSURA })], g.pontos);
  const S = malhaDoNeutro(superficie); const M = malhaDoNeutro(solido);

  it('sai fechada no conferir-malha, onde a superfície sem espessura tinha casca aberta', () => {
    expect(solido.orfaos).toEqual([]);
    expect(M.vertices).toHaveLength(2 * S.vertices.length);
    const aberta = analisarTopologia({ vertices: superficie.V, faces: superficie.F });
    expect(codigos(aberta)).toContain('casca-aberta');
    const topologia = analisarTopologia({ vertices: solido.V, faces: solido.F });
    expect(topologia.veredito).toBe('aprova');
    expect(topologia.resumo.bordas).toBe(0);
    expect(topologia.resumo.componentes).toBe(1);
    expect(recusasDeSaida({ vertices: solido.V, faces: solido.F })).toEqual([]);
  });

  it('o volume é a área da face externa vezes a espessura, a 2%', () => {
    const A = area(S.vertices, S.faces); const V = volume(M.vertices, M.faces);
    expect(A).toBeGreaterThan(6.3);
    expect(Math.abs(V / (A * ESPESSURA) - 1)).toBeLessThan(0.02);
  });

  it('não se cruza, e a face interna fica a uma espessura da externa', () => {
    expect(cruzamentos(M.vertices, M.faces)).toEqual([]);
    const externa = triangulos(S.faces).map((t) => t.map((i) => S.vertices[i]));
    const d = distancias(M.vertices.slice(S.vertices.length), externa);
    expect(Math.min(...d)).toBeGreaterThan(0.99 * ESPESSURA);
    expect(Math.max(...d)).toBeLessThan(1.001 * ESPESSURA);
  });

  it('o contato e o volume do núcleo leem o sólido: fechado, invadido por um cubo na chapa e separado de um cubo longe', () => {
    const chapa = prepararSolido(solido, null, 'chapa');
    expect(chapa.fechada).toBe(true);
    expect(chapa.inconclusivo).toBeUndefined();
    const cubo = (em) => prepararSolido(nucleo([['cubo', { origemId: 1, lado: 0.2, em }]]), null, 'cubo');
    expect(auditarParDeSolidos(chapa, cubo([0.8, 0.45, 0.6]), 1e-9).estado).toBe('interpenetram');
    expect(auditarParDeSolidos(chapa, cubo([0, 0.45, 1.2]), 1e-9).estado).toBe('separadas');
  });

  it('o raio local mínimo fica no vinco vivo; abaixo dele passa, acima dele grita com os pontos do vinco', () => {
    const pontoDe = (n) => g.passo.vertices.indexOf(n);
    expect(pontoDe('z165_cintura')).toBeGreaterThan(-1);
    const abaixo = nucleo([passo({ espessura: 0.029 })], g.pontos);
    expect(abaixo.orfaos).toEqual([]);
    const acima = nucleo([passo({ espessura: 0.05 })], g.pontos);
    expect(acima.V.size).toBe(0);
    expect(acima.orfaos[0].motivo).toMatch(/^a espessura 0\.05 passa do raio de curvatura local, que chega a 0\.03, perto de 'z165_cintura' e a imagem espelhada \(raio 0\.03 em \[0\.81, 0\.483, 1\.66\]\)/);
    expect(acima.orfaos[0].motivo).toMatch(/no vinco vivo o raio local é a largura da faixa de faces ao lado dele e cai pela metade a cada nível/);
  });

  it('é bit a bit', () => {
    expect(JSON.stringify(neutroCanonico(nucleo([passo({ espessura: ESPESSURA })], g.pontos)))).toBe(JSON.stringify(neutroCanonico(solido)));
  });
});
