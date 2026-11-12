/* limpar-lascas-tiras.test.mjs — `limparLascas` com a fileira de tiras paralelas.
 *
 * A pele de uma chapa muito subdividida (o molde de `aparar`, de 0,02 a 0,4 mm de passo na quina de raio 3) cortada por dois planos paralelos deixa uma fileira de
 * quadriláteros de 0,02 a 0,4 mm por 80 mm: cada um é lasca, o vizinho também, e a fusão de duas dá outra lasca, mais larga. Duas coisas impediam a limpeza: a fusão
 * só valia se a face resultante deixasse de ser lasca (a fileira inteira sim, o primeiro passo não), e o canto que ficava com duas faces (o ponto da fileira na aresta
 * da parede) recusava por valência 2; esse ponto, alinhado com os vizinhos, agora sai das duas faces, porque a medida de contatos não aceita vértice de valência 2. Aqui as duas regras são medidas numa fixture de caixa fechada à mão, sem domínio de objeto: a fileira vira uma face só, nenhum
 * vértice se move, a malha segue fechada (cada aresta em duas faces) e o resultado é o mesmo em duas execuções. */
import { describe, expect, it } from 'vitest';
import { limparLascas, razaoDeFace } from './limpar-lascas.js';

/** A caixa de x 0 a `L`, y 0 a 10, z 0 a `C`, com o topo (y 10) em tiras ao longo de z cujas bordas em x são `cortes`; as paredes de z = 0 e z = C levam os pontos do topo. */
function caixaComTiras(cortes, C = 80, L = 10) {
  const V = new Map(); const F = new Map();
  let nv = 0; const v = (x, y, z) => { V.set(nv, [x, y, z]); return nv++; };
  const b = [v(0, 0, 0), v(L, 0, 0), v(L, 0, C), v(0, 0, C)];
  const topoZ0 = cortes.map((x) => v(x, 10, 0)); const topoZ1 = cortes.map((x) => v(x, 10, C));
  let nf = 0; const f = (vs) => F.set(nf++, { vs, parte: 'caixa' });
  f([b[0], b[3], b[2], b[1]]); /* o fundo, de baixo */
  for (let k = 0; k + 1 < cortes.length; k += 1) f([topoZ0[k], topoZ0[k + 1], topoZ1[k + 1], topoZ1[k]]); /* as tiras do topo, de cima */
  f([b[0], b[1], ...[...topoZ0].reverse()]); /* a parede de z = 0, com os pontos do topo */
  f([b[2], b[3], ...topoZ1]); /* a parede de z = C, com os pontos do topo */
  f([b[3], b[0], topoZ0[0], topoZ1[0]]); /* a parede de x = 0 */
  f([b[1], b[2], topoZ1.at(-1), topoZ0.at(-1)]); /* a parede de x = L */
  return { V, F };
}
const arestasAbertas = (m) => {
  const n = new Map();
  for (const f of m.F.values()) f.vs.forEach((a, i) => { const b = f.vs[(i + 1) % f.vs.length]; const k = `${Math.min(a, b)}_${Math.max(a, b)}`; n.set(k, (n.get(k) ?? 0) + 1); });
  return [...n.values()].filter((c) => c !== 2).length;
};
const aplicar = (m, r) => {
  const F = new Map([...m.F].filter(([id]) => !r.facesRemovidas.has(id)).map(([id, f]) => [id, { ...f, vs: r.faces.get(id) ?? f.vs }]));
  return { V: m.V, F };
};

describe('limparLascas: a fileira de tiras paralelas', () => {
  const CORTES = [0, 0.02, 0.07, 0.15, 0.3, 0.55, 1, 10];

  it('a fixture tem a fileira de lascas e a caixa é fechada', () => {
    const m = caixaComTiras(CORTES);
    const finas = [...m.F.values()].filter((f) => razaoDeFace(f.vs.map((v) => m.V.get(v))) < 0.003);
    expect(finas.length).toBeGreaterThanOrEqual(4);
    expect(arestasAbertas(m)).toBe(0);
  });

  it('a fileira vira uma face só, sem mover vértice e a menos que a tolerância, e a caixa segue fechada, sem vértice de duas faces', () => {
    const m = caixaComTiras(CORTES);
    const r = limparLascas(m, { selecao: null, tolerancia: 0.01 });
    expect(r.relatorio.finasDepois).toBe(0);
    expect(r.relatorio.restantes).toEqual([]);
    expect(r.vertices.size).toBe(0);
    /* a tira de 0,02 mm junto à parede entra nela (a parede fica 0,02 mm dobrada), e a superfície sai do lugar menos que a tolerância */
    expect(r.relatorio.desvioMaximo).toBeLessThanOrEqual(0.01);
    const depois = aplicar(m, r);
    expect(arestasAbertas(depois)).toBe(0);
    /* nenhum vértice fica com duas faces só (a medida de contatos exige três vizinhos no elo do vértice): os pontos da fileira nas paredes saem */
    const usos = new Map();
    for (const f of depois.F.values()) for (const v of f.vs) usos.set(v, (usos.get(v) ?? 0) + 1);
    expect(Math.min(...usos.values())).toBeGreaterThanOrEqual(3);
    expect(r.verticesRemovidos.size).toBeGreaterThan(0);
    expect(depois.F.size).toBeLessThan(m.F.size - 2);
    for (const f of depois.F.values()) expect(razaoDeFace(f.vs.map((v) => m.V.get(v)))).toBeGreaterThanOrEqual(0.003);
  });

  it('o resultado é o mesmo em duas execuções', () => {
    const um = limparLascas(caixaComTiras(CORTES), { selecao: null, tolerancia: 0.01 });
    const dois = limparLascas(caixaComTiras(CORTES), { selecao: null, tolerancia: 0.01 });
    expect([...um.faces]).toEqual([...dois.faces]);
    expect([...um.facesRemovidas]).toEqual([...dois.facesRemovidas]);
  });

  it('a fileira que não chega à largura de uma face boa fica, com o motivo, em vez de sumir', () => {
    /* tiras de 0,1 mm no total por 80 mm de comprimento: a face resultante seria lasca, e a parede de x = 0 a 0,1 não é vizinha de outra face boa */
    const m = caixaComTiras([0, 0.02, 0.05, 0.1], 80, 0.1);
    const r = limparLascas(m, { selecao: null, tolerancia: 0.01 });
    expect(r.relatorio.finasDepois).toBeGreaterThan(0);
    expect(r.relatorio.restantes[0].recusas.length).toBeGreaterThan(0);
  });
});
