/* selecao-geometrica.test.mjs — `sel.onde`: face e aresta por propriedade geométrica, sem identificador numérico.
   As expectativas vêm de contas sobre as coordenadas da malha que o próprio núcleo devolve (todos os cantos de uma
   face no mesmo y, o par de pontas de uma aresta), nunca de ids escritos à mão. */
import { describe, expect, it } from 'vitest';
import { neutroCanonico, nucleo } from './entrada.js';
import { normalDaFace } from './nucleo.js';
import { lerOnde, resolverOnde } from './selecao-geometrica.js';
import { sha256Hex } from './sha256.js';

const rodar = (passos) => nucleo(passos, {}, {}, {}, null, [], {});
const CAIXA = [['cubo', { origemId: 1, larg: 2, alt: 1, prof: 3 }]];
const CILINDRO = [['cilindro', { origemId: 1, raio: 1, altura: 2, lados: 8 }]];
const DUAS_CAIXAS = [
  ['cubo', { origemId: 1, larg: 2, alt: 1, prof: 3 }],
  ['cubo', { origemId: 2, larg: 1, alt: 2, prof: 1, em: [5, 0, 0] }],
];
const ORIGEM_1 = { op: 'cubo', id: 1 };

const pontos = (n, vs) => vs.map((v) => n.V.get(v));
const todosEm = (n, vs, eixo, valor) => pontos(n, vs).every((p) => Math.abs(p[eixo] - valor) < 1e-9);

/* faces escolhidas por um `sel`, lidas por uma peça nomeada: o caminho que a receita usa */
function facesDe(passos, sel) {
  const n = rodar([...passos, ['parte', { nome: 'alvo', sel }]]);
  const ids = [...n.F.values()].filter((f) => f.parte === 'alvo').map((f) => f.id).sort((a, b) => a - b);
  return { n, ids };
}
/* `onde` direto sobre a malha, para ler também as arestas. O leitor cobre só números e vetores literais; nome de PARAM
   é provado pelo núcleo inteiro, nos testes por `sel`. */
const leitor = (n) => ({ V: n.V, F: n.F, num: (x) => x, vec: (a) => a });
function onde(passos, pedido, base = null) {
  const n = rodar(passos);
  const lido = lerOnde(leitor(n), pedido);
  if (lido.erro) return { erro: lido.erro, n };
  return { ...resolverOnde(leitor(n), lido.onde, base, normalDaFace), n };
}

describe('faces por direção da normal', () => {
  it('numa caixa, a face de cima é a única com normal a até 5 graus de +y', () => {
    const { n, ids } = facesDe(CAIXA, { onde: { normal: { dir: [0, 1, 0], ate: 5 } } });
    expect(n.orfaos).toEqual([]);
    expect(ids).toHaveLength(1);
    const vs = n.F.get(ids[0]).vs;
    expect(todosEm(n, vs, 1, 1)).toBe(true);
    expect(normalDaFace(n.V, vs)[1]).toBeCloseTo(1, 12);
  });

  it('a abertura do cone conta: 90 graus de +y pega as quatro laterais e o topo, e a de baixo fica de fora', () => {
    const { n, ids } = facesDe(CAIXA, { onde: { normal: { dir: [0, 1, 0], ate: 90 } } });
    expect(ids).toHaveLength(5);
    expect(ids.some((id) => todosEm(n, n.F.get(id).vs, 1, 0))).toBe(false);
  });

  it('o vetor não precisa vir normalizado nem alinhado a um eixo', () => {
    const a = facesDe(CAIXA, { onde: { normal: { dir: [0, 7, 0], ate: 1 } } });
    const b = facesDe(CAIXA, { onde: { normal: { dir: [1, 1, 0], ate: 50 } } });
    expect(a.ids).toHaveLength(1);
    expect(b.ids).toHaveLength(2);
  });

  it('aceita nome de PARAM no vetor e no ângulo', () => {
    const n = nucleo([...CAIXA, ['parte', { nome: 'alvo', sel: { onde: { normal: { dir: 'cima', ate: 'abertura' } } } }]], { abertura: 5, cima: [0, 1, 0] }, {}, {}, null, [], {});
    expect(n.orfaos).toEqual([]);
    expect([...n.F.values()].filter((f) => f.parte === 'alvo')).toHaveLength(1);
  });
});

describe('faces por posição extrema', () => {
  it('a face mais à frente (z máximo) é a que tem todos os cantos em z = metade da profundidade', () => {
    const { n, ids } = facesDe(CAIXA, { onde: { extremo: { eixo: 'z', lado: 'max' } } });
    expect(ids).toHaveLength(1);
    expect(todosEm(n, n.F.get(ids[0]).vs, 2, 1.5)).toBe(true);
  });

  it('o lado min pega a de trás, e o eixo x a lateral esquerda', () => {
    const tras = facesDe(CAIXA, { onde: { extremo: { eixo: 'z', lado: 'min' } } });
    expect(todosEm(tras.n, tras.n.F.get(tras.ids[0]).vs, 2, -1.5)).toBe(true);
    const esq = facesDe(CAIXA, { onde: { extremo: { eixo: 'x', lado: 'min' } } });
    expect(todosEm(esq.n, esq.n.F.get(esq.ids[0]).vs, 0, -1)).toBe(true);
  });

  it('a tolerância soma as faces que ficam a até tol do extremo', () => {
    // as quatro laterais têm o centro em y = 0,5 e a de cima em y = 1: com tol 0,5 entram as cinco
    expect(facesDe(CAIXA, { onde: { extremo: { eixo: 'y', lado: 'max' } } }).ids).toHaveLength(1);
    expect(facesDe(CAIXA, { onde: { extremo: { eixo: 'y', lado: 'max', tol: 0.5 } } }).ids).toHaveLength(5);
    expect(facesDe(CAIXA, { onde: { extremo: { eixo: 'y', lado: 'max', tol: 0.49 } } }).ids).toHaveLength(1);
  });

  it('o extremo é medido entre os que sobraram da normal: a mais alta entre as que olham para os lados', () => {
    const r = onde(CAIXA, { normal: { dir: [1, 0, 0], ate: 90 }, extremo: { eixo: 'x', lado: 'max' } });
    expect(r.faces).toHaveLength(1);
    expect(todosEm(r.n, r.n.F.get(r.faces[0]).vs, 0, 1)).toBe(true);
  });
});

describe('face plana', () => {
  it('todas as faces de uma caixa e de um cilindro facetado são planas', () => {
    expect(onde(CAIXA, { tipo: 'plana' }).faces).toHaveLength(6);
    expect(onde(CILINDRO, { tipo: 'plana' }).faces).toHaveLength(10);
    expect(() => onde(CAIXA, { tipo: 'empenada' })).not.toThrow();
  });

  it('um canto levantado empena a face de cima: ela sai de plana e entra em empenada', () => {
    const passos = [...CAIXA, ['moveV', { v: 4, d: [0, 0.3, 0] }]];
    const plana = onde(passos, { tipo: 'plana', normal: { dir: [0, 1, 0], ate: 30 } });
    const empenada = onde(passos, { tipo: 'empenada' });
    expect(empenada.faces).toHaveLength(1);
    expect(plana.erro).toMatch(/seleção onde vazia/);
  });
});

describe('arestas', () => {
  it('uma caixa tem 12 arestas vivas acima de 45 graus, e nenhuma lisa nem de borda', () => {
    const viva = onde(CAIXA, { tipo: 'viva', angulo: 45 });
    expect(viva.arestas).toHaveLength(12);
    expect(viva.vertices).toHaveLength(8);
    expect(onde(CAIXA, { tipo: 'lisa', angulo: 45 }).erro).toMatch(/seleção onde vazia/);
    expect(onde(CAIXA, { tipo: 'borda' }).erro).toMatch(/seleção onde vazia/);
  });

  it('acima é estritamente acima: a quina de 90 graus entra em 89,9 e fica de fora em 90', () => {
    expect(onde(CAIXA, { tipo: 'viva', angulo: 89.9 }).arestas).toHaveLength(12);
    expect(onde(CAIXA, { tipo: 'viva', angulo: 90 }).erro).toMatch(/seleção onde vazia/);
    expect(onde(CAIXA, { tipo: 'lisa', angulo: 90 }).arestas).toHaveLength(12);
  });

  it('as arestas de cima de uma caixa: as quatro que ficam em y máximo', () => {
    const r = onde(CAIXA, { alvo: 'aresta', extremo: { eixo: 'y', lado: 'max' } });
    expect(r.arestas).toHaveLength(4);
    for (const [a, b] of r.arestas) expect(todosEm(r.n, [a, b], 1, 1)).toBe(true);
  });

  it('as arestas da face de cima por normal dão as mesmas quatro, e a de cima à frente é uma só', () => {
    const porNormal = onde(CAIXA, { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 } });
    const porPosicao = onde(CAIXA, { alvo: 'aresta', extremo: { eixo: 'y', lado: 'max' } });
    expect(porNormal.arestas).toEqual(porPosicao.arestas);
    const frente = onde(CAIXA, { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } });
    expect(frente.arestas).toHaveLength(1);
    expect(todosEm(frente.n, frente.arestas[0], 2, 1.5)).toBe(true);
    expect(todosEm(frente.n, frente.arestas[0], 1, 1)).toBe(true);
  });

  it('a tolerância larga soma as arestas de baixo (centro em y = 0) e as verticais (centro em y = 0,5)', () => {
    const r = onde(CAIXA, { alvo: 'aresta', extremo: { eixo: 'y', lado: 'min', tol: 0.5 } });
    expect(r.arestas).toHaveLength(8);   // 4 de baixo (y = 0) e 4 verticais (centro em y = 0,5)
  });

  it('aresta de borda: ao apagar a tampa, as quatro arestas do vão passam a ter uma face só', () => {
    const n0 = rodar(CAIXA);
    const topo = [...n0.F.values()].find((f) => todosEm(n0, f.vs, 1, 1));
    const passos = [...CAIXA, ['apagaFace', { face: topo.id }]];
    const borda = onde(passos, { tipo: 'borda' });
    expect(borda.arestas).toHaveLength(4);
    for (const [a, b] of borda.arestas) expect(todosEm(borda.n, [a, b], 1, 1)).toBe(true);
    expect(onde(passos, { tipo: 'viva', angulo: 45 }).arestas).toHaveLength(8);
  });

  it('num cilindro de 8 lados, as arestas da tampa de cima são as 8 vivas acima de 60 graus em y máximo', () => {
    const todas = onde(CILINDRO, { tipo: 'viva', angulo: 60 });
    expect(todas.arestas).toHaveLength(16);   // as duas bordas de tampa; as 8 verticais dobram 45 graus
    const tampa = onde(CILINDRO, { tipo: 'viva', angulo: 60, extremo: { eixo: 'y', lado: 'max' } });
    expect(tampa.arestas).toHaveLength(8);
    for (const [a, b] of tampa.arestas) expect(todosEm(tampa.n, [a, b], 1, 2)).toBe(true);
    expect(tampa.vertices).toHaveLength(8);
    expect(onde(CILINDRO, { tipo: 'viva', angulo: 30 }).arestas).toHaveLength(24);
    expect(onde(CILINDRO, { tipo: 'lisa', angulo: 30 }).erro).toMatch(/seleção onde vazia/);
    expect(onde(CILINDRO, { alvo: 'aresta', normal: { dir: [0, -1, 0], ate: 1 } }).arestas).toHaveLength(8);
  });

  it('o tipo decide o alvo quando ele é omitido, e a aresta não devolve face', () => {
    const r = onde(CAIXA, { tipo: 'viva', angulo: 45 });
    expect(r.faces).toEqual([]);
    expect(r.arestas).toHaveLength(12);
  });
});

describe('combinação com os outros seletores', () => {
  it('a face de cima só da origem pedida: sem origem são duas caixas, com origem é uma', () => {
    const sozinha = facesDe(DUAS_CAIXAS, { onde: { normal: { dir: [0, 1, 0], ate: 5 } } });
    expect(sozinha.ids).toHaveLength(2);
    const dentro = facesDe(DUAS_CAIXAS, { origem: ORIGEM_1, onde: { normal: { dir: [0, 1, 0], ate: 5 } } });
    expect(dentro.ids).toHaveLength(1);
    expect(todosEm(dentro.n, dentro.n.F.get(dentro.ids[0]).vs, 1, 1)).toBe(true);
    const outra = facesDe(DUAS_CAIXAS, { origem: { op: 'cubo', id: 2 }, onde: { normal: { dir: [0, 1, 0], ate: 5 } } });
    expect(todosEm(outra.n, outra.n.F.get(outra.ids[0]).vs, 1, 2)).toBe(true);
  });

  it('o extremo vale dentro da origem: a mais alta da caixa baixa não é a da caixa alta', () => {
    const baixa = facesDe(DUAS_CAIXAS, { origem: ORIGEM_1, onde: { extremo: { eixo: 'y', lado: 'max' } } });
    expect(todosEm(baixa.n, baixa.n.F.get(baixa.ids[0]).vs, 1, 1)).toBe(true);
    const geral = facesDe(DUAS_CAIXAS, { onde: { extremo: { eixo: 'y', lado: 'max' } } });
    expect(geral.ids).toHaveLength(1);
    expect(todosEm(geral.n, geral.n.F.get(geral.ids[0]).vs, 1, 2)).toBe(true);
  });

  it('interseção com grupo: onde filtra dentro da parte nomeada (lida pela cor, porque a face já tem parte)', () => {
    const passos = [...DUAS_CAIXAS, ['parte', { nome: 'torre', sel: { origem: { op: 'cubo', id: 2 } } }]];
    const n = rodar([...passos, ['pincel', { modo: 'face', cor: '#123456', sel: { grupo: 'torre', onde: { normal: { dir: [0, 1, 0], ate: 5 } } } }]]);
    expect(n.orfaos).toEqual([]);
    const pintadas = [...n.F.values()].filter((f) => f.cor === '#123456');
    expect(pintadas).toHaveLength(1);
    expect(todosEm(n, pintadas[0].vs, 1, 2)).toBe(true);
  });

  it('as arestas vivas de uma origem só são as 12 dela, não as 24 da malha', () => {
    const n = rodar(DUAS_CAIXAS);
    const lido = lerOnde(leitor(n), { tipo: 'viva', angulo: 45 });
    const tudo = resolverOnde(leitor(n), lido.onde, null, normalDaFace);
    expect(tudo.arestas).toHaveLength(24);
    const sel = nucleo([...DUAS_CAIXAS, ['parte', { nome: 'alvo', sel: { origem: ORIGEM_1 } }]], {}, {}, {}, null, [], {});
    const base = { faces: new Set([...sel.F.values()].filter((f) => f.parte === 'alvo').map((f) => f.id)) };
    const dentro = resolverOnde(leitor(n), lido.onde, base, normalDaFace);
    expect(dentro.arestas).toHaveLength(12);
    expect(dentro.arestas.every(([a, b]) => a < 8 && b < 8)).toBe(true);
  });

  it('sem onde nada muda: a origem sozinha continua selecionando as seis faces dela', () => {
    const { ids } = facesDe(DUAS_CAIXAS, { origem: ORIGEM_1 });
    expect(ids).toHaveLength(6);
  });
});

describe('determinismo', () => {
  it('a mesma seleção dá a mesma lista, ordenada, em execuções repetidas', () => {
    const pedido = { alvo: 'aresta', tipo: 'viva', angulo: 30 };
    const execucoes = Array.from({ length: 5 }, () => JSON.stringify(onde(CILINDRO, pedido, null)));
    // o n (malha) entra no objeto: compara só o que a seleção devolveu
    const so = (s) => { const { n, ...resto } = JSON.parse(s); return JSON.stringify(resto); };
    expect(new Set(execucoes.map(so)).size).toBe(1);
    const r = JSON.parse(so(execucoes[0]));
    const ordenado = [...r.arestas].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    expect(r.arestas).toEqual(ordenado);
  });

  it('a peça que usa a seleção tem o mesmo canon a cada execução', () => {
    const passos = [...CAIXA, ['extruda', { sel: { onde: { normal: { dir: [0, 1, 0], ate: 5 } } }, dist: 0.5 }]];
    const hashes = new Set(Array.from({ length: 4 }, () => sha256Hex(JSON.stringify(neutroCanonico(rodar(passos))))));
    expect(hashes.size).toBe(1);
  });
});

describe('recusas', () => {
  const orfao = (sel, passos = CAIXA) => {
    const n = rodar([...passos, ['parte', { nome: 'alvo', sel }]]);
    return n.orfaos.find((o) => String(o.ref).startsWith('sel'));
  };

  it('seleção vazia grita com o campo e com o que foi pedido', () => {
    const o = orfao({ onde: { normal: { dir: [1, 1, 0], ate: 10 } } });
    expect(o.ref).toBe('sel.onde');
    expect(o.motivo).toMatch(/seleção onde vazia: nenhuma face satisfaz normal a ate 10° de \[1, 1, 0\]/);
    expect(o.motivo).toMatch(/6 face\(s\) candidata\(s\) → 0 após normal/);
  });

  it('vazio dentro de uma origem diz que a base eram as outras chaves', () => {
    const vazio = orfao({ origem: ORIGEM_1, onde: { tipo: 'borda', alvo: 'aresta' } }, DUAS_CAIXAS);
    expect(vazio.ref).toBe('sel.onde');
    expect(vazio.motivo).toMatch(/dentro do que as outras chaves de sel escolheram/);
    expect(vazio.motivo).toMatch(/12 aresta\(s\) candidata\(s\) → 0 após tipo borda/);
  });

  it('seleção vazia grita mesmo numa operação que aceita seleção de vértice vazia', () => {
    const n = rodar([...CAIXA, ['transladar', { d: [0, 1, 0], sel: { onde: { normal: { dir: [1, 1, 0], ate: 10 } } } }]]);
    expect(n.orfaos.some((o) => o.ref === 'sel.onde')).toBe(true);
  });

  it.each([
    [{ onde: {} }, /vazio/],
    [{ onde: [] }, /precisa ser um objeto/],
    [{ onde: { cor: 'x' } }, /chave desconhecida 'cor'/],
    [{ onde: { alvo: 'vertice', tipo: 'plana' } }, /alvo só aceita 'face' ou 'aresta'/],
    [{ onde: { alvo: 'face' } }, /informe ao menos um critério/],
    [{ onde: { tipo: 'redonda' } }, /tipo 'redonda' desconhecido/],
    [{ onde: { alvo: 'face', tipo: 'viva', angulo: 10 } }, /tipo 'viva' é de aresta/],
    [{ onde: { tipo: 'viva' } }, /tipo 'viva' pede angulo/],
    [{ onde: { tipo: 'plana', angulo: 10 } }, /angulo só acompanha/],
    [{ onde: { tipo: 'viva', angulo: 200 } }, /angulo precisa estar entre 0 e 180/],
    [{ onde: { normal: { dir: [0, 1, 0] } } }, /normal precisa ser \{dir/],
    [{ onde: { normal: { dir: [0, 0, 0], ate: 5 } } }, /vetor nulo/],
    [{ onde: { normal: { dir: [0, 1, 0], ate: -1 } } }, /normal.ate precisa estar entre 0 e 180/],
    [{ onde: { normal: { dir: [0, 1, 0], ate: 5, perto: 1 } } }, /normal precisa ser/],
    [{ onde: { extremo: { eixo: 'w', lado: 'max' } } }, /extremo.eixo só aceita/],
    [{ onde: { extremo: { eixo: 'y', lado: 'alto' } } }, /extremo.lado só aceita/],
    [{ onde: { extremo: { eixo: 'y', lado: 'max', tol: -1 } } }, /extremo.tol não pode ser negativa/],
    [{ onde: { extremo: { eixo: 'y', lado: 'max', tol: 'semParam' } } }, /extremo.tol não resolve/],
  ])('recusa %j', (sel, mensagem) => {
    const o = orfao(sel);
    expect(o, JSON.stringify(sel)).toBeDefined();
    expect(o.ref).toBe('sel.onde');
    expect(o.motivo).toMatch(/seleção onde inválida/);
    expect(o.motivo).toMatch(mensagem);
  });

  it('a chave desconhecida de sel ensina onde entre as que existem', () => {
    const o = orfao({ ondee: {} });
    expect(o.motivo).toMatch(/\bonde\b/);
  });
});

describe('operações que aceitam a seleção nova', () => {
  it('extruda sobe a face de cima escolhida pela normal, sem id', () => {
    const n = rodar([...CAIXA, ['extruda', { sel: { onde: { normal: { dir: [0, 1, 0], ate: 5 } } }, dist: 0.5 }]]);
    expect(n.orfaos).toEqual([]);
    const ys = [...n.V.values()].map((p) => p[1]);
    expect(Math.max(...ys)).toBeCloseTo(1.5, 12);
    expect(Math.min(...ys)).toBeCloseTo(0, 12);
    expect(n.V.size).toBe(12);
  });

  it('extruda dá o mesmo resultado que a face citada por id, e a face mais à frente sobe em z', () => {
    const n0 = rodar(CAIXA);
    const topo = [...n0.F.values()].find((f) => todosEm(n0, f.vs, 1, 1));
    const porId = rodar([...CAIXA, ['extruda', { face: topo.id, dist: 0.5 }]]);
    const porSel = rodar([...CAIXA, ['extruda', { sel: { origem: ORIGEM_1, onde: { extremo: { eixo: 'y', lado: 'max' } } }, dist: 0.5 }]]);
    expect(JSON.stringify(neutroCanonico(porSel))).toBe(JSON.stringify(neutroCanonico(porId)));
    const frente = rodar([...CAIXA, ['extruda', { sel: { onde: { extremo: { eixo: 'z', lado: 'max' } } }, dist: 1 }]]);
    expect(Math.max(...[...frente.V.values()].map((p) => p[2]))).toBeCloseTo(2.5, 12);
  });

  it('extruda recusa seleção de várias faces, vazia, e face junto com sel', () => {
    const varias = rodar([...CAIXA, ['extruda', { sel: { onde: { normal: { dir: [0, 1, 0], ate: 90 } } }, dist: 0.5 }]]);
    expect(varias.orfaos.map((o) => o.motivo).join('|')).toMatch(/ambígua: extruda exige exatamente uma face, e sel resolveu 5/);
    expect(varias.V.size).toBe(8);
    const vazia = rodar([...CAIXA, ['extruda', { sel: { onde: { normal: { dir: [1, 1, 0], ate: 10 } } }, dist: 0.5 }]]);
    expect(vazia.orfaos.some((o) => o.ref === 'sel.onde')).toBe(true);
    expect(vazia.V.size).toBe(8);
    const duplo = rodar([...CAIXA, ['extruda', { face: 1, sel: { tudo: true }, dist: 0.5 }]]);
    expect(duplo.orfaos.some((o) => o.ref === 'face+sel')).toBe(true);
  });

  it('arredondarAresta arredonda a aresta de cima à frente escolhida por propriedade, igual à escrita por face e índice', () => {
    const sel = { origem: ORIGEM_1, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } } };
    const porSel = rodar([...CAIXA, ['arredondarAresta', { origemId: 9, sel, raio: 0.2, paineis: 3 }]]);
    expect(porSel.orfaos).toEqual([]);
    const porFace = rodar([...CAIXA, ['arredondarAresta', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, aresta: 0, raio: 0.2, paineis: 3 }]]);
    expect(porFace.orfaos).toEqual([]);
    expect(JSON.stringify(neutroCanonico(porSel))).toBe(JSON.stringify(neutroCanonico(porFace)));
    expect(porSel.V.size).toBe(8 + 3 * 2);
    // a aresta arredondada some do canto: nenhum vértice fica no canto vivo (y = 1, z = 1,5) além do recuo
    const noCanto = [...porSel.V.values()].filter((p) => Math.abs(p[1] - 1) < 1e-9 && Math.abs(p[2] - 1.5) < 1e-9);
    expect(noCanto).toHaveLength(0);
  });

  it('arredondarAresta recusa seleção de várias arestas, de faces, e sel junto com de', () => {
    const quatro = rodar([...CAIXA, ['arredondarAresta', { origemId: 9, sel: { onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 } } }, raio: 0.2, paineis: 3 }]]);
    expect(quatro.orfaos.map((o) => o.motivo).join('|')).toMatch(/EXATAMENTE uma aresta.*resolveu 4/);
    const deFaces = rodar([...CAIXA, ['arredondarAresta', { origemId: 9, sel: { onde: { normal: { dir: [0, 1, 0], ate: 5 } } }, raio: 0.2, paineis: 3 }]]);
    expect(deFaces.orfaos.map((o) => o.motivo).join('|')).toMatch(/resolveu 0/);
    const dobro = rodar([...CAIXA, ['arredondarAresta', { origemId: 9, sel: { tudo: true }, de: { op: 'cubo', id: 1, face: 'topo' }, aresta: 0, raio: 0.2, paineis: 3 }]]);
    expect(dobro.orfaos.some((o) => o.ref === 'sel+de')).toBe(true);
  });

  it('transladar com aresta escolhida move só as duas pontas dela', () => {
    const antes = rodar(CAIXA);
    const depois = rodar([...CAIXA, ['transladar', { d: [0, 0.25, 0], sel: { onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } } } }]]);
    const movidos = [...depois.V].filter(([v, p]) => Math.abs(p[1] - antes.V.get(v)[1]) > 1e-12);
    expect(movidos).toHaveLength(2);
    expect(movidos.every(([, p]) => Math.abs(p[2] - 1.5) < 1e-12 && Math.abs(p[1] - 1.25) < 1e-12)).toBe(true);
  });
});
