/* conexo-em-metro.test.js — o conversor de mm para metro do esboço e os passos `parte` com `onde.conexo` que `paineisPorVaos` devolve:
   `de` e `ate` são medidas e viram metro, `dir` é só direção, e a execução em metro dá as mesmas faces por parte que a execução em mm. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../../procedural/nucleo/entrada.js';
import { paineisPorVaos } from '../../../procedural/nucleo/paineis-por-vaos.js';
import { RecusaDoEsboco, argsEmMetro, passoEmMetro } from '../src/milimetro.js';

const PLACA = { passos: [['cubo', { origemId: 1, larg: 600, alt: 1, prof: 400 }]], origem: { op: 'cubo', id: 1 } };
const ENTRADA = {
  chapa: PLACA, vao: 4,
  linhas: [{ eixo: 'y', pontos: [[0, -300], [0, 300]] }],
  paineis: [{ nome: 'e', eixo: 'y', ponto: [-150, 0] }, { nome: 'd', eixo: 'y', ponto: [150, 0] }],
};
const facesPorParte = (st) => {
  const n = {};
  for (const f of st.F.values()) if (f.parte) n[f.parte] = (n[f.parte] ?? 0) + 1;
  return n;
};

describe('o conversor de mm para metro e o conexo', () => {
  it('converte de e ate, deixa dir livre e não deixa passar o resto de onde com número', () => {
    const conexo = { de: [10, 20, 30], dir: [0, -1, 0], ate: 5 };
    const [, a] = passoEmMetro(['parte', { nome: 'p', sel: { origem: { op: 'subtrair', id: 9 }, onde: { conexo } } }]);
    expect(a.sel.onde.conexo).toEqual({ de: [0.01, 0.02, 0.03], dir: [0, -1, 0], ate: 0.005 });
    expect(a.sel.origem).toEqual({ op: 'subtrair', id: 9 });
    expect(() => argsEmMetro('parte', { nome: 'p', sel: { onde: { conexo, extremo: { eixo: 'y', lado: 'max', tol: 1 } } } })).toThrow(RecusaDoEsboco);
    expect(() => argsEmMetro('parte', { nome: 'p', sel: { onde: { normal: { dir: [0, 1, 0], ate: 5 } } } })).toThrow(RecusaDoEsboco);
  });

  it('os passos do ajudante em mm passam pelo conversor, e a execução em metro dá as mesmas faces por parte', () => {
    const g = paineisPorVaos(ENTRADA);
    const metro = g.passos.map((p) => passoEmMetro(p));
    const emMm = nucleo(g.passos, {}, {});
    const emM = nucleo(metro, {}, {});
    expect(emM.orfaos).toEqual([]);
    expect(facesPorParte(emM)).toEqual(facesPorParte(emMm));
    expect(Object.keys(facesPorParte(emM)).sort()).toEqual(['d', 'e']);
  });

  it("saida: 'metro' dá os mesmos passos que o conversor dá aos de mm", () => {
    const mm = paineisPorVaos(ENTRADA);
    const m = paineisPorVaos({ ...ENTRADA, saida: 'metro' });
    const convertidos = mm.passos.slice(PLACA.passos.length).map((p) => passoEmMetro(p));
    const a = JSON.stringify(convertidos); const b = JSON.stringify(m.passos);
    expect(JSON.parse(b)).toEqual(JSON.parse(a).map(([op, args]) => [op, args]));
  });
});

describe('o conversor e o passo limparLascas', () => {
  it('converte a tolerância (medida), deixa o limite (razão) e a seleção como estão, e recusa o campo que a tabela não conhece', () => {
    const [op, a] = passoEmMetro(['limparLascas', { sel: { origem: { op: 'subtrair', id: 3 } }, tolerancia: 0.01, limite: 0.2 }]);
    expect(op).toBe('limparLascas');
    expect(a).toEqual({ sel: { origem: { op: 'subtrair', id: 3 } }, tolerancia: 0.00001, limite: 0.2 });
    expect(() => passoEmMetro(['limparLascas', { sel: { tudo: true }, tolerancia: 0.01, raio: 2 }])).toThrow(RecusaDoEsboco);
  });
  it('o passo que paineisPorVaos emite em mm, passado pelo conversor, é o que sai com saida metro, e o corte limpo parte a chapa como o outro', () => {
    const mm = paineisPorVaos({ ...ENTRADA, modo: 'superficie', chapa: { ...PLACA, emitir: false }, areaMinima: 100 });
    const metro = paineisPorVaos({ ...ENTRADA, modo: 'superficie', saida: 'metro' });
    const limpa = mm.passos.find((p) => p[0] === 'limparLascas');
    expect(limpa[1].tolerancia).toBe(0.01);
    expect(metro.passos).toEqual(mm.passos.map((p) => passoEmMetro(p)));
    expect(metro.passos.find((p) => p[0] === 'limparLascas')[1].tolerancia).toBe(0.00001);
    expect(paineisPorVaos({ ...ENTRADA, saida: 'metro' }).passos.some((p) => p[0] === 'limparLascas')).toBe(false);
  });
});
