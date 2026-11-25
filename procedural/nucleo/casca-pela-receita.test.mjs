/* casca-pela-receita.test.mjs — a casca de um `loft` com cintura, que a `casca` pela malha recusa por não ser convexo: sai
 * fechada para dentro e para fora, com a ponta de polo fechada e a outra aberta; a parede, medida da superfície de dentro à
 * de fora, fica a 2 % da espessura na forma lisa (64 pontos, 21 seções) e entre 0,97 e 1,45 vez na forma facetada, de quinas
 * vivas entre seções (mais grossa do lado menos inclinado delas); e a recusa diz a seção e o motivo. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { criarRegistroDeFamilias } from '../familias/index.js';
import { passosDaCascaDoLoft, secoesDaCasca, secoesTampadas } from './casca-pela-receita.js';

const registro = criarRegistroDeFamilias();
const oct = (r) => Array.from({ length: 16 }, (_, k) => { const a = (2 * Math.PI * k) / 16; const f = k % 2 ? 0.92 : 1; return [r * f * Math.cos(a), 0.7 * r * f * Math.sin(a)]; });
const SECOES = [{ pos: [0, 0, -0.04], raio: 0 }, ...[[0, 60], [60, 52], [120, 35], [180, 48], [240, 60]].map(([z, r]) => ({ pos: [0, 0, z / 1000], contorno: oct(r / 1000) }))];
/* a versão lisa: elipse de 64 pontos, raio de 60 mm nas pontas e 35 na cintura em 17 seções, e o bico arredondado */
const N = 64;
const elipse = (r) => Array.from({ length: N }, (_, k) => { const a = (2 * Math.PI * k) / N; return [r * Math.cos(a), 0.7 * r * Math.sin(a)]; });
const LISA = [{ pos: [0, 0, -0.04], raio: 0 }, ...[[-30, 0.55], [-18, 0.85], [-8, 0.97]].map(([z, f]) => ({ pos: [0, 0, z / 1000], contorno: elipse((60 * f) / 1000) })), ...Array.from({ length: 17 }, (_, i) => { const z = i * 15; return { pos: [0, 0, z / 1000], contorno: elipse((47.5 + 12.5 * Math.cos((2 * Math.PI * z) / 240)) / 1000) }; })];
const executar = (PASSOS) => executarReceita({ meta: { nome: 'casca' }, PASSOS }, { registroOperacoes: registro.registroOperacoes }).neutro;
const triangulos = (n) => { const t = []; for (const f of n.F.values()) { const vs = f.vs.map((v) => n.V.get(v)); for (let i = 1; i + 1 < vs.length; i += 1) t.push([vs[0], vs[i], vs[i + 1]]); } return t; };
function distancia(p, [a, b, c]) {
  const s = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]]; const d = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = s(b, a); const ac = s(c, a); const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const nn = d(n, n); const h = d(s(p, a), n) / nn; const q = s(p, n.map((x) => x * h));
  const dentro = [[a, b], [b, c], [c, a]].every(([u, v]) => { const e = s(v, u); const w = s(q, u); const x = [e[1] * w[2] - e[2] * w[1], e[2] * w[0] - e[0] * w[2], e[0] * w[1] - e[1] * w[0]]; return d(x, n) >= -1e-15; });
  if (dentro) return Math.abs(h) * Math.sqrt(nn);
  const segmento = (u, v) => { const e = s(v, u); const t = Math.max(0, Math.min(1, d(s(p, u), e) / d(e, e))); return Math.hypot(...s(p, [u[0] + e[0] * t, u[1] + e[1] * t, u[2] + e[2] * t])); };
  return Math.min(segmento(a, b), segmento(b, c), segmento(c, a));
}

describe('casca pela receita do loft', () => {
  it('a casca pela malha recusa o loft com cintura, por não ser convexo', () => {
    const n = executar([['loft', { origemId: 1, lados: 16, secoes: secoesTampadas(SECOES) }], ['casca', { origemId: 5, espessura: 0.002, solido: { origem: { op: 'loft', id: 1 } } }]]);
    expect((n.orfaos ?? []).map((o) => o.motivo).join(' ')).toMatch(/não é convexo/);
  });

  for (const para of ['dentro', 'fora']) it(`sai fechada para ${para}, sem órfão`, () => {
    const { passos } = passosDaCascaDoLoft({ lados: 16, secoes: SECOES }, { espessura: 0.002, para });
    expect((executar(passos).orfaos ?? []).map((o) => o.motivo)).toEqual([]);
  });

  it('na forma lisa, a parede fica a 2 % da espessura, a tolerância da casca pela malha, até a boca aberta', () => {
    const t = 0.003;
    const fora = triangulos(executar([['loft', { origemId: 1, lados: N, secoes: secoesTampadas(LISA) }]]));
    const dentro = executar([['loft', { origemId: 1, lados: N, secoes: secoesDaCasca(LISA, { espessura: t }) }]]);
    const amostras = [...dentro.V.values()].filter((p) => p[2] > -0.025 && p[2] < 0.2399).filter((_, i) => i % 3 === 0);
    const paredes = amostras.map((p) => Math.min(...fora.map((tr) => distancia(p, tr))) / t);
    expect(Math.min(...paredes)).toBeGreaterThan(0.98);
    expect(Math.max(...paredes)).toBeLessThan(1.02);
  });

  it('na forma facetada, de quinas vivas entre seções, a parede fica entre 0,97 e 1,45 vez a espessura', () => {
    const t = 0.002;
    const fora = triangulos(executar([['loft', { origemId: 1, lados: 16, secoes: secoesTampadas(SECOES) }]]));
    const dentro = executar([['loft', { origemId: 1, lados: 16, secoes: secoesDaCasca(SECOES, { espessura: t }) }]]);
    const amostras = [];
    for (const f of dentro.F.values()) { const vs = f.vs.map((v) => dentro.V.get(v)); vs.forEach((p, i) => { const q = vs[(i + 1) % vs.length]; amostras.push(p, p.map((x, k) => (x + q[k]) / 2)); }); }
    const paredes = amostras.filter((p) => p[2] <= 0.2399).map((p) => Math.min(...fora.map((tr) => distancia(p, tr))) / t);
    expect(Math.min(...paredes)).toBeGreaterThan(0.97);
    expect(Math.max(...paredes)).toBeLessThan(1.45);
  });

  it('recusa a espessura que fecha a seção e o corpo misturado, dizendo onde', () => {
    expect(() => secoesDaCasca(SECOES, { espessura: 0.03 })).toThrow(/seção \d|ponta da seção/);
    expect(() => secoesDaCasca([SECOES[1], { pos: [0, 0, 0.1], raio: 0.05 }, SECOES[3]], { espessura: 0.002 })).toThrow(/todo \{pos, raio\} ou todo \{pos, contorno\}/);
  });
});
