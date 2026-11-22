/* haste.test.js — a barra entre dois pontos do esboço 2.0 (`haste: { de, para, raio | secao }`): as pontas da malha caem nos dois
 * pontos pedidos em qualquer direção, a ponta pode ser a âncora de outra forma, e o que a haste não aceita volta com o motivo. */
import { describe, expect, it } from 'vitest';
import { receitaDaOpcao } from '../src/opcao.js';
import { malhaDoNeutro } from '../src/geometria.js';

const recusa = (opcao) => { try { receitaDaOpcao(opcao); return null; } catch (e) { return e.message; } };

/* Cada vértice da haste lido no eixo dela, em mm: o alcance ao longo do eixo e o maior afastamento dele. */
function noEixo(neutro, parte, de, para) {
  const v = para.map((x, k) => x - de[k]);
  const L = Math.hypot(...v);
  const u = v.map((x) => x / L);
  let tMin = Infinity; let tMax = -Infinity; let afastamento = 0;
  for (const p of malhaDoNeutro(neutro, parte).pts) {
    const q = p.map((x, k) => x * 1000 - de[k]);
    const t = q[0] * u[0] + q[1] * u[1] + q[2] * u[2];
    const perp = Math.hypot(...q.map((x, k) => x - t * u[k]));
    tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); afastamento = Math.max(afastamento, perp);
  }
  return { tMin, tMax, L, afastamento };
}

describe('a haste entre dois pontos', () => {
  const direcoes = [
    ['de pé', [0, 0, 0], [0, 250, 0]],
    ['de cabeça para baixo', [10, 50, 0], [10, -150, 0]],
    ['deitada em x', [0, 0, 0], [-180, 0, 0]],
    ['deitada em z', [5, 5, 5], [5, 5, 205]],
    ['inclinada nos três eixos', [-100, 20, 30], [150, 300, 80]],
  ];
  for (const [nome, de, para] of direcoes) {
    it(`a barra redonda ${nome} vai de "de" a "para" e tem o raio pedido`, () => {
      const { neutro } = receitaDaOpcao({ titulo: 't', formas: [{ id: 'barra', haste: { de, para, raio: 8, lados: 16 } }] });
      const m = noEixo(neutro, 'barra', de, para);
      expect(m.tMin).toBeCloseTo(0, 6);
      expect(m.tMax).toBeCloseTo(m.L, 6);
      expect(m.afastamento).toBeCloseTo(8, 6);
    });
  }

  it('a barra retangular tem a seção pedida e as pontas certas', () => {
    const de = [0, 0, 0]; const para = [0, 0, 300];
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [{ id: 'chata', haste: { de, para, secao: [40, 10] } }] });
    const m = noEixo(neutro, 'chata', de, para);
    expect(m.tMin).toBeCloseTo(0, 6);
    expect(m.tMax).toBeCloseTo(300, 6);
    expect(m.afastamento).toBeCloseTo(Math.hypot(20, 5), 6);
  });

  it('a ponta pode ser a âncora de outra forma', () => {
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [
      { id: 'base', op: 'cubo', args: { larg: 200, alt: 20, prof: 100 } },
      { id: 'barra', haste: { de: 'base.+y-x', para: 'topo.-y', raio: 6 } },
      { id: 'topo', op: 'cubo', args: { lado: 40 }, centro: [100, 400, 0], por: '-y' },
    ] });
    const m = noEixo(neutro, 'barra', [-100, 20, 0], [100, 400, 0]);
    expect(m.tMin).toBeCloseTo(0, 6);
    expect(m.tMax).toBeCloseTo(m.L, 6);
  });

  it('a haste se espelha como as outras formas', () => {
    const { neutro } = receitaDaOpcao({ titulo: 't', formas: [{ id: 'barra', haste: { de: [50, 0, 0], para: [120, 200, 0], raio: 5 }, espelha: 'x' }] });
    const xs = malhaDoNeutro(neutro, 'barra').pts.map((p) => p[0] * 1000);
    expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 6);
  });

  it('é determinística', () => {
    const opcao = { titulo: 't', formas: [{ id: 'barra', haste: { de: [-100, 20, 30], para: [150, 300, 80], raio: 8 } }] };
    expect(JSON.stringify(receitaDaOpcao(opcao).receita)).toBe(JSON.stringify(receitaDaOpcao(opcao).receita));
  });

  it('recusa com o motivo o que a haste não aceita', () => {
    const h = (haste, extra = {}) => recusa({ titulo: 't', formas: [{ id: 'b', haste, ...extra }] });
    expect(h({ de: [0, 0, 0], para: [0, 0, 0], raio: 5 })).toMatch(/mesmo ponto/);
    expect(h({ de: [0, 0, 0], para: [0, 10, 0] })).toMatch(/"raio".*"secao"/);
    expect(h({ de: [0, 0, 0], para: [0, 10, 0], raio: 5, secao: [1, 1] })).toMatch(/um dos dois/);
    expect(h({ de: [0, 0, 0], para: [0, 10, 0], raio: -1 })).toMatch(/haste.raio/);
    expect(h({ de: [0, 0, 0], para: [0, 10, 0], secao: [1, 1], lados: 8 })).toMatch(/lados/);
    expect(h({ de: [0, 0], para: [0, 10, 0], raio: 5 })).toMatch(/haste.de/);
    expect(h({ de: [0, 0, 0], para: [0, 10, 0], raio: 5, cor: 1 })).toMatch(/campo "cor" não existe em "haste"/);
    expect(h({ de: [0, 0, 0], para: [0, 10, 0], raio: 5 }, { centro: [0, 0, 0] })).toMatch(/não aceita "centro"/);
    expect(h({ de: [0, 0, 0], para: 'nada.+y', raio: 5 })).toMatch(/"nada", que não existe/);
  });
});
