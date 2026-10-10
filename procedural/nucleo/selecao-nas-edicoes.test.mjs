/* selecao-nas-edicoes.test.mjs — `sel` no lugar do id em moveV, moveF, moveA, vira, mescla, pesar e filete.

   Cada operação ganha duas provas: a seleção que aponta para a mesma coisa que o id dá o MESMO canon (a malha, as fusões
   e os pesos), e a que não serve grita em `sel` dizendo o que pedia e quantos resolveu, sem mexer na malha. Os ids que
   aparecem aqui são lidos das coordenadas da própria caixa, nunca escritos de cabeça. */
import { describe, expect, it } from 'vitest';
import { neutroCanonico, nucleo } from './entrada.js';

const ESQUELETO = { ossos: [{ nome: 'raiz' }] };
const rodar = (passos) => nucleo(passos, {}, {}, {}, ESQUELETO, [], {});
const canon = (n) => JSON.stringify(neutroCanonico(n));
const CAIXA = [['cubo', { origemId: 1, larg: 2, alt: 1, prof: 3 }]];
const ORIGEM = { op: 'cubo', id: 1 };
const TOPO = { origem: { op: 'cubo', id: 1, face: 'topo' } };
const motivos = (n) => n.orfaos.map((o) => `${o.ref}: ${o.motivo}`).join(' | ');
const refs = (n) => n.orfaos.map((o) => o.ref);

/* ids pelas coordenadas da caixa 2 x 1 x 3 (x em ±1, y em 0..1, z em ±1,5) */
const base = rodar(CAIXA);
const idDoCanto = (x, y, z) => [...base.V].find(([, p]) => Math.abs(p[0] - x) < 1e-9 && Math.abs(p[1] - y) < 1e-9 && Math.abs(p[2] - z) < 1e-9)[0];
const faceEm = (eixo, valor) => [...base.F.values()].find((f) => f.vs.every((v) => Math.abs(base.V.get(v)[eixo] - valor) < 1e-9)).id;
const topoId = faceEm(1, 1);
const canto = (x, y, z) => ({ regiao: { min: [x - 0.1, y - 0.1, z - 0.1], max: [x + 0.1, y + 0.1, z + 0.1] } });
const ARESTA_TOPO_FRENTE = { origem: ORIGEM, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } } };
const pontasTopoFrente = [idDoCanto(-1, 1, 1.5), idDoCanto(1, 1, 1.5)].sort((a, b) => a - b);
/* a malha como estava: o canon sem a lista de órfãos, que é justamente o que a recusa acrescenta */
const semOrfaos = (n) => JSON.stringify({ ...neutroCanonico(n), orfaos: [] });
const intacta = (n) => expect(semOrfaos(n)).toBe(semOrfaos(base));

describe('moveV com sel: exatamente um vértice', () => {
  it('um canto escolhido por região move igual ao id, e só ele sai do lugar', () => {
    const v = idDoCanto(1, 1, 1.5);
    const porSel = rodar([...CAIXA, ['moveV', { sel: canto(1, 1, 1.5), d: [0, 0.25, 0] }]]);
    const porId = rodar([...CAIXA, ['moveV', { v, d: [0, 0.25, 0] }]]);
    expect(porSel.orfaos).toEqual([]);
    expect(canon(porSel)).toBe(canon(porId));
    expect([...porSel.V].filter(([id, p]) => p.some((c, e) => Math.abs(c - base.V.get(id)[e]) > 1e-12)).map(([id]) => id)).toEqual([v]);
  });

  it('uma face resolve para quatro cantos, e a região vazia para nenhum: gritam sem mover', () => {
    const face = rodar([...CAIXA, ['moveV', { sel: TOPO, d: [0, 1, 0] }]]);
    expect(motivos(face)).toMatch(/sel: moveV exige exatamente um vértice em sel, e resolveu 4/);
    intacta(face);
    const vazia = rodar([...CAIXA, ['moveV', { sel: canto(9, 9, 9), d: [0, 1, 0] }]]);
    expect(refs(vazia)).toContain('sel');
    intacta(vazia);
  });

  it('v junto com sel é ambíguo', () => {
    const n = rodar([...CAIXA, ['moveV', { v: 0, sel: canto(1, 1, 1.5), d: [0, 1, 0] }]]);
    expect(refs(n)).toEqual(['v+sel']);
    intacta(n);
  });
});

describe('moveF com sel: exatamente uma face', () => {
  it('a face de cima escolhida por propriedade move igual à citada por id', () => {
    const porSel = rodar([...CAIXA, ['moveF', { sel: { onde: { extremo: { eixo: 'y', lado: 'max' } } }, d: [0.3, 0.2, 0] }]]);
    const porId = rodar([...CAIXA, ['moveF', { face: topoId, d: [0.3, 0.2, 0] }]]);
    expect(porSel.orfaos).toEqual([]);
    expect(canon(porSel)).toBe(canon(porId));
    expect(canon(porSel)).not.toBe(canon(base));
  });

  it('cinco faces, zero faces e uma aresta gritam com a contagem', () => {
    const cinco = rodar([...CAIXA, ['moveF', { sel: { onde: { normal: { dir: [0, 1, 0], ate: 90 } } }, d: [0, 1, 0] }]]);
    expect(motivos(cinco)).toMatch(/sel: moveF exige exatamente uma face em sel, e resolveu 5/);
    intacta(cinco);
    const aresta = rodar([...CAIXA, ['moveF', { sel: ARESTA_TOPO_FRENTE, d: [0, 1, 0] }]]);
    expect(refs(aresta)).toContain('sel');
    intacta(aresta);
  });

  it('face junto com sel é ambíguo', () => {
    const n = rodar([...CAIXA, ['moveF', { face: topoId, sel: TOPO, d: [0, 1, 0] }]]);
    expect(refs(n)).toEqual(['face+sel']);
    intacta(n);
  });
});

describe('moveA com sel: exatamente uma aresta', () => {
  it('a aresta de cima à frente move igual aos dois vértices por id', () => {
    const porSel = rodar([...CAIXA, ['moveA', { sel: ARESTA_TOPO_FRENTE, d: [0, 0.25, 0.5] }]]);
    const porId = rodar([...CAIXA, ['moveA', { a: pontasTopoFrente[0], b: pontasTopoFrente[1], d: [0, 0.25, 0.5] }]]);
    expect(porSel.orfaos).toEqual([]);
    expect(canon(porSel)).toBe(canon(porId));
    expect([...porSel.V].filter(([id, p]) => p.some((c, e) => Math.abs(c - base.V.get(id)[e]) > 1e-12)).map(([id]) => id).sort((a, b) => a - b)).toEqual(pontasTopoFrente);
  });

  it('quatro arestas e uma face gritam com a contagem, e a e b junto com sel é ambíguo', () => {
    const quatro = rodar([...CAIXA, ['moveA', { sel: { onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 } } }, d: [0, 1, 0] }]]);
    expect(motivos(quatro)).toMatch(/sel: sel precisa resolver para EXATAMENTE uma aresta.*resolveu 4/);
    intacta(quatro);
    const face = rodar([...CAIXA, ['moveA', { sel: TOPO, d: [0, 1, 0] }]]);
    expect(motivos(face)).toMatch(/resolveu 0/);
    intacta(face);
    const dobro = rodar([...CAIXA, ['moveA', { a: 0, b: 1, sel: ARESTA_TOPO_FRENTE, d: [0, 1, 0] }]]);
    expect(refs(dobro)).toEqual(['a+sel']);
    intacta(dobro);
  });
});

describe('vira com sel: uma ou mais faces', () => {
  it('uma face igual ao id, e as cinco de cima igual a cinco viras por id', () => {
    const uma = rodar([...CAIXA, ['vira', { sel: { onde: { extremo: { eixo: 'y', lado: 'max' } } } }]]);
    expect(canon(uma)).toBe(canon(rodar([...CAIXA, ['vira', { face: topoId }]])));
    const cinco = rodar([...CAIXA, ['vira', { sel: { onde: { normal: { dir: [0, 1, 0], ate: 90 } } } }]]);
    const ids = [...base.F.keys()].filter((id) => id !== faceEm(1, 0));
    expect(ids).toHaveLength(5);
    expect(cinco.orfaos).toEqual([]);
    expect(canon(cinco)).toBe(canon(rodar([...CAIXA, ...ids.map((face) => ['vira', { face }])])));
  });

  it('seleção que não acha face e face junto com sel gritam sem mexer', () => {
    const vazia = rodar([...CAIXA, ['vira', { sel: { onde: { normal: { dir: [1, 1, 0], ate: 10 } } } }]]);
    expect(refs(vazia)).toContain('sel.onde');
    intacta(vazia);
    const aresta = rodar([...CAIXA, ['vira', { sel: ARESTA_TOPO_FRENTE }]]);
    expect(motivos(aresta)).toMatch(/vira exige ao menos uma face em sel, e resolveu 0/);
    intacta(aresta);
    const dobro = rodar([...CAIXA, ['vira', { face: topoId, sel: TOPO }]]);
    expect(refs(dobro)).toEqual(['face+sel']);
    intacta(dobro);
  });
});

describe('mescla com sel (os que somem) e selPara (o que fica)', () => {
  const v5 = idDoCanto(1, 1, -1.5), v6 = idDoCanto(1, 1, 1.5);

  it('um canto fundido em outro igual à forma por id', () => {
    const porSel = rodar([...CAIXA, ['mescla', { sel: canto(1, 1, -1.5), selPara: canto(1, 1, 1.5) }]]);
    const porId = rodar([...CAIXA, ['mescla', { de: [v5], para: v6 }]]);
    expect(porSel.orfaos).toEqual([]);
    expect(canon(porSel)).toBe(canon(porId));
    expect(porSel.merges).toEqual([{ de: [v5], para: v6 }]);
  });

  it('as pontas de uma aresta fundidas em um canto igual aos ids, e os dois pares se misturam', () => {
    const alvo = idDoCanto(-1, 0, -1.5);
    const porSel = rodar([...CAIXA, ['mescla', { sel: ARESTA_TOPO_FRENTE, selPara: canto(-1, 0, -1.5) }]]);
    const porId = rodar([...CAIXA, ['mescla', { de: pontasTopoFrente, para: alvo }]]);
    expect(canon(porSel)).toBe(canon(porId));
    const misto = rodar([...CAIXA, ['mescla', { sel: ARESTA_TOPO_FRENTE, para: alvo }]]);
    expect(canon(misto)).toBe(canon(porId));
  });

  it('selPara que não é um vértice só, seleção vazia e id junto com sel gritam sem mexer', () => {
    const quatro = rodar([...CAIXA, ['mescla', { sel: canto(1, 1, -1.5), selPara: TOPO }]]);
    expect(motivos(quatro)).toMatch(/selPara: mescla exige exatamente um vértice em selPara, e resolveu 4/);
    intacta(quatro);
    const vazia = rodar([...CAIXA, ['mescla', { sel: canto(9, 9, 9), para: v6 }]]);
    expect(refs(vazia)).toContain('sel');
    intacta(vazia);
    expect(refs(rodar([...CAIXA, ['mescla', { de: [v5], sel: canto(1, 1, -1.5), para: v6 }]]))).toEqual(['de+sel']);
    expect(refs(rodar([...CAIXA, ['mescla', { sel: canto(1, 1, -1.5), para: v6, selPara: canto(1, 1, 1.5) }]]))).toEqual(['para+selPara']);
  });
});

describe('pesar com sel: um ou mais vértices', () => {
  const pesos = (n) => JSON.stringify([...n.pesos].sort((a, b) => a[0] - b[0]).map(([v, m]) => [v, [...m]]));

  it('os cantos da face de cima pesam igual a faces:[id] e a vs:[ids]', () => {
    const porSel = rodar([...CAIXA, ['pesar', { osso: 'raiz', sel: TOPO, peso: 0.5 }]]);
    const porFace = rodar([...CAIXA, ['pesar', { osso: 'raiz', faces: [topoId], peso: 0.5 }]]);
    const porVs = rodar([...CAIXA, ['pesar', { osso: 'raiz', vs: base.F.get(topoId).vs, peso: 0.5 }]]);
    expect(porSel.orfaos).toEqual([]);
    expect(porSel.pesos.size).toBe(4);
    expect(canon(porSel)).toBe(canon(porFace));
    expect(canon(porSel)).toBe(canon(porVs));
    expect(pesos(porSel)).toBe(pesos(porFace));
  });

  it('um canto escolhido por região pesa só ele, e os pesos acumulam como por id', () => {
    const v = idDoCanto(1, 1, 1.5);
    const n = rodar([...CAIXA, ['pesar', { osso: 'raiz', sel: canto(1, 1, 1.5), peso: 0.25 }], ['pesar', { osso: 'raiz', vs: [v], peso: 0.25 }]]);
    expect([...n.pesos.keys()]).toEqual([v]);
    expect(n.pesos.get(v).get('raiz')).toBeCloseTo(0.5, 12);
  });

  it('seleção vazia, vs junto com sel e faces junto com sel gritam sem pesar', () => {
    const vazia = rodar([...CAIXA, ['pesar', { osso: 'raiz', sel: canto(9, 9, 9), peso: 1 }]]);
    expect(refs(vazia)).toContain('sel');
    expect(vazia.pesos.size).toBe(0);
    expect(refs(rodar([...CAIXA, ['pesar', { osso: 'raiz', vs: [0], sel: TOPO, peso: 1 }]]))).toEqual(['vs+sel']);
    const comFaces = rodar([...CAIXA, ['pesar', { osso: 'raiz', faces: [topoId], sel: TOPO, peso: 1 }]]);
    expect(refs(comFaces)).toEqual(['faces+sel']);
    expect(comFaces.pesos.size).toBe(0);
  });
});

describe('filete com sel: exatamente uma aresta', () => {
  it('a aresta de cima à frente dá o mesmo canon que a face e o índice local', () => {
    const porSel = rodar([...CAIXA, ['filete', { origemId: 9, sel: ARESTA_TOPO_FRENTE, raio: 0.2 }]]);
    const porFace = rodar([...CAIXA, ['filete', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, aresta: 0, raio: 0.2 }]]);
    expect(porSel.orfaos).toEqual([]);
    expect(porFace.orfaos).toEqual([]);
    expect(canon(porSel)).toBe(canon(porFace));
    expect(porSel.V.size).toBeGreaterThan(base.V.size);
  });

  it('a face de apoio é a de menor id entre as duas da aresta: pela outra face o painel nasce com o outro sentido', () => {
    const porSel = rodar([...CAIXA, ['filete', { origemId: 9, sel: ARESTA_TOPO_FRENTE, raio: 0.2 }]]);
    const frente = base.F.get(faceEm(2, 1.5)).vs;
    const k = frente.findIndex((v, n) => pontasTopoFrente.includes(v) && pontasTopoFrente.includes(frente[(n + 1) % frente.length]));
    const porOutraFace = rodar([...CAIXA, ['filete', { origemId: 9, de: { op: 'cubo', id: 1, face: 'frente' }, aresta: k, raio: 0.2 }]]);
    expect(porOutraFace.orfaos).toEqual([]);
    expect(faceEm(1, 1)).toBeLessThan(faceEm(2, 1.5));
    expect(canon(porSel)).not.toBe(canon(porOutraFace));
  });

  it('quatro arestas, uma face e sel junto com de gritam', () => {
    const quatro = rodar([...CAIXA, ['filete', { origemId: 9, sel: { onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 } } }, raio: 0.2 }]]);
    expect(motivos(quatro)).toMatch(/sel: sel precisa resolver para EXATAMENTE uma aresta.*resolveu 4/);
    intacta(quatro);
    const face = rodar([...CAIXA, ['filete', { origemId: 9, sel: TOPO, raio: 0.2 }]]);
    expect(motivos(face)).toMatch(/resolveu 0/);
    intacta(face);
    const dobro = rodar([...CAIXA, ['filete', { origemId: 9, sel: ARESTA_TOPO_FRENTE, de: { op: 'cubo', id: 1, face: 'topo' }, aresta: 0, raio: 0.2 }]]);
    expect(refs(dobro)).toEqual(['sel+de']);
    intacta(dobro);
  });
});

describe('a forma por sel é determinística', () => {
  it('o mesmo passo com sel dá o mesmo canon a cada execução', () => {
    const passos = [...CAIXA, ['moveA', { sel: ARESTA_TOPO_FRENTE, d: [0, 0.25, 0] }], ['vira', { sel: TOPO }], ['pesar', { osso: 'raiz', sel: TOPO, peso: 1 }]];
    expect(canon(rodar(passos))).toBe(canon(rodar(passos)));
  });
});
