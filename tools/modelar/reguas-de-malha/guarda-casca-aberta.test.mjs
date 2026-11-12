/* A recusa de casca aberta no `guarda:acervo` (plano "costuras e furos limpos", fatia 3): o critério é o de `analisarTopologia` (`casca-aberta`, `aresta-nao-manifold`), e só o passo que declara
   superfície aberta é dispensado. Também a face de menos de 3 cantos entra na régua de face degenerada, como o adaptador a recusa. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../../procedural/nucleo/nucleo.js';
import { motivoDeCascaAberta, motivoDeFaceDegenerada } from '../guardas/guarda-acervo.mjs';

const executa = (passos, P = {}) => nucleo(passos, P, {}, {}, null, []);
const cubo = ['cubo', { origemId: 1, lado: 1 }];
const tira = (extra = {}) => ['lathe', { origemId: 2, lados: 8, perfil: [[0.1, 0], [0.2, 0.3], [0.15, 0.5]], ...extra }];

describe('recusa de casca aberta no guarda:acervo', () => {
  it('o sólido fechado passa', () => {
    expect(motivoDeCascaAberta(executa([cubo]), [cubo])).toBeNull();
  });
  it('a casca aberta de um passo sem declaração é recusada, com a aresta', () => {
    const passos = [cubo, ['apagaFace', { sel: { origem: { op: 'cubo', id: 1, face: 'topo' } } }]];
    const forma = executa(passos);
    expect(forma.orfaos).toEqual([]);
    expect(motivoDeCascaAberta(forma, passos)).toMatch(/ARESTA\(S\) DE CASCA ABERTA/);
  });
  it('o lathe com superficie: true é dispensado, e o mesmo perfil como sólido recusado', () => {
    const aberta = [tira({ superficie: true })];
    expect(motivoDeCascaAberta(executa(aberta), aberta)).toBeNull();
    const semDeclarar = [tira()];
    const forma = executa(semDeclarar);
    expect(forma.orfaos.length).toBeGreaterThan(0);
  });
  it('a dispensa vale só para as faces do passo que declarou: a face do cubo ao lado continua conferida', () => {
    const passos = [tira({ superficie: true }), ['cubo', { origemId: 3, lado: 1, em: [2, 0, 0] }], ['apagaFace', { sel: { origem: { op: 'cubo', id: 3, face: 'topo' } } }]];
    const forma = executa(passos);
    expect(forma.orfaos).toEqual([]);
    expect(motivoDeCascaAberta(forma, passos)).toMatch(/ARESTA\(S\) DE CASCA ABERTA/);
  });
  it('a face de menos de 3 cantos entra na régua de face degenerada, como o adaptador a recusa', () => {
    const V = new Map([[1, [0, 0, 0]], [2, [1, 0, 0]]]);
    expect(motivoDeFaceDegenerada({ V, F: new Map([[1, { id: 1, vs: [1, 2] }]]) })).toMatch(/1 FACE\(S\) DEGENERADA\(S\)/);
  });
});

/* gaiola fechada de uma subdivisão sem espessura: um cubo de 1 m com a tampa partida em quatro; `px` desloca o cubo, e `n` prefixa os nomes dos pontos */
function gaiola(origemId, n, dx = 0) {
  const base = {
    a0: [-0.5, 0, -0.5], a1: [0.5, 0, -0.5], a2: [0.5, 0, 0.5], a3: [-0.5, 0, 0.5], b0: [-0.5, 1, -0.5], b1: [0.5, 1, -0.5], b2: [0.5, 1, 0.5], b3: [-0.5, 1, 0.5],
    mN: [0, 1, -0.5], mE: [0.5, 1, 0], mS: [0, 1, 0.5], mW: [-0.5, 1, 0], C: [0, 1, 0],
  };
  const nome = (k) => `${n}${k}`;
  const pontos = Object.fromEntries(Object.entries(base).map(([k, p]) => [nome(k), [p[0] + dx, p[1], p[2]]]));
  const faces = [['a0', 'a1', 'a2', 'a3'], ['b0', 'mW', 'C', 'mN'], ['mN', 'C', 'mE', 'b1'], ['C', 'mS', 'b2', 'mE'], ['mW', 'b3', 'mS', 'C'],
    ['b0', 'mN', 'b1', 'a1', 'a0'], ['b1', 'mE', 'b2', 'a2', 'a1'], ['b2', 'mS', 'b3', 'a3', 'a2'], ['b3', 'mW', 'b0', 'a0', 'a3']].map((f) => f.map(nome));
  const vivo = (nm, ps) => ({ nome: `${n}${nm}`, pontos: ps.map(nome), nitidez: 'viva' });
  const passo = ['subdivisao', { origemId, vertices: Object.keys(pontos), faces, niveis: 1, cantos: ['a0', 'a1', 'a2', 'a3', 'b0', 'b1', 'b2', 'b3'].map(nome),
    vincos: [vivo('cruz', ['mW', 'C', 'mE']), vivo('topo', ['b0', 'mN', 'b1', 'mE', 'b2', 'mS', 'b3', 'mW', 'b0']), vivo('fundo', ['a0', 'a1', 'a2', 'a3', 'a0']),
      vivo('l1', ['a0', 'b0']), vivo('l2', ['a1', 'b1']), vivo('l3', ['a2', 'b2']), vivo('l4', ['a3', 'b3'])] }];
  return { passo, pontos };
}
/* apaga uma face da tampa (a de menor id com todos os cantos em y = 1) pelo id legado, o que a partição em quatro da tampa não deixa a região resolver */
const apagaTopo = (passos, pontos) => {
  const n = executa(passos, pontos);
  const topo = [...n.F.values()].filter((f) => f.vs.every((v) => Math.abs(n.V.get(v)[1] - 1) < 1e-9)).sort((x, y) => x.id - y.id)[0];
  return ['apagaFace', { face: topo.id }];
};

describe('a dispensa é só da borda livre que o próprio passo aberto deixou', () => {
  const executar = (P) => (prefixo) => executa(prefixo, P);
  it('a subdivisão fechada que perde uma face depois é recusada (4 ou mais arestas soltas)', () => {
    const { passo, pontos } = gaiola(2, 'a');
    const passos = [passo, apagaTopo([passo], pontos)];
    const forma = executa(passos, pontos);
    expect(forma.orfaos).toEqual([]);
    expect(motivoDeCascaAberta(forma, passos, executar(pontos))).toMatch(/ARESTA\(S\) DE CASCA ABERTA/);
  });
  it('a subdivisão fechada inteira passa: ela não tem borda e não conta como passo aberto', () => {
    const { passo, pontos } = gaiola(2, 'a');
    expect(motivoDeCascaAberta(executa([passo], pontos), [passo], executar(pontos))).toBeNull();
  });
  it('a união de duas subdivisões sem espessura que depois perde uma face não esconde a fresta', () => {
    const a = gaiola(2, 'a'), b = gaiola(3, 'b', 0.5);
    const pontos = { ...a.pontos, ...b.pontos };
    const uniao = [a.passo, b.passo, ['unir', { origemId: 9, solidos: [{ origem: { op: 'subdivisao', id: 2 } }, { origem: { op: 'subdivisao', id: 3 } }] }]];
    const passos = [...uniao, apagaTopo(uniao, pontos)];
    const forma = executa(passos, pontos);
    expect(forma.orfaos.filter((o) => o.op === 'unir')).toEqual([]);
    expect(motivoDeCascaAberta(forma, passos, executar(pontos))).toMatch(/ARESTA\(S\) DE CASCA ABERTA/);
  });
  it('a chapa aberta legítima continua dispensada, também ao lado de um sólido fechado', () => {
    const chapa = tira({ superficie: true });
    expect(motivoDeCascaAberta(executa([chapa]), [chapa])).toBeNull();
    const dois = [chapa, ['cubo', { origemId: 3, lado: 1, em: [2, 0, 0] }]];
    expect(motivoDeCascaAberta(executa(dois), dois)).toBeNull();
  });
});
