/* gaiola-aneis-rebaixo.test.mjs — o rebaixo por relevo de anel: a faixa de recuo que monta numa chapa plana de grade uniforme (os números do guia), o aviso de grade larga
 * para o raio pedido com relevo, e a lente do rebaixo como saída do anel. Fixture sem domínio: uma chapa plana de 1200 por 600 mm (ou 1400 por 840) com um vão de 400 por 200
 * mm (560 por 280), de estações e colunas a `d` mm, e um anel de três voltas de 7 mm com o relevo do farol do sedã (-14, -9, -4 mm). */
import { describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { RAZAO_MAXIMA_DA_GRADE_COM_RELEVO } from './gaiola-aneis.js';
import { nucleo } from './entrada.js';

const PEQUENO = { vx: [400, 800], vy: [200, 400], X: [0, 1200], Y: [0, 600] };
const GRANDE = { vx: [420, 980], vy: [280, 560], X: [0, 1400], Y: [0, 840] };
const RELEVO = [-14, -9, -4];
function placa({ d, geo = PEQUENO, anel = {}, prefixo = '' }) {
  const { vx, vy, X, Y } = geo;
  const xs = []; for (let x = X[0]; x <= X[1] + 1e-9; x += d) xs.push(x);
  const ys = []; for (let y = Y[0]; y <= Y[1] + 1e-9; y += d) ys.push(y);
  const dentro = (x, y) => x > vx[0] && x < vx[1] && y > vy[0] && y < vy[1];
  const estacoes = ys.map((y, i) => ({ nome: `e${i}`, em: y / 1000, colunas: xs.map((x, j) => ({ nome: `c${j}`, em: [x / 1000, 0] })).filter((c, j) => !dentro(xs[j], y)) }));
  return gaiolaPorEstacoes({ eixo: 'z', estacoes, virar: true, prefixo, vaos: [{ nome: 'v', estacoes: [`e${ys.indexOf(vy[0])}`, `e${ys.indexOf(vy[1])}`], colunas: [`c${xs.indexOf(vx[0])}`, `c${xs.indexOf(vx[1])}`] }],
    aneis: [{ nome: 'a', vao: 'v', recuo: 38, voltas: 3, largura: 7, raio: 18, relevo: RELEVO, ...anel }] });
}
const monta = (opcoes) => { try { placa(opcoes); return true; } catch { return false; } };
const refs = (g) => (g.avisos ?? []).map((a) => a.ref);

describe('a faixa de recuo que monta, medida numa chapa plana de grade uniforme', () => {
  it('raio 18 a 50 mm de grade: de 46 a 49 mm de recuo; a 52, a 44 e a 40 mm de grade (o canto de raio mais as voltas não cabe) não montam', () => {
    for (const recuo of [46, 47, 48, 49]) expect(monta({ d: 50, anel: { recuo } }), `recuo ${recuo}`).toBe(true);
    for (const recuo of [44, 45, 51, 52]) expect(monta({ d: 50, anel: { recuo } }), `recuo ${recuo}`).toBe(false);
    for (const recuo of [30, 38, 45, 52, 56]) expect(monta({ d: 40, anel: { recuo } }), `40 mm, recuo ${recuo}`).toBe(false);
  });
  it('raio 9 a 100 mm de grade (razão 11): a faixa é de 2 mm, de 89 a 90; a 40 mm de grade (razão 4,4) é de 41 a 56', () => {
    for (const recuo of [89, 90]) expect(monta({ d: 100, anel: { recuo, raio: 9 } }), `recuo ${recuo}`).toBe(true);
    for (const recuo of [86, 88, 92, 95]) expect(monta({ d: 100, anel: { recuo, raio: 9 } }), `recuo ${recuo}`).toBe(false);
    for (const recuo of [41, 48, 56]) expect(monta({ d: 40, anel: { recuo, raio: 9 } }), `recuo ${recuo}`).toBe(true);
  });
  it('a recusa da transição diz de quanto o recuo precisa passar e a aresta da grade que serviria', () => {
    expect(() => placa({ d: 50, anel: { recuo: 38 } })).toThrow(/a transição pede 31\.8 mm ou mais; aumente o recuo desses lados para pelo menos 45\.8 mm.*a aresta da grade precisa medir 35\.2 mm ou menos/s);
  });
});

describe('o aviso de grade larga para o raio, com relevo', () => {
  it('a 140 mm de grade com raio 18 e relevo (razão 7,8, acima de 6) avisa com a razão medida, a grade, o raio e o que mudar; a 50 mm (2,8) não avisa', () => {
    expect(RAZAO_MAXIMA_DA_GRADE_COM_RELEVO).toBe(6);
    const larga = placa({ d: 140, geo: GRANDE, anel: { recuo: 112 } });
    expect(refs(larga)).toEqual(['relevoEmGradeLarga']);
    const a = larga.avisos[0];
    expect(a).toMatchObject({ anel: 'a', espacamentoMm: 140, raioMm: 18, razao: 7.78, limite: 6 });
    expect(a.texto).toMatch(/140,0 mm, 7,8 vezes o raio, acima de 6.*a no máximo 3 raios \(54 mm\).*raio maior \(23,4 mm ou mais/);
    expect(refs(placa({ d: 50, anel: { recuo: 47 } }))).toEqual([]);
  });
  it('sem relevo, ou com raio 0, o anel não avisa, e o aviso não muda a gaiola', () => {
    expect(refs(placa({ d: 140, geo: GRANDE, anel: { recuo: 112, relevo: [0, 0, 0] } }))).toEqual([]);
    const com = placa({ d: 140, geo: GRANDE, anel: { recuo: 112 } }); const sem = placa({ d: 140, geo: GRANDE, anel: { recuo: 112, relevo: [0, 0, 0] } });
    expect(com.passo.faces).toEqual(sem.passo.faces);
  });
  it('o limite de 6 raios separa a faixa de 2 mm (raio 9 a 100 mm, razão 11) da de 15 mm (raio 9 a 40 mm, razão 4,4)', () => {
    expect(refs(placa({ d: 100, anel: { recuo: 89, raio: 9 } }))).toEqual(['relevoEmGradeLarga']);
    expect(refs(placa({ d: 40, anel: { recuo: 48, raio: 9 } }))).toEqual([]);
  });
});

describe('a lente do rebaixo, saída do anel', () => {
  const g = placa({ d: 50, anel: { recuo: 47, lente: { folga: 0.8, sobra: 6, espessura: 4 } } });
  const l = g.aneis.a.lente;
  it('é a caixa da abertura mais a sobra de cada lado, 0,8 mm atrás do plano da abertura (14 mm do relevo da volta 1 mais a folga), em grade de 3 por 3', () => {
    expect(l.aberturaMm).toEqual({ largura: 306, altura: 106 });
    expect(l.preenchimento).toBeGreaterThan(0.95);
    const P = Object.values(l.pontos);
    expect(P).toHaveLength(9);
    const xs = P.map((p) => p[0] * 1000); const zs = P.map((p) => p[2] * 1000);
    expect(Math.min(...xs)).toBeCloseTo(400 + 47 - 6, 3); expect(Math.max(...xs)).toBeCloseTo(800 - 47 + 6, 3);
    expect(Math.min(...zs)).toBeCloseTo(200 + 47 - 6, 3); expect(Math.max(...zs)).toBeCloseTo(400 - 47 + 6, 3);
    for (const p of P) expect(p[1] * 1000).toBeCloseTo(-14.8, 6);
    expect(l.espessuraMm).toBe(4);
    expect(refs(g)).toEqual([]);
  });
  it('o passo da lente vira uma chapa de 4 mm fechada, sem órfão, com a normal para o lado da chapa do rebaixo', () => {
    const st = nucleo([['subdivisao', { origemId: 1, ...l.passo, niveis: 1, borda: 'cantos', espessura: l.espessuraMm / 1000 }]], {}, l.pontos);
    expect(st.orfaos).toEqual([]);
    expect(st.F.size).toBeGreaterThan(40);
    const ys = [...st.V.values()].map((p) => p[1] * 1000);
    expect(Math.max(...ys)).toBeCloseTo(-14.8, 3);
    expect(Math.min(...ys)).toBeCloseTo(-18.8, 3);
  });
  it('o prefixo da gaiola vai aos nomes da lente, e a mesma chamada dá a mesma lente', () => {
    const p = placa({ d: 50, prefixo: 'painel_', anel: { recuo: 47, lente: { folga: 0.8, sobra: 6, espessura: 4 } } }).aneis.a.lente;
    expect(Object.keys(p.pontos).every((n) => n.startsWith('painel_a_lente_'))).toBe(true);
    expect(p.passo.vertices).toEqual(Object.keys(p.pontos));
    expect(JSON.stringify(placa({ d: 50, anel: { recuo: 47, lente: { folga: 0.8, sobra: 6, espessura: 4 } } }).aneis.a.lente)).toBe(JSON.stringify(l));
  });
  it('só o rebaixo tem lente: relevo zero na volta 1, ou campo faltando, é recusado com a conta', () => {
    expect(() => placa({ d: 50, anel: { recuo: 47, relevo: [0, 0, 0], lente: { folga: 1, sobra: 2, espessura: 3 } } })).toThrow(/pede lente, que é a do rebaixo.*relevo negativo na volta 1.*veio relevo 0/);
    expect(() => placa({ d: 50, anel: { recuo: 47, lente: { folga: 1, sobra: 2 } } })).toThrow(/precisa de lente: \{ folga, sobra, espessura \} em mm/);
    expect(() => placa({ d: 50, anel: { recuo: 47, lente: { folga: 1, sobra: 2, espessura: 3, extra: 1 } } })).toThrow(/precisa de lente/);
  });
  it('sem lente a saída do anel é a de antes: nenhuma chave nova no anel', () => {
    expect(placa({ d: 50, anel: { recuo: 47 } }).aneis.a.lente).toBeUndefined();
  });
});
